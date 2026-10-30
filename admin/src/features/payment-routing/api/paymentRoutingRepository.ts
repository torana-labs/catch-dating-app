import {managePaymentRoutingPolicy} from "../../../shared/api/adminApi";
import type {
  RoutingPolicy,
  RoutingReplacement,
} from "../controllers/paymentRoutingForm";

/** Catch's app-wide routing defaults; organizer overrides are not edited here. */
export function loadAppPaymentRouting(): Promise<RoutingPolicy> {
  return managePaymentRoutingPolicy({action: "read", organizerId: null,
    expectedRevision: null, formFee: null, eventAdmission: null,
    hostMembership: null});
}

export function replaceAppPaymentRouting(
  payload: RoutingReplacement
): Promise<RoutingPolicy> {
  return managePaymentRoutingPolicy(payload);
}
