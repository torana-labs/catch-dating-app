import type {EventAssistanceDeliveryAttempt as DeliveryAttempt} from
  "../../shared/generated/eventAssistanceDeliveryAttempt";
import type {ConfirmedDeliveryState} from
  "../../platform/delivery/confirmedDeliveryState";
import {parseDeliveryAttempt} from "./messageProtocol";

/** Pure evidence ordering, shared by verified live receipts and simulation. */
export function mergeConfirmedDeliveryState(
  attempt: DeliveryAttempt, state: ConfirmedDeliveryState
): {attempt: DeliveryAttempt;
    disposition: "applied" | "duplicateOrOlder" | "conflictingEvidence"} {
  parseDeliveryAttempt(attempt);
  if (!["accepted", "delivered", "read", "failed", "revoked"]
    .includes(state.kind)) throw new Error("Invalid confirmed delivery state");
  const previous = attempt.state;
  const previousId = "providerMessageId" in previous ?
    previous.providerMessageId : null;
  const nextId = state.providerMessageId;
  if (previousId !== null && nextId !== null && previousId !== nextId) {
    throw new Error("Provider message identity mismatch");
  }
  const next: ConfirmedDeliveryState = {
    ...state,
    providerMessageId: nextId ?? previousId,
  } as ConfirmedDeliveryState;
  parseDeliveryAttempt({...attempt, state: next});
  const delivered = (state: DeliveryAttempt["state"]) =>
    state.kind === "delivered" || state.kind === "read";
  const nonDelivery = (state: DeliveryAttempt["state"]) =>
    state.kind === "failed" || state.kind === "revoked" ||
    state.kind === "notDispatched";
  if (delivered(previous) && nonDelivery(next)) {
    return {attempt, disposition: "conflictingEvidence"};
  }
  if (nonDelivery(previous) && delivered(next)) {
    return {attempt: {...attempt, state: next},
      disposition: "conflictingEvidence"};
  }
  if (previous.kind === "notDispatched") {
    return {attempt: {...attempt, state: next},
      disposition: "conflictingEvidence"};
  }
  if (previous.kind === "read" ||
      (previous.kind === "delivered" && next.kind === "accepted") ||
      ((previous.kind === "failed" || previous.kind === "revoked") &&
       next.kind === "accepted")) {
    return {attempt, disposition: "duplicateOrOlder"};
  }
  if (previous.kind === "failed" && next.kind === "failed" &&
      previous.classification !== next.classification) {
    const restricted = previous.classification === "policy" ||
      previous.classification === "suppressed";
    return {attempt: restricted ? attempt : {...attempt, state: next},
      disposition: "conflictingEvidence"};
  }
  if (previous.kind === next.kind) {
    return {attempt, disposition: "duplicateOrOlder"};
  }
  if (previous.kind === "failed" && next.kind === "revoked" &&
      previous.classification !== "technical") {
    return {attempt, disposition: "conflictingEvidence"};
  }
  return {attempt: {...attempt, state: next}, disposition: "applied"};
}
