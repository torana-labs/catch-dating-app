/* firestore-index: programStaffGrants (
  uid:ASCENDING
) */
/* firestore-index: eventStaffGrants (
  uid:ASCENDING
) */
/* firestore-index: organizerTeamMemberships (
  uid:ASCENDING,
  status:ASCENDING
) */
import * as admin from "firebase-admin";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {activeProgramDuties, programOwnerAuthorizationDeadline,
  programStaffGrantId, requireActiveProgramActor} from
  "../shared/programAuthority";
import type {
  EventDocument,
  EventStaffGrantDocument,
  OrganizerDocument,
  OrganizerProgramDocument,
  ProgramStaffGrantDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ListMyHostAssignmentsCallablePayload} from
  "../shared/generated/listMyHostAssignmentsCallablePayload";
import type {ListMyHostAssignmentsCallableResponse} from
  "../shared/generated/listMyHostAssignmentsCallableResponse";
import {
  validateListMyHostAssignmentsCallablePayload,
} from "../shared/generated/validators/listMyHostAssignmentsInput";
import {
  mapEventRoleToDuty,
  type WorkDutyLike,
} from "./workDestinations";
import {
  deriveShellEntry,
  resolveWorkAssignments,
  type WorkAssignment,
} from "./workAssignments";

type AssignmentDto =
  ListMyHostAssignmentsCallableResponse["assignments"][number];
type GrantedDutyDto = AssignmentDto["duties"][number];

interface HostWorkDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: HostWorkDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
};

const hostWorkCallableLimits = {timeoutSeconds: 60, maxInstances: 20};

/**
 * The caller's live staff assignments across program and event scopes.
 * Grants never leave the server; the response carries canonical duties
 * and pre-resolved shell destinations only.
 */
