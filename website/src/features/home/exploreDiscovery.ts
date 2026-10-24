import {activeMarket} from "@content/markets";
import {exploreCopy} from "@content/explore";
import {activityKindFromValue} from "@catch/web-ui";
import {homeRouteStateForSearch, categoryForActivity, type HomeCategory} from "./homeDiscovery";
import {buildPublicEventDetailRecords} from "../events/eventDetailModel";
import type {HostListing} from "../organizers/types";
import {publicExperienceActivities} from "../organizers/publicExperience";
export interface ExploreFilters {city: string; category: HomeCategory; query: string; date: "any" | "week" | "month"; experience: boolean}
export function exploreRouteStateForSearch(search: string): ExploreFilters {
  const params = new URLSearchParams(search);
  return {...homeRouteStateForSearch(search), query: (params.get("q") ?? "").trim().slice(0,120), date: params.get("when") === "week" ? "week" : params.get("when") === "month" ? "month" : "any", experience: params.get("experience") === "1"};
}
export function exploreDiscoveryHref(filters: ExploreFilters) {
  const params = new URLSearchParams({city: filters.city});
  if (filters.category !== "all") params.set("format", filters.category);
  if (filters.query) params.set("q", filters.query);
  if (filters.date !== "any") params.set("when", filters.date);
  if (filters.experience) params.set("experience", "1");
  return `/explore/?${params}`;
}
export function buildExploreDiscovery(listings: readonly HostListing[], filters: ExploreFilters, now: number) {
  const city = activeMarket.cities.find(item => item.slug === filters.city) ?? activeMarket.cities[0];
  const cityEvents = buildPublicEventDetailRecords(listings, now).filter(event => {
    const start = Date.parse(event.startTime);
    return Number.isFinite(start) && start > now && event.isUpcoming &&
      [city.label,...city.aliases].some(label => label.toLowerCase() === event.listing.city.toLowerCase());
  }).map(event => {
    const category = categoryForActivity(event.activityKind);
    return {...event, category, experienceActivities: publicExperienceActivities(event.catchExperienceActivities),
      coverActivityKind: activityKindFromValue(event.activityKind),
      availability: event.remainingCapacity === 0 ? exploreCopy.full : event.registrationState === "closed" ? exploreCopy.closed : null};
  }).sort((a,b) => Date.parse(a.startTime)-Date.parse(b.startTime) || a.eventId.localeCompare(b.eventId));
  const terms = filters.query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const deadline = filters.date === "week" ? now+7*86400000 : filters.date === "month" ? now+30*86400000 : Infinity;
  const events = cityEvents.filter(event => (filters.category === "all" || event.category === filters.category) &&
    (!filters.experience || event.experienceActivities.length > 0) && Date.parse(event.startTime) <= deadline &&
    terms.every(term => `${event.title} ${event.listing.name} ${event.location} ${event.activityKind}`.toLocaleLowerCase().includes(term)));
  return {city, cityEvents, events};
}
