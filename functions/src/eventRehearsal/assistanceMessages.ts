import type {EventAssistanceLateJoinInput as LateJoinInput} from
  "../shared/generated/eventAssistanceLateJoinInput";
import {operationContentHash} from "../operations/durableActions";
import {evaluateLateJoin} from "../eventSuccess/operations/lateJoin";
import {mergeConfirmedDeliveryState} from
  "../eventSuccess/operations/deliveryReceiptState";
import type {ConfirmedDeliveryState} from
  "../platform/delivery/confirmedDeliveryState";
import {evaluateOutbox, MessageRecord, newMessageRecord, OutboxFacts,
  parseMessageRecord} from "../eventSuccess/operations/messageOutbox";
import {buildRehearsalJoiningInstruction, GuestChoiceSubmission,
  LateJoinMessageOptions, prepareDeliveryAttempt, ResolvedGuestScope,
  resolveGuestChoice} from "../eventSuccess/operations/messageProtocol";
import {sameMessageContext} from "../eventSuccess/operations/messagingPolicy";

type PracticeContext = Extract<LateJoinInput["context"], {mode: "rehearsal"}>;
type PracticeAttempt = Extract<MessageRecord["attempts"][number],
  {mode: "rehearsal"}>;
export type RehearsalMessageOutcome =
  | {kind: "accepted" | "delivered" | "read"}
  | {kind: "failed"; classification:
      "technical" | "policy" | "suppressed" | "invalidRecipient"}
  | {kind: "revoked"}
  | {kind: "unknown"; reason:
      "timeout" | "connectionLost" | "workerInterrupted"};

/**
 * A simulation transition over the existing message record. Its owner must
 * persist the result in the rehearsal transaction, never the live outbox.
 * No clock, provider, credential, attendance or persistence port is acquired.
 */
export function prepareRehearsalLateJoin(input: LateJoinInput,
  expected: PracticeContext, options: LateJoinMessageOptions) {
  requireContext(input.context, expected);
  const decision = evaluateLateJoin(input);
  const intent = buildRehearsalJoiningInstruction(input, options);
  return {decision,
    message: intent ? newMessageRecord(intent, input.now) : null};
}

/** One virtual dispatch; an uncertain attempt blocks a second channel. */
export function dispatchRehearsalMessage(input: {
  record: MessageRecord; context: PracticeContext; facts: OutboxFacts;
  now: number; outcome: RehearsalMessageOutcome;
}) {
  const {record, context, facts, now, outcome} = input;
  requireRecord(record, context, now);
  // Validate every supplied route even if a terminal lifecycle would stop
  // delivery before selecting one. Live bindings never enter this adapter.
  for (const route of facts.routes) {
    if (route.state.kind === "eligible" &&
        route.state.candidate.mode !== "rehearsal") {
      throw new Error("Live delivery authority in rehearsal");
    }
  }
  const decision = evaluateOutbox(record, facts, now);
  if (decision.kind !== "dispatch") return {record, decision};
  const attempt = prepareDeliveryAttempt({...facts, intent: record.intent,
    lifecycle: record.lifecycle, attempts: record.attempts, now});
  if (!attempt || attempt.mode !== "rehearsal") {
    throw new Error("Rehearsal dispatch decision drift");
  }
  const state = simulatedState(attempt, outcome, now);
  return {decision, record: changed(record, {
    attempts: [...record.attempts, {...attempt, state}],
  }, now)};
}

/** Late or contradictory simulated receipts obey live evidence ordering. */
export function recordRehearsalMessageOutcome(input: {
  record: MessageRecord; context: PracticeContext; attemptId: string;
  now: number; outcome: Exclude<RehearsalMessageOutcome, {kind: "unknown"}>;
}) {
  const {record, context, attemptId, now, outcome} = input;
  requireRecord(record, context, now);
  const attempt = record.attempts.find((a) => a.attemptId === attemptId);
  if (!attempt || attempt.mode !== "rehearsal") {
    throw new Error("Simulated delivery attempt unavailable");
  }
  const state = simulatedState(attempt, outcome, now);
  if (state.kind === "unknown") throw new Error("Receipt is not confirmed");
  const merged = mergeConfirmedDeliveryState(attempt, state);
  const deliveryConflict = record.deliveryConflict ||
    merged.disposition === "conflictingEvidence";
  if (operationContentHash(attempt) === operationContentHash(merged.attempt) &&
      deliveryConflict === record.deliveryConflict) {
    return {record, disposition: merged.disposition};
  }
  return {disposition: merged.disposition, record: changed(record, {
    deliveryConflict, attempts: record.attempts.map((a) =>
      a.attemptId === attemptId ? merged.attempt : a),
  }, now)};
}

/** Response scope is resolved by the rehearsal owner, not the guest body. */
export function respondToRehearsalMessage(input: {
  record: MessageRecord; context: PracticeContext;
  scope: ResolvedGuestScope; submission: GuestChoiceSubmission;
  gate: OutboxFacts["gate"]; now: number;
}) {
  const {record, context, scope, submission, gate, now} = input;
  requireRecord(record, context, now);
  requireContext(scope.context, context);
  if (scope.source.kind !== "simulation") {
    throw new Error("Live response authority in rehearsal");
  }
  const result = resolveGuestChoice({intent: record.intent,
    lifecycle: record.lifecycle, scope, submission, gate, now,
    existingResponse: record.response});
  // The typed response is returned to the owner for its atomic guest effect.
  // In particular, onMyWay and notComing are not check-in mutations.
  return {result, record: result.kind === "accepted" ? changed(record, {
    lifecycle: "responded", response: result.response,
  }, now) : record};
}

function requireContext(actual: LateJoinInput["context"],
  expected: PracticeContext) {
  if (actual.mode !== "rehearsal" || expected.mode !== "rehearsal" ||
      !sameMessageContext(actual, expected)) {
    throw new Error("Rehearsal message context mismatch");
  }
}

function requireRecord(record: MessageRecord, context: PracticeContext,
  now: number) {
  parseMessageRecord(record);
  requireContext(record.intent.context, context);
  if (!Number.isSafeInteger(now) || now < record.updatedAt) {
    throw new Error("Rehearsal message clock moved backwards");
  }
}

function changed(record: MessageRecord,
  patch: Partial<Pick<MessageRecord,
    "attempts" | "lifecycle" | "response" | "deliveryConflict">>, now: number) {
  return parseMessageRecord({...record, ...patch,
    revision: record.revision + 1, updatedAt: now});
}

function simulatedState(attempt: PracticeAttempt,
  outcome: RehearsalMessageOutcome, now: number): ConfirmedDeliveryState |
    Extract<PracticeAttempt["state"], {kind: "unknown"}> {
  const providerMessageId = "simulation:" + attempt.attemptId;
  if (outcome.kind === "unknown") {
    return {kind: "unknown", reason: outcome.reason, at: now,
      providerMessageId: null, reconcileAfter: now + 120_000};
  }
  if (outcome.kind === "failed" || outcome.kind === "revoked") {
    return {...outcome, at: now, providerMessageId,
      evidenceId: "simulation:" + operationContentHash([
        attempt.context, attempt.attemptId, outcome, now,
      ])};
  }
  return {...outcome, at: now, providerMessageId};
}
