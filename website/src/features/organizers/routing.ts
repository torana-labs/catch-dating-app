import {hostListings} from "./data";
import {organizerPolicyForListing} from "./organizerPolicy";
import type {HostListing, HostListingRoute} from "./types";

export function getHostListingRouteForPath(
  pathname: string,
  listings: readonly HostListing[] = hostListings
): HostListingRoute | null {
  const normalizedPath = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const canonicalListing = listings.find((listing) =>
    listing.path === normalizedPath
  );
  if (canonicalListing && organizerPolicyForListing(canonicalListing).isPubliclyReadable) {
    return {
      isLegacyPath: false,
      listing: canonicalListing,
    };
  }

  const legacyListing = listings.find((listing) =>
    listing.legacyPaths?.includes(normalizedPath)
  );
  return legacyListing && organizerPolicyForListing(legacyListing).isPubliclyReadable ? {
    isLegacyPath: true,
    listing: legacyListing,
  } : null;
}

export function claimHrefForListing(listing: HostListing) {
  return `/claim/?listing=${encodeURIComponent(listing.id)}`;
}
