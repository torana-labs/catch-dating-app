import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Razorpay from "razorpay";
import {signUpUserForEvent} from "../events/signUpUserForEvent";
import {verifyPaidEventBooking} from "./paymentValidation";
import {
  fulfillRazorpayPayment,
} from "./razorpayFulfillment";
import {
  createRazorpayClient,
  razorpayKeySecret,
  verifyPaymentSignature,
} from "./razorpay";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireAuth} from "../shared/auth";
import {normalizePayloadStrings} from "../shared/callablePayloadNormalization";
import {
  validateVerifyRazorpayPaymentCallablePayload,
} from "../shared/generated/validators/verifyRazorpayPaymentInput";
import type {VerifyRazorpayPaymentCallablePayload} from
  "../shared/generated/verifyRazorpayPaymentCallablePayload";
import {validateCallableWithAjv} from "../shared/validation";
import {
  assertRazorpayOrderOwnership,
  razorpayRuntimeProject,
  resolveRazorpayOrderOwnership,
} from "./razorpayOrderOwnership";

interface VerifyRazorpayPaymentDeps {
  createClient: () => Razorpay;
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => unknown;
  signUpForEvent: typeof signUpUserForEvent;
  verifySignature: typeof verifyPaymentSignature;
  checkRateLimit?: typeof defaultCheckRateLimit;
  runtimeProjectId?: () => string;
}

const defaultDeps: VerifyRazorpayPaymentDeps = {
  createClient: createRazorpayClient,
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  signUpForEvent: signUpUserForEvent,
  verifySignature: verifyPaymentSignature,
  checkRateLimit: defaultCheckRateLimit,
  runtimeProjectId: razorpayRuntimeProject,
};

/**
 * Verifies Razorpay payment truth, signs up the user, and records payment.
 * @param {CallableRequest<Partial<VerifyPaymentData> | null>} request Callable.
 * @param {VerifyRazorpayPaymentDeps} deps Injectable service dependencies.
 * @return {Promise<{verified: boolean, eventId: string}>} Verification result.
 */
export async function verifyRazorpayPaymentHandler(
  request: CallableRequest<unknown>,
  deps: VerifyRazorpayPaymentDeps = defaultDeps
) {
  const userId = requireAuth(request);
  const {paymentId, orderId, signature} = validateCallableWithAjv<
    VerifyRazorpayPaymentCallablePayload
  >(
    request,
    validateVerifyRazorpayPaymentCallablePayload,
    normalizeVerifyPaymentPayload
  );

  const db = deps.firestore();
  await deps.checkRateLimit?.(db, userId, "verifyRazorpayPayment", {
    maxRequests: 10, windowMs: 60 * 1000,
  });

  if (!deps.verifySignature({orderId, paymentId, signature})) {
    throw new HttpsError(
      "invalid-argument",
      "Payment signature verification failed."
    );
  }

  const razorpay = deps.createClient();
  const paymentRef = db.collection("payments").doc(paymentId);
  const pendingRef = db.collection("razorpayPendingOrders").doc(orderId);
  const [order, payment, localPayment, pendingOrder] = await Promise.all([
    razorpay.orders.fetch(orderId),
    razorpay.payments.fetch(paymentId),
    paymentRef.get(),
    pendingRef.get(),
  ]);
  const runtimeProjectId =
    (deps.runtimeProjectId ?? razorpayRuntimeProject)();
  const ownership = resolveRazorpayOrderOwnership({
    runtimeProjectId,
    order,
    frozenContexts: [
      localPayment.data()?.razorpayOwnership,
      pendingOrder.data()?.razorpayOwnership,
    ],
  });
  if (ownership.kind !== "owned") {
    throw new HttpsError("failed-precondition",
      "This payment needs ownership reconciliation.");
  }
  const razorpayOwnership = assertRazorpayOrderOwnership({
    evidence: ownership.evidence,
    orderId,
    runtimeProjectId,
  });
  const razorpayAuthorization = {evidence: ownership.evidence,
    runtimeProjectId};

  if (isExactTerminalRefundReplay({order, payment,
    localPayment: localPayment.data(), orderId, paymentId, userId})) {
    throw new HttpsError("failed-precondition",
      "This booking was not admitted. Check its refund status in Payments.");
  }
  const booking = verifyPaidEventBooking({
    order,
    payment,
    expectedUserId: userId,
  });

  // Fulfillment (sign up -> completed payments doc, or refund-on-failure) is
  // shared with the Razorpay webhook and the reconciliation sweep so all three
  // paths stay idempotent and never double-fulfill or double-charge.
  const outcome = await fulfillRazorpayPayment({
    db,
    orderId,
    paymentId,
    booking,
    razorpayOwnership,
    razorpayAuthorization,
    deps: {
      signUpForEvent: deps.signUpForEvent,
      serverTimestamp: deps.serverTimestamp,
    },
  });

  if (!outcome.fulfilled) {
    throw new HttpsError("failed-precondition",
      "This booking was not admitted. Check its refund status in Payments.");
  }
  return {verified: true, eventId: booking.eventId};
}

function isExactTerminalRefundReplay(input: {
  order: {id: string; amount: string | number; currency: string;
    notes?: Record<string, string | number | null> | null};
  payment: {id: string; order_id: string; amount: string | number;
    currency: string; status: string; amount_refunded?: number};
  localPayment: FirebaseFirestore.DocumentData | undefined;
  orderId: string;
  paymentId: string;
  userId: string;
}): boolean {
  const {order, payment, localPayment, orderId, paymentId, userId} = input;
  if (!localPayment || !["refunded", "refundFailed"]
    .includes(String(localPayment.status))) return false;
  const amount = Number(order.amount);
  return order.id === orderId && payment.id === paymentId &&
    payment.order_id === orderId && Number.isSafeInteger(amount) &&
    amount > 0 &&
    Number(payment.amount) === amount && payment.currency === order.currency &&
    payment.status === "refunded" && payment.amount_refunded === amount &&
    localPayment.provider === "razorpay" && localPayment.orderId === orderId &&
    localPayment.paymentId === paymentId && localPayment.userId === userId &&
    localPayment.eventId === orderNote(order, "eventId") &&
    localPayment.amount === amount && localPayment.currency === order.currency;
}

function orderNote(
  order: {notes?: Record<string, string | number | null> | null},
  key: string
): string | null {
  const value = order.notes?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Trims Razorpay verification payload fields before schema validation.
 * @param {unknown} data Raw callable payload.
 * @return {unknown} Normalized payload.
 */
function normalizeVerifyPaymentPayload(data: unknown): unknown {
  return normalizePayloadStrings(data, {
    stringFields: ["paymentId", "orderId", "signature"],
  });
}

export const verifyRazorpayPayment = onCall(
  appCheckCallableOptionsWithSecrets([razorpayKeySecret]),
  (request) => verifyRazorpayPaymentHandler(request)
);
