import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {requireAdminRole, type AdminContext} from "../admin/adminAuth";
import {setAdminAuditLogInTransaction} from "../admin/adminAudit";
import {effectiveCommercialTerms, readCommercialTerms} from
  "../commercialTerms/resolver";
import {growthFactsCollection} from "../growth/organizerGrowthFacts";
import {createRazorpayClient, razorpayKeySecret} from "../payments/razorpay";
import {razorpayRuntimeProject} from "../payments/razorpayOrderOwnership";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {
  OrganizerBillDocument,
  OrganizerGrowthFactsDocument,
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
import {
  computeBill,
  dueAtMillis,
  monthOf,
  monthWindow,
  previousMonth,
} from "./billComputation";
import {billablePaymentsByOrganizer} from "./billSources";
import {
  razorpayBillPaymentLinks,
  type BillPaymentLinkClient,
} from "./billPaymentLinks";
import {moneyRoles, nextInvoice, readMoneySettings} from "./moneySettings";
import {prepareNominatorCredit} from "./nominatorCredits";

export const organizerBillsCollection = "organizerBills";
const dayMillis = 24 * 60 * 60 * 1000;
const historyLimit = 60;

type Db = FirebaseFirestore.Firestore;
type Bill = OrganizerBillDocument;
type HistoryAction = Bill["history"][number]["action"];

export interface BillDeps {
  db: () => Db;
  now: () => number;
  links: () => BillPaymentLinkClient;
}

export const defaultBillDeps: BillDeps = {
  db: () => admin.firestore(),
  now: Date.now,
  links: () => razorpayBillPaymentLinks(createRazorpayClient(),
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

/**
 * Makes (or remakes) a month's bills from its bookings. A bill already sent,
 * paid or written off is kept as it is; a bill to send or a free month is
 * recomputed. Organizers with nothing billable get no bill.
 * @param {BillDeps} deps Dependencies.
 * @param {string} month YYYY-MM.
 * @param {string|null} actorUid Staff member, or null for the schedule.
 * @return {Promise<number>} Bills written.
 */
export async function generateMonthBills(deps: Pick<BillDeps, "db" | "now">,
  month: string, actorUid: string | null): Promise<number> {
  const db = deps.db();
  const {startMillis, endMillis} = monthWindow(month);
  const byOrganizer = await billablePaymentsByOrganizer(db, startMillis,
    endMillis);
  const {settings} = await readMoneySettings(db);
  let written = 0;
  for (const [organizerId, payments] of byOrganizer) {
    const stored = await readCommercialTerms({db, organizerId});
    const terms = effectiveCommercialTerms(stored);
    if (!terms || !stored.platform) {
      throw new HttpsError("failed-precondition",
        "Set Catch's platform terms before making bills.");
    }
    const [factsSnap, organizerSnap] = await Promise.all([
      db.collection(growthFactsCollection).doc(organizerId).get(),
      db.collection("organizers").doc(organizerId).get()]);
    const facts = factsSnap.data() as OrganizerGrowthFactsDocument |
      undefined;
    // The free trial starts at the organizer's first event; a paid booking
    // with no recorded event dates it instead.
    const anchor = facts?.milestones.firstEventAt?.toMillis() ??
      facts?.milestones.firstPaidBookingAt?.toMillis() ??
      Math.min(...payments.map((payment) => payment.capturedAtMillis));
    const figures = computeBill({payments, terms,
      trialEndsAtMillis: terms.trial.days > 0 ?
        anchor + terms.trial.days * dayMillis : null,
      gstRegistered: settings.gstRegistered,
      gstRateBasisPoints: settings.gstRateBasisPoints});
    if (figures.totalMinor === 0 && figures.commission.trialWaivedMinor === 0) {
      continue;
    }
    const id = billId(organizerId, month);
    const ref = db.collection(organizerBillsCollection).doc(id);
    const changed = await db.runTransaction(async (tx) => {
      const current = (await tx.get(ref)).data() as Bill | undefined;
      if (current && !["toSend", "free"].includes(current.status)) return false;
      const now = deps.now();
      const base: Bill = current ?? {schemaVersion: 1, billId: id,
        organizerId, organizerName: "", month, periodStartMillis: startMillis,
        periodEndMillis: endMillis, revision: 0, status: "toSend",
        ...figures, terms: {platformRevision: 0, organizerRevision: 0,
          ownTerms: false},
        invoiceNumber: null, dueAtMillis: null, paymentLink: null,
        sentAtMillis: null, reminders: [], paidAtMillis: null,
        paidMinor: null, paidVia: null, writtenOffAtMillis: null,
        history: [], generatedAtMillis: now, updatedAtMillis: now};
      const next: Bill = {...base, ...figures,
        organizerName: String(organizerSnap.data()?.name ?? organizerId)
          .slice(0, 160),
        revision: base.revision + 1,
        status: figures.totalMinor > 0 ? "toSend" : "free",
        terms: {platformRevision: stored.platform!.revision,
          organizerRevision: stored.organizer?.revision ?? 0,
          ownTerms: stored.organizer !== null},
        history: withHistory(base, current ? "regenerated" : "generated", now,
          actorUid, null),
        generatedAtMillis: now, updatedAtMillis: now};
      tx.set(ref, checked(next));
      return true;
    });
    if (changed) written++;
  }
  return written;
}

/**
 * Applies one owner action to one bill.
 * @param {BillDeps} deps Dependencies.
 * @param {AdminContext} actor Staff member.
 * @param {Payload} data Validated request.
 * @param {CallableRequest<unknown>} request Original request, for audit.
 * @return {Promise<void>} Resolves once applied.
 */
async function actOnBill(deps: BillDeps, actor: AdminContext, data: Payload,
  request: CallableRequest<unknown>): Promise<void> {
  const db = deps.db();
  const ref = db.collection(organizerBillsCollection).doc(data.billId!);
  const action = data.action as "send" | "remind" | "markPaid" | "writeOff";
  const note = data.note?.trim() || null;
  const after = await db.runTransaction(async (tx) => {
    const bill = (await tx.get(ref)).data() as Bill | undefined;
    if (!bill) throw new HttpsError("not-found", "Bill not found.");
    if (bill.revision !== data.expectedRevision) {
      throw new HttpsError("aborted", "This bill changed. Review it again.");
    }
    const allowed: Record<typeof action, Bill["status"][]> = {
      send: ["toSend"], remind: ["sent"], markPaid: ["sent"],
      writeOff: ["toSend", "sent"]};
    if (!allowed[action].includes(bill.status)) {
      throw new HttpsError("failed-precondition",
        `A bill that is ${bill.status} cannot be ${action === "markPaid" ?
          "marked paid" : action === "writeOff" ? "written off" :
            action === "send" ? "sent" : "reminded"}.`);
    }
    const now = deps.now();
    let next: Bill = {...bill, revision: bill.revision + 1,
      updatedAtMillis: now};
    let credit: () => unknown = () => null;
    if (action === "send") {
      const {settings} = await readMoneySettings(db, tx);
      const invoice = await nextInvoice(db, now, tx);
      tx.set(invoice.ref, {schemaVersion: 1,
        financialYear: invoice.financialYear, lastNumber: invoice.number,
        updatedAtMillis: now});
      next = {...next, status: "sent", invoiceNumber: invoice.label,
        sentAtMillis: now,
        dueAtMillis: dueAtMillis(bill.month, settings.billDueDayOfMonth)};
    } else if (action === "remind") {
      next = {...next, reminders: [...bill.reminders, now].slice(-24)};
    } else if (action === "markPaid") {
      next = {...next, status: "paid", paidAtMillis: now,
        paidMinor: bill.totalMinor, paidVia: "manual"};
      credit = await prepareNominatorCredit(db, tx, next, now);
    } else {
      next = {...next, status: "writtenOff", writtenOffAtMillis: now};
    }
    next = {...next, history: withHistory(bill, action === "send" ? "sent" :
      action === "remind" ? "reminded" : action === "markPaid" ? "paid" :
        "writtenOff", now, actor.uid, note)};
    tx.set(ref, checked(next));
    credit();
    setAdminAuditLogInTransaction(tx, db, actor, {
      action: `adminManageOrganizerBills.${action}`, targetPath: ref.path,
      request, before: {status: bill.status, revision: bill.revision},
      after: {status: next.status, revision: next.revision,
        invoiceNumber: next.invoiceNumber, totalMinor: next.totalMinor},
      note,
      serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
    });
    return next;
  });
  if ((action === "send" || action === "remind") && !after.paymentLink &&
      after.totalMinor >= 100) {
    await attachPaymentLink(deps, after);
  }
}

/**
 * Creates the bill's payment link and stores it. A failure leaves the bill
 * sent without a link; the next reminder tries again.
 * @param {BillDeps} deps Dependencies.
 * @param {Bill} bill A sent bill.
 * @return {Promise<void>} Resolves once attempted.
 */
async function attachPaymentLink(deps: BillDeps, bill: Bill): Promise<void> {
  let link: {linkId: string; url: string};
  try {
    link = await deps.links().create(bill);
  } catch (error) {
    logger.warn("Bill payment link was not created.", {billId: bill.billId,
      error: error instanceof Error ? error.message : String(error)});
    return;
  }
  const db = deps.db();
  const ref = db.collection(organizerBillsCollection).doc(bill.billId);
  await db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as Bill | undefined;
    if (!current || current.paymentLink || current.status !== "sent") return;
    tx.set(ref, checked({...current, paymentLink: link,
      revision: current.revision + 1, updatedAtMillis: deps.now()}));
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
export async function markBillPaidFromLink(deps: BillDeps, linkId: string,
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
 * Reads a month's bills, or one organizer's bills across months, with
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
  const [{settings}, invoice] = await Promise.all([readMoneySettings(db),
    nextInvoice(db, nowMillis)]);
  return {month: "month" in scope ? scope.month : null,
    organizerId: "organizerId" in scope ? scope.organizerId : null, bills,
    totals, counts, nextInvoiceNumber: invoice.label,
    gstRegistered: settings.gstRegistered};
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
  const onBill = !["list", "generate"].includes(data.action);
  if (onBill ? data.billId === null || data.expectedRevision === null :
    data.billId !== null || data.expectedRevision !== null) {
    throw new HttpsError("invalid-argument", "Invalid bill action.");
  }
  const db = deps.db();
  await checkRateLimit(db, actor.uid, "adminManageOrganizerBills",
    {maxRequests: 60, windowMs: 60 * 1000});
  const now = deps.now();
  if (data.action === "generate" && data.organizerId !== null) {
    throw new HttpsError("invalid-argument", "Bills are made for a month.");
  }
  let month = data.month ?? previousMonth(monthOf(now));
  if (data.action === "generate") {
    if (monthWindow(month).endMillis > now) {
      throw new HttpsError("failed-precondition",
        "A month is billed once it has ended.");
    }
    await generateMonthBills(deps, month, actor.uid);
  } else if (onBill) {
    await actOnBill(deps, actor, data, request);
    month = data.billId!.slice(-7);
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

/** On the 1st, India time, last month's bills are made, ready to send. */
export const generateOrganizerBillsMonthly = onSchedule({
  schedule: "0 6 1 * *", timeZone: "Asia/Kolkata", timeoutSeconds: 540,
  maxInstances: 1,
}, async () => {
  const month = previousMonth(monthOf(Date.now()));
  const written = await generateMonthBills(defaultBillDeps, month, null);
  logger.info("Organizer bills made.", {month, written});
});
