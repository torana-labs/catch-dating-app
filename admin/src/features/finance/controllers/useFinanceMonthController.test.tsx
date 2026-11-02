import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {useFinanceMonthController} from "./useFinanceMonthController";

describe("useFinanceMonthController", () => {
  it("reads the month, enters a cost and exports the ledger", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() =>
      useFinanceMonthController({initialMonth: "2026-10"}), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.data?.costs.whatsappIsEstimate).toBe(true);
    await act(async () => {
      expect(await result.current.saveCost("whatsapp", 14_800, "Meta invoice"))
        .toBe(true);
    });
    await waitFor(() => expect(result.current.data?.costs.whatsappIsEstimate)
      .toBe(false));
    expect(await result.current.saveCost("ai", -1, null)).toBe(false);
    let file: Awaited<ReturnType<typeof result.current.exportMonth>> = null;
    await act(async () => {
      file = await result.current.exportMonth();
    });
    expect(file).toMatchObject({fileName: "catch-ledger-2026-10.csv"});
  });
});
