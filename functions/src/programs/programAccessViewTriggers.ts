import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {
  programWriteChangesStaffViews,
  reconcileProgramAccessView,
} from "./programAccessView";

const options = {retry: true};

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
 * A programme appearing or vanishing, or its creator or organizer changing:
 * the owner's view, and every staff view when the owner or organizer moved.
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
  const grants = await db.collection("programStaffGrants")
    .where("programId", "==", programId).get();
  for (const grant of grants.docs) {
    await reconcileProgramAccessView(db, programId, grant.data().uid);
  }
});
