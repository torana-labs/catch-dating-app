import {describe, expect, it} from "vitest";
import {cityFooterNote, cityStatusLabel} from "./homeModel";
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
