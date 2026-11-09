import type {CommercialTerms} from "../commercialTerms/terms";
import type {CycleWindow} from "./billCycles";

/**
 * Which plan one billing cycle is billed on. A host is billed for tools-only
 * OR ticketing in a cycle, never both (#1126, owner 28 Oct): a tools-only
 * cycle bills the flat tools-only fee and no commission.
 */
export type BillingPlan =
  {kind: "ticketing"} |
  {kind: "toolsOnly"; feeMinor: number};

/**
 * The plan in force for a cycle. Every host is on ticketing until a
 * tools-only plan exists (the tools-only purchase slice reads it here).
 * @param {object} input Firestore, organizer, cycle and effective terms.
 * @return {Promise<BillingPlan>} The cycle's plan.
 */
export async function billingPlanForCycle(input: {
  db: FirebaseFirestore.Firestore; organizerId: string; cycle: CycleWindow;
  terms: CommercialTerms;
}): Promise<BillingPlan> {
  void input;
  return {kind: "ticketing"};
}
