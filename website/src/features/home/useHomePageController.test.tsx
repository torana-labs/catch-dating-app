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
});
