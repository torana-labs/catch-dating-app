import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  OrganizerProgramDocument,
  ProgramAccessViewDocument,
  ProgramStaffGrantDocument,
} from "../shared/generated/firestoreAdminTypes";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
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
  arrivalRoutes: {} as ExpiryMap,
  tripRoutes: {} as ExpiryMap,
  assignments: [] as ProgramAccessViewDocument["assignments"],
  grantExpiresAtMillis: null as number | null,
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
 * @param {boolean} organizerManager Whether the owner also manages the
 *   programme's organizer.
 * @return {ProgramAccessViewDocument|null} The view, or null without a
 *   creator.
 */
export function ownerProgramAccessView(program: OrganizerProgramDocument,
  programId: string, organizerManager = false):
  ProgramAccessViewDocument | null {
  if (typeof program.createdBy !== "string" || !program.createdBy) return null;
  return {programId, organizerId: program.organizerId,
    uid: program.createdBy, ownerUid: program.createdBy, role: "manager",
    status: "active", activeFromMillis: 0, expiresAtMillis: null,
    ...emptyMaps(), organizerManager, revision: 0, version: 1};
}

/**
 * Whether [uid] currently manages the organizer that owns [program], from the
 * same id fields requireProgramSetupAccess and the organizerProgramViews
 * rules read (hostUserId, ownerUserId, hostUserIds). An organizer that does
 * not own the programme proves nothing.
 * @param {OrganizerProgramDocument} program The programme.
 * @param {FirebaseFirestore.DocumentData|undefined} organizer The organizer
 *   document, or undefined when missing.
 * @param {string} organizerId The organizer document id.
 * @param {string} uid The account.
 * @return {boolean} Whether the account manages the programme's organizer.
 */
export function managesProgramOrganizer(program: OrganizerProgramDocument,
  organizer: FirebaseFirestore.DocumentData | undefined,
  organizerId: string, uid: string): boolean {
  return organizer !== undefined && organizerId === program.organizerId &&
    organizerManagers(organizer).includes(uid);
}

/**
 * The view of an organizer manager who neither created the programme nor
 * holds a live grant on it: setup authority only (the programme's list row
 * and detail, as requireProgramSetupAccess admits), and no duty. The duty
 * status is inactive, so no rules helper and no work screen admits it; only
 * the organizerManager flag says anything.
 * @param {OrganizerProgramDocument} program The programme.
 * @param {string} programId The programme document id.
 * @param {string} uid The organizer manager.
 * @param {number} revision The revision of a grant that carries no live
 *   duty, or 0 without one.
 * @return {ProgramAccessViewDocument|null} The view, or null without a
 *   creator.
 */
export function organizerManagerProgramAccessView(
  program: OrganizerProgramDocument, programId: string, uid: string,
  revision = 0): ProgramAccessViewDocument | null {
  if (typeof program.createdBy !== "string" || !program.createdBy) return null;
  return {programId, organizerId: program.organizerId, uid,
    ownerUid: program.createdBy, role: "staff", status: "inactive",
    activeFromMillis: 0, expiresAtMillis: null, ...emptyMaps(),
    organizerManager: true, revision, version: 1};
}

/**
 * One account's view of one programme from its sources: the owner's, else
 * the staff grant's, with the organizer manager flag beside either; an
 * organizer manager with neither gets the setup-only view. Null when the
 * account holds nothing.
 * @param {OrganizerProgramDocument} program The programme.
 * @param {string} programId The programme document id.
 * @param {string} uid The account.
 * @param {ProgramStaffGrantDocument|undefined} grant The account's grant.
 * @param {boolean} organizerManager Whether the account manages the
 *   programme's organizer.
 * @param {number} nowMillis The evaluation time.
 * @return {ProgramAccessViewDocument|null} The view.
 */
