import {createHash} from "node:crypto";
import {HttpsError} from "firebase-functions/v2/https";
import type {
  PaymentStatus,
  EventDocument,
} from "../shared/generated/firestoreAdminTypes";
import {razorpayCurrency} from "./razorpay";
import {requirePublicConfiguredEvent} from "../events/configuredEvent";

interface RazorpayOrderNotes {
  [key: string]: string | number | null;
}

export interface RazorpayOrderSnapshot {
  id: string;
  amount: number | string;
  currency: string;
  amount_paid: number | string;
  amount_due: number | string;
  notes?: RazorpayOrderNotes | null;
}

export interface RazorpayPaymentSnapshot {
  id: string;
  order_id: string;
  amount: number | string;
  currency: string;
  status: string;
  refund_status?: string | null;
  amount_refunded?: number;
  fee?: number | null;
  tax?: number | null;
}

export interface VerifiedPaymentBooking {
  eventId: string;
  userId: string;
  amountInPaise: number;
  currency: string;
  inviteVerified?: boolean;
  inviteLinkId?: string | null;
  inviteSource?: string | null;
  crossPathsPairHoldId?: string | null;
  /** Razorpay's fee including tax, and the tax within it, when reported. */
  providerFees?: {feePaise: number; taxPaise: number};
}

export interface PaymentRecordInput extends VerifiedPaymentBooking {
  orderId: string;
  paymentId: string;
  status: PaymentStatus;
  signUpFailed?: boolean;
}

const successfulPaymentStatuses = new Set(["captured"]);

/**
 * Builds the trusted Razorpay order payload for a paid event.
 * @param {object} params Input parameters.
 * @param {string} params.eventId Event id being booked.
 * @param {EventDocument} params.event Trusted Firestore event snapshot.
 * @param {string} params.userId Authenticated user id.
 * @param {string|number} params.receiptToken Receipt uniqueness token.
 * @param {number=} params.amountInPaise Optional event-policy quoted amount.
 * @return {object} Razorpay order creation payload.
 */
export function buildOrderCreatePayload({
  eventId,
  event,
  userId,
  receiptToken,
  amountInPaise,
  inviteVerified = false,
  inviteLinkId,
  inviteSource,
  crossPathsPairHoldId,
}: {
  eventId: string;
  event: EventDocument;
  userId: string;
  receiptToken: string | number;
  amountInPaise?: number;
  inviteVerified?: boolean;
  inviteLinkId?: string | null;
  inviteSource?: string | null;
  crossPathsPairHoldId?: string | null;
}) {
  const configuredEvent = requirePublicConfiguredEvent(event);
  if (event.status === "cancelled") {
    throw new HttpsError(
      "failed-precondition",
      "This event has been cancelled."
    );
  }

  const trustedAmountInPaise = parsePositiveAmount(
    amountInPaise ?? configuredEvent.priceInPaise,
    "Event price"
  );
  const eventCurrency = event.currency ?? razorpayCurrency;
  if (eventCurrency !== razorpayCurrency) {
    throw new HttpsError(
      "failed-precondition",
      "Paid bookings are not available for this event currency yet."
    );
  }

  // Razorpay documents a 40-character receipt limit. Keep short legacy
  // receipts, but hash the complete identity instead of truncating long ids.
  // Fulfillment reads the unchanged authoritative notes, never this label.
  const legacyReceipt = `event_${eventId}_${receiptToken}`;
  const receipt = /^[a-zA-Z0-9_-]{1,40}$/.test(legacyReceipt) ?
    legacyReceipt :
    "event_" + createHash("sha256")
      .update(JSON.stringify([eventId, userId, String(receiptToken)]))
      .digest("hex").slice(0, 34);

  return {
    amount: trustedAmountInPaise,
    currency: eventCurrency,
    receipt,
    notes: {
      eventId,
      userId,
      quotedAmountInPaise: trustedAmountInPaise,
      inviteVerified: inviteVerified ? "true" : "false",
      ...(inviteLinkId ? {inviteLinkId} : {}),
      ...(inviteSource ? {inviteSource} : {}),
      ...(crossPathsPairHoldId ? {crossPathsPairHoldId} : {}),
    },
  };
}

/**
 * Verifies Razorpay order/payment snapshots and returns booking truth.
 * @param {object} params Input parameters.
 * @param {RazorpayOrderSnapshot} params.order Razorpay order snapshot.
 * @param {RazorpayPaymentSnapshot} params.payment Razorpay payment snapshot.
 * @param {string} params.expectedUserId Authenticated user id.
 * @return {VerifiedPaymentBooking} Trusted booking details.
 */
