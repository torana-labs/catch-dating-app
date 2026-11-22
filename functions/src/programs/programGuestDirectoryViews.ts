/* firestore-index: programFunctionGuests (
  programId:ASCENDING,
  guestId:ASCENDING
) */
import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  ProgramFunctionGuestDocument,
  ProgramGuestDirectoryViewDocument,
  ProgramGuestGroupDocument,
  ProgramHouseholdDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  readProgramGuestFields,
  type ScopedProgramGuest,
} from "../workspaces/workspaceFieldAuthority";

export const programGuestDirectoryViewsCollection =
  "programGuestDirectoryViews";

export type ProgramGuestDirectoryKind = "guest" | "household" | "group";

const sourceCollections: Record<ProgramGuestDirectoryKind, string> = {
  guest: "programGuests",
  household: "programHouseholds",
  group: "programGuestGroups",
};

/** At most this many function rows are read for one guest. */
export const maxGuestFunctions = 60;

/**
 * programGuestDirectoryViews document id: one row per guest, household and
 * group, named by its kind so the three source id spaces never collide.
 * @param {ProgramGuestDirectoryKind} kind The row's kind.
 * @param {string} sourceId The source document id.
 * @return {string} The view document id.
 */
export function programGuestDirectoryViewId(kind: ProgramGuestDirectoryKind,
  sourceId: string): string {
  return `${kind}__${sourceId}`;
}

type Data = FirebaseFirestore.DocumentData | undefined;

const isId = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 180;

function base(kind: ProgramGuestDirectoryKind, sourceId: string,
  data: FirebaseFirestore.DocumentData) {
  return {programId: data.programId as string,
    organizerId: data.organizerId as string, kind, sourceId,
    guest: null, household: null, group: null, version: 1 as const};
}

/**
 * One function row of a guest's directory entry, as listProgramGuests
 * returned it; null when the row belongs to another programme or organizer.
 * @param {Data} data The programFunctionGuests document.
 * @param {string} programId The guest's programme.
 * @param {string} organizerId The guest's organizer.
 * @return {object|null} The row.
 */
function functionRow(data: Data, programId: string, organizerId: string) {
  const row = data as ProgramFunctionGuestDocument | undefined;
  if (!row || row.programId !== programId || row.organizerId !== organizerId ||
      !isId(row.functionId)) return null;
  return {functionId: row.functionId, invited: row.invited === true,
    rsvpStatus: row.rsvpStatus, attendanceStatus: row.attendanceStatus,
    partySize: row.partySize ?? null};
}

/**
 * One guest's directory row from current sources, read only: the guest
 * fields listProgramGuests returned, with the name, phone and email resolved
 * from the workspace field assertions exactly as the callable resolves them,
 * and the guest's function rows. Null when the guest is gone or its name is
 * not disclosable (the callable skipped such guests). The assertions, their
 * ids and the field authority never reach the row.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.Transaction} tx The transaction to read in.
 * @param {string} guestId The guest document id.
 * @return {Promise<ProgramGuestDirectoryViewDocument|null>} The row.
 */
export async function readGuestDirectoryRow(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, guestId: string):
  Promise<ProgramGuestDirectoryViewDocument | null> {
  const snap = await tx.get(db.collection("programGuests").doc(guestId));
  const data = snap.data();
  if (!data || !isId(data.programId) || !isId(data.organizerId)) return null;
  const guest = data as ScopedProgramGuest;
  const fields = await readProgramGuestFields({db, tx,
    programId: guest.programId, organizerId: guest.organizerId, guestId,
    guest, includeAlternatives: false});
  if (fields.values.displayName === null) return null;
  const joins = await tx.get(db.collection("programFunctionGuests")
    .where("programId", "==", guest.programId)
    .where("guestId", "==", guestId)
    .limit(maxGuestFunctions));
  const functions = [];
  for (const doc of joins.docs) {
    const row = functionRow(doc.data(), guest.programId, guest.organizerId);
    if (row) functions.push(row);
    else {
      logger.warn("Guest directory skipped a function row of another " +
        "programme.", {guestId, rowId: doc.id});
    }
  }
  functions.sort((a, b) => a.functionId.localeCompare(b.functionId));
  return {...base("guest", guestId, data), guest: {
    displayName: fields.values.displayName,
    householdId: guest.householdId ?? null,
    contactId: guest.contactId ?? null,
    phoneE164: fields.values.phoneE164,
    email: fields.values.email,
    externalReference: guest.externalReference ?? null,
    groupIds: [...(guest.groupIds ?? [])],
    invitationStatus: guest.invitationStatus,
    rsvpStatus: guest.rsvpStatus,
    revision: guest.revision,
    functions,
  }};
}

