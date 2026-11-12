import {DELIVERY_MESSAGES} from "../delivery/deliveryMessages";
import type {AutomationDeliveryMessageDocument as MessageRecord} from
  "../shared/generated/automationDeliveryMessageDocument";
import type {AutomationDeliveryMessageIntent as MessageIntent} from
  "../shared/generated/automationDeliveryMessageIntent";
import type {AutomationDeliveryAttempt as DeliveryAttempt} from
  "../shared/generated/automationDeliveryAttempt";
import {validateAutomationDeliveryMessageDocument} from
  "../shared/generated/validators/automationDeliveryMessageDocument";
import {validateAutomationDeliveryMessageIntent} from
  "../shared/generated/validators/automationDeliveryMessageIntent";
import {validateAutomationDeliveryAttempt} from
  "../shared/generated/validators/automationDeliveryAttempt";
import {operationContentHash} from "../operations/durableActions";
import type {
  DeliveryCoreFacts, DeliveryDispatchCandidate,
  DeliverySourceAdapter,
} from "../delivery/deliveryCore";
import {evaluateDelivery} from "../delivery/deliveryCore";

export type {DeliveryAttempt, MessageRecord};
export type AutomationDeliveryFacts = DeliveryCoreFacts<ProviderBinding>;
export type ProviderBinding = DeliveryAttempt["binding"];
export type LiveAttempt = DeliveryAttempt; // live is the only attempt mode

/**
 * One durable intent per automation occurrence: the deterministic id binds
 * (automation run, action) so a retried handoff can never mint a second
 * executor for the same source event.
 */
export function automationDeliveryIntentId(
  automationRunId: string, actionId: string
): string {
  return `autointent_${automationRunId}_${actionId}`.slice(0, 160);
}

/**
 * Deterministic automation message identity. The context carries the full
 * occurrence binding (rule + action + source event + contact) so two
 * occurrences can never collide on one intent id.
 */
export function automationDeliveryMessageId(intent: MessageIntent): string {
  return "outbox:" + operationContentHash([
    intent.context, intent.intentId, intent.revision,
  ]);
}

export function parseAutomationDeliveryIntent(
  value: unknown
): MessageIntent {
  if (!validateAutomationDeliveryMessageIntent(value)) {
    throw new Error("Invalid automation delivery intent");
  }
  if (value.expiresAt <= value.createdAt) {
    throw new Error("Automation delivery intent already expired");
  }
  return value;
}

export function parseAutomationDeliveryAttempt(
  value: unknown
): DeliveryAttempt {
  if (!validateAutomationDeliveryAttempt(value)) {
    throw new Error("Invalid automation delivery attempt");
  }
  if (value.state.at < value.createdAt ||
      value.createdAt < value.authorization.checkedAt ||
      value.createdAt >= value.authorization.validUntil ||
      ("reconcileAfter" in value.state &&
       value.state.reconcileAfter < value.state.at) ||
      (value.state.kind === "notDispatched" &&
       value.state.reason === "reservationExpired" &&
       value.state.at < value.authorization.validUntil)) {
    throw new Error("Invalid automation delivery attempt timeline");
  }
  return value;
}

export function parseAutomationDeliveryRecord(
  value: unknown
): MessageRecord {
  if (!validateAutomationDeliveryMessageDocument(value)) {
    throw new Error("Invalid automation delivery record");
  }
  parseAutomationDeliveryIntent(value.intent);
  value.attempts.forEach(parseAutomationDeliveryAttempt);
  if (value.messageId !== automationDeliveryMessageId(value.intent) ||
      value.createdAt < value.intent.createdAt ||
      value.updatedAt < value.createdAt ||
      value.attempts.some((attempt) =>
        attempt.createdAt < value.createdAt) ||
      value.attempts.length > value.intent.deliveryPolicy.maxAttempts) {
    throw new Error("Automation delivery identity or history is invalid");
  }
  // Validate complete history even when a message no longer needs dispatch.
  evaluateDelivery({intent: value.intent, attempts: value.attempts,
    lifecycle: value.lifecycle, now: value.updatedAt,
    gate: {kind: "stop", reason: "campaignEnded"}, routes: []},
  automationDeliveryAdapter);
  return value;
}

export function newAutomationDeliveryRecord(
  value: unknown, now: number
): MessageRecord {
  const intent = structuredClone(parseAutomationDeliveryIntent(value));
  if (!Number.isSafeInteger(now) || now >= intent.expiresAt) {
    throw new Error("Automation delivery intent expired or clock invalid");
  }
  return parseAutomationDeliveryRecord({schemaVersion: 1, source: "automation",
    messageId: automationDeliveryMessageId(intent), revision: 0, intent,
    lifecycle: "active", attempts: [], deliveryConflict: false,
    createdAt: now, updatedAt: now});
}

function sameAutomationContext(
  left: MessageIntent["context"], right: MessageIntent["context"]
): boolean {
  return left.mode === right.mode && left.organizerId === right.organizerId &&
    left.ruleId === right.ruleId && left.actionId === right.actionId &&
    left.eventKind === right.eventKind && left.sourceId === right.sourceId &&
    left.contactId === right.contactId;
}

/**
 * The automation binding to the shared delivery core. Rule, recipe, source
 * event, and contact facts are read transactionally by the worker's
 * `readFacts`; this module only owns contract and identity.
 */
export const automationDeliveryAdapter: DeliverySourceAdapter<
  MessageIntent["context"], ProviderBinding, MessageIntent, DeliveryAttempt,
  MessageRecord
> = {
  collection: DELIVERY_MESSAGES,
  messageId: (intent) => automationDeliveryMessageId(intent),
  parseIntent: (value) => parseAutomationDeliveryIntent(value),
  parseAttempt: (value) => parseAutomationDeliveryAttempt(value),
  parseRecord: (value) => parseAutomationDeliveryRecord(value),
  newRecord: (intent, now) => newAutomationDeliveryRecord(intent, now),
  instructionRevisionOf: (intent) => intent.instructionRevision,
  sameContext: (left, right) => sameAutomationContext(left, right),
  // Automation records carry no host-handoff evidence; closure is `close()`.
  recordStopReason: () => null,
  routeIdOf: (attempt) => attempt.binding.routeId,
  assertDispatchCandidate: (
    candidate: DeliveryDispatchCandidate<ProviderBinding>,
    intent: MessageIntent, now: number
  ) => {
    parseAutomationDeliveryAttempt({
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