export function verifyPaidEventBooking({
  order,
  payment,
  expectedUserId,
}: {
  order: RazorpayOrderSnapshot;
  payment: RazorpayPaymentSnapshot;
  expectedUserId: string;
}): VerifiedPaymentBooking {
  const orderAmount = parsePositiveAmount(order.amount, "Order amount");
  const orderAmountPaid = parseNonNegativeAmount(
    order.amount_paid,
    "Order paid amount"
  );
  const orderAmountDue = parseNonNegativeAmount(
    order.amount_due,
    "Order due amount"
  );

  if (order.currency !== razorpayCurrency) {
    throw new HttpsError(
      "invalid-argument",
      `Unsupported order currency: ${order.currency}.`
    );
  }

  if (orderAmountPaid < orderAmount || orderAmountDue !== 0) {
    throw new HttpsError(
      "failed-precondition",
      "Order has not been fully paid."
    );
  }

  if (payment.order_id !== order.id) {
    throw new HttpsError(
      "invalid-argument",
      "Payment does not belong to this order."
    );
  }

  const paymentAmount = parsePositiveAmount(payment.amount, "Payment amount");
  if (paymentAmount !== orderAmount) {
    throw new HttpsError(
      "invalid-argument",
      "Payment amount does not match the order amount."
    );
  }

  if (payment.currency !== order.currency) {
    throw new HttpsError(
      "invalid-argument",
      "Payment currency does not match the order currency."
    );
  }

  if (!successfulPaymentStatuses.has(payment.status)) {
    throw new HttpsError(
      "failed-precondition",
      "Payment is not in a successful state."
    );
  }

  if (hasRefund(payment)) {
    throw new HttpsError(
      "failed-precondition",
      "Refunded payments cannot be used for booking."
    );
  }

  const eventId = getRequiredNote(order.notes, "eventId");
  const userId = getRequiredNote(order.notes, "userId");
  const inviteVerified = order.notes?.inviteVerified === "true";
  const inviteLinkId = getOptionalNote(order.notes, "inviteLinkId");
  const inviteSource = getOptionalNote(order.notes, "inviteSource");
  const crossPathsPairHoldId = getOptionalNote(
    order.notes,
    "crossPathsPairHoldId"
  );

  if (userId !== expectedUserId) {
    throw new HttpsError(
      "permission-denied",
      "This order does not belong to the signed-in user."
    );
  }

  return {
    eventId,
    userId,
    amountInPaise: orderAmount,
    currency: order.currency,
    inviteVerified,
    inviteLinkId,
    inviteSource,
    ...(crossPathsPairHoldId ? {crossPathsPairHoldId} : {}),
    ...paymentProviderFees(payment),
  };
}

/**
 * Razorpay's fee and tax from a captured payment entity, when reported.
 * @param {object} payment Razorpay payment entity.
 * @return {object} providerFees, or nothing.
 */
export function paymentProviderFees(payment: {fee?: unknown; tax?: unknown}):
  {providerFees?: {feePaise: number; taxPaise: number}} {
  const minor = (value: unknown) => typeof value === "number" &&
    Number.isSafeInteger(value) && value >= 0 ? value : null;
  const fee = minor(payment.fee);
  return fee === null ? {} :
    {providerFees: {feePaise: fee, taxPaise: minor(payment.tax) ?? 0}};
}

/**
 * Builds the Firestore payment document body.
 * @param {PaymentRecordInput} input Payment record input.
 * @return {object} Firestore payment record.
 */
export function buildPaymentRecord({
  userId,
  orderId,
  paymentId,
  eventId,
  amountInPaise,
  currency,
  status,
  signUpFailed = false,
  inviteLinkId,
  inviteSource,
  crossPathsPairHoldId,
}: PaymentRecordInput) {
  return {
    userId,
    orderId,
    paymentId,
    eventId,
    amount: amountInPaise,
    amountMinor: amountInPaise,
    currency,
    provider: "razorpay" as const,
    status,
    signUpFailed,
    ...(inviteLinkId ? {inviteLinkId} : {}),
    ...(inviteSource ? {inviteSource} : {}),
    ...(crossPathsPairHoldId ? {crossPathsPairHoldId} : {}),
  };
}

/**
 * Reads a required Razorpay order note as a non-empty string.
 * @param {RazorpayOrderNotes|null|undefined} notes Razorpay order notes.
 * @param {string} key Required note key.
 * @return {string} Required note value.
 */
function getRequiredNote(
  notes: RazorpayOrderNotes | null | undefined,
  key: string
): string {
  const rawValue = notes?.[key];
  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    throw new HttpsError(
      "invalid-argument",
      `Order is missing required booking metadata: ${key}.`
    );
  }

  return rawValue;
}

/**
 * Reads an optional non-empty Razorpay order note value.
 * @param {RazorpayOrderNotes|null|undefined} notes Order notes map.
 * @param {string} key Note key to read.
 * @return {string|null} Trimmed note value when present.
 */
function getOptionalNote(
  notes: RazorpayOrderNotes | null | undefined,
  key: string
): string | null {
  const rawValue = notes?.[key];
  if (typeof rawValue !== "string") return null;
  const trimmed = rawValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Parses a positive integer payment amount.
 * @param {number|string} value Raw amount value.
 * @param {string} label Human-readable field label.
 * @return {number} Parsed amount.
 */
function parsePositiveAmount(value: number | string, label: string): number {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new HttpsError(
      "invalid-argument",
      `${label} must be a positive integer.`
    );
  }

  return amount;
}

/**
 * Parses a non-negative integer payment amount.
 * @param {number|string} value Raw amount value.
 * @param {string} label Human-readable field label.
 * @return {number} Parsed amount.
 */
function parseNonNegativeAmount(
  value: number | string,
  label: string
): number {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount < 0) {
    throw new HttpsError(
      "invalid-argument",
      `${label} must be a non-negative integer.`
    );
  }

  return amount;
}

/**
 * Returns whether Razorpay reports any refund state for the payment.
 * @param {RazorpayPaymentSnapshot} payment Razorpay payment snapshot.
 * @return {boolean} Whether the payment has refund evidence.
 */
function hasRefund(payment: RazorpayPaymentSnapshot): boolean {
  const refundedAmount = payment.amount_refunded ?? 0;
  const refundStatus = payment.refund_status;

  return refundedAmount > 0 ||
    (refundStatus !== undefined &&
      refundStatus !== null &&
      refundStatus !== "null");
}
