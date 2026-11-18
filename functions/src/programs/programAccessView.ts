import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  OrganizerProgramDocument,
  ProgramAccessViewDocument,
  ProgramStaffGrantDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  activeProgramDuties,
  programOwnerAuthorizationDeadline,
  programStaffDuties,
  programStaffGrantId,
} from "../shared/programAuthority";
import type {ProgramDutyAssignment, ProgramStaffDuty} from
  "../shared/programAuthority";

export const programAccessViewsCollection = "programAccessViews";

type ExpiryMap = Record<string, number>;

/** programAccessViews document id: one view per program and account. */
export function programAccessViewId(programId: string, uid: string): string {
  return programStaffGrantId(programId, uid);
}

function raise(map: ExpiryMap, key: string, expiresAtMillis: number): void {
  if ((map[key] ?? 0) < expiresAtMillis) map[key] = expiresAtMillis;
}

const emptyMaps = () => ({
  duties: {} as ExpiryMap,
  pickupAll: {} as ExpiryMap,
  pickupScoped: {} as ExpiryMap,
  hotelAll: {} as ExpiryMap,
  hotelScoped: {} as ExpiryMap,
  functionAll: {} as ExpiryMap,
  functionScoped: {} as ExpiryMap,
  workPickup: {} as ExpiryMap,
  workHotel: {} as ExpiryMap,
  workFunction: {} as ExpiryMap,
});

/** Key standing for every pickup point, hotel or function in a work map. */
export const workAllKey = "*";

const doorDuties: ReadonlySet<ProgramStaffDuty> = new Set([
  "functionCheckIn", "functionLead", "guestRelations", "programCoordinator"]);

/**
 * The programme owner's view: a manager who holds every duty. Security rules
 * treat a live manager view as covering all duties and scopes, so the maps
 * stay empty.
 * @param {OrganizerProgramDocument} program The programme.
 * @param {string} programId The programme document id.
 * @return {ProgramAccessViewDocument|null} The view, or null without a
 *   creator.
 */
export function ownerProgramAccessView(program: OrganizerProgramDocument,
  programId: string): ProgramAccessViewDocument | null {
  if (typeof program.createdBy !== "string" || !program.createdBy) return null;
  return {programId, organizerId: program.organizerId,
    uid: program.createdBy, ownerUid: program.createdBy, role: "manager",
    status: "active", activeFromMillis: 0, expiresAtMillis: null,
    ...emptyMaps(), revision: 0, version: 1};
}

/**
 * A staff member's view from their grant, mirroring requireProgramAccess and
 * activeProgramDuties without the clock: the owner-approval proof, the grant
 * expiry and each assignment's expiry fold into per-duty expiry instants, so
 * rules need only compare them with the request time. Duties already past
 * their expiry when the view is written can never be live again and are
 * dropped. A grant that cannot prove access still gets an inactive view, so a
 * phone sees its authority narrow.
 * @param {OrganizerProgramDocument} program The programme.
 * @param {string} programId The programme document id.
 * @param {ProgramStaffGrantDocument} grant The staff grant.
 * @param {number} nowMillis The evaluation time.
 * @return {ProgramAccessViewDocument|null} The view, or null when the grant
 *   does not belong to the programme and account its id names.
 */
export function staffProgramAccessView(program: OrganizerProgramDocument,
  programId: string, grant: ProgramStaffGrantDocument,
  nowMillis: number): ProgramAccessViewDocument | null {
  if (typeof program.createdBy !== "string" || !program.createdBy ||
      grant.programId !== programId ||
      grant.organizerId !== program.organizerId) return null;
  const base = {programId, organizerId: program.organizerId, uid: grant.uid,
    ownerUid: program.createdBy, role: "staff" as const,
    revision: Number.isSafeInteger(grant.revision) && grant.revision >= 0 ?
      grant.revision : 0, version: 1 as const};
  const inactive = (): ProgramAccessViewDocument => ({...base,
    status: "inactive", activeFromMillis: 0, expiresAtMillis: null,
    ...emptyMaps()});
  if (program.createdBy === grant.uid) return null;
  let deadline: number | null;
  try {
    deadline = programOwnerAuthorizationDeadline(program, grant);
  } catch {
    deadline = null;
  }
  if (deadline === null) return inactive();
  const activeFromMillis = grant.programAuthorization?.approvedAtMillis ?? 0;
  // Authority starts at the approval instant, so evaluate from there on.
  const evaluatedAt = Math.max(nowMillis, activeFromMillis);
  let duties: ProgramDutyAssignment[];
  try {
    duties = activeProgramDuties(grant, evaluatedAt);
  } catch {
    return inactive();
  }
  if (duties.length === 0) return inactive();
  const maps = emptyMaps();
  for (const duty of programStaffDuties) {
    const held = duties.filter((assignment) => assignment.duty === duty ||
      (duty !== "programAdmin" && assignment.duty === "programCoordinator"));
    for (const assignment of held) foldAssignment(maps, duty, assignment);
  }
  foldWork(maps, duties);
  return {...base, status: "active", activeFromMillis,
    expiresAtMillis: Math.max(...duties.map((a) => a.expiresAtMillis)),
    ...maps};
}

