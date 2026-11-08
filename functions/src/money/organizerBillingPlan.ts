import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {onCall, HttpsError, type CallableRequest} from
  "firebase-functions/v2/https";
import {effectiveCommercialTerms, readCommercialTerms} from
  "../commercialTerms/resolver";
import type {CommercialTerms} from "../commercialTerms/terms";
import {growthFactsCollection} from "../growth/organizerGrowthFacts";
import {createRazorpayClient, razorpayKeySecret} from "../payments/razorpay";
import {razorpayRuntimeProject} from "../payments/razorpayOrderOwnership";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import {isOrganizerOwner} from "../shared/organizerHosts";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {
  OrganizerBillingCycleDocument,
  OrganizerBillingPlanDocument,
  OrganizerDocument,
  OrganizerGrowthFactsDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ManageOrganizerBillingPlanCallablePayload as Payload} from
  "../shared/generated/manageOrganizerBillingPlanCallablePayload";
import type {ManageOrganizerBillingPlanCallableResponse as Result} from
  "../shared/generated/manageOrganizerBillingPlanCallableResponse";
import type {OrganizerBillingPlanStatus} from
  "../shared/generated/organizerBillingPlanStatus";
import {validateManageOrganizerBillingPlanCallablePayload} from
  "../shared/generated/validators/manageOrganizerBillingPlanInput";
import {validateManageOrganizerBillingPlanCallableResponse} from
  "../shared/generated/validators/manageOrganizerBillingPlanOutput";
import {validateOrganizerBillingPlanDocument} from
  "../shared/generated/validators/organizerBillingPlanDocument";
import {cycleLengthMillis, firstCycle, cycleBillingEpochMillis} from
  "./billCycles";
import {computeBill} from "./billComputation";
import {
  razorpayBillPaymentLinks,
  type BillPaymentLinkClient,
} from "./billPaymentLinks";
import {trialAnchorsFromFacts, trialWindow} from "./hostTrial";
import {readMoneySettings} from "./moneySettings";

/**
 * The tools-only plan (#1126): a host is billed for tools-only OR ticketing in
 * a billing cycle, never both. Tools-only is bought only on the web, as a
 * Razorpay payment link on Catch's own account for one tools-only fee that
 * prepays the first tools-only cycle (a plan-based invoice, not a mandate:
 * #1124 rules out subscriptions). The plan applies from the next cycle.
 */
export const organizerBillingPlansCollection = "organizerBillingPlans";
const billingCyclesCollection = "organizerBillingCycles";
const historyLimit = 60;

type Db = FirebaseFirestore.Firestore;
type Plan = OrganizerBillingPlanDocument;
type HistoryAction = Plan["history"][number]["action"];

export interface PlanDeps {
  db: () => Db;
  now: () => number;
  links: () => BillPaymentLinkClient;
  checkRateLimit: typeof checkRateLimit;
}

export const defaultPlanDeps: PlanDeps = {
  db: () => admin.firestore(),
  now: Date.now,
  links: () => razorpayBillPaymentLinks(createRazorpayClient(),
    razorpayRuntimeProject()),
  checkRateLimit,
};

function checkedPlan(plan: Plan): Plan {
  const id = plan.organizerId;
  if (!validateOrganizerBillingPlanDocument(plan)) {
    throw new HttpsError("internal", `Billing plan ${id} is not valid.`);
  }
  return plan;
}

function withHistory(plan: Plan | undefined, action: HistoryAction,
  atMillis: number, byUid: string | null): Plan["history"] {
  return [...(plan?.history ?? []), {atMillis, action, byUid}]
    .slice(-historyLimit);
}

/**
 * The plan as status only, with no prices, for the native Host app.
 * @param {Plan|undefined} plan Stored plan.
 * @return {OrganizerBillingPlanStatus} Plan status.
 */
export function planStatusView(plan: Plan | undefined):
  OrganizerBillingPlanStatus {
  if (!plan) {
    return {plan: "ticketing", status: "none", startsAtMillis: null,
      endsAtMillis: null};
  }
  return {plan: plan.plan, status: plan.status,
    startsAtMillis: plan.startsAtMillis, endsAtMillis: plan.endsAtMillis};
}

/**
 * Reads one organizer's plan.
 * @param {Db} db Firestore.
 * @param {string} organizerId Organizer.
 * @return {Promise<Plan|undefined>} The plan, if any.
 */
export async function readBillingPlan(db: Db, organizerId: string):
  Promise<Plan | undefined> {
  const snap = await db.collection(organizerBillingPlansCollection)
    .doc(organizerId).get();
  return snap.data() as Plan | undefined;
}

