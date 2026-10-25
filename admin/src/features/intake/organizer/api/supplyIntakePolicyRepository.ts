import {httpsCallable} from "firebase/functions";
import type {AdminListSupplyIntakePoliciesCallableResponse} from
  "../../../../generated/contracts/adminListSupplyIntakePoliciesCallableResponse";
import {decideOrganizerPolicyGap} from "../../../../shared/api/adminApi";
import type {AdminDecideOrganizerPolicyGapPayload} from "../../../../shared/types/adminTypes";
import {dataMode} from "../../../../shared/api/dataMode";
import {functions} from "../../../../shared/api/firebaseFunctions";

export type SupplyIntakePolicies = AdminListSupplyIntakePoliciesCallableResponse;
export type SupplyIntakePolicy = SupplyIntakePolicies["policies"][number];
export type SupplyIntakePolicyDecision = Pick<AdminDecideOrganizerPolicyGapPayload, "gapId" | "decision" | "note" |
  "checklist">;

const samplePolicies: SupplyIntakePolicies = {policies: [{gapId: "on_demand_page_fetch_policy",
  label: "Read the pages a nomination names", enables: "Catch fetches the public pages a nomination gives.",
  configPath: "operations/src/workflows/supply-intake/config/acquisition_policy.json (pageFetch)",
  decisionId: "policy-on-demand-page-fetch-policy", decision: null, enabled: false, configCitesDecision: false,
  limits: [{label: "Pages per nomination", value: 0}, {label: "Pages per month", value: 0}]}]};

/** Supply Intake capabilities that wait for the owner, with their decisions and switches. */
export async function listSupplyIntakePolicies(): Promise<SupplyIntakePolicies> {
  if (dataMode() === "sample") return structuredClone(samplePolicies);
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await import("../../../../generated/validators/adminCallableValidators");
  validateAdminCallableRequest("adminListSupplyIntakePolicies", {});
  const result = await httpsCallable<Record<string, never>, SupplyIntakePolicies>(functions,
    "adminListSupplyIntakePolicies")({});
  validateAdminCallableResponse("adminListSupplyIntakePolicies", result.data);
  return result.data;
}

/** Records the owner's decision; it switches nothing on by itself. */
export function decideSupplyIntakePolicy(input: SupplyIntakePolicyDecision) {
  return decideOrganizerPolicyGap({...input, requiredInputsReviewed: input.decision === "accept" ?
    ["capability_and_limits", "cost_and_safety", "implementation_owner"] : []});
}
