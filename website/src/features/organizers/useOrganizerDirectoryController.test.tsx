import {act, renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {MemoryRouter} from "react-router";
import {describe, expect, it, vi} from "vitest";

const trackMarketingEvent = vi.hoisted(() => vi.fn());
const trackOrganizerSearchAppearance = vi.hoisted(() => vi.fn());

vi.mock("../../analytics", () => ({trackMarketingEvent}));
vi.mock("./analytics", () => ({trackOrganizerSearchAppearance}));

import {hostListings} from "./data";
import {useOrganizerDirectoryController} from "./useOrganizerDirectoryController";

function wrapper(initialEntry = "/organizers/") {
  return function Wrapper({children}: PropsWithChildren) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

describe("useOrganizerDirectoryController", () => {
  it("covers the default and empty-result route states with a recoverable reset", async () => {
    const {result} = renderHook(() => useOrganizerDirectoryController(), {
      wrapper: wrapper(),
    });

    expect(result.current.currentFilters).toEqual(expect.objectContaining({
      query: "",
      statusFilter: "all",
    }));
    expect(result.current.results.length).toBeGreaterThan(0);

    act(() => result.current.setQuery("no-organizer-can-match-this-query"));
    await waitFor(() => expect(result.current.results).toHaveLength(0));

    act(() => result.current.clearFilters());
    await waitFor(() => expect(result.current.results.length).toBeGreaterThan(0));
  });

  it("hydrates filters from the URL and composes functional updates", async () => {
    const {result} = renderHook(() => useOrganizerDirectoryController(), {
      wrapper: wrapper("/organizers/?status=unclaimed&q=after"),
    });

    expect(result.current.statusFilter).toBe("unclaimed");
    expect(result.current.query).toBe("after");
    expect(result.current.results.length).toBeGreaterThan(0);
    act(() => result.current.setQuery((current) => `${current} fly`));
    await waitFor(() => expect(result.current.query).toBe("after fly"));
    expect(result.current.results.every((listing) => listing.status.toLowerCase() === "unclaimed"))
      .toBe(true);
  });

  it("tracks submitted result appearances and resets the URL-owned filters", async () => {
    const {result} = renderHook(() => useOrganizerDirectoryController(), {
      wrapper: wrapper("/organizers/?status=unclaimed&q=after"),
    });

    act(() => result.current.handleSearch({preventDefault: vi.fn()} as never));
    expect(trackMarketingEvent).toHaveBeenCalledWith(
      "organizer_search_submitted",
      expect.objectContaining({query: "after", status_filter: "unclaimed"})
    );
    expect(trackOrganizerSearchAppearance).toHaveBeenCalled();

    act(() => result.current.clearFilters());
    await waitFor(() => expect(result.current.query).toBe(""));
    expect(result.current.statusFilter).toBe("all");
  });

  it("uses explicit static listings for deterministic preview surfaces", () => {
    const source = hostListings[0];
    const previewListings = [
      {...source, id: "preview-mumbai", slug: "preview-mumbai", city: "Mumbai"},
      {...source, id: "preview-indore", slug: "preview-indore", city: "Indore"},
    ];

    const {result} = renderHook(
      () => useOrganizerDirectoryController(previewListings),
      {wrapper: wrapper()}
    );

    expect(result.current.summary.profileCount).toBe(2);
    expect(result.current.summary.unclaimedCount).toBe(2);
    expect(result.current.cityOptions).toEqual(expect.arrayContaining(["Indore", "Mumbai", "Delhi NCR"]));
    expect(result.current.results.map((listing) => listing.id)).toEqual([
      "preview-mumbai",
      "preview-indore",
    ]);
  });
});
