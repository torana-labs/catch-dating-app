import {createHash} from "crypto";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from
  "../shared/callableOptions";
import type {
  OrganizerContactDocument,
  OrganizerContactEventEdgeDocument,
  OrganizerContactIdentityClaimDocument,
  OrganizerContactIdentityLinkDocument,
  OrganizerContactMergeReviewDecisionDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ListOrganizerContactMergeCandidatesCallablePayload} from
  "../shared/generated/listOrganizerContactMergeCandidatesCallablePayload";
import type {ListOrganizerContactMergeCandidatesCallableResponse} from
  "../shared/generated/listOrganizerContactMergeCandidatesCallableResponse";
import type {ReviewOrganizerContactMergeCandidateCallablePayload} from
  "../shared/generated/reviewOrganizerContactMergeCandidateCallablePayload";
import type {ReviewOrganizerContactMergeCandidateCallableResponse} from
  "../shared/generated/reviewOrganizerContactMergeCandidateCallableResponse";
import {
  validateListOrganizerContactMergeCandidatesCallablePayload,
} from
  "../shared/generated/validators/listOrganizerContactMergeCandidatesInput";
import {
  validateReviewOrganizerContactMergeCandidateCallablePayload,
} from
  "../shared/generated/validators/reviewOrganizerContactMergeCandidateInput";
import {requireOrganizerManager} from
  "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";

const defaultPageSize = 20;
const maxPageSize = 50;
const maxClaimScan = 200;
const maxLinkScan = 500;
const maxCandidateScan = 200;
const firestoreInLimit = 30;

type Candidate =
  ListOrganizerContactMergeCandidatesCallableResponse["candidates"][number];
type MatchKind = Candidate["matchKinds"][number];
type SourceKind = Candidate["sourceKinds"][number];

interface MergeReviewDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => FirebaseFirestore.Timestamp;
  checkRateLimit: typeof checkRateLimit;
}

const defaultDeps: MergeReviewDeps = {
  firestore: () => admin.firestore(),
  now: () => admin.firestore.Timestamp.now(),
  checkRateLimit,
};

export interface CandidateSeed {
  candidateId: string;
  contactIds: [string, string];
  matchKinds: Set<MatchKind>;
  identityHashes: Set<string>;
  confidence: Candidate["confidence"];
  updatedAtMillis: number;
}

interface MergeReviewCursor {
  version: 1;
  updatedAtMillis: number;
  candidateId: string;
}

/** Lists verified UID/phone ambiguity pairs with evidence derived on read. */
export async function listOrganizerContactMergeCandidatesHandler(
  request: CallableRequest<unknown>,
  deps: MergeReviewDeps = defaultDeps
): Promise<ListOrganizerContactMergeCandidatesCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    ListOrganizerContactMergeCandidatesCallablePayload
  >(
    request,
    validateListOrganizerContactMergeCandidatesCallablePayload,
    normalizeListPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(
    db,
    actorUid,
    "listOrganizerContactMergeCandidates",
    {maxRequests: 60, windowMs: 60 * 1000}
  );
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});

  const [claimSnap, proposedLinkSnap] = await Promise.all([
    db.collection("organizerContactIdentityClaims")
      .where("organizerId", "==", data.organizerId)
      .where("state", "==", "conflicted")
      .orderBy("updatedAt", "desc")
      .orderBy(admin.firestore.FieldPath.documentId(), "desc")
      .limit(maxClaimScan + 1)
      .get(),
    db.collection("organizerContactIdentityLinks")
      .where("organizerId", "==", data.organizerId)
      .where("confidence", "==", "proposed")
      .orderBy("updatedAt", "desc")
      .orderBy(admin.firestore.FieldPath.documentId(), "desc")
      .limit(maxLinkScan + 1)
      .get(),
  ]);
  const seeds = mergeCandidateSeeds([
    ...verifiedCandidateSeeds(
      data.organizerId,
      claimSnap.docs.slice(0, maxClaimScan).map((document) => ({
        id: document.id,
        data: document.data() as OrganizerContactIdentityClaimDocument,
      }))
    ),
    ...proposedCandidateSeeds(
      data.organizerId,
      proposedLinkSnap.docs.slice(0, maxLinkScan).map((document) => ({
        id: document.id,
        data: document.data() as OrganizerContactIdentityLinkDocument,
      }))
    ),
  ]).slice(0, maxCandidateScan + 1);
  const cursor = decodeCursor(data.cursor ?? null);
  const afterCursor = seeds.filter((seed) => candidateIsAfter(seed, cursor));
  const requestedLimit = Math.min(data.limit ?? defaultPageSize, maxPageSize);
  const selectedSeeds = afterCursor.slice(0, requestedLimit);
  const candidates = await hydrateCandidates({
    db,
    organizerId: data.organizerId,
    actorUid,
    seeds: selectedSeeds,
  });
  const visible = candidates.filter((candidate) =>
    candidate.decisionState !== "differentPeople"
  );
  const dismissed = candidates.filter((candidate) =>
    candidate.decisionState === "differentPeople"
  );
  const hasMore = afterCursor.length > selectedSeeds.length ||
    seeds.length > maxCandidateScan || claimSnap.size > maxClaimScan ||
    proposedLinkSnap.size > maxLinkScan;
  const last = selectedSeeds.at(-1);
  return {
    organizerId: data.organizerId,
    candidates: visible,
    dismissedCandidates: dismissed,
    nextCursor: hasMore && last ? encodeCursor(last) : null,
    truncated: seeds.length > maxCandidateScan ||
      claimSnap.size > maxClaimScan || proposedLinkSnap.size > maxLinkScan,
  };
}

