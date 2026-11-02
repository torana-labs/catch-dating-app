import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {isOverdue, useBillsController} from "./useBillsController";

const now = () => Date.parse("2026-11-18T12:00:00+05:30");

describe("useBillsController", () => {
  it("filters October's bills and finds the overdue ones", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useBillsController({month: "2026-10",
      now}), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.data?.counts.overdue).toBe(2);
    act(() => result.current.setFilter("overdue"));
    expect(result.current.rows.every((bill) => isOverdue(bill, now())))
      .toBe(true);
    act(() => result.current.setSearch("lantern"));
    expect(result.current.rows.map((bill) => bill.organizerName))
      .toEqual(["Lantern Lane Social"]);
  });

  it("sends a bill with the next invoice number", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useBillsController({month: "2026-10",
      now}), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    act(() => result.current.select("sample-padel_2026-10"));
    expect(result.current.selected?.status).toBe("toSend");
    await act(async () => {
      expect(await result.current.act("send", null)).toBe(true);
    });
    await waitFor(() => expect(result.current.selected?.status).toBe("sent"));
    expect(result.current.selected?.invoiceNumber).toBe("2026-27/033");
  });
});
