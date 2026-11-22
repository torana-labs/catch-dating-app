import {GUEST_PAYMENTS} from "../../payments/guestPayments";
import {createHash} from "node:crypto";
import {Timestamp} from "firebase-admin/firestore";
import type {PublicEventPaymentDocument as Payment} from
  "../../shared/generated/firestoreAdminTypes";
import {validatePublicEventPaymentDocument} from
  "../../shared/generated/validators/publicEventPaymentDocument";
import {CHECKOUT_HOLD_MILLIS} from "../../events/seatAuthority/seatAuthority";
import {assertPaymentRouteSnapshot} from "../../payments/paymentRouting";
import {registrationUnavailable} from "../../events/publicRegistration/policy";

/**
 * A guest's payment for a public event: its id, ledger parsing and the one
 * place a booking opens it. guestPayments belongs to the payments context;
 * bookings (events/publicRegistration) supplies the booking facts and calls
 * these functions inside its own transaction.
 */
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

/** The places, prices and guest names of a stored booking. Checkouts
 * written before multi-place booking carry none of the place fields and are
 * one place at amountPaise. The booker's place costs unitAmountPaise; each
 * other place costs guestUnitAmountPaise when a member price applied to the
 * party, and unitAmountPaise otherwise. A party names every other place.
 */
export function publicPaymentPlaces(
  p: Pick<Payment, "amountPaise" | "placeCount" | "unitAmountPaise" |
    "memberPlaceCount" | "guestUnitAmountPaise" | "guestNames">,
): {
  placeCount: number;
  unitAmountPaise: number;
  guestUnitAmountPaise: number;
  memberPlaceCount: 0 | 1;
  guestNames: string[];
} {
  const placeCount = p.placeCount ?? 1;
  const unitAmountPaise = p.unitAmountPaise ??
    (placeCount === 1 ? p.amountPaise : NaN);
  const guestUnitAmountPaise = p.guestUnitAmountPaise ?? unitAmountPaise;
  const memberPlaceCount = p.memberPlaceCount ?? 0;
  const guestNames = p.guestNames ?? [];
  if (!Number.isSafeInteger(placeCount) || placeCount < 1 ||
      !Number.isSafeInteger(unitAmountPaise) ||
      (p.memberPlaceCount === undefined) !==
        (p.guestUnitAmountPaise === undefined) ||
      memberPlaceCount === 1 && placeCount < 2 ||
      unitAmountPaise + guestUnitAmountPaise * (placeCount - 1) !==
        p.amountPaise ||
      guestNames.length !== placeCount - 1) {
    registrationUnavailable();
  }
  return {placeCount, unitAmountPaise, guestUnitAmountPaise,
    memberPlaceCount, guestNames};
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
  publicPaymentPlaces(p);
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

/** What a booking knows when it opens a public event payment. */
export type PublicEventPaymentFacts = Omit<Payment, "purpose" | "receipt" |
  "status" | "providerOrderId" | "providerPaymentId" | "providerRefundId" |
  "refundedAmountPaise" | "admissionReceiptId" | "reservationReleased" |
  "leaseUntil" | "createdAt" | "updatedAt" | "capturedAt" | "admittedAt" |
  "checkoutExpiresAt" | "lastErrorCode">;

/**
 * Opens a public event payment in the booking's transaction, after every
 * read: it waits for a provider order and holds its seat for
 * CHECKOUT_HOLD_MILLIS. Returns the stored document.
 */
export function openPublicEventPayment(
  tx: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference,
  facts: PublicEventPaymentFacts,
  nowMillis: number,
): Payment {
  const now = Timestamp.fromMillis(nowMillis);
  const payment: Payment = {
    purpose: "publicEvent",
    ...facts,
    receipt: ref.id,
    status: "creatingOrder",
    providerOrderId: null,
    providerPaymentId: null,
    providerRefundId: null,
    refundedAmountPaise: 0,
    admissionReceiptId: null,
    reservationReleased: false,
    leaseUntil: null,
    createdAt: now,
    updatedAt: now,
    capturedAt: null,
    admittedAt: null,
    checkoutExpiresAt: Timestamp.fromMillis(nowMillis + CHECKOUT_HOLD_MILLIS),
    lastErrorCode: null,
  };
  parsePublicPayment(payment, ref.id);
  tx.create(ref, payment);
  return payment;
}