/** Stores or reverses a durable different-people decision for one real pair. */
export async function reviewOrganizerContactMergeCandidateHandler(
  request: CallableRequest<unknown>,
  deps: MergeReviewDeps = defaultDeps
): Promise<ReviewOrganizerContactMergeCandidateCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<
    ReviewOrganizerContactMergeCandidateCallablePayload
  >(
    request,
    validateReviewOrganizerContactMergeCandidateCallablePayload,
    normalizeReviewPayload
  );
  const contactIds = sortedPair(data.contactIds);
  const candidateId = organizerContactMergeCandidateId(
    data.organizerId,
    contactIds
  );
  if (candidateId !== data.candidateId) {
    throw new HttpsError("invalid-argument", "Merge candidate id is invalid.");
  }
  const db = deps.firestore();
  await deps.checkRateLimit(
    db,
    actorUid,
    "reviewOrganizerContactMergeCandidate",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  await requireOrganizerManager({db, organizerId: data.organizerId, actorUid});
  await assertActiveContacts(db, data.organizerId, contactIds);
  if (!await candidatePairExists(db, data.organizerId, contactIds)) {
    throw new HttpsError(
      "failed-precondition",
      "This verified duplicate candidate is no longer available."
    );
  }

  const decisionRef = db.collection("organizerContactMergeReviewDecisions")
    .doc(candidateId);
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(decisionRef);
    const existing = snapshot.data() as
      OrganizerContactMergeReviewDecisionDocument | undefined;
    const now = deps.now();
    const decision = nextMergeReviewDecision({
      candidateId,
      organizerId: data.organizerId,
      contactIds,
      actorUid,
      requestedState: data.decision,
      expectedRevision: data.expectedRevision,
      existing,
      now,
    });
    tx.set(decisionRef, decision);
    return {
      organizerId: data.organizerId,
      candidateId,
      decisionState: decision.state,
      revision: decision.revision,
    };
  });
}

