import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {effectiveCommercialTerms, readCommercialTerms} from
  "../commercialTerms/resolver";
import type {CommercialTerms} from "../commercialTerms/terms";
import {growthFactsCollection} from "../growth/organizerGrowthFacts";
import type {
  OrganizerBillDocument,
  OrganizerBillingCycleDocument,
  OrganizerBillingPlanDocument as PlanDocument,
  OrganizerGrowthFactsDocument,
} from "../shared/generated/firestoreAdminTypes";
import {validateOrganizerBillDocument} from
  "../shared/generated/validators/organizerBillDocument";
import {validateOrganizerBillingCycleDocument} from
  "../shared/generated/validators/organizerBillingCycleDocument";
import {
  closedCycles,
  cycleBillId,
  cycleBillingEpochMillis,
  cycleCapMinor,
  cycleLengthMillis,
  firstCycle,
  type CycleWindow,
} from "./billCycles";
import {
  computeBill,
  monthOf,
  type BillablePayment,
  type RefundCreditSource,
} from "./billComputation";
import {refundCreditSources, refundCreditWindowStart} from
  "./billRefundCredits";
import {billablePaymentsByOrganizer} from "./billSources";
import {trialAnchorsFromFacts, trialWindow} from "./hostTrial";
import {readMoneySettings} from "./moneySettings";
import {prepareNominatorCredit} from "./nominatorCredits";
import {billingPlanForCycle, planOfBill, type BillingPlan} from
  "./billingPlan";

/**
 * Rolling cycle bills (#1126): once a day, every organizer whose free trial
 * has ended gets a bill for each billing cycle that has closed, in arrears,
 * ready for staff to review and send. A cycle with nothing to bill advances
 * the organizer's cycle pointer without a bill.
 */
export const organizerBillingCyclesCollection = "organizerBillingCycles";
export const organizerBillsCollectionName = "organizerBills";
const organizerBillingPlansCollectionName = "organizerBillingPlans";
const historyLimit = 60;
const pageSize = 300;

type Db = FirebaseFirestore.Firestore;
type Bill = OrganizerBillDocument;
type Pointer = OrganizerBillingCycleDocument;

export interface CycleBillDeps {
  db: () => Db;
  now: () => number;
}

interface OrganizerWork {
  organizerId: string;
  terms: CommercialTerms;
  platformRevision: number;
  organizerRevision: number;
  ownTerms: boolean;
  trialEndsAtMillis: number;
  pointer: Pointer;
  cycles: CycleWindow[];
  /** The organizer's bills when the run began, to size the payment read. */
  bills: Bill[];
}

function checkedBill(bill: Bill): Bill {
  const id = bill.billId;
  if (!validateOrganizerBillDocument(bill)) {
    throw new HttpsError("internal", `Bill ${id} is not valid.`);
  }
  return bill;
}

function checkedPointer(pointer: Pointer): Pointer {
  const id = pointer.organizerId;
  if (!validateOrganizerBillingCycleDocument(pointer)) {
    throw new HttpsError("internal",
      `Billing cycle pointer ${id} is not valid.`);
  }
  return pointer;
}

/**
 * One organizer's bills, in no particular order.
 * @param {Db} db Firestore.
 * @param {string} organizerId Organizer.
 * @return {FirebaseFirestore.Query} Its bills.
 */
function organizerBillsQuery(db: Db, organizerId: string):
  FirebaseFirestore.Query {
  return db.collection(organizerBillsCollectionName)
    .where("organizerId", "==", organizerId).limit(240);
}

/**
 * When the organizer's calendar-month bills end: payments before it were
 * already billed (or forgiven) by a month bill and are never counted again.
 * @param {Db} db Firestore.
 * @param {string} organizerId Organizer.
 * @return {Promise<number>} Count-from instant.
 */
