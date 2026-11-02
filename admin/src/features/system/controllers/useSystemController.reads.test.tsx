import {act, renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {sampleHostAnalytics, sampleOverview} from "../../../shared/api/sampleData";
import {sampleEventIntakeBridge, sampleMarketingOpsBridge} from "../../../shared/api/sampleOperationalData";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import type {AdminActionExecutionRecord} from "../../../shared/types/adminTypes";
import {useSystemController} from "./useSystemController";

const loaders = vi.hoisted(() => ({
  loadSystemActivity: vi.fn(),
  loadSystemEventIntake: vi.fn(),
  loadSystemHealth: vi.fn(),
  loadSystemHostAnalytics: vi.fn(),
  loadSystemMarketingBridge: vi.fn(),
}));

vi.mock("../api/systemRepository", () => loaders);

function record(overrides: Partial<AdminActionExecutionRecord>): AdminActionExecutionRecord {
  return {
    schemaVersion: 1, executionId: "e1", actionId: "overview.get", callable: "adminGetOverview",
    actorUid: "owner-1", actorRoles: ["adminOwner"], status: "succeeded", requestHash: "h",
    responseHash: null, target: null, errorCode: null, errorMessage: null, cliVersion: null,
    startedAt: "2026-11-01T08:00:00.000Z", finishedAt: null, updatedAt: "2026-11-01T08:00:00.000Z",
    ...overrides,
  };
}

describe("useSystemController reads", () => {
  beforeEach(() => {
    loaders.loadSystemActivity.mockReset().mockResolvedValue({schemaVersion: 1, generatedAt: "2026-11-01T08:00:00.000Z", rows: [], nextCursor: null});
    loaders.loadSystemHealth.mockReset().mockResolvedValue(sampleOverview);
    loaders.loadSystemHostAnalytics.mockReset().mockResolvedValue(sampleHostAnalytics);
    loaders.loadSystemMarketingBridge.mockReset().mockResolvedValue(sampleMarketingOpsBridge);
    loaders.loadSystemEventIntake.mockReset().mockResolvedValue(sampleEventIntakeBridge);
  });

  const render = (canReadHostAnalytics: boolean) => renderHook(
    () => useSystemController({canReadHostAnalytics, isSessionReady: true, mode: "live"}),
    {wrapper: createQueryHarness().wrapper}
  );

  it("never asks for owner-only host analytics for anyone else", async () => {
    const {result} = render(false);
    await waitFor(() => expect(result.current.signals.length).toBeGreaterThan(0));
    expect(loaders.loadSystemHostAnalytics).not.toHaveBeenCalled();
    expect(result.current.sources.map((source) => source.id)).toEqual(["overview", "marketing-bridge", "event-intake"]);
    await act(async () => {
      await result.current.refresh();
    });
    expect(loaders.loadSystemHostAnalytics).not.toHaveBeenCalled();
  });

  it("keeps one failed source apart from the others and retries only that one", async () => {
    loaders.loadSystemMarketingBridge.mockRejectedValueOnce(new Error("marketing failed"));
    const {result} = render(true);
    await waitFor(() => {
      expect(result.current.sources.find((source) => source.id === "marketing-bridge")?.failed).toBe(true);
      expect(result.current.sources.find((source) => source.id === "overview")?.failed).toBe(false);
    });
    expect(result.current.signals.some((signal) => signal.sourceId === "marketing-bridge")).toBe(false);
    expect(result.current.signals.some((signal) => signal.sourceId === "overview")).toBe(true);
    await act(async () => {
      await result.current.retrySource("marketing-bridge");
    });
    await waitFor(() => expect(result.current.sources.find((source) => source.id === "marketing-bridge")?.failed).toBe(false));
    expect(loaders.loadSystemMarketingBridge).toHaveBeenCalledTimes(2);
    expect(loaders.loadSystemHealth).toHaveBeenCalledTimes(1);
  });

  it("opens one detail at a time: a signal closes a receipt and the reverse", async () => {
    loaders.loadSystemActivity.mockResolvedValue({schemaVersion: 1, generatedAt: "2026-11-01T08:00:00.000Z", rows: [record({})], nextCursor: null});
    const {result} = render(true);
    await waitFor(() => {
      expect(result.current.rows.length).toBe(1);
      expect(result.current.signals.length).toBeGreaterThan(0);
    });
    act(() => result.current.select("e1"));
    expect(result.current.selected?.key).toBe("e1");
    const signalId = result.current.signals[0]!.id;
    act(() => result.current.selectSignal(signalId));
    expect(result.current.selected).toBeNull();
    expect(result.current.selectedSignal?.id).toBe(signalId);
    act(() => result.current.select("e1"));
    expect(result.current.selectedSignal).toBeNull();
  });

  it("loads the next page of activity on request", async () => {
    loaders.loadSystemActivity
      .mockResolvedValueOnce({schemaVersion: 1, generatedAt: "2026-11-01T08:00:00.000Z", rows: [record({executionId: "e1"})], nextCursor: "c1"})
      .mockResolvedValueOnce({schemaVersion: 1, generatedAt: "2026-11-01T08:00:01.000Z", rows: [record({executionId: "e2"})], nextCursor: null});
    const {result} = render(true);
    await waitFor(() => expect(result.current.hasMore).toBe(true));
    await act(async () => {
      await result.current.loadMore();
    });
    await waitFor(() => expect(result.current.rows.map((row) => row.key)).toEqual(["e1", "e2"]));
    expect(result.current.hasMore).toBe(false);
    expect(loaders.loadSystemActivity).toHaveBeenLastCalledWith({limit: 100, cursor: "c1"});
  });
});
