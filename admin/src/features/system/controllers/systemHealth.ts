import type {
  AdminOverviewResponse,
  EventIntakeBridge,
  HostAnalyticsResponse,
  MarketingOpsBridge,
  MarketingRunPlan,
} from "../../../shared/types/adminTypes";

export type SystemHealthSourceId = "overview" | "host-analytics" | "marketing-bridge" | "event-intake";
export type SystemHealthTone = "success" | "warning" | "danger";
type SignalState = "ok" | "warning" | "partial" | "missing" | "blocked";

/** One thing the data sources report about themselves; a problem when it isn't fine. */
export interface SystemSignal {
  id: string;
  sourceId: SystemHealthSourceId;
  source: string;
  label: string;
  tone: SystemHealthTone;
  evidence: string;
  /** What the state does and doesn't tell you. */
  meaning: string;
  owner: string;
  runbook: string;
  nextAction: string;
  readAt: string | null;
  /** The Admin page where this gets fixed. */
  path: string | null;
}

/** One data source: when it was read, and whether the read worked. */
export interface SystemHealthSource {
  id: SystemHealthSourceId;
  title: string;
  subtitle: string;
  tone: SystemHealthTone;
  /** The read failed, so it can be tried again. */
  failed: boolean;
}

const staleAfterMs = 7 * 86400000;
const sourceTitles: Record<SystemHealthSourceId, string> = {
  overview: "Queues and metrics",
  "host-analytics": "Host analytics",
  "marketing-bridge": "Marketing bridge",
  "event-intake": "Event intake",
};
const whenFormat = new Intl.DateTimeFormat("en-IN", {
  weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
});

export function formatWhen(value: string): string {
  const time = Date.parse(value);
  return Number.isNaN(time) ? value : whenFormat.format(new Date(time));
}

function isStale(value: string | null, nowMs: number): boolean {
  if (!value) return true;
  const time = Date.parse(value);
  return !Number.isFinite(time) || nowMs - time > staleAfterMs;
}

function toneFor(state: SignalState): SystemHealthTone {
  if (state === "blocked" || state === "missing") return "danger";
  return state === "warning" || state === "partial" ? "warning" : "success";
}

const toneRank: Record<SystemHealthTone, number> = {danger: 0, warning: 1, success: 2};

function readableId(value: string): string {
  return value.replace(/[-_]+/gu, " ").replace(/^\w/u, (match) => match.toUpperCase());
}

function overviewPath(id: string): string | null {
  const paths: Record<string, string> = {"signup-source": "/growth", "finance-ledger": "/money"};
  return paths[id] ?? null;
}

function freshnessSignal(input: {
  id: string;
  sourceId: SystemHealthSourceId;
  label: string;
  readAt: string | null;
  isEmpty: boolean;
  evidence: string;
  owner: string;
  runbook: string;
  path: string;
  nowMs: number;
}): SystemSignal {
  const {evidence, isEmpty, nowMs, readAt, ...rest} = input;
  const state: SignalState = isEmpty || !readAt || !Number.isFinite(Date.parse(readAt)) ? "missing" :
    isStale(readAt, nowMs) ? "warning" : "ok";
  return {
    ...rest,
    source: sourceTitles[input.sourceId],
    tone: toneFor(state),
    evidence: readAt ? `${evidence}. Written ${formatWhen(readAt)}.` : "It has no written time.",
    meaning: "Counted as stale when it is more than 7 days old.",
    nextAction: state === "ok" ? "Nothing to do." : "Regenerate and review it where it is handled.",
    readAt,
  };
}

function runPlanSignal(input: {
  id: string;
  sourceId: SystemHealthSourceId;
  label: string;
  runPlan: MarketingRunPlan;
  owner: string;
  runbook: string;
  path: string;
}): SystemSignal {
  const {runPlan, ...rest} = input;
  const notConfigured = runPlan.automationPolicy.searchProvider === "not_configured" ||
    !runPlan.automationPolicy.networkFetchesEnabled;
  const state: SignalState = notConfigured ? "partial" : runPlan.status === "paused" ? "warning" : "ok";
  return {
    ...rest,
    source: sourceTitles[input.sourceId],
    tone: toneFor(state),
    evidence: `Plan ${runPlan.status}, ${runPlan.schedule.cadence}. Search provider: ` +
      `${runPlan.automationPolicy.searchProvider}. Network fetches ` +
      `${runPlan.automationPolicy.networkFetchesEnabled ? "on" : "off"}.`,
    meaning: "This is how the crawl is set up, not whether its last run worked. Runs aren't recorded here.",
    nextAction: notConfigured ?
      "Set the search provider and network policy where this is handled. This isn't a failed job." :
      "Nothing to do.",
    readAt: runPlan.generatedAt,
  };
}

