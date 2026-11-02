import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {useMoneyIssuesController} from "./useMoneyIssuesController";

describe("useMoneyIssuesController", () => {
  it("confirms a booking and moves to the next issue", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useMoneyIssuesController(), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.rows[0].kind).toBe("payment");
    expect(result.current.next?.kind).toBe("refund");
    await act(async () => {
      expect(await result.current.confirmBooking("Ticket sent")).toBe(true);
    });
    await waitFor(() => expect(result.current.lastOutcome?.result)
      .toBe("admitted"));
    expect(result.current.selected?.kind).toBe("refund");
    act(() => result.current.setKind("bill"));
    expect(result.current.rows.map((issue) => issue.kind)).toEqual(["bill"]);
  });
});
