import {catchFormatOf} from "@catch/web-ui/artwork";
import type {MarketCity} from "@content/markets/types";
import {eligibleHomeCatchEvents} from "../organizers/homeEventEligibility";
import {eventDeepLinkForListing} from "../organizers/publicDiscovery";
import {isPubliclyReadableListing} from "../organizers/selectors";
import type {HostListing, HostListingCatchEvent} from "../organizers/types";
import type {HomeCityPlans, HomeFormat, HomeOrganizer, HomePlan} from "./homeTypes";

const day = 24 * 60 * 60 * 1000;
// The read model's window and live threshold (functions/src/cityPlans).
const windowDays = 14;
const livePlanMinimum = 4;
const planLimit = 120;
const organizerLimit = 24;
const formats: HomeFormat[] = ["run", "dinner", "games", "courts", "nightsOut", "other"];

/**
 * A city's plans from the public catalog, for an environment whose Functions
 * have not built its cityPlans document yet (prod deploys on approval). It
 * keeps the website reader's publication and home eligibility rules, and the
 * read model's window, threshold and ordering, so the page renders the same
 * either way. Imported plans are left out: only the read model carries them.
 */
export function cityPlansFromListings(
  listings: readonly HostListing[], city: MarketCity, cities: readonly MarketCity[], now: number,
): HomeCityPlans {
  const windowEnd = now + windowDays * day;
  const readable = listings.filter(isPubliclyReadableListing);
  const rows = eligibleHomeCatchEvents<HostListingCatchEvent, HostListing>(readable, {now, cities})
    .filter(({listing, sortTime}) => cityOf(listing, cities)?.id === city.id && sortTime < windowEnd);
  const plans: HomePlan[] = rows.map(({listing, event}) => ({
    source: "catch",
    eventId: event.id,
    path: eventDeepLinkForListing(listing, event),
    title: event.title,
    format: catchFormatOf(event.activityKind) ?? "other",
    activityKind: event.activityKind,
    startTime: event.startTime,
    endTime: event.endTime ?? null,
    date: event.date,
    location: event.location,
    priceLabel: event.priceLabel,
    photoUrl: event.photoUrl ?? null,
    spotsLeft: Math.max(0, event.capacityLimit - event.bookedCount),
    organizer: {organizerId: listing.id, name: listing.name, path: listing.path},
  }));
  const formatCounts = Object.fromEntries(formats.map((format) => [format, 0])) as Record<HomeFormat, number>;
  for (const plan of plans) formatCounts[plan.format]++;
  const launched = city.status === "live";
  const organizers = launched ? readable.filter((listing) => cityOf(listing, cities)?.id === city.id)
    .map((listing): HomeOrganizer => {
      const own = plans.filter((plan) => plan.organizer.organizerId === listing.id);
      const next = own[0];
      return {
        organizerId: listing.id,
        name: listing.name,
        path: listing.path,
        category: listing.category,
        logo: listing.logo as HomeOrganizer["logo"],
        formats: formats.filter((format) => own.some((plan) => plan.format === format)),
        followerCount: listing.metrics?.followerCount ?? 0,
        claimState: listing.authority.claimState as HomeOrganizer["claimState"],
        upcomingPlanCount: own.length,
        nextPlan: next ? {eventId: next.eventId, path: next.path, title: next.title, startTime: next.startTime, date: next.date} : null,
      };
    })
    .sort((a, b) => nextStart(a) - nextStart(b) || b.followerCount - a.followerCount ||
      (a.organizerId < b.organizerId ? -1 : 1)) : [];
  return {
    citySlug: city.marketSlug,
    cityLabel: city.label,
    marketStatus: launched ? "launched" : "planned",
    status: launched && plans.length >= livePlanMinimum ? "live" : "launchingSoon",
    windowStart: new Date(now).toISOString(),
    windowEnd: new Date(windowEnd).toISOString(),
    planCount: plans.length,
    formatCounts,
    plans: plans.slice(0, planLimit),
    organizers: organizers.slice(0, organizerLimit),
  };
}

function cityOf(listing: HostListing, cities: readonly MarketCity[]) {
  const key = listing.city.trim().toLocaleLowerCase("en-IN");
  return cities.find((city) => [city.label, ...city.aliases].some((label) => label.toLocaleLowerCase("en-IN") === key)) ??
    cities.find((city) => city.slug === listing.citySlug || city.marketSlug === listing.citySlug);
}

function nextStart(organizer: HomeOrganizer) {
  return organizer.nextPlan ? Date.parse(organizer.nextPlan.startTime) : Number.MAX_SAFE_INTEGER;
}
