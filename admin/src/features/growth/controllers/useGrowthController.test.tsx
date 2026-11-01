import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {useGrowthController} from "./useGrowthController";

describe("useGrowthController", () => {
  it("filters nominators and approves owed credit", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() =>
      useGrowthController({initialView: "nominators"}), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.data?.cohorts).toHaveLength(5);
    act(() => result.current.setNominatorFilter("associate"));
    expect(result.current.nominators.every((row) => row.role === "associate"))
      .toBe(true);
    act(() => result.current.setNominatorFilter("all"));
    act(() => result.current.selectNominator("sample-neha"));
    await waitFor(() => expect(result.current.selectedCredit?.payable)
      .toBe(true));
    await act(async () => {
      expect(await result.current.approveCredit(null)).toBe(true);
    });
    await waitFor(() => expect(result.current.selectedCredit?.approvedMinor)
      .toBe(140_000));
  });

  it("filters the best organizers", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useGrowthController({initialView:
      "best"}), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    act(() => result.current.setBestFilter("quiet"));
    expect(result.current.best.map((row) => row.name))
      .toEqual(["Harbor Social Club"]);
  });
});
