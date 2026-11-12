import {DELIVERY_MESSAGES} from "../delivery/deliveryMessages";
import type {CampaignDeliveryMessageDocument as MessageRecord} from
  "../shared/generated/campaignDeliveryMessageDocument";
import type {CampaignDeliveryMessageIntent as MessageIntent} from
  "../shared/generated/campaignDeliveryMessageIntent";
import type {CampaignDeliveryAttempt as DeliveryAttempt} from
  "../shared/generated/campaignDeliveryAttempt";
import {validateCampaignDeliveryMessageDocument} from
  "../shared/generated/validators/campaignDeliveryMessageDocument";
import {validateCampaignDeliveryMessageIntent} from
  "../shared/generated/validators/campaignDeliveryMessageIntent";
import {validateCampaignDeliveryAttempt} from
  "../shared/generated/validators/campaignDeliveryAttempt";
import {operationContentHash} from "../operations/durableActions";
import type {
  DeliveryCoreFacts, DeliveryDispatchCandidate,
  DeliverySourceAdapter,
} from "../delivery/deliveryCore";
import {evaluateDelivery} from "../delivery/deliveryCore";

export type {DeliveryAttempt, MessageRecord};
export type CampaignDeliveryFacts = DeliveryCoreFacts<ProviderBinding>;
export type ProviderBinding = DeliveryAttempt["binding"];
export type LiveAttempt = DeliveryAttempt; // live is the only attempt mode

/** One durable intent per campaign recipient row. */
export function campaignDeliveryIntentId(
  campaignId: string, recipientId: string
): string {
  return `ocint_${campaignId}_${recipientId}`.slice(0, 160);
}

/**
 * Deterministic campaign message identity. The context carries campaign +
 * recipient scope so two campaigns can never collide on one intent id.
 */
export function campaignDeliveryMessageId(intent: MessageIntent): string {
  return "outbox:" + operationContentHash([
    intent.context, intent.intentId, intent.revision,
  ]);
}

export function parseCampaignDeliveryIntent(value: unknown): MessageIntent {
  if (!validateCampaignDeliveryMessageIntent(value)) {
    throw new Error("Invalid campaign delivery intent");
  }
  if (value.expiresAt <= value.createdAt) {
    throw new Error("Campaign delivery intent already expired");
  }
  return value;
}

export function parseCampaignDeliveryAttempt(
  value: unknown
): DeliveryAttempt {
  if (!validateCampaignDeliveryAttempt(value)) {
    throw new Error("Invalid campaign delivery attempt");
  }
  if (value.state.at < value.createdAt ||
      value.createdAt < value.authorization.checkedAt ||
      value.createdAt >= value.authorization.validUntil ||
      ("reconcileAfter" in value.state &&
       value.state.reconcileAfter < value.state.at) ||
      (value.state.kind === "notDispatched" &&
       value.state.reason === "reservationExpired" &&
       value.state.at < value.authorization.validUntil)) {
    throw new Error("Invalid campaign delivery attempt timeline");
  }
  return value;
}

export function parseCampaignDeliveryRecord(value: unknown): MessageRecord {
  if (!validateCampaignDeliveryMessageDocument(value)) {
    throw new Error("Invalid campaign delivery record");
  }
  parseCampaignDeliveryIntent(value.intent);
  value.attempts.forEach(parseCampaignDeliveryAttempt);
  if (value.messageId !== campaignDeliveryMessageId(value.intent) ||
      value.createdAt < value.intent.createdAt ||
      value.updatedAt < value.createdAt ||
      value.attempts.some((attempt) =>
        attempt.createdAt < value.createdAt) ||
      value.attempts.length > value.intent.deliveryPolicy.maxAttempts) {
    throw new Error("Campaign delivery identity or history is invalid");
  }
  // Validate complete history even when a message no longer needs dispatch.
  evaluateDelivery({intent: value.intent, attempts: value.attempts,
    lifecycle: value.lifecycle, now: value.updatedAt,
    gate: {kind: "stop", reason: "campaignEnded"}, routes: []},
  campaignDeliveryAdapter);
  return value;
}

export function newCampaignDeliveryRecord(
  value: unknown, now: number
): MessageRecord {
  const intent = structuredClone(parseCampaignDeliveryIntent(value));
  if (!Number.isSafeInteger(now) || now >= intent.expiresAt) {
    throw new Error("Campaign delivery intent expired or clock invalid");
  }
  return parseCampaignDeliveryRecord({schemaVersion: 1, source: "campaign",
    messageId: campaignDeliveryMessageId(intent), revision: 0, intent,
    lifecycle: "active", attempts: [], deliveryConflict: false,
    createdAt: now, updatedAt: now});
}

function sameCampaignContext(
  left: MessageIntent["context"], right: MessageIntent["context"]
): boolean {
  return left.mode === right.mode && left.organizerId === right.organizerId &&
    left.campaignId === right.campaignId &&
    left.recipientId === right.recipientId;
}

/**
 * The campaign binding to the shared delivery core. Campaign facts —
 * consent, suppression, frequency caps, sender/template liveness — are read
 * transactionally by the source's `readFacts`; this module only owns
 * contract and identity.
 */
export const campaignDeliveryAdapter: DeliverySourceAdapter<
  MessageIntent["context"], ProviderBinding, MessageIntent, DeliveryAttempt,
  MessageRecord
> = {
  collection: DELIVERY_MESSAGES,
  messageId: (intent) => campaignDeliveryMessageId(intent),
  parseIntent: (value) => parseCampaignDeliveryIntent(value),
  parseAttempt: (value) => parseCampaignDeliveryAttempt(value),
  parseRecord: (value) => parseCampaignDeliveryRecord(value),
  newRecord: (intent, now) => newCampaignDeliveryRecord(intent, now),
  instructionRevisionOf: (intent) => intent.instructionRevision,
  sameContext: (left, right) => sameCampaignContext(left, right),
  // Campaign records carry no host-handoff evidence; closure is `close()`.
  recordStopReason: () => null,
  routeIdOf: (attempt) => attempt.binding.routeId,
  assertDispatchCandidate: (
    candidate: DeliveryDispatchCandidate<ProviderBinding>,
    intent: MessageIntent, now: number
  ) => {
    parseCampaignDeliveryAttempt({
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
