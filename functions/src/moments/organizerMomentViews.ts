import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {OrganizerMomentViewDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  MOMENT_RUNS_COLLECTION,
  MOMENTS_COLLECTION,
  momentFromDocument,
} from "./momentDocuments";
import {planAnchorFor, type MomentDefinition} from "./momentModel";
import {momentToWire} from "./momentWire";

export const organizerMomentViewsCollection = "organizerMomentViews";

/** Runs one moment's tally reads; past it the view is not rewritten. */
export const momentRunReadCap = 5000;

export interface MomentRunTally {
  sent: number;
  nextDueAtMillis: number | null;
}

/**
 * Sums one moment's sends and finds its earliest planned run, exactly as
 * listOrganizerMoments tallies `organizerMomentRuns`.
 * @param {ReadonlyArray<FirebaseFirestore.DocumentData>} runs The runs.
 * @return {MomentRunTally} The tally.
 */
export function tallyRuns(
  runs: ReadonlyArray<FirebaseFirestore.DocumentData>): MomentRunTally {
  const tally: MomentRunTally = {sent: 0, nextDueAtMillis: null};
  for (const run of runs) {
    if (run.status === "dispatched" && Number.isSafeInteger(run.sent) &&
        run.sent > 0) tally.sent += run.sent;
    if (run.status === "planned" && Number.isSafeInteger(run.dueAtMillis)) {
      tally.nextDueAtMillis = tally.nextDueAtMillis === null ?
        run.dueAtMillis : Math.min(tally.nextDueAtMillis, run.dueAtMillis);
    }
  }
  return tally;
}

/**
 * One moment's Moments board row: the moment exactly as listOrganizerMoments
 * returns it, and its plan summary (anchor, sent count, the next planned run
 * while armed). The board state that compares the scope's moments is left to
 * the reader. Organiser-scope automation moments get no row.
 * @param {MomentDefinition} moment The stored moment.
 * @param {MomentRunTally} tally Its runs' tally.
 * @return {OrganizerMomentViewDocument|null} The row, or null.
 */
export function organizerMomentView(moment: MomentDefinition,
  tally: MomentRunTally): OrganizerMomentViewDocument | null {
  const scope = moment.scope;
  if (scope.kind === "organizer") return null;
  // A JSON round trip drops undefined optional fields Firestore refuses.
  const wire = JSON.parse(JSON.stringify(momentToWire(moment))) as
    OrganizerMomentViewDocument["moment"];
  return {momentId: moment.momentId, scopeKind: scope.kind,
    scopeId: scope.kind === "event" ? scope.eventId : scope.programId,
    programId: scope.kind === "program" ? scope.programId : null,
    eventId: scope.kind === "event" ? scope.eventId : null,
    moment: wire,
    plan: {anchor: {...planAnchorFor(moment)}, sentCount: tally.sent,
      nextRunAtMillis: moment.status === "armed" ?
        tally.nextDueAtMillis : null},
    version: 1};
}

/** One moment's row from current sources, read only. */
export async function readOrganizerMomentView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  momentId: string): Promise<OrganizerMomentViewDocument | null> {
  const snap = await tx.get(db.collection(MOMENTS_COLLECTION).doc(momentId));
  if (!snap.exists) return null;
  const moment = momentFromDocument(snap.data() as Record<string, unknown>);
  if (moment === null || moment.scope.kind === "organizer") return null;
  const runs = await tx.get(db.collection(MOMENT_RUNS_COLLECTION)
    .where("momentId", "==", momentId).limit(momentRunReadCap + 1));
  if (runs.size > momentRunReadCap) {
    throw new Error("The moment has more runs than the view tallies.");
  }
  return organizerMomentView(moment,
    tallyRuns(runs.docs.map((doc) => doc.data())));
}

/** Rewrites one moment's row, writing only on change. */
export async function reconcileOrganizerMomentView(
  db: FirebaseFirestore.Firestore, momentId: string): Promise<void> {
  if (!momentId) return;
  await db.runTransaction(async (tx) => {
    const ref = db.collection(organizerMomentViewsCollection).doc(momentId);
    const old = await tx.get(ref);
    let next: OrganizerMomentViewDocument | null;
    try {
      next = await readOrganizerMomentView(db, tx, momentId);
    } catch (error) {
      logger.warn("Moment view kept a source that fails its contract.",
        {momentId,
          reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}
