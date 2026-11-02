import {describe, expect, it} from "vitest";
import {sampleHostAnalytics, sampleOverview} from "../../../shared/api/sampleData";
import {sampleEventIntakeBridge, sampleMarketingOpsBridge} from "../../../shared/api/sampleOperationalData";
import {healthSource, systemSignals} from "./systemHealth";

const nowMs = Date.parse("2026-11-02T00:00:00.000Z");
const read = {generatedAt: "2026-11-01T00:00:00.000Z", hasData: true, failed: false, isLoading: false};

describe("systemSignals", () => {
  it("lists the worst first, then by owner", () => {
    const signals = systemSignals({
      eventIntake: sampleEventIntakeBridge,
      hostAnalytics: sampleHostAnalytics,
      marketingBridge: sampleMarketingOpsBridge,
      overview: sampleOverview,
      nowMs,
    });
    const ranks = signals.map((signal) => ({danger: 0, warning: 1, success: 2})[signal.tone]);
    expect(ranks).toEqual([...ranks].sort((left, right) => left - right));
    expect(new Set(signals.map((signal) => signal.sourceId)).size).toBe(4);
  });

  it("adds nothing for a source that wasn't read", () => {
    const signals = systemSignals({overview: sampleOverview, nowMs});
    expect(signals.length).toBe(sampleOverview.dataQuality.length);
    expect(systemSignals({nowMs})).toEqual([]);
  });

  it("says a crawl plan is setup, never a failed job", () => {
    const signals = systemSignals({marketingBridge: sampleMarketingOpsBridge, eventIntake: sampleEventIntakeBridge, nowMs});
    const plans = signals.filter((signal) => signal.id.endsWith("-run-plan"));
    expect(plans).toHaveLength(2);
    for (const plan of plans) expect(plan.meaning).toContain("not whether its last run worked");
  });

  it("flags a bridge written more than 7 days ago, and an empty or undated one harder", () => {
    const signal = (bridge: Partial<typeof sampleEventIntakeBridge>) =>
      systemSignals({eventIntake: {...sampleEventIntakeBridge, ...bridge}, nowMs})
        .find((item) => item.id === "event-intake-freshness");
    expect(signal({generatedAt: "2026-11-01T00:00:00.000Z", bridgeSource: "operations"})?.tone).toBe("success");
    expect(signal({generatedAt: "2026-10-01T00:00:00.000Z", bridgeSource: "operations"})?.tone).toBe("warning");
    expect(signal({generatedAt: "2026-11-01T00:00:00.000Z", bridgeSource: "empty"})?.tone).toBe("danger");
    expect(signal({generatedAt: "not a date", bridgeSource: "operations"})?.tone).toBe("danger");
  });

  it("points each signal at the page that handles it", () => {
    const signals = systemSignals({overview: sampleOverview, hostAnalytics: sampleHostAnalytics, nowMs});
    expect(signals.find((signal) => signal.id === "overview-finance-ledger")?.path).toBe("/money");
    expect(signals.find((signal) => signal.sourceId === "host-analytics")?.path).toBe("/growth");
  });
});

describe("healthSource", () => {
  it("is fresh when read recently and asks for a check when old", () => {
    expect(healthSource("overview", read, nowMs)).toMatchObject({tone: "success", failed: false});
    expect(healthSource("overview", {...read, generatedAt: "2026-10-01T00:00:00.000Z"}, nowMs).tone).toBe("warning");
  });

  it("says when a read failed, keeping the last read if there is one", () => {
    expect(healthSource("overview", {...read, failed: true}, nowMs))
      .toMatchObject({tone: "warning", failed: true, subtitle: "Refresh failed, showing the last read"});
    expect(healthSource("overview", {...read, failed: true, hasData: false}, nowMs))
      .toMatchObject({tone: "danger", failed: true, subtitle: "Couldn't read it"});
    expect(healthSource("overview", {...read, hasData: false, isLoading: true}, nowMs).subtitle).toBe("Reading");
  });
});
