import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {razorpayKeySecret} from "./razorpay";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {requireAuth} from "../shared/auth";
import type {
  CreateRazorpayOrderCallablePayload,
} from "../shared/generated/createRazorpayOrderCallablePayload";
import {
  validateCreateRazorpayOrderCallablePayload,
} from "../shared/generated/validators/createRazorpayOrderInput";
import {validateCallableWithAjv} from "../shared/validation";
import {normalizeEventIdPayload} from "../events/eventPayloadNormalization";

/**
 * Retired: guest money is never collected into Catch's merchant account.
 * Paid seats are sold through `managePublicEventCheckout`, whose payment
 * routing freezes the organizer's collection route (their own Razorpay via
 * OAuth today; marketplace routes such as Razorpay Route later). Existing
 * native orders still verify, reconcile and refund through
 * `verifyRazorpayPayment`, `razorpayWebhook` and the legacy refund flow.
 * The callable stays exported so older app builds get this explanation
 * instead of a missing-function error.
 * @param {CallableRequest<unknown>} request Callable request.
 * @return {Promise<never>} Always rejects.
 */
export async function createRazorpayOrderHandler(
  request: CallableRequest<unknown>,
): Promise<never> {
  requireAuth(request);
  validateCallableWithAjv<CreateRazorpayOrderCallablePayload>(
    request,
    validateCreateRazorpayOrderCallablePayload,
    normalizeEventIdPayload
  );
  throw new HttpsError(
    "failed-precondition",
    "Paid bookings now go to the organiser's own checkout. " +
      "Update Catch, or book this event on catchdates.com."
  );
}

// The secret binding stays until the environment readiness manifest drops
// this consumer (CAT-276 follow-up); the handler never reads it.
export const createRazorpayOrder = onCall(
  appCheckCallableOptionsWithSecrets([razorpayKeySecret]),
  async (request) => {
    if (request.auth) {
      await checkRateLimit(
        admin.firestore(),
        request.auth.uid,
        "createRazorpayOrder",
        {maxRequests: 10, windowMs: 60 * 1000}
      );
    }
    return createRazorpayOrderHandler(request);
  }
);
