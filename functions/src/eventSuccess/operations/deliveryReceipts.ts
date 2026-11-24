import type {EventAssistanceDeliveryAttempt as DeliveryAttempt} from
  "../../shared/generated/eventAssistanceDeliveryAttempt";
import {parseDeliveryAttempt} from "./messageProtocol";
import {mergeConfirmedDeliveryState} from "./deliveryReceiptState";
import type {ConfirmedDeliveryState} from
  "../../platform/delivery/confirmedDeliveryState";

type LiveAttempt = Extract<DeliveryAttempt, {mode: "live"}>;

export interface VerifiedDeliveryReceipt {
  attemptId: string;
  senderId: string;
  bindingRevision: number;
  recipientEndpointId: string;
  routeId: LiveAttempt["binding"]["routeId"];
  providerEventId: string;
  receivedAt: number;
  /** Normalized provider evidence; `at` uses the server receipt clock. */
  state: ConfirmedDeliveryState;
}
export type DeliveryReceiptResult = {
  attempt: LiveAttempt;
  disposition: "applied" | "duplicateOrOlder" | "conflictingEvidence";
};

/** Invoke only after authenticating and correlating the provider callback. */
export function mergeDeliveryReceipt(
  attempt: LiveAttempt, receipt: VerifiedDeliveryReceipt
): DeliveryReceiptResult {
  parseDeliveryAttempt(attempt);
  if (attempt.mode !== "live" || receipt.attemptId !== attempt.attemptId ||
      receipt.senderId !== attempt.binding.senderId ||
      receipt.bindingRevision !== attempt.binding.bindingRevision ||
      receipt.recipientEndpointId !== attempt.binding.recipientEndpointId ||
      receipt.routeId !== attempt.binding.routeId ||
      typeof receipt.providerEventId !== "string" ||
      receipt.providerEventId.length === 0 ||
        receipt.providerEventId.length > 512 ||
      !Number.isSafeInteger(receipt.receivedAt) ||
      receipt.receivedAt < attempt.createdAt ||
      receipt.state.at !== receipt.receivedAt ||
      !["accepted", "delivered", "read", "failed", "revoked"]
        .includes(receipt.state.kind)) {
    throw new Error("Delivery receipt scope or evidence is invalid");
  }
  const merged = mergeConfirmedDeliveryState(attempt, receipt.state);
  if (merged.attempt.mode !== "live") {
    throw new Error("Live receipt changed execution mode");
  }
  return {attempt: merged.attempt, disposition: merged.disposition};
}