export async function legacyBilledThroughMillis(db: Db, organizerId: string):
  Promise<number> {
  const snap = await db.collection(organizerBillsCollectionName)
    .where("organizerId", "==", organizerId).limit(240).get();
  let through = cycleBillingEpochMillis;
  for (const doc of snap.docs) {
    const bill = doc.data() as Bill;
    if ((bill.periodKind ?? "calendarMonth") === "calendarMonth") {
      through = Math.max(through, bill.periodEndMillis);
    }
  }
  return through;
}

/**
 * What one organizer has to bill now, or null when nothing has closed.
 * @param {Db} db Firestore.
 * @param {string} organizerId Organizer.
 * @param {OrganizerGrowthFactsDocument|undefined} facts Growth facts.
 * @param {number} nowMillis Now.
 * @return {Promise<OrganizerWork|null>} Work for the organizer.
 */
async function organizerWork(db: Db, organizerId: string,
  facts: OrganizerGrowthFactsDocument | undefined, nowMillis: number):
  Promise<OrganizerWork | null> {
  const stored = await readCommercialTerms({db, organizerId});
  const terms = effectiveCommercialTerms(stored);
  if (!terms || !stored.platform) return null;
  const lengthMillis = cycleLengthMillis(terms);
  if (lengthMillis === null) {
    logger.error("Commission cycle anchor is not implemented.",
      {organizerId, anchor: terms.commission.cycleAnchor});
    return null;
  }
  const pointerRef = db.collection(organizerBillingCyclesCollection)
    .doc(organizerId);
  let pointer = (await pointerRef.get()).data() as Pointer | undefined;
  if (!pointer) {
    const window = trialWindow(trialAnchorsFromFacts(facts),
      terms.trial.days);
    if (!window || window.endsAtMillis > nowMillis) return null;
    const first = firstCycle({trialEndsAtMillis: window.endsAtMillis,
      lengthMillis,
      countFromMillis: await legacyBilledThroughMillis(db, organizerId)});
    pointer = {schemaVersion: 1, organizerId,
      trialEndsAtMillis: window.endsAtMillis,
      countFromMillis: first.countFromMillis,
      nextCycleNumber: first.nextCycleNumber,
      nextCycleStartMillis: first.nextCycleStartMillis,
      lastBillId: null, createdAtMillis: nowMillis,
      updatedAtMillis: nowMillis};
  }
  const cycles = closedCycles({pointer: pointer, lengthMillis,
    countFromMillis: pointer.countFromMillis, nowMillis});
  if (cycles.length === 0) return null;
  const bills = (await organizerBillsQuery(db, organizerId).get()).docs
    .map((doc) => doc.data() as Bill);
  return {organizerId, terms, platformRevision: stored.platform.revision,
    organizerRevision: stored.organizer?.revision ?? 0,
    ownTerms: stored.organizer !== null,
    trialEndsAtMillis: pointer.trialEndsAtMillis, pointer, cycles, bills};
}

/**
 * Every organizer that may owe a cycle: those with a cycle pointer or a
 * dated first event or paid booking, and those holding a tools-only plan.
 * @param {Db} db Firestore.
 * @return {Promise<Map>} Growth facts by organizer (undefined when none).
 */
async function candidateOrganizers(db: Db):
  Promise<Map<string, OrganizerGrowthFactsDocument | undefined>> {
  const result = new Map<string, OrganizerGrowthFactsDocument | undefined>();
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  for (;;) {
    const query = db.collection(growthFactsCollection).orderBy("__name__")
      .limit(pageSize);
    const snap: FirebaseFirestore.QuerySnapshot = await (cursor ?
      query.startAfter(cursor) : query).get();
    for (const doc of snap.docs) {
      const facts = doc.data() as OrganizerGrowthFactsDocument;
      const milestones = facts.milestones;
      if (milestones?.firstEventAt || milestones?.firstPaidBookingAt) {
        result.set(doc.id, facts);
      }
    }
    if (snap.size < pageSize) break;
    cursor = snap.docs[snap.docs.length - 1];
  }
  return result;
}

/**
 * The figures and stored shape of one cycle bill.
 * @param {object} input Organizer work, cycle, payments, plan and settings.
 * @return {Bill} A new bill, or the existing one recomputed.
 */
