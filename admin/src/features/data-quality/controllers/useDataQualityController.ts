import {useQuery} from "@tanstack/react-query";
import {useCallback, useEffect, useMemo, useState} from "react";
import type {
  AdminOverviewResponse,
  EventIntakeBridge,
  HostAnalyticsResponse,
  MarketingOpsBridge,
  MarketingRunPlan,
} from "../../../shared/types/adminTypes";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {
  loadDataQualityEventIntakeBridge,
  loadDataQualityHostAnalytics,
  loadDataQualityMarketingBridge,
  loadDataQualityOverview,
} from "../api/dataQualityRepository";

export type DataQualitySourceId =
  | "overview"
  | "host-analytics"
  | "marketing-bridge"
  | "event-intake";
export type DataQualityState = "ok" | "warning" | "partial" | "missing" | "blocked";
export type DataQualitySeverity = "all" | "blocked" | "warning" | "healthy";
export type DataQualityFreshness = "current" | "stale" | "unknown";
export type DataQualityConfiguration = "configured" | "not_configured" | "not_applicable";

export interface DataQualityRow {
  id: string;
  sourceId: DataQualitySourceId;
  source: string;
  category: string;
  label: string;
  state: DataQualityState;
  severity: Exclude<DataQualitySeverity, "all">;
  detail: string;
  stateDefinition: string;
  owner: string;
  runbook: string;
  nextAction: string;
  updatedAt: string | null;
  freshness: DataQualityFreshness;
  timestampLabel: string;
  owningWorkflowPath: string | null;
}

export interface DataQualitySourceHealth {
  sourceId: DataQualitySourceId;
  label: string;
  loadState: "loading" | "loaded" | "failed";
  freshness: DataQualityFreshness;
  configuration: DataQualityConfiguration;
  generatedAt: string | null;
  loadedAt: string | null;
  error: string | null;
  hasCachedData: boolean;
}

export interface DataQualityMetrics {
  openIssues: number;
  blocked: number;
  warnings: number;
  owners: number;
}

export interface DataQualityController {
  failedSources: DataQualitySourceHealth[];
  filteredRows: DataQualityRow[];
  isLoading: boolean;
  isPartial: boolean;
  isUnavailable: boolean;
  metrics: DataQualityMetrics;
  ownerFilter: string;
  ownerOptions: string[];
  query: string;
  rows: DataQualityRow[];
  selected: DataQualityRow | null;
  selectedSignalId: string | null;
  selectedUnavailable: boolean;
  severityFilter: DataQualitySeverity;
  sourceHealth: DataQualitySourceHealth[];
  refresh: () => Promise<boolean>;
  retrySource: (sourceId: DataQualitySourceId) => Promise<boolean>;
  select: (row: DataQualityRow) => void;
  setOwnerFilter: (value: string) => void;
  setQuery: (value: string) => void;
  setSeverityFilter: (value: DataQualitySeverity) => void;
}

