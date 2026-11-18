import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  ProgramDoorFunctionDocument,
  ProgramDoorJournalDocument,
  ProgramDoorJournalViewDocument,
  ProgramDoorRowDocument,
  ProgramFunctionDocument,
  ProgramFunctionGuestDocument,
  ProgramGuestDocument,
  ProgramHouseholdDocument,
} from "../shared/generated/firestoreAdminTypes";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {programStaffGrantId} from "../shared/programAuthority";

export const programDoorFunctionsCollection = "programDoorFunctions";
export const programDoorRowsCollection = "programDoorRows";
export const programDoorJournalViewsCollection = "programDoorJournalViews";

/** programDoorRows document id: one row per function and guest. */
export function programDoorRowId(functionId: string,
  guestId: string): string {
  return `${functionId}__${guestId}`;
}

/**
 * The door header of one function: exactly the function fields
 * getProgramFunctionDoorView returned.
 * @param {string} functionId The function document id.
 * @param {FirebaseFirestore.DocumentData|undefined} data The function data.
 * @return {ProgramDoorFunctionDocument|null} The header, or null.
 */
export function programDoorFunction(functionId: string,
  data: FirebaseFirestore.DocumentData | undefined):
  ProgramDoorFunctionDocument | null {
  if (!data || typeof data.programId !== "string" || !data.programId ||
      typeof data.organizerId !== "string" || !data.organizerId) return null;
  const fn = data as ProgramFunctionDocument;
  return {programId: fn.programId, organizerId: fn.organizerId, functionId,
    name: fn.name, invitationMode: fn.invitationMode ?? "allGuests",
    checkInEnabled: fn.checkInEnabled ?? true, status: fn.status,
    startsAtMillis: staffTimestampMillis(fn.startsAt),
    endsAtMillis: staffTimestampMillis(fn.endsAt),
    venueName: fn.venueName ?? null, venueNotes: fn.venueNotes ?? null,
    dressCode: fn.dressCode ?? null, instructions: fn.instructions ?? null,
    expectedCount: fn.expectedCount ?? 0,
    checkedInCount: fn.checkedInCount ?? 0, version: 1};
}

/**
 * One guest's roster row at one function, or null when the guest is not on
 * the door list. An allGuests function invites every programme guest even
 * without a join row; a selectedGuests function lists only join rows. A guest
 * who is neither invited nor checked in is not listed, as in the callable.
 * @param {string} functionId The function document id.
 * @param {FirebaseFirestore.DocumentData|undefined} fnData The function.
 * @param {string} guestId The guest document id.
 * @param {FirebaseFirestore.DocumentData|undefined} joinData The join row.
 * @param {FirebaseFirestore.DocumentData|undefined} guestData The guest.
 * @param {string|null} householdLabel The guest's household label.
 * @return {ProgramDoorRowDocument|null} The row, or null.
 */
export function programDoorRow(functionId: string,
  fnData: FirebaseFirestore.DocumentData | undefined, guestId: string,
  joinData: FirebaseFirestore.DocumentData | undefined,
  guestData: FirebaseFirestore.DocumentData | undefined,
  householdLabel: string | null): ProgramDoorRowDocument | null {
  const header = programDoorFunction(functionId, fnData);
  if (!header || !guestData || guestData.programId !== header.programId) {
    return null;
  }
  const guest = guestData as ProgramGuestDocument;
  const join = joinData && joinData.programId === header.programId ?
    joinData as ProgramFunctionGuestDocument : undefined;
  const allGuests = header.invitationMode === "allGuests";
  const invited = allGuests ? join?.invited ?? true : join?.invited ?? false;
  const attendanceStatus = join?.attendanceStatus ?? "expected";
  if (!invited && attendanceStatus === "expected") return null;
  return {programId: header.programId, organizerId: header.organizerId,
    functionId, guestId, displayName: guest.displayName, invited,
    rsvpStatus: join?.rsvpStatus ?? "pending", attendanceStatus,
    partySize: join?.partySize ?? null, householdLabel,
    responseNote: join?.responseNote ?? null, version: 1};
}

/**
 * A door journal entry's view: the guest's name, the action and the acting
 * staff member's label. An anonymized entry carries no name, note or label.
 * @param {string} journalId The journal document id.
 * @param {FirebaseFirestore.DocumentData|undefined} data The journal entry.
 * @param {string|null} guestName The guest's display name.
 * @param {string|null} actorLabel The actor's grant display name.
 * @return {ProgramDoorJournalViewDocument|null} The view, or null.
 */
