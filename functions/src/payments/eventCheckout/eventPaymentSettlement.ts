import {randomBytes} from "node:crypto";
import type {EventSeatPaymentState, EventPaymentLedger,
  EventPaymentAdmissionReader, EventPaymentSettlement} from
  "./eventPaymentState";
import {validateEventAttendeeDocument} from
  "../../shared/generated/validators/eventAttendeeDocument";
import {validateEventSuccessPlanDocument} from
  "../../shared/generated/validators/eventSuccessPlanDocument";
import {paymentRoutingSnapshotsMatch} from "../paymentRouting";
import {RazorpayRouteProvider, type RouteTransferSettlement} from
  "../formPayments/razorpayRouteProvider";
import {eventPaymentProviderFor} from "./eventPaymentRuntime";

type Settlement = EventPaymentSettlement;
export type EventSettlementBinding = {
  inspect(): Promise<RouteTransferSettlement>;
  release(transferId: string): Promise<RouteTransferSettlement>;
};
const retryMillis = 15 * 60_000;
const waitingMillis = 6 * 3600_000;

async function bindingFor(input: {
  db: FirebaseFirestore.Firestore; paymentId: string;
  payment: EventSeatPaymentState;
}): Promise<EventSettlementBinding> {
  const runtime = await eventPaymentProviderFor({db: input.db,
    ...input.payment});
  if (!(runtime.provider instanceof RazorpayRouteProvider) ||
      !paymentRoutingSnapshotsMatch(runtime.routing, input.payment.routing)) {
    throw new Error("Settlement route is unavailable.");
  }
  const {provider} = runtime;
  const {authorizationHandle} = await runtime.authority.resolve();
  const {payment} = input;
  const terms = {orderId: payment.providerOrderId!,
    paymentId: payment.providerPaymentId!, receipt: payment.receipt};
  return {
    inspect: () => provider.inspectSettlement(authorizationHandle, terms),
    release: (transferId) => provider.releaseSettlement(authorizationHandle,
      {...terms, transferId}),
  };
}

/** The same transaction reads completion, cancellation and financial proof.
 * A complete plan alone cannot release funds before the scheduled event end.
 * Source application withdrawal after admission does not erase paid history.
 */
async function completedEvent<P extends EventSeatPaymentState>(input: {
  readAdmission: EventPaymentAdmissionReader<P>;
  db: FirebaseFirestore.Firestore; tx: FirebaseFirestore.Transaction;
  payment: P; paymentId: string; nowMillis: number;
}): Promise<number | null> {
  const {db, tx, payment, paymentId, nowMillis} = input;
  const {eventId, organizerId} = payment;
  const cancelledWithoutRefund = payment.status === "cancelled" &&
    payment.cancellation?.reason === "guestCancelled" &&
    payment.cancellation.refundAmountPaise === 0;
  if (payment.status !== "admitted" && !cancelledWithoutRefund ||
    !payment.admissionReceiptId ||
      !payment.providerOrderId || !payment.providerPaymentId ||
      !payment.capturedAt || !payment.admittedAt ||
      payment.refundedAmountPaise !== 0 ||
      payment.reservationReleased && !cancelledWithoutRefund ||
      payment.routing.selection.route !== "razorpayRoute" ||
      payment.routing.settlementHold !== true) return null;
  const [eventSnap, planSnap, receipt] = await Promise.all([
    tx.get(db.collection("events").doc(eventId)),
    tx.get(db.collection("eventSuccessPlans").doc(eventId)),
    input.readAdmission({db, tx, payment, paymentId}),
  ]);
  // A cancelled no-refund charge is historical financial authority. A later
  // registration may reuse its roster row without erasing the original charge.
  const attendee = (await tx.get(db.collection("eventAttendees")
    .doc(receipt.attendeeId))).data();
  const event = eventSnap.data();
  const plan = planSnap.data();
  const end = millis(event?.endTime);
  const completed = millis(plan?.completedAt);
  if (!event || event.status !== "active" ||
      (event.organizerId) !== organizerId ||
      !Number.isSafeInteger(end) || end <= 0 || end > nowMillis ||
      !validateEventSuccessPlanDocument(plan) || plan.eventId !== eventId ||
      plan.organizerId !== event.organizerId ||
      (plan.organizerId) !== organizerId ||
      plan.status !== "complete" || !plan.liveControlRevision ||
      !Number.isSafeInteger(completed) || completed <= 0 ||
      completed < payment.admittedAt.toMillis() || completed > nowMillis ||
      (cancelledWithoutRefund ?
        payment.cancellation?.attendeeId !== receipt.attendeeId :
        !validateEventAttendeeDocument(attendee) ||
        attendee.eventId !== eventId || attendee.organizerId !== organizerId ||
        attendee.linkedUid !== payment.recipientUid ||
        !["registered", "checkedIn"].includes(attendee.status) ||
        attendee.revenueOrderReference !== payment.providerOrderId ||
        attendee.revenueAmountMinor !== payment.amountPaise)) return null;
  return completed;
}

function millis(value: unknown): number {
  if (!value || typeof value !== "object" || !("toMillis" in value) ||
      typeof value.toMillis !== "function") return NaN;
  const result: unknown = value.toMillis();
  return typeof result === "number" ? result : NaN;
}