export function useDataQualityController({
  onError,
  onSelectSignalId,
  selectedSignalId = null,
}: {
  onError: (message: string | null) => void;
  onSelectSignalId?: (signalId: string) => void;
  selectedSignalId?: string | null;
}): DataQualityController {
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<DataQualitySeverity>("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const overviewQuery = useQuery({
    queryKey: adminQueryKeys.dataQuality.source("overview"),
    queryFn: loadDataQualityOverview,
  });
  const hostAnalyticsQuery = useQuery({
    queryKey: adminQueryKeys.dataQuality.source("host-analytics"),
    queryFn: loadDataQualityHostAnalytics,
  });
  const marketingBridgeQuery = useQuery({
    queryKey: adminQueryKeys.dataQuality.source("marketing-bridge"),
    queryFn: loadDataQualityMarketingBridge,
  });
  const eventIntakeQuery = useQuery({
    queryKey: adminQueryKeys.dataQuality.source("event-intake"),
    queryFn: loadDataQualityEventIntakeBridge,
  });

  const sourceHealth = useMemo<DataQualitySourceHealth[]>(() => [
    buildSourceHealth("overview", "Overview quality", overviewQuery, overviewQuery.data?.generatedAt ?? null),
    buildSourceHealth("host-analytics", "Host analytics quality", hostAnalyticsQuery, hostAnalyticsQuery.data?.generatedAt ?? null),
    buildSourceHealth("marketing-bridge", "Marketing bridge", marketingBridgeQuery, marketingBridgeQuery.data?.generatedAt ?? null, runPlanConfiguration(marketingBridgeQuery.data?.runPlan)),
    buildSourceHealth("event-intake", "Event Intake projection", eventIntakeQuery, eventIntakeQuery.data?.generatedAt ?? null, runPlanConfiguration(eventIntakeQuery.data?.runPlan)),
  ], [
    eventIntakeQuery.data,
    eventIntakeQuery.dataUpdatedAt,
    eventIntakeQuery.error,
    eventIntakeQuery.isPending,
    hostAnalyticsQuery.data,
    hostAnalyticsQuery.dataUpdatedAt,
    hostAnalyticsQuery.error,
    hostAnalyticsQuery.isPending,
    marketingBridgeQuery.data,
    marketingBridgeQuery.dataUpdatedAt,
    marketingBridgeQuery.error,
    marketingBridgeQuery.isPending,
    overviewQuery.data,
    overviewQuery.dataUpdatedAt,
    overviewQuery.error,
    overviewQuery.isPending,
  ]);
  const rows = useMemo(() => buildDataQualityRows({
    eventIntake: eventIntakeQuery.data,
    hostAnalytics: hostAnalyticsQuery.data,
    marketingBridge: marketingBridgeQuery.data,
    overview: overviewQuery.data,
  }), [
    eventIntakeQuery.data,
    hostAnalyticsQuery.data,
    marketingBridgeQuery.data,
    overviewQuery.data,
  ]);
  const failedSources = sourceHealth.filter((source) => source.error !== null);
  const isLoading = sourceHealth.some((source) => source.loadState === "loading");
  const isPartial = failedSources.length > 0 && rows.length > 0;
  const isUnavailable = !isLoading && rows.length === 0 &&
    sourceHealth.every((source) => source.loadState === "failed");

  useEffect(() => {
    onError(isUnavailable ? "All data-quality sources are unavailable." : null);
  }, [isUnavailable, onError]);

  const retrySource = useCallback(async (sourceId: DataQualitySourceId) => {
    const result = sourceId === "overview" ? await overviewQuery.refetch() :
      sourceId === "host-analytics" ? await hostAnalyticsQuery.refetch() :
      sourceId === "marketing-bridge" ? await marketingBridgeQuery.refetch() :
      await eventIntakeQuery.refetch();
    return !result.error;
  }, [eventIntakeQuery, hostAnalyticsQuery, marketingBridgeQuery, overviewQuery]);

  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([
      overviewQuery.refetch(),
      hostAnalyticsQuery.refetch(),
      marketingBridgeQuery.refetch(),
      eventIntakeQuery.refetch(),
    ]);
    return results.some((result) => result.status === "fulfilled" && !result.value.error);
  }, [eventIntakeQuery, hostAnalyticsQuery, marketingBridgeQuery, overviewQuery]);

  const ownerOptions = useMemo(
    () => [...new Set(rows.map((row) => row.owner))].sort(),
    [rows]
  );
  const filteredRows = useMemo(
    () => filterRows(rows, severityFilter, ownerFilter, query),
    [ownerFilter, query, rows, severityFilter]
  );
  const metrics = useMemo(() => dataQualityMetrics(rows), [rows]);
  const selected = useMemo(
    () => rows.find((row) => row.id === selectedSignalId) ?? null,
    [rows, selectedSignalId]
  );
  const selectedUnavailable = Boolean(selectedSignalId && !selected && !isLoading);
  const select = useCallback((row: DataQualityRow) => {
    onSelectSignalId?.(row.id);
    onError(null);
  }, [onError, onSelectSignalId]);

  return {
    failedSources,
    filteredRows,
    isLoading,
    isPartial,
    isUnavailable,
    metrics,
    ownerFilter,
    ownerOptions,
    query,
    rows,
    selected,
    selectedSignalId,
    selectedUnavailable,
    severityFilter,
    sourceHealth,
    refresh,
    retrySource,
    select,
    setOwnerFilter,
    setQuery,
    setSeverityFilter,
  };
}

