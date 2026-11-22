import type {OrganizerMessagingWebhookEventDocument as QueuedEvent} from
  "../../shared/generated/organizerMessagingWebhookEventDocument";
import type {ConfirmedDeliveryState} from "./confirmedDeliveryState";

type StatusEvidence = Pick<QueuedEvent, "deliveryStatus" |
  "providerErrorCode" | "providerErrorEvidence" | "providerMessageId">;
type Failure = Extract<ConfirmedDeliveryState, {kind: "failed"}>;

export type WhatsappDeliveryResult =
  | {kind: "ignored" | "rejected"}
  | {kind: "unconfirmed"; messageId: string}
  | {kind: "recorded"; messageId: string;
      disposition: "applied" | "duplicateOrOlder" | "conflictingEvidence"};

/** Only after signed ingress and immutable dispatch correlation succeed. */
export function normalizeWhatsappDeliveryStatus(
  event: StatusEvidence, receivedAt: number, evidenceId: string
): ConfirmedDeliveryState | null {
  const errors = event.providerErrorEvidence;
  if (!event.providerMessageId || !errors || errors.kind === "unusable") {
    return null;
  }
  if (event.deliveryStatus !== "failed") {
    if (errors.kind !== "none" || event.providerErrorCode !== null ||
        !event.deliveryStatus) return null;
    return {kind: event.deliveryStatus === "sent" ?
      "accepted" : event.deliveryStatus, at: receivedAt,
    providerMessageId: event.providerMessageId};
  }
  if (errors.kind !== "codes" || errors.codes.length === 0 ||
      errors.codes.length > 10 ||
      event.providerErrorCode !== errors.codes[0] ||
      errors.codes.some((code) => !Number.isSafeInteger(code))) return null;
  const classification = failureClassification(errors.codes);
  return classification === null ? null : {kind: "failed", at: receivedAt,
    providerMessageId: event.providerMessageId, classification, evidenceId};
}

/**
 * Meta error-codes documentation reviewed 2026-09-07:
 * https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes/
 * Only an explicit failed status with a complete list of temporary service /
 * throughput codes can permit technical recovery. HTTP errors do not use this
 * classifier. Unknown errors and ambiguous recipient failures stay unresolved.
 */
function failureClassification(codes: number[]):
  Failure["classification"] | null {
  // A confirmed restriction wins even when another reported code is unknown.
  // This classifies this attempt; it cannot change recipient consent records.
  if (codes.includes(131050)) return "suppressed";
  if (codes.some((code) => [368, 130497, 131031, 131047, 131048, 131049]
    .includes(code))) return "policy";
  if (codes.every((code) => code === 131016 || code === 130429)) {
    return "technical";
  }
  return null;
}
