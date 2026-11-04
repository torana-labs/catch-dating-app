import type {DocumentSnapshot} from "firebase-admin/firestore";
import {operationContentHash} from "../../operations/durableActions";
import type {EventAssistanceCheckpointDocument as Report} from
  "../../shared/generated/eventAssistanceCheckpointDocument";
import type {EventAssistanceDepartureRosterDocument as Roster} from
  "../../shared/generated/eventAssistanceDepartureRosterDocument";
import type {EventAssistanceCheckpointWork} from
  "../../shared/generated/eventAssistanceCheckpointWork";
import type {EventAssistanceCheckpointCallableResponse as Response} from
  "../../shared/generated/eventAssistanceCheckpointCallableResponse";
import {validateEventAssistanceCheckpointDocument} from
  "../../shared/generated/validators/eventAssistanceCheckpointDocument";
import {validateEventAssistanceDepartureRosterDocument} from
  "../../shared/generated/validators/eventAssistanceDepartureRosterDocument";
import {validateEventAssistanceCheckpointCallableResponse} from
  "../../shared/generated/validators/eventAssistanceCheckpointOutput";
import type {readGroupProgressState} from "./groupProgressReader";
import {progressIdentity, invalidSource} from "./groupProgressSource";
import {departureRosterIdentity} from "./departureRosterSource";
import {assertSavedCheckpointRequest} from "./checkpointRequest";
import type {CheckpointDisposition} from "./checkpointDisposition";
import type {CheckpointWorkRecords} from "./checkpointWorkRecords";
import {checkpointCloseoutState, checkpointCloseoutView} from
  "./checkpointCloseoutPolicy";

/** One saved departure's checkpoint, as the work and receipts name it. */
export type Scope = EventAssistanceCheckpointWork["scope"];
export type {Report, Roster, Response};
export const CHECKPOINTS = "eventAssistanceCheckpoints";
export const CHECKPOINT_RECEIPTS = "eventAssistanceCheckpointReceipts";
export type ProgressState = Awaited<ReturnType<typeof readGroupProgressState>>;
type Ready = Extract<Response["view"]["availability"], {kind: "ready"}>;
export type Visit = Ready["members"][number]["visit"];
export interface CheckpointState {
  scope: Scope;
  progress: ProgressState;
  roster: Roster | null;
  report: Report | null;
  visits: {attendeeId: string; visit: Visit; displayName?: string | null}[];
  dispositions?: {attendeeId: string; disposition: CheckpointDisposition}[];
  ownerValidUntil: number;
  requestWork?: CheckpointWorkRecords | null;
  /** The roster members' attendee rows, when the reader loaded them. */
  attendees?: Map<string, DocumentSnapshot>;
  now: number;
}
export function checkpointIdentity(scope: Scope) {
  return "checkpoint:" + operationContentHash([scope.context, scope.groupId,
    scope.progressRevision, scope.checkpointId]);
}

export function parseDepartureRoster(value: unknown, scope: Scope,
  now: number): Roster | null {
  if (value === undefined) return null;
  if (!validateEventAssistanceDepartureRosterDocument(value) ||
      value.rosterId !== departureRosterIdentity(scope.context, scope.groupId,
        scope.progressRevision) ||
      value.rosterId !== departureRosterIdentity(value.context, value.groupId,
        value.progressRevision) ||
      value.progressId !== progressIdentity(scope.context, scope.groupId) ||
      value.confirmedAt > now || !canonicalIds(value.members.map((m) =>
    m.attendeeId)) || value.members.some((m) =>
    scope.groupId === "event:whole" ? m.membershipHash !== null :
      m.membershipHash === null || m.episodeId === null)) throw invalidSource();
  assertSavedCheckpointRequest(value);
  return value;
}

export function parseCheckpointReport(value: unknown, scope: Scope,
  roster: Roster | null, now: number): Report | null {
  if (value === undefined) return null;
  if (!validateEventAssistanceCheckpointDocument(value) || !roster ||
      value.reportId !== checkpointIdentity(scope) ||
      value.reportId !== checkpointIdentity(value) ||
      value.rosterId !== roster.rosterId ||
      value.rosterHash !== operationContentHash(roster) ||
      value.createdAt < roster.confirmedAt ||
      value.createdAt > value.reportedAt || value.reportedAt > now ||
      !canonicalIds(value.accountedFor) ||
      value.accountedFor.some((id) =>
        !roster.members.some((m) => m.attendeeId === id))) {
    throw invalidSource();
  }
  return value;
}

