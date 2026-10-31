import {act, renderHook, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import {useOverviewController} from "./useOverviewController";

describe("useOverviewController", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("never substitutes sample records before a live session is ready", () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useOverviewController({
      adminRoles: ["adminOwner"],
      isSessionReady: false,
      mode: "live",
      onError: vi.fn(),
      onNotice: vi.fn(),
    }), {wrapper});

    expect(result.current.overview).toBeNull();
    expect(result.current.hostAnalytics).toBeNull();
    expect(result.current.overviewLoadedAt).toBeNull();
    expect(result.current.analyticsLoadedAt).toBeNull();
  });

  it("loads the sample overview and clears a scoped analytics query", async () => {
    vi.stubEnv("VITE_ADMIN_DATA_MODE", "sample");
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useOverviewController({
      adminRoles: [],
      isSessionReady: true,
      mode: "sample",
      onError: vi.fn(),
      onNotice: vi.fn(),
    }), {wrapper});

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.overview!.metrics.length).toBeGreaterThan(0);
    expect(result.current.hostAnalytics!.summaryCards.length).toBeGreaterThan(0);

    act(() => {
      result.current.setAnalyticsOrganizerId("club-1");
      result.current.setAnalyticsEventId("event-1");
    });
    expect(result.current.analyticsOrganizerId).toBe("club-1");
    act(() => result.current.clearAnalyticsScope());
    expect(result.current.analyticsOrganizerId).toBe("");
    expect(result.current.analyticsEventId).toBe("");
  });
});
