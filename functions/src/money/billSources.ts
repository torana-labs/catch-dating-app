import {Timestamp} from "firebase-admin/firestore";
import {moneyFlowForRoute, type CommercialTermsSnapshot} from
  "../commercialTerms/terms";
import type {BillablePayment} from "./billComputation";

/**
 * Reads one month's payments into organizers' own accounts, grouped by
 * organizer: website and offer ticket checkouts, form fees and membership
 * charges. Native app payments were collected by Catch and are not billed.
 */
type Raw = Record<string, unknown>;
const pageSize = 500;

const checkoutSources = [
  {collection: "publicEventPayments", purpose: "eventAdmission"},
  {collection: "organizerEventOfferPayments", purpose: "eventAdmission"},
  {collection: "organizerFormPayments", purpose: "formFee"},
] as const;

/**
 * A captured checkout as a billable payment.
 * @param {Raw} data Payment document.
 * @param {string} purpose Commercial terms purpose.
 * @return {object|null} Organizer and payment, or null when unusable.
 */
export function checkoutBillable(data: Raw,
  purpose: BillablePayment["purpose"]):
  {organizerId: string; payment: BillablePayment} | null {
  if (typeof data.organizerId !== "string" ||
      !(data.capturedAt instanceof Timestamp)) return null;
  const routing = data.routing as Raw | undefined;
  const route = (routing?.selection as Raw | undefined)?.route;
  // A form fee before routing snapshots always went to the organizer's own
  // connected account.
  const moneyFlow = typeof route === "string" ? moneyFlowForRoute(route) :
    purpose === "formFee" && typeof data.connectionId === "string" ?
      "hostCollected" : null;
  const fees = data.providerFees as Raw | undefined;
  return {organizerId: data.organizerId, payment: {purpose, moneyFlow,
    amountMinor: Number(data.amountPaise) || 0,
    refundedMinor: Number(data.refundedAmountPaise) || 0,
    capturedAtMillis: data.capturedAt.toMillis(),
    eventId: typeof data.eventId === "string" ? data.eventId : null,
    providerFeeMinor: Number(fees?.feePaise) || 0,
    providerTaxMinor: Number(fees?.taxPaise) || 0,
    snapshot: (routing?.commercialTerms as CommercialTermsSnapshot |
      undefined) ?? null}};
}

/**
 * A membership charge as a billable payment.
 * @param {Raw} data hostMembershipCharges document.
 * @return {object|null} Organizer and payment, or null when unusable.
 */
export function membershipBillable(data: Raw):
  {organizerId: string; payment: BillablePayment} | null {
  if (typeof data.organizerId !== "string" ||
      typeof data.createdAtMillis !== "number") return null;
  const flow = data.moneyFlow;
  return {organizerId: data.organizerId, payment: {purpose: "hostMembership",
    moneyFlow: flow === "hostCollected" || flow === "platformSplit" ?
      flow : null,
    amountMinor: Number(data.amountPaise) || 0, refundedMinor: 0,
    capturedAtMillis: data.createdAtMillis, eventId: null,
    providerFeeMinor: 0, providerTaxMinor: 0,
    snapshot: (data.commercialTerms as CommercialTermsSnapshot | undefined) ??
      null}};
}

/**
 * Every payment captured in a window, grouped by organizer.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {number} startMillis Window start, inclusive.
 * @param {number} endMillis Window end, exclusive.
 * @return {Promise<Map<string, BillablePayment[]>>} Payments by organizer.
 */
export async function billablePaymentsByOrganizer(
  db: FirebaseFirestore.Firestore, startMillis: number, endMillis: number):
  Promise<Map<string, BillablePayment[]>> {
  const byOrganizer = new Map<string, BillablePayment[]>();
  const add = (entry: {organizerId: string; payment: BillablePayment} |
    null) => {
    if (!entry) return;
    const list = byOrganizer.get(entry.organizerId) ?? [];
    list.push(entry.payment);
    byOrganizer.set(entry.organizerId, list);
  };
  for (const source of checkoutSources) {
    await page(db.collection(source.collection)
      .where("capturedAt", ">=", Timestamp.fromMillis(startMillis))
      .where("capturedAt", "<", Timestamp.fromMillis(endMillis))
      .orderBy("capturedAt"), (data) => add(checkoutBillable(data,
      source.purpose)));
  }
  await page(db.collection("hostMembershipCharges")
    .where("createdAtMillis", ">=", startMillis)
    .where("createdAtMillis", "<", endMillis)
    .orderBy("createdAtMillis"), (data) => add(membershipBillable(data)));
  return byOrganizer;
}

async function page(query: FirebaseFirestore.Query, visit: (data: Raw) =>
  void): Promise<void> {
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  for (;;) {
    const snap: FirebaseFirestore.QuerySnapshot = await (cursor ?
      query.startAfter(cursor) : query).limit(pageSize).get();
    for (const doc of snap.docs) visit(doc.data());
    if (snap.size < pageSize) return;
    cursor = snap.docs[snap.docs.length - 1];
  }
}
