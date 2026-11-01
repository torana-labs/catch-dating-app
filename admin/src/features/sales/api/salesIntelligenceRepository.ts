import {httpsCallable} from "firebase/functions";
import {loadAdminCallableValidators} from
  "../../../generated/validators/adminCallableValidators";
import {dataMode} from "../../../shared/api/dataMode";
import {functions} from "../../../shared/api/firebaseFunctions";
import {getSalesAccount, listSalesContacts,
  listSalesEvidence} from "./salesRepository";
import type {IntelligenceApi} from "./salesIntelligenceTypes";

async function call<Request, Response>(name: string, payload: Request): Promise<Response> {
  if (dataMode() === "sample") {
    throw new Error("Private intelligence and outreach are unavailable in sample mode.");
  }
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await loadAdminCallableValidators(name);
  validateAdminCallableRequest(name, payload);
  const response = await httpsCallable<Request, Response>(functions, name)(payload);
  validateAdminCallableResponse(name, response.data);
  return response.data;
}

/** All private reads and mutations use server Auth, App Check and strict contracts. */
export const salesIntelligenceApi: IntelligenceApi = {
  catalog: (organizerId) => call("adminGetSalesIntelligenceCatalog", {organizerId}),
  score: (organizerId) => call("adminGetSalesIntelligenceScore", {organizerId}),
  account: getSalesAccount,
  contacts: listSalesContacts,
  evidence: listSalesEvidence,
  drafts: (organizerId) => call("adminListSalesOutreachDrafts", {organizerId}),
  draft: (draftId) => call("adminGetSalesOutreachDraft", {draftId}),
  job: (requestId) => call("adminGetSalesOutreachDraftJob", {requestId}),
  assess: (input) => call("adminSaveSalesFactorAssessment", input),
  savePolicy: (input) => call("adminSaveSalesIntelligencePolicy", input),
  saveClause: (input) => call("adminSaveSalesIntelligenceClause", input),
  reviewClause: (input) => call("adminReviewSalesIntelligenceClause", input),
  generate: (input) => call("adminGenerateSalesOutreachDraft", input),
  review: (input) => call("adminReviewSalesOutreachDraft", input),
  copy: (input) => call("adminCopySalesOutreachDraft", input),
};
