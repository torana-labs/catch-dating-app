import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {mumbaiLiveCatalog, puneLaunchingSoonCatalog} from "../../stories/fixtures/homeCatalogs";
import {rememberCityChoice} from "./cityChoice";
import {useHomeCity} from "./useHomeCity";

const mumbai = mumbaiLiveCatalog.selected.slug;
const pune = puneLaunchingSoonCatalog.selected.slug;

describe("useHomeCity", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("swaps in the city the network suggests when the address names none", async () => {
    const load = vi.fn(async () => ({catalog: puneLaunchingSoonCatalog, guess: {cityId: "in-mh-pune", slug: pune, countryIsoCode: "IN"}}));
    const {result} = renderHook(() => useHomeCity(mumbaiLiveCatalog, load));
    expect(result.current.catalog.selected.slug).toBe(mumbai);
    await waitFor(() => expect(result.current.catalog.selected.slug).toBe(pune));
    expect(result.current.source).toBe("network_guess");
    expect(load).toHaveBeenCalledWith("guess=1", expect.any(AbortSignal));
  });

  it("prefers the city the visitor chose before over a guess", async () => {
    rememberCityChoice(pune, "precise");
    const load = vi.fn(async () => ({catalog: puneLaunchingSoonCatalog}));
    const {result} = renderHook(() => useHomeCity(mumbaiLiveCatalog, load));
    await waitFor(() => expect(result.current.source).toBe("precise"));
    expect(load).toHaveBeenCalledWith(`city=${pune}`, expect.any(AbortSignal));
  });

  it("keeps a city the address names, and asks for nothing", () => {
    window.history.replaceState(null, "", `/?city=${mumbai}`);
    const load = vi.fn();
    const {result} = renderHook(() => useHomeCity(mumbaiLiveCatalog, load));
    expect(load).not.toHaveBeenCalled();
    expect(result.current.catalog).toBe(mumbaiLiveCatalog);
  });

  it("asks for nothing when the page already shows the chosen city", () => {
    rememberCityChoice(mumbai, "picked");
    const load = vi.fn();
    const {result} = renderHook(() => useHomeCity(mumbaiLiveCatalog, load));
    expect(load).not.toHaveBeenCalled();
    expect(result.current.source).toBe("picked");
  });

  it("keeps the default city when the guess is Other or the read fails", async () => {
    const other = vi.fn(async () => ({catalog: null, guess: {cityId: null, slug: null, countryIsoCode: "NP"}}));
    const {result} = renderHook(() => useHomeCity(mumbaiLiveCatalog, other));
    await waitFor(() => expect(other).toHaveBeenCalled());
    expect(result.current.catalog.selected.slug).toBe(mumbai);
    const failed = vi.fn(async () => {throw new Error("offline");});
    const second = renderHook(() => useHomeCity(mumbaiLiveCatalog, failed));
    await waitFor(() => expect(failed).toHaveBeenCalled());
    expect(second.result.current.catalog.selected.slug).toBe(mumbai);
  });
});
