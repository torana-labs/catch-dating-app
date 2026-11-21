/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {logger} from "firebase-functions";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {setAdminAuditLogInTransaction} from "../platform/adminAudit";
import {organizerRouteReservationId} from "../admin/organizerPublishingGuards";
import {growthFactsCollection} from "../growth/organizerGrowthFacts";
import {supplyIntakeCollections} from "../operations/supplyIntake/worker";
import {record, storedInstantDraft} from "./model";

// A saved instant draft nobody claims is removed 30 days after it was saved
// (owner decision, 16 Nov 2026). Saving sets instantDraft.expiresAt; this
// cleanup reads only drafts that are due, a bounded page per run, and for
// each one decides in a transaction:
//
// - claimed (or owned by anyone), or its page is anything but a draft: it is
//   the organizer's now and is never touched; the draft stops being tracked.
// - a claim is pending: checked again in a week.
// - still an unclaimed, unpublished draft: the organizer is deleted (it was
//   only ever private, so no public page or link goes away), its route
//   reservation is released so the slug is free, its held review decision
//   and growth facts go with it, the approval receipt is marked superseded,
//   and the request records the expired outcome, which closes its Admin
//   Inbox item and answers the draft page with "expired".
//
// Every step is idempotent: an expired draft is skipped, and a second run
// over the same request changes nothing.

export const EXPIRY_ACTOR = "supply-instant-draft-expiry";
/** At most this many due drafts are decided per run; the rest wait for the next one. */
export const EXPIRY_BATCH = 25;
const CLAIM_PENDING_RECHECK_MS = 7 * 24 * 60 * 60 * 1000;

export interface InstantDraftExpiryDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Date;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
}

