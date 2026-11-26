/**
 * An event's booking totals by cohort, kept server-only at
 * eventCohortCounts/{eventId} (#2493).
 *
 * A cohort (menInterestedInWomen, womenInterestedInMen, queerOrOpen,
 * nonBinaryOrOther) encodes gender and who a guest is interested in. On a
 * small event a per-cohort total can point to one person's orientation, and
 * organisers read events/{eventId}, so the totals the admission policy needs
 * live here instead. Organisers keep only what the policy needs: gender
 * totals stay on the event.
 *
 * The event document held these maps until #2493. Each one moves here the
 * first time a counter write touches it (eventDocumentWrites removes the
 * event's copy in the same write), and tool/data/move_event_cohort_counts.mjs
 * moves the rest; until then a map missing here falls back to the event's.
 */

export const EVENT_COHORT_COUNTS = "eventCohortCounts";

/** The cohort maps that live in eventCohortCounts, not on the event. */
export const eventCohortCountFields = [
  "cohortCounts",
  "waitlistedCohortCounts",
  "crossPathsPairHeldCohortCounts",
] as const;

export type EventCohortCountField = typeof eventCohortCountFields[number];

type Db = FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;

/**
 * The cohort totals document of one event.
 * @param {Db} db Firestore.
 * @param {string} eventId The event.
 * @return {FirebaseFirestore.DocumentReference} The document.
 */
export function eventCohortCountsRef(db: Db, eventId: string):
  FirebaseFirestore.DocumentReference {
  return db.collection(EVENT_COHORT_COUNTS).doc(eventId);
}

/**
 * The event with its cohort totals read from eventCohortCounts. A map the
 * private document does not hold yet keeps the event's legacy copy.
 * @param {T} event The stored event.
 * @param {unknown} counts The eventCohortCounts document data, if any.
 * @return {T} The event as admission logic should see it.
 */
export function withEventCohortCounts<T extends object>(event: T,
  counts: unknown): T {
  const stored = counts && typeof counts === "object" ?
    counts as Record<string, unknown> : {};
  const result: Record<string, unknown> = {...(event as object)};
  for (const field of eventCohortCountFields) {
    const value = stored[field];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[field] = value;
    }
  }
  return result as T;
}

/**
 * Reads an event's cohort totals inside a transaction and overlays them.
 * Call before any write of the transaction.
 * @param {Tx} tx Transaction.
 * @param {Db} db Firestore.
 * @param {string} eventId The event.
 * @param {T} event The stored event.
 * @return {Promise<T>} The event with its cohort totals.
 */
export async function readEventWithCohortCounts<T extends object>(tx: Tx,
  db: Db, eventId: string, event: T): Promise<T> {
  const snap = await tx.get(eventCohortCountsRef(db, eventId));
  return withEventCohortCounts(event, snap.data());
}

/**
 * Reads an event's cohort totals outside a transaction and overlays them.
 * @param {Db} db Firestore.
 * @param {string} eventId The event.
 * @param {T} event The stored event.
 * @return {Promise<T>} The event with its cohort totals.
 */
export async function fetchEventWithCohortCounts<T extends object>(db: Db,
  eventId: string, event: T): Promise<T> {
  const snap = await eventCohortCountsRef(db, eventId).get();
  return withEventCohortCounts(event, snap.data());
}
