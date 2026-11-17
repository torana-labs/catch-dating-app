import {brand} from "@content/brand";
import {describe, expect, it} from "vitest";
import {mumbaiDiscoveryCatalog, puneDiscoveryCatalog} from "./discoveryCatalogFixtures";
import {matchDiscoveryRoute, type DiscoveryRoute} from "./discoveryModel";
import {
  cityFormatPageMeta,
  discoveryPageMeta,
  discoveryPageStatus,
  indexedCityFormatPaths,
  newToCityPageMeta,
} from "./discoveryRoute";

const route = (path: string): DiscoveryRoute => {
  const match = matchDiscoveryRoute(path);
  if (!match) throw new Error(`${path} is not a discovery path`);
  return match;
};
const {formatPages: _formatPages, ...withoutPages} =
  mumbaiDiscoveryCatalog.plans as typeof mumbaiDiscoveryCatalog.plans & {formatPages?: unknown};
const mumbaiWithoutPages = {...mumbaiDiscoveryCatalog, plans: withoutPages};

describe("cityFormatPageMeta", () => {
  it("follows the backend's indexing decision, and is noindex without one", () => {
    expect(cityFormatPageMeta(mumbaiDiscoveryCatalog, "runClubs")).toEqual({
      title: `Run clubs in Mumbai | ${brand.name}`,
      description: "Run clubs in Mumbai: upcoming runs, the clubs who run them and how to join.",
      twitterDescription: "Run clubs in Mumbai: upcoming runs, the clubs who run them and how to join.",
      canonicalPath: "/mumbai/run-clubs/",
      robots: "index, follow",
    });
    expect(cityFormatPageMeta(mumbaiDiscoveryCatalog, "pickleball").robots).toBe("noindex, follow");
    expect(cityFormatPageMeta(puneDiscoveryCatalog, "runClubs").robots).toBe("noindex, follow");
    expect(cityFormatPageMeta(mumbaiWithoutPages, "runClubs").robots).toBe("noindex, follow");
  });
});

describe("newToCityPageMeta", () => {
  it("stays out of search until the owner approves the page", () => {
    expect(newToCityPageMeta(mumbaiDiscoveryCatalog)).toMatchObject({canonicalPath: "/new-to-mumbai/", robots: "noindex, follow"});
  });
});

describe("discovery routes", () => {
  it("render a city-by-format page the city has, and 404 one it has nothing for", () => {
    expect(discoveryPageStatus(route("/mumbai/run-clubs/"), mumbaiDiscoveryCatalog)).toBe("page");
    expect(discoveryPageStatus(route("/mumbai/tennis/"), mumbaiDiscoveryCatalog)).toBe("notFound");
  });

  it("are unavailable when the city could not be read or has no format pages yet", () => {
    expect(discoveryPageStatus(route("/mumbai/run-clubs/"), {...mumbaiDiscoveryCatalog, phase: "unavailable"})).toBe("unavailable");
    expect(discoveryPageStatus(route("/mumbai/run-clubs/"), mumbaiWithoutPages)).toBe("unavailable");
    expect(discoveryPageStatus(route("/new-to-mumbai/"), {...mumbaiDiscoveryCatalog, phase: "unavailable"})).toBe("unavailable");
  });

  it("render a new-to-the-city page for a listed city, quiet or not", () => {
    expect(discoveryPageStatus(route("/new-to-mumbai/"), mumbaiDiscoveryCatalog)).toBe("page");
    expect(discoveryPageStatus(route("/new-to-pune/"), puneDiscoveryCatalog)).toBe("page");
  });

  it("are not found when the catalog selected another city", () => {
    expect(discoveryPageStatus(route("/pune/run-clubs/"), mumbaiDiscoveryCatalog)).toBe("notFound");
    expect(discoveryPageStatus(route("/new-to-pune/"), mumbaiDiscoveryCatalog)).toBe("notFound");
  });

  it("take each page's own metadata", () => {
    expect(discoveryPageMeta(route("/mumbai/run-clubs/"), mumbaiDiscoveryCatalog).canonicalPath).toBe("/mumbai/run-clubs/");
    expect(discoveryPageMeta(route("/new-to-mumbai/"), mumbaiDiscoveryCatalog).canonicalPath).toBe("/new-to-mumbai/");
  });
});

describe("indexedCityFormatPaths", () => {
  it("lists only the format pages the backend indexes, and none without format pages", () => {
    expect(indexedCityFormatPaths("mumbai", mumbaiDiscoveryCatalog.plans)).toEqual(["/mumbai/run-clubs/", "/mumbai/nightlife/"]);
    expect(indexedCityFormatPaths("pune", puneDiscoveryCatalog.plans)).toEqual([]);
    expect(indexedCityFormatPaths("mumbai", withoutPages)).toEqual([]);
  });
});
