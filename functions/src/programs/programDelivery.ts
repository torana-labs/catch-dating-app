import {DELIVERY_MESSAGES} from "../delivery/deliveryMessages";
import type {ProgramDeliveryMessageDocument as MessageRecord} from
  "../shared/generated/programDeliveryMessageDocument";
import type {ProgramDeliveryMessageIntent as MessageIntent} from
  "../shared/generated/programDeliveryMessageIntent";
import type {ProgramDeliveryAttempt as DeliveryAttempt} from
  "../shared/generated/programDeliveryAttempt";
import {validateProgramDeliveryMessageDocument} from
  "../shared/generated/validators/programDeliveryMessageDocument";
import {validateProgramDeliveryMessageIntent} from
  "../shared/generated/validators/programDeliveryMessageIntent";
import {validateProgramDeliveryAttempt} from
  "../shared/generated/validators/programDeliveryAttempt";
import {operationContentHash} from "../operations/durableActions";
import type {
  DeliveryCoreFacts, DeliveryDispatchCandidate,
  DeliverySourceAdapter,
} from "../delivery/deliveryCore";
import {evaluateDelivery} from "../delivery/deliveryCore";

export type {DeliveryAttempt, MessageRecord};
export type ProgramDeliveryFacts = DeliveryCoreFacts<ProviderBinding>;
export type ProviderBinding = DeliveryAttempt["binding"];
export type LiveAttempt = DeliveryAttempt; // live is the only attempt mode

/**
 * Deterministic program message identity. The context carries program +
 * organizer scope so two programs can never collide on one intent id.
 */
export function programDeliveryMessageId(intent: MessageIntent): string {
  return "outbox:" + operationContentHash([
    intent.context, intent.intentId, intent.revision,
  ]);
}

export function parseProgramDeliveryIntent(value: unknown): MessageIntent {
  if (!validateProgramDeliveryMessageIntent(value)) {
    throw new Error("Invalid program delivery intent");
  }
  if (value.expiresAt <= value.createdAt) {
    throw new Error("Program delivery intent already expired");
  }
  return value;
}

export function parseProgramDeliveryAttempt(value: unknown): DeliveryAttempt {
  if (!validateProgramDeliveryAttempt(value)) {
    throw new Error("Invalid program delivery attempt");
  }
  if (value.state.at < value.createdAt ||
      value.createdAt < value.authorization.checkedAt ||
      value.createdAt >= value.authorization.validUntil ||
      ("reconcileAfter" in value.state &&
       value.state.reconcileAfter < value.state.at) ||
      (value.state.kind === "notDispatched" &&
       value.state.reason === "reservationExpired" &&
       value.state.at < value.authorization.validUntil)) {
    throw new Error("Invalid program delivery attempt timeline");
  }
  return value;
}

export function parseProgramDeliveryRecord(value: unknown): MessageRecord {
  if (!validateProgramDeliveryMessageDocument(value)) {
    throw new Error("Invalid program delivery record");
  }
  parseProgramDeliveryIntent(value.intent);
  value.attempts.forEach(parseProgramDeliveryAttempt);
  if (value.messageId !== programDeliveryMessageId(value.intent) ||
      value.createdAt < value.intent.createdAt ||
      value.updatedAt < value.createdAt ||
      value.attempts.some((attempt) =>
        attempt.createdAt < value.createdAt) ||
      value.attempts.length > value.intent.deliveryPolicy.maxAttempts) {
    throw new Error("Program delivery identity or history is invalid");
  }
  // Validate complete history even when a message no longer needs dispatch.
  evaluateDelivery({intent: value.intent, attempts: value.attempts,
    lifecycle: value.lifecycle, now: value.updatedAt,
    gate: {kind: "stop", reason: "programEnded"}, routes: []},
  programDeliveryAdapter);
  return value;
}

export function newProgramDeliveryRecord(
  value: unknown, now: number
): MessageRecord {
  const intent = structuredClone(parseProgramDeliveryIntent(value));
  if (!Number.isSafeInteger(now) || now >= intent.expiresAt) {
    throw new Error("Program delivery intent expired or clock invalid");
  }
  return parseProgramDeliveryRecord({schemaVersion: 1, source: "program",
    messageId: programDeliveryMessageId(intent), revision: 0, intent,
    lifecycle: "active", attempts: [], deliveryConflict: false,
    createdAt: now, updatedAt: now});
}

function sameProgramContext(
  left: MessageIntent["context"], right: MessageIntent["context"]
): boolean {
  return left.mode === right.mode && left.programId === right.programId &&
    left.organizerId === right.organizerId;
}

/**
 * The program (Moments) binding to the shared delivery core. Program facts —
 * guest RSVP state, permissions, quiet hours — are read transactionally by
 * the source's `readFacts`; this module only owns contract and identity.
 */
export const programDeliveryAdapter: DeliverySourceAdapter<
  MessageIntent["context"], ProviderBinding, MessageIntent, DeliveryAttempt,
  MessageRecord
> = {
  collection: DELIVERY_MESSAGES,
  messageId: (intent) => programDeliveryMessageId(intent),
  parseIntent: (value) => parseProgramDeliveryIntent(value),
  parseAttempt: (value) => parseProgramDeliveryAttempt(value),
  parseRecord: (value) => parseProgramDeliveryRecord(value),
  newRecord: (intent, now) => newProgramDeliveryRecord(intent, now),
  instructionRevisionOf: (intent) => intent.instructionRevision,
  sameContext: (left, right) => sameProgramContext(left, right),
  // Program records carry no host-handoff evidence; closure is `close()`.
  recordStopReason: () => null,
  routeIdOf: (attempt) => attempt.binding.routeId,
  assertDispatchCandidate: (
    candidate: DeliveryDispatchCandidate<ProviderBinding>,
    intent: MessageIntent, now: number
  ) => {
    parseProgramDeliveryAttempt({
      schemaVersion: 1, attemptId: "binding-validation",
      intentId: intent.intentId, intentRevision: intent.revision,
      ordinal: 1, createdAt: now,
      state: {kind: "reserved", at: now, reconcileAfter: now},
      authorization: {permissionRevision: "binding-validation",
        checkedAt: now, validUntil: now + 1, instructionRevision: 0},
      mode: candidate.mode, context: intent.context,
      ...(candidate.mode === "live" ? {binding: candidate.binding} :
        {routeId: candidate.routeId}),
    });
  },
  withAttempts: (record, attempts) => ({...record, attempts}),
  withLifecycle: (record, lifecycle) => ({...record, lifecycle}),
  withDeliveryConflict: (record, deliveryConflict) =>
    ({...record, deliveryConflict}),
};
