import {describe, expect, it, vi} from "vitest";
// The default reader is server-only; every test passes its own.
vi.mock("./homeCatalog", () => ({readHomeCatalog: vi.fn()}));
import {websiteCities} from "../content/markets";
import {cityPlansFromListings} from "../features/home/cityPlansFromListings";
import {homeCatalogFromPlans} from "../features/home/homeCatalog";
import {homeCatalogResponse} from "./homeCatalogResponse";

// A catalog with no plans in any city, opened on the given city.
const homeCatalogFixture = (slug: string) => homeCatalogFromPlans(websiteCities,
  websiteCities.map((city) => cityPlansFromListings([], city, websiteCities, 1)), slug, 1);
const pune = websiteCities.find((city) => city.slug === "pune")!;
const request = (query: string, headers: Record<string, string> = {}) =>
  new Request(`http://localhost/api/home-catalog${query}`, {headers});

describe("/api/home-catalog", () => {
  it("answers a remembered city's read model, uncached", async () => {
    const read = vi.fn(async (slug: string | undefined) => homeCatalogFixture(slug ?? "mumbai"));
    const response = await homeCatalogResponse(request("?city=pune"), read);
    expect(read).toHaveBeenCalledWith("pune");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body = await response.json();
    expect(body.catalog.selected.slug).toBe("pune");
    expect(body.guess).toBeUndefined();
  });

  it("guesses from network location only when asked, and returns only the city", async () => {
    const read = vi.fn(async (slug: string | undefined) => homeCatalogFixture(slug ?? "mumbai"));
    const response = await homeCatalogResponse(request("?guess=1", {"cf-ipcountry": "IN",
      "cf-iplatitude": String(pune.latitude), "cf-iplongitude": String(pune.longitude)}), read);
    const body = await response.json();
    expect(body.guess).toEqual({cityId: pune.id, slug: "pune", countryIsoCode: "IN"});
    expect(JSON.stringify(body)).not.toContain(String(pune.latitude));
    expect(body.catalog.selected.slug).toBe("pune");
  });

  it("reads nothing for an unknown city or a guess of Other", async () => {
    const read = vi.fn();
    expect((await (await homeCatalogResponse(request("?city=atlantis"), read)).json())).toEqual({catalog: null});
    const other = await (await homeCatalogResponse(request("?guess=1", {"cf-ipcountry": "NP"}), read)).json();
    expect(other).toEqual({catalog: null, guess: {cityId: null, slug: null, countryIsoCode: "NP"}});
    expect(read).not.toHaveBeenCalled();
  });

  it("does not offer a city whose plans could not be read", async () => {
    const read = vi.fn(async () => ({...homeCatalogFixture("pune"), phase: "unavailable" as const}));
    expect((await (await homeCatalogResponse(request("?city=pune"), read)).json()).catalog).toBeNull();
    const failed = await homeCatalogResponse(request("?city=pune"), vi.fn().mockRejectedValue(new Error("down")));
    expect(failed.status).toBe(503);
  });
});
