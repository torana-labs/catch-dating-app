import {act, renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {sampleHostAnalytics, sampleOverview} from "../../../shared/api/sampleData";
import {
  sampleEventIntakeBridge,
  sampleMarketingOpsBridge,
} from "../../../shared/api/sampleOperationalData";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import type {
  EventIntakeBridge,
  MarketingOpsBridge,
} from "../../../shared/types/adminTypes";
import {
  buildDataQualityRows,
  useDataQualityController,
} from "./useDataQualityController";

const mocks = vi.hoisted(() => ({
  loadDataQualityEventIntakeBridge: vi.fn(),
  loadDataQualityHostAnalytics: vi.fn(),
  loadDataQualityMarketingBridge: vi.fn(),
  loadDataQualityOverview: vi.fn(),
}));

vi.mock("../api/dataQualityRepository", () => mocks);

describe("useDataQualityController", () => {
  beforeEach(() => {
    mocks.loadDataQualityOverview.mockReset().mockResolvedValue(sampleOverview);
    mocks.loadDataQualityHostAnalytics.mockReset().mockResolvedValue(sampleHostAnalytics);
    mocks.loadDataQualityMarketingBridge.mockReset().mockResolvedValue(
      sampleMarketingOpsBridge as MarketingOpsBridge
    );
    mocks.loadDataQualityEventIntakeBridge.mockReset().mockResolvedValue(
      sampleEventIntakeBridge as EventIntakeBridge
    );
  });

  it("keeps source failures isolated and leaves selection route-owned", async () => {
    mocks.loadDataQualityOverview.mockRejectedValue(new Error("overview failed"));
    const onSelectSignalId = vi.fn();
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useDataQualityController({
      onError: vi.fn(),
      onSelectSignalId,
    }), {wrapper});

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isPartial).toBe(true);
    expect(result.current.failedSources.map((source) => source.sourceId)).toEqual(["overview"]);
    expect(result.current.rows.length).toBeGreaterThan(0);
    expect(result.current.selected).toBeNull();

    const row = result.current.rows[0]!;
    act(() => result.current.select(row));
    expect(onSelectSignalId).toHaveBeenCalledWith(row.id);

    act(() => {
      result.current.setSeverityFilter(row.severity);
      result.current.setOwnerFilter(row.owner);
      result.current.setQuery(row.label);
    });
    expect(result.current.filteredRows.every((item) =>
      item.severity === row.severity && item.owner === row.owner
    )).toBe(true);
  });

  it("does not substitute a signal for an unavailable direct link", async () => {
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useDataQualityController({
      onError: vi.fn(),
      selectedSignalId: "missing-signal",
    }), {wrapper});
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.selected).toBeNull();
    expect(result.current.selectedUnavailable).toBe(true);
  });

  it("retries only the requested source read", async () => {
    mocks.loadDataQualityOverview.mockRejectedValueOnce(new Error("overview failed"));
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useDataQualityController({onError: vi.fn()}), {wrapper});
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mocks.loadDataQualityOverview.mockResolvedValue(sampleOverview);

    await act(async () => {
      await expect(result.current.retrySource("overview")).resolves.toBe(true);
    });
    expect(mocks.loadDataQualityOverview).toHaveBeenCalledTimes(2);
    expect(mocks.loadDataQualityMarketingBridge).toHaveBeenCalledTimes(1);
  });

  it("sorts by severity then owner and labels run plans as configuration", () => {
    const rows = buildDataQualityRows({
      eventIntake: sampleEventIntakeBridge,
      marketingBridge: sampleMarketingOpsBridge,
      overview: sampleOverview,
    });
    const ranks = rows.map((row) => row.severity === "blocked" ? 3 : row.severity === "warning" ? 2 : 1);
    expect(ranks).toEqual([...ranks].sort((left, right) => right - left));
    const planRows = rows.filter((row) => row.category === "Run-plan configuration");
    expect(planRows.length).toBe(2);
    expect(planRows.every((row) =>
      row.stateDefinition.includes("not scheduler last-run time") &&
      !row.source.toLowerCase().includes("job health")
    )).toBe(true);
  });

  it("shows the full unavailable state when every source fails", async () => {
    Object.values(mocks).forEach((loader) => loader.mockRejectedValue(new Error("unavailable")));
    const onError = vi.fn();
    const {wrapper} = createQueryHarness();
    const {result} = renderHook(() => useDataQualityController({onError}), {wrapper});
    await waitFor(() => expect(result.current.isUnavailable).toBe(true));
    expect(result.current.rows).toEqual([]);
    expect(onError).toHaveBeenCalledWith("All data-quality sources are unavailable.");
  });
});