/** Applies the revision and same-manager rules for a durable pair decision. */
export function nextMergeReviewDecision(params: {
  candidateId: string;
  organizerId: string;
  contactIds: [string, string];
  actorUid: string;
  requestedState: "differentPeople" | "reopen";
  expectedRevision: number | null;
  existing: OrganizerContactMergeReviewDecisionDocument | undefined;
  now: FirebaseFirestore.Timestamp;
}): OrganizerContactMergeReviewDecisionDocument {
  if (params.existing &&
      (params.existing.organizerId !== params.organizerId ||
       !samePair(params.existing.contactIds, params.contactIds))) {
    throw new HttpsError("already-exists", "Review decision id is in use.");
  }
  if ((params.existing?.revision ?? null) !== params.expectedRevision) {
    throw new HttpsError(
      "aborted",
      "This duplicate review changed. Refresh and try again."
    );
  }
  if (params.requestedState === "reopen") {
    if (!params.existing || params.existing.state !== "differentPeople") {
      throw new HttpsError(
        "failed-precondition",
        "This duplicate review is not dismissed."
      );
    }
    if (params.existing.reviewedByUid !== params.actorUid) {
      throw new HttpsError(
        "permission-denied",
        "Only the manager who made this decision can reverse it."
      );
    }
    return {
      ...params.existing,
      state: "reopened",
      reopenedByUid: params.actorUid,
      reopenedAt: params.now,
      revision: nextRevision(params.existing.revision, params.now),
      updatedAt: params.now,
    };
  }
  return {
    schemaVersion: 1,
    decisionId: params.candidateId,
    organizerId: params.organizerId,
    contactIds: params.contactIds,
    state: "differentPeople",
    reviewedByUid: params.actorUid,
    reviewedAt: params.now,
    reopenedByUid: null,
    reopenedAt: null,
    revision: nextRevision(params.existing?.revision ?? 0, params.now),
    updatedAt: params.now,
  };
}

/** Builds deterministic pairs only from verified conflicted claims. */
export function verifiedCandidateSeeds(
  organizerId: string,
  claims: Array<{id: string; data: OrganizerContactIdentityClaimDocument}>
): CandidateSeed[] {
  const byId = new Map<string, CandidateSeed>();
  for (const claim of claims) {
    if (claim.data.organizerId !== organizerId ||
        claim.data.state !== "conflicted") continue;
    const contactIds = [...new Set([
      claim.data.verifiedContactId,
      ...claim.data.conflictingContactIds,
    ])].sort();
    for (let left = 0; left < contactIds.length; left += 1) {
      for (let right = left + 1; right < contactIds.length; right += 1) {
        const pair: [string, string] = [contactIds[left], contactIds[right]];
        const candidateId = organizerContactMergeCandidateId(
          organizerId,
          pair
        );
        const existing = byId.get(candidateId);
        const updatedAtMillis = claim.data.updatedAt.toMillis();
        const seed = existing ?? {
          candidateId,
          contactIds: pair,
          matchKinds: new Set<MatchKind>(),
          identityHashes: new Set<string>(),
          confidence: "verified",
          updatedAtMillis,
        };
        seed.matchKinds.add(
          claim.data.kind === "uid" ? "sameVerifiedUid" : "sameVerifiedPhone"
        );
        seed.identityHashes.add(claim.data.identityHash);
        seed.updatedAtMillis = Math.max(seed.updatedAtMillis, updatedAtMillis);
        byId.set(candidateId, seed);
        if (byId.size > maxCandidateScan) break;
      }
      if (byId.size > maxCandidateScan) break;
    }
    if (byId.size > maxCandidateScan) break;
  }
  return [...byId.values()].sort(compareSeeds);
}

/** Builds proposed pairs only from exact unverified phone or email hashes. */
export function proposedCandidateSeeds(
  organizerId: string,
  links: Array<{id: string; data: OrganizerContactIdentityLinkDocument}>
): CandidateSeed[] {
  const grouped = new Map<string, Array<{
    contactId: string;
    identityHash: string;
    kind: "phone" | "email";
    updatedAtMillis: number;
  }>>();
  for (const link of links) {
    if (link.data.organizerId !== organizerId ||
        link.data.confidence !== "proposed" ||
        (link.data.kind !== "phone" && link.data.kind !== "email")) continue;
    const key = `${link.data.kind}|${link.data.identityHash}`;
    const group = grouped.get(key) ?? [];
    group.push({
      contactId: link.data.contactId,
      identityHash: link.data.identityHash,
      kind: link.data.kind,
      updatedAtMillis: link.data.updatedAt.toMillis(),
    });
    grouped.set(key, group);
  }
  const seeds: CandidateSeed[] = [];
  for (const group of grouped.values()) {
    const contactIds = [...new Set(group.map((link) => link.contactId))].sort();
    if (contactIds.length < 2) continue;
    for (let left = 0; left < contactIds.length; left += 1) {
      for (let right = left + 1; right < contactIds.length; right += 1) {
        seeds.push({
          candidateId: organizerContactMergeCandidateId(
            organizerId,
            [contactIds[left], contactIds[right]]
          ),
          contactIds: [contactIds[left], contactIds[right]],
          matchKinds: new Set([group[0].kind === "phone" ?
            "sameImportedPhone" : "sameEmail"]),
          identityHashes: new Set([group[0].identityHash]),
          confidence: "proposed",
          updatedAtMillis: Math.max(...group.map((link) =>
            link.updatedAtMillis)),
        });
        if (seeds.length > maxCandidateScan) break;
      }
      if (seeds.length > maxCandidateScan) break;
    }
    if (seeds.length > maxCandidateScan) break;
  }
  return mergeCandidateSeeds(seeds);
}

