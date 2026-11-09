import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {requireAdminRole, type AdminContext} from "../admin/adminAuth";
import {setAdminAuditLogInTransaction} from "../admin/adminAudit";
import {createRazorpayClient, razorpayKeySecret} from "../payments/razorpay";
import {razorpayRuntimeProject} from "../payments/razorpayOrderOwnership";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {
  OrganizerBillDocument,
  OrganizerBillingCycleDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {AdminManageOrganizerBillsCallablePayload as Payload} from
  "../shared/generated/adminManageOrganizerBillsCallablePayload";
import type {AdminManageOrganizerBillsCallableResponse as Result} from
  "../shared/generated/adminManageOrganizerBillsCallableResponse";
import {validateAdminManageOrganizerBillsCallablePayload} from
  "../shared/generated/validators/adminManageOrganizerBillsInput";
import {validateAdminManageOrganizerBillsCallableResponse} from
  "../shared/generated/validators/adminManageOrganizerBillsOutput";
import {validateOrganizerBillDocument} from
  "../shared/generated/validators/organizerBillDocument";
import {cycleBillDueDays} from "./billCycles";
import {dueAtMillis, monthOf} from "./billComputation";
import {razorpayBillInvoices, type BillInvoiceClient} from "./billInvoices";
import {enqueueBillNotice} from "./billNotices";
import {
  razorpayBillPaymentLinks,
  type BillPaymentLinkClient,
} from "./billPaymentLinks";
import {dayMillis} from "./hostTrial";
import {moneyRoles, nextInvoice, readMoneySettings} from "./moneySettings";
import {readOrganizerTrialStatus} from "./organizerBillingStatus";
import {readBillingPlan} from "./organizerBillingPlan";
import {prepareNominatorCredit} from "./nominatorCredits";
import {
  autoSendToleranceMillis,
  checkedPointer,
  generateCycleBills,
  isReviewedCycleBill,
  organizerBillingCyclesCollection,
  regenerateToSendCycleBills,
  staffReviewedCycles,
} from "./organizerCycleBills";

export const organizerBillsCollection = "organizerBills";
const historyLimit = 60;

type Db = FirebaseFirestore.Firestore;
type Bill = OrganizerBillDocument;
type Pointer = OrganizerBillingCycleDocument;
type HistoryAction = Bill["history"][number]["action"];
type BillAction = "send" | "remind" | "markPaid" | "writeOff" | "hold" |
  "releaseHold";
const billActions: readonly string[] = ["send", "remind", "markPaid",
  "writeOff", "hold", "releaseHold"];
const organizerActions: readonly string[] = ["holdOrganizer",
  "releaseOrganizerHold"];
const autoSendNote =
  "Sent automatically: staff reviewed the host's first billing cycles";

export interface BillDeps {
  db: () => Db;
  now: () => number;
  links: () => BillPaymentLinkClient;
  invoices: () => BillInvoiceClient;
  /** Queues the out-of-app notice; tests replace it. */
  notify?: (bill: Bill, kind: "issued" | "reminder") => Promise<void>;
}

export const defaultBillDeps: BillDeps = {
  db: () => admin.firestore(),
  now: Date.now,
  links: () => razorpayBillPaymentLinks(createRazorpayClient(),
    razorpayRuntimeProject()),
  invoices: () => razorpayBillInvoices(createRazorpayClient(),
    razorpayRuntimeProject()),
};

export const billId = (organizerId: string, month: string) =>
  `${organizerId}_${month}`;

function withHistory(bill: Bill, action: HistoryAction, atMillis: number,
  byUid: string | null, note: string | null): Bill["history"] {
  return [...bill.history, {atMillis, action, byUid, note}]
    .slice(-historyLimit);
}

function checked(bill: Bill): Bill {
  const id = bill.billId;
  if (!validateOrganizerBillDocument(bill)) {
    throw new HttpsError("internal", `Bill ${id} is not valid.`);
  }
  return bill;
}

const actionWords: Record<BillAction, string> = {send: "sent",
  remind: "reminded", markPaid: "marked paid", writeOff: "written off",
  hold: "held", releaseHold: "released from its hold"};

/**
 * Applies one action to one bill: a staff member's, or the daily run's
 * automatic send (actor null), which only sends a bill that is due to go
 * out automatically and that neither it nor its organizer holds.
 * @param {BillDeps} deps Dependencies.
 * @param {AdminContext|null} actor Staff member, or null for the daily run.
 * @param {object} data Bill, reviewed revision, action and note.
 * @param {CallableRequest<unknown>|null} request Original request, for audit.
 * @return {Promise<Bill>} The bill after the action.
 */
async function actOnBill(deps: BillDeps, actor: AdminContext | null,
  data: {billId: string; expectedRevision: number; action: BillAction;
    note: string | null},
  request: CallableRequest<unknown> | null): Promise<Bill> {
  const db = deps.db();
  const ref = db.collection(organizerBillsCollection).doc(data.billId);
  const action = data.action;
  const note = actor ? data.note?.trim() || null : autoSendNote;
  const after = await db.runTransaction(async (tx) => {
    const bill = (await tx.get(ref)).data() as Bill | undefined;
    if (!bill) throw new HttpsError("not-found", "Bill not found.");
    if (bill.revision !== data.expectedRevision) {
      throw new HttpsError("aborted", "This bill changed. Review it again.");
    }
    const allowed: Record<BillAction, Bill["status"][]> = {
      send: ["toSend"], remind: ["sent"], markPaid: ["sent"],
      writeOff: ["toSend", "sent"], hold: ["toSend"],
      releaseHold: ["toSend"]};
    if (!allowed[action].includes(bill.status)) {
      throw new HttpsError("failed-precondition",
        `A bill that is ${bill.status} cannot be ${actionWords[action]}.`);
    }
    const now = deps.now();
    if (!actor) {
      // The daily run sends only what is due and not held, rechecked here.
      const pointer = (await tx.get(db.collection(
        organizerBillingCyclesCollection).doc(bill.organizerId))).data() as
        Pointer | undefined;
      if (action !== "send" || bill.periodKind !== "cycle" ||
          bill.sendHold || pointer?.sendHold ||
          bill.autoSendAtMillis === null ||
          bill.autoSendAtMillis === undefined ||
          bill.autoSendAtMillis > now + autoSendToleranceMillis) {
        throw new HttpsError("failed-precondition",
          "This bill is not due to be sent automatically.");
      }
    }
    if (action === "hold" && (bill.sendHold || !bill.autoSendAtMillis)) {
      throw new HttpsError("failed-precondition", bill.sendHold ?
        "This bill is already on hold." :
        "This bill already waits for staff to send it.");
    }
    if (action === "releaseHold" && !bill.sendHold) {
      throw new HttpsError("failed-precondition", "This bill is not on hold.");
    }
    let next: Bill = {...bill, revision: bill.revision + 1,
      updatedAtMillis: now};
    let credit: () => unknown = () => null;
    if (action === "hold") {
      next = {...next, sendHold: {atMillis: now, byUid: actor?.uid ?? null,
        note}};
    } else if (action === "releaseHold") {
      next = {...next, sendHold: null};
    } else if (action === "send") {
      const {settings} = await readMoneySettings(db, tx);
      const invoice = await nextInvoice(db, now, tx);
      tx.set(invoice.ref, {schemaVersion: 1,
        financialYear: invoice.financialYear, lastNumber: invoice.number,
        updatedAtMillis: now});
      next = {...next, status: "sent", sendHold: null,
        invoiceNumber: invoice.label,
        sentAtMillis: now, dueAtMillis: billDueAtMillis(bill, now,
          settings.billDueDayOfMonth)};
    } else if (action === "remind") {
      next = {...next, reminders: [...bill.reminders, now].slice(-24)};
    } else if (action === "markPaid") {
      next = {...next, status: "paid", paidAtMillis: now,
        paidMinor: bill.totalMinor, paidVia: "manual"};
      credit = await prepareNominatorCredit(db, tx, next, now);
    } else {
      next = {...next, status: "writtenOff", writtenOffAtMillis: now};
    }
    const historyAction: Record<BillAction, HistoryAction> = {send: "sent",
      remind: "reminded", markPaid: "paid", writeOff: "writtenOff",
      hold: "held", releaseHold: "holdReleased"};
    next = {...next, history: withHistory(bill, historyAction[action], now,
      actor?.uid ?? null, note)};
    tx.set(ref, checked(next));
    credit();
    if (actor && request) {
      setAdminAuditLogInTransaction(tx, db, actor, {
        action: `adminManageOrganizerBills.${action}`, targetPath: ref.path,
        request, before: {status: bill.status, revision: bill.revision},
        after: {status: next.status, revision: next.revision,
          invoiceNumber: next.invoiceNumber, totalMinor: next.totalMinor},
        note,
        serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    return next;
  });
  let delivered = after;
  if ((action === "send" || action === "remind") && !after.paymentLink &&
      !after.razorpayInvoice && after.totalMinor >= 100) {
    delivered = await attachInvoice(deps, after) ?? after;
  }
  if (action === "send" || action === "remind") {
    await (deps.notify ?? ((bill, kind) => enqueueBillNotice({db: deps.db,
      now: deps.now}, bill, kind)))(delivered,
      action === "send" ? "issued" : "reminder").catch((error) => {
      logger.error("Bill notice was not queued.", {billId: delivered.billId,
        error: error instanceof Error ? error.message : String(error)});
    });
  }
  return delivered;
}

/**
 * When a sent bill falls due. A calendar-month bill is due on the due day of
 * the next month; a cycle bill a fixed number of days after its cycle closes,
 * and never less than a week after it is sent.
 * @param {Bill} bill The bill being sent.
 * @param {number} sentAtMillis When it is sent.
 * @param {number} dueDayOfMonth Money settings' due day for month bills.
 * @return {number} Epoch millis.
 */
export function billDueAtMillis(bill: Bill, sentAtMillis: number,
  dueDayOfMonth: number): number {
  if ((bill.periodKind ?? "calendarMonth") === "calendarMonth") {
    return dueAtMillis(bill.month, dueDayOfMonth);
  }
  return Math.max(bill.periodEndMillis + cycleBillDueDays * dayMillis,
    sentAtMillis + 7 * dayMillis);
}

/**
 * Holds or releases automatic sending for every cycle bill of one organizer.
 * The hold lives on the organizer's cycle pointer, so an organizer not yet
 * billed for a cycle has nothing to hold: its first bills wait for staff.
 * @param {BillDeps} deps Dependencies.
 * @param {AdminContext} actor Staff member.
 * @param {object} data Organizer, hold or release, and note.
 * @param {CallableRequest<unknown>} request Original request, for audit.
 * @return {Promise<void>} Resolves once applied.
 */
async function setOrganizerHold(deps: BillDeps, actor: AdminContext,
  data: {organizerId: string; hold: boolean; note: string | null},
  request: CallableRequest<unknown>): Promise<void> {
  const db = deps.db();
  const ref = db.collection(organizerBillingCyclesCollection)
    .doc(data.organizerId);
  const note = data.note?.trim() || null;
  await db.runTransaction(async (tx) => {
    const pointer = (await tx.get(ref)).data() as Pointer | undefined;
    if (!pointer) {
      throw new HttpsError("failed-precondition",
        "This organizer has not been billed for a cycle yet. Its first " +
        `${staffReviewedCycles} cycle bills wait for staff to send them.`);
    }
    if (data.hold === Boolean(pointer.sendHold)) {
      throw new HttpsError("failed-precondition", data.hold ?
        "This organizer's bills are already on hold." :
        "This organizer's bills are not on hold.");
    }
    const now = deps.now();
    tx.set(ref, checkedPointer({...pointer, sendHold: data.hold ?
      {atMillis: now, byUid: actor.uid, note} : null, updatedAtMillis: now}));
    setAdminAuditLogInTransaction(tx, db, actor, {
      action: `adminManageOrganizerBills.${data.hold ? "holdOrganizer" :
        "releaseOrganizerHold"}`,
      targetPath: ref.path, request,
      before: {sendHold: Boolean(pointer.sendHold)},
      after: {sendHold: data.hold}, note,
      serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
    });
  });
}

/**
 * Sends every cycle bill due to go out automatically: past its automatic
 * send time, not held, and its organizer not held. Each bill is recomputed
 * first, so refunds made since it was made are counted, then sent through
 * the same path as staff's send (invoice number, due date, Razorpay
 * invoice, notices). A bill that fails is left to send on the next run.
 * @param {BillDeps} deps Dependencies.
 * @return {Promise<number>} Bills sent.
 */
export async function sendDueCycleBills(deps: BillDeps): Promise<number> {
  const db = deps.db();
  const now = deps.now();
  const snap = await db.collection(organizerBillsCollection)
    .where("status", "==", "toSend").limit(500).get();
  const due = snap.docs.map((doc) => doc.data() as Bill).filter((bill) =>
    bill.periodKind === "cycle" && !bill.sendHold &&
    typeof bill.autoSendAtMillis === "number" &&
    bill.autoSendAtMillis <= now + autoSendToleranceMillis);
  if (due.length === 0) return 0;
  await regenerateToSendCycleBills(deps, null,
    new Set(due.map((bill) => bill.billId)));
  let sent = 0;
  for (const stale of due) {
    const bill = (await db.collection(organizerBillsCollection)
      .doc(stale.billId).get()).data() as Bill | undefined;
    // Refunds may have left nothing to bill.
    if (!bill || bill.status !== "toSend") continue;
    try {
      await actOnBill(deps, null, {billId: bill.billId,
        expectedRevision: bill.revision, action: "send", note: null}, null);
      sent++;
    } catch (error) {
      logger.warn("Bill was not sent automatically.", {billId: bill.billId,
        error: error instanceof Error ? error.message : String(error)});
    }
  }
  return sent;
}

/**
 * Creates the bill's Razorpay invoice and stores it; when Razorpay refuses
 * the invoice, a payment link instead, so the host can still pay. A failure
 * of both leaves the bill sent with neither; the next reminder tries again.
 * @param {BillDeps} deps Dependencies.
 * @param {Bill} bill A sent bill.
 * @return {Promise<Bill|null>} The bill with its invoice or link, or null.
 */
async function attachInvoice(deps: BillDeps, bill: Bill):
  Promise<Bill | null> {
  let invoice: {invoiceId: string; url: string} | null = null;
  let link: {linkId: string; url: string} | null = null;
  try {
    invoice = await deps.invoices().create(bill);
  } catch (error) {
    logger.warn("Bill invoice was not created; trying a payment link.",
      {billId: bill.billId,
        error: error instanceof Error ? error.message : String(error)});
    try {
      link = await deps.links().create(bill);
    } catch (linkError) {
      logger.warn("Bill payment link was not created.", {billId: bill.billId,
        error: linkError instanceof Error ? linkError.message :
          String(linkError)});
      return null;
    }
  }
  const db = deps.db();
  const ref = db.collection(organizerBillsCollection).doc(bill.billId);
  return db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as Bill | undefined;
    if (!current || current.paymentLink || current.razorpayInvoice ||
        current.status !== "sent") return current ?? null;
    const next = checked({...current,
      ...(invoice ? {razorpayInvoice: invoice} : {paymentLink: link}),
      revision: current.revision + 1, updatedAtMillis: deps.now()});
    tx.set(ref, next);
    return next;
  });
}

/**
 * Marks a bill paid from its Razorpay invoice, once Razorpay says the invoice
 * is paid in full. Ignores invoices made by another environment.
 * @param {BillDeps} deps Dependencies.
 * @param {string} invoiceId Paid invoice.
 * @param {string} projectId This environment's project.
 * @return {Promise<boolean>} Whether a bill was marked paid.
 */
export async function markBillPaidFromInvoice(
  deps: Pick<BillDeps, "db" | "now" | "invoices">, invoiceId: string,
  projectId: string): Promise<boolean> {
  const invoice = await deps.invoices().fetch(invoiceId);
  if (invoice.project !== projectId || !invoice.billId ||
      invoice.status !== "paid") {
    return false;
  }
  const db = deps.db();
  const ref = db.collection(organizerBillsCollection).doc(invoice.billId);
  return db.runTransaction(async (tx) => {
    const bill = (await tx.get(ref)).data() as Bill | undefined;
    if (!bill || bill.status !== "sent" ||
        bill.razorpayInvoice?.invoiceId !== invoiceId ||
        invoice.amountPaid < bill.totalMinor) return false;
    const now = deps.now();
    const next: Bill = {...bill, status: "paid", paidAtMillis: now,
      paidMinor: invoice.amountPaid, paidVia: "invoice",
      revision: bill.revision + 1, updatedAtMillis: now,
      history: withHistory(bill, "paid", now, null, "Paid by invoice")};
    const credit = await prepareNominatorCredit(db, tx, next, now);
    tx.set(ref, checked(next));
    credit();
    return true;
  });
}

/**
 * Marks a bill paid from its Razorpay payment link, once Razorpay says the
 * link is paid in full. Ignores links made by another environment.
 * @param {BillDeps} deps Dependencies.
 * @param {string} linkId Paid payment link.
 * @param {string} projectId This environment's project.
 * @return {Promise<boolean>} Whether a bill was marked paid.
 */
export async function markBillPaidFromLink(
  deps: Pick<BillDeps, "db" | "now" | "links">, linkId: string,
  projectId: string): Promise<boolean> {
  const link = await deps.links().fetch(linkId);
  if (link.project !== projectId || !link.billId || link.status !== "paid") {
    return false;
  }
  const db = deps.db();
  const ref = db.collection(organizerBillsCollection).doc(link.billId);
  return db.runTransaction(async (tx) => {
    const bill = (await tx.get(ref)).data() as Bill | undefined;
    if (!bill || bill.status !== "sent" ||
        bill.paymentLink?.linkId !== linkId ||
        link.amountPaid < bill.totalMinor) return false;
    const now = deps.now();
    const next: Bill = {...bill, status: "paid", paidAtMillis: now,
      paidMinor: link.amountPaid, paidVia: "paymentLink",
      revision: bill.revision + 1, updatedAtMillis: now,
      history: withHistory(bill, "paid", now, null, "Paid by payment link")};
    const credit = await prepareNominatorCredit(db, tx, next, now);
    tx.set(ref, checked(next));
    credit();
    return true;
  });
}

/**
 * Reads a month's bills (cycle bills by the month their cycle ends), or one
 * organizer's bills across months, with
 * totals and counts per state.
 * @param {Db} db Firestore.
 * @param {object} scope The month, or the organizer.
 * @param {number} nowMillis Now, for overdue.
 * @return {Promise<Result>} The bills.
 */
export async function listBills(db: Db,
  scope: {month: string} | {organizerId: string}, nowMillis: number):
  Promise<Result> {
  const snap = await ("month" in scope ?
    db.collection(organizerBillsCollection).where("month", "==", scope.month)
      .limit(1000) :
    db.collection(organizerBillsCollection)
      .where("organizerId", "==", scope.organizerId).limit(240)).get();
  const bills = snap.docs.map((doc) => doc.data() as Bill)
    .sort((a, b) => "month" in scope ?
      b.updatedAtMillis - a.updatedAtMillis : b.month.localeCompare(a.month));
  const counts = {all: bills.length, toSend: 0, sent: 0, overdue: 0, paid: 0,
    writtenOff: 0, free: 0};
  const totals = {salesMinor: 0, billedMinor: 0, paidMinor: 0};
  for (const bill of bills) {
    counts[bill.status]++;
    if (bill.status === "sent" && bill.dueAtMillis !== null &&
        bill.dueAtMillis < nowMillis) counts.overdue++;
    totals.salesMinor += bill.sales.grossMinor - bill.sales.refundedMinor;
    if (bill.status !== "free") totals.billedMinor += bill.totalMinor;
    totals.paidMinor += bill.paidMinor ?? 0;
  }
  const [{settings}, invoice, trial, billingPlan, pointers] =
    await Promise.all([
      readMoneySettings(db), nextInvoice(db, nowMillis),
      "organizerId" in scope ?
        readOrganizerTrialStatus(db, scope.organizerId, nowMillis) : null,
      "organizerId" in scope ?
        readBillingPlan(db, scope.organizerId) : undefined,
      readPointers(db, "organizerId" in scope ? [scope.organizerId] :
        bills.filter((bill) => bill.periodKind === "cycle")
          .map((bill) => bill.organizerId))]);
  const pointer = "organizerId" in scope ?
    pointers.get(scope.organizerId) : undefined;
  return {month: "month" in scope ? scope.month : null,
    organizerId: "organizerId" in scope ? scope.organizerId : null, bills,
    totals, counts, nextInvoiceNumber: invoice.label,
    gstRegistered: settings.gstRegistered, trial,
    billingPlan: billingPlan ?? null,
    billReview: "organizerId" in scope ? {
      reviewedCycles: bills.filter(isReviewedCycleBill).length,
      reviewRequiredCycles: staffReviewedCycles,
      hold: pointer?.sendHold ?? null, canHold: pointer !== undefined} : null,
    heldOrganizerIds: [...pointers.values()]
      .filter((item) => item.sendHold).map((item) => item.organizerId)
      .slice(0, 1000)};
}

/**
 * The cycle pointers of some organizers, for their holds.
 * @param {Db} db Firestore.
 * @param {string[]} organizerIds Organizers.
 * @return {Promise<Map<string, Pointer>>} Pointers that exist, by organizer.
 */
async function readPointers(db: Db, organizerIds: string[]):
  Promise<Map<string, Pointer>> {
  const ids = [...new Set(organizerIds)];
  const result = new Map<string, Pointer>();
  if (ids.length === 0) return result;
  const snaps = await Promise.all(ids.map((id) =>
    db.collection(organizerBillingCyclesCollection).doc(id).get()));
  for (const snap of snaps) {
    if (snap.exists) result.set(snap.id, snap.data() as Pointer);
  }
  return result;
}

/**
 * The owner reads a month's bills or acts on one.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {BillDeps} deps Dependencies.
 * @return {Promise<Result>} The month after the action.
 */
export async function adminManageOrganizerBillsHandler(
  request: CallableRequest<unknown>, deps: BillDeps = defaultBillDeps):
  Promise<Result> {
  const actor = requireAdminRole(request, moneyRoles);
  const data = validateCallableWithAjv<Payload>(request,
    validateAdminManageOrganizerBillsCallablePayload);
  const onBill = billActions.includes(data.action);
  const onOrganizer = organizerActions.includes(data.action);
  if ((onBill ? data.billId === null || data.expectedRevision === null :
    data.billId !== null || data.expectedRevision !== null) ||
      (onOrganizer && (data.organizerId === null || data.month !== null))) {
    throw new HttpsError("invalid-argument", "Invalid bill action.");
  }
  const db = deps.db();
  await checkRateLimit(db, actor.uid, "adminManageOrganizerBills",
    {maxRequests: 60, windowMs: 60 * 1000});
  const now = deps.now();
  if (data.action === "generate" && data.organizerId !== null) {
    throw new HttpsError("invalid-argument",
      "Bills are made for every organizer at once.");
  }
  // Admin's monthly view groups cycle bills by the month their cycle ends.
  let month = data.month ?? monthOf(now);
  if (data.action === "generate") {
    // Rolling cycles (#1126): bill every cycle that has closed and refresh
    // bills not yet sent. Calendar-month bills are no longer made.
    await regenerateToSendCycleBills(deps, actor.uid);
    await generateCycleBills(deps, actor.uid);
  } else if (onOrganizer) {
    await setOrganizerHold(deps, actor, {organizerId: data.organizerId!,
      hold: data.action === "holdOrganizer", note: data.note}, request);
  } else if (onBill) {
    month = (await actOnBill(deps, actor, {billId: data.billId!,
      expectedRevision: data.expectedRevision!,
      action: data.action as BillAction, note: data.note}, request)).month;
  }
  const result = await listBills(db, data.organizerId !== null ?
    {organizerId: data.organizerId} : {month}, now);
  if (!validateAdminManageOrganizerBillsCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid bills.");
  }
  return result;
}

export const adminManageOrganizerBills = onCall(
  appCheckCallableOptionsWithSecrets([razorpayKeySecret],
    {timeoutSeconds: 300, maxInstances: 5}),
  (request) => adminManageOrganizerBillsHandler(request));

/**
 * Once a day, India time: every cycle that closed is billed in arrears, then
 * every cycle bill due to go out automatically is sent. Until staff have sent
 * two of a host's cycle bills, its bills wait for staff instead.
 */
export const generateOrganizerCycleBillsDaily = onSchedule({
  schedule: "15 6 * * *", timeZone: "Asia/Kolkata", timeoutSeconds: 540,
  maxInstances: 1, secrets: [razorpayKeySecret],
}, async () => {
  const written = await generateCycleBills(defaultBillDeps, null);
  const sent = await sendDueCycleBills(defaultBillDeps);
  logger.info("Organizer cycle bills made and sent.", {written, sent});
});
