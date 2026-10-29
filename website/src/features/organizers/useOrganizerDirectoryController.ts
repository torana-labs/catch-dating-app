import {type FormEvent, useCallback, useMemo} from "react";
import {useSearchParams} from "react-router";
import {trackMarketingEvent} from "../../analytics";
import {trackOrganizerSearchAppearance} from "./analytics";
import {usePublicHostListings} from "./usePublicEventListingsController";
import {
  compareListings,
  organizerDirectoryOptions,
  defaultOrganizerDirectoryFilters,
  hasAnyEventSignal,
  hasUpcomingCatchEvent,
  isClaimSubmissionEnabledListing,
  isClaimedListing,
  isPubliclyReadableListing,
  isUnclaimedListing,
  isVerifiedListing,
  organizerAppearanceContext,
  organizerDirectorySearchText,
  organizerDirectorySearchParams,
  readOrganizerFiltersFromUrl,
  type OrganizerDirectoryFilters,
  type OrganizerSort,
  type OrganizerStatusFilter,
} from "./selectors";
import type {HostListing} from "./types";
import {organizerPolicyForListing} from "./organizerPolicy";

type FieldUpdater<T> = T | ((current: T) => T);

export function useOrganizerDirectoryController(
  sourceListings?: readonly HostListing[]
) {
  const live = usePublicHostListings();
  const effectiveListings = sourceListings ?? live.listings;
  const [searchParams, setSearchParams] = useSearchParams();
  const publicListings = useMemo(
    () => effectiveListings.filter(isPubliclyReadableListing),
    [effectiveListings]
  );
  const {cityOptions, formatOptions} = useMemo(() => organizerDirectoryOptions(publicListings), [publicListings]);
  const currentFilters = useMemo(
    () => readOrganizerFiltersFromUrl(cityOptions, formatOptions, searchParams),
    [cityOptions, formatOptions, searchParams]
  );
  const {
    cityFilter,
    formatFilter,
    minRating,
    query,
    sort,
    statusFilter,
    upcomingOnly,
  } = currentFilters;
  const normalizedQuery = query.trim().toLowerCase();
  const queryTerms = useMemo(
    () => normalizedQuery.split(/\s+/).filter(Boolean),
    [normalizedQuery]
  );
  const appearanceContext = organizerAppearanceContext(currentFilters);

  const updateFilters = useCallback((
    updater: OrganizerDirectoryFilters | ((current: OrganizerDirectoryFilters) => OrganizerDirectoryFilters)
  ) => {
    const next = typeof updater === "function" ? updater(currentFilters) : updater;
    setSearchParams(organizerDirectorySearchParams(next), {replace: true});
  }, [currentFilters, setSearchParams]);

  const setQuery = useCallback((next: FieldUpdater<string>) => {
    updateFilters((current) => ({
      ...current,
      query: resolveFieldUpdate(next, current.query),
    }));
  }, [updateFilters]);

  const setStatusFilter = useCallback((next: FieldUpdater<OrganizerStatusFilter>) => {
    updateFilters((current) => ({
      ...current,
      statusFilter: resolveFieldUpdate(next, current.statusFilter),
    }));
  }, [updateFilters]);

  const setFormatFilter = useCallback((next: FieldUpdater<string>) => {
    updateFilters((current) => ({
      ...current,
      formatFilter: resolveFieldUpdate(next, current.formatFilter),
    }));
  }, [updateFilters]);

  const setCityFilter = useCallback((next: FieldUpdater<string>) => {
    updateFilters((current) => ({
      ...current,
      cityFilter: resolveFieldUpdate(next, current.cityFilter),
    }));
  }, [updateFilters]);

  const setUpcomingOnly = useCallback((next: FieldUpdater<boolean>) => {
    updateFilters((current) => ({
      ...current,
      upcomingOnly: resolveFieldUpdate(next, current.upcomingOnly),
    }));
  }, [updateFilters]);

  const setMinRating = useCallback((next: FieldUpdater<number>) => {
    updateFilters((current) => ({
      ...current,
      minRating: resolveFieldUpdate(next, current.minRating),
    }));
  }, [updateFilters]);

  const setSort = useCallback((next: FieldUpdater<OrganizerSort>) => {
    updateFilters((current) => ({
      ...current,
      sort: resolveFieldUpdate(next, current.sort),
    }));
  }, [updateFilters]);

  const results = useMemo(() => {
    const filtered = publicListings.filter((listing) => {
      const haystack = organizerDirectorySearchText(listing);
      if (queryTerms.length && !queryTerms.every((term) => haystack.includes(term))) return false;
      if (statusFilter === "verified" && !isVerifiedListing(listing)) return false;
      if (statusFilter === "claimed" && !isClaimedListing(listing)) return false;
      if (statusFilter === "unclaimed" && !isUnclaimedListing(listing)) return false;
      if (formatFilter !== "all" && !listing.formats.includes(formatFilter)) return false;
      if (cityFilter !== "all" && listing.city !== cityFilter) return false;
      if (upcomingOnly && !hasUpcomingCatchEvent(listing)) return false;
      if (
        minRating > 0 &&
        (
          !organizerPolicyForListing(listing).canReadPublicReviews ||
          (listing.metrics?.rating ?? 0) < minRating
        )
      ) return false;
      return true;
    });
    return filtered.slice().sort((a, b) => compareListings(a, b, sort));
  }, [cityFilter, formatFilter, minRating, publicListings, queryTerms, sort, statusFilter, upcomingOnly]);

  const summary = useMemo(() => {
    let verifiedCount = 0;
    let unclaimedCount = 0;
    let eventBackedCount = 0;
    const claimableListings: HostListing[] = [];
    for (const listing of publicListings) {
      if (isVerifiedListing(listing)) verifiedCount += 1;
      if (isUnclaimedListing(listing)) {
        unclaimedCount += 1;
        if (
          claimableListings.length < 3 &&
          isClaimSubmissionEnabledListing(listing)
        ) claimableListings.push(listing);
      }
      if (hasAnyEventSignal(listing)) eventBackedCount += 1;
    }
    return {
      claimableListings,
      eventBackedCount,
      profileCount: publicListings.length,
      unclaimedCount,
      verifiedCount,
    };
  }, [publicListings]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    trackMarketingEvent("organizer_search_submitted", {
      query: normalizedQuery,
      result_count: results.length,
      city_filter: cityFilter,
      format_filter: formatFilter,
      status_filter: statusFilter,
      upcoming_only: upcomingOnly,
      min_rating: minRating,
      sort,
    });
    results.slice(0, 20).forEach((listing) =>
      trackOrganizerSearchAppearance(listing, appearanceContext)
    );
  }

  function clearFilters() {
    const next = defaultOrganizerDirectoryFilters();
    updateFilters(next);
    trackMarketingEvent("organizer_search_filters_cleared", {});
  }

  return {
    phase: sourceListings ? "ready" as const : live.phase,
    appearanceContext,
    cityFilter,
    cityOptions,
    clearFilters,
    currentFilters,
    formatFilter,
    formatOptions,
    handleSearch,
    minRating,
    normalizedQuery,
    query,
    queryTerms,
    results,
    setCityFilter,
    setFormatFilter,
    setMinRating,
    setQuery,
    setSort,
    setStatusFilter,
    setUpcomingOnly,
    sort,
    statusFilter,
    summary,
    upcomingOnly,
  };
}


function resolveFieldUpdate<T>(updater: FieldUpdater<T>, current: T) {
  return typeof updater === "function" ?
    (updater as (current: T) => T)(current) :
    updater;
}
