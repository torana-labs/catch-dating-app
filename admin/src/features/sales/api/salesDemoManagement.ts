import {loadAdminCallableValidators} from
  "../../../generated/validators/adminCallableValidators";
import {httpsCallable} from "firebase/functions";
import {functions} from "../../../shared/api/firebaseFunctions";
import {dataMode} from "../../../shared/api/dataMode";

export type DemoDisposition = "exact" | "manual" | "retained" | "unsupported";
export type DemoReviewArea = "questionTypes" | "branching" |
  "requiredFields" | "scoringApproval" | "uploads";
export type DemoCapabilityReview = Record<DemoReviewArea, DemoDisposition>;
export interface DemoFieldMapping {
  sourceField: string;
  catchField: string | null;
  disposition: DemoDisposition;
}
export interface DemoPreviewCopy {
  brandName: string;
  headline: string;
  scenario: string;
  steps: string[];
  retainedTools: string[];
  limitations: string[];
  cta: string;
}
export interface DemoCapability {
  capability: "synthetic_forms_v1";
  revision: string;
  evidenceRevision: string;
  enabled: boolean;
  templateOptions: Array<{templateId: string; title: string}>;
}
export type DemoSetupPlanInput = {mode: "manual"; requirements: string[]} |
  {mode: "template"; requirements: string[]; templateId: string; title: string};
export type DemoSetupPlan = DemoSetupPlanInput & {
  templateVersion?: number; templateHash?: string; materializerVersion?: 1;
};
export interface DemoBlueprint {
  blueprintId: string;
  revision: number;
  state: "draft" | "reviewed" | "withdrawn";
  organizerId: string | null;
  candidateId: string | null;
  opportunityId: string | null;
  capabilityRevision: string;
  evidenceRevision: string;
  formCapabilityReview: DemoCapabilityReview;
  fieldMappings: DemoFieldMapping[];
  setupPlan?: DemoSetupPlan;
  preview: DemoPreviewCopy;
  reviewedAt: string | null;
  updatedAt: string;
}
export interface DemoInvitation {
  invitationId: string;
  blueprintId: string;
  blueprintRevision: number;
  expiresAt: string;
  revoked: boolean;
  revision: number;
  sessionCap: number;
  sessionCount: number;
  issuedAt: string;
  revokedAt?: string;
}
export interface DemoChange {
  requestId: string;
  blueprintId: string;
  expectedRevision: number;
}
export interface DemoSaveInput extends DemoChange {
  organizerId: string | null;
  candidateId: string | null;
  opportunityId: string | null;
  evidenceRevision: string;
  preview: DemoPreviewCopy;
  formCapabilityReview: DemoCapabilityReview;
  fieldMappings: DemoFieldMapping[];
  setupPlan: DemoSetupPlanInput;
}
export interface DemoIssueInput {
  requestId: string;
  blueprintId: string;
  blueprintRevision: number;
  contactBinding: {kind: "email" | "phone"; value: string} | null;
  expiresAt: string;
  sessionCap: number;
}
export interface DemoIssueResult {
  invitationId: string;
  blueprintId: string;
  blueprintRevision: number;
  previewOnly: boolean;
  expiresAt: string;
  revision: number;
  grantToken: string;
}

export interface DemoManagementApi {
  capability(): Promise<DemoCapability>;
  listBlueprints(input: {organizerId: string; cursor?: string; limit?: number}):
    Promise<{rows: DemoBlueprint[]; nextCursor: string | null}>;
  listInvitations(input: {blueprintId: string; cursor?: string; limit?: number}):
    Promise<{rows: DemoInvitation[]; nextCursor: string | null}>;
  getBlueprint(blueprintId: string): Promise<DemoBlueprint>;
  getInvitation(invitationId: string): Promise<DemoInvitation>;
  saveBlueprint(input: DemoSaveInput): Promise<Pick<DemoBlueprint,
    "blueprintId" | "revision" | "state">>;
  reviewBlueprint(input: DemoChange): Promise<Pick<DemoBlueprint,
    "blueprintId" | "revision" | "state" | "reviewedAt">>;
  withdrawBlueprint(input: DemoChange): Promise<Pick<DemoBlueprint,
    "blueprintId" | "revision" | "state">>;
  issueInvitation(input: DemoIssueInput): Promise<DemoIssueResult>;
  revokeInvitation(input: {requestId: string; invitationId: string;
    expectedRevision: number}): Promise<Pick<DemoInvitation,
      "invitationId" | "revision" | "revoked" | "revokedAt">>;
}

async function call<Request, Response>(name: string, payload: Request): Promise<Response> {
  if (dataMode() === "sample") {
    throw new Error("Private demos are unavailable in sample mode.");
  }
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await loadAdminCallableValidators(name);
  validateAdminCallableRequest(name, payload);
  return httpsCallable<Request, Response>(functions, name)(payload)
    .then((result) => {
      validateAdminCallableResponse(name, result.data);
      return result.data;
    });
}

/** The capability read is a narrow server-owned addition pending integration. */
export const salesDemoManagementApi: DemoManagementApi = {
  capability: () => call("adminGetSalesDemoCapability", {}),
  listBlueprints: (input) => call("adminListSalesDemoBlueprints", input),
  listInvitations: (input) => call("adminListSalesDemoInvitations", input),
  getBlueprint: (blueprintId) =>
    call("adminGetSalesDemoBlueprint", {blueprintId}),
  getInvitation: (invitationId) =>
    call("adminGetSalesDemoInvitation", {invitationId}),
  saveBlueprint: (input) => call("adminSaveSalesDemoBlueprint", input),
  reviewBlueprint: (input) => call("adminReviewSalesDemoBlueprint", input),
  withdrawBlueprint: (input) => call("adminWithdrawSalesDemoBlueprint", input),
  issueInvitation: (input) => call("adminIssueSalesDemoInvitation", input),
  revokeInvitation: (input) => call("adminRevokeSalesDemoInvitation", input),
};
