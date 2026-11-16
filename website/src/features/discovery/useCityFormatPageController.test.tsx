import {act, renderHook} from "@testing-library/react";
import {brand} from "@content/brand";
import {describe, expect, it, vi} from "vitest";
import {mumbaiDiscoveryCatalog, mumbaiEmptyMonthCatalog, puneDiscoveryCatalog} from "./discoveryCatalogFixtures";
import {cityFormatPageMeta, useCityFormatPageController} from "./useCityFormatPageController";

describe("useCityFormatPageController", () => {
  it("states the backend's counts for the format, never its own", () => {
    const {result} = renderHook(() => useCityFormatPageController(mumbaiDiscoveryCatalog, "runClubs", vi.fn()));
    expect(result.current.indexed).toBe(true);
    expect(result.current.hero).toMatchObject({kicker: "Mumbai / Run clubs", title: "Run clubs in Mumbai"});
    expect(result.current.hero.stats).toEqual([
      {figure: "4", title: "clubs"},
      {figure: "6", title: "runs in the next 30 days"},
      {figure: "2", title: "free to join"},
    ]);
    expect(result.current.faq.items[0].answer).toBe("Some are. 2 of the 6 runs in the next 30 days are free. Each listing shows its price before you book.");
  });

  it("marks counts the read model calls a floor", () => {
    const floor = {...mumbaiDiscoveryCatalog, plans: {...mumbaiDiscoveryCatalog.plans, monthCountsComplete: false}};
    const {result} = renderHook(() => useCityFormatPageController(floor, "runClubs", vi.fn()));
    expect(result.current.hero.stats.map((stat) => stat.figure)).toEqual(["4+", "6+", "2+"]);
  });

  it("filters its plans, and keeps the format when the city changes", () => {
    const navigate = vi.fn();
    const {result} = renderHook(() => useCityFormatPageController(mumbaiDiscoveryCatalog, "runClubs", navigate));
    expect(result.current.plans.cards.map((plan) => plan.key)).toEqual(["carter-road-run", "run-and-rave"]);
    act(() => result.current.plans.setFilter("free"));
    expect(result.current.plans.cards.map((plan) => plan.key)).toEqual(["carter-road-run"]);
    result.current.chooseCity("indore");
    expect(navigate).toHaveBeenCalledWith("/indore/run-clubs/");
  });

  it("sends the format's interest from its own page", () => {
    const {result} = renderHook(() => useCityFormatPageController(mumbaiDiscoveryCatalog, "pickleball", vi.fn()));
    expect(result.current.notify.interests).toEqual(["courts"]);
    expect(result.current.notify.place).toEqual({citySlug: "mumbai", cityLabel: "Mumbai", sourcePage: "/mumbai/pickleball/", entry: "cf-wa"});
  });

  it("is the thin page below the bar, with what is here so far", () => {
    const {result} = renderHook(() => useCityFormatPageController(mumbaiDiscoveryCatalog, "pickleball", vi.fn()));
    expect(result.current.indexed).toBe(false);
    expect(result.current.thin.ticks).toEqual([
      "Dink and Drink · next: Sat 5:00 PM",
      "We’ll make this a full page once there are more clubs and plans to show.",
    ]);
    expect(result.current.thin.actions[0]).toEqual({label: "See Dink and Drink", href: "/organizers/dink-and-drink/"});
    expect(result.current.thin.popular?.rows).toEqual([{title: "Run clubs", value: "6"}, {title: "Nights out", value: "5"},
      {title: "Quiz nights", value: "4"}, {title: "Supper clubs", value: "3"}]);
  });

  it("hides What's on for a city with nothing in the next 30 days", () => {
    const {result} = renderHook(() => useCityFormatPageController(mumbaiEmptyMonthCatalog, "runClubs", vi.fn()));
    expect(result.current.showWhatsOn).toBe(false);
  });
});

describe("cityFormatPageMeta", () => {
  it("follows the backend's indexing decision, and is noindex without one", () => {
    expect(cityFormatPageMeta(mumbaiDiscoveryCatalog, "runClubs")).toEqual({
      title: `Run clubs in Mumbai | ${brand.name}`,
      description: "Run clubs in Mumbai: upcoming runs, the clubs who run them and how to join.",
      canonicalPath: "/mumbai/run-clubs/",
      robots: "index, follow",
    });
    expect(cityFormatPageMeta(mumbaiDiscoveryCatalog, "pickleball").robots).toBe("noindex, follow");
    expect(cityFormatPageMeta(puneDiscoveryCatalog, "runClubs").robots).toBe("noindex, follow");
    const {formatPages: _formatPages, ...withoutPages} = mumbaiDiscoveryCatalog.plans as typeof mumbaiDiscoveryCatalog.plans & {formatPages?: unknown};
    expect(cityFormatPageMeta({...mumbaiDiscoveryCatalog, plans: withoutPages}, "runClubs").robots).toBe("noindex, follow");
  });
});
