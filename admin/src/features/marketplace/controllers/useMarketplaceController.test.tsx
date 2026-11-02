import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {useMarketplaceController} from "./useMarketplaceController";

describe("useMarketplaceController", () => {
  it("reads all cities, then one", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useMarketplaceController(), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.data?.cities).toHaveLength(3);
    act(() => result.current.setMarketId("indore"));
    await waitFor(() => expect(result.current.data?.cities.map((city) =>
      city.marketId)).toEqual(["indore"]));
  });
});
