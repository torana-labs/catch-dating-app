/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requirePhoneVerifiedCaller} from "../../commands/envelope";
import {
  checkListingSuppression,
  listingSuppressionHmacKey,
  plainReader,
  suppressionModule,
} from "../../listingSuppressions/registry";
import {appCheckCallableOptions} from "../../shared/callableOptions";
import type {OrganizerDocument} from "../../shared/generated/firestoreAdminTypes";
import {checkRateLimit as defaultCheckRateLimit} from "../../shared/rateLimit";
import {assertCanBeClaimed, organizerClaimRequestId} from "../organizerClaimApproval";
import {
  SHADOW_PROFILE_POLICY,
  anySourceEnabled,
  type PhoneLeadSource,
  type ShadowProfilePolicy,
} from "./policy";
import {ORGANIZER_PHONE_LEADS, enabledEntries, phoneLeadId} from "./store";

// findClaimableOrganizers: the "Is this you?" read for Catch Host sign-up.
// The phone comes only from the caller's verified Firebase token, never from
// the request. The answer holds public organizer fields only (the prefill)
// and source labels; never the phone, the lead id or another person's data.

const MAX_CANDIDATES = 5;

/** The onboarding fields Catch Host asks for, in its order. */
export const PREFILL_FIELDS = ["name", "description", "city", "organizerType",
  "photo", "instagramHandle"] as const;
export type PrefillField = typeof PREFILL_FIELDS[number];

export interface ClaimableOrganizer {
  organizerId: string;
  /** This caller already has a claim request under review for it. */
  claimPending: boolean;
  sources: PhoneLeadSource[];
  strength: "strong" | "medium" | "weak";
  prefill: {
    name: string | null;
    description: string | null;
    cityName: string | null;
    marketId: string | null;
    organizerType: string | null;
    categoryLabel: string | null;
    tags: string[];
    instagramHandle: string | null;
    photoUrl: string | null;
    canonicalPath: string | null;
  };
  filled: PrefillField[];
  missing: PrefillField[];
}

export interface FindClaimableOrganizersResponse {
  enabled: boolean;
  candidates: ClaimableOrganizer[];
}

export interface FindClaimableDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit?: typeof defaultCheckRateLimit;
  policy?: ShadowProfilePolicy;
  leadId?: (phone: string) => Promise<string | null>;
  suppressionKeys?: (organizerId: string, organizer: OrganizerDocument) => Promise<string[]>;
}

const defaultDeps: FindClaimableDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit: defaultCheckRateLimit,
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * The public fields an organizer already has, as the onboarding prefill.
 * @return {Pick<ClaimableOrganizer, "prefill" | "filled" | "missing">} Prefill.
 */
export function organizerPrefill(organizer: OrganizerDocument):
  Pick<ClaimableOrganizer, "prefill" | "filled" | "missing"> {
  const published = organizer.publicPage?.publishStatus === "published";
  const prefill = {
    name: text(organizer.name),
    description: text(organizer.description),
    cityName: text(organizer.cityName),
    marketId: text(organizer.locationMarketId),
    organizerType: text(organizer.organizerType),
    categoryLabel: text(organizer.publicCategoryLabel),
    tags: Array.isArray(organizer.tags) ?
      organizer.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 12) : [],
    instagramHandle: text(organizer.instagramHandle),
    photoUrl: text(organizer.profileImageUrl) ?? text(organizer.imageUrl),
    canonicalPath: published ? text(organizer.publicPage?.canonicalPath) : null,
  };
  const has: Record<PrefillField, boolean> = {
    name: !!prefill.name, description: !!prefill.description,
    city: !!prefill.marketId, organizerType: !!prefill.organizerType,
    photo: !!prefill.photoUrl, instagramHandle: !!prefill.instagramHandle,
  };
  return {prefill, filled: PREFILL_FIELDS.filter((field) => has[field]),
    missing: PREFILL_FIELDS.filter((field) => !has[field])};
}

async function defaultSuppressionKeys(organizerId: string,
  organizer: OrganizerDocument): Promise<string[]> {
  const module = await suppressionModule();
  return module.suppressionKeysForIdentity({organizerIds: [organizerId],
    names: [organizer.name], slugs: [organizer.publicPage?.slug]});
}

