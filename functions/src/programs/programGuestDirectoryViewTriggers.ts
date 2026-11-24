import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {reconcileProgramGuestDirectoryRow} from
  "./programGuestDirectoryViews";
import {defineProjections} from "../platform/dispatch/runtime";

const options = {retry: true};

type Data = FirebaseFirestore.DocumentData | undefined;

/** A guest's fields, name evidence or existence: that guest's row. */
export const onProgramGuestDirectoryGuestChanged = onDocumentWritten({
  ...options, document: "programGuests/{guestId}",
}, async (event) => {
  await reconcileProgramGuestDirectoryRow(admin.firestore(), "guest",
    event.params.guestId);
});

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

/** A household's label, members or existence: its row. */
export const onProgramGuestDirectoryHouseholdChanged = onDocumentWritten({
  ...options, document: "programHouseholds/{householdId}",
}, async (event) => {
  await reconcileProgramGuestDirectoryRow(admin.firestore(), "household",
    event.params.householdId);
});

/** A group's label, order, member count or existence: its row. */
export const onProgramGuestDirectoryGroupChanged = onDocumentWritten({
  ...options, document: "programGuestGroups/{groupId}",
}, async (event) => {
  await reconcileProgramGuestDirectoryRow(admin.firestore(), "group",
    event.params.groupId);
});

/**
 * Dispatcher specs for the triggers above (issue #2451). Each runs its
 * trigger's body with the dispatch change in place of the event; the
 * bodies re-read their sources, so both running is safe until the old
 * triggers retire and these become the only copy.
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