export async function listMyHostAssignmentsHandler(
  request: CallableRequest<unknown>,
  deps: HostWorkDeps = defaultDeps
): Promise<ListMyHostAssignmentsCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ListMyHostAssignmentsCallablePayload>(
    request, validateListMyHostAssignmentsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listMyHostAssignments", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  return db.runTransaction(async (tx) => {
    await requireActiveProgramActor({db, actorUid, transaction: tx});
    const [programGrantSnaps, eventGrantSnaps, membershipSnaps] =
    await Promise.all([
      tx.get(db.collection("programStaffGrants")
        .where("uid", "==", actorUid).limit(128)),
      tx.get(db.collection("eventStaffGrants")
        .where("uid", "==", actorUid).limit(128)),
      tx.get(db.collection("organizerTeamMemberships")
        .where("uid", "==", actorUid)
        .where("status", "==", "active").limit(1)),
    ]);
    const programGrants = programGrantSnaps.docs
      .filter((snap) => {
        const grant = snap.data() as ProgramStaffGrantDocument;
        return snap.id === programStaffGrantId(grant.programId, actorUid);
      })
      .map((snap) => snap.data() as ProgramStaffGrantDocument)
      .filter((grant) => grant.status === "active" && grant.revokedAt == null &&
        grant.revokedBy == null);
    const eventGrants = eventGrantSnaps.docs
      .map((snap) => snap.data() as EventStaffGrantDocument)
      .filter((grant) => grant.status === "active");
    const programIds = [...new Set(
      programGrants.map((grant) => grant.programId))];
    const eventIds = [...new Set(
      eventGrants.map((grant) => grant.eventId))];
    const organizerIds = [...new Set([
      ...programGrants.map((grant) => grant.organizerId),
      ...eventGrants.map((grant) => grant.organizerId),
    ])];
    const [programSnaps, eventSnaps, organizerSnaps] = await Promise.all([
      Promise.all(programIds.sort().map((id) =>
        tx.get(db.collection("organizerPrograms").doc(id)))),
      Promise.all(eventIds.sort().map((id) =>
        tx.get(db.collection("events").doc(id)))),
      Promise.all(organizerIds.sort().map((id) =>
        tx.get(db.collection("organizers").doc(id)))),
    ]);
    const programs = new Map<string, OrganizerProgramDocument>();
    for (const snap of programSnaps) {
      const doc = snap.data() as OrganizerProgramDocument | undefined;
      if (doc) programs.set(snap.id, doc);
    }
    const events = new Map<string, EventDocument>();
    for (const snap of eventSnaps) {
      const doc = snap.data() as EventDocument | undefined;
      if (doc) events.set(snap.id, doc);
    }
    const organizers = new Map<string, OrganizerDocument>();
    for (const snap of organizerSnaps) {
      const doc = snap.data() as OrganizerDocument | undefined;
      if (doc) organizers.set(snap.id, doc);
    }
    const assignments: WorkAssignment[] = [];
    const nowMillis = deps.now().toMillis();
    const organizerByKey = new Map<string, string>();
    const dutyLists = new Map<string, GrantedDutyDto[]>();
    for (const grant of programGrants) {
      const program = programs.get(grant.programId);
      // A grant whose program was deleted or archived is not work.
      if (!program || program.status === "archived" ||
        program.organizerId !== grant.organizerId || grant.uid !== actorUid ||
        programOwnerAuthorizationDeadline(program, grant) === null ||
        (grant.programAuthorization !== undefined &&
          grant.programAuthorization.approvedAtMillis > nowMillis)) continue;
      // Each duty tuple expires independently; dead tuples never resolve.
      // A grant whose duties are all expired still registers so
      // includeExpired can surface it in history.
      const liveDuties = activeProgramDuties(grant, nowMillis);
      const key = `program:${grant.programId}`;
      assignments.push({
        scope: {kind: "program", id: grant.programId},
        title: program.title,
        organizerName: organizers.get(grant.organizerId)?.name ??
        grant.organizerId,
        duties: liveDuties.map((duty): WorkDutyLike => ({duty: duty.duty})),
        expiresAtMillis: liveDuties.length === 0 ? Math.min(nowMillis,
          staffTimestampMillis(grant.expiresAt)) :
          Math.min(staffTimestampMillis(grant.expiresAt),
            ...liveDuties.map((duty) => duty.expiresAtMillis)),
      });
      organizerByKey.set(key, grant.organizerId);
      dutyLists.set(key, liveDuties.map((duty) => ({
        duty: duty.duty as GrantedDutyDto["duty"],
        ...(duty.pickupPointIds && duty.pickupPointIds.length > 0 ?
          {pickupPointIds: duty.pickupPointIds} : {}),
        ...(duty.hotelIds && duty.hotelIds.length > 0 ?
          {hotelIds: duty.hotelIds} : {}),
        ...(duty.functionIds && duty.functionIds.length > 0 ?
          {functionIds: duty.functionIds} : {}),
      })));
    }
    for (const grant of eventGrants) {
      const event = events.get(grant.eventId);
      // A grant whose event was deleted is not work.
      if (!event) continue;
      const duty = mapEventRoleToDuty(grant.role);
      if (duty === null) continue;
      const key = `event:${grant.eventId}`;
      assignments.push({
        scope: {kind: "event", id: grant.eventId},
        title: event.name ?? grant.eventId,
        organizerName: organizers.get(grant.organizerId)?.name ??
        grant.organizerId,
        duties: [{duty}],
        expiresAtMillis: staffTimestampMillis(grant.expiresAt),
      });
      organizerByKey.set(key, grant.organizerId);
      dutyLists.set(key, [{duty}]);
    }
    const currentMillis = deps.now().toMillis();
    const resolved = resolveWorkAssignments(assignments, currentMillis);
    const liveKeys = new Set(resolved.map((assignment) =>
      `${assignment.scope.kind}:${assignment.scope.id}`));
    const dtos: AssignmentDto[] = resolved.map((assignment) => {
      const key = `${assignment.scope.kind}:${assignment.scope.id}`;
      return toDto(assignment, organizerByKey.get(key) ?? "",
        dutyLists.get(key) ?? []);
    });
    if (data.includeExpired === true) {
      for (const assignment of assignments) {
        const key = `${assignment.scope.kind}:${assignment.scope.id}`;
        if (liveKeys.has(key)) continue;
        // Expired grants return for history views with an empty shell
        // section; they never unlock destinations.
        dtos.push({
          kind: assignment.scope.kind,
          scopeId: assignment.scope.id,
          organizerId: organizerByKey.get(key) ?? "",
          title: assignment.title,
          subtitle: assignment.subtitle ?? null,
          organizerName: assignment.organizerName,
          duties: dutyLists.get(key) ?? [],
          destinations: [],
          overflowDestinations: [],
          shellMode: "none",
          grantExpiresAtMillis: assignment.expiresAtMillis ?? null,
        });
      }
    }
    return {
      assignments: dtos,
      shellEntry: deriveShellEntry(
        assignments, currentMillis, membershipSnaps.size > 0).kind,
    };
  });
}

function toDto(
  assignment: WorkAssignment & {
    destinations: AssignmentDto["destinations"];
    overflow: AssignmentDto["overflowDestinations"];
    shellMode: AssignmentDto["shellMode"];
  },
  organizerId: string,
  duties: GrantedDutyDto[],
): AssignmentDto {
  return {
    kind: assignment.scope.kind,
    scopeId: assignment.scope.id,
    organizerId,
    title: assignment.title,
    subtitle: assignment.subtitle ?? null,
    organizerName: assignment.organizerName,
    duties,
    destinations: assignment.destinations,
    overflowDestinations: assignment.overflow,
    shellMode: assignment.shellMode,
    grantExpiresAtMillis: assignment.expiresAtMillis ?? null,
  };
}

export const listMyHostAssignments = onCall(
  appCheckCallableOptionsWithLimits(hostWorkCallableLimits),
  (request) => listMyHostAssignmentsHandler(request)
);