export function programDoorJournalView(journalId: string,
  data: FirebaseFirestore.DocumentData | undefined,
  guestName: string | null, actorLabel: string | null):
  ProgramDoorJournalViewDocument | null {
  if (!data || typeof data.programId !== "string" || !data.programId) {
    return null;
  }
  const entry = data as ProgramDoorJournalDocument;
  const anonymized = entry.anonymizedAt != null;
  return {programId: entry.programId, organizerId: entry.organizerId,
    functionId: entry.functionId, guestId: entry.guestId,
    displayName: anonymized ? null : guestName, action: entry.action,
    occurredAtMillis: entry.occurredAtMillis,
    partySize: entry.partySize ?? null,
    note: anonymized ? null : entry.note ?? null,
    actorLabel: anonymized ? null : actorLabel, version: 1};
}

async function householdLabelOf(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  guest: FirebaseFirestore.DocumentData | undefined,
  programId: string): Promise<string | null> {
  const householdId = guest?.householdId;
  if (typeof householdId !== "string" || !householdId) return null;
  const snap = await tx.get(
    db.collection("programHouseholds").doc(householdId));
  const household = snap.data() as ProgramHouseholdDocument | undefined;
  return household && household.programId === programId ?
    household.label : null;
}

/** One row from current sources, read only; also used by the migration. */
export async function readProgramDoorRow(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, functionId: string, guestId: string):
  Promise<ProgramDoorRowDocument | null> {
  const fn = await tx.get(db.collection("programFunctions").doc(functionId));
  const join = await tx.get(db.collection("programFunctionGuests")
    .doc(`${functionId}_${guestId}`));
  const guest = await tx.get(db.collection("programGuests").doc(guestId));
  const label = await householdLabelOf(db, tx, guest.data(),
    fn.data()?.programId);
  return programDoorRow(functionId, fn.data(), guestId, join.data(),
    guest.data(), label);
}

/** One function's header from its source, read only. */
export async function readProgramDoorFunction(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  functionId: string): Promise<ProgramDoorFunctionDocument | null> {
  const fn = await tx.get(db.collection("programFunctions").doc(functionId));
  return programDoorFunction(functionId, fn.data());
}

/** One journal view from current sources, read only. */
export async function readProgramDoorJournalView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  journalId: string): Promise<ProgramDoorJournalViewDocument | null> {
  const journal = await tx.get(
    db.collection("programDoorJournal").doc(journalId));
  const data = journal.data();
  if (!data) return null;
  const guest = await tx.get(
    db.collection("programGuests").doc(data.guestId));
  const grant = await tx.get(db.collection("programStaffGrants")
    .doc(programStaffGrantId(data.programId, data.actorUid)));
  const label = grant.data()?.displayName;
  return programDoorJournalView(journalId, data,
    guest.data()?.programId === data.programId ?
      guest.data()?.displayName ?? null : null,
    typeof label === "string" && label !== "" ? label : null);
}

async function reconcile<T>(db: FirebaseFirestore.Firestore,
  collection: string, id: string, what: string,
  read: (tx: FirebaseFirestore.Transaction) => Promise<T | null>):
  Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(collection).doc(id);
    const old = await tx.get(ref);
    let next: T | null;
    try {
      next = await read(tx);
    } catch (error) {
      logger.warn(`${what} kept a source that fails its contract.`, {id,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/** Rewrites one function's door header, writing only on change. */
export function reconcileProgramDoorFunction(
  db: FirebaseFirestore.Firestore, functionId: string): Promise<void> {
  return reconcile(db, programDoorFunctionsCollection, functionId,
    "Programme door function view",
    (tx) => readProgramDoorFunction(db, tx, functionId));
}

/** Rewrites one guest's row at one function, writing only on change. */
export function reconcileProgramDoorRow(db: FirebaseFirestore.Firestore,
  functionId: string, guestId: string): Promise<void> {
  return reconcile(db, programDoorRowsCollection,
    programDoorRowId(functionId, guestId), "Programme door row",
    (tx) => readProgramDoorRow(db, tx, functionId, guestId));
}

/** Rewrites one journal entry's view, writing only on change. */
export function reconcileProgramDoorJournalView(
  db: FirebaseFirestore.Firestore, journalId: string): Promise<void> {
  return reconcile(db, programDoorJournalViewsCollection, journalId,
    "Programme door journal view",
    (tx) => readProgramDoorJournalView(db, tx, journalId));
}
