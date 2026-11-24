/* firestore-index: programDoorJournal (
  programId:ASCENDING,
  actorUid:ASCENDING
) */
import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {
  programDoorRowsCollection,
  programDoorJournalViewsCollection,
  reconcileProgramDoorFunction,
  reconcileProgramDoorJournalView,
  reconcileProgramDoorRow,
} from "./programDoorViews";
import {defineProjections} from "../platform/dispatch/runtime";

const options = {retry: true};
const fanoutLimit = 600;

type Data = FirebaseFirestore.DocumentData | undefined;

const programIdOf = (before: Data, after: Data): string | null => {
  const id = after?.programId ?? before?.programId;
  return typeof id === "string" && id ? id : null;
};

/** The programme's function ids, a bounded set. */
async function functionIds(db: FirebaseFirestore.Firestore,
  programId: string): Promise<string[]> {
  const snap = await db.collection("programFunctions")
    .where("programId", "==", programId).limit(60).get();
  return snap.docs.map((doc) => doc.id);
}

async function reconcileGuestRows(db: FirebaseFirestore.Firestore,
  programId: string, guestId: string): Promise<void> {
  for (const functionId of await functionIds(db, programId)) {
    await reconcileProgramDoorRow(db, functionId, guestId);
  }
}

/** A function's header, and its whole roster when the list itself moved. */
export const onProgramDoorFunctionChanged = onDocumentWritten({
  ...options, document: "programFunctions/{functionId}",
}, async (event) => {
  const db = admin.firestore();
  const functionId = event.params.functionId;
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  await reconcileProgramDoorFunction(db, functionId);
  const mode = (data: Data) => data?.invitationMode ?? "allGuests";
  if (before && after && mode(before) === mode(after) &&
      before.programId === after.programId) return;
  const programId = programIdOf(before, after);
  if (!programId) return;
  const guestIds = new Set<string>();
  const guests = await db.collection("programGuests")
    .where("programId", "==", programId).limit(fanoutLimit).get();
  for (const doc of guests.docs) guestIds.add(doc.id);
  const rows = await db.collection(programDoorRowsCollection)
    .where("functionId", "==", functionId).limit(fanoutLimit).get();
  for (const doc of rows.docs) guestIds.add(doc.data().guestId);
  for (const guestId of guestIds) {
    await reconcileProgramDoorRow(db, functionId, guestId);
  }
});

/** One guest's attendance, RSVP or response note at one function. */
export const onProgramDoorJoinChanged = onDocumentWritten({
  ...options, document: "programFunctionGuests/{joinId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const ids = new Set<string>();
  for (const data of [before, after]) {
    if (typeof data?.functionId === "string" &&
        typeof data?.guestId === "string") {
      ids.add(`${data.functionId}|${data.guestId}`);
    }
  }
  for (const id of ids) {
    const [functionId, guestId] = id.split("|");
    await reconcileProgramDoorRow(admin.firestore(), functionId, guestId);
  }
});

/**
 * A guest's name, household or existence: their row at every function, and
 * the journal views that name them.
 */
export const onProgramDoorGuestChanged = onDocumentWritten({
  ...options, document: "programGuests/{guestId}",
}, async (event) => {
  const db = admin.firestore();
  const guestId = event.params.guestId;
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const programId = programIdOf(before, after);
  if (!programId) return;
  const watched = (data: Data) => [data?.displayName, data?.householdId];
  if (before && after &&
      JSON.stringify(watched(before)) === JSON.stringify(watched(after))) {
    return;
  }
  await reconcileGuestRows(db, programId, guestId);
  const views = await db.collection(programDoorJournalViewsCollection)
    .where("programId", "==", programId).where("guestId", "==", guestId)
    .limit(fanoutLimit).get();
  for (const doc of views.docs) {
    await reconcileProgramDoorJournalView(db, doc.id);
  }
});

