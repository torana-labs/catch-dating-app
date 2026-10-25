import {activityKindFromValue} from "@catch/web-ui/artwork";
import {activeMarket} from "@content/markets";
import {consumerHomeCopy as copy} from "@content/consumerHome";
import {buildPublicEventSummaries} from "../organizers/publicDiscovery";
import {isPubliclyReadableListing} from "../organizers/selectors";
import type {HostListing} from "../organizers/types";

export type HomeCategory = typeof copy.categories[number]["id"];
export function homeRouteStateForSearch(search: string) {
  const params = new URLSearchParams(search);
  const city = activeMarket.cities.find(item => item.slug === params.get("city"))?.slug ?? "mumbai";
  const category = copy.categories.find(item => item.id === params.get("format"))?.id ?? "all";
  return {city, category};
}
export function homeDiscoveryHref(city: string, category: HomeCategory = "all") {
  const query = new URLSearchParams({city});
  if (category !== "all") query.set("format", category);
  return `/explore/?${query}#events`;
}
export function categoryForActivity(kind: string): HomeCategory {
  if (/run|walk|cycling/i.test(kind)) return "runs";
  if (/dinner|food|table/i.test(kind)) return "food";
  if (/quiz|trivia|game/i.test(kind)) return "games";
  if (/pickle|padel|racket|tennis|badminton|sport/i.test(kind)) return "sport";
  if (/bar|crawl|mixer|night/i.test(kind)) return "nights";
  return "all";
}
export function buildHomeDiscovery(listings: readonly HostListing[], citySlug: string, category: HomeCategory, now: number) {
  const city = activeMarket.cities.find(item => item.slug === citySlug) ?? activeMarket.cities[0];
  const publicListings = listings.filter(isPubliclyReadableListing);
  const details = new Map<string, NonNullable<HostListing["catchEvents"]>[number]>(publicListings.flatMap(listing => (listing.catchEvents ?? []).map(event => [`${listing.id}-${event.id}`, event] as const)));
  const cityEvents = buildPublicEventSummaries([...publicListings], {now, cities: activeMarket.cities})
    .filter(event => [city.label, ...city.aliases].some(label => label.toLowerCase() === event.city.toLowerCase()))
    .map(event => {
      const detail = details.get(event.id)!;
      const format = categoryForActivity(detail.activityKind);
      return {...event, category: format, photoUrl: detail.photoUrl ?? null, activityKind: activityKindFromValue(detail.activityKind),
        availability: detail.bookedCount >= detail.capacityLimit ? copy.events.soldOut : detail.publicRegistrationEnabled !== true ? copy.events.closed : null};
    });
  const local = publicListings.filter(listing => listing.citySlug === city.slug);
  const organisers = [...local, ...publicListings.filter(listing => listing.citySlug !== city.slug)].slice(0, 3);
  return {city, cityEvents, events: category === "all" ? cityEvents : cityEvents.filter(event => event.category === category), organisers};
}
