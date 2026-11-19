import {describe, expect, it} from "vitest";
import {cityOrganizers, defaultHomeDiscovery, discoveryPlans, homeDiscoveryOf, homeOrganizers, onCatch} from "./homeDiscovery";
import type {HomeCityPlans, HomeOrganizer, HomePlan} from "./homeTypes";

const organizer = (organizerId: string, claimState: HomeOrganizer["claimState"]): HomeOrganizer => ({
  organizerId,
  name: `Sample ${organizerId}`,
  path: `/organizers/sample-${organizerId}/`,
  category: "Run club",
  logo: {mode: "monogram", text: "SO", status: "not_verified"},
  formats: ["run"],
  followerCount: 0,
  claimState,
  upcomingPlanCount: 1,
  nextPlan: null,
});

const plan = (eventId: string, organizerId: string) => ({eventId, organizer: {organizerId}}) as unknown as HomePlan;

const city = (organizers: HomeOrganizer[], extra: Partial<HomeCityPlans> = {}) => ({
  organizers,
  plans: organizers.map((item) => plan(`event-${item.organizerId}`, item.organizerId)),
  ...extra,
}) as unknown as HomeCityPlans;

const mixed = [organizer("a", "claimed"), organizer("b", "unclaimed"), organizer("c", "claimPending"), organizer("d", "verified")];

describe("homeDiscovery", () => {
  it("counts claimed and verified organisers as on Catch, and a pending claim as not yet", () => {
    expect(["claimed", "verified", "claimPending", "unclaimed"].map((state) => onCatch(state as HomeOrganizer["claimState"])))
      .toEqual([true, true, false, false]);
  });

  it("uses the owner's defaults for a city document built before the rules", () => {
    expect(homeDiscoveryOf(city(mixed))).toBe(defaultHomeDiscovery);
    expect(homeOrganizers(city(mixed)).map((item) => item.organizerId)).toEqual(["a", "d"]);
    expect(cityOrganizers(city(mixed)).map((item) => item.organizerId)).toEqual(["a", "d"]);
  });

  it("shows organisers not on Catch only where the rules allow, surface by surface", () => {
    const plans = city(mixed, {discovery: {...defaultHomeDiscovery, cityOrganizers: {onCatch: true, notOnCatch: true}}});
    expect(homeOrganizers(plans).map((item) => item.organizerId)).toEqual(["a", "d"]);
    expect(cityOrganizers(plans).map((item) => item.organizerId)).toEqual(["a", "b", "c", "d"]);
  });

  it("leaves the band out while the city has fewer organisers than its minimum", () => {
    const plans = city(mixed, {discovery: {...defaultHomeDiscovery, homeOrganizersMinimum: 3}});
    expect(homeOrganizers(plans)).toEqual([]);
    expect(homeOrganizers(city(mixed, {discovery: {...defaultHomeDiscovery, homeOrganizersMinimum: 2}}))).toHaveLength(2);
  });

  it("leaves out the plans of organisers not on Catch from a city built without rules, and trusts a built city", () => {
    expect(discoveryPlans(city(mixed)).map((item) => item.eventId)).toEqual(["event-a", "event-d"]);
    const built = city(mixed, {discovery: defaultHomeDiscovery});
    expect(discoveryPlans(built)).toBe(built.plans);
  });
});
