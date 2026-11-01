import {httpsCallable} from "firebase/functions";
import {loadAdminCallableValidators} from
  "../../../generated/validators/adminCallableValidators";
import type {AdminGetGrowthCallablePayload} from
  "../../../generated/contracts/adminGetGrowthCallablePayload";
import type {AdminGetGrowthCallableResponse} from
  "../../../generated/contracts/adminGetGrowthCallableResponse";
import type {AdminManageNominatorCreditsCallablePayload} from
  "../../../generated/contracts/adminManageNominatorCreditsCallablePayload";
import type {AdminManageNominatorCreditsCallableResponse} from
  "../../../generated/contracts/adminManageNominatorCreditsCallableResponse";
import {dataMode} from "../../../shared/api/dataMode";
import {functions} from "../../../shared/api/firebaseFunctions";
import {sampleGrowth, sampleNominatorCredits} from "./growthSamples";

export type Growth = AdminGetGrowthCallableResponse;
export type GrowthRange = Growth["range"];
export type NominatorRow = Growth["nominators"][number];
export type NominatorCredits = AdminManageNominatorCreditsCallableResponse;

async function call<Request, Response>(name: string, payload: Request,
  sample: (payload: Request) => Response): Promise<Response> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return sample(payload);
  }
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await loadAdminCallableValidators(name);
  validateAdminCallableRequest(name, payload);
  const response = await httpsCallable<Request, Response>(functions,
    name)(payload);
  validateAdminCallableResponse(name, response.data);
  return response.data;
}

/** Growth for a range: cohorts, channels, nominators, best organizers. */
export function loadGrowth(range: GrowthRange): Promise<Growth> {
  return call<AdminGetGrowthCallablePayload, Growth>("adminGetGrowth",
    {range}, sampleGrowth);
}

/** The nominator credit ledger. */
export function loadNominatorCredits(): Promise<NominatorCredits> {
  return call<AdminManageNominatorCreditsCallablePayload, NominatorCredits>(
    "adminManageNominatorCredits", {action: "list", nominatorUid: null,
      note: null}, sampleNominatorCredits);
}

/** Approves a nominator's owed credit, or records it paid. */
export function actOnNominatorCredit(nominatorUid: string,
  action: "approve" | "markPaid", note: string | null):
  Promise<NominatorCredits> {
  return call<AdminManageNominatorCreditsCallablePayload, NominatorCredits>(
    "adminManageNominatorCredits", {action, nominatorUid,
      note: note?.trim() || null}, sampleNominatorCredits);
}
