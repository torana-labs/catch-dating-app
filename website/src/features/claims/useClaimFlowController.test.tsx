import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {hostListings} from "../organizers/data";
import type {HostListing} from "../organizers/types";

const trackCatchAcquisitionEvent = vi.hoisted(() => vi.fn());
vi.mock("../../analytics", () => ({trackMarketingEvent: vi.fn(), trackCatchAcquisitionEvent}));

import {emptyClaimRouteState} from "./claimRouting";
import {useClaimFlowController} from "./useClaimFlowController";

function wrapper() {
  const client = new QueryClient({defaultOptions: {mutations: {retry: false}}});
  return function Wrapper({children}: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function enabledListing(): HostListing {
  return {
    ...hostListings[0],
    authority: {
      ...hostListings[0].authority,
      claimState: "unclaimed",
      ownershipState: "programmatic",
      publishStatus: "published",
    },
    capabilities: {
      ...hostListings[0].capabilities,
      claimRequest: {state: "enabled", reason: ""},
    },
  };
}

describe("useClaimFlowController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emits one acquisition start for explicit claim interactions, without search text or a signup", () => {
    const {result} = renderHook(() => useClaimFlowController(), {wrapper: wrapper()});
    expect(trackCatchAcquisitionEvent).not.toHaveBeenCalled();
    act(() => {
      result.current.setQuery("Private search");
      result.current.selectListing(enabledListing());
    });
    expect(trackCatchAcquisitionEvent).toHaveBeenCalledExactlyOnceWith({name: "acquisition_start", form: "claim"});
  });

  it("starts with the page a claim link names, and lets a searched page be changed", () => {
    const listing = enabledListing();
    const linked = renderHook(() => useClaimFlowController({...emptyClaimRouteState, listing}), {wrapper: wrapper()});
    expect(linked.result.current.listing?.id).toBe(listing.id);
    expect(linked.result.current.listingFromLink).toBe(true);

    const searched = renderHook(() => useClaimFlowController(), {wrapper: wrapper()});
    expect(searched.result.current.listingFromLink).toBe(false);
    act(() => searched.result.current.selectListing(listing));
    expect(searched.result.current.listing?.id).toBe(listing.id);
    act(() => searched.result.current.clearListing());
    expect(searched.result.current.listing).toBeNull();
  });
});
