import {httpsCallable} from "firebase/functions";
import type {AdminManageListingProgramCallablePayload} from
  "../../../../generated/contracts/adminManageListingProgramCallablePayload";
import type {AdminManageListingProgramCallableResponse} from
  "../../../../generated/contracts/adminManageListingProgramCallableResponse";
import {dataMode} from "../../../../shared/api/dataMode";
import {functions} from "../../../../shared/api/firebaseFunctions";

export type ListingProgramState = AdminManageListingProgramCallableResponse;
export type ListingFormatReport = NonNullable<ListingProgramState["formatReport"]>;
export interface ListingProgramPauseInput {
  paused: boolean;
  reason: string;
  expectedRevision: number;
}

let sampleState: ListingProgramState = {revision: 0, paused: false, reason: null, updatedAtMillis: null,
  updatedByUid: null, defaultCohortId: "pilot-indore-1", formatReport: null};
const sampleReport: ListingFormatReport = {generatedAtMillis: Date.UTC(2026, 10, 19), live: 42, withFormat: 30,
  withoutFormat: 12, truncated: false, cities: [{citySlug: "indore", live: 12, withFormat: 9, withoutFormat: 3},
    {citySlug: "mumbai", live: 30, withFormat: 21, withoutFormat: 9}]};

async function manage(payload: AdminManageListingProgramCallablePayload): Promise<ListingProgramState> {
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await import("../../../../generated/validators/adminCallableValidators")
      .then((validators) => validators.loadAdminCallableValidators("adminManageListingProgram"));
  validateAdminCallableRequest("adminManageListingProgram", payload);
  const result = await httpsCallable<AdminManageListingProgramCallablePayload, ListingProgramState>(functions,
    "adminManageListingProgram")(payload);
  validateAdminCallableResponse("adminManageListingProgram", result.data);
  return result.data;
}

/** The programmatic listings pause switch: whether nominations and approvals of listings Catch sourced are refused. */
export async function readListingProgram(): Promise<ListingProgramState> {
  if (dataMode() === "sample") return structuredClone(sampleState);
  return manage({action: "read"});
}

/** Pauses or resumes programmatic listings against the revision the owner reviewed. */
export async function setListingProgramPause(input: ListingProgramPauseInput): Promise<ListingProgramState> {
  if (dataMode() === "sample") {
    sampleState = {...sampleState, revision: sampleState.revision + 1, paused: input.paused, reason: input.reason,
      updatedAtMillis: Date.now(), updatedByUid: "sample-owner"};
    return structuredClone(sampleState);
  }
  return manage({action: "set_pause", ...input});
}

/** Counts live organizers by city, with and without a format the city-by-format pages count. Counts only. */
export async function countOrganizersWithoutFormat(): Promise<ListingFormatReport> {
  if (dataMode() === "sample") return structuredClone(sampleReport);
  const result = await manage({action: "format_report"});
  if (!result.formatReport) throw new Error("The format report did not come back. Try again.");
  return result.formatReport;
}
