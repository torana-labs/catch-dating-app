import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  EventDocument,
  EventStaffGrantDocument,
  HostAssignmentViewDocument,
  OrganizerDocument,
  OrganizerProgramDocument,
  OrganizerTeamMembershipDocument,
  ProgramStaffGrantDocument,
} from "../shared/generated/firestoreAdminTypes";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {
  activeProgramDuties,
  programOwnerAuthorizationDeadline,
  programStaffGrantId,
} from "../shared/programAuthority";
import {mapEventRoleToDuty} from "./workDestinations";

export const hostAssignmentViewsCollection = "hostAssignmentViews";

export type HostAssignmentKind = HostAssignmentViewDocument["kind"];
type Duty = HostAssignmentViewDocument["duties"][number];

/** hostAssignmentViews document id: one row per account and scope. */
export function hostAssignmentViewId(uid: string, kind: HostAssignmentKind,
  scopeId: string): string {
  return `${uid}__${kind}_${scopeId}`;
}

const organizerName = (organizer: OrganizerDocument | undefined,
  organizerId: string): string =>
  typeof organizer?.name === "string" && organizer.name ?
    organizer.name : organizerId;

const safeMillis = (value: unknown): number | null => {
  try {
    return staffTimestampMillis(value);
  } catch {
    return null;
  }
};

/**
 * A programme grant's row, as listMyHostAssignments lists it: the programme
 * title, the organiser's name and the duties live from the owner's approval
 * on, each with its own expiry, without the clock. Duties already expired
 * when the row is written can never be live again and are left out; a grant
 * that is revoked, unapproved, archived or has no duty left is inactive.
 * @param {string} uid The account.
 * @param {string} programId The programme.
 * @param {ProgramStaffGrantDocument|undefined} grant The grant.
 * @param {OrganizerProgramDocument|undefined} program The programme.
 * @param {OrganizerDocument|undefined} organizer Its organiser.
 * @param {number} nowMillis The evaluation time.
 * @return {HostAssignmentViewDocument|null} The row, or null without a grant
 *   for this account and programme.
 */
export function programAssignmentView(uid: string, programId: string,
  grant: ProgramStaffGrantDocument | undefined,
  program: OrganizerProgramDocument | undefined,
  organizer: OrganizerDocument | undefined,
  nowMillis: number): HostAssignmentViewDocument | null {
  if (!grant || grant.uid !== uid || grant.programId !== programId ||
      typeof grant.organizerId !== "string" || !grant.organizerId) {
    return null;
  }
  const base = {uid, kind: "program" as const, scopeId: programId,
    organizerId: grant.organizerId,
    title: typeof program?.title === "string" ? program.title : programId,
    organizerName: organizerName(organizer, grant.organizerId),
    grantExpiresAtMillis: safeMillis(grant.expiresAt), version: 1 as const};
  const inactive = (): HostAssignmentViewDocument => ({...base,
    status: "inactive", activeFromMillis: 0, duties: []});
  if (!program || program.status === "archived" ||
      program.organizerId !== grant.organizerId) return inactive();
  let deadline: number | null;
  try {
    deadline = programOwnerAuthorizationDeadline(program, grant);
  } catch {
    deadline = null;
  }
  if (deadline === null) return inactive();
  const activeFromMillis = grant.programAuthorization?.approvedAtMillis ?? 0;
  let duties: Duty[];
  try {
    duties = activeProgramDuties(grant, Math.max(nowMillis, activeFromMillis))
      .map((assignment) => ({
        duty: assignment.duty as Duty["duty"],
        ...(assignment.pickupPointIds.length > 0 ?
          {pickupPointIds: [...assignment.pickupPointIds]} : {}),
        ...(assignment.hotelIds.length > 0 ?
          {hotelIds: [...assignment.hotelIds]} : {}),
        ...(assignment.functionIds && assignment.functionIds.length > 0 ?
          {functionIds: [...assignment.functionIds]} : {}),
        expiresAtMillis: assignment.expiresAtMillis}));
  } catch {
    return inactive();
  }
  if (duties.length === 0) return inactive();
  return {...base, status: "active", activeFromMillis, duties};
}

