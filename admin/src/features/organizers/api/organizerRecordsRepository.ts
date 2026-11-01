import {
  getOrganizerOverview,
  listOrganizerDirectory,
} from "../../../shared/api/adminApi";
import {httpsCallable} from "firebase/functions";
import {dataMode} from "../../../shared/api/dataMode";
import {functions} from "../../../shared/api/firebaseFunctions";
import type {AdminRefreshOrganizerEventsCallablePayload} from
  "../../../generated/contracts/adminRefreshOrganizerEventsCallablePayload";
import type {AdminRefreshOrganizerEventsCallableResponse} from
  "../../../generated/contracts/adminRefreshOrganizerEventsCallableResponse";
import type {AdminGetOrganizerOverviewCallableResponse} from
  "../../../generated/contracts/adminGetOrganizerOverviewCallableResponse";
import type {AdminListOrganizerDirectoryCallablePayload} from
  "../../../generated/contracts/adminListOrganizerDirectoryCallablePayload";
import type {AdminListOrganizerDirectoryCallableResponse} from
  "../../../generated/contracts/adminListOrganizerDirectoryCallableResponse";

export type OrganizerDirectoryQuery = AdminListOrganizerDirectoryCallablePayload;
export type OrganizerDirectoryPage = AdminListOrganizerDirectoryCallableResponse;
export type OrganizerDirectoryRow = OrganizerDirectoryPage["rows"][number];
export type OrganizerOverview = AdminGetOrganizerOverviewCallableResponse;
export type OrganizerJourneyStep = OrganizerOverview["journey"][number];

export function loadOrganizerDirectory(
  query: OrganizerDirectoryQuery
): Promise<OrganizerDirectoryPage> {
  return listOrganizerDirectory(query);
}

export function loadOrganizerOverview(
  organizerId: string
): Promise<OrganizerOverview> {
  return getOrganizerOverview({organizerId});
}

/** Reads new events for a listed, unclaimed organizer from its page's calendar links. */
export async function refreshOrganizerEvents(input: AdminRefreshOrganizerEventsCallablePayload):
Promise<AdminRefreshOrganizerEventsCallableResponse> {
  if (dataMode() === "sample") {
    return {requestId: `refresh-sample-${input.organizerId}`, created: true, status: "queued", urls: ["https://lu.ma/afterfly"]};
  }
  // The validators load on first call, not in the organizers chunk.
  const {validateAdminCallableRequest, validateAdminCallableResponse} =
    await import("../../../generated/validators/adminCallableValidators")
      .then((validators) => validators.loadAdminCallableValidators("adminRefreshOrganizerEvents"));
  validateAdminCallableRequest("adminRefreshOrganizerEvents", input);
  const result = await httpsCallable<typeof input, AdminRefreshOrganizerEventsCallableResponse>(
    functions, "adminRefreshOrganizerEvents")(input);
  validateAdminCallableResponse("adminRefreshOrganizerEvents", result.data);
  return result.data;
}