export async function findClaimableOrganizersHandler(
  request: CallableRequest<unknown>, deps: FindClaimableDeps = defaultDeps
): Promise<FindClaimableOrganizersResponse> {
  const caller = requirePhoneVerifiedCaller(request);
  const policy = deps.policy ?? SHADOW_PROFILE_POLICY;
  if (!anySourceEnabled(policy)) return {enabled: false, candidates: []};
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, caller.uid, "findClaimableOrganizers",
    {maxRequests: 20, windowMs: 60 * 60 * 1000});
  const leadId = await (deps.leadId ?? ((phone) => phoneLeadId(phone)))(caller.phone);
  if (!leadId) return {enabled: true, candidates: []};
  const lead = await db.collection(ORGANIZER_PHONE_LEADS).doc(leadId).get();
  const entries = enabledEntries(lead.data(), policy);
  const byOrganizer = new Map<string, typeof entries>();
  for (const entry of entries) {
    byOrganizer.set(entry.organizerId, [...(byOrganizer.get(entry.organizerId) ?? []), entry]);
  }
  const candidates: ClaimableOrganizer[] = [];
  for (const [organizerId, list] of byOrganizer) {
    if (candidates.length >= MAX_CANDIDATES) break;
    const snap = await db.collection("organizers").doc(organizerId).get();
    if (!snap.exists) continue;
    const organizer = snap.data() as OrganizerDocument;
    try {
      assertCanBeClaimed(organizer);
    } catch {
      continue;
    }
    if (organizer.status && organizer.status !== "active") continue;
    const ownRequest = organizerClaimRequestId(organizerId, caller.uid);
    const claimPending = organizer.claim?.state === "claimPending";
    if (claimPending && organizer.claim?.lastClaimRequestId !== ownRequest) continue;
    const keys = await (deps.suppressionKeys ?? defaultSuppressionKeys)(organizerId, organizer);
    const check = await checkListingSuppression(plainReader, db, keys);
    // Fail closed: a page the do-not-list might hold is never offered.
    if (check.state !== "clear") continue;
    candidates.push({organizerId, claimPending,
      sources: [...new Set(list.map((entry) => entry.source))],
      strength: list[0].strength, ...organizerPrefill(organizer)});
  }
  return {enabled: true, candidates};
}

export const findClaimableOrganizers = onCall(
  {...appCheckCallableOptions, secrets: [listingSuppressionHmacKey]},
  (request) => findClaimableOrganizersHandler(request)
);

/**
 * What a claim request records when the claimer's verified phone matches an
 * index entry for that organizer: the sources and the strongest strength.
 * Null when the feature is off, the caller has no verified phone or nothing
 * matches. Reads one document, so it can run inside the claim transaction.
 * @return {Promise<object | null>} Evidence for the claim request.
 */
export async function phoneMatchEvidence(
  reader: {get(ref: FirebaseFirestore.DocumentReference): Promise<FirebaseFirestore.DocumentSnapshot>},
  db: FirebaseFirestore.Firestore,
  params: {phone: unknown; organizerId: string; policy?: ShadowProfilePolicy;
    leadId?: (phone: string) => Promise<string | null>}
): Promise<{kind: "phone_match"; sources: PhoneLeadSource[];
  strength: "strong" | "medium" | "weak"} | null> {
  const policy = params.policy ?? SHADOW_PROFILE_POLICY;
  if (typeof params.phone !== "string" || !anySourceEnabled(policy)) return null;
  const id = await (params.leadId ?? ((phone) => phoneLeadId(phone)))(params.phone);
  if (!id) return null;
  const snap = await reader.get(db.collection(ORGANIZER_PHONE_LEADS).doc(id));
  const matches = enabledEntries(snap.data(), policy)
    .filter((entry) => entry.organizerId === params.organizerId);
  if (matches.length === 0) return null;
  return {kind: "phone_match", sources: [...new Set(matches.map((entry) => entry.source))],
    strength: matches[0].strength};
}
