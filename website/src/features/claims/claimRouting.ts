import {hostListings} from "../organizers/data";
import {organizerPolicyForListing} from "../organizers/organizerPolicy";
import type {HostListing} from "../organizers/types";

export type ClaimRouteLocation = Pick<Location, "pathname" | "search">;
export type ClaimUrlState =
  | "alreadyClaimed"
  | "claimUnavailable"
  | "pendingClaim"
  | "notFound"
  | null;

export interface ClaimRouteState {
  continuationId?: string;
  lookup: string | null;
  listing: HostListing | null;
  requestId: string | null;
  urlState: ClaimUrlState;
}

export const emptyClaimRouteState: ClaimRouteState = {
  lookup: null,
  listing: null,
  requestId: null,
  urlState: null,
};

export function claimRouteStateForLocation(
  location: ClaimRouteLocation,
  routeListing: string | null | undefined = null
): ClaimRouteState {
  const lookup = getClaimListingLookupFromLocation(location, routeListing);
  const listing = getClaimListingForLookup(lookup);
  const requestId = getClaimRequestIdFromLocation(location);
  const continuationId = new URLSearchParams(location.search).get("continuation");
  return {
    ...(continuationId ? {continuationId} : {}),
    lookup,
    listing,
    requestId,
    urlState: claimUrlStateForListing(listing, lookup),
  };
}

export function getClaimListingForLookup(lookup: string | null) {
  if (!lookup) return null;
  return hostListings.find((listing) =>
    organizerPolicyForListing(listing).isPubliclyReadable &&
    (
      listing.id === lookup ||
      listing.slug === lookup ||
      listing.path === lookup ||
      listing.legacyPaths?.includes(lookup)
    )
  ) ?? null;
}

export function getClaimListingLookupFromLocation(
  location: ClaimRouteLocation,
  routeListing: string | null | undefined = null
) {
  const params = new URLSearchParams(location.search);
  const idOrSlug = params.get("listing") ?? params.get("organizerId");
  const pathParts = location.pathname.split("/").filter(Boolean);
  const pathSlug = normalizedLookup(routeListing) ??
    (pathParts[0] === "claim" ? normalizedLookup(pathParts[1]) : null);
  return normalizedLookup(idOrSlug) ?? pathSlug;
}

export function getClaimRequestIdFromLocation(location: ClaimRouteLocation) {
  const params = new URLSearchParams(location.search);
  return normalizedLookup(params.get("requestId") ?? params.get("claimRequestId"));
}

export function claimUrlStateForListing(
  listing: HostListing | null,
  lookup: string | null
): ClaimUrlState {
  if (lookup && !listing) return "notFound";
  if (listing) {
    const policy = organizerPolicyForListing(listing);
    if (policy.claimState === "claimPending") return "pendingClaim";
    if (
      ["claimed", "verified"].includes(policy.claimState) ||
      ["claimed", "transferred", "userCreated"].includes(policy.ownershipState)
    ) return "alreadyClaimed";
    if (!policy.canRequestClaim) return "claimUnavailable";
  }
  return null;
}

function normalizedLookup(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
