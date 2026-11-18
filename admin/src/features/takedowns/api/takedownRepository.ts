import {httpsCallable} from "firebase/functions";
import type {AdminGetTakedownRequestCallableResponse} from
  "../../../generated/contracts/adminGetTakedownRequestCallableResponse";
import type {AdminUpdateTakedownRequestCallablePayload} from
  "../../../generated/contracts/adminUpdateTakedownRequestCallablePayload";
import type {AdminUpdateTakedownRequestCallableResponse} from
  "../../../generated/contracts/adminUpdateTakedownRequestCallableResponse";
import {dataMode} from "../../../shared/api/dataMode";
import {functions} from "../../../shared/api/firebaseFunctions";

export type TakedownDetail = AdminGetTakedownRequestCallableResponse;
export type TakedownRequest = TakedownDetail["request"];
export type TakedownStep = AdminUpdateTakedownRequestCallablePayload;
export type TakedownStatus = TakedownRequest["status"];
export type TakedownType = TakedownRequest["requestType"];
export type TakedownOutcome = TakedownDetail["allowedOutcomes"][number];
export type TakedownDeclineReason = NonNullable<TakedownStep["declineReason"]>;
export type TakedownInfoTemplate = NonNullable<TakedownStep["infoTemplate"]>;

// The validators load on first call, not in the inbox chunk.
async function call<Request extends object, Response>(name: string, payload: Request): Promise<Response> {
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await import("../../../generated/validators/adminCallableValidators")
      .then((validators) => validators.loadAdminCallableValidators(name));
  validateAdminCallableRequest(name, payload);
  const result = await httpsCallable<Request, Response>(functions, name)(payload);
  validateAdminCallableResponse(name, result.data);
  return result.data;
}

/** A fictional request for sample mode and stories: an organiser asks to be removed and not listed again. */
export const sampleTakedownDetail: TakedownDetail = {
  request: {
    requestId: "lr-0123456789abcdef0123456789abcdef01234567",
    reference: "LR-K7Q2M9TX",
    requestType: "removeAndDoNotList",
    status: "acknowledged",
    target: {kind: "organizer", id: "lantern-lane-social", path: null},
    requester: {name: "Asha Verma", role: "owner", email: "asha@lanternlane.example", phone: null, organisation: "Lantern Lane Social"},
    verification: {proofMethod: "domainEmail", officialDomain: "lanternlane.example"},
    declarations: {accurate: true, authorised: true, contactConsent: true},
    context: "We have stopped running public events.",
    outcome: null, declineReason: null, caseId: null, infoRequests: [], appeal: null, deciderUid: null,
    ackDueAt: "2026-11-19T06:00:00.000Z", actionDueAt: "2026-11-19T06:00:00.000Z", resolveDueAt: "2026-11-25T06:00:00.000Z",
    acknowledgedAt: "2026-11-18T07:10:00.000Z", decidedAt: null, closedAt: null, createdAt: "2026-11-18T06:00:00.000Z",
    history: [
      {at: "2026-11-18T06:00:00.000Z", action: "received", byUid: null, status: "received", detail: null},
      {at: "2026-11-18T07:10:00.000Z", action: "acknowledged", byUid: "sample-owner", status: "acknowledged", detail: null},
    ],
  },
  allowedOutcomes: ["removedAndSuppressed"],
  caseOutcomes: ["removedAndSuppressed"],
  canDecide: true,
  canDecideAppeal: false,
};

let sampleDetail = sampleTakedownDetail;

export async function getTakedownRequest(requestId: string): Promise<TakedownDetail> {
  if (dataMode() !== "sample") return call("adminGetTakedownRequest", {requestId});
  return sampleDetail;
}

export async function updateTakedownRequest(step: TakedownStep): Promise<TakedownRequest> {
  if (dataMode() !== "sample") {
    return (await call<TakedownStep, AdminUpdateTakedownRequestCallableResponse>("adminUpdateTakedownRequest", step)).request;
  }
  const status: TakedownStatus = step.action === "acknowledge" ? "acknowledged" : step.action === "requestInfo" ? "verifying" :
    step.action === "action" ? "actioned" : step.action === "decline" ? "declined" : step.action === "recordAppeal" ? "appealed" : "closed";
  sampleDetail = {...sampleDetail, request: {...sampleDetail.request, status, outcome: step.outcome ?? sampleDetail.request.outcome,
    caseId: step.caseId ?? sampleDetail.request.caseId, declineReason: step.declineReason ?? sampleDetail.request.declineReason}};
  return sampleDetail.request;
}