export const defaultInstantDraftExpiryDeps: InstantDraftExpiryDeps = {
  firestore: () => admin.firestore(),
  now: () => new Date(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
};

export type ExpiryOutcome = "expired" | "claimed" | "published" | "claim_pending" | "not_due" | "skipped";

/** Decides due drafts, oldest first, at most `limit` of them. */
export async function expireDueInstantDrafts(deps: InstantDraftExpiryDeps = defaultInstantDraftExpiryDeps,
  limit = EXPIRY_BATCH): Promise<Record<ExpiryOutcome, number>> {
  const db = deps.firestore();
  const due = await db.collection(supplyIntakeCollections.requests)
    .where("instantDraft.expiresAt", "<=", deps.now().toISOString())
    .orderBy("instantDraft.expiresAt", "asc")
    .limit(Math.max(1, Math.min(limit, EXPIRY_BATCH)))
    .get();
  const counts: Record<ExpiryOutcome, number> = {expired: 0, claimed: 0, published: 0, claim_pending: 0, not_due: 0,
    skipped: 0};
  for (const doc of due.docs) counts[await expireInstantDraft(deps, doc.id)] += 1;
  return counts;
}

/** Removes one due, still unclaimed and unpublished draft, or stops tracking a draft its organizer now owns. */
export async function expireInstantDraft(deps: InstantDraftExpiryDeps, requestId: string): Promise<ExpiryOutcome> {
  const db = deps.firestore();
  const requestRef = db.collection(supplyIntakeCollections.requests).doc(requestId);
  return db.runTransaction(async (tx) => {
    const stored = (await tx.get(requestRef)).data();
    const draft = storedInstantDraft(stored?.instantDraft);
    if (!stored || !draft || draft.outcome?.state === "expired") return "skipped" as const;
    const now = deps.now();
    const at = now.toISOString();
    if (typeof draft.expiresAt !== "string" || Date.parse(draft.expiresAt) > now.getTime()) return "not_due" as const;
    const track = (expiresAt: string | null) =>
      tx.update(requestRef, {instantDraft: {...draft, expiresAt}, updatedAt: at});
    const approval = record(stored.approval);
    const organizerId = typeof approval?.organizerId === "string" ? approval.organizerId : null;
    if (!organizerId) {
      track(null);
      return "skipped" as const;
    }
    const organizerRef = db.collection("organizers").doc(organizerId);
    const organizerSnap = await tx.get(organizerRef);
    const organizer = organizerSnap.exists ? organizerSnap.data() ?? {} : null;
    const page = record(organizer?.publicPage);
    const claimState = record(organizer?.claim)?.state;
    if (organizer && ownedBySomeone(organizer)) {
      track(null);
      return "claimed" as const;
    }
    if (organizer && page?.publishStatus !== "draft") {
      track(null);
      return "published" as const;
    }
    if (organizer && claimState !== "unclaimed") {
      // A claim in review: look again once it is decided.
      track(new Date(now.getTime() + CLAIM_PENDING_RECHECK_MS).toISOString());
      return "claim_pending" as const;
    }

    const canonicalPath = typeof page?.canonicalPath === "string" ? page.canonicalPath : null;
    const routeRef = canonicalPath ? db.collection("publicRouteReservations").doc(organizerRouteReservationId(canonicalPath)) : null;
    const approvalId = typeof approval?.approvalId === "string" ? approval.approvalId : null;
    const receiptRef = approvalId ? db.collection("organizerIntakeCurationDecisions").doc(approvalId) : null;
    const decisionRef = db.collection("organizerIntakeReviewDecisions").doc(organizerId);
    const growthRef = db.collection(growthFactsCollection).doc(organizerId);
    const [routeSnap, receiptSnap, decisionSnap, growthSnap] = await Promise.all([
      routeRef ? tx.get(routeRef) : Promise.resolve(null),
      receiptRef ? tx.get(receiptRef) : Promise.resolve(null),
      tx.get(decisionRef),
      tx.get(growthRef),
    ]);
    const route = routeSnap?.data();
    const releaseRoute = Boolean(routeRef && route?.status === "active" && route.targetPath === organizerRef.path);
    const timestamp = deps.serverTimestamp();

    if (organizer) tx.delete(organizerRef);
    if (routeRef && releaseRoute) {
      tx.update(routeRef, {status: "released", updatedAt: timestamp, releasedAt: timestamp, releasedByUid: EXPIRY_ACTOR,
        replacementRoutePath: null});
    }
    if (decisionSnap.exists && decisionSnap.data()?.publishStatus === "draft") tx.delete(decisionRef);
    if (growthSnap.exists) tx.delete(growthRef);
    if (receiptRef && receiptSnap?.exists && receiptSnap.data()?.entityId === organizerId) {
      tx.update(receiptRef, {operationStatus: "superseded", updatedAt: timestamp});
    }
    tx.update(requestRef, {instantDraft: {...draft, expiresAt: null,
      outcome: {state: "expired", reasons: ["unclaimed_after_30_days"], at}}, updatedAt: at});
    setAdminAuditLogInTransaction(tx, db, {uid: EXPIRY_ACTOR, roles: []}, {
      action: "expireInstantDraft", targetPath: organizerRef.path,
      before: {organizerId, requestId, publishStatus: page?.publishStatus ?? null, claimState: claimState ?? null,
        canonicalPath, savedAt: typeof approval?.approvedAt === "string" ? approval.approvedAt : null},
      after: {organizerDeleted: Boolean(organizer), routeReleased: releaseRoute, outcome: "expired"},
      note: "An instant draft nobody claimed within 30 days was removed and its page address freed.",
      serverTimestamp: deps.serverTimestamp,
    });
    return "expired" as const;
  });
}

/** Anyone holds this organizer: a claim went through, or it has an owner or host. */
function ownedBySomeone(organizer: Record<string, unknown>): boolean {
  const claimState = record(organizer.claim)?.state;
  const ownership = record(organizer.ownership)?.state;
  return claimState === "claimed" || claimState === "verified" || typeof organizer.ownerUserId === "string" ||
    typeof organizer.hostUserId === "string" && organizer.hostUserId.length > 0 ||
    (typeof ownership === "string" && ownership !== "programmatic") ||
    Array.isArray(organizer.hostUserIds) && organizer.hostUserIds.length > 0;
}

export const expireInstantDrafts = onSchedule({
  schedule: "23 4 * * *", timeZone: "Asia/Kolkata", timeoutSeconds: 300, maxInstances: 1,
}, async () => {
  const counts = await expireDueInstantDrafts();
  logger.info("Unclaimed instant drafts checked.", counts);
});