/**
 * Whether tools-only applies to a cycle starting at this instant.
 * @param {Plan|undefined} plan Stored plan.
 * @param {number} cycleStartMillis The cycle's start.
 * @return {boolean} Tools-only applies.
 */
export function toolsOnlyApplies(plan: Plan | undefined,
  cycleStartMillis: number): boolean {
  if (!plan || plan.plan !== "toolsOnly" || plan.status !== "active") {
    return false;
  }
  return (plan.startsAtMillis === null ||
      cycleStartMillis >= plan.startsAtMillis) &&
    (plan.endsAtMillis === null || cycleStartMillis < plan.endsAtMillis);
}

/**
 * When the next billing cycle starts: the first cycle after the trial while
 * the trial runs, else the cycle after the one under way. Null while the
 * trial has not started, so the first cycle is unknown.
 * @param {object} input Firestore, organizer, terms and now.
 * @return {Promise<number|null>} Next cycle start.
 */
export async function nextCycleStartMillis(input: {db: Db;
  organizerId: string; terms: CommercialTerms; nowMillis: number}):
  Promise<number | null> {
  const {db, organizerId, terms, nowMillis} = input;
  const length = cycleLengthMillis(terms);
  if (length === null) return null;
  const pointer = (await db.collection(billingCyclesCollection)
    .doc(organizerId).get()).data() as OrganizerBillingCycleDocument |
    undefined;
  let start: number;
  if (pointer) {
    start = pointer.nextCycleStartMillis;
  } else {
    const facts = (await db.collection(growthFactsCollection)
      .doc(organizerId).get()).data() as OrganizerGrowthFactsDocument |
      undefined;
    const window = trialWindow(trialAnchorsFromFacts(facts),
      terms.trial.days);
    if (!window) return null;
    if (window.endsAtMillis > nowMillis) return window.endsAtMillis;
    start = firstCycle({trialEndsAtMillis: window.endsAtMillis,
      lengthMillis: length, countFromMillis: cycleBillingEpochMillis})
      .nextCycleStartMillis;
  }
  // The cycle under way never changes plan; the next one does.
  while (start + length <= nowMillis) start += length;
  return start > nowMillis ? start : start + length;
}

async function readTerms(db: Db, organizerId: string):
  Promise<CommercialTerms> {
  const terms = effectiveCommercialTerms(await readCommercialTerms({db,
    organizerId}));
  if (!terms) {
    throw new HttpsError("failed-precondition",
      "Catch's prices are not set up yet. Try again later.");
  }
  return terms;
}

/**
 * The organizer's plan with prices, for the host billing website.
 * @param {Db} db Firestore.
 * @param {string} organizerId Organizer.
 * @param {Plan|undefined} plan Stored plan.
 * @return {Promise<Result>} Website view.
 */
async function websiteView(db: Db, organizerId: string,
  plan: Plan | undefined): Promise<Result> {
  const stored = await readCommercialTerms({db, organizerId})
    .catch(() => null);
  let terms: CommercialTerms | null = null;
  try {
    terms = stored ? effectiveCommercialTerms(stored) : null;
  } catch {
    terms = null;
  }
  const {settings} = await readMoneySettings(db);
  const waiting = plan?.status === "pendingPayment" && plan.purchase &&
    plan.purchase.paidAtMillis === null ? plan.purchase : null;
  return {organizerId, plan: planStatusView(plan),
    revision: plan?.revision ?? 0,
    paymentUrl: waiting?.url ?? null,
    amountDueMinor: waiting?.amountMinor ?? null,
    prices: terms ? {toolsOnlyFeeMinor: terms.toolsOnly.feeMinor,
      commissionRateBasisPoints: terms.commission.rateBasisPoints,
      commissionCapMinor: terms.commission.capMinor,
      cycleDays: terms.commission.cycleDays,
      gstRegistered: settings.gstRegistered,
      gstRateBasisPoints: settings.gstRateBasisPoints} : null};
}

/**
 * The organizer's owner reads, buys or cancels tools-only on the website.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {PlanDeps} deps Dependencies.
 * @return {Promise<Result>} The plan afterwards.
 */
