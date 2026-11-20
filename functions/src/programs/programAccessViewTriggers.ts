import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {
  changedOrganizerManagers,
  organizerManagers,
  programAccessViewsCollection,
  programWriteChangesStaffViews,
  reconcileOrganizerManagerViews,
  reconcileProgramAccessView,
} from "./programAccessView";

const options = {retry: true};

/** A programme's existing views are a small set: owner, staff, managers. */
const viewLimit = 500;

/** A grant, renewal or revocation: that account's view. */
export const onProgramAccessViewGrantChanged = onDocumentWritten({
  ...options, document: "programStaffGrants/{grantId}",
}, async (event) => {
  const grant = event.data?.after.data() ?? event.data?.before.data();
  if (!grant || typeof grant.programId !== "string" ||
      typeof grant.uid !== "string") return;
  await reconcileProgramAccessView(admin.firestore(), grant.programId,
    grant.uid);
});

/**
 * Every account whose view of [programId] a programme appearing, vanishing
 * or changing owner or organizer can change: each staff grant, the managers
 * of the old and new organizer, and every account that already has a view.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} programId The programme document id.
 * @param {string[]} organizerIds The old and new organizer ids.
 * @return {Promise<string[]>} The accounts, without the owners.
 */
async function programViewAccounts(db: FirebaseFirestore.Firestore,
  programId: string, organizerIds: string[]): Promise<string[]> {
  const accounts = new Set<string>();
  const add = (uid: unknown) => {
    if (typeof uid === "string" && uid.length > 0) accounts.add(uid);
  };
  const grants = await db.collection("programStaffGrants")
    .where("programId", "==", programId).get();
  for (const grant of grants.docs) add(grant.data().uid);
  for (const organizerId of organizerIds) {
    const organizer = await db.collection("organizers").doc(organizerId).get();
    for (const uid of organizerManagers(organizer.data())) add(uid);
  }
  const views = await db.collection(programAccessViewsCollection)
    .where("programId", "==", programId).limit(viewLimit).get();
  for (const view of views.docs) add(view.data().uid);
  return [...accounts].sort();
}

/**
 * A programme appearing or vanishing, or its creator or organizer changing:
 * the owner's view, and when the owner or organizer moved, every staff view
 * and every organizer manager's view.
 */
export const onProgramAccessViewProgramChanged = onDocumentWritten({
  ...options, document: "organizerPrograms/{programId}",
}, async (event) => {
  const db = admin.firestore();
  const programId = event.params.programId;
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const owners = new Set([before?.createdBy, after?.createdBy].filter(
    (uid): uid is string => typeof uid === "string" && uid.length > 0));
  for (const uid of owners) {
    await reconcileProgramAccessView(db, programId,
      uid);
  }
  if (!programWriteChangesStaffViews(before, after)) return;
  const organizerIds = [...new Set([before?.organizerId, after?.organizerId]
    .filter((id): id is string => typeof id === "string" && id.length > 0))];
  for (const uid of await programViewAccounts(db, programId, organizerIds)) {
    if (owners.has(uid)) continue;
    await reconcileProgramAccessView(db, programId, uid);
  }
});

/**
 * An organizer gaining or losing a manager (its hostUserId, ownerUserId or
 * hostUserIds, the fields requireProgramSetupAccess and the rules read): that
 * account's view of every programme of the organizer, so a new manager gets
 * the setup flag and a removed one loses it. Other organizer writes return
 * without reading anything.
 */
export const onProgramAccessViewOrganizerChanged = onDocumentWritten({
  ...options, document: "organizers/{organizerId}",
}, async (event) => {
  const changed = changedOrganizerManagers(event.data?.before.data(),
    event.data?.after.data());
  if (changed.length === 0) return;
  await reconcileOrganizerManagerViews(admin.firestore(),
    event.params.organizerId, changed);
});
