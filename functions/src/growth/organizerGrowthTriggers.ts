import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {onDocumentCreated, onDocumentWritten} from
  "firebase-functions/v2/firestore";
import {
  type GrowthDeps,
  type ObservedMilestones,
  type PaymentFact,
  recordOrganizerMilestones,
  recordOrganizerPayment,
} from "./organizerGrowthFacts";

type Raw = Record<string, unknown> | undefined;

const deps = (): GrowthDeps => ({db: admin.firestore()});

/**
 * Steps an organizer reached in one write of its document: its page was
 * published (listed), a claim became pending, or it gained an owner.
 * @param {Raw} before Organizer before the write.
 * @param {Raw} after Organizer after the write.
 * @param {Timestamp} at When the write happened.
 * @return {ObservedMilestones} Steps reached.
 */
export function organizerMilestones(before: Raw, after: Raw, at: Timestamp):
  ObservedMilestones {
  if (!after) return {};
  // A step seen as the document is created dates from its creation.
  const createdAt = !before && after.createdAt instanceof Timestamp ?
    after.createdAt : at;
  const observed: ObservedMilestones = {};
  if (published(after) && !published(before)) observed.listedAt = createdAt;
  if (claimState(after) === "claimPending" &&
      claimState(before) !== "claimPending") {
    observed.claimRequestedAt = createdAt;
  }
  if (owned(after) && !owned(before)) {
    const claimedAt = (after.ownership as Record<string, unknown>).claimedAt;
    observed.claimedAt = claimedAt instanceof Timestamp ? claimedAt : createdAt;
  }
  return observed;
}

const published = (data: Raw) =>
  (data?.publicPage as Raw)?.publishStatus === "published";
const claimState = (data: Raw) => (data?.claim as Raw)?.state;
const owned = (data: Raw) => ["claimed", "transferred", "userCreated"]
  .includes(String((data?.ownership as Raw)?.state));
const booked = (data: Raw) =>
  data?.status === "signedUp" || data?.status === "attended";

export const onOrganizerGrowthOrganizerWritten = onDocumentWritten({
  document: "organizers/{organizerId}",
}, async (event) => {
  const observed = organizerMilestones(event.data?.before.data(),
    event.data?.after.data(), Timestamp.fromDate(new Date(event.time)));
  await recordOrganizerMilestones(deps(), event.params.organizerId, observed);
});

export const onOrganizerGrowthClaimRequestCreated = onDocumentCreated({
  document: "organizerClaimRequests/{requestId}",
}, async (event) => {
  const request = event.data?.data();
  if (typeof request?.organizerId !== "string") return;
  const at = request.createdAt instanceof Timestamp ? request.createdAt :
    Timestamp.fromDate(new Date(event.time));
  await recordOrganizerMilestones(deps(), request.organizerId,
    {claimRequestedAt: at});
});

/**
 * The first event with a booking: its start time, once any booking, paid or
 * free, lands on an event that is not cancelled.
 */
export const onOrganizerGrowthParticipationWritten = onDocumentWritten({
  document: "eventParticipations/{participationId}",
}, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!booked(after) || booked(before) || typeof after?.eventId !== "string") {
    return;
  }
  const growth = deps();
  const target = (await growth.db.collection("events").doc(after.eventId)
    .get()).data();
  if (!target || target.status === "cancelled" ||
      typeof target.organizerId !== "string" ||
      !(target.startTime instanceof Timestamp)) return;
  await recordOrganizerMilestones(growth, target.organizerId,
    {firstEventAt: target.startTime}, after.eventId);
});

/**
 * A paid booking or refund on a checkout that names its organizer (website
 * and offer checkouts, paid into the organizer's own account).
 * @param {PaymentFact["source"]} source Payment collection.
 * @param {string} paymentId Payment document id.
 * @param {Raw} before Payment before the write.
 * @param {Raw} after Payment after the write.
 * @return {PaymentFact[]} Facts to record.
 */
