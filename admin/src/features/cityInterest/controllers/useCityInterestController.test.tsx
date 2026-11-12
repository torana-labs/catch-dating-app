import {renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {sampleCityInterest} from "../api/cityInterestRepository";
import {useCityInterestController} from "./useCityInterestController";

describe("useCityInterestController", () => {
  it("reads interest by city", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useCityInterestController(), {wrapper});
    expect(result.current.loadState).toBe("loading");
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.data).toEqual(sampleCityInterest());
  });
});
