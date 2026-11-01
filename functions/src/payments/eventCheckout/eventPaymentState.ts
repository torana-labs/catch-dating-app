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
