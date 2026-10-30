import {operationContentHash as hash} from "../../operations/durableActions";
import {
  evaluateDelivery,
  type DeliverySourceAdapter,
} from "../../delivery/deliveryCore";
import type {EventApprovalNotificationIntent as Intent} from
  "../../shared/generated/eventApprovalNotificationIntent";
import type {EventApprovalNotificationAttempt as Attempt} from
  "../../shared/generated/eventApprovalNotificationAttempt";
import type {EventApprovalNotificationMessageDocument as Message} from
  "../../shared/generated/eventApprovalNotificationMessageDocument";
import {validateEventApprovalNotificationIntent as validIntent} from
  "../../shared/generated/validators/eventApprovalNotificationIntent";
import {validateEventApprovalNotificationAttempt as validAttempt} from
  "../../shared/generated/validators/eventApprovalNotificationAttempt";
import {validateEventApprovalNotificationMessageDocument as validMessage} from
  "../../shared/generated/validators/eventApprovalNotificationMessageDocument";
import {brandWebUrl} from "../../shared/generated/brand";
export type {Intent, Attempt, Message};
export type Binding = Attempt["binding"];
export const messages = "eventApprovalNotificationMessages";
export const preferenceId = (eventId: string, uid: string) =>
  "eap_" + hash([eventId, uid]);
export const eventUrl = (eventId: string) =>
  brandWebUrl("/events/") + encodeURIComponent(eventId) + "/";
export const terms = {
  version: "event-approval-v1" as const,
  phone:
    "Send updates about this application on WhatsApp, with SMS " +
    "fallback, from Catch and this organizer. Optional; turn off any time.",
  email:
    "Email me updates about this application. Optional; turn off " +
    "any time.",
};
export const messageId = (intent: Intent) =>
  "outbox:" + hash([intent.context, intent.lane, intent.revision]);
export function parseIntent(value: unknown): Intent {
  if (
    !validIntent(value) ||
    value.expiresAt <= value.createdAt ||
    value.createdAt !== value.context.approvedAtMillis ||
    JSON.stringify(value.permittedRoutes) !==
      JSON.stringify(
        value.lane === "email" ?
          ["approvalEmail"] :
          ["approvalWhatsapp", "approvalSms"],
      )
  ) {
    throw invalid();
  }
  return value;
}
export function parseAttempt(value: unknown): Attempt {
  if (
    !validAttempt(value) ||
    value.state.at < value.createdAt ||
    value.createdAt < value.authorization.checkedAt ||
    value.createdAt >= value.authorization.validUntil
  ) {
    throw invalid();
  }
  return value;
}
export function parseMessage(value: unknown): Message {
  if (!validMessage(value)) throw invalid();
  parseIntent(value.intent);
  value.attempts.forEach(parseAttempt);
  if (
    value.messageId !== messageId(value.intent) ||
    value.updatedAt < value.createdAt ||
    value.createdAt < value.intent.createdAt ||
    value.attempts.some((a) => a.createdAt < value.createdAt)
  ) {
    throw invalid();
  }
  evaluateDelivery(
    {
      intent: value.intent,
      attempts: value.attempts,
      lifecycle: value.lifecycle,
      now: value.updatedAt,
      gate: {kind: "stop", reason: "validation"},
      routes: [],
    },
    adapter,
  );
  return value;
}
export function newMessage(intent: Intent, now: number): Message {
  parseIntent(intent);
  if (now >= intent.expiresAt) throw invalid();
  return parseMessage({
    schemaVersion: 1,
    messageId: messageId(intent),
    revision: 0,
    intent,
    lifecycle: "active",
    attempts: [],
    deliveryConflict: false,
    createdAt: now,
    updatedAt: now,
  });
}
export const adapter: DeliverySourceAdapter<
  Intent["context"],
  Binding,
  Intent,
  Attempt,
  Message
> = {
  collection: messages,
  messageId,
  parseIntent,
  parseAttempt,
  parseRecord: parseMessage,
  newRecord: newMessage,
  instructionRevisionOf: () => 1,
  sameContext: (a, b) => hash(a) === hash(b),
  recordStopReason: () => null,
  routeIdOf: (a) => a.binding.routeId,
  assertDispatchCandidate: (candidate, intent, now) => {
    if (candidate.mode !== "live") throw invalid();
    parseAttempt({
      schemaVersion: 1,
      attemptId: "validation",
      intentId: intent.intentId,
      intentRevision: 1,
      ordinal: 1,
      createdAt: now,
      mode: "live",
      context: intent.context,
      binding: candidate.binding,
      authorization: {
        permissionRevision: "validation",
        checkedAt: now,
        validUntil: now + 1,
        instructionRevision: 1,
      },
      state: {kind: "reserved", at: now, reconcileAfter: now},
    });
  },
  withAttempts: (record, attempts) => ({...record, attempts}),
  withLifecycle: (record, lifecycle) => ({...record, lifecycle}),
  withDeliveryConflict: (record, deliveryConflict) => ({
    ...record,
    deliveryConflict,
  }),
};
function invalid() {
  return new Error("Invalid approval notification");
}

export const timestampMillis = (value: {
  _seconds: number;
  _nanoseconds: number;
}) => value._seconds * 1000 + value._nanoseconds / 1_000_000;