export function cycleBill(input: {
  work: Pick<OrganizerWork, "organizerId" | "terms" | "platformRevision" |
    "organizerRevision" | "ownTerms" | "trialEndsAtMillis">;
  cycle: CycleWindow; payments: BillablePayment[]; plan: BillingPlan;
  organizerName: string; gstRegistered: boolean; gstRateBasisPoints: number;
  current: Bill | undefined; nowMillis: number; actorUid: string | null;
  /** Refund credit owed from earlier bills, oldest first. */
  credit?: RefundCreditSource[];
}): Bill | null {
  const {work, cycle, current, nowMillis} = input;
  const figures = computeBill({
    payments: input.payments.filter((payment) =>
      payment.capturedAtMillis >= cycle.countFromMillis &&
      payment.capturedAtMillis < cycle.endMillis),
    terms: work.terms,
    trialEndsAtMillis: work.trialEndsAtMillis,
    capMinor: cycleCapMinor(work.terms.commission.capMinor, cycle),
    plan: input.plan,
    gstRegistered: input.gstRegistered,
    gstRateBasisPoints: input.gstRateBasisPoints,
    credit: input.credit});
  // A cycle with nothing to bill makes no bill; one that refund credit
  // brought to zero does, so the credit it used is recorded.
  if (!current && figures.totalMinor === 0 && !figures.refundCredit?.
    appliedMinor && figures.commission.trialWaivedMinor === 0) return null;
  const id = cycleBillId(work.organizerId, cycle.startMillis);
  const base: Bill = current ?? {schemaVersion: 1, billId: id,
    organizerId: work.organizerId, organizerName: "",
    month: monthOf(cycle.endMillis - 1), periodStartMillis: cycle.startMillis,
    periodEndMillis: cycle.endMillis, revision: 0, status: "toSend",
    ...figures, terms: {platformRevision: 0, organizerRevision: 0,
      ownTerms: false},
    invoiceNumber: null, dueAtMillis: null, paymentLink: null,
    sentAtMillis: null, reminders: [], paidAtMillis: null, paidMinor: null,
    paidVia: null, writtenOffAtMillis: null, history: [],
    generatedAtMillis: nowMillis, updatedAtMillis: nowMillis};
  return checkedBill({...base, ...figures,
    organizerName: input.organizerName.slice(0, 160),
    periodKind: "cycle", cycleNumber: cycle.cycleNumber,
    countFromMillis: cycle.countFromMillis,
    revision: base.revision + 1,
    status: figures.totalMinor > 0 ? "toSend" : "free",
    terms: {platformRevision: work.platformRevision,
      organizerRevision: work.organizerRevision, ownTerms: work.ownTerms},
    history: [...base.history, {atMillis: nowMillis,
      action: current ? "regenerated" as const : "generated" as const,
      byUid: input.actorUid, note: null}].slice(-historyLimit),
    generatedAtMillis: nowMillis, updatedAtMillis: nowMillis});
}

/**
 * Makes the bill of every cycle that has closed, for every organizer, and
 * advances each organizer's cycle pointer in the same transaction, so a
 * cycle is billed at most once however often this runs.
 * @param {CycleBillDeps} deps Dependencies.
 * @param {string|null} actorUid Staff member, or null for the schedule.
 * @return {Promise<number>} Bills written.
 */