export function buildDataQualityRows({
  eventIntake,
  hostAnalytics,
  marketingBridge,
  overview,
}: {
  eventIntake?: EventIntakeBridge;
  hostAnalytics?: HostAnalyticsResponse;
  marketingBridge?: MarketingOpsBridge;
  overview?: AdminOverviewResponse;
}): DataQualityRow[] {
  const rows: DataQualityRow[] = [];
  if (overview) {
    rows.push(...overview.dataQuality.map((row) => qualityRow({
      id: `overview-${row.id}`,
      sourceId: "overview",
      source: "Overview",
      category: "Platform signal",
      label: row.label,
      state: row.state,
      detail: row.detail,
      stateDefinition: "State is provided by the admin overview read model.",
      owner: row.owner,
      runbook: row.runbook,
      nextAction: row.nextAction,
      updatedAt: overview.generatedAt,
      owningWorkflowPath: overviewWorkflowPath(row.id),
    })));
  }
  if (hostAnalytics) {
    rows.push(...hostAnalytics.dataQuality.map((row) => qualityRow({
      id: `host-analytics-${row.id}`,
      sourceId: "host-analytics",
      source: "Host analytics",
      category: "Analytics signal",
      label: readableId(row.id),
      state: row.state,
      detail: row.detail,
      stateDefinition: "State is provided by the fixed 30-day host analytics read.",
      owner: row.owner,
      runbook: row.runbook,
      nextAction: row.nextAction,
      updatedAt: hostAnalytics.generatedAt,
      owningWorkflowPath: "/growth",
    })));
  }
  if (marketingBridge) {
    rows.push(buildBridgeFreshnessRow({
      id: "generated-marketing-bridge",
      sourceId: "marketing-bridge",
      source: "Marketing bridge",
      label: "Marketing ops bridge",
      generatedAt: marketingBridge.generatedAt,
      isEmpty: false,
      detail: `${marketingBridge.city.label} · week of ${marketingBridge.weekStart}`,
      owner: "Marketing ops",
      runbook: "marketingOpsDashboards/current",
      owningWorkflowPath: "/marketing",
    }));
    rows.push(buildRunPlanConfigurationRow({
      id: "marketing-run-plan-configuration",
      sourceId: "marketing-bridge",
      source: "Marketing crawl configuration",
      label: "Marketing source crawl plan",
      owner: "Marketing ops",
      runbook: "admin > Marketing > Diagnostics",
      runPlan: marketingBridge.runPlan,
      owningWorkflowPath: "/marketing/diagnostics",
    }));
  }
  if (eventIntake) {
    rows.push(buildBridgeFreshnessRow({
      id: "event-intake-dashboard-freshness",
      sourceId: "event-intake",
      source: "Supply Intake operations",
      label: "Event Intake projection",
      generatedAt: eventIntake.generatedAt,
      isEmpty: eventIntake.bridgeSource === "empty",
      detail: `${arrayLength(eventIntake.eventCandidates)} candidates from ${arrayLength(eventIntake.sourceResults)} source results`,
      owner: "Events intake",
      runbook: "admin > Intake > Events",
      owningWorkflowPath: "/intake/events",
    }));
    rows.push(buildRunPlanConfigurationRow({
      id: "event-intake-run-plan-configuration",
      sourceId: "event-intake",
      source: "Event Intake crawl configuration",
      label: "Event Intake source crawl plan",
      owner: "Events intake",
      runbook: "admin > Intake > Crawl setup",
      runPlan: eventIntake.runPlan,
      owningWorkflowPath: "/intake/events",
    }));
  }
  return rows.sort((left, right) =>
    severityRank(right.severity) - severityRank(left.severity) ||
    left.owner.localeCompare(right.owner) || left.label.localeCompare(right.label)
  );
}

function buildBridgeFreshnessRow({
  detail,
  generatedAt,
  id,
  isEmpty,
  label,
  owner,
  owningWorkflowPath,
  runbook,
  source,
  sourceId,
}: {
  detail: string;
  generatedAt: string | null;
  id: string;
  isEmpty: boolean;
  label: string;
  owner: string;
  owningWorkflowPath: string;
  runbook: string;
  source: string;
  sourceId: DataQualitySourceId;
}): DataQualityRow {
  const freshness = freshnessFor(generatedAt);
  const state: DataQualityState = isEmpty || freshness === "unknown" ? "missing" :
    freshness === "stale" ? "warning" : "ok";
  return qualityRow({
    id,
    sourceId,
    source,
    category: "Source freshness",
    label,
    state,
    detail: generatedAt ? `${detail}. Generated ${formatAge(generatedAt)}.` : "No generated timestamp is available.",
    stateDefinition: "Stale is a client heuristic when source generatedAt is more than 7 days old; missing or invalid time is unknown.",
    owner,
    runbook,
    nextAction: state === "ok" ? "No action." : "Regenerate and review the source artifact in its owning workflow.",
    updatedAt: generatedAt,
    owningWorkflowPath,
  });
}