/**
 * An event grant's row: the event's name, the organiser's name and the one
 * duty its role maps to, ending with the grant.
 * @param {string} uid The account.
 * @param {string} eventId The event.
 * @param {EventStaffGrantDocument|undefined} grant The grant.
 * @param {EventDocument|undefined} event The event.
 * @param {OrganizerDocument|undefined} organizer Its organiser.
 * @return {HostAssignmentViewDocument|null} The row, or null without a grant
 *   for this account and event.
 */
export function eventAssignmentView(uid: string, eventId: string,
  grant: EventStaffGrantDocument | undefined,
  event: EventDocument | undefined,
  organizer: OrganizerDocument | undefined):
  HostAssignmentViewDocument | null {
  if (!grant || grant.uid !== uid || grant.eventId !== eventId ||
      typeof grant.organizerId !== "string" || !grant.organizerId) {
    return null;
  }
  const expiresAtMillis = safeMillis(grant.expiresAt);
  const duty = mapEventRoleToDuty(grant.role);
  const base = {uid, kind: "event" as const, scopeId: eventId,
    organizerId: grant.organizerId,
    title: typeof event?.name === "string" && event.name ?
      event.name : eventId,
    organizerName: organizerName(organizer, grant.organizerId),
    activeFromMillis: 0, grantExpiresAtMillis: expiresAtMillis,
    version: 1 as const};
  if (!event || grant.status !== "active" || duty === null ||
      expiresAtMillis === null) {
    return {...base, status: "inactive", duties: []};
  }
  return {...base, status: "active",
    duties: [{duty: duty as Duty["duty"], expiresAtMillis}]};
}

/**
 * An active organiser team membership's row: it lands the account in the
 * manager shell, as listMyHostAssignments' shell entry decides.
 * @param {string} uid The account.
 * @param {string} organizerId The organiser.
 * @param {OrganizerTeamMembershipDocument|undefined} membership The
 *   membership.
 * @param {OrganizerDocument|undefined} organizer The organiser.
 * @return {HostAssignmentViewDocument|null} The row, or null when the
 *   membership is gone or not active.
 */
export function teamAssignmentView(uid: string, organizerId: string,
  membership: OrganizerTeamMembershipDocument | undefined,
  organizer: OrganizerDocument | undefined):
  HostAssignmentViewDocument | null {
  if (!membership || membership.uid !== uid ||
      membership.organizerId !== organizerId ||
      membership.status !== "active") return null;
  const name = organizerName(organizer, organizerId);
  return {uid, kind: "team", scopeId: organizerId, organizerId, title: name,
    organizerName: name, status: "active", activeFromMillis: 0,
    grantExpiresAtMillis: null, duties: [], version: 1};
}

const data = <T>(snap: FirebaseFirestore.DocumentSnapshot): T | undefined =>
  snap.data() as T | undefined;

/** One account's programme row from current sources, read only. */
export async function readProgramAssignmentView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  uid: string, programId: string, nowMillis: number):
  Promise<HostAssignmentViewDocument | null> {
  const [grantSnap, programSnap] = await Promise.all([
    tx.get(db.collection("programStaffGrants")
      .doc(programStaffGrantId(programId, uid))),
    tx.get(db.collection("organizerPrograms").doc(programId)),
  ]);
  const grant = data<ProgramStaffGrantDocument>(grantSnap);
  const organizerSnap = typeof grant?.organizerId === "string" &&
    grant.organizerId ?
    await tx.get(db.collection("organizers").doc(grant.organizerId)) : null;
  return programAssignmentView(uid, programId, grant,
    data<OrganizerProgramDocument>(programSnap),
    organizerSnap ? data<OrganizerDocument>(organizerSnap) : undefined,
    nowMillis);
}

/** One account's event row from current sources, read only. */
export async function readEventAssignmentView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  grantId: string): Promise<{viewId: string | null;
    view: HostAssignmentViewDocument | null}> {
  const grantSnap = await tx.get(db.collection("eventStaffGrants")
    .doc(grantId));
  const grant = data<EventStaffGrantDocument>(grantSnap);
  if (!grant || typeof grant.uid !== "string" || !grant.uid ||
      typeof grant.eventId !== "string" || !grant.eventId) {
    return {viewId: null, view: null};
  }
  const [eventSnap, organizerSnap] = await Promise.all([
    tx.get(db.collection("events").doc(grant.eventId)),
    typeof grant.organizerId === "string" && grant.organizerId ?
      tx.get(db.collection("organizers").doc(grant.organizerId)) :
      Promise.resolve(null),
  ]);
  return {viewId: hostAssignmentViewId(grant.uid, "event", grant.eventId),
    view: eventAssignmentView(grant.uid, grant.eventId, grant,
      data<EventDocument>(eventSnap),
      organizerSnap ? data<OrganizerDocument>(organizerSnap) : undefined)};
}