function foldAssignment(maps: ReturnType<typeof emptyMaps>,
  duty: ProgramStaffDuty, assignment: ProgramDutyAssignment): void {
  const expiry = assignment.expiresAtMillis;
  raise(maps.duties, duty, expiry);
  const dimensions = [
    {all: maps.pickupAll, scoped: maps.pickupScoped,
      ids: assignment.pickupPointIds},
    {all: maps.hotelAll, scoped: maps.hotelScoped,
      ids: assignment.hotelIds},
    {all: maps.functionAll, scoped: maps.functionScoped,
      ids: assignment.functionIds ?? []},
  ];
  for (const {all, scoped, ids} of dimensions) {
    if (ids.length === 0) raise(all, duty, expiry);
    for (const id of ids) raise(scoped, `${duty}__${id}`, expiry);
  }
}

/**
 * What the work shell lists, as getProgramWorkAccess resolves it: pickup
 * points from every operational duty but the hotel desk, hotels from every
 * operational duty, functions from door and guest-desk duties. An empty
 * scope list covers everything of that kind.
 * @param {ReturnType<typeof emptyMaps>} maps The maps to fill.
 * @param {ProgramDutyAssignment[]} duties The live assignments.
 */
function foldWork(maps: ReturnType<typeof emptyMaps>,
  duties: ProgramDutyAssignment[]): void {
  const add = (map: ExpiryMap, ids: string[], expiry: number) => {
    if (ids.length === 0) raise(map, workAllKey, expiry);
    for (const id of ids) raise(map, id, expiry);
  };
  for (const assignment of duties) {
    if (assignment.duty === "programAdmin") continue;
    const expiry = assignment.expiresAtMillis;
    if (assignment.duty !== "hotelDesk") {
      add(maps.workPickup, assignment.pickupPointIds, expiry);
    }
    add(maps.workHotel, assignment.hotelIds, expiry);
    if (doorDuties.has(assignment.duty)) {
      add(maps.workFunction, assignment.functionIds ?? [], expiry);
    }
  }
}

/**
 * Rewrites one account's view of one program from current sources inside a
 * transaction, writing only on change. A source that fails its contract is
 * logged and keeps the previous view rather than blocking a retry loop.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} programId The programme document id.
 * @param {string} uid The account.
 * @param {number} nowMillis The evaluation time.
 * @return {Promise<void>} Resolves once the view matches its sources.
 */
export async function reconcileProgramAccessView(
  db: FirebaseFirestore.Firestore, programId: string, uid: string,
  nowMillis = Date.now()): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(programAccessViewsCollection)
      .doc(programAccessViewId(programId, uid));
    const programSnap = await tx.get(
      db.collection("organizerPrograms").doc(programId));
    const grantSnap = await tx.get(db.collection("programStaffGrants")
      .doc(programStaffGrantId(programId, uid)));
    const old = await tx.get(ref);
    let next: ProgramAccessViewDocument | null = null;
    try {
      const program = programSnap.data() as OrganizerProgramDocument |
        undefined;
      if (program) {
        if (program.createdBy === uid) {
          next = ownerProgramAccessView(program, programId);
        } else if (grantSnap.exists) {
          next = staffProgramAccessView(program, programId,
            grantSnap.data() as ProgramStaffGrantDocument, nowMillis);
        }
      }
    } catch (error) {
      logger.warn("Programme access view kept a source that fails its " +
        "contract.", {programId, uid,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/**
 * The accounts one programme write can change views for: the owner and, when
 * the creator or organizer changed or the programme appeared or vanished,
 * every staff grant.
 * @param {FirebaseFirestore.DocumentData|undefined} before Old programme.
 * @param {FirebaseFirestore.DocumentData|undefined} after New programme.
 * @return {boolean} Whether staff views need rewriting too.
 */
export function programWriteChangesStaffViews(
  before: FirebaseFirestore.DocumentData | undefined,
  after: FirebaseFirestore.DocumentData | undefined): boolean {
  return !before || !after || before.createdBy !== after.createdBy ||
    before.organizerId !== after.organizerId;
}

/** One view from current sources, read only, for the migration. */
export async function readProgramAccessView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  programId: string, uid: string, nowMillis: number
): Promise<ProgramAccessViewDocument | null> {
  const programSnap = await tx.get(
    db.collection("organizerPrograms").doc(programId));
  const program = programSnap.data() as OrganizerProgramDocument | undefined;
  if (!program) return null;
  if (program.createdBy === uid) {
    return ownerProgramAccessView(program,
      programId);
  }
  const grantSnap = await tx.get(db.collection("programStaffGrants")
    .doc(programStaffGrantId(programId, uid)));
  if (!grantSnap.exists) return null;
  return staffProgramAccessView(program, programId,
    grantSnap.data() as ProgramStaffGrantDocument, nowMillis);
}

