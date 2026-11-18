/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {logger} from "firebase-functions";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {createSupplyIntakeRequest, intakeMarket} from "../operations/supplyIntake/requests";
import {listingSuppressionHmacKey} from "../listingSuppressions/registry";
import {supplyIntakeCollections} from "../operations/supplyIntake/worker";
import {classifyDraftLink, InvalidDraftLink, parseDraftLink} from "./links";
import {
  accessTokenHash,
  DRAFT_PATH_PREFIX,
  DRAFT_POLL_MS,
  instantDraftId,
  limiterKey,
  parseRequestInstantDraftPayload,
  STAFF_REPLY,
  storedInstantDraft,
  verifiedWhatsapp,
  type RequestInstantDraftPayload,
  type RequestInstantDraftResponse,
  type StoredInstantDraft,
} from "./model";

// The website's "event page from a link" tool and the demo request send one
// link from a caller who confirmed their WhatsApp number with a one-time code
// (Firebase phone sign-in, the website's "Continue with phone" sheet). This
// front door writes a Supply Intake request
// (the same intake that builds listings for nominated organisers) carrying
// the draft's private state, and answers at once: the worker starts reading
// the link as soon as the request exists, and the page polls getInstantDraft.
// Nothing here publishes; see materialize.ts for why nothing can.

export interface RequestInstantDraftDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  checkRateLimit: typeof defaultCheckRateLimit;
}

const defaultDeps: RequestInstantDraftDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * App Check proves the website sent it, and the caller must be signed in with
 * a verified phone (owner decision, 16 Nov 2026): that phone is the WhatsApp
 * number staff reply to, and a submitted number must match it. Limits: per
 * verified number, per network address, and a daily and monthly ceiling for
 * the whole tool. Pages are read from the tool's own monthly allowance
 * (acquisition_policy.json pageFetch.maxInstantDraftRequestsPerMonth; at most
 * 12 a draft), so drafts never spend the allowance staff nominations use.
 */
export async function requestInstantDraftHandler(request: CallableRequest<unknown>,
  deps: RequestInstantDraftDeps = defaultDeps): Promise<RequestInstantDraftResponse> {
  const data = parseRequestInstantDraftPayload(request.data);
  const verified = verifiedWhatsapp(request, data.whatsapp.phone);
  let url: URL;
  try {
    url = parseDraftLink(data.link);
  } catch (error) {
    if (error instanceof InvalidDraftLink) throw new HttpsError("invalid-argument", error.message);
    throw error;
  }
  const db = deps.firestore();
  const draftId = instantDraftId(data.requestId);
  const ref = db.collection(supplyIntakeCollections.requests).doc(draftId);
  const existing = await ref.get();
  if (existing.exists) return replay(existing.data(), data, verified.phone);

  await deps.checkRateLimit(db, limiterKey("phone", verified.phone), "requestInstantDraft",
    {maxRequests: 3, windowMs: HOUR});
  await deps.checkRateLimit(db, limiterKey("ip", clientAddress(request)), "requestInstantDraftAddress",
    {maxRequests: 10, windowMs: HOUR});
  await deps.checkRateLimit(db, "idraft-all", "requestInstantDraftDaily", {maxRequests: 25, windowMs: DAY});
  await deps.checkRateLimit(db, "idraft-all", "requestInstantDraftMonthly", {maxRequests: 200, windowMs: 30 * DAY});

  const now = deps.now();
  const link = classifyDraftLink(data.requestKind, url);
  const instantDraft: StoredInstantDraft = {
    schemaVersion: 1, draftId, accessTokenHash: accessTokenHash(data.accessToken), requestKind: data.requestKind,
    entry: data.entry, link: {url: url.href, ...link},
    whatsapp: {phone: verified.phone, consentVersion: data.whatsapp.consentVersion,
      consentedAt: now.toISOString(), purpose: "instant_draft_follow_up", verifiedByUid: verified.uid},
    followUp: STAFF_REPLY, outcome: null,
  };
  const intake = {
    schemaVersion: 1 as const, requestId: draftId, kind: "self_submission" as const,
    market: intakeMarket(data.city ?? null),
    seed: {name: null, urls: [url.href], notes: null, categories: []},
    submittedBy: {role: "organizer" as const, uid: null, partnerId: null},
    submittedAt: now.toISOString(),
    origin: {kind: "web_instant_draft" as const, id: data.requestId},
  };
  const created = await db.runTransaction(async (tx) => {
    const again = await tx.get(ref);
    if (again.exists) return null;
    const result = await createSupplyIntakeRequest(tx, db, intake, now, {instantDraft});
    return result.suppressed ? "suppressed" as const : instantDraft;
  });
  if (created === "suppressed") {
    // The submitter learns only that no page is made from their own link.
    throw new HttpsError("failed-precondition", "Catch can't make a page for this organizer. " +
      "Contact support if you think this is a mistake.", {reason: "listing_suppressed"});
  }
  if (!created) return replay((await ref.get()).data(), data, verified.phone);
  // The number and the token stay out of logs.
  logger.info("Instant draft requested.", {draftId, requestKind: data.requestKind, entry: data.entry,
    provider: link.provider, support: link.support, market: intake.market});
  return response(created, false);
}

export const requestInstantDraft = onCall(appCheckCallableOptionsWithSecrets([listingSuppressionHmacKey],
  {maxInstances: 5}), (request) => requestInstantDraftHandler(request));

/** An exact retry finds its draft; the same key with a different submission or number is refused. */
function replay(stored: unknown, data: RequestInstantDraftPayload, phone: string): RequestInstantDraftResponse {
  const draft = storedInstantDraft((stored as {instantDraft?: unknown} | undefined)?.instantDraft);
  if (!draft || draft.accessTokenHash !== accessTokenHash(data.accessToken) || draft.requestKind !== data.requestKind ||
      draft.entry !== data.entry || draft.whatsapp.phone !== phone ||
      draft.link.url !== parseDraftLink(data.link).href) {
    throw new HttpsError("already-exists", "This submission changed. Start a new draft.");
  }
  return response(draft, true);
}

function response(draft: StoredInstantDraft, idempotentReplay: boolean): RequestInstantDraftResponse {
  // A form link waits for a person until form import ships (slice 2); an
  // event link always runs through Supply Intake, which may still read it.
  const building = draft.requestKind === "event_link";
  return {draftId: draft.draftId, status: building ? "building" : "staff_follow_up",
    link: {provider: draft.link.provider, support: draft.link.support, reason: draft.link.reason},
    followUp: STAFF_REPLY, draftPath: `${DRAFT_PATH_PREFIX}${draft.draftId}`,
    pollAfterMs: building ? DRAFT_POLL_MS : null, idempotentReplay};
}

/** The caller's network address, for a hashed rate-limit key only. */
export function clientAddress(request: CallableRequest<unknown>): string {
  const raw = request.rawRequest;
  const forwarded = raw?.headers?.["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return first || raw?.ip || "unknown";
}
