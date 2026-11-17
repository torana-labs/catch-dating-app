import {brand} from "@content/brand";
import {renderHook} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {mumbaiLiveCatalog, puneLaunchingSoonCatalog} from "../../stories/fixtures/homeCatalogs";
import {mumbaiQuietCatalog} from "../discovery/discoveryCatalogFixtures";
import {useExplorePageController} from "./useExplorePageController";

describe("useExplorePageController", () => {
  it("reads its filters from the URL and writes changes back in place", () => {
    const navigate = vi.fn();
    const {result} = renderHook(() => useExplorePageController(mumbaiLiveCatalog,
      {pathname: "/mumbai/", search: "?utm_source=ig&format=games"}, navigate));
    expect(result.current.filters).toEqual({query: "", format: "games", when: "any", view: "plans"});
    expect(result.current.plans.map((plan) => plan.key)).toEqual(["thursday-pub-quiz", "saturday-game-night", "sunday-board-games"]);
    expect(result.current.summary).toBe("3 plans");
    result.current.update({when: "weekend"});
    expect(navigate).toHaveBeenLastCalledWith("/mumbai/?utm_source=ig&format=games&when=weekend", {replace: true});
    result.current.clear();
    expect(navigate).toHaveBeenLastCalledWith("/mumbai/?utm_source=ig", {replace: true});
  });

  it("keeps the filters when it loads another city's page", () => {
    const navigate = vi.fn();
    const {result} = renderHook(() => useExplorePageController(mumbaiLiveCatalog, {pathname: "/mumbai/", search: "?q=run"}, navigate));
    result.current.chooseCity("mumbai");
    expect(navigate).not.toHaveBeenCalled();
    result.current.chooseCity("pune");
    expect(navigate).toHaveBeenCalledWith("/pune/?q=run");
  });

  it("leads with this week, a quiet week's next two weeks, an empty window or launching soon", () => {
    const state = (catalog: typeof mumbaiLiveCatalog, search = "") =>
      renderHook(() => useExplorePageController(catalog, {pathname: "/mumbai/", search}, vi.fn())).result.current.state;
    expect(state(mumbaiLiveCatalog)).toBe("full");
    expect(state(mumbaiLiveCatalog, "?q=run")).toBe("filtered");
    expect(state(mumbaiQuietCatalog)).toBe("quiet");
    expect(state({...mumbaiLiveCatalog, plans: {...mumbaiLiveCatalog.plans, plans: []}})).toBe("empty");
    expect(state(puneLaunchingSoonCatalog)).toBe("soon");
    expect(state({...mumbaiLiveCatalog, phase: "unavailable"})).toBe("unavailable");
  });

  it("offers the organisers as a tab, and asks for the city's new plans on WhatsApp", () => {
    const {result} = renderHook(() => useExplorePageController(mumbaiLiveCatalog, {pathname: "/mumbai/", search: "?format=courts"}, vi.fn()));
    expect(result.current.tabs).toEqual([
      {value: "plans", label: "Plans", href: "/mumbai/?format=courts"},
      {value: "organisers", label: "Organisers", href: "/mumbai/?format=courts&show=organisers"},
    ]);
    expect(result.current.notifyMessage).toBe(`Hi ${brand.name}, please send me new plans in Mumbai.`);
  });
});
