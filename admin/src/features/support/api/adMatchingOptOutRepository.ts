import {httpsCallable} from "firebase/functions";
import {loadAdminCallableValidators} from
  "../../../generated/validators/adminCallableValidators";
import type {AdminManageAdMatchingOptOutCallablePayload} from
  "../../../generated/contracts/adminManageAdMatchingOptOutCallablePayload";
import type {AdminManageAdMatchingOptOutCallableResponse} from
  "../../../generated/contracts/adminManageAdMatchingOptOutCallableResponse";
import {dataMode} from "../../../shared/api/dataMode";
import {functions} from "../../../shared/api/firebaseFunctions";

/**
 * Ad-matching opt-outs (docs/ads_conversion_spec.md): a person who asks
 * support to stop sending their data to advertising partners. The server
 * hashes the phone and email; the response names only the kinds.
 */
export type AdMatchingOptOutRequest = AdminManageAdMatchingOptOutCallablePayload;
export type AdMatchingOptOutAction = AdMatchingOptOutRequest["action"];
export type AdMatchingOptOutResult = AdminManageAdMatchingOptOutCallableResponse;
export type AdMatchingKind = AdMatchingOptOutResult["kinds"][number];

const CALLABLE = "adminManageAdMatchingOptOut";

/** Checks, records or removes an opt-out for a phone and/or email. */
export async function manageAdMatchingOptOut(
  payload: AdMatchingOptOutRequest
): Promise<AdMatchingOptOutResult> {
  if (dataMode() === "sample") {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    return sampleManage(payload);
  }
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await loadAdminCallableValidators(CALLABLE);
  validateAdminCallableRequest(CALLABLE, payload);
  const response = await httpsCallable<AdMatchingOptOutRequest,
    AdMatchingOptOutResult>(functions, CALLABLE)(payload);
  validateAdminCallableResponse(CALLABLE, response.data);
  return response.data;
}

// Sample mode keeps opted-out identifiers in memory for the session only.
const sampleOptOuts = new Set<string>();

export function resetSampleAdMatchingOptOuts() {
  sampleOptOuts.clear();
}

function sampleManage(payload: AdMatchingOptOutRequest):
  AdMatchingOptOutResult {
  const entries: Array<[AdMatchingKind, string]> = [];
  const phone = payload.phone?.replace(/[^\d]/gu, "").slice(-10);
  if (phone) entries.push(["phone", `phone:${phone}`]);
  const email = payload.email?.trim().toLowerCase();
  if (email) entries.push(["email", `email:${email}`]);
  const changed: AdMatchingKind[] = [];
  for (const [kind, key] of entries) {
    if (payload.action === "record" && !sampleOptOuts.has(key)) {
      sampleOptOuts.add(key);
      changed.push(kind);
    }
    if (payload.action === "remove" && sampleOptOuts.delete(key)) {
      changed.push(kind);
    }
  }
  return {action: payload.action, kinds: entries.map(([kind]) => kind),
    changed, optedOut: entries.filter(([, key]) => sampleOptOuts.has(key))
      .map(([kind]) => kind)};
}
