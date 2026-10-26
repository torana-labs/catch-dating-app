import type {WebsiteHostListingProjection} from "../../../../functions/src/shared/generated/websiteHostListingProjection";

export type {OrganizerPublicPageDocument} from "../../../../functions/src/shared/generated/organizerPublicPageDocument";

export type HostListing = WebsiteHostListingProjection;
export type HostListingReview = HostListing["reviews"][number];
export type HostListingCatchEvent = NonNullable<HostListing["catchEvents"]>[number];
export type HostListingExternalEvent = NonNullable<HostListing["externalEvents"]>[number];
export type HostListingEventSuccessSummary =
  NonNullable<HostListing["eventSuccessSummary"]>;

export interface HostListingRoute {
  listing: HostListing;
  isLegacyPath: boolean;
}
