import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {reconcileProgramGuestDirectoryRow} from
  "./programGuestDirectoryViews";
import {defineProjections} from "../platform/dispatch/runtime";

const options = {retry: true};

type Data = FirebaseFirestore.DocumentData | undefined;

const functionFacts = (data: Data) => data === undefined ? null :
  [data.programId, data.organizerId, data.functionId, data.guestId,
    data.invited, data.rsvpStatus, data.attendanceStatus,
    data.partySize ?? null];

/**
 * One guest's invitation, RSVP, attendance or party size at one function:
 * the row of the guest it names, before and after. A write that changes
 * none of them (a response note, a timestamp) reads nothing.
 */
export const onProgramGuestDirectoryFunctionGuestChanged = onDocumentWritten({
  ...options, document: "programFunctionGuests/{functionGuestId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (JSON.stringify(functionFacts(before)) ===
      JSON.stringify(functionFacts(after))) return;
  const guestIds = new Set<string>();
  for (const data of [before, after]) {
    if (typeof data?.guestId === "string" && data.guestId) {
      guestIds.add(data.guestId);
    }
  }
  for (const guestId of guestIds) {
    await reconcileProgramGuestDirectoryRow(admin.firestore(), "guest",
      guestId);
  }
});

/** A group's label, order, member count or existence: its row. */
export const onProgramGuestDirectoryGroupChanged = onDocumentWritten({
  ...options, document: "programGuestGroups/{groupId}",
}, async (event) => {
  await reconcileProgramGuestDirectoryRow(admin.firestore(), "group",
    event.params.groupId);
});

/**
 * Dispatcher specs (issue #2451). Each body re-reads its sources, so a
 * retry or a replay converges.
 */
export const programGuestsProjections = defineProjections("programGuests", [
  {
    id: "programGuestDirectoryGuestChanged", kind: "projection",
    when: () => true,
    run: async (change) => {
      const {documentId} = change;
      await reconcileProgramGuestDirectoryRow(admin.firestore(), "guest",
        documentId);
    },
  },
]);

export const programHouseholdsProjections = defineProjections(
  "programHouseholds", [
    {
      id: "programGuestDirectoryHouseholdChanged", kind: "projection",
      when: () => true,
      run: async (change) => {
        const {documentId} = change;
        await reconcileProgramGuestDirectoryRow(admin.firestore(), "household",
          documentId);
      },
    },
  ]);
