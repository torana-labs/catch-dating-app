import type {HomeCityPlans, HomeOrganizer, HomePlan} from "./homeTypes";

/** Whether one surface shows organisers on Catch, and organisers not on Catch yet. */
export interface HomeDiscoveryRule {
  onCatch: boolean;
  notOnCatch: boolean;
}

/**
 * Settings → Discovery, as a city's document carries it (functions/src/
 * discovery): which organisers the homepage band and the city pages show,
 * how many the band needs before it appears, and whether the band offers
 * "Claim your page". The rules only ever hide: an organiser they exclude is
 * never shown, whatever else its page says.
 */
export interface HomeDiscovery {
  homeOrganizers: HomeDiscoveryRule;
  cityOrganizers: HomeDiscoveryRule;
  homeOrganizersMinimum: number;
  homeClaimAction: boolean;
}

/**
 * The owner's defaults (DEFAULT_DISCOVERY_SETTINGS in functions/src/discovery/
 * discoveryPolicy.ts), for a city document built before the rules existed or
 * a city built from the public catalog: organisers not on Catch yet appear
 * nowhere guests browse, the band needs one organiser, and it offers no claim.
 */
export const defaultHomeDiscovery: HomeDiscovery = {
  homeOrganizers: {onCatch: true, notOnCatch: false},
  cityOrganizers: {onCatch: true, notOnCatch: false},
  homeOrganizersMinimum: 1,
  homeClaimAction: false,
};

type ClaimState = HomeOrganizer["claimState"];

/** On Catch: the organiser claimed the page (or Catch verified them). A pending claim is not on Catch yet. */
export function onCatch(claimState: ClaimState): boolean {
  return claimState === "claimed" || claimState === "verified";
}

/** The rules a city's plans follow. */
export function homeDiscoveryOf(plans: HomeCityPlans): HomeDiscovery {
  return plans.discovery ?? defaultHomeDiscovery;
}

function shown(rule: HomeDiscoveryRule, organizer: Pick<HomeOrganizer, "claimState">): boolean {
  return onCatch(organizer.claimState) ? rule.onCatch : rule.notOnCatch;
}

/** The organisers the homepage band shows, or none while there are fewer than its minimum. */
export function homeOrganizers(plans: HomeCityPlans): HomeOrganizer[] {
  const discovery = homeDiscoveryOf(plans);
  const organizers = plans.organizers.filter((organizer) => shown(discovery.homeOrganizers, organizer));
  return organizers.length >= discovery.homeOrganizersMinimum ? organizers : [];
}

/** The organisers the city pages and Explore's organisers tab show. */
export function cityOrganizers(plans: HomeCityPlans): HomeOrganizer[] {
  const discovery = homeDiscoveryOf(plans);
  return plans.organizers.filter((organizer) => shown(discovery.cityOrganizers, organizer));
}

/**
 * A city's plans. A built city document already holds only the plans its
 * rules allow; a city built from the public catalog has no rules, so the
 * defaults leave out the plans of organisers not on Catch yet.
 */
export function discoveryPlans(plans: HomeCityPlans): HomePlan[] {
  if (plans.discovery) return plans.plans;
  const hidden = new Set(plans.organizers.filter((organizer) => !onCatch(organizer.claimState))
    .map((organizer) => organizer.organizerId));
  return plans.plans.filter((plan) => !hidden.has(plan.organizer.organizerId));
}
