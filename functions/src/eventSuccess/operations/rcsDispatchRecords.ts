import type {EventRcsBudgetDocument as RcsBudget} from
  "../../shared/generated/eventRcsBudgetDocument";
import type {EventRcsDispatchDocument as RcsDispatch} from
  "../../shared/generated/eventRcsDispatchDocument";
import type {EventRcsCapabilityObservation as RcsCapability} from
  "../../shared/generated/eventRcsCapabilityObservation";
import {validateEventRcsBudgetDocument} from
  "../../shared/generated/validators/eventRcsBudgetDocument";
import {validateEventRcsDispatchDocument} from
  "../../shared/generated/validators/eventRcsDispatchDocument";
import {validateEventRcsCapabilityObservation} from
  "../../shared/generated/validators/eventRcsCapabilityObservation";
import {operationContentHash} from "../../operations/durableActions";
import {guestIdentity, requireDocumentId} from "./guestRecords";
import type {LiveAttempt} from "./messageOutbox";
import {rbmTime, rbmUuid} from "./googleRbmProtocol";
import {rcsMessageId} from "./rcsProtocol";
import {rcsPermissionId} from "./rcsConsent";
import {rcsSubscriptionId} from "./rcsSubscriptions";
import {EVENT_ASSISTANCE_BUDGETS} from
  "./messageConsentCollections";

export type {RcsBudget, RcsDispatch, RcsCapability};
export const RCS_BUDGETS = EVENT_ASSISTANCE_BUDGETS;
export const RCS_DISPATCHES = "eventAssistanceRcsDispatches";
export const RCS_CAPABILITY_MAX_AGE = 60_000;

/** Receipt updates may change only state, never the original attempt scope. */
export function rcsAttemptScopeHash(attempt: LiveAttempt): string {
  return operationContentHash({...attempt, state: null});
}

/** UTC billing day, independent of the event venue and provider region. */
export function rcsBudgetScopes(context: RcsDispatch["context"], now: number):
  [RcsBudget["scope"], RcsBudget["scope"]] {
  if (!rbmTime(now)) throw new Error("Invalid RCS budget clock");
  const day = new Date(now).toISOString().slice(0, 10);
  return [{kind: "event", context}, {kind: "senderDay", day}];
}

export function rcsBudgetId(senderId: string, scope: RcsBudget["scope"]) {
  requireDocumentId(senderId);
  return "rcs-budget:" + operationContentHash([senderId, scope]);
}

export function parseRcsBudget(value: unknown): RcsBudget {
  if (!validateEventRcsBudgetDocument(value) ||
      value.budgetId !== rcsBudgetId(value.senderId, value.scope) ||
      value.endsAt <= value.startsAt || value.updatedAt < value.startsAt ||
      value.chargedMicros > value.limitMicros) {
    throw new Error("Invalid RCS spending authority");
  }
  rcsSubscriptionId(value.agentId, "0".repeat(64));
  if (value.scope.kind === "senderDay") {
    const start = Date.parse(value.scope.day + "T00:00:00Z");
    if (!rbmTime(start) || new Date(start).toISOString().slice(0, 10) !==
        value.scope.day || value.startsAt !== start ||
        value.endsAt !== start + 86_400_000) {
      throw new Error("RCS sender-day budget has the wrong UTC window");
    }
  }
  return value;
}

export function parseRcsCapability(value: unknown): RcsCapability {
  if (!validateEventRcsCapabilityObservation(value) ||
      !rbmUuid(value.requestId) || !rbmTime(value.checkedAt) ||
      !rbmTime(value.validUntil) || value.validUntil <= value.checkedAt ||
      value.validUntil - value.checkedAt > RCS_CAPABILITY_MAX_AGE) {
    throw new Error("Invalid RCS capability observation");
  }
  rcsSubscriptionId(value.agentId, "0".repeat(64));
  return value;
}

export function parseRcsDispatch(value: unknown): RcsDispatch {
  if (!validateEventRcsDispatchDocument(value) ||
      value.providerMessageId !== rcsMessageId(value.attemptId) ||
      value.permissionId !== rcsPermissionId(value.context, value.attendeeId,
        value.senderId) || !rbmTime(value.createdAt) ||
      !rbmTime(value.expiresAt) || value.expiresAt <= value.createdAt ||
      value.expiresAt > value.createdAt + 3_600_000 ||
      value.capability.senderId !== value.senderId ||
      value.capability.agentId !== value.agentId ||
      value.capability.recipientEndpointId !== value.recipientEndpointId ||
      value.capability.permissionHash !== value.permissionHash ||
      value.capability.configHash !== value.configHash ||
      value.capability.checkedAt > value.createdAt ||
      value.capability.validUntil <= value.createdAt) {
    throw new Error("Invalid RCS dispatch evidence");
  }
  parseRcsCapability(value.capability);
  const reply = value.replyBinding;
  if (reply && (reply.guestId !== guestIdentity(value.context,
    value.attendeeId) || reply.expiresAt <= value.createdAt ||
    (reply.recipientBinding &&
      (reply.recipientBinding.subjectUid !== reply.subjectUid ||
       reply.recipientBinding.sourceGeneration !== reply.sourceGeneration)) ||
    reply.choices.some((choice, i) => i > 0 &&
      choice.index <= reply.choices[i - 1].index) ||
    new Set(reply.choices.map((c) => c.choiceId)).size !==
      reply.choices.length)) throw new Error("Invalid RCS reply binding");
  const scopes = rcsBudgetScopes(value.context, value.createdAt);
  if (value.budgetDebits.some((debit, i) =>
    debit.budgetId !== rcsBudgetId(value.senderId, scopes[i]) ||
      debit.revisionAfter !== debit.revisionBefore + 1 ||
      debit.chargedAfterMicros - debit.chargedBeforeMicros !==
        value.maxCostMicros)) throw new Error("Invalid RCS budget debit");
  return value;
}
