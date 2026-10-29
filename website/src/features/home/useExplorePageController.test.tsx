import {renderHook} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {mumbaiLiveCatalog} from "../../stories/fixtures/homeCatalogs";
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
});
