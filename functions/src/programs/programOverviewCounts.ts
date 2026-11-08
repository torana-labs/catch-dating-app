import {logger} from "firebase-functions";

/* firestore-index: programGuests (
  organizerId:ASCENDING,
  programId:ASCENDING
) */
/* firestore-index: programTravelLegs (
  organizerId:ASCENDING,
  programId:ASCENDING
) */

/** Planner overview numbers for one programme row. */
export interface ProgramOverviewCounts {
  guestCount: number;
  flyingInCount: number;
  /** Omitted when the programme has no guests. */
  repliedShare?: number;
}

const CHUNK = 30;
const READ_LIMIT = 5000;

/**
 * Guests, replies and inbound journeys for each listed programme, read in
 * bounded batches of 30 programmes. A batch that is too large or fails
 * yields no counts for its programmes; absence never means zero.
 */
export async function loadProgramOverviewCounts(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  programIds: ReadonlyArray<string>,
): Promise<Map<string, ProgramOverviewCounts>> {
  const counts = new Map<string, ProgramOverviewCounts>();
  for (let offset = 0; offset < programIds.length; offset += CHUNK) {
    const ids = programIds.slice(offset, offset + CHUNK);
    try {
      const [guests, legs] = await Promise.all([
        db.collection("programGuests")
          .where("organizerId", "==", organizerId)
          .where("programId", "in", ids).limit(READ_LIMIT + 1).get(),
        db.collection("programTravelLegs")
          .where("organizerId", "==", organizerId)
          .where("programId", "in", ids).limit(READ_LIMIT + 1).get(),
      ]);
      if (guests.size > READ_LIMIT || legs.size > READ_LIMIT) continue;
      const tally = new Map(ids.map((id) =>
        [id, {guests: 0, replied: 0, flying: 0}]));
      for (const doc of guests.docs) {
        const guest = doc.data();
        const row = tally.get(guest.programId);
        if (!row || guest.organizerId !== organizerId ||
            guest.anonymizedAt) continue;
        row.guests += 1;
        if (guest.rsvpStatus && guest.rsvpStatus !== "pending") {
          row.replied += 1;
        }
      }
      for (const doc of legs.docs) {
        const leg = doc.data();
        const row = tally.get(leg.programId);
        if (row && leg.organizerId === organizerId &&
            leg.kind === "inbound" && leg.readiness !== "noShow") {
          row.flying += 1;
        }
      }
      for (const [id, row] of tally) {
        counts.set(id, {
          guestCount: row.guests,
          flyingInCount: row.flying,
          ...(row.guests > 0 ?
            {repliedShare: Math.round(row.replied / row.guests * 1000) /
              1000} : {}),
        });
      }
    } catch (error) {
      logger.warn("Program overview counts unavailable", {error});
    }
  }
  return counts;
}
