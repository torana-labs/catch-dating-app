import {act, renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {resetSampleSafety} from "../../../shared/api/sampleSafety";
import {useAccountSafetyController} from "./useAccountSafetyController";

describe("useAccountSafetyController", () => {
  beforeEach(() => resetSampleSafety());

  it("lists actions in force with counts per step", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useAccountSafetyController({
      onError: vi.fn(), onNotice: vi.fn()}), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    expect(result.current.counts).toEqual(
      {all: 5, warn: 1, restrict: 2, suspend: 1, ban: 1});
    act(() => result.current.setKind("restrict"));
    expect(result.current.items.map((item) => item.displayName))
      .toEqual(["Neel P.", "Arjun M."]);
  });

  it("shows waiting appeals and decides one", async () => {
    const {wrapper} = createQueryHarness();
    const onNotice = vi.fn();
    const {result} = renderHook(() => useAccountSafetyController({
      onError: vi.fn(), onNotice}), {wrapper});
    act(() => result.current.setView("appeals"));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.selected?.displayName).toBe("Vikram S.");
    expect(result.current.selected?.canReviewAppeal).toBe(false);
    await act(async () => {
      expect(await result.current.decide({actionId: "sample-action-vikram",
        outcome: "reduce", reduceTo: {kind: "suspend", durationDays: 30},
        messageToUser: "We changed this to a 30-day suspension.",
        note: "First pattern; reporters agree it stopped."})).toBe(true);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(0));
    expect(onNotice).toHaveBeenCalledWith("Appeal decided.");
  });

  it("takes an action and lists it first", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useAccountSafetyController({
      onError: vi.fn(), onNotice: vi.fn()}), {wrapper});
    await waitFor(() => expect(result.current.loadState).toBe("ready"));
    await act(async () => {
      await result.current.take({uid: "user_204", kind: "warn",
        durationDays: null, reasonCode: "spam", messageToUser: "Please stop.",
        caseTargetPath: null, notifyReporter: false, appealable: true,
        note: "Spam in a group chat."});
    });
    await waitFor(() => expect(result.current.counts.all).toBe(6));
    expect(result.current.items[0].reasonLabel).toBe("Spam");
  });
});