/** Every signal the sources report, the worst first. A source that failed to read adds none. */
export function systemSignals({
  eventIntake,
  hostAnalytics,
  marketingBridge,
  nowMs = Date.now(),
  overview,
}: {
  eventIntake?: EventIntakeBridge;
  hostAnalytics?: HostAnalyticsResponse;
  marketingBridge?: MarketingOpsBridge;
  nowMs?: number;
  overview?: AdminOverviewResponse;
}): SystemSignal[] {
  const signals: SystemSignal[] = [];
  for (const row of overview?.dataQuality ?? []) {
    signals.push({
      id: `overview-${row.id}`,
      sourceId: "overview",
      source: sourceTitles.overview,
      label: row.label,
      tone: toneFor(row.state),
      evidence: row.detail,
      meaning: "Reported by the overview snapshot.",
      owner: row.owner,
      runbook: row.runbook,
      nextAction: row.nextAction,
      readAt: overview?.generatedAt ?? null,
      path: overviewPath(row.id),
    });
  }
  for (const row of hostAnalytics?.dataQuality ?? []) {
    signals.push({
      id: `host-analytics-${row.id}`,
      sourceId: "host-analytics",
      source: sourceTitles["host-analytics"],
      label: readableId(row.id),
      tone: toneFor(row.state),
      evidence: row.detail,
      meaning: "Reported by the last 30 days of host analytics.",
      owner: row.owner,
      runbook: row.runbook,
      nextAction: row.nextAction,
      readAt: hostAnalytics?.generatedAt ?? null,
      path: "/growth",
    });
  }
  if (marketingBridge) {
    signals.push(
      freshnessSignal({
        id: "marketing-bridge-freshness",
        sourceId: "marketing-bridge",
        label: "Marketing bridge",
        readAt: marketingBridge.generatedAt,
        isEmpty: false,
        evidence: `${marketingBridge.city.label}, week of ${marketingBridge.weekStart}`,
        owner: "Marketing ops",
        runbook: "marketingOpsDashboards/current",
        path: "/marketing",
        nowMs,
      }),
      runPlanSignal({
        id: "marketing-run-plan",
        sourceId: "marketing-bridge",
        label: "Marketing crawl plan",
        runPlan: marketingBridge.runPlan,
        owner: "Marketing ops",
        runbook: "Admin, Marketing, Diagnostics",
        path: "/marketing/diagnostics",
      })
    );
  }
  if (eventIntake) {
    signals.push(
      freshnessSignal({
        id: "event-intake-freshness",
        sourceId: "event-intake",
        label: "Event intake",
        readAt: eventIntake.generatedAt,
        isEmpty: eventIntake.bridgeSource === "empty",
        evidence: `${eventIntake.eventCandidates?.length ?? 0} candidates from ` +
          `${eventIntake.sourceResults?.length ?? 0} source results`,
        owner: "Events intake",
        runbook: "Admin, Inbox",
        path: "/inbox",
        nowMs,
      }),
      runPlanSignal({
        id: "event-intake-run-plan",
        sourceId: "event-intake",
        label: "Event intake crawl plan",
        runPlan: eventIntake.runPlan,
        owner: "Events intake",
        runbook: "Admin, Inbox",
        path: "/inbox",
      })
    );
  }
  return signals.sort((left, right) =>
    toneRank[left.tone] - toneRank[right.tone] ||
    left.owner.localeCompare(right.owner) || left.label.localeCompare(right.label));
}

/** A source's row: a failed read says so, keeping the last read when there is one. */
export function healthSource(
  id: SystemHealthSourceId,
  read: {generatedAt: string | null; hasData: boolean; failed: boolean; isLoading: boolean},
  nowMs = Date.now()
): SystemHealthSource {
  const title = sourceTitles[id];
  if (read.failed) {
    return {
      id, title, failed: true,
      tone: read.hasData ? "warning" : "danger",
      subtitle: read.hasData ? "Refresh failed, showing the last read" : "Couldn't read it",
    };
  }
  if (!read.hasData) return {id, title, failed: false, tone: "warning", subtitle: read.isLoading ? "Reading" : "Not read"};
  return {
    id, title, failed: false,
    tone: isStale(read.generatedAt, nowMs) ? "warning" : "success",
    subtitle: read.generatedAt ? `Read ${formatWhen(read.generatedAt)}` : "No written time",
  };
}
