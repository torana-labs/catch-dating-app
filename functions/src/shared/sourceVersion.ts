/**
 * Stale-event guard for Firestore-triggered projectors. A projector re-reads
 * its source inside a transaction and projects that; the guard additionally
 * skips an event older than the source's current version, so a late or
 * out-of-order delivery leaves the projection to the newer event.
 */

/**
 * What a trigger event saw of its source: the document's updateTime, or null
 * when the event is a delete.
 */
export type SourceVersion = FirebaseFirestore.Timestamp | null;

/**
 * The source version a trigger event carried.
 * @param {FirebaseFirestore.DocumentSnapshot | undefined} after Event after.
 * @return {SourceVersion | undefined} updateTime, null for a delete, or
 * undefined when the event carried no snapshot.
 */
export function sourceVersionOf(
  after: FirebaseFirestore.DocumentSnapshot | undefined
): SourceVersion | undefined {
  if (!after) return undefined;
  return after.exists ? after.updateTime ?? undefined : null;
}

/**
 * Whether a newer write to the source has landed since the event.
 * @param {FirebaseFirestore.DocumentSnapshot} source Source re-read inside
 * the projector's transaction.
 * @param {SourceVersion | undefined} eventVersion What the event saw;
 * undefined skips the check (repairs and direct calls).
 * @return {boolean} True when a later event owns the projection.
 */
export function isStaleSourceEvent(
  source: FirebaseFirestore.DocumentSnapshot,
  eventVersion: SourceVersion | undefined
): boolean {
  if (eventVersion === undefined || !source.exists) return false;
  // The source exists now, so a delete event was followed by a re-create.
  if (eventVersion === null) return true;
  const current = source.updateTime;
  if (!current) return false;
  return current.seconds > eventVersion.seconds ||
    (current.seconds === eventVersion.seconds &&
      current.nanoseconds > eventVersion.nanoseconds);
}