function mergeCandidateSeeds(seeds: CandidateSeed[]): CandidateSeed[] {
  const byId = new Map<string, CandidateSeed>();
  for (const seed of seeds) {
    const existing = byId.get(seed.candidateId);
    if (!existing) {
      byId.set(seed.candidateId, seed);
      continue;
    }
    for (const kind of seed.matchKinds) existing.matchKinds.add(kind);
    for (const hash of seed.identityHashes) existing.identityHashes.add(hash);
    if (seed.confidence === "verified") existing.confidence = "verified";
    existing.updatedAtMillis = Math.max(
      existing.updatedAtMillis,
      seed.updatedAtMillis
    );
  }
  return [...byId.values()].sort(compareSeeds);
}

/** Deterministic pair id shared by listing and review mutations. */
export function organizerContactMergeCandidateId(
  organizerId: string,
  contactIds: readonly string[]
): string {
  const pair = sortedPair(contactIds);
  return `ocmc_${createHash("sha256")
    .update(`${organizerId}|${pair[0]}|${pair[1]}`)
    .digest("hex").slice(0, 48)}`;
}

async function hydrateCandidates(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  actorUid: string;
  seeds: CandidateSeed[];
}): Promise<Candidate[]> {
  if (params.seeds.length === 0) return [];
  const contactIds = [...new Set(params.seeds.flatMap((seed) =>
    seed.contactIds))];
  const contactSnapshots = await params.db.getAll(...contactIds.map(
    (contactId) => params.db.collection("organizerContacts").doc(contactId)
  ));
  const contactEntries = contactSnapshots.map((snapshot) => [
    snapshot.id,
    snapshot.data() as OrganizerContactDocument | undefined,
  ] as const);
  const contacts = new Map(contactEntries.filter((entry) => {
    const contact = entry[1];
    return contact?.organizerId === params.organizerId &&
      contact.deletedAt === null && contact.hiddenAt == null &&
      contact.identityState !== "merged";
  }) as Array<readonly [string, OrganizerContactDocument]>);
  const [edges, links, decisions] = await Promise.all([
    loadEdges(params.db, params.organizerId, [...contacts.keys()]),
    loadSupportingLinks(params.db, params.organizerId, params.seeds),
    params.db.getAll(...params.seeds.map((seed) => params.db
      .collection("organizerContactMergeReviewDecisions")
      .doc(seed.candidateId))),
  ]);
  const decisionById = new Map(decisions.map((snapshot) => [
    snapshot.id,
    snapshot.data() as
      OrganizerContactMergeReviewDecisionDocument | undefined,
  ] as const));
  const result: Candidate[] = [];
  for (const seed of params.seeds) {
    const left = contacts.get(seed.contactIds[0]);
    const right = contacts.get(seed.contactIds[1]);
    if (!left || !right) continue;
    const leftEvents = edges.get(seed.contactIds[0]) ?? new Set<string>();
    const rightEvents = edges.get(seed.contactIds[1]) ?? new Set<string>();
    const sharedEventIds = [...leftEvents]
      .filter((eventId) => rightEvents.has(eventId))
      .sort();
    const supportingLinks = links.filter((link) =>
      seed.identityHashes.has(link.identityHash) &&
      seed.contactIds.includes(link.contactId)
    );
    const sourceKinds = new Set<SourceKind>([
      left.primarySource,
      right.primarySource,
      ...supportingLinks.map((link) => link.source),
    ]);
    const decision = decisionById.get(seed.candidateId);
    const validDecision = decision?.organizerId === params.organizerId &&
      samePair(decision.contactIds, seed.contactIds) ? decision : undefined;
    result.push({
      candidateId: seed.candidateId,
      contacts: seed.contactIds.map((contactId) => {
        const contact = contacts.get(contactId)!;
        return {
          contactId,
          displayName: contact.displayNameOverride ?? contact.displayName,
          phoneE164: contact.phoneE164,
          email: contact.email,
          linkedAccount: contact.linkedUid !== null,
          primarySource: contact.primarySource,
          revision: contact.revision,
        };
      }),
      matchKinds: [...seed.matchKinds].sort(),
      confidence: seed.confidence,
      sourceKinds: [...sourceKinds].sort(),
      sharedEventIds: sharedEventIds.slice(0, 20),
      sharedEventCount: sharedEventIds.length,
      updatedAtMillis: seed.updatedAtMillis,
      decisionState: validDecision?.state ?? "none",
      decisionRevision: validDecision?.revision ?? null,
      canReopen: validDecision?.state === "differentPeople" &&
        validDecision.reviewedByUid === params.actorUid,
    });
  }
  return result;
}