function canonicalIds(ids: string[]) {
  return ids.every((id, i) => i === 0 || ids[i - 1] < id);
}

export function checkpointAvailability(s: CheckpointState):
  Response["view"]["availability"] {
  const {roster} = s;
  const unavailable = (reason: Extract<Response["view"]["availability"],
    {kind: "unavailable"}>["reason"]) =>
    ({kind: "unavailable" as const, reason});
  if (!roster) return unavailable("rosterNotRecorded");
  if (roster.sourceHash !== s.progress.source.sourceHash) {
    return unavailable("setupChanged");
  }
  const target = roster.destination;
  if (!target) return unavailable("destinationNotRecorded");
  if (target.kind !== "itineraryStop" && target.kind !== "groupCheckpoint") {
    return unavailable("notCheckpoint");
  }
  const id = target.kind === "itineraryStop" ? target.stopId :
    target.checkpointId;
  if (id !== s.scope.checkpointId) return unavailable("differentCheckpoint");
  const destination = s.progress.source.destinations.find((d) =>
    operationContentHash(d.target) === operationContentHash(target));
  if (!destination) return unavailable("setupChanged");
  const accounted = new Set(s.report?.accountedFor ?? []);
  return {kind: "ready", rosterId: roster.rosterId, label: destination.label,
    reportStatus: !s.report ? "unreported" :
      accounted.size === roster.members.length ? "complete" : "partial",
    members: s.visits.map(({attendeeId, visit, displayName}) => ({
      attendeeId, visit,
      ...(displayName !== undefined ? {displayName} : {}),
      ...(s.dispositions ? {disposition: s.dispositions.find((d) =>
        d.attendeeId === attendeeId)!.disposition} : {}),
      observation: accounted.has(attendeeId) ?
        "accountedFor" : "unconfirmed"}))};
}

export function checkpointSourceHash(s: CheckpointState) {
  return operationContentHash([s.scope, s.progress.source.sourceHash,
    s.roster, s.report, s.visits]);
}
export function checkpointRequestView(s: CheckpointState):
  Response["view"]["request"] {
  const original = s.roster?.checkpointRequest;
  const request = original ? {...original, responsibleOperatorId:
    s.requestWork?.payload.reassignment?.responsibleOperatorId ??
      original.responsibleOperatorId} : null;
  const destination = s.roster?.destination;
  const checkpointId = destination?.kind === "itineraryStop" ?
    destination.stopId : destination?.kind === "groupCheckpoint" ?
      destination.checkpointId : null;
  if (!request || checkpointId !== s.scope.checkpointId) return null;
  const complete = s.report !== null &&
    s.report.accountedFor.length === s.roster!.members.length;
  if (complete) {
    return {...request, state: "complete", ownerAvailability: "notRequired"};
  }
  if (checkpointCloseoutState(s).kind === "closedOut") {
    return {...request, state: "closedOut", ownerAvailability: "notRequired"};
  }
  return {...request, state:
    checkpointAvailability(s).kind !== "ready" ? "sourceUnavailable" :
      s.report ? "discrepancy" : s.now >= request.dueAt ?
        "overdue" : "awaitingReport",
  ownerAvailability: s.ownerValidUntil > Math.max(s.now, request.dueAt) ?
    "current" : "needsReassignment"};
}
/** Ownership review has its own fence; it never changes a report review. */
export function checkpointAssignmentView(s: CheckpointState) {
  if (!s.requestWork) return null;
  const change = s.requestWork.payload.reassignment ?? null;
  return {revision: change?.revision ?? 0, change,
    sourceHash: operationContentHash([checkpointSourceHash(s),
      s.requestWork.payload.rosterHash,
      s.requestWork.payload.request, change])};
}
export function checkpointResponse(outcome: Response["outcome"],
  s: CheckpointState, operationRevision: number | null = null): Response {
  const value: Response = {outcome, operationRevision, view: {...s.scope,
    serverTime: s.now, sourceHash: checkpointSourceHash(s),
    revision: s.report?.revision ?? 0, report: s.report,
    request: checkpointRequestView(s),
    assignment: checkpointAssignmentView(s),
    closeout: checkpointCloseoutView(s),
    availability: checkpointAvailability(s)}};
  if (!validateEventAssistanceCheckpointCallableResponse(value)) {
    throw invalidSource();
  }
  return value;
}
export {checkpointObservationConflict as checkpointConflict} from
  "./movementDecisions";