export async function manageOrganizerBillingPlanHandler(
  request: CallableRequest<unknown>, deps: PlanDeps = defaultPlanDeps):
  Promise<Result> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<Payload>(request,
    validateManageOrganizerBillingPlanCallablePayload);
  const db = deps.db();
  await deps.checkRateLimit(db, uid, "manageOrganizerBillingPlan",
    {maxRequests: 30, windowMs: 60 * 1000});
  const organizerSnap = await db.collection("organizers")
    .doc(data.organizerId).get();
  const organizer = organizerSnap.data() as OrganizerDocument | undefined;
  if (!organizer || !isOrganizerOwner(organizer, uid)) {
    throw new HttpsError("permission-denied",
      "Only the organizer's owner can change its plan.");
  }
  const ref = db.collection(organizerBillingPlansCollection)
    .doc(data.organizerId);
  let plan = (await ref.get()).data() as Plan | undefined;
  if (data.action !== "read" &&
      (plan?.revision ?? 0) !== data.expectedRevision) {
    throw new HttpsError("aborted", "Your plan changed. Review it again.");
  }
  if (data.action === "buyToolsOnly") {
    plan = await buyToolsOnly(deps, data.organizerId,
      String(organizer.name ?? data.organizerId), plan, uid);
  } else if (data.action === "cancelToolsOnly") {
    plan = await cancelToolsOnly(deps, data.organizerId, plan, uid);
  }
  const result = await websiteView(db, data.organizerId, plan);
  if (!validateManageOrganizerBillingPlanCallableResponse(result)) {
    throw new HttpsError("internal", "Invalid plan.");
  }
  return result;
}

async function buyToolsOnly(deps: PlanDeps, organizerId: string,
  organizerName: string, plan: Plan | undefined, uid: string):
  Promise<Plan> {
  if (plan?.plan === "toolsOnly" && plan.status === "active" &&
      (plan.endsAtMillis === null || plan.endsAtMillis > deps.now())) {
    throw new HttpsError("failed-precondition",
      "You are already on the tools-only plan.");
  }
  // An unpaid purchase keeps its link; buying again returns it.
  if (plan?.status === "pendingPayment") return plan;
  const db = deps.db();
  const now = deps.now();
  // One plan document holds one tools-only window: a new one waits until
  // every cycle of the previous window has been billed as tools-only.
  if (plan?.plan === "toolsOnly" && plan.status === "active" &&
      plan.endsAtMillis !== null) {
    const pointer = (await db.collection(billingCyclesCollection)
      .doc(organizerId).get()).data() as OrganizerBillingCycleDocument |
      undefined;
    if (!pointer || pointer.nextCycleStartMillis < plan.endsAtMillis) {
      throw new HttpsError("failed-precondition",
        "Your last tools-only cycle is still being billed. " +
        "Try again tomorrow.");
    }
  }
  const terms = await readTerms(db, organizerId);
  const startsAtMillis = await nextCycleStartMillis({db, organizerId, terms,
    nowMillis: now});
  if (startsAtMillis === null) {
    throw new HttpsError("failed-precondition",
      "Tools-only can be chosen once your free trial has started.");
  }
  const {settings} = await readMoneySettings(db);
  const feeMinor = terms.toolsOnly.feeMinor;
  const amountMinor = computeBill({payments: [], terms,
    trialEndsAtMillis: null, plan: {kind: "toolsOnly", feeMinor},
    gstRegistered: settings.gstRegistered,
    gstRateBasisPoints: settings.gstRateBasisPoints}).totalMinor;
  if (amountMinor < 100) {
    throw new HttpsError("failed-precondition",
      "The tools-only plan has no price yet.");
  }
  const link = await deps.links().createForPlan({organizerId, organizerName,
    amountMinor, nowMillis: now});
  const ref = db.collection(organizerBillingPlansCollection).doc(organizerId);
  return db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as Plan | undefined;
    if ((current?.revision ?? 0) !== (plan?.revision ?? 0)) {
      throw new HttpsError("aborted", "Your plan changed. Review it again.");
    }
    const next = checkedPlan({schemaVersion: 1, organizerId,
      plan: "toolsOnly", status: "pendingPayment", startsAtMillis,
      endsAtMillis: null,
      purchase: {linkId: link.linkId, url: link.url, amountMinor, feeMinor,
        createdAtMillis: now, paidAtMillis: null, paidMinor: null},
      prepaidBillId: null, revision: (current?.revision ?? 0) + 1,
      history: withHistory(current, "bought", now, uid),
      updatedAtMillis: now});
    tx.set(ref, next);
    return next;
  });
}

