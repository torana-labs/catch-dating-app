import {activeMarket} from "@content/markets";
import type {HostListing, HostListingCatchEvent, HostListingExternalEvent} from "./types";
import {organizerPolicyForListing} from "./organizerPolicy";

export type OrganizerStatusFilter = "all" | "verified" | "claimed" | "unclaimed";
export type OrganizerSort = "relevance" | "reviews" | "rating" | "upcoming" | "confidence";

export interface OrganizerDirectoryFilters {
  query: string;
  statusFilter: OrganizerStatusFilter;
  formatFilter: string;
  cityFilter: string;
  upcomingOnly: boolean;
  minRating: number;
  sort: OrganizerSort;
}

export const organizerStatusFilters: OrganizerStatusFilter[] = [
  "all",
  "verified",
  "claimed",
  "unclaimed",
];

export const organizerSortOptions: OrganizerSort[] = [
  "relevance",
  "reviews",
  "rating",
  "upcoming",
  "confidence",
];

const organizerSearchTextCache = new WeakMap<HostListing, string>();

type OrganizerFilterSearchSource = string | URLSearchParams;

export function defaultOrganizerDirectoryFilters(): OrganizerDirectoryFilters {
  return {
    query: "",
    statusFilter: "all",
    formatFilter: "all",
    cityFilter: "all",
    upcomingOnly: false,
    minRating: 0,
    sort: "relevance",
  };
}

export function readOrganizerFiltersFromUrl(
  cityOptions: string[],
  formatOptions: string[],
  search: OrganizerFilterSearchSource = ""
): OrganizerDirectoryFilters {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const status = params.get("status");
  const sort = params.get("sort");
  const city = params.get("city");
  const format = params.get("format");
  const rating = Number(params.get("rating") ?? 0);
  return {
    query: (params.get("q") ?? "").slice(0,120),
    statusFilter: isOrganizerStatusFilter(status) ? status : "all",
    formatFilter: filterOptionValue(format, formatOptions),
    cityFilter: filterOptionValue(city, cityOptions),
    upcomingOnly: ["1", "true", "yes"].includes((params.get("upcoming") ?? "").toLowerCase()),
    minRating: [4, 4.5].includes(rating) ? rating : 0,
    sort: isOrganizerSort(sort) ? sort : "relevance",
  };
}

export function organizerDirectorySearchParams(filters: OrganizerDirectoryFilters) {
  const params = new URLSearchParams();
  const query = filters.query.slice(0,120);
  if (query.trim()) params.set("q", query);
  if (filters.cityFilter !== "all") params.set("city", filters.cityFilter);
  if (filters.formatFilter !== "all") params.set("format", filters.formatFilter);
  if (filters.statusFilter !== "all") params.set("status", filters.statusFilter);
  if (filters.upcomingOnly) params.set("upcoming", "true");
  if (filters.minRating > 0) params.set("rating", String(filters.minRating));
  if (filters.sort !== "relevance") params.set("sort", filters.sort);
  return params;
}

export function organizerAppearanceContext(filters: OrganizerDirectoryFilters) {
  return [
    filters.query.trim().toLowerCase(),
    filters.statusFilter,
    filters.formatFilter,
    filters.cityFilter,
    filters.upcomingOnly ? "upcoming" : "all-dates",
    filters.minRating,
    filters.sort,
  ].join("|");
}

export function organizerDirectorySearchText(listing: HostListing) {
  const cached = organizerSearchTextCache.get(listing);
  if (cached) return cached;
  const policy = organizerPolicyForListing(listing);
  const text = [
    listing.searchText,
    listing.name,
    listing.city,
    listing.region,
    listing.country,
    listing.category,
    policy.badge.label,
    listing.headline,
    listing.description,
    listing.sourceSummary,
    listing.host?.name,
    listing.host?.role,
    ...(listing.formats ?? []),
    ...publicFactsForListing(listing).map((fact) => `${fact.label} ${fact.value}`),
    ...listing.sources.map((source) => `${source.label} ${source.detail} ${source.type}`),
    ...(listing.eventEvidence ?? []).flatMap((event) => [
      event.title,
      event.date,
      event.location,
      event.summary,
      event.sourceLabel,
      ...(event.facts ?? []),
    ]),
    ...(listing.catchEvents ?? []).flatMap((event) => [
      event.title,
      event.role,
      event.activityKind,
      event.timeline,
      event.date,
      event.location,
      event.summary,
      event.priceLabel,
    ]),
    ...(listing.externalEvents ?? []).flatMap((event) => [
      event.title,
      event.activityKind,
      event.date,
      event.location,
      event.summary,
      event.priceLabel,
      event.sourceLabel,
      event.dedupeKey,
    ]),
  ].filter(Boolean).join(" ").toLowerCase();
  organizerSearchTextCache.set(listing, text);
  return text;
}

export function nextFutureCatchEvent(listing: HostListing): {title: string} | null {
  const metricTime = listing.metrics?.nextEventAt ?
    Date.parse(listing.metrics.nextEventAt) :
    Number.NaN;
  if (Number.isFinite(metricTime) && metricTime >= Date.now()) {
    return {title: listing.metrics?.nextEventLabel ?? "Upcoming Catch event"};
  }

  let nearestEvent: HostListingCatchEvent | null = null;
  let nearestTime = Number.POSITIVE_INFINITY;
  for (const event of listing.catchEvents ?? []) {
    const startTime = Date.parse(event.startTime);
    if (!Number.isFinite(startTime) || startTime < Date.now()) continue;
    if (startTime >= nearestTime) continue;
    nearestTime = startTime;
    nearestEvent = event;
  }
  return nearestEvent ? {title: nearestEvent.title} : nextFutureExternalEvent(listing);
}