export async function generateCycleBills(deps: CycleBillDeps,
  actorUid: string | null): Promise<number> {
  const db = deps.db();
  const now = deps.now();
  const candidates = await candidateOrganizers(db);
  const work: OrganizerWork[] = [];
  for (const [organizerId, facts] of candidates) {
    const item = await organizerWork(db, organizerId, facts, now);
    if (item) work.push(item);
  }
  if (work.length === 0) return 0;
  // Earlier bills that may owe refund credit need their payments too.
  const from = Math.min(...work.flatMap((item) => [
    ...item.cycles.map((cycle) => cycle.countFromMillis),
    refundCreditWindowStart(item.bills, item.cycles[0].startMillis, now) ??
      Infinity]));
  const to = Math.max(...work.flatMap((item) =>
    item.cycles.map((cycle) => cycle.endMillis)));
  const byOrganizer = await billablePaymentsByOrganizer(db, from, to);
  const {settings} = await readMoneySettings(db);
  let written = 0;
  for (const item of work) {
    const organizerSnap = await db.collection("organizers")
      .doc(item.organizerId).get();
    const organizerName = String(organizerSnap.data()?.name ??
      item.organizerId);
    for (const cycle of item.cycles) {
      const plan = await billingPlanForCycle({db,
        organizerId: item.organizerId, cycle, terms: item.terms});
      const pointerRef = db.collection(organizerBillingCyclesCollection)
        .doc(item.organizerId);
      const billRef = db.collection(organizerBillsCollectionName)
        .doc(cycleBillId(item.organizerId, cycle.startMillis));
      const planRef = db.collection(organizerBillingPlansCollectionName)
        .doc(item.organizerId);
      const wrote = await db.runTransaction(async (tx) => {
        const [pointerSnap, billSnap, planSnap, billsSnap] = await Promise.all([
          tx.get(pointerRef), tx.get(billRef), tx.get(planRef),
          tx.get(organizerBillsQuery(db, item.organizerId))]);
        const pointer = pointerSnap.data() as Pointer | undefined ??
          item.pointer;
        // Another run already billed this cycle.
        if (pointer.nextCycleStartMillis !== cycle.startMillis ||
            billSnap.exists) {
          return false;
        }
        const storedPlan = planSnap.data() as PlanDocument | undefined;
        // The web purchase prepaid the first tools-only cycle, once.
        const prepaid = plan.kind === "toolsOnly" ? plan.prepaid : null;
        const usesPrepaid = prepaid !== null &&
          storedPlan?.prepaidBillId === null;
        const payments = byOrganizer.get(item.organizerId) ?? [];
        let bill = cycleBill({work: item, cycle, payments, plan,
          organizerName, gstRegistered: settings.gstRegistered,
          gstRateBasisPoints: settings.gstRateBasisPoints, current: undefined,
          nowMillis: now, actorUid,
          // A prepaid bill is already paid; credit waits for the next one.
          credit: usesPrepaid ? undefined : refundCreditSources({
            billId: billRef.id, periodStartMillis: cycle.startMillis,
            bills: billsSnap.docs.map((doc) => doc.data() as Bill), payments,
            terms: item.terms, nowMillis: now})});
        let credit: () => unknown = () => null;
        if (bill && prepaid && usesPrepaid && storedPlan) {
          // The purchase paid for this cycle at the fee it was bought at;
          // GST switched on since is not charged on top.
          bill = checkedBill({...bill, status: "paid",
            paidAtMillis: prepaid.paidAtMillis, paidMinor: prepaid.paidMinor,
            paidVia: "planPurchase", history: [...bill.history,
              {atMillis: now, action: "paid" as const, byUid: null,
                note: "Prepaid by the tools-only purchase"}]
              .slice(-historyLimit)});
          credit = await prepareNominatorCredit(db, tx, bill, now);
          tx.set(planRef, {...storedPlan, prepaidBillId: bill.billId,
            revision: storedPlan.revision + 1, updatedAtMillis: now,
            history: [...storedPlan.history, {atMillis: now,
              action: "prepaidUsed" as const, byUid: null}]
              .slice(-historyLimit)});
        }
        if (bill) tx.set(billRef, bill);
        credit();
        tx.set(pointerRef, checkedPointer({...pointer,
          nextCycleNumber: cycle.cycleNumber + 1,
          nextCycleStartMillis: cycle.endMillis,
          lastBillId: bill ? bill.billId : pointer.lastBillId,
          updatedAtMillis: now}));
        return bill !== null;
      });
      if (wrote) written++;
    }
  }
  return written;
}

