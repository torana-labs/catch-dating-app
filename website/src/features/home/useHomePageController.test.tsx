import {act, renderHook} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {homeCatalogFixture, mumbaiLiveCatalog, puneLaunchingSoonCatalog} from "../../stories/fixtures/homeCatalogs";
import type {HomeReview} from "./homeModel";
import {useHomePageController} from "./useHomePageController";

const day = 24 * 60 * 60 * 1000;
const shifted = (days: number, count: number) => {
  const shift = (iso: string | null) => iso === null ? null : new Date(Date.parse(iso) + days * day).toISOString();
  const plans = mumbaiLiveCatalog.plans.plans.slice(0, count).map((plan) => ({...plan, startTime: shift(plan.startTime)!, endTime: shift(plan.endTime)}));
  return {...mumbaiLiveCatalog, plans: {...mumbaiLiveCatalog.plans, plans}};
};

describe("useHomePageController", () => {
  it("binds a busy city's week, three plans at a time as the board's rail, and filters it by format", () => {
    const {result} = renderHook(() => useHomePageController(mumbaiLiveCatalog));
    expect(result.current.state).toBe("busy");
    expect(result.current.live).toBe(true);
    expect(result.current.weekCount).toBe(10);
    expect(result.current.plans).toHaveLength(3);
    expect(result.current.heroEyebrow).toBe("In Mumbai this week · 10 plans");
    expect(result.current.heroPlan?.title).toBe("Thursday Evening Pub Quiz");
    act(() => result.current.setFilter("courts"));
    expect(result.current.filter).toBe("courts");
    expect(result.current.plans.map((plan) => plan.key)).toEqual(["pickleball-social", "doubles-ladder"]);
    expect(result.current.note).toBe("Showing 2 of 2 this week · Pickleball");
  });

  it("lets a visitor switch to another open city from the plans band", () => {
    const {result} = renderHook(() => useHomePageController(mumbaiLiveCatalog));
    expect(result.current.otherCities).toEqual([{label: "Plans in Indore", href: "/?city=indore"}]);
  });

  it("names what a launching city's organisers run and loads another city's page", () => {
    const navigate = vi.fn();
    const {result} = renderHook(() => useHomePageController(puneLaunchingSoonCatalog, navigate));
    expect(result.current.state).toBe("launching");
    expect(result.current.live).toBe(false);
    expect(result.current.heroEyebrow).toBe("Launching soon in Pune");
    expect(result.current.coming).toBe("Run clubs, supper clubs and game nights");
    result.current.chooseCity("pune");
    expect(navigate).not.toHaveBeenCalled();
    result.current.chooseCity("mumbai");
    expect(navigate).toHaveBeenCalledWith("/?city=mumbai");
  });

  it("reads an open city with fewer than five plans in two weeks as thin: every plan, dated, never filtered", () => {
    const {result} = renderHook(() => useHomePageController(shifted(1, 4)));
    expect(result.current.state).toBe("thin");
    expect(result.current.heroEyebrow).toBe("New in Mumbai · plans for the next two weeks");
    expect(result.current.upcoming).toBe(true);
    expect(result.current.plans).toHaveLength(4);
    expect(result.current.plans[0].when).toMatch(/^[A-Z][a-z]{2} \d{1,2} [A-Z][a-z]{2}, \d{1,2}:\d{2}/u);
    act(() => result.current.setFilter("courts"));
    expect(result.current.filter).toBe("all");
    expect(result.current.note).toBe("4 of 4 plans in the next two weeks. Hosts set their own prices.");
  });

  it("keeps five plans in two weeks busy", () => {
    expect(renderHook(() => useHomePageController(shifted(1, 5))).result.current.state).toBe("busy");
  });

  it("reads a quiet open city as thin and open: no zero counts, no '0 of 0 plans shown'", () => {
    const {result} = renderHook(() => useHomePageController(homeCatalogFixture("indore")));
    expect(result.current.state).toBe("thin");
    expect(result.current.live).toBe(true);
    expect(result.current.plans).toHaveLength(0);
    expect(result.current.note).toBe("No plans in Indore in the next two weeks yet. Follow the organisers below to hear about their next one first.");
  });

  it("widens a busy city's quiet week to the next fourteen days, dated, instead of showing an empty band", () => {
    const {result} = renderHook(() => useHomePageController(shifted(8, 10)));
    expect(result.current.state).toBe("busy");
    expect(result.current.weekCount).toBe(0);
    expect(result.current.upcoming).toBe(true);
    expect(result.current.heroEyebrow).toBe("In Mumbai · plans for the next two weeks");
    expect(result.current.note).toBe("Nothing on this week, so here’s everything in Mumbai over the next two weeks: 3 of 10 shown.");
  });

  it("keeps a city it could not read open and says so, never new or thin", () => {
    const {result} = renderHook(() => useHomePageController({...mumbaiLiveCatalog, phase: "unavailable",
      plans: {...mumbaiLiveCatalog.plans, plans: [], organizers: []}}));
    expect(result.current.state).toBe("busy");
    expect(result.current.note).toBe("We couldn’t load this week’s plans. Please try again in a moment.");
  });

  it("quotes only a review whose writer booked on Catch, and none when there is none", () => {
    const review = (verified: boolean, comment = "The quiz host had us talking in minutes."): HomeReview =>
      ({reviewId: `r-${String(verified)}`, reviewerName: "Asha", rating: 5, comment, eventTitle: "Thursday Evening Pub Quiz", verified});
    expect(renderHook(() => useHomePageController(mumbaiLiveCatalog)).result.current.review).toBeNull();
    expect(renderHook(() => useHomePageController(mumbaiLiveCatalog, undefined, undefined, [review(false)])).result.current.review).toBeNull();
    expect(renderHook(() => useHomePageController(mumbaiLiveCatalog, undefined, undefined, [review(true, "  ")])).result.current.review).toBeNull();
    expect(renderHook(() => useHomePageController(mumbaiLiveCatalog, undefined, undefined, [review(false), review(true)])).result.current.review?.reviewId)
      .toBe("r-true");
  });
});
