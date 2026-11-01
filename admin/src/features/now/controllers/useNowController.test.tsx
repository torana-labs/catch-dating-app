import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {createQueryHarness} from "../../../shared/test/queryHarness";
import type {AdminOverviewResponse} from "../../../shared/types/adminTypes";
import {buildNowModel, useNowController, waitingLabel} from "./useNowController";

const now = Date.parse("2026-11-01T12:00:00Z");
const hoursAgo = (hours: number) => new Date(now - hours * 3600_000).toISOString();

function overview(): AdminOverviewResponse {
  const item = (id: string, title: string, createdAt: string | null) =>
    ({id, title, detail: "detail", status: "open", createdAt, targetPath: `path/${id}`});
  return {
    generatedAt: hoursAgo(0),
    timezone: "UTC",
    metrics: [{id: "completedPayments", label: "Completed payments", value: 186}],
    queues: {
      safetyReports: [item("r1", "Harassment in chat", hoursAgo(26))],
      moderationFlags: [],
      eventSafetyReports: [],
      accessApplications: [item("a1", "Launch access", null)],
      organizerClaimRequests: [item("c1", "Bhag Club", hoursAgo(80))],
      organizerIndexReviews: [],
      paymentIssues: [item("p1", "Payment failed", hoursAgo(50))],
    },
    dataQuality: [{id: "s1", label: "Payments", state: "warning", detail: "Late.", owner: "ops", runbook: "", nextAction: "Rerun."}],
  };
}

describe("useNowController", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("lists every queue item oldest first, with undated items last and age tones", () => {
    const model = buildNowModel(overview(), now);
    expect(model.items.map((item) => item.title)).toEqual(["Bhag Club", "Payment failed", "Harassment in chat", "Launch access"]);
    expect(model.items.map((item) => item.tone)).toEqual(["danger", "warning", "neutral", "neutral"]);
    expect(model.items[0]).toMatchObject({destination: "organizers", targetPath: "path/c1", subtitle: "Claim · detail", waiting: "3 days"});
    expect(model.waiting).toBe(4);
    expect(model.overTwoDays).toBe(2);
    expect(model.kinds.find((kind) => kind.destination === "safety")).toMatchObject({count: 1, summary: "1 safety report"});
    expect(model.sources[0]).toMatchObject({tone: "warning", detail: "Late. Next: Rerun."});
  });

  it("words waiting time in minutes, hours and days", () => {
    expect(waitingLabel(hoursAgo(0.5), now)).toBe("30 minutes");
    expect(waitingLabel(hoursAgo(5), now)).toBe("5 hours");
    expect(waitingLabel(hoursAgo(72), now)).toBe("3 days");
    expect(waitingLabel("not a date", now)).toBeNull();
  });

  it("never loads before a live session is ready, and loads sample data", async () => {
    const live = renderHook(() => useNowController({isSessionReady: false, mode: "live"}), {wrapper: createQueryHarness().wrapper});
    expect(live.result.current.model).toBeNull();
    vi.stubEnv("VITE_ADMIN_DATA_MODE", "sample");
    const sample = renderHook(() => useNowController({isSessionReady: true, mode: "sample"}), {wrapper: createQueryHarness().wrapper});
    await waitFor(() => expect(sample.result.current.model).not.toBeNull());
    expect(sample.result.current.model!.items.length).toBeGreaterThan(0);
  });
});
