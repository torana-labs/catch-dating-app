import * as admin from "firebase-admin";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {isOrganizerOwner} from "../shared/organizerHosts";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {
  OrganizerBillDocument,
  OrganizerDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ListOrganizerBillsCallablePayload as Payload} from
  "../shared/generated/listOrganizerBillsCallablePayload";
import type {ListOrganizerBillsCallableResponse as Result} from
  "../shared/generated/listOrganizerBillsCallableResponse";
import {validateListOrganizerBillsCallablePayload} from
  "../shared/generated/validators/listOrganizerBillsInput";
import {validateListOrganizerBillsCallableResponse} from
  "../shared/generated/validators/listOrganizerBillsOutput";
import {organizerBillsCollection} from "./organizerBills";

type Bill = OrganizerBillDocument;
type VisibleStatus = Result["bills"][number]["status"];

export interface OwnBillDeps {
  db: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
}

const defaultDeps: OwnBillDeps = {
  db: () => admin.firestore(),
  checkRateLimit,
};

/**
 * A bill as its organizer sees it, or null while it is not yet sent. Reminders,
 * history and terms revisions stay with Catch's staff.
 * @param {Bill} bill The stored bill.
 * @return {Result["bills"][number]|null} What the organizer may read.
 */
export function ownBillView(bill: Bill): Result["bills"][number] | null {
  if (bill.status === "toSend") return null;
  const status: VisibleStatus = bill.status;
  return {
    billId: bill.billId,
    month: bill.month,
    periodKind: bill.periodKind ?? "calendarMonth",
    periodStartMillis: bill.periodStartMillis,
    periodEndMillis: bill.periodEndMillis,
    plan: bill.plan?.kind ?? "ticketing",
    status,
    sales: {
      paymentCount: bill.sales.paymentCount,
      eventCount: bill.sales.eventCount,
      grossMinor: bill.sales.grossMinor,
      refundedMinor: bill.sales.refundedMinor,
      providerFeeMinor: bill.sales.providerFeeMinor,
    },
    commission: {
      amountMinor: bill.commission.amountMinor,
      capMinor: bill.commission.capMinor,
      capped: bill.commission.capped,
      trialWaivedMinor: bill.commission.trialWaivedMinor,
    },
    gst: {registered: bill.gst.registered, amountMinor: bill.gst.amountMinor},
    totalMinor: bill.totalMinor,
    refundCredit: bill.refundCredit ? {
      appliedMinor: bill.refundCredit.appliedMinor,
      carriedForwardMinor: bill.refundCredit.carriedForwardMinor} : null,
    invoiceNumber: bill.invoiceNumber,
    dueAtMillis: bill.dueAtMillis,
    paymentUrl: status === "sent" ? bill.razorpayInvoice?.url ??
      bill.paymentLink?.url ?? null : null,
    paidAtMillis: bill.paidAtMillis,
    paidMinor: bill.paidMinor,
  };
}

/**
 * The organizer's owner reads Catch's bills to that organizer.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OwnBillDeps} deps Dependencies.
 * @return {Promise<Result>} Bills sent or closed and free months, newest first.
 */
export async function listOrganizerBillsHandler(
  request: CallableRequest<unknown>, deps: OwnBillDeps = defaultDeps):
  Promise<Result> {
  const uid = requireAuth(request);
  const {organizerId} = validateCallableWithAjv<Payload>(request,
    validateListOrganizerBillsCallablePayload);
  const db = deps.db();
  await deps.checkRateLimit(db, uid, "listOrganizerBills",
    {maxRequests: 60, windowMs: 60 * 1000});
  const organizerSnap = await db.collection("organizers").doc(organizerId)
    .get();
  const organizer = organizerSnap.data() as OrganizerDocument | undefined;
  if (!organizer || !isOrganizerOwner(organizer, uid)) {
    throw new HttpsError("permission-denied",
      "Only the organizer's owner can see its bills.");
  }
  const snap = await db.collection(organizerBillsCollection)
    .where("organizerId", "==", organizerId).limit(240).get();
  const bills = snap.docs.map((doc) => ownBillView(doc.data() as Bill))
    .filter((bill) => bill !== null)
    .sort((a, b) => b.periodEndMillis - a.periodEndMillis ||
      b.month.localeCompare(a.month));
  const result: Result = {bills};
  if (!validateListOrganizerBillsCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid bills.");
  }
  return result;
}

export const listOrganizerBills = onCall(appCheckCallableOptions,
  (request) => listOrganizerBillsHandler(request));
