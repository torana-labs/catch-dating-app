import {httpsCallable} from "firebase/functions";
import {loadAdminCallableValidators} from
  "../../../generated/validators/adminCallableValidators";
import {functions} from "../../../shared/api/firebaseFunctions";
import {dataMode} from "../../../shared/api/dataMode";
export interface SalesFunnelReport {
  schemaVersion: 1; asOf: string; since: string;
  coverage: "complete_bounded_snapshot";
  activeHosts: number; opportunities: number; hostsWithOpportunities: number;
  stages: Array<{stage: string; opportunities: number; distinctHosts: number;
    enteredInWindow: number; distinctHostsEntered: number}>;
  overdueOpportunities: number; hostsWithOverdueOpportunities: number;
  opportunitiesMissingNextStep: number; openObligations: number;
  overdueObligations: number; heldHosts: number; duplicateReviewHosts: number;
  excludedArchivedOrRestrictedHosts: number; movementEvents: number;
  revenueStatus: "not_calculated";
}
export async function getSalesFunnelReport(since: string): Promise<SalesFunnelReport> {
  if (dataMode() === "sample") throw new Error("Company reporting requires live Sales records.");
  const name = "adminGetSalesFunnelReport";
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await loadAdminCallableValidators(name);
  validateAdminCallableRequest(name, {since});
  const result = await httpsCallable<{since: string}, SalesFunnelReport>(functions, name)({since});
  validateAdminCallableResponse(name, result.data);
  return result.data;
}