/** A household's label or members: each member's rows. */
export const onProgramDoorHouseholdChanged = onDocumentWritten({
  ...options, document: "programHouseholds/{householdId}",
}, async (event) => {
  const db = admin.firestore();
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const programId = programIdOf(before, after);
  if (!programId) return;
  if (before && after && before.label === after.label &&
      JSON.stringify(before.memberGuestIds) ===
        JSON.stringify(after.memberGuestIds)) return;
  const members = new Set<string>([...(before?.memberGuestIds ?? []),
    ...(after?.memberGuestIds ?? [])]);
  for (const guestId of members) {
    await reconcileGuestRows(db, programId, guestId);
  }
});

/** A door journal entry appearing, or being anonymized. */
export const onProgramDoorJournalChanged = onDocumentWritten({
  ...options, document: "programDoorJournal/{journalId}",
}, (event) => reconcileProgramDoorJournalView(admin.firestore(),
  event.params.journalId));

/** A staff member's display name: the label on their journal entries. */
export const onProgramDoorStaffLabelChanged = onDocumentWritten({
  ...options, document: "programStaffGrants/{grantId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  const programId = programIdOf(before, after);
  const uid = after?.uid ?? before?.uid;
  if (!programId || typeof uid !== "string") return;
  if (before && after && before.displayName === after.displayName) return;
  const db = admin.firestore();
  // One equality filter keeps this off the composite index list; the
  // programme is checked on each entry.
  const entries = await db.collection("programDoorJournal")
    .where("actorUid", "==", uid).limit(fanoutLimit).get();
  for (const doc of entries.docs) {
    if (doc.data().programId !== programId) continue;
    await reconcileProgramDoorJournalView(db, doc.id);
  }
});

/**
 * Dispatcher specs for the triggers above (issue #2451). Each runs its
 * trigger's body with the dispatch change in place of the event; the
 * bodies re-read their sources, so both running is safe until the old
 * triggers retire and these become the only copy.
 */
export const programStaffGrantsProjections = defineProjections(
  "programStaffGrants", [
    {
      id: "programDoorStaffLabelChanged", kind: "projection",
      when: () => true,
      run: async (change) => {
        const {before, after} = change;
        const programId = programIdOf(before, after);
        const uid = after?.uid ?? before?.uid;
        if (!programId || typeof uid !== "string") return;
        if (before && after && before.displayName === after.displayName) return;
        const db = admin.firestore();
        // One equality filter keeps this off the composite index list; the
        // programme is checked on each entry.
        const entries = await db.collection("programDoorJournal")
          .where("actorUid", "==", uid).limit(fanoutLimit).get();
        for (const doc of entries.docs) {
          if (doc.data().programId !== programId) continue;
          await reconcileProgramDoorJournalView(db, doc.id);
        }
      },
    },
  ]);

export const programGuestsProjections = defineProjections("programGuests", [
  {
    id: "programDoorGuestChanged", kind: "projection",
    when: () => true,
    run: async (change) => {
      const {before, after, documentId} = change;
      const db = admin.firestore();
      const guestId = documentId;
      const programId = programIdOf(before, after);
      if (!programId) return;
      const watched = (data: Data) => [data?.displayName, data?.householdId];
      if (before && after &&
          JSON.stringify(watched(before)) === JSON.stringify(watched(after))) {
        return;
      }
      await reconcileGuestRows(db, programId, guestId);
      const views = await db.collection(programDoorJournalViewsCollection)
        .where("programId", "==", programId).where("guestId", "==", guestId)
        .limit(fanoutLimit).get();
      for (const doc of views.docs) {
        await reconcileProgramDoorJournalView(db, doc.id);
      }
    },
  },
]);

export const programHouseholdsProjections = defineProjections(
  "programHouseholds", [
    {
      id: "programDoorHouseholdChanged", kind: "projection",
      when: () => true,
      run: async (change) => {
        const {before, after} = change;
        const db = admin.firestore();
        const programId = programIdOf(before, after);
        if (!programId) return;
        if (before && after && before.label === after.label &&
          JSON.stringify(before.memberGuestIds) ===
            JSON.stringify(after.memberGuestIds)) return;
        const members = new Set<string>([...(before?.memberGuestIds ?? []),
          ...(after?.memberGuestIds ?? [])]);
        for (const guestId of members) {
          await reconcileGuestRows(db, programId, guestId);
        }
      },
    },
  ]);
