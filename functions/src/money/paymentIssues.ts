import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {Timestamp} from "firebase-admin/firestore";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAdminRole} from "../admin/adminAuth";
import {setAdminAuditLogInTransaction} from "../admin/adminAudit";
import {publicPaymentExecutionFor} from
  "../events/publicRegistration/runtime";
import {offerPaymentExecutionFor} from
  "../payments/offerPayments/offerPaymentRuntime";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {
  MoneyIssueResolutionDocument,
  OrganizerBillDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {AdminManagePaymentIssuesCallablePayload as Payload} from
  "../shared/generated/adminManagePaymentIssuesCallablePayload";
import type {AdminManagePaymentIssuesCallableResponse as Result} from
  "../shared/generated/adminManagePaymentIssuesCallableResponse";
import {validateAdminManagePaymentIssuesCallablePayload} from
  "../shared/generated/validators/adminManagePaymentIssuesInput";
import {validateAdminManagePaymentIssuesCallableResponse} from
  "../shared/generated/validators/adminManagePaymentIssuesOutput";
import {validateMoneyIssueResolutionDocument} from
  "../shared/generated/validators/moneyIssueResolutionDocument";
import {moneyRoles} from "./moneySettings";
import {organizerBillsCollection} from "./organizerBills";

/**
 * Money's issues: a guest paid and has no booking, a refund was asked and
 * not sent, a payment needs review, or an organizer's bill is overdue.
 * Website and offer checkouts can be re-checked with Razorpay at once.
 */
export const issueResolutionsCollection = "moneyIssueResolutions";
type Issue = Result["issues"][number];
type Raw = Record<string, unknown>;
type CheckoutSource = "publicEventPayments" | "organizerEventOfferPayments";

const minute = 60 * 1000;
const checkoutSources: CheckoutSource[] = ["publicEventPayments",
  "organizerEventOfferPayments"];
// A capture the 5-minute sweep has not admitted within 15 minutes, or a
// refund still pending after a day, is waiting on a person.
const capturedGraceMillis = 15 * minute;
const refundGraceMillis = 24 * 60 * minute;

/**
 * The resolution id for an issue id: Firestore-safe and reversible.
 * @param {string} issueId Issue id.
 * @return {string} Document id.
 */
export function resolutionId(issueId: string): string {
  return Buffer.from(issueId).toString("base64url");
}

const millisOf = (value: unknown) => value instanceof Timestamp ?
  value.toMillis() : typeof value === "number" ? value : null;

/**
 * A website or offer checkout as an issue, or null when nothing waits.
 * @param {CheckoutSource} source Collection.
 * @param {string} id Payment id.
 * @param {Raw} data Payment record.
 * @param {number} nowMillis Now.
 * @return {Issue|null} Issue.
 */
export function checkoutIssue(source: CheckoutSource, id: string, data: Raw,
  nowMillis: number): Issue | null {
  const status = String(data.status);
  const updated = millisOf(data.updatedAt) ?? millisOf(data.createdAt) ?? 0;
  const captured = millisOf(data.capturedAt);
  let kind: Issue["kind"];
  let title: string;
  const amount = Number(data.amountPaise) || 0;
  const rupees = `₹${(amount / 100).toLocaleString("en-IN")}`;
  if (status === "captured" && !data.admissionReceiptId && captured !== null &&
      nowMillis - captured >= capturedGraceMillis) {
    kind = "payment";
    title = `${rupees} paid, booking not confirmed`;
  } else if (status === "refundPending" &&
      nowMillis - updated >= refundGraceMillis) {
    kind = "refund";
    title = "Refund asked, not sent";
  } else if (status === "reviewRequired") {
    kind = "review";
    title = `${rupees} payment needs a look`;
  } else {
    return null;
  }
  const guest = typeof data.displayName === "string" ? data.displayName :
    "A guest";
  const event = typeof data.eventName === "string" ? data.eventName :
    typeof data.eventId === "string" ? data.eventId : "an event";
  return {issueId: `${source}:${id}`, kind, source, targetId: id, title,
    subtitle: `${guest} · ${event}`.slice(0, 200),
    organizerId: typeof data.organizerId === "string" ? data.organizerId : null,
    organizerName: null, amountMinor: amount,
    waitingSinceMillis: kind === "payment" ? captured! : updated, status,
    lastErrorCode: typeof data.lastErrorCode === "string" ?
      data.lastErrorCode : null,
    providerPaymentId: typeof data.providerPaymentId === "string" ?
      data.providerPaymentId : null,
    eventId: typeof data.eventId === "string" ? data.eventId : null,
    canConfirmBooking: kind === "payment", resolution: null};
}

/**
 * A native app payment that charged a guest without a booking, or whose
 * refund failed. These came through Catch's own account (now retired) and
 * are handled in Razorpay, then closed here.
 * @param {string} id Payment id.
 * @param {Raw} data Payment record.
 * @return {Issue|null} Issue.
 */
export function nativeIssue(id: string, data: Raw): Issue | null {
  const refundFailed = data.status === "refundFailed";
  if (!refundFailed && data.signUpFailed !== true) return null;
  const amount = Number(data.amountMinor ?? data.amount) || 0;
  return {issueId: `payments:${id}`, kind: refundFailed ? "refund" : "payment",
    source: "payments", targetId: id,
    title: refundFailed ? "Refund failed" :
      `₹${(amount / 100).toLocaleString("en-IN")} paid in the app, ` +
        "no booking",
    subtitle: `App payment · ${String(data.eventId ?? "an event")}`
      .slice(0, 200),
    organizerId: null, organizerName: null, amountMinor: amount,
    waitingSinceMillis: millisOf(data.updatedAt) ??
      millisOf(data.createdAt) ?? 0,
    status: String(data.status), lastErrorCode: null,
    providerPaymentId: typeof data.paymentId === "string" ?
      data.paymentId : id,
    eventId: typeof data.eventId === "string" ? data.eventId : null,
    canConfirmBooking: false, resolution: null};
}

/**
 * An overdue bill as an issue.
 * @param {OrganizerBillDocument} bill Bill.
 * @param {number} nowMillis Now.
 * @return {Issue|null} Issue.
 */
export function billIssue(bill: OrganizerBillDocument, nowMillis: number):
  Issue | null {
  if (bill.status !== "sent" || bill.dueAtMillis === null ||
      bill.dueAtMillis >= nowMillis) return null;
  return {issueId: `organizerBills:${bill.billId}`, kind: "bill",
    source: "organizerBills", targetId: bill.billId,
    title: "Catch bill unpaid",
    subtitle: `${bill.month} · ₹${(bill.totalMinor / 100)
      .toLocaleString("en-IN")} · ${bill.invoiceNumber ?? ""}`.slice(0, 200),
    organizerId: bill.organizerId, organizerName: bill.organizerName,
    amountMinor: bill.totalMinor, waitingSinceMillis: bill.dueAtMillis,
    status: "overdue", lastErrorCode: null, providerPaymentId: null,
    eventId: null, canConfirmBooking: false, resolution: null};
}

/**
 * Every open issue, oldest first, without those already resolved.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {number} nowMillis Now.
 * @return {Promise<Issue[]>} Open issues.
 */
export async function openIssues(db: FirebaseFirestore.Firestore,
  nowMillis: number): Promise<Issue[]> {
  const [checkouts, signUpFailed, refundFailed, bills] = await Promise.all([
    Promise.all(checkoutSources.map(async (source) => (await db
      .collection(source).where("status", "in",
        ["captured", "refundPending", "reviewRequired"]).limit(300).get())
      .docs.map((doc) => checkoutIssue(source, doc.id, doc.data(),
        nowMillis)))),
    db.collection("payments").where("signUpFailed", "==", true).limit(100)
      .get(),
    db.collection("payments").where("status", "==", "refundFailed")
      .limit(100).get(),
    db.collection(organizerBillsCollection).where("status", "==", "sent")
      .limit(1000).get(),
  ]);
  const issues = [...checkouts.flat(),
    ...[...signUpFailed.docs, ...refundFailed.docs].map((doc) =>
      nativeIssue(doc.id, doc.data())),
    ...bills.docs.map((doc) => billIssue(doc.data() as OrganizerBillDocument,
      nowMillis))].filter((issue): issue is Issue => issue !== null);
  const unique = [...new Map(issues.map((issue) =>
    [issue.issueId, issue])).values()];
  const resolutions = unique.length ? await db.getAll(...unique.map((issue) =>
    db.collection(issueResolutionsCollection)
      .doc(resolutionId(issue.issueId)))) : [];
  const resolved = new Map(resolutions.filter((snap) => snap.exists)
    .map((snap) => [snap.get("issueId") as string,
      snap.data() as MoneyIssueResolutionDocument]));
  // A record that moved on after being closed is a new issue.
  const open = unique.filter((issue) =>
    resolved.get(issue.issueId)?.statusAtResolution !== issue.status);
  const organizerIds = [...new Set(open.flatMap((issue) =>
    issue.organizerId && !issue.organizerName ? [issue.organizerId] : []))];
  const organizers = organizerIds.length ? await db.getAll(...organizerIds
    .map((id) => db.collection("organizers").doc(id))) : [];
  const names = new Map(organizers.map((snap) => [snap.id,
    typeof snap.get("name") === "string" ? snap.get("name") as string :
      null]));
  return open.map((issue) => ({...issue, organizerName: issue.organizerName ??
    (issue.organizerId ? names.get(issue.organizerId) ?? null : null)}))
    .sort((a, b) => a.waitingSinceMillis - b.waitingSinceMillis);
}

function counts(issues: Issue[]): Result["counts"] {
  const result = {all: issues.length, payment: 0, refund: 0, review: 0,
    bill: 0};
  for (const issue of issues) result[issue.kind]++;
  return result;
}

/**
 * Re-checks a checkout with Razorpay now; the processor admits the guest
 * when the payment is captured and the seat is still held, or starts the
 * refund when it is not.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {CheckoutSource} source Collection.
 * @param {string} paymentId Payment id.
 * @return {Promise<string>} Status afterwards.
 */
async function reconcileCheckout(db: FirebaseFirestore.Firestore,
  source: CheckoutSource, paymentId: string): Promise<string> {
  const execution = source === "publicEventPayments" ?
    await publicPaymentExecutionFor({db, paymentId}) :
    await offerPaymentExecutionFor({db, paymentId});
  const after = await execution.reconcile();
  return after.status;
}

interface Dependencies {
  db: () => FirebaseFirestore.Firestore;
  now: () => number;
  reconcile: typeof reconcileCheckout;
}
const defaults: Dependencies = {db: () => admin.firestore(), now: Date.now,
  reconcile: reconcileCheckout};

/**
 * The owner reads Money's issues or acts on one.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {Dependencies} deps Dependencies.
 * @return {Promise<Result>} The view after the action.
 */
export async function adminManagePaymentIssuesHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults):
  Promise<Result> {
  const actor = requireAdminRole(request, moneyRoles);
  const data = validateCallableWithAjv<Payload>(request,
    validateAdminManagePaymentIssuesCallablePayload);
  if ((data.action === "list") !== (data.issueId === null)) {
    throw new HttpsError("invalid-argument", "Invalid issue action.");
  }
  const db = deps.db();
  await checkRateLimit(db, actor.uid, "adminManagePaymentIssues",
    {maxRequests: 60, windowMs: 60 * 1000});
  let outcome: Result["outcome"] = null;
  if (data.action !== "list") {
    const issue = (await openIssues(db, deps.now())).find((entry) =>
      entry.issueId === data.issueId);
    if (!issue) {
      throw new HttpsError("failed-precondition",
        "This issue is no longer open. Reload Money.");
    }
    let action: MoneyIssueResolutionDocument["action"] = "closed";
    let statusAfter = issue.status;
    if (data.action === "confirmBooking") {
      if (!issue.canConfirmBooking) {
        throw new HttpsError("failed-precondition",
          "Only a website or offer payment can be confirmed here.");
      }
      try {
        statusAfter = await deps.reconcile(db, issue.source as CheckoutSource,
          issue.targetId);
      } catch (error) {
        logger.warn("Payment issue reconciliation failed.", {
          issueId: issue.issueId,
          error: error instanceof Error ? error.message : String(error)});
        throw new HttpsError("unavailable",
          "Razorpay could not be checked just now. Try again shortly.");
      }
      outcome = {issueId: issue.issueId, statusAfter,
        result: statusAfter === "admitted" ? "admitted" :
          ["refundPending", "refunded"].includes(statusAfter) ? "refunding" :
            "stillWaiting"};
      action = "confirmedBooking";
      if (outcome.result === "stillWaiting") statusAfter = "";
    } else {
      outcome = {issueId: issue.issueId, result: "closed", statusAfter};
    }
    if (statusAfter) {
      const ref = db.collection(issueResolutionsCollection)
        .doc(resolutionId(issue.issueId));
      const resolution: MoneyIssueResolutionDocument = {schemaVersion: 1,
        resolutionId: ref.id, issueId: issue.issueId, kind: issue.kind,
        statusAtResolution: issue.status, action,
        note: data.note?.trim() || null, resolvedAtMillis: deps.now(),
        resolvedByUid: actor.uid, title: issue.title,
        organizerName: issue.organizerName};
      if (!validateMoneyIssueResolutionDocument(resolution)) {
        throw new HttpsError("internal", "Invalid resolution.");
      }
      await db.runTransaction(async (tx) => {
        tx.set(ref, resolution);
        setAdminAuditLogInTransaction(tx, db, actor, {
          action: `adminManagePaymentIssues.${data.action}`,
          targetPath: `${issue.source}/${issue.targetId}`, request,
          before: {status: issue.status}, after: {status: statusAfter},
          note: resolution.note,
          serverTimestamp: () =>
            admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    }
  }
  let issues: Issue[];
  if (data.view === "open") {
    issues = await openIssues(db, deps.now());
  } else {
    const snap = await db.collection(issueResolutionsCollection)
      .orderBy("resolvedAtMillis", "desc").limit(200).get();
    issues = snap.docs.map((doc) => {
      const resolution = doc.data() as MoneyIssueResolutionDocument;
      const [source, ...rest] = resolution.issueId.split(":");
      return {issueId: resolution.issueId, kind: resolution.kind,
        source: source as Issue["source"], targetId: rest.join(":"),
        title: resolution.title, subtitle: resolution.note ?? "",
        organizerId: null, organizerName: resolution.organizerName,
        amountMinor: 0, waitingSinceMillis: resolution.resolvedAtMillis,
        status: resolution.statusAtResolution, lastErrorCode: null,
        providerPaymentId: null, eventId: null, canConfirmBooking: false,
        resolution};
    });
  }
  const result: Result = {view: data.view, issues, counts: counts(issues),
    outcome};
  if (!validateAdminManagePaymentIssuesCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid money issues.");
  }
  return result;
}

export const adminManagePaymentIssues = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 120, maxInstances: 5}),
  (request) => adminManagePaymentIssuesHandler(request));
