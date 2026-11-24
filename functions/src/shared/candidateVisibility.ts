import type {PublicProfileDocument} from "./generated/firestoreAdminTypes";
import {requireDoc} from "./validation";

export type CandidatePublicProfile = PublicProfileDocument & {
  uid: string;
  [key: string]: unknown;
};

/** Resolves both directions of the viewer's block boundary. */
export async function fetchUidsBlockedWithViewer(
  db: FirebaseFirestore.Firestore,
  viewerUid: string
): Promise<Set<string>> {
  const [outgoing, incoming] = await Promise.all([
    db.collection("blocks").where("blockerUserId", "==", viewerUid).get(),
    db.collection("blocks").where("blockedUserId", "==", viewerUid).get(),
  ]);
  const blocked = new Set<string>();
  for (const doc of outgoing.docs) {
    const blockedUserId = doc.data()?.blockedUserId;
    if (typeof blockedUserId === "string") blocked.add(blockedUserId);
  }
  for (const doc of incoming.docs) {
    const blockerUserId = doc.data()?.blockerUserId;
    if (typeof blockerUserId === "string") blocked.add(blockerUserId);
  }
  return blocked;
}

/**
 * Loads the candidates' full dating profiles in the supplied order, from the
 * server-only guestProfiles the feed callables alone read (#2493, FIX-8). A
 * profile the projector has not copied there yet falls back to
 * publicProfiles until the guest-profiles migration has run.
 */
export async function fetchCandidatePublicProfiles(
  db: FirebaseFirestore.Firestore,
  uids: string[]
): Promise<CandidatePublicProfile[]> {
  const snaps = await Promise.all(uids.map(async (uid) => {
    const guest = await db.collection("guestProfiles").doc(uid).get();
    return guest.exists ? guest :
      db.collection("publicProfiles").doc(uid).get();
  }));
  const profiles: CandidatePublicProfile[] = [];
  snaps.forEach((snap, index) => {
    if (!snap.exists) return;
    const profile = requireDoc<PublicProfileDocument>(
      snap,
      "PublicProfileDocument"
    );
    profiles.push({uid: uids[index], ...profile});
  });
  return profiles;
}
