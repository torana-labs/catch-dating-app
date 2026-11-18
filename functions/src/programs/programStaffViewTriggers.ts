import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {reconcileProgramStaffView} from "./programStaffViews";

const options = {retry: true};

/** A grant, renewal, revocation or anonymization: that member's row. */
export const onProgramStaffViewGrantChanged = onDocumentWritten({
  ...options, document: "programStaffGrants/{grantId}",
}, async (event) => {
  const grant = event.data?.after.data() ?? event.data?.before.data();
  if (!grant || typeof grant.programId !== "string" ||
      typeof grant.uid !== "string") return;
  await reconcileProgramStaffView(admin.firestore(), grant.programId,
    grant.uid);
});

/**
 * The programme's creator or organizer changing, or the programme appearing
 * or vanishing: every member's row, since the owner's approval proof binds to
 * the creator.
 */
export const onProgramStaffViewProgramChanged = onDocumentWritten({
  ...options, document: "organizerPrograms/{programId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (before && after && before.createdBy === after.createdBy &&
      before.organizerId === after.organizerId) return;
  const db = admin.firestore();
  const grants = await db.collection("programStaffGrants")
    .where("programId", "==", event.params.programId).limit(200).get();
  for (const grant of grants.docs) {
    await reconcileProgramStaffView(db, event.params.programId,
      grant.data().uid);
  }
});
