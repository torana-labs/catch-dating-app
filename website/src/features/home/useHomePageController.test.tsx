import {act, renderHook} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {mumbaiLiveCatalog, puneLaunchingSoonCatalog} from "../../stories/fixtures/homeCatalogs";
import {useHomePageController} from "./useHomePageController";

describe("useHomePageController", () => {
  it("binds a live city's week, eight plans at a time, and toggles a format tile", () => {
    const {result} = renderHook(() => useHomePageController(mumbaiLiveCatalog));
    expect(result.current.live).toBe(true);
    expect(result.current.weekCount).toBe(10);
    expect(result.current.plans).toHaveLength(8);
    expect(result.current.tiles.map((tile) => [tile.format, tile.count])).toEqual([["run", 2], ["dinner", 1], ["games", 3], ["courts", 2], ["nightsOut", 2]]);
    act(() => result.current.chooseTile("courts"));
    expect(result.current.filter).toBe("courts");
    expect(result.current.plans.map((plan) => plan.key)).toEqual(["pickleball-social", "doubles-ladder"]);
    act(() => result.current.chooseTile("courts"));
    expect(result.current.filter).toBe("all");
  });

  it("names what a launching-soon city's organisers run and loads another city's page", () => {
    const navigate = vi.fn();
    const {result} = renderHook(() => useHomePageController(puneLaunchingSoonCatalog, navigate));
    expect(result.current.live).toBe(false);
    expect(result.current.coming).toBe("Run clubs, supper clubs and game nights");
    result.current.chooseCity("pune");
    expect(navigate).not.toHaveBeenCalled();
    result.current.chooseCity("mumbai");
    expect(navigate).toHaveBeenCalledWith("/?city=mumbai");
  });

  it("reads a quiet open city as open: no zero counts, no '0 of 0 plans shown'", () => {
    const quiet = {...mumbaiLiveCatalog, plans: {...mumbaiLiveCatalog.plans, planCount: 0, plans: []}};
    const {result} = renderHook(() => useHomePageController(quiet));
    expect(result.current.live).toBe(true);
    expect(result.current.tiles.map((tile) => tile.kicker)).toEqual(Array(5).fill("In Mumbai"));
    expect(result.current.upcoming).toBe(false);
    expect(result.current.note).toBe("No plans in Mumbai in the next two weeks yet. Follow the organisers below to hear about their next one first.");
  });

  it("widens a quiet week to the next two weeks, dated, instead of showing an empty section", () => {
    const day = 24 * 60 * 60 * 1000;
    const shift = (iso: string | null) => iso === null ? null : new Date(Date.parse(iso) + 9 * day).toISOString();
    const later = mumbaiLiveCatalog.plans.plans.slice(0, 3).map((plan) => ({...plan, startTime: shift(plan.startTime)!, endTime: shift(plan.endTime)}));
    const quietWeek = {...mumbaiLiveCatalog, plans: {...mumbaiLiveCatalog.plans, plans: later}};
    const {result} = renderHook(() => useHomePageController(quietWeek));
    expect(result.current.weekCount).toBe(0);
    expect(result.current.upcoming).toBe(true);
    expect(result.current.plans).toHaveLength(3);
    expect(result.current.plans[0].when).toMatch(/^[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}, \d{1,2}:\d{2}/u);
    expect(result.current.note).toBe("Nothing on this week, so here’s everything in Mumbai over the next two weeks: 3 of 3 shown.");
  });

  it("keeps a waitlist city's tiles on its launch line", () => {
    const {result} = renderHook(() => useHomePageController(puneLaunchingSoonCatalog));
    expect(result.current.tiles.map((tile) => tile.kicker)).toEqual(Array(5).fill("Coming to Pune"));
  });
});
