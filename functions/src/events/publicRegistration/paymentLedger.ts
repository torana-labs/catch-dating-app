import {GUEST_PAYMENTS} from "../../payments/guestPayments";
import {createHash} from "node:crypto";
import type {PublicEventPaymentDocument as Payment} from
  "../../shared/generated/firestoreAdminTypes";
import {validatePublicEventPaymentDocument} from
  "../../shared/generated/validators/publicEventPaymentDocument";
import {CHECKOUT_HOLD_MILLIS} from "../seatAuthority/seatAuthority";
import {assertPaymentRouteSnapshot} from "../../payments/paymentRouting";
import {registrationUnavailable} from "./policy";

export const PUBLIC_PAYMENT_COLLECTION = GUEST_PAYMENTS;
export const PUBLIC_ADMISSION_COLLECTION = "publicEventAdmissionReceipts";
export function publicPaymentId(
  eventId: string,
  uid: string,
  requestId: string,
): string {
  if (
    ![eventId, uid].every((id) =>
      /^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/u.test(id),
    ) ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{7,119}$/u.test(requestId)
  ) {
    registrationUnavailable();
  }
  return (
    "pp_" +
    createHash("sha256")
      .update(JSON.stringify([eventId, uid, requestId]))
      .digest("hex")
      .slice(0, 32)
  );
}
export function publicAdmissionId(paymentId: string): string {
  if (!/^pp_[a-f0-9]{32}$/u.test(paymentId)) registrationUnavailable();
  return `public_paid_${paymentId}`;
}

export function parsePublicPayment(
  raw: unknown,
  paymentId: string,
): Payment {
  if (!validatePublicEventPaymentDocument(raw)) registrationUnavailable();
  const p = raw as unknown as Payment;
  if (
    publicPaymentId(p.eventId, p.recipientUid, p.requestId) !== paymentId ||
    p.receipt !== paymentId ||
    p.refundedAmountPaise > p.amountPaise ||
    p.checkoutExpiresAt.toMillis() - p.createdAt.toMillis() !==
      CHECKOUT_HOLD_MILLIS ||
    p.cancellationPolicy.refundDeadlineMillis >
      p.cancellationPolicy.eventStartsAtMillis ||
    p.cancellationPolicy.eventStartsAtMillis <= p.createdAt.toMillis() ||
    (p.admissionReceiptId !== null &&
      p.admissionReceiptId !== publicAdmissionId(paymentId)) ||
    (p.status === "admitted" && !p.admissionReceiptId) ||
    (p.status === "cancelled" && !p.cancellation)
  ) {
    registrationUnavailable();
  }
  if (
    p.cancellation &&
    (!p.admissionReceiptId ||
      !p.reservationReleased ||
      p.cancellation.attendeeId !== p.attendeeId ||
      ![0, p.amountPaise].includes(p.cancellation.refundAmountPaise) ||
      (p.cancellation.reason === "eventCancelled" &&
        p.cancellation.refundAmountPaise !== p.amountPaise) ||
      (p.cancellation.refundAmountPaise === 0 &&
        !["cancelled", "reviewRequired"].includes(p.status)) ||
      (p.status === "cancelled" &&
        p.cancellation.refundAmountPaise !== 0) ||
      ![
        "cancelled",
        "refundPending",
        "refunded",
        "reviewRequired",
      ].includes(p.status))
  ) {
    registrationUnavailable();
  }
  assertPaymentRouteSnapshot(p.routing, {
    organizerId: p.organizerId,
    purpose: "eventAdmission",
    currency: p.currency,
    amountMinor: p.amountPaise,
  });
  return p;
}
export const publicPaymentLedger = {
  collection: PUBLIC_PAYMENT_COLLECTION,
  parse: parsePublicPayment,
};
