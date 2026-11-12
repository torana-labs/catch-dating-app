/**
 * Payout setup authority. A user may connect a payout account once they own
 * at least one organizer, read from the canonical owner seat in
 * `organizerTeamMemberships/{organizerId_uid}`.
 *
 * This replaces the retired `organizerHostClaims/{uid}` singleton, which no
 * current writer creates, so new owners were refused.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} uid The signed-in user.
 * @return {Promise<boolean>} True when the user holds an active owner seat.
 */
export async function ownsAnOrganizer(
  db: FirebaseFirestore.Firestore,
  uid: string
): Promise<boolean> {
  const seats = await db.collection("organizerTeamMemberships")
    .where("uid", "==", uid)
    .where("role", "==", "owner")
    .where("status", "==", "active")
    .limit(1)
    .get();
  return !seats.empty;
}
