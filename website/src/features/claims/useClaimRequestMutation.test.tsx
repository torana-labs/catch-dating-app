import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {act, renderHook} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";

const requestOrganizerClaim = vi.hoisted(() => vi.fn());

vi.mock("../../firebase", () => ({requestOrganizerClaim}));

import {websiteQueryKeys} from "../../shared/query/queryKeys";
import {useClaimRequestMutation} from "./useClaimRequestMutation";

function queryHarness() {
  const client = new QueryClient({
    defaultOptions: {
      mutations: {retry: false},
      queries: {retry: false},
    },
  });
  return {
    client,
    wrapper({children}: PropsWithChildren) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    },
  };
}

describe("useClaimRequestMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits the typed claim packet and refreshes both claim query families", async () => {
    requestOrganizerClaim.mockResolvedValue({claimId: "claim-1", status: "pending"});
    const {client, wrapper} = queryHarness();
    const invalidateQueries = vi.spyOn(client, "invalidateQueries");
    const {result} = renderHook(() => useClaimRequestMutation("afterfly"), {wrapper});
    const payload = {
      organizerId: "afterfly",
      requesterName: "A Host",
      requesterRole: "owner" as const,
      businessEmail: null,
      businessPhone: "+919800000000",
      proofUrls: ["https://example.com/proof"],
      message: "I run this organizer.",
    };

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(requestOrganizerClaim).toHaveBeenCalledWith(payload);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: websiteQueryKeys.claims.lookup("afterfly"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: websiteQueryKeys.claims.requests(),
    });
  });
});