export function programAccessViewFor(program: OrganizerProgramDocument,
  programId: string, uid: string,
  grant: ProgramStaffGrantDocument | undefined, organizerManager: boolean,
  nowMillis: number): ProgramAccessViewDocument | null {
  if (program.createdBy === uid) {
    return ownerProgramAccessView(program, programId, organizerManager);
  }
  const staff = grant ?
    staffProgramAccessView(program, programId, grant, nowMillis) : null;
  if (!organizerManager) return staff;
  if (staff?.status === "active") return {...staff, organizerManager: true};
  return organizerManagerProgramAccessView(program, programId, uid,
    staff?.revision ?? 0);
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
    organizerManager: false,
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
  foldRoutes(maps.arrivalRoutes, duties, arrivalDuties);
  foldRoutes(maps.tripRoutes, duties, tripDuties);
  maps.assignments = duties.map((assignment) => ({duty: assignment.duty,
    pickupPointIds: assignment.pickupPointIds, hotelIds: assignment.hotelIds,
    ...(assignment.functionIds === undefined ? {} :
      {functionIds: assignment.functionIds}),
    expiresAtMillis: assignment.expiresAtMillis}));
  maps.grantExpiresAtMillis = staffTimestampMillis(grant.expiresAt);
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

const arrivalDuties: ReadonlySet<ProgramStaffDuty> = new Set([
  "airportGreeter", "transportDispatcher", "programCoordinator"]);
const tripDuties: ReadonlySet<ProgramStaffDuty> = new Set([
  "reconciliationViewer", "transportDispatcher", "programCoordinator"]);
const maxRoutesPerAssignment = 300;

/**
 * The journeys or trips an account's assignments of [dutySet] reach, each
 * assignment covering a pickup point and a hotel together: arrivals for the
 * airport greeter, transport dispatcher and coordinator duties, trips for
 * the reconciliation viewer, transport dispatcher and coordinator duties. An
 * empty scope list covers every one, written `*`. An assignment whose scopes
 * would expand past the cap grants nothing, which fails closed.
 * @param {ExpiryMap} routes The map to fill.
 * @param {ProgramDutyAssignment[]} duties The live assignments.
 * @param {ReadonlySet<ProgramStaffDuty>} dutySet The duties that count.
 */
function foldRoutes(routes: ExpiryMap, duties: ProgramDutyAssignment[],
  dutySet: ReadonlySet<ProgramStaffDuty>): void {
  for (const assignment of duties) {
    if (!dutySet.has(assignment.duty)) continue;
    const pickups = assignment.pickupPointIds.length ?
      assignment.pickupPointIds : [workAllKey];
    const hotels = assignment.hotelIds.length ?
      assignment.hotelIds : [workAllKey];
    if (pickups.length * hotels.length > maxRoutesPerAssignment) {
      logger.warn("Routes skipped an assignment past the cap.",
        {duty: assignment.duty});
      continue;
    }
    for (const pickup of pickups) {
      for (const hotel of hotels) {
        raise(routes, `${pickup}|${hotel}`, assignment.expiresAtMillis);
      }
    }
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
    const sources = await readProgramAccessSources(db, tx, programId, uid);
    const old = await tx.get(ref);
    let next: ProgramAccessViewDocument | null;
    try {
      next = projectProgramAccessView(sources, programId, uid, nowMillis);
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

interface ProgramAccessSources {
  program: OrganizerProgramDocument | undefined;
  grant: ProgramStaffGrantDocument | undefined;
  organizer: FirebaseFirestore.DocumentData | undefined;
}

/**
 * The documents one account's view derives from: the programme, the
 * account's grant and the programme's organizer.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.Transaction} tx The transaction to read in.
 * @param {string} programId The programme document id.
 * @param {string} uid The account.
 * @return {Promise<ProgramAccessSources>} The sources.
 */
async function readProgramAccessSources(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, programId: string, uid: string):
  Promise<ProgramAccessSources> {
  const programSnap = await tx.get(
    db.collection("organizerPrograms").doc(programId));
  const program = programSnap.data() as OrganizerProgramDocument | undefined;
  const grantSnap = await tx.get(db.collection("programStaffGrants")
    .doc(programStaffGrantId(programId, uid)));
  const organizerId = program?.organizerId;
  const organizerSnap = typeof organizerId === "string" && organizerId ?
    await tx.get(db.collection("organizers").doc(organizerId)) : null;
  return {program,
    grant: grantSnap.data() as ProgramStaffGrantDocument | undefined,
    organizer: organizerSnap?.data()};
}

function projectProgramAccessView(sources: ProgramAccessSources,
  programId: string, uid: string, nowMillis: number):
  ProgramAccessViewDocument | null {
  const {program, grant, organizer} = sources;
  if (!program) return null;
  return programAccessViewFor(program, programId, uid, grant,
    managesProgramOrganizer(program, organizer, program.organizerId, uid),
    nowMillis);
}

/**
 * One view from current sources, read only, for the migration: what the
 * trigger would write now.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.Transaction} tx The transaction to read in.
 * @param {string} programId The programme document id.
 * @param {string} uid The account.
 * @param {number} nowMillis The evaluation time.
 * @return {Promise<ProgramAccessViewDocument|null>} The view, or null when
 *   the account holds nothing.
 */
export async function readProgramAccessView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  programId: string, uid: string, nowMillis: number
): Promise<ProgramAccessViewDocument | null> {
  return projectProgramAccessView(
    await readProgramAccessSources(db, tx, programId, uid), programId, uid,
    nowMillis);
}

/** The most programmes of one organizer a manager change rewrites, as many
 * as the Host app's programme list shows. */
export const organizerProgramLimit = 500;

/**
 * Rewrites [uids]' views of every programme of [organizerId], up to
 * [limit] of them, after their standing as organizer managers changed.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {string} organizerId The organizer.
 * @param {string[]} uids The accounts whose standing changed.
 * @param {number} nowMillis The evaluation time.
 * @param {number} limit Programmes read at most.
 * @return {Promise<void>} Resolves once every view matches its sources.
 */
export async function reconcileOrganizerManagerViews(
  db: FirebaseFirestore.Firestore, organizerId: string, uids: string[],
  nowMillis = Date.now(), limit = organizerProgramLimit): Promise<void> {
  if (uids.length === 0) return;
  const programs = await db.collection("organizerPrograms")
    .where("organizerId", "==", organizerId).limit(limit).get();
  if (programs.docs.length >= limit) {
    logger.warn("Organizer manager views reached the programme limit.",
      {organizerId, limit});
  }
  for (const program of programs.docs) {
    for (const uid of uids) {
      await reconcileProgramAccessView(db, program.id, uid, nowMillis);
    }
  }
}

/**
 * The organizer manager ids an organizer write adds or removes, or none when
 * the manager fields did not change.
 * @param {FirebaseFirestore.DocumentData|undefined} before Old organizer.
 * @param {FirebaseFirestore.DocumentData|undefined} after New organizer.
 * @return {string[]} The accounts whose manager standing changed.
 */
export function changedOrganizerManagers(
  before: FirebaseFirestore.DocumentData | undefined,
  after: FirebaseFirestore.DocumentData | undefined): string[] {
  const was = new Set(organizerManagers(before));
  const is = new Set(organizerManagers(after));
  return [...new Set([...was, ...is])]
    .filter((uid) => was.has(uid) !== is.has(uid)).sort();
}

/**
 * An organizer's current manager ids, from the same fields as
 * organizerManagerUserIds (hostUserId, ownerUserId, hostUserIds), tolerating
 * a malformed document by ignoring the fields that are not strings.
 * @param {FirebaseFirestore.DocumentData|undefined} organizer The organizer.
 * @return {string[]} The managers.
 */
export function organizerManagers(
  organizer: FirebaseFirestore.DocumentData | undefined): string[] {
  if (!organizer) return [];
  const ids: unknown[] = [organizer.hostUserId, organizer.ownerUserId,
    ...(Array.isArray(organizer.hostUserIds) ? organizer.hostUserIds : [])];
  return [...new Set(ids.filter((id): id is string =>
    typeof id === "string" && id.length > 0))];
}