/**
 * Recomputes every cycle bill not yet sent, so staff send figures that
 * include refunds made since the cycle closed. Sent and closed bills keep
 * their figures.
 * @param {CycleBillDeps} deps Dependencies.
 * @param {string|null} actorUid Staff member.
 * @return {Promise<number>} Bills rewritten.
 */
export async function regenerateToSendCycleBills(deps: CycleBillDeps,
  actorUid: string | null): Promise<number> {
  const db = deps.db();
  const now = deps.now();
  const snap = await db.collection(organizerBillsCollectionName)
    .where("status", "in", ["toSend", "free"]).limit(500).get();
  const bills = snap.docs.map((doc) => doc.data() as Bill)
    .filter((bill) => bill.periodKind === "cycle");
  if (bills.length === 0) return 0;
  // Earlier bills that may owe refund credit need their payments too.
  const creditStarts = await Promise.all([...new Set(bills.map((bill) =>
    bill.organizerId))].map(async (organizerId) => {
    const own = (await organizerBillsQuery(db, organizerId).get()).docs
      .map((doc) => doc.data() as Bill);
    return Math.min(...bills.filter((bill) => bill.organizerId === organizerId)
      .map((bill) => refundCreditWindowStart(own, bill.periodStartMillis,
        now) ?? Infinity));
  }));
  const from = Math.min(...creditStarts, ...bills.map((bill) =>
    bill.countFromMillis ?? bill.periodStartMillis));
  const to = Math.max(...bills.map((bill) => bill.periodEndMillis));
  const byOrganizer = await billablePaymentsByOrganizer(db, from, to);
  const {settings} = await readMoneySettings(db);
  let written = 0;
  for (const stale of bills) {
    const stored = await readCommercialTerms({db,
      organizerId: stale.organizerId});
    const terms = effectiveCommercialTerms(stored);
    if (!terms || !stored.platform) continue;
    const cycle: CycleWindow = {cycleNumber: stale.cycleNumber ?? 1,
      startMillis: stale.periodStartMillis, endMillis: stale.periodEndMillis,
      countFromMillis: stale.countFromMillis ?? stale.periodStartMillis};
    // A bill keeps the plan it was made on (#1126: never both).
    const plan = planOfBill(stale);
    const ref = db.collection(organizerBillsCollectionName).doc(stale.billId);
    const wrote = await db.runTransaction(async (tx) => {
      const [currentSnap, billsSnap] = await Promise.all([tx.get(ref),
        tx.get(organizerBillsQuery(db, stale.organizerId))]);
      const current = currentSnap.data() as Bill | undefined;
      if (!current || !["toSend", "free"].includes(current.status) ||
          current.revision !== stale.revision) return false;
      const payments = byOrganizer.get(stale.organizerId) ?? [];
      const bill = cycleBill({work: {organizerId: stale.organizerId, terms,
        platformRevision: stored.platform!.revision,
        organizerRevision: stored.organizer?.revision ?? 0,
        ownTerms: stored.organizer !== null,
        trialEndsAtMillis: current.trialEndsAtMillis ?? cycle.startMillis},
      cycle, payments, plan,
      organizerName: current.organizerName,
      gstRegistered: settings.gstRegistered,
      gstRateBasisPoints: settings.gstRateBasisPoints, current, nowMillis: now,
      actorUid, credit: refundCreditSources({billId: current.billId,
        periodStartMillis: current.periodStartMillis,
        bills: billsSnap.docs.map((doc) => doc.data() as Bill), payments,
        terms, nowMillis: now})});
      if (!bill) return false;
      tx.set(ref, bill);
      return true;
    });
    if (wrote) written++;
  }
  return written;
}

/**
 * Once a day, India time, every cycle that closed is billed in arrears and
 * left for staff to review and send.
 */
export const generateOrganizerCycleBillsDaily = onSchedule({
  schedule: "15 6 * * *", timeZone: "Asia/Kolkata", timeoutSeconds: 540,
  maxInstances: 1,
}, async () => {
  const written = await generateCycleBills({db: () => admin.firestore(),
    now: Date.now}, null);
  logger.info("Organizer cycle bills made.", {written});
});
