import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {expect, it, vi} from "vitest";
import {publicEventListingsContext} from "../../features/organizers/usePublicEventListingsController";
import {hostListings} from "../../features/organizers/data";
import type {HostListing} from "../../features/organizers/types";
import {useClaimFlowController} from "../../features/claims/useClaimFlowController";
vi.mock("../../analytics", () => ({trackMarketingEvent: vi.fn(), trackCatchAcquisitionEvent: vi.fn()}));
it("claim discovery uses the current catalog and withdrawal clears the selection", async () => {
  const listing: HostListing = {...hostListings[0], name: "Current catalog organizer",
    authority: {...hostListings[0].authority, ownershipState: "programmatic", claimState: "unclaimed", publishStatus: "published"},
    capabilities: {...hostListings[0].capabilities, claimRequest: {state: "enabled", reason: ""}}};
  let catalog: HostListing[] = [listing];
  const client = new QueryClient();
  function Wrapper({children}: PropsWithChildren) {
    return <QueryClientProvider client={client}>
      <publicEventListingsContext.Provider value={{listings: catalog, phase: "ready"}}>{children}</publicEventListingsContext.Provider>
    </QueryClientProvider>;
  }
  const {result, rerender} = renderHook(() => useClaimFlowController({listing,
    lookup: listing.id, requestId: null, urlState: null}), {wrapper: Wrapper});
  expect(result.current.searchResults.map(item => item.name)).toEqual([listing.name]);
  act(() => result.current.setQuery("Current"));
  catalog = [];
  rerender();
  await waitFor(() => expect(result.current.listing).toBeNull());
  expect(result.current.searchResults).toEqual([]);
  expect(result.current.query).toBe("Current");
});

it("a listing in review stays selected when the catalog loads, so a code can still prove it", () => {
  const unclaimed: HostListing = {...hostListings[0],
    authority: {...hostListings[0].authority, ownershipState: "programmatic", claimState: "unclaimed", publishStatus: "published"},
    capabilities: {...hostListings[0].capabilities, claimRequest: {state: "enabled", reason: ""}}};
  const pending: HostListing = {...unclaimed, authority: {...unclaimed.authority, claimState: "claimPending"},
    capabilities: {...unclaimed.capabilities, claimRequest: {state: "disabled", reason: "In review."}}};
  let catalog: HostListing[] = [pending];
  const client = new QueryClient();
  function Wrapper({children}: PropsWithChildren) {
    return <QueryClientProvider client={client}>
      <publicEventListingsContext.Provider value={{listings: catalog, phase: "ready"}}>{children}</publicEventListingsContext.Provider>
    </QueryClientProvider>;
  }
  const {result, rerender} = renderHook(() => useClaimFlowController({listing: pending,
    lookup: pending.id, requestId: null, urlState: "pendingClaim"}), {wrapper: Wrapper});
  catalog = [{...pending}];
  rerender();
  expect(result.current.listing?.id).toBe(pending.id);
  expect(result.current.searchResults, "a listing in review isn't offered to anyone searching").toEqual([]);
});
