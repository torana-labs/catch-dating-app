import {describe, expect, it} from "vitest";
import {launchMarkets, marketCityFor, marketLabel} from "./launchMarkets";

describe("market catalog lookups", () => {
  it("launch markets are the live catalog cities", () => {
    expect(launchMarkets.map((market) => market.id))
      .toEqual(["in-mh-mumbai", "in-mp-indore"]);
  });

  it("resolves market ids, slugs, aliases and legacy ids to one city", () => {
    for (const key of ["in-ka-bengaluru", "bengaluru", "Bangalore", "in-bangalore"]) {
      expect(marketCityFor(key)?.marketId).toBe("in-ka-bengaluru");
    }
    expect(marketCityFor("pune")?.lifecycle).toBe("waitlist");
    expect(marketCityFor("atlantis")).toBeNull();
    expect(marketCityFor(null)).toBeNull();
  });

  it("labels known markets from the catalog and title-cases the rest", () => {
    expect(marketLabel("mumbai")).toBe("Mumbai");
    expect(marketLabel("delhi")).toBe("Delhi NCR");
    expect(marketLabel("atlantis")).toBe("Atlantis");
  });
});