/** Durable authorization precedes PATCH. An uncertain attempt is read back
 * even if the event is now cancelled; it is never blindly released again.
 * This records provider settlement, never a claim of bank receipt.
 */
export async function reconcileEventPaymentSettlement<
  P extends EventSeatPaymentState>(input: {
  ledger: EventPaymentLedger<P>;
  readAdmission: EventPaymentAdmissionReader<P>;
  db: FirebaseFirestore.Firestore; paymentId: string;
}, deps: {now: () => number; binding: typeof bindingFor} = {
  now: Date.now, binding: bindingFor,
}): Promise<void> {
  const {db, paymentId} = input;
  const ref = db.collection(input.ledger.collection).doc(paymentId);
  const leaseId = randomBytes(16).toString("hex");
  const claim = await db.runTransaction(async (tx) => {
    const payment = input.ledger.parse((await tx.get(ref)).data(),
      paymentId);
    const saved = payment.settlement;
    const now = deps.now();
    if (!saved || saved.state === "settled" || saved.state === "reversed" ||
        saved.state === "reviewRequired" || saved.leaseUntilMillis > now ||
        payment.leaseUntil && payment.leaseUntil.toMillis() > now ||
        saved.nextAttemptAtMillis > now) return null;
    const completed = await completedEvent({db, tx, payment, paymentId,
      readAdmission: input.readAdmission,
      nowMillis: now});
    // Without a release intent there is no uncertain side effect to recover.
    if (completed === null && !saved.authorizedAtMillis) {
      tx.update(ref, {settlement: {...saved,
        nextAttemptAtMillis: now + waitingMillis}});
      return null;
    }
    const settlement: Settlement = {...saved,
      leaseId, leaseUntilMillis: now + 120_000,
      nextAttemptAtMillis: now + retryMillis};
    tx.update(ref, {settlement});
    return {payment, settlement};
  });
  if (!claim) return;
  const assertBound = (payment: P) => {
    if (!paymentRoutingSnapshotsMatch(payment.routing, claim.payment.routing) ||
        payment.providerOrderId !== claim.payment.providerOrderId ||
        payment.providerPaymentId !== claim.payment.providerPaymentId) {
      throw new Error("Settlement payment binding changed.");
    }
  };
  try {
    const binding = await deps.binding({...input, payment: claim.payment});
    let observed = await binding.inspect();
    if (observed.orderId !== claim.payment.providerOrderId) {
      throw new Error("Settlement order changed.");
    }
    const transferMatches = claim.settlement.transferId === null ||
      claim.settlement.transferId === observed.transferId;
    if (!transferMatches) throw new Error("Settlement transfer changed.");
    if (observed.onHold) {
      const authorized = await db.runTransaction(async (tx) => {
        const payment = input.ledger.parse((await tx.get(ref)).data(),
          paymentId);
        assertBound(payment);
        const current = payment.settlement!;
        const now = deps.now();
        if (current.leaseId !== leaseId || current.leaseUntilMillis <= now) {
          return false;
        }
        const completed = await completedEvent({db, tx, payment, paymentId,
          readAdmission: input.readAdmission,
          nowMillis: now});
        if (completed === null) {
          tx.update(ref, {settlement: {...current, state: "blocked",
            leaseId: null, leaseUntilMillis: 0,
            nextAttemptAtMillis: now + waitingMillis}});
          return false;
        }
        tx.update(ref, {settlement: {...current, state: "releasePending",
          leaseUntilMillis: now + 180_000,
          transferId: observed.transferId,
          authorizedAtMillis: current.authorizedAtMillis ?? now,
          completedAtMillis: completed}});
        return true;
      });
      if (!authorized) return;
      observed = await binding.release(observed.transferId);
      if (observed.orderId !== claim.payment.providerOrderId) {
        throw new Error("Settlement order changed.");
      }
    }
    await db.runTransaction(async (tx) => {
      const payment = input.ledger.parse((await tx.get(ref)).data(),
        paymentId);
      assertBound(payment);
      const current = payment.settlement!;
      if (current.leaseId !== leaseId) return;
      if (current.state === "reversed") {
        tx.update(ref, {settlement: {...current, leaseId: null,
          leaseUntilMillis: 0}});
        return;
      }
      const now = deps.now();
      // Release without Catch's durable intent needs review.
      const reviewed = !current.authorizedAtMillis || observed.onHold ||
        current.transferId !== observed.transferId;
      const settled = observed.settlementStatus === "settled";
      tx.update(ref, {settlement: {...current,
        state: reviewed ? "reviewRequired" : settled ? "settled" : "released",
        leaseId: null, leaseUntilMillis: 0,
        nextAttemptAtMillis: now + waitingMillis,
        releasedAtMillis: reviewed ? current.releasedAtMillis :
          current.releasedAtMillis ?? now,
        settledAtMillis: !reviewed && settled ? now :
          current.settledAtMillis}});
    });
  } catch (error) {
    await db.runTransaction(async (tx) => {
      const payment = input.ledger.parse((await tx.get(ref)).data(),
        paymentId);
      if (payment.settlement?.leaseId !== leaseId) return;
      tx.update(ref, {settlement: {...payment.settlement,
        leaseId: null, leaseUntilMillis: 0,
        nextAttemptAtMillis: deps.now() + retryMillis}});
    });
    throw error;
  }
}