/**
 * One household's directory row, as listProgramGuests returned it: its
 * label, members and revision, never its primary contact.
 * @param {string} householdId The household document id.
 * @param {Data} data The household document.
 * @return {ProgramGuestDirectoryViewDocument|null} The row.
 */
export function householdDirectoryRow(householdId: string, data: Data):
  ProgramGuestDirectoryViewDocument | null {
  if (!data || !isId(data.programId) || !isId(data.organizerId)) return null;
  const household = data as ProgramHouseholdDocument;
  return {...base("household", householdId, data), household: {
    label: household.label,
    memberGuestIds: [...(household.memberGuestIds ?? [])],
    revision: household.revision,
  }};
}

/**
 * One group's directory row, as listProgramGuests returned it.
 * @param {string} groupId The group document id.
 * @param {Data} data The group document.
 * @return {ProgramGuestDirectoryViewDocument|null} The row.
 */
export function groupDirectoryRow(groupId: string, data: Data):
  ProgramGuestDirectoryViewDocument | null {
  if (!data || !isId(data.programId) || !isId(data.organizerId)) return null;
  const group = data as ProgramGuestGroupDocument;
  return {...base("group", groupId, data), group: {
    label: group.label,
    dimension: group.dimension,
    sortOrder: group.sortOrder,
    memberCount: group.memberCount,
    revision: group.revision,
  }};
}

/**
 * One directory row from current sources, read only; also used by the
 * migration.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.Transaction} tx The transaction to read in.
 * @param {ProgramGuestDirectoryKind} kind The row's kind.
 * @param {string} sourceId The source document id.
 * @return {Promise<ProgramGuestDirectoryViewDocument|null>} The row.
 */
export async function readProgramGuestDirectoryRow(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  kind: ProgramGuestDirectoryKind, sourceId: string):
  Promise<ProgramGuestDirectoryViewDocument | null> {
  if (kind === "guest") return readGuestDirectoryRow(db, tx, sourceId);
  const snap = await tx.get(
    db.collection(sourceCollections[kind]).doc(sourceId));
  return kind === "household" ?
    householdDirectoryRow(sourceId, snap.data()) :
    groupDirectoryRow(sourceId, snap.data());
}

/**
 * Rewrites one directory row from current sources inside a transaction,
 * writing only on change and deleting the row when its source is gone or
 * hidden. A source that fails its contract is logged and keeps the previous
 * row, so a retry cannot loop.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {ProgramGuestDirectoryKind} kind The row's kind.
 * @param {string} sourceId The source document id.
 * @return {Promise<void>} Resolves once the row matches its sources.
 */
export async function reconcileProgramGuestDirectoryRow(
  db: FirebaseFirestore.Firestore, kind: ProgramGuestDirectoryKind,
  sourceId: string): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(programGuestDirectoryViewsCollection)
      .doc(programGuestDirectoryViewId(kind, sourceId));
    const old = await tx.get(ref);
    let next: ProgramGuestDirectoryViewDocument | null;
    try {
      next = await readProgramGuestDirectoryRow(db, tx, kind, sourceId);
    } catch (error) {
      logger.warn("Programme guest directory kept a source that fails its " +
        "contract.", {kind, sourceId,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}
