import type {EventAssistanceDeliveryAttempt as DeliveryAttempt} from
  "../../shared/generated/eventAssistanceDeliveryAttempt";

/** Provider evidence that confirms an attempt's outcome. */
export type ConfirmedDeliveryState = Exclude<DeliveryAttempt["state"],
  {kind: "reserved" | "unknown" | "notDispatched"}>;