/** One membership's team row from current sources, read only. */
export async function readTeamAssignmentView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  membershipId: string): Promise<{viewId: string | null;
    view: HostAssignmentViewDocument | null}> {
  const membership = data<OrganizerTeamMembershipDocument>(await tx.get(
    db.collection("organizerTeamMemberships").doc(membershipId)));
  if (!membership || typeof membership.uid !== "string" || !membership.uid ||
      typeof membership.organizerId !== "string" ||
      !membership.organizerId) return {viewId: null, view: null};
  const organizer = data<OrganizerDocument>(await tx.get(
    db.collection("organizers").doc(membership.organizerId)));
  return {viewId: hostAssignmentViewId(membership.uid, "team",
    membership.organizerId), view: teamAssignmentView(membership.uid,
    membership.organizerId, membership, organizer)};
}

async function reconcile(db: FirebaseFirestore.Firestore,
  what: Record<string, string>,
  read: (tx: FirebaseFirestore.Transaction) =>
    Promise<{viewId: string | null; view: HostAssignmentViewDocument | null}>):
  Promise<void> {
  await db.runTransaction(async (tx) => {
    let next: {viewId: string | null; view: HostAssignmentViewDocument | null};
    try {
      next = await read(tx);
    } catch (error) {
      logger.warn("Host assignment view kept a source that fails its " +
        "contract.", {...what,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (!next.viewId) return;
    const ref = db.collection(hostAssignmentViewsCollection).doc(next.viewId);
    const old = await tx.get(ref);
    if (isDeepStrictEqual(old.data() ?? null, next.view)) return;
    if (next.view) tx.set(ref, next.view);
    else if (old.exists) tx.delete(ref);
  });
}

/** Rewrites one account's programme row, writing only on change. */
export function reconcileProgramAssignmentView(
  db: FirebaseFirestore.Firestore, uid: string, programId: string,
  nowMillis = Date.now()): Promise<void> {
  if (!uid || !programId) return Promise.resolve();
  return reconcile(db, {uid, programId}, async (tx) => ({
    viewId: hostAssignmentViewId(uid, "program", programId),
    view: await readProgramAssignmentView(db, tx, uid, programId,
      nowMillis)}));
}

type Previous = {uid?: unknown; eventId?: unknown; organizerId?: unknown};

/** The row a deleted source named, from its last data. */
function goneRow(kind: "event" | "team", previous: Previous | undefined):
  {viewId: string | null; view: null} {
  const scopeId = kind === "event" ? previous?.eventId :
    previous?.organizerId;
  return typeof previous?.uid === "string" && previous.uid &&
    typeof scopeId === "string" && scopeId ?
    {viewId: hostAssignmentViewId(previous.uid, kind, scopeId), view: null} :
    {viewId: null, view: null};
}

/**
 * Rewrites the row of one event grant, writing only on change. A grant that
 * is gone removes the row it named, when its last data said whose it was.
 */
export function reconcileEventAssignmentView(db: FirebaseFirestore.Firestore,
  grantId: string, previous?: Previous): Promise<void> {
  return reconcile(db, {grantId}, async (tx) => {
    const current = await readEventAssignmentView(db, tx, grantId);
    return current.viewId ? current : goneRow("event", previous);
  });
}

/**
 * Rewrites the row of one team membership, writing only on change. A
 * membership that is gone removes the row it named.
 */
export function reconcileTeamAssignmentView(db: FirebaseFirestore.Firestore,
  membershipId: string, previous?: Previous): Promise<void> {
  return reconcile(db, {membershipId}, async (tx) => {
    const current = await readTeamAssignmentView(db, tx, membershipId);
    return current.viewId ? current : goneRow("team", previous);
  });
}
