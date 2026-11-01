import {
  getOrganizerOverview,
  listOrganizerDirectory,
} from "../../../shared/api/adminApi";
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