export function checkoutPaymentFacts(source: PaymentFact["source"],
  paymentId: string, before: Raw, after: Raw): PaymentFact[] {
  if (!after) return [];
  const facts: PaymentFact[] = [];
  const base = {source, paymentId,
    eventId: typeof after.eventId === "string" ? after.eventId : null,
    currency: String(after.currency ?? "INR"), ...fees(after)};
  if (after.capturedAt instanceof Timestamp &&
      !(before?.capturedAt instanceof Timestamp)) {
    facts.push({...base, kind: "paid_booking",
      occurredAt: after.capturedAt.toDate(),
      amountMinor: Number(after.amountPaise)});
  }
  const refunded = Number(after.refundedAmountPaise ?? 0);
  const previously = Number(before?.refundedAmountPaise ?? 0);
  if (refunded > previously) {
    facts.push({...base, kind: "refund", occurredAt: updatedAt(after),
      amountMinor: refunded - previously, feeMinor: null, taxMinor: null});
  }
  return facts;
}

/**
 * A paid booking or refund on a native app payment, which names only its
 * event.
 * @param {string} paymentId Payment document id.
 * @param {Raw} before Payment before the write.
 * @param {Raw} after Payment after the write.
 * @return {PaymentFact[]} Facts to record.
 */
export function nativePaymentFacts(paymentId: string, before: Raw,
  after: Raw): PaymentFact[] {
  if (!after || typeof after.eventId !== "string") return [];
  const base = {source: "payments" as const, paymentId,
    eventId: after.eventId, currency: String(after.currency ?? "INR"),
    amountMinor: Number(after.amountMinor ?? after.amount)};
  const facts: PaymentFact[] = [];
  if (after.status === "completed" && before?.status !== "completed") {
    const at = after.completedAt instanceof Timestamp ? after.completedAt :
      after.createdAt instanceof Timestamp ? after.createdAt : null;
    facts.push({...base, ...fees(after), kind: "paid_booking",
      occurredAt: at?.toDate() ?? updatedAt(after)});
  }
  if (after.status === "refunded" && before?.status !== "refunded") {
    facts.push({...base, kind: "refund", occurredAt: updatedAt(after),
      feeMinor: null, taxMinor: null});
  }
  return facts;
}

function fees(payment: Record<string, unknown>):
  {feeMinor: number | null; taxMinor: number | null} {
  const providerFees = payment.providerFees as Raw;
  return {
    feeMinor: typeof providerFees?.feePaise === "number" ?
      providerFees.feePaise : null,
    taxMinor: typeof providerFees?.taxPaise === "number" ?
      providerFees.taxPaise : null,
  };
}

function updatedAt(payment: Record<string, unknown>): Date {
  return payment.updatedAt instanceof Timestamp ?
    payment.updatedAt.toDate() : new Date();
}

async function recordCheckoutPayments(source: PaymentFact["source"],
  paymentId: string, before: Raw, after: Raw): Promise<void> {
  const organizerId = after?.organizerId;
  if (typeof organizerId !== "string") return;
  for (const fact of checkoutPaymentFacts(source, paymentId, before, after)) {
    await recordOrganizerPayment(deps(), organizerId, fact);
  }
}

export const onOrganizerGrowthPublicPaymentWritten = onDocumentWritten({
  document: "publicEventPayments/{paymentId}",
}, (event) => recordCheckoutPayments("publicEventPayments",
  event.params.paymentId, event.data?.before.data(),
  event.data?.after.data()));

export const onOrganizerGrowthOfferPaymentWritten = onDocumentWritten({
  document: "organizerEventOfferPayments/{paymentId}",
}, (event) => recordCheckoutPayments("organizerEventOfferPayments",
  event.params.paymentId, event.data?.before.data(),
  event.data?.after.data()));

export const onOrganizerGrowthNativePaymentWritten = onDocumentWritten({
  document: "payments/{paymentId}",
}, async (event) => {
  const facts = nativePaymentFacts(event.params.paymentId,
    event.data?.before.data(), event.data?.after.data());
  if (!facts.length) return;
  const growth = deps();
  const target = (await growth.db.collection("events")
    .doc(facts[0].eventId as string).get()).data();
  if (typeof target?.organizerId !== "string") return;
  for (const fact of facts) {
    await recordOrganizerPayment(growth, target.organizerId, fact);
  }
});
