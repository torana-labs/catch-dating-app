import {HttpsError} from "firebase-functions/v2/https";
import {operationContentHash as hash} from "../../operations/durableActions";
import type {EventAttendanceDispositionDocument as Record} from
  "../../shared/generated/eventAttendanceDispositionDocument";
import type {EventAttendanceDispositionCallableResponse as Response} from
  "../../shared/generated/eventAttendanceDispositionCallableResponse";
import type {EventDocument} from "../../shared/generated/eventDocument";
import type {EventAttendeeDocument} from
  "../../shared/generated/eventAttendeeDocument";
import type {EventSuccessPlanDocument} from
  "../../shared/generated/eventSuccessPlanDocument";
import {currentGuest, Guest, GuestSourceFacts} from
  "../../eventSuccess/operations/guestRecords";
import {invalidSource, timestampEvidence} from
  "../../eventSuccess/operations/groupProgressSource";

export type View = Response["view"];
export type Decision = Record["decision"];
export interface DispositionSource {
  context: Record["context"];
  attendeeId: string;
  event: EventDocument;
  attendee: EventAttendeeDocument;
  plan: EventSuccessPlanDocument | null;
  planGeneration: unknown;
  guest: Guest | null;
  facts: GuestSourceFacts;
  now: number;
}
export const dispositionIdentity = (context: Record["context"],
  attendeeId: string) =>
  "attendance-disposition:" + hash([context, attendeeId]);
export const dispositionReceiptIdentity = (context: Record["context"],
  attendeeId: string, operationId: string) =>
  "attendance-disposition-action:" + hash([context, attendeeId, operationId]);
export const sourceIdentity = (binding: Record["binding"]) => hash([
  binding.sourceGeneration, binding.attendeeGeneration, binding.identityHash]);

function millis(value: unknown): number {
  const stamp = timestampEvidence(value);
  const result = stamp._seconds * 1000 + stamp._nanoseconds / 1_000_000;
  if (!Number.isFinite(result) || result < 0 ||
      result > Number.MAX_SAFE_INTEGER) throw invalidSource();
  return result;
}

/** A running event stays open when it overruns its planned end time. */
export function attendanceClosure(
  source: Pick<DispositionSource, "event" | "plan" | "now">): View["closure"] {
  const {event, plan, now} = source;
  if (event.status === "cancelled") return {kind: "cancelled"};
  if (plan?.status === "complete") {
    const completedAt = millis(plan.completedAt);
    if (completedAt > now || completedAt < millis(plan.createdAt)) {
      throw invalidSource();
    }
    return {kind: "runtimeComplete", completedAt: Math.ceil(completedAt)};
  }
  if (plan?.status === "live") return {kind: "open"};
  const endedAt = millis(event.endTime);
  return now >= endedAt ? {kind: "scheduledEnd", endedAt: Math.ceil(endedAt)} :
    {kind: "open"};
}

export function attendanceBinding(
  source: DispositionSource): Record["binding"] {
  const {event, attendee: a, plan, facts} = source;
  return {sourceGeneration: facts.sourceGeneration,
    attendeeGeneration: facts.attendeeGeneration,
    identityHash: hash([a.linkedUid, a.displayName, a.phoneE164, a.email,
      a.source, a.externalReference, a.importId, a.sourceRowId,
      a.provider ?? null, a.providerConnectionId ?? null,
      a.providerGuestId ?? null]),
    attendanceHash: hash([a.status, a.attendanceRevision ?? 0,
      a.checkedInAt === null ? null : timestampEvidence(a.checkedInAt)]),
    closureHash: hash([event.status, timestampEvidence(event.startTime),
      timestampEvidence(event.endTime), plan ?
        timestampEvidence(source.planGeneration) : null, plan?.status ?? null,
      plan?.completedAt == null ? null : timestampEvidence(plan.completedAt)])};
}

/** An unanswered invitation never constitutes evidence of a no-show. */
export function dispositionView(source: DispositionSource,
  record: Record | null): View {
  const {context, attendeeId, attendee, guest, now} = source;
  const binding = attendanceBinding(source);
  const closure = attendanceClosure(source);
  const declineEvidence: View["declineEvidence"] = guest &&
    currentGuest(guest, source.facts) && guest.intention.kind === "notComing" ?
    {kind: "guestDeclined", guestRevision: guest.revision,
      episodeId: guest.episodeId} : null;
  const checkedIn = attendee.status === "checkedIn" ||
    attendee.checkedInAt !== null;
  const attendance = {status: attendee.status, checkedIn,
    revision: attendee.attendanceRevision ?? 0};
  let disposition: View["disposition"] = {kind: "unreviewed", revision: 0};
  if (record) {
    const revision = record.revision;
    if (sourceIdentity(record.binding) !== sourceIdentity(binding)) {
      disposition = {kind: "sourceChanged", revision};
    } else if (record.binding.attendanceHash !== binding.attendanceHash) {
      disposition = {kind: "superseded", revision, reason: "attendanceChanged"};
    } else if (record.binding.closureHash !== binding.closureHash) {
      disposition = {kind: "superseded", revision, reason: "eventChanged"};
    } else if (record.decision.kind === "record" &&
        record.decision.evidence.kind === "guestDeclined" &&
        hash(record.decision.evidence) !== hash(declineEvidence)) {
      disposition = {kind: "superseded", revision,
        reason: "guestIntentionChanged"};
    } else {
      const common = {revision, actorUid: record.actorUid,
        recordedAt: record.recordedAt};
      disposition = record.decision.kind === "record" ?
        {...common, kind: "recorded", evidence: record.decision.evidence} :
        {...common, kind: "cleared", reason: record.decision.reason};
    }
  }
  const reason = closure.kind === "cancelled" ? "eventCancelled" :
    checkedIn ? "alreadyAttended" : attendee.status !== "registered" ?
      "notAdmitted" : closure.kind === "open" ? "eventNotFinished" : null;
  const recordability: View["recordability"] = reason ?
    {kind: "unavailable", reason} : {kind: "allowed"};
  return {context, attendeeId, displayName: attendee.displayName,
    serverTime: now, sourceHash: hash([context, attendeeId, binding, closure,
      declineEvidence, record]), attendance, closure, declineEvidence,
    disposition, recordability, canClear: record?.decision.kind === "record" &&
      disposition.kind !== "sourceChanged"};
}

export function requireDispositionDecision(view: View, decision: Decision) {
  if (decision.kind === "record") {
    if (view.recordability.kind !== "allowed") {
      throw new HttpsError("failed-precondition",
        "This guest cannot be recorded as a no-show in the current event.");
    }
    if (decision.evidence.kind === "guestDeclined" &&
        hash(decision.evidence) !== hash(view.declineEvidence)) {
      throw dispositionConflict();
    }
    return;
  }
  const reason = decision.reason;
  if (!view.canClear ||
      (reason === "attendanceCorrected" && !view.attendance.checkedIn) ||
      (reason === "noLongerApplicable" &&
        view.closure.kind !== "cancelled" &&
        ["registered", "checkedIn"].includes(view.attendance.status))) {
    throw new HttpsError("failed-precondition",
      "Review the current attendance before clearing this decision.");
  }
}

export function dispositionConflict() {
  return new HttpsError("aborted",
    "Attendance or the closeout decision changed. Refresh before continuing.");
}
