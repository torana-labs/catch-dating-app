/* firestore-index: accessGrants (
  uid:ASCENDING,
  scopeType:ASCENDING,
  role:ASCENDING,
  status:ASCENDING
) */
/**
 * Payout setup authority. A user may connect a payout account once they own
 * at least one organizer, read from their organiser access documents
 * (`accessGrants/organizer__{organizerId}__{uid}` with role owner, #2474
 * step 3), the same documents security rules read.
 *
 * This replaces the retired `organizerHostClaims/{uid}` singleton, which no
 * current writer creates, so new owners were refused.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} uid The signed-in user.
 * @return {Promise<boolean>} True when the user owns an organizer.
 */
export async function ownsAnOrganizer(
  db: FirebaseFirestore.Firestore,
  uid: string
): Promise<boolean> {
  const seats = await db.collection("accessGrants")
    .where("uid", "==", uid)
    .where("scopeType", "==", "organizer")
    .where("role", "==", "owner")
    .where("status", "==", "active")
    .limit(1)
    .get();
  return !seats.empty;
}
