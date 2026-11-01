import * as admin from "firebase-admin";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {requireAdminRole} from "../admin/adminAuth";
import {setAdminAuditLogInTransaction} from "../admin/adminAudit";
import {growthFactsCollection} from "../growth/organizerGrowthFacts";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {
  NominatorCreditDocument,
  OrganizerBillDocument,
  OrganizerGrowthFactsDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {AdminManageNominatorCreditsCallablePayload as Payload} from
  "../shared/generated/adminManageNominatorCreditsCallablePayload";
import type {AdminManageNominatorCreditsCallableResponse as Result} from
  "../shared/generated/adminManageNominatorCreditsCallableResponse";
import {validateAdminManageNominatorCreditsCallablePayload} from
  "../shared/generated/validators/adminManageNominatorCreditsInput";
import {validateAdminManageNominatorCreditsCallableResponse} from
  "../shared/generated/validators/adminManageNominatorCreditsOutput";
import {validateNominatorCreditDocument} from
  "../shared/generated/validators/nominatorCreditDocument";
import {
  billPaidBeforeGst,
  monthsBetween,
  type MoneySettings,
} from "./billComputation";
import {moneyRoles, readMoneySettings} from "./moneySettings";

export const nominatorCreditsCollection = "nominatorCredits";
const dayMillis = 24 * 60 * 60 * 1000;

type Db = FirebaseFirestore.Firestore;
type Tx = FirebaseFirestore.Transaction;

/**
 * The credit one paid bill earns its organizer's first nominator, or null.
 * The nominator's role must earn credit, the organizer must have claimed
 * within the lapse window of the nomination, and the bill must fall within
 * the credit months counted from the organizer's first paid bill.
 * @param {object} input Bill, facts, first paid month, rule and time.
 * @return {NominatorCreditDocument|null} The credit, or null.
 */
export function creditForPaidBill(input: {
  bill: OrganizerBillDocument;
  facts: OrganizerGrowthFactsDocument | undefined;
  firstPaidMonth: string;
  rule: MoneySettings["nominatorCredit"];
  nowMillis: number;
}): NominatorCreditDocument | null {
  const {bill, facts, rule} = input;
  const nominator = facts?.nominator;
  if (!nominator || !rule.earningRoles.includes(nominator.role)) return null;
  const claimedAt = facts.milestones.claimedAt?.toMillis();
  if (claimedAt === undefined || claimedAt - nominator.nominatedAt.toMillis() >
    rule.lapseDays * dayMillis) return null;
  const monthIndex = monthsBetween(input.firstPaidMonth, bill.month) + 1;
  if (monthIndex < 1 || monthIndex > rule.months) return null;
  const billPaidMinor = billPaidBeforeGst(bill);
  const creditMinor = Math.floor(billPaidMinor * rule.rateBasisPoints /
    10_000);
  if (creditMinor <= 0) return null;
  return {schemaVersion: 1, creditId: bill.billId, billId: bill.billId,
    organizerId: bill.organizerId, organizerName: bill.organizerName,
    nominatorUid: nominator.uid, nominatorRole: nominator.role,
    billMonth: bill.month, monthIndex, billPaidMinor,
    rateBasisPoints: rule.rateBasisPoints, creditMinor, status: "owed",
    approvedAtMillis: null, approvedByUid: null, paidAtMillis: null,
    paidByUid: null, createdAtMillis: input.nowMillis,
    updatedAtMillis: input.nowMillis};
}

/**
 * Reads what crediting a paid bill needs, inside the paying transaction,
 * and returns the write to make after every read.
 * @param {Db} db Firestore.
 * @param {Tx} tx The transaction marking the bill paid.
 * @param {OrganizerBillDocument} bill The bill as it will be stored, paid.
 * @param {number} nowMillis Now.
 * @return {Promise<Function>} Applies the credit write, if any.
 */
export async function prepareNominatorCredit(db: Db, tx: Tx,
  bill: OrganizerBillDocument, nowMillis: number):
  Promise<() => NominatorCreditDocument | null> {
  const creditRef = db.collection(nominatorCreditsCollection).doc(bill.billId);
  const [facts, paidBills, existing, {settings}] = await Promise.all([
    tx.get(db.collection(growthFactsCollection).doc(bill.organizerId)),
    tx.get(db.collection("organizerBills")
      .where("organizerId", "==", bill.organizerId)
      .where("status", "==", "paid")),
    tx.get(creditRef),
    readMoneySettings(db, tx),
  ]);
  if (existing.exists) return () => null;
  const months = [bill.month, ...paidBills.docs.map((doc) =>
    String(doc.data().month))].sort();
  const credit = creditForPaidBill({bill,
    facts: facts.data() as OrganizerGrowthFactsDocument | undefined,
    firstPaidMonth: months[0], rule: settings.nominatorCredit, nowMillis});
  return () => {
    if (!credit) return null;
    if (!validateNominatorCreditDocument(credit)) {
      throw new HttpsError("internal", "Invalid nominator credit.");
    }
    tx.create(creditRef, credit);
    return credit;
  };
}

/**
 * Sums credit per nominator, newest first.
 * @param {NominatorCreditDocument[]} credits Ledger entries.
 * @param {number} minimumPayoutMinor Minimum payout.
 * @return {Result["nominators"]} Totals per nominator.
 */
export function nominatorTotals(credits: NominatorCreditDocument[],
  minimumPayoutMinor: number): Result["nominators"] {
  const totals = new Map<string, Result["nominators"][number] &
    {organizers: Set<string>}>();
  for (const credit of credits) {
    const row = totals.get(credit.nominatorUid) ?? {
      nominatorUid: credit.nominatorUid, nominatorRole: credit.nominatorRole,
      owedMinor: 0, approvedMinor: 0, paidMinor: 0, payable: false,
      organizerCount: 0, organizers: new Set<string>()};
    row[`${credit.status}Minor` as "owedMinor"] += credit.creditMinor;
    row.organizers.add(credit.organizerId);
    totals.set(credit.nominatorUid, row);
  }
  return [...totals.values()].map(({organizers, ...row}) => ({...row,
    organizerCount: organizers.size,
    payable: row.owedMinor > 0 && row.owedMinor >= minimumPayoutMinor}))
    .sort((a, b) => b.owedMinor + b.approvedMinor -
      (a.owedMinor + a.approvedMinor));
}

interface Dependencies {
  db: () => Db;
  rateLimit: typeof checkRateLimit;
  now: () => number;
}
const defaults: Dependencies = {db: () => admin.firestore(),
  rateLimit: checkRateLimit, now: Date.now};

/**
 * The owner reads the credit ledger, approves a nominator's owed credit
 * once it reaches the minimum payout, or records that it was paid.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {Dependencies} deps Injectable dependencies.
 * @return {Promise<Result>} The ledger after the action.
 */
export async function adminManageNominatorCreditsHandler(
  request: CallableRequest<unknown>, deps: Dependencies = defaults):
  Promise<Result> {
  const actor = requireAdminRole(request, moneyRoles);
  const data = validateCallableWithAjv<Payload>(request,
    validateAdminManageNominatorCreditsCallablePayload);
  if ((data.action === "list") !== (data.nominatorUid === null)) {
    throw new HttpsError("invalid-argument", "Invalid credit action.");
  }
  const db = deps.db();
  await deps.rateLimit(db, actor.uid, "adminManageNominatorCredits", {
    maxRequests: 30, windowMs: 60 * 1000});
  const {settings} = await readMoneySettings(db);
  const minimum = settings.nominatorCredit.minimumPayoutMinor;
  if (data.action !== "list") {
    const from = data.action === "approve" ? "owed" : "approved";
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(db.collection(nominatorCreditsCollection)
        .where("nominatorUid", "==", data.nominatorUid)
        .where("status", "==", from));
      const entries = snap.docs.map((doc) =>
        doc.data() as NominatorCreditDocument);
      const sum = entries.reduce((total, entry) =>
        total + entry.creditMinor, 0);
      if (!entries.length) {
        throw new HttpsError("failed-precondition",
          `This nominator has no ${from} credit.`);
      }
      if (data.action === "approve" && sum < minimum) {
        throw new HttpsError("failed-precondition",
          "Credit under the minimum payout rolls over to next month.");
      }
      const now = deps.now();
      for (const doc of snap.docs) {
        tx.update(doc.ref, data.action === "approve" ?
          {status: "approved", approvedAtMillis: now,
            approvedByUid: actor.uid, updatedAtMillis: now} :
          {status: "paid", paidAtMillis: now, paidByUid: actor.uid,
            updatedAtMillis: now});
      }
      setAdminAuditLogInTransaction(tx, db, actor, {
        action: `adminManageNominatorCredits.${data.action}`,
        targetPath: `${nominatorCreditsCollection}?nominatorUid=` +
          data.nominatorUid,
        request, before: {status: from, creditMinor: sum},
        after: {status: data.action === "approve" ? "approved" : "paid",
          creditIds: snap.docs.map((doc) => doc.id)},
        note: data.note,
        serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  }
  const snap = await db.collection(nominatorCreditsCollection)
    .orderBy("createdAtMillis", "desc").limit(2000).get();
  const credits = snap.docs.map((doc) =>
    doc.data() as NominatorCreditDocument);
  const result: Result = {minimumPayoutMinor: minimum,
    nominators: nominatorTotals(credits, minimum), credits};
  if (!validateAdminManageNominatorCreditsCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid nominator credit ledger.");
  }
  return result;
}

export const adminManageNominatorCredits = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 10}),
  (request) => adminManageNominatorCreditsHandler(request));
