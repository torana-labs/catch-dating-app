import {useEffect, useMemo, useRef, useState} from "react";
import {trackCatchAcquisitionEvent} from "../../analytics";
import {usePublicHostListings} from "../organizers/usePublicEventListingsController";
import {
  isClaimSubmissionEnabledListing,
  isPubliclyReadableListing,
} from "../organizers/selectors";
import type {HostListing} from "../organizers/types";
import {emptyClaimRouteState, type ClaimRouteState} from "./claimRouting";

/**
 * Finding the page to claim. A link from an organiser page arrives with the
 * listing chosen; otherwise the organiser searches for it. Claiming the chosen
 * listing is `useInstantClaimController`'s job.
 */
export function useClaimFlowController(routeState: ClaimRouteState = emptyClaimRouteState) {
  const {listings: hostListings} = usePublicHostListings();
  const previousCatalog = useRef(hostListings);
  const preselectedListing = routeState.listing &&
    isPubliclyReadableListing(routeState.listing) ?
    routeState.listing :
    null;
  const claimStarted = useRef(false);
  const [listing, setListing] = useState<HostListing | null>(preselectedListing);
  const [query, setQueryState] = useState(preselectedListing?.name ?? "");

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const claimableListings = hostListings.filter(isClaimSubmissionEnabledListing);
    if (normalized.length <= 1) return claimableListings.slice(0, 5);
    return claimableListings
      .filter((item) =>
        [
          item.name,
          item.category,
          item.city,
          item.region,
          ...item.formats,
        ].join(" ").toLowerCase().includes(normalized)
      )
      .slice(0, 8);
  }, [query, hostListings]);

  useEffect(() => {
    if (previousCatalog.current === hostListings) return;
    previousCatalog.current = hostListings;
    setListing(current => current ? hostListings.find(item => item.id === current.id &&
      isClaimSubmissionEnabledListing(item)) ?? null : null);
  }, [hostListings]);

  function markClaimStarted() {
    if (claimStarted.current) return;
    claimStarted.current = true;
    trackCatchAcquisitionEvent({name: "acquisition_start", form: "claim"});
  }

  function selectListing(nextListing: HostListing) {
    markClaimStarted();
    setListing(nextListing);
    setQueryState(nextListing.name);
  }

  function clearListing() {
    setListing(null);
  }

  function setQuery(nextQuery: string) {
    markClaimStarted();
    setQueryState(nextQuery);
  }

  return {
    activeRequestId: routeState.requestId,
    claimLookup: routeState.lookup,
    claimUrlState: routeState.urlState,
    clearListing,
    listing,
    listingFromLink: Boolean(preselectedListing),
    markClaimStarted,
    query,
    searchResults,
    selectListing,
    setQuery,
  };
}

export type ClaimFlowController = ReturnType<typeof useClaimFlowController>;
