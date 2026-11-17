import {describe, expect, it} from "vitest";
import {cityFooterNote, cityStatusLabel, homeCityState, upcomingPlans} from "./homeModel";
import {homeStoryReadAt, mumbaiPlansFixture, punePlansFixture} from "../../stories/fixtures/homeCatalogs";
import {activeFeaturedCity} from "@content/markets";
import type {HomeCity} from "./homeTypes";

const city = (status: HomeCity["status"], weekPlanCount: number): HomeCity => ({
  slug: activeFeaturedCity.slug, marketSlug: activeFeaturedCity.marketSlug, label: activeFeaturedCity.label,
  status, weekPlanCount, timezone: activeFeaturedCity.timezone, countryIsoCode: activeFeaturedCity.countryIsoCode,
});

describe("city status lines", () => {
  it("shows a live city as open with its honest count, however quiet", () => {
    expect(cityStatusLabel(city("live", 0))).toBe("New");
    expect(cityStatusLabel(city("live", 1))).toBe("1 plan this week");
    expect(cityStatusLabel(city("live", 2))).toBe("2 plans this week");
    expect(cityFooterNote(city("live", 0))).toBe("New");
    expect(cityFooterNote(city("live", 1))).toBe("1 plan this week");
    expect(cityFooterNote(city("live", 7))).toBe("7 plans this week");
  });

  it("keeps soon for cities that have not opened", () => {
    expect(cityStatusLabel(city("launchingSoon", 3))).toBe("Launching soon");
    expect(cityFooterNote(city("launchingSoon", 0))).toBe("soon");
  });
});

describe("the homepage's city state", () => {
  const day = 24 * 60 * 60 * 1000;
  const at = (days: number) => new Date(homeStoryReadAt + days * day).toISOString();
  const withPlans = (starts: number[]) => ({...mumbaiPlansFixture,
    plans: starts.map((days, index) => ({...mumbaiPlansFixture.plans[index], startTime: at(days), endTime: null}))});

  it("counts plans that start within fourteen days and have not ended, soonest first", () => {
    const plans = withPlans([13, 1, 15, -1]).plans;
    expect(upcomingPlans(plans, homeStoryReadAt).map((plan) => plan.startTime)).toEqual([at(1), at(13)]);
  });

  it("reads an open city with fewer than five plans in two weeks as thin, five or more as busy", () => {
    expect(homeCityState(withPlans([1, 2, 3, 4, 20]), homeStoryReadAt)).toBe("thin");
    expect(homeCityState(withPlans([1, 2, 3, 4, 13]), homeStoryReadAt)).toBe("busy");
    expect(homeCityState(punePlansFixture, homeStoryReadAt)).toBe("launching");
  });
});
