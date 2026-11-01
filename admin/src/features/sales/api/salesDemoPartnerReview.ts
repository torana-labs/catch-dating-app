import {httpsCallable} from "firebase/functions";
import {functions} from "../../../shared/api/firebaseFunctions";
import {loadAdminCallableValidators} from
  "../../../generated/validators/adminCallableValidators";
import type {DemoReviewPreview, DemoReviewWording} from "../../../shared/domain/salesDemoReview";
export interface OwnerDemoReview {
  organizerId: string; blueprintId: string; blueprintRevision: number; partnerUid: string;
  assignmentRevision: number; preview: DemoReviewPreview; previewHash: string; sharingRevision: number;
  proposedWording: DemoReviewWording | null; proposalRevision: number; sharingState: "none" | "active" | "withdrawn";
  expiresAt: string | null; sharingCurrent: boolean; maximumExpiresAt: string; evaluatedAt: string;
  sendAuthority: false; capabilityApprovalAuthority: false; organizerControlAuthority: false;
}
export interface OwnerDemoShareInput {requestId: string; blueprintId: string; expectedBlueprintRevision: number;
  expectedSharingRevision: number; partnerUid: string; expectedAssignmentRevision: number;
  expectedPreviewHash: string; decision: "share" | "withdraw"; expiresAt: string | null}
export interface OwnerDemoShareResult {blueprintId: string; blueprintRevision: number; sharingRevision: number;
  sharingState: "active" | "withdrawn"; previewHash: string; expiresAt: string; sendAuthority: false;
  capabilityApprovalAuthority: false; organizerControlAuthority: false}
export interface SalesDemoPartnerReviewApi {
  get(blueprintId: string): Promise<OwnerDemoReview>;
  share(input: OwnerDemoShareInput): Promise<OwnerDemoShareResult>;
}
async function call<T>(name: string, input: unknown): Promise<T> {
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await loadAdminCallableValidators(name);
  validateAdminCallableRequest(name, input);
  const value = (await httpsCallable<unknown, unknown>(functions, name)(input)).data;
  validateAdminCallableResponse(name, value); return value as T;
}
export const salesDemoPartnerReviewApi: SalesDemoPartnerReviewApi = {
  get: (blueprintId) => call<OwnerDemoReview>("adminGetSalesDemoPartnerReview", {blueprintId}).then((value) => {
    if (value.blueprintId !== blueprintId) throw new Error("Preview sharing scope changed."); return value;
  }),
  share: (input) => call<OwnerDemoShareResult>("adminShareSalesDemoPartnerReview", input).then((value) => {
    if (value.blueprintId !== input.blueprintId || value.blueprintRevision !== input.expectedBlueprintRevision ||
        value.previewHash !== input.expectedPreviewHash || value.sharingRevision !== input.expectedSharingRevision + 1 ||
        value.sharingState !== (input.decision === "share" ? "active" : "withdrawn")) {
      throw new Error("Preview sharing response changed. Recover the unchanged request.");
    }
    return value;
  }),
};
