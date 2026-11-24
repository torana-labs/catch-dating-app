import {Timestamp} from "firebase-admin/firestore";
import type {PaymentRoutingSnapshot} from "../paymentRouting";

/** Financial state shared by event checkouts. Source-specific ledgers validate
 * their complete persisted contracts before returning this projection.
 * No form response, approval, CRM contact or recipient grant is implied here.
 */
export interface EventPaymentState {
  recipientUid: string;
  routing: PaymentRoutingSnapshot;
  receipt: string;
  amountPaise: number;
  currency: "INR";
  status: "creatingOrder" | "orderUnknown" | "checkoutReady" | "verifying" |
    "captured" | "admitted" | "expired" | "refundPending" | "refunded" |
    "reviewRequired" | "failed" | "cancelled";
  providerOrderId: string | null;
  providerPaymentId: string | null;
  providerRefundId: string | null;
  refundedAmountPaise: number;
  admissionReceiptId: string | null;
  reservationReleased: boolean;
  leaseUntil: FirebaseFirestore.Timestamp | null;
  capturedAt: FirebaseFirestore.Timestamp | null;
  checkoutExpiresAt: FirebaseFirestore.Timestamp;
  lastErrorCode: string | null;
  cancellation?: {refundAmountPaise: number};
  settlement?: EventPaymentSettlement;
  providerFees?: {feePaise: number; taxPaise: number};
}

/** Trusted source adapter. These callbacks own the transactional source,
 * identity, seat and receipt proofs. They never accept client authority.
 * Expiry must release inventory without depending on provider availability.
 */
export interface EventPaymentLedger<P extends EventPaymentState> {
  collection: string;
  parse(raw: unknown, paymentId: string): P;
}

export interface EventPaymentPort<P extends EventPaymentState>
  extends EventPaymentLedger<P> {
  refundIdempotencyKey: string;
  expire(nowMillis: number): Promise<unknown>;
  finalize(nowMillis: number): Promise<unknown>;
  cancelIfEventCancelled(nowMillis: number): Promise<unknown>;
}

export interface EventSeatPaymentState extends EventPaymentState {
  eventId: string;
  organizerId: string;
  canonicalSeatKey: string;
  identityRevision: number;
  migrationRevision: number;
  admittedAt: FirebaseFirestore.Timestamp | null;
  cancellationPolicy?: {
    refundDeadlineMillis: number;
    eventStartsAtMillis: number;
  };
  cancellation?: {
    reason: "eventCancelled" | "guestCancelled";
    requestedAtMillis: number;
    attendeeId: string;
    refundAmountPaise: number;
    seatRetained: boolean;
  };
}

/** Each source proves immutable paid admission in the caller's transaction. */
export type EventPaymentAdmissionReader<P extends EventSeatPaymentState> =
  (input: {db: FirebaseFirestore.Firestore; tx: FirebaseFirestore.Transaction;
    payment: P; paymentId: string}) => Promise<{attendeeId: string}>;

export interface EventPaymentSettlement {
  state: "waiting" | "releasePending" | "released" | "settled" | "blocked" |
    "reviewRequired" | "reversed";
  transferId: string | null;
  nextAttemptAtMillis: number;
  leaseUntilMillis: number;
  leaseId: string | null;
  authorizedAtMillis: number | null;
  completedAtMillis: number | null;
  releasedAtMillis: number | null;
  settledAtMillis: number | null;
}

/**
 * Records, in the fulfilling transaction, that a captured event payment
 * admitted its guest. A Razorpay Route payment then waits to settle to the
 * organizer. guestPayments belongs to payments: bookings and offers call
 * this instead of writing the payment themselves.
 */
export function markEventPaymentAdmitted(
  tx: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference,
  input: {routing: PaymentRoutingSnapshot; admissionReceiptId: string;
    nowMillis: number},
): void {
  const now = Timestamp.fromMillis(input.nowMillis);
  const settlement: EventPaymentSettlement = {state: "waiting",
    transferId: null, nextAttemptAtMillis: input.nowMillis,
    leaseUntilMillis: 0, leaseId: null, authorizedAtMillis: null,
    completedAtMillis: null, releasedAtMillis: null, settledAtMillis: null};
  tx.update(ref, {status: "admitted",
    admissionReceiptId: input.admissionReceiptId, admittedAt: now,
    updatedAt: now, lastErrorCode: null,
    ...(input.routing.selection.route === "razorpayRoute" ?
      {settlement} : {})});
}

/**
 * A captured payment whose held place was already released cannot admit:
 * it waits for a refund instead.
 */
export function markEventPaymentRefundPending(
  tx: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference,
  nowMillis: number,
): void {
  tx.update(ref, {status: "refundPending",
    updatedAt: Timestamp.fromMillis(nowMillis)});
}
