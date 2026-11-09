import type {CommercialTerms} from "../commercialTerms/terms";
import type {OrganizerBillingPlanDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {CycleWindow} from "./billCycles";

/**
 * Which plan one billing cycle is billed on. A host is billed for tools-only
 * OR ticketing in a cycle, never both (#1126, owner 28 Oct): a tools-only
 * cycle bills the flat tools-only fee and no commission. The first tools-only
 * cycle was prepaid by the web purchase.
 */
export type BillingPlan =
  {kind: "ticketing"} |
  {kind: "toolsOnly"; feeMinor: number;
    prepaid: {paidMinor: number; paidAtMillis: number} | null};

/**
 * The plan a bill was made on, for recomputing it: the plan never changes
 * after a cycle is billed, whatever the organizer chose since.
 * @param {object} bill The stored bill's plan.
 * @return {BillingPlan} Its plan.
 */
export function planOfBill(bill: {plan?: {kind: "ticketing" | "toolsOnly";
  toolsOnlyFeeMinor: number | null}}): BillingPlan {
  return bill.plan?.kind === "toolsOnly" ?
    {kind: "toolsOnly", feeMinor: bill.plan.toolsOnlyFeeMinor ?? 0,
      prepaid: null} :
    {kind: "ticketing"};
}

const plansCollection = "organizerBillingPlans";

/**
 * The plan for one cycle from the stored plan: tools-only while it is active
 * for the cycle's start, else ticketing. The purchase prepays the cycle that
 * starts when tools-only starts, once.
 * @param {OrganizerBillingPlanDocument|undefined} plan Stored plan.
 * @param {CycleWindow} cycle The cycle.
 * @param {CommercialTerms} terms Effective terms.
 * @return {BillingPlan} The cycle's plan.
 */
export function planForCycle(plan: OrganizerBillingPlanDocument | undefined,
  cycle: CycleWindow, terms: CommercialTerms): BillingPlan {
  if (!plan || plan.plan !== "toolsOnly" || plan.status !== "active" ||
      (plan.startsAtMillis !== null &&
        cycle.startMillis < plan.startsAtMillis) ||
      (plan.endsAtMillis !== null && cycle.startMillis >= plan.endsAtMillis)) {
    return {kind: "ticketing"};
  }
  // The purchase prepays the first tools-only cycle billed, at the fee it
  // was bought at, however the terms changed since.
  const purchase = plan.purchase;
  const prepaid = plan.prepaidBillId === null && purchase &&
    purchase.paidAtMillis !== null && purchase.paidMinor !== null ?
    {paidMinor: purchase.paidMinor, paidAtMillis: purchase.paidAtMillis} :
    null;
  const feeMinor = prepaid && purchase ? purchase.feeMinor :
    terms.toolsOnly.feeMinor;
  return {kind: "toolsOnly", feeMinor, prepaid};
}

/**
 * The plan in force for a cycle, read from the organizer's stored plan.
 * @param {object} input Firestore, organizer, cycle and effective terms.
 * @return {Promise<BillingPlan>} The cycle's plan.
 */
export async function billingPlanForCycle(input: {
  db: FirebaseFirestore.Firestore; organizerId: string; cycle: CycleWindow;
  terms: CommercialTerms;
}): Promise<BillingPlan> {
  const plan = (await input.db.collection(plansCollection)
    .doc(input.organizerId).get()).data() as OrganizerBillingPlanDocument |
    undefined;
  return planForCycle(plan, input.cycle, input.terms);
}
