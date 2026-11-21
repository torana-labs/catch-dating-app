import {FieldPath} from "firebase-admin/firestore";
import {isOrganizerOwner} from "../shared/organizerHosts";
import type {OrganizerDocument} from
  "../shared/generated/firestoreAdminTypes";

/**
 * The organizers a user owns: ownerUserId, or the legacy hostUserId when no
 * owner is recorded (the same rule as every owner-only billing callable).
 * The referral reward reads them to find the referrer's own organizer.
 */
type Db = FirebaseFirestore.Firestore;

/**
 * One page of the organizers a user owns, in id order. Both ownership fields
 * are read in id order from the same cursor, merged, and checked with the
 * owner rule, so the page and its cursor are exact.
 * @param {Db} db Firestore.
 * @param {string} uid The user.
 * @param {string|null} after Continue after this organizer id.
 * @param {number} limit Page size.
 * @return {Promise<object>} The page and the cursor for the next one.
 */
export async function ownedOrganizersPage(db: Db, uid: string,
  after: string | null, limit: number):
  Promise<{organizers: {id: string; data: OrganizerDocument}[];
    next: string | null}> {
  const read = (field: "ownerUserId" | "hostUserId") => {
    let query = db.collection("organizers").where(field, "==", uid)
      .orderBy(FieldPath.documentId());
    if (after !== null) query = query.startAfter(after);
    return query.limit(limit + 1).get();
  };
  const snaps = await Promise.all([read("ownerUserId"), read("hostUserId")]);
  const byId = new Map<string, OrganizerDocument>();
  for (const snap of snaps) {
    for (const doc of snap.docs) {
      const data = doc.data() as OrganizerDocument;
      // A legacy hostUserId match counts only when no owner is recorded.
      if (isOrganizerOwner(data, uid)) byId.set(doc.id, data);
    }
  }
  // A read that filled its window may hold unread ids past its last one, so
  // the page stops there: nothing past it is known to be in order yet.
  const full = snaps.filter((snap) => snap.size > limit);
  const bound = full.length === 0 ? null : full
    .map((snap) => snap.docs[snap.docs.length - 1].id).sort()[0];
  const ids = [...byId.keys()].sort()
    .filter((id) => bound === null || id <= bound);
  const page = ids.slice(0, limit);
  const more = ids.length > limit || bound !== null;
  // A window of ids owned by someone else (legacy hostUserId) still moves
  // the cursor on.
  const next = !more ? null : page.length === limit || bound === null ?
    page[page.length - 1] : bound;
  return {organizers: page.map((id) => ({id, data: byId.get(id)!})), next};
}
