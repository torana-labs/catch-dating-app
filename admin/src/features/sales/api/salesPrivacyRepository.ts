import {httpsCallable} from "firebase/functions";
import {loadAdminCallableValidators} from
  "../../../generated/validators/adminCallableValidators";
import {dataMode} from "../../../shared/api/dataMode";
import {functions} from "../../../shared/api/firebaseFunctions";
import type {PrivacyApi} from "./salesPrivacyTypes";

async function call<Response>(name: string, payload: unknown): Promise<Response> {
  if (dataMode() === "sample") {
    throw new Error("Private Sales privacy operations require live Admin access.");
  }
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await loadAdminCallableValidators(name);
  validateAdminCallableRequest(name, payload);
  const response = await httpsCallable<unknown, Response>(functions, name)(payload);
  validateAdminCallableResponse(name, response.data);
  return response.data;
}

export const salesPrivacyApi: PrivacyApi = {
  getCase: (organizerId) => call("adminGetSalesPrivacyCase", {organizerId}),
  reviewPolicy: (input) => call("adminReviewSalesPrivacyPolicy", input),
  restrict: (input) => call("adminRestrictSalesOrganizer", input),
  preview: (organizerId) => call("adminPreviewSalesPrivacyPlan", {organizerId}),
  reviewPlan: (input) => call("adminReviewSalesPrivacyPlan", input),
  applyBatch: (input) => call("adminApplySalesPrivacyBatch", input),
};