async function cancelToolsOnly(deps: PlanDeps, organizerId: string,
  plan: Plan | undefined, uid: string): Promise<Plan | undefined> {
  if (!plan || plan.plan !== "toolsOnly" || plan.status === "ended" ||
      plan.endsAtMillis !== null) {
    throw new HttpsError("failed-precondition",
      "There is no tools-only plan to cancel.");
  }
  const db = deps.db();
  const now = deps.now();
  const ref = db.collection(organizerBillingPlansCollection).doc(organizerId);
  if (plan.status === "pendingPayment") {
    await deps.links().cancel(plan.purchase!.linkId).catch((error) => {
      logger.warn("Tools-only payment link was not cancelled.",
        {organizerId, error: error instanceof Error ? error.message :
          String(error)});
    });
    return db.runTransaction(async (tx) => {
      const current = (await tx.get(ref)).data() as Plan | undefined;
      if (current?.revision !== plan.revision) {
        throw new HttpsError("aborted", "Your plan changed. Review it again.");
      }
      const next = checkedPlan({...current, plan: "ticketing",
        status: "ended", revision: current.revision + 1,
        history: withHistory(current, "cancelled", now, uid),
        updatedAtMillis: now});
      tx.set(ref, next);
      return next;
    });
  }
  const terms = await readTerms(db, organizerId);
  const length = cycleLengthMillis(terms);
  const nextStart = await nextCycleStartMillis({db, organizerId, terms,
    nowMillis: now});
  if (length === null || nextStart === null) {
    throw new HttpsError("failed-precondition",
      "Your billing cycle is not known yet. Try again later.");
  }
  // The prepaid cycle is always given; otherwise tools-only ends when the
  // cycle under way closes.
  const prepaidEnd = plan.prepaidBillId === null &&
    plan.startsAtMillis !== null ? plan.startsAtMillis + length : 0;
  const endsAtMillis = Math.max(nextStart, prepaidEnd);
  return db.runTransaction(async (tx) => {
    const current = (await tx.get(ref)).data() as Plan | undefined;
    if (current?.revision !== plan.revision) {
      throw new HttpsError("aborted", "Your plan changed. Review it again.");
    }
    const next = checkedPlan({...current, endsAtMillis,
      revision: current.revision + 1,
      history: withHistory(current, "cancelled", now, uid),
      updatedAtMillis: now});
    tx.set(ref, next);
    return next;
  });
}

/**
 * Marks a tools-only purchase paid once Razorpay says its link is paid in
 * full. A purchase cancelled before it was paid is honoured all the same:
 * the host paid, so the plan becomes active.
 * @param {PlanDeps} deps Dependencies.
 * @param {string} linkId Paid payment link.
 * @param {string} projectId This environment's project.
 * @return {Promise<boolean>} Whether a plan was activated.
 */
export async function markToolsOnlyPaidFromLink(
  deps: Pick<PlanDeps, "db" | "now" | "links">, linkId: string,
  projectId: string): Promise<boolean> {
  const link = await deps.links().fetch(linkId);
  if (link.project !== projectId || !link.planOrganizerId ||
      link.status !== "paid") return false;
  const db = deps.db();
  const organizerId = link.planOrganizerId;
  const ref = db.collection(organizerBillingPlansCollection).doc(organizerId);
  // A payment that arrives after the planned first cycle began starts
  // tools-only with the next cycle instead, so the purchase always buys a
  // whole tools-only cycle and is never lost.
  const terms = effectiveCommercialTerms(await readCommercialTerms({db,
    organizerId}));
  const nextStart = terms ? await nextCycleStartMillis({db, organizerId,
    terms, nowMillis: deps.now()}) : null;
  const result = await db.runTransaction(async (tx) => {
    const plan = (await tx.get(ref)).data() as Plan | undefined;
    const purchase = plan?.purchase;
    if (!plan || !purchase) return "unknown" as const;
    if (purchase.linkId !== linkId) return "superseded" as const;
    if (purchase.paidAtMillis !== null ||
        link.amountPaid < purchase.amountMinor) return "ignored" as const;
    const now = deps.now();
    const startsAtMillis = plan.startsAtMillis !== null && nextStart !== null &&
      plan.startsAtMillis < nextStart && plan.startsAtMillis <= now ?
      nextStart : plan.startsAtMillis;
    tx.set(ref, checkedPlan({...plan, plan: "toolsOnly", status: "active",
      startsAtMillis, endsAtMillis: null, prepaidBillId: null,
      purchase: {...purchase, paidAtMillis: now, paidMinor: link.amountPaid},
      revision: plan.revision + 1,
      history: withHistory(plan, "paid", now, null), updatedAtMillis: now}));
    return "activated" as const;
  });
  if (result === "superseded" || result === "unknown") {
    // Money arrived for a purchase the plan no longer tracks (cancelled and
    // bought again). Staff refund or apply it by hand.
    logger.error("Tools-only payment for a superseded purchase needs review.",
      {organizerId, linkId, amountPaid: link.amountPaid});
  }
  return result === "activated";
}

export const manageOrganizerBillingPlan = onCall(
  appCheckCallableOptionsWithSecrets([razorpayKeySecret]),
  (request) => manageOrganizerBillingPlanHandler(request));
