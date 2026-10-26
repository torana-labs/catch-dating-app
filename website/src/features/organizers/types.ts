import type {WebsiteHostListingProjection} from "../../../../functions/src/shared/generated/websiteHostListingProjection";
/** One public event page's read model (eventPublicPage/{eventId}); the event page renders it (CAT-252). */
export type {EventPublicPageDocument} from "../../../../functions/src/shared/generated/eventPublicPageDocument";

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
