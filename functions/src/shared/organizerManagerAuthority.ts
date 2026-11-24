import {HttpsError} from "firebase-functions/v2/https";
import {readOrganizerAccessRole} from
  "../domain/access/organizerAccessGrants";

/**
 * Requires organiser management authority: a live
 * accessGrants/organizer__{organizerId}__{uid} document, the same document
 * security rules read (#2474 step 3). The owner and every manager hold one;
 * the commands that change them write it in their own transaction.
 */
export async function requireOrganizerManager(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  actorUid: string;
  transaction?: FirebaseFirestore.Transaction;
}): Promise<void> {
  const ref = params.db.collection("organizers").doc(params.organizerId);
  const organizerSnap = params.transaction ?
    await params.transaction.get(ref) : await ref.get();
  if (!organizerSnap.exists) {
    throw new HttpsError("not-found", "Organizer not found.");
  }
  const role = await readOrganizerAccessRole(params.db, params.organizerId,
    params.actorUid, params.transaction);
  if (role === null) {
    throw new HttpsError(
      "permission-denied",
      "Only organizer owners and managers can access this organizer."
    );
  }
}