async function loadEdges(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  contactIds: string[]
): Promise<Map<string, Set<string>>> {
  const eventsByContact = new Map<string, Set<string>>();
  for (const batch of chunks(contactIds, firestoreInLimit)) {
    if (batch.length === 0) continue;
    const snapshot = await db.collection("organizerContactEventEdges")
      .where("contactId", "in", batch).get();
    for (const document of snapshot.docs) {
      const edge = document.data() as OrganizerContactEventEdgeDocument;
      if (edge.organizerId !== organizerId || !batch.includes(edge.contactId)) {
        continue;
      }
      const eventIds = eventsByContact.get(edge.contactId) ?? new Set<string>();
      eventIds.add(edge.eventId);
      eventsByContact.set(edge.contactId, eventIds);
    }
  }
  return eventsByContact;
}

async function loadSupportingLinks(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  seeds: CandidateSeed[]
): Promise<OrganizerContactIdentityLinkDocument[]> {
  const hashes = [...new Set(seeds.flatMap((seed) =>
    [...seed.identityHashes]))];
  const result: OrganizerContactIdentityLinkDocument[] = [];
  for (const batch of chunks(hashes, firestoreInLimit)) {
    if (batch.length === 0) continue;
    const snapshot = await db.collection("organizerContactIdentityLinks")
      .where("identityHash", "in", batch).get();
    for (const document of snapshot.docs) {
      const link = document.data() as OrganizerContactIdentityLinkDocument;
      if (link.organizerId === organizerId) {
        result.push(link);
      }
    }
  }
  return result;
}

async function assertActiveContacts(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  contactIds: [string, string]
): Promise<void> {
  const snapshots = await Promise.all(contactIds.map((contactId) =>
    db.collection("organizerContacts").doc(contactId).get()
  ));
  for (const snapshot of snapshots) {
    const contact = snapshot.data() as OrganizerContactDocument | undefined;
    if (!contact || contact.organizerId !== organizerId ||
        contact.deletedAt !== null || contact.hiddenAt != null ||
        contact.identityState === "merged") {
      throw new HttpsError("not-found", "Audience contact not found.");
    }
  }
}

async function candidatePairExists(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  contactIds: [string, string]
): Promise<boolean> {
  const [claimSnapshot, linkSnapshot] = await Promise.all([
    db.collection("organizerContactIdentityClaims")
      .where("organizerId", "==", organizerId)
      .where("state", "==", "conflicted")
      .orderBy("updatedAt", "desc")
      .orderBy(admin.firestore.FieldPath.documentId(), "desc")
      .limit(maxClaimScan + 1)
      .get(),
    db.collection("organizerContactIdentityLinks")
      .where("organizerId", "==", organizerId)
      .where("confidence", "==", "proposed")
      .orderBy("updatedAt", "desc")
      .orderBy(admin.firestore.FieldPath.documentId(), "desc")
      .limit(maxLinkScan + 1)
      .get(),
  ]);
  const verified = claimSnapshot.docs.some((document) => {
    const claim = document.data() as OrganizerContactIdentityClaimDocument;
    const candidates = new Set([
      claim.verifiedContactId,
      ...claim.conflictingContactIds,
    ]);
    return contactIds.every((contactId) => candidates.has(contactId));
  });
  if (verified) return true;
  return proposedCandidateSeeds(
    organizerId,
    linkSnapshot.docs.map((document) => ({
      id: document.id,
      data: document.data() as OrganizerContactIdentityLinkDocument,
    }))
  ).some((seed) => samePair(seed.contactIds, contactIds));
}