export function isFutureCatchEvent(event: HostListingCatchEvent) {
  const startTime = Date.parse(event.startTime);
  return Number.isFinite(startTime) && startTime >= Date.now();
}

export function nextFutureExternalEvent(listing: HostListing): {title: string} | null {
  let nearestEvent: HostListingExternalEvent | null = null;
  let nearestTime = Number.POSITIVE_INFINITY;
  for (const event of listing.externalEvents ?? []) {
    const startTime = Date.parse(event.startTime);
    if (!Number.isFinite(startTime) || startTime < Date.now()) continue;
    if (startTime >= nearestTime) continue;
    nearestTime = startTime;
    nearestEvent = event;
  }
  return nearestEvent ? {title: nearestEvent.title} : null;
}

export function hasAnyEventSignal(listing: HostListing) {
  return Boolean(
    listing.catchEvents?.length ||
    listing.externalEvents?.length ||
    listing.eventEvidence?.length
  );
}

export function isVerifiedListing(listing: HostListing) {
  const policy = organizerPolicyForListing(listing);
  return ["firstParty", "ownerVerified"].includes(policy.trustState);
}

export function isPubliclyReadableListing(listing: HostListing) {
  return organizerPolicyForListing(listing).isPubliclyReadable;
}

export function isUnclaimedListing(listing: HostListing) {
  return organizerPolicyForListing(listing).claimState === "unclaimed";
}

export function isClaimedListing(listing: HostListing) {
  const policy = organizerPolicyForListing(listing);
  return ["claimed", "verified"].includes(policy.claimState) ||
    ["claimed", "transferred", "userCreated"].includes(policy.ownershipState);
}

export function publicFactsForListing(listing: HostListing) {
  if (organizerPolicyForListing(listing).canReadPublicReviews) {
    return listing.facts;
  }
  return listing.facts.filter((fact) =>
    !/(?:rating|review)/iu.test(`${fact.label} ${fact.value}`)
  );
}

export function isPublicApiEnabled(listing: HostListing) {
  return listing.publicApi.state === "enabled";
}

export function isClaimSubmissionEnabledListing(listing: HostListing) {
  return organizerPolicyForListing(listing).canRequestClaim;
}

export function hasUpcomingCatchEvent(listing: HostListing) {
  return Boolean(nextFutureCatchEvent(listing) || nextFutureExternalEvent(listing));
}

export function listingProfileStrength(listing: HostListing) {
  const canReadPublicReviews =
    organizerPolicyForListing(listing).canReadPublicReviews;
  if (isVerifiedListing(listing)) {
    let value = 72;
    if (listing.catchEvents?.length) value += 8;
    if (canReadPublicReviews && (listing.metrics?.reviewCount ?? 0) > 0) {
      value += 7;
    }
    if (listing.host) value += 5;
    return Math.min(value, 96);
  }
  let value = listing.sourceConfidence === "high" ? 38 : 30;
  value += Math.min(listing.sources.length * 3, 9);
  value += Math.min((listing.eventEvidence?.length ?? 0) * 4, 8);
  value += Math.min((listing.externalEvents?.length ?? 0) * 4, 8);
  value -= Math.min(listing.missingEvidence.length * 2, 12);
  return Math.max(24, Math.min(value, 55));
}

export function compareListings(a: HostListing, b: HostListing, sort: OrganizerSort) {
  if (sort === "reviews") {
    const aCount = organizerPolicyForListing(a).canReadPublicReviews ?
      a.metrics?.reviewCount ?? 0 : 0;
    const bCount = organizerPolicyForListing(b).canReadPublicReviews ?
      b.metrics?.reviewCount ?? 0 : 0;
    return bCount - aCount;
  }
  if (sort === "rating") {
    const aRating = organizerPolicyForListing(a).canReadPublicReviews ?
      a.metrics?.rating ?? 0 : 0;
    const bRating = organizerPolicyForListing(b).canReadPublicReviews ?
      b.metrics?.rating ?? 0 : 0;
    return bRating - aRating;
  }
  if (sort === "upcoming") {
    return Number(hasUpcomingCatchEvent(b)) - Number(hasUpcomingCatchEvent(a));
  }
  if (sort === "confidence") {
    return confidenceRank(b.sourceConfidence) - confidenceRank(a.sourceConfidence);
  }
  return listingProfileStrength(b) - listingProfileStrength(a);
}

function filterOptionValue(value: string | null, options: string[]) {
  return value && options.includes(value) ? value : "all";
}

function isOrganizerStatusFilter(value: string | null): value is OrganizerStatusFilter {
  return organizerStatusFilters.includes(value as OrganizerStatusFilter);
}

function isOrganizerSort(value: string | null): value is OrganizerSort {
  return organizerSortOptions.includes(value as OrganizerSort);
}

function confidenceRank(value: string) {
  if (value === "first_party") return 4;
  if (value === "high") return 3;
  if (value === "medium") return 2;
  if (value === "low") return 1;
  return 0;
}

/** Stable city choices include empty markets; available activity labels come from public profiles. */
export function organizerDirectoryOptions(listings: readonly HostListing[]) {
  const publicListings = listings.filter(isPubliclyReadableListing);
  return {
    cityOptions: [...new Set([...activeMarket.cities.map(city => city.label), ...publicListings.map(listing => listing.city)])].sort(),
    formatOptions: [...new Set(publicListings.flatMap(listing => listing.formats))].sort(),
  };
}