function buildRunPlanConfigurationRow({
  id,
  label,
  owner,
  owningWorkflowPath,
  runbook,
  runPlan,
  source,
  sourceId,
}: {
  id: string;
  label: string;
  owner: string;
  owningWorkflowPath: string;
  runbook: string;
  runPlan: MarketingRunPlan;
  source: string;
  sourceId: DataQualitySourceId;
}): DataQualityRow {
  const configuration = runPlanConfiguration(runPlan);
  const state: DataQualityState = configuration === "not_configured" ? "partial" :
    runPlan.status === "paused" ? "warning" : "ok";
  return qualityRow({
    id,
    sourceId,
    source,
    category: "Run-plan configuration",
    label,
    state,
    detail: `Configured plan: ${runPlan.status}; ${runPlan.schedule.cadence}; provider ${runPlan.automationPolicy.searchProvider}; network fetches ${runPlan.automationPolicy.networkFetchesEnabled ? "enabled" : "disabled"}.`,
    stateDefinition: "This is plan and policy configuration only. Plan generated time is not scheduler last-run time; no last-run, last-error, acknowledgement, or backfill receipt exists.",
    owner,
    runbook,
    nextAction: configuration === "configured" ? "No configuration action." : "Configure the source provider and network policy in the owning workflow; do not describe this as a failed job.",
    updatedAt: runPlan.generatedAt,
    owningWorkflowPath,
  });
}

function qualityRow(input: Omit<DataQualityRow, "freshness" | "severity" | "timestampLabel">): DataQualityRow {
  const freshness = freshnessFor(input.updatedAt);
  return {
    ...input,
    severity: severityFor(input.state),
    freshness,
    timestampLabel: freshness === "stale" ? "Stale heuristic (>7 days)" :
      freshness === "current" ? "Current by 7-day heuristic" : "Freshness unknown",
  };
}

function buildSourceHealth<T>(
  sourceId: DataQualitySourceId,
  label: string,
  query: {data?: T; dataUpdatedAt: number; error: unknown; isPending: boolean},
  generatedAt: string | null,
  configuration: DataQualityConfiguration = "not_applicable"
): DataQualitySourceHealth {
  const hasCachedData = query.data !== undefined;
  return {
    sourceId,
    label,
    loadState: hasCachedData ? "loaded" : query.isPending ? "loading" : "failed",
    freshness: freshnessFor(generatedAt),
    configuration,
    generatedAt,
    loadedAt: query.dataUpdatedAt > 0 ? new Date(query.dataUpdatedAt).toISOString() : null,
    error: query.error ? messageFromError(query.error, "Source read failed") : null,
    hasCachedData,
  };
}

function filterRows(rows: DataQualityRow[], severity: DataQualitySeverity, owner: string, query: string) {
  const tokens = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  return rows.filter((row) => {
    if (severity !== "all" && row.severity !== severity) return false;
    if (owner !== "all" && row.owner !== owner) return false;
    const haystack = [row.id, row.source, row.category, row.label, row.state,
      row.detail, row.owner, row.runbook, row.nextAction].join(" ").toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

function dataQualityMetrics(rows: DataQualityRow[]): DataQualityMetrics {
  return {
    openIssues: rows.filter((row) => row.severity !== "healthy").length,
    blocked: rows.filter((row) => row.severity === "blocked").length,
    warnings: rows.filter((row) => row.severity === "warning").length,
    owners: new Set(rows.map((row) => row.owner).filter(Boolean)).size,
  };
}

function severityFor(state: DataQualityState): Exclude<DataQualitySeverity, "all"> {
  return state === "blocked" || state === "missing" ? "blocked" :
    state === "warning" || state === "partial" ? "warning" : "healthy";
}

function severityRank(severity: Exclude<DataQualitySeverity, "all">): number {
  return severity === "blocked" ? 3 : severity === "warning" ? 2 : 1;
}

function runPlanConfiguration(runPlan?: MarketingRunPlan): DataQualityConfiguration {
  if (!runPlan) return "not_applicable";
  return runPlan.automationPolicy.searchProvider === "not_configured" ||
    !runPlan.automationPolicy.networkFetchesEnabled ? "not_configured" : "configured";
}

function freshnessFor(value: string | null): DataQualityFreshness {
  if (!value) return "unknown";
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "unknown";
  return Date.now() - time > 7 * 86400000 ? "stale" : "current";
}

function overviewWorkflowPath(id: string): string | null {
  const routes: Record<string, string> = {
    "signup-source": "/growth",
    "finance-ledger": "/money",
  };
  return routes[id] ?? null;
}

function readableId(value: string): string {
  return value.replace(/[-_]+/gu, " ").replace(/^\w/u, (match) => match.toUpperCase());
}

function arrayLength(value: unknown[] | undefined): number {
  return Array.isArray(value) ? value.length : 0;
}

function formatAge(value: string): string {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "at an invalid time";
  const days = Math.floor((Date.now() - time) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function messageFromError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as {message?: unknown}).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