function candidateIsAfter(
  seed: CandidateSeed,
  cursor: MergeReviewCursor | null
): boolean {
  if (!cursor) return true;
  if (seed.updatedAtMillis !== cursor.updatedAtMillis) {
    return seed.updatedAtMillis < cursor.updatedAtMillis;
  }
  return seed.candidateId.localeCompare(cursor.candidateId) < 0;
}

function compareSeeds(left: CandidateSeed, right: CandidateSeed): number {
  if (left.updatedAtMillis !== right.updatedAtMillis) {
    return right.updatedAtMillis - left.updatedAtMillis;
  }
  return right.candidateId.localeCompare(left.candidateId);
}

function encodeCursor(seed: CandidateSeed): string {
  return Buffer.from(JSON.stringify({
    version: 1,
    updatedAtMillis: seed.updatedAtMillis,
    candidateId: seed.candidateId,
  } satisfies MergeReviewCursor)).toString("base64url");
}

function decodeCursor(value: string | null): MergeReviewCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString()) as
      Partial<MergeReviewCursor>;
    if (parsed.version !== 1 ||
        !Number.isSafeInteger(parsed.updatedAtMillis) ||
        Number(parsed.updatedAtMillis) < 0 ||
        typeof parsed.candidateId !== "string" ||
        !/^ocmc_[a-f0-9]{48}$/.test(parsed.candidateId)) throw new Error();
    return parsed as MergeReviewCursor;
  } catch {
    throw new HttpsError("invalid-argument", "Merge review cursor is invalid.");
  }
}

function sortedPair(contactIds: readonly string[]): [string, string] {
  if (contactIds.length !== 2 || contactIds[0] === contactIds[1] ||
      contactIds.some((contactId) => !contactId || contactId.includes("/"))) {
    throw new HttpsError("invalid-argument", "Contact pair is invalid.");
  }
  return [...contactIds].sort() as [string, string];
}

function samePair(
  left: readonly string[],
  right: readonly string[]
): boolean {
  const leftPair = [...left].sort();
  const rightPair = [...right].sort();
  return leftPair.length === 2 && rightPair.length === 2 &&
    leftPair[0] === rightPair[0] && leftPair[1] === rightPair[1];
}

function nextRevision(
  current: number,
  now: FirebaseFirestore.Timestamp
): number {
  return Math.max(current + 1, now.toMillis(), 1);
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < values.length; start += size) {
    result.push(values.slice(start, start + size));
  }
  return result;
}

function normalizeListPayload(value: unknown): unknown {
  return normalizePayloadStrings(value, ["organizerId", "cursor"]);
}

function normalizeReviewPayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const normalized = normalizePayloadStrings(
    value,
    ["organizerId", "candidateId"]
  ) as Record<string, unknown>;
  if (Array.isArray(normalized.contactIds)) {
    normalized.contactIds = normalized.contactIds.map((contactId) =>
      typeof contactId === "string" ? contactId.trim() : contactId
    );
  }
  return normalized;
}

function normalizePayloadStrings(
  value: unknown,
  fields: string[]
): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = {...value} as Record<string, unknown>;
  for (const field of fields) {
    if (typeof input[field] === "string") input[field] = input[field].trim();
  }
  return input;
}

export const listOrganizerContactMergeCandidates = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 10}),
  (request) => listOrganizerContactMergeCandidatesHandler(request)
);

export const reviewOrganizerContactMergeCandidate = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 10}),
  (request) => reviewOrganizerContactMergeCandidateHandler(request)
);
