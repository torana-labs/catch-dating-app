import {act, renderHook, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {useUserAnalyticsController} from "./useUserAnalyticsController";

describe("useUserAnalyticsController", () => {
  it("auto-loads the sample user and rejects unsupported lookup inputs", async () => {
    const onError = vi.fn();
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useUserAnalyticsController({
      onError,
      onNotice: vi.fn(),
    }), {wrapper});

    await waitFor(() => expect(result.current.report?.scope.userId).toBe("user-1"));
    act(() => result.current.setUserId("bad uid with spaces"));
    expect(result.current.lookupContract.canLoad).toBe(false);
    await act(async () => {
      expect(await result.current.load()).toBe(false);
    });
    expect(onError).toHaveBeenLastCalledWith(expect.stringContaining("does not search email"));
  });

  it("masks the prior report as soon as the exact uid changes", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useUserAnalyticsController({
      onError: vi.fn(),
      onNotice: vi.fn(),
    }), {wrapper});

    await waitFor(() => expect(result.current.report?.scope.userId).toBe("user-1"));
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    act(() => result.current.setUserId("user-2"));
    expect(result.current.report).toBeNull();
    expect(["idle", "loading"]).toContain(result.current.viewState);

    await act(async () => {
      expect(await result.current.load()).toBe(true);
    });
    await waitFor(() => expect(result.current.report?.scope.userId).toBe("user-2"));
  });

  it("blocks an inverted custom range before querying", async () => {
    const onError = vi.fn();
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useUserAnalyticsController({
      onError,
      onNotice: vi.fn(),
    }), {wrapper});
    await waitFor(() => expect(result.current.report?.scope.userId).toBe("user-1"));

    act(() => {
      result.current.setRangePreset("custom");
      result.current.setStartDate("2026-07-10");
      result.current.setEndDate("2026-07-01");
    });
    await act(async () => expect(await result.current.load()).toBe(false));
    expect(onError).toHaveBeenLastCalledWith(
      "Start date must be on or before end date."
    );
  });
});
