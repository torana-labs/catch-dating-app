import {renderHook} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {mumbaiDiscoveryCatalog, mumbaiQuietCatalog} from "./discoveryCatalogFixtures";
import {useNewToCityPageController} from "./useNewToCityPageController";

describe("useNewToCityPageController", () => {
  it("leads with this week's newcomer plans and a real one on the card, with no came-alone line", () => {
    const {result} = renderHook(() => useNewToCityPageController(mumbaiDiscoveryCatalog, vi.fn()));
    expect(result.current.hero.kicker).toBe("New to Mumbai");
    expect(result.current.plans.title).toBe("This week, for newcomers");
    expect(result.current.plans.cards.map((plan) => plan.key)).toEqual(
      ["thursday-pub-quiz", "strangers-supper", "carter-road-run", "saturday-game-night", "run-and-rave"]);
    expect(result.current.hero.card).toEqual({
      label: "New to Mumbai", title: "Thursday Evening Pub Quiz", subtitle: "The Quizzicals · Khar Social · Thu 29 Oct, 7:30 PM",
      photo: null, price: "Free",
    });
    expect(JSON.stringify(result.current)).not.toMatch(/came alone/iu);
  });

  it("shows the next two weeks when this week is quiet", () => {
    const {result} = renderHook(() => useNewToCityPageController(mumbaiQuietCatalog, vi.fn()));
    expect(result.current.plans.title).toBe("Coming up, for newcomers");
    expect(result.current.plans.cards.map((plan) => plan.key)).toEqual(["long-table-supper"]);
  });

  it("asks for the newcomer formats' plans and keeps the page when the city changes", () => {
    const navigate = vi.fn();
    const {result} = renderHook(() => useNewToCityPageController(mumbaiDiscoveryCatalog, navigate));
    expect(result.current.notify.interests).toEqual(["runs", "dinners", "quizzes"]);
    expect(result.current.notify.place.sourcePage).toBe("/new-to-mumbai/");
    result.current.chooseCity("indore");
    expect(navigate).toHaveBeenCalledWith("/new-to-indore/");
  });
});
