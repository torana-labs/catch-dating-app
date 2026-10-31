import {useQuery} from "@tanstack/react-query";
import {useCallback, useEffect, useMemo, useState} from "react";
import type {
  AdminOverviewResponse,
  HostAnalyticsMetricCard,
  HostAnalyticsResponse,
  HostAnalyticsTrendPoint,
} from "../../../shared/types/adminTypes";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {
  loadGrowthHostAnalytics,
  loadGrowthOverview,
} from "../api/growthKpiRepository";

export type GrowthStage =
  | "all"
  | "acquisition"
  | "supply"
  | "conversion"
  | "marketplace";
export type GrowthRangePreset = "7d" | "30d" | "90d" | "month";
export type GrowthSignalStatus = "ready" | "partial" | "missing";

export interface GrowthSignalRow {
  id: string;
  stage: Exclude<GrowthStage, "all">;
  label: string;
  value: number;
  unit: "count" | "percent" | "money_minor" | "rating";
  status: GrowthSignalStatus;
  source: string;
  sourceGeneratedAt: string | null;
  metricBasis: string;
  range: string;
  timezone: string;
  detail: string;
}

export interface GrowthMetrics {
  signupsThisWeek: number;
  completedProfiles: number;
  bookings: number;
  attendanceRate: number;
}

export interface GrowthKpiController {
  filteredRows: GrowthSignalRow[];
  hostAnalyticsError: string | null;
  hostAnalyticsGeneratedAt: string | null;
  isHostAnalyticsLoading: boolean;
  isLoading: boolean;
  isOverviewLoading: boolean;
  loadedAt: string | null;
  metrics: GrowthMetrics;
  overviewError: string | null;
  overviewGeneratedAt: string | null;
  query: string;
  rangePreset: GrowthRangePreset;
  rows: GrowthSignalRow[];
  selected: GrowthSignalRow | null;
  selectedSignalId: string | null;
  stageFilter: GrowthStage;
  trend: HostAnalyticsTrendPoint[];
  refresh: () => Promise<boolean>;
  refreshHostAnalytics: () => Promise<boolean>;
  refreshOverview: () => Promise<boolean>;
  select: (row: GrowthSignalRow) => void;
  setQuery: (value: string) => void;
  setRangePreset: (value: GrowthRangePreset) => void;
  setStageFilter: (value: GrowthStage) => void;
}

export function useGrowthKpiController({
  onError,
  onSelectSignalId,
  selectedSignalId: controlledSelectedSignalId,
}: {
  onError: (message: string | null) => void;
  onSelectSignalId?: (signalId: string) => void;
  selectedSignalId?: string | null;
}): GrowthKpiController {
  const [rangePreset, setRangePreset] = useState<GrowthRangePreset>("30d");
  const [stageFilter, setStageFilter] = useState<GrowthStage>("all");
  const [query, setQuery] = useState("");
  const [localSelectedSignalId, setLocalSelectedSignalId] =
    useState<string | null>(null);
  const selectedSignalId = controlledSelectedSignalId === undefined ?
    localSelectedSignalId :
    controlledSelectedSignalId;
  const granularity = rangePreset === "7d" ? "day" : "week";

  const overviewQuery = useQuery({
    queryKey: adminQueryKeys.growth.overview(),
    queryFn: loadGrowthOverview,
  });
  const hostAnalyticsQuery = useQuery({
    queryKey: adminQueryKeys.growth.hostAnalytics(rangePreset, granularity),
    queryFn: () => loadGrowthHostAnalytics({rangePreset, granularity}),
  });
  const overview = overviewQuery.data ?? null;
  const hostAnalytics = hostAnalyticsQuery.data ?? null;
  const rows = useMemo(
    () => buildGrowthRows(overview, hostAnalytics),
    [hostAnalytics, overview]
  );
  const trend = hostAnalytics?.trend ?? [];
  const loadedAtMs = Math.max(
    overviewQuery.dataUpdatedAt,
    hostAnalyticsQuery.dataUpdatedAt
  );
  const loadedAt = loadedAtMs > 0 ? new Date(loadedAtMs).toISOString() : null;

  const refreshOverview = useCallback(async () => {
    const result = await overviewQuery.refetch();
    if (result.error) {
      onError(messageFromError(result.error, "Unable to load current growth overview."));
      return false;
    }
    onError(null);
    return true;
  }, [onError, overviewQuery]);

  const refreshHostAnalytics = useCallback(async () => {
    const result = await hostAnalyticsQuery.refetch();
    if (result.error) {
      onError(messageFromError(result.error, "Unable to load ranged host analytics."));
      return false;
    }
    onError(null);
    return true;
  }, [hostAnalyticsQuery, onError]);

  const refresh = useCallback(async () => {
    const results = await Promise.all([refreshOverview(), refreshHostAnalytics()]);
    return results.every(Boolean);
  }, [refreshHostAnalytics, refreshOverview]);

  useEffect(() => {
    const error = overviewQuery.error ?? hostAnalyticsQuery.error;
    if (error) {
      onError(messageFromError(error, "Unable to load growth signals."));
      return;
    }
    if (overviewQuery.isSuccess && hostAnalyticsQuery.isSuccess) onError(null);
  }, [
    hostAnalyticsQuery.error,
    hostAnalyticsQuery.isSuccess,
    onError,
    overviewQuery.error,
    overviewQuery.isSuccess,
  ]);

  const filteredRows = useMemo(
    () => filterRows(rows, stageFilter, query),
    [query, rows, stageFilter]
  );
  const metrics = useMemo(() => growthMetrics(rows), [rows]);
  const selected = useMemo(
    () => rows.find((row) => row.id === selectedSignalId) ?? null,
    [rows, selectedSignalId]
  );
  const select = useCallback((row: GrowthSignalRow) => {
    if (controlledSelectedSignalId === undefined) setLocalSelectedSignalId(row.id);
    onSelectSignalId?.(row.id);
    onError(null);
  }, [controlledSelectedSignalId, onError, onSelectSignalId]);

  return {
    filteredRows,
    hostAnalyticsError: hostAnalyticsQuery.error ?
      messageFromError(hostAnalyticsQuery.error, "Unable to load ranged host analytics.") :
      null,
    hostAnalyticsGeneratedAt: hostAnalytics?.generatedAt ?? null,
    isHostAnalyticsLoading: hostAnalyticsQuery.isPending || hostAnalyticsQuery.isFetching,
    isLoading: overviewQuery.isPending || overviewQuery.isFetching ||
      hostAnalyticsQuery.isPending || hostAnalyticsQuery.isFetching,
    isOverviewLoading: overviewQuery.isPending || overviewQuery.isFetching,
    loadedAt,
    metrics,
    overviewError: overviewQuery.error ?
      messageFromError(overviewQuery.error, "Unable to load current growth overview.") :
      null,
    overviewGeneratedAt: overview?.generatedAt ?? null,
    query,
    rangePreset,
    rows,
    selected,
    selectedSignalId,
    stageFilter,
    trend,
    refresh,
    refreshHostAnalytics,
    refreshOverview,
    select,
    setQuery,
    setRangePreset,
    setStageFilter,
  };
}

function buildGrowthRows(
  overview: AdminOverviewResponse | null,
  hostAnalytics: HostAnalyticsResponse | null
): GrowthSignalRow[] {
  const overviewMetric = (id: string) =>
    overview?.metrics.find((item) => item.id === id);
  const hostMetric = (id: string) =>
    hostAnalytics?.summaryCards.find((item) => item.id === id);
  const rows: Array<GrowthSignalRow | null> = [
    overviewSignal("signupsToday", "acquisition", overviewMetric,
      "Accounts created today.", overview),
    overviewSignal("signupsThisWeek", "acquisition", overviewMetric,
      "Accounts created in the current calendar week.", overview),
    overviewSignal("completedProfiles", "acquisition", overviewMetric,
      "Profiles currently counted as complete.", overview),
    overviewSignal("pendingOrganizerClaims", "supply", overviewMetric,
      "Current organizer claims waiting for review.", overview),
    overviewSignal("activeHosts", "supply", overviewMetric,
      "Current active organizer claims.", overview),
    overviewSignal("activeEvents", "supply", overviewMetric,
      "Current canonical events marked active.", overview),
    hostSignal("bookings", "conversion", hostMetric, hostAnalytics),
    hostSignal("attendanceRate", "conversion", hostMetric, hostAnalytics),
    hostSignal("checkoutConversionRate", "conversion", hostMetric, hostAnalytics),
    hostSignal("checkoutDropoff", "conversion", hostMetric, hostAnalytics),
    hostSignal("connections", "marketplace", hostMetric, hostAnalytics),
  ];
  if (hostAnalytics) {
    rows.push(
      discoverySignal("eventSaves", "marketplace",
        hostAnalytics.discoverySummary.eventSaves,
        "Event saves in the selected host-analytics range.", hostAnalytics),
      discoverySignal("claimClicks", "marketplace",
        hostAnalytics.discoverySummary.claimClicks,
        "Organizer claim clicks in the selected host-analytics range.", hostAnalytics)
    );
  }
  return rows.filter((row): row is GrowthSignalRow => row !== null);
}

function overviewSignal(
  id: string,
  stage: Exclude<GrowthStage, "all">,
  metric: (id: string) => {label: string; value: number} | undefined,
  detail: string,
  overview: AdminOverviewResponse | null
): GrowthSignalRow | null {
  const item = metric(id);
  if (!item || !overview) return null;
  return {
    id,
    stage,
    label: item.label,
    value: item.value,
    unit: "count",
    status: "ready",
    source: "adminGetOverview",
    sourceGeneratedAt: overview.generatedAt,
    metricBasis: "Current operational overview snapshot; not affected by the range control.",
    range: "Current / overview-defined",
    timezone: overview.timezone,
    detail,
  };
}

function hostSignal(
  id: string,
  stage: Exclude<GrowthStage, "all">,
  metric: (id: string) => HostAnalyticsMetricCard | undefined,
  hostAnalytics: HostAnalyticsResponse | null
): GrowthSignalRow | null {
  const item = metric(id);
  if (!item || !hostAnalytics) return null;
  return {
    id,
    stage,
    label: item.label,
    value: item.value,
    unit: item.unit,
    status: item.status,
    source: "adminGetHostAnalytics",
    sourceGeneratedAt: hostAnalytics.generatedAt,
    metricBasis: item.caption ?? "Selected-range host analytics summary card.",
    range: rangeLabel(hostAnalytics),
    timezone: hostAnalytics.timezone,
    detail: item.caption ?? "Host analytics summary card.",
  };
}

function discoverySignal(
  id: string,
  stage: Exclude<GrowthStage, "all">,
  value: number,
  detail: string,
  hostAnalytics: HostAnalyticsResponse
): GrowthSignalRow {
  return {
    id,
    stage,
    label: readableId(id),
    value,
    unit: "count",
    status: value > 0 ? "ready" : "partial",
    source: "adminGetHostAnalytics.discoverySummary",
    sourceGeneratedAt: hostAnalytics.generatedAt,
    metricBasis: "Selected-range discovery summary aggregate.",
    range: rangeLabel(hostAnalytics),
    timezone: hostAnalytics.timezone,
    detail,
  };
}

function filterRows(
  rows: GrowthSignalRow[],
  stageFilter: GrowthStage,
  query: string
): GrowthSignalRow[] {
  const tokens = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  return rows.filter((row) => {
    if (stageFilter !== "all" && row.stage !== stageFilter) return false;
    if (tokens.length === 0) return true;
    const haystack = [
      row.id,
      row.stage,
      row.label,
      row.status,
      row.source,
      row.metricBasis,
      row.range,
      row.detail,
    ].join(" ").toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

function growthMetrics(rows: GrowthSignalRow[]): GrowthMetrics {
  const value = (id: string) => rows.find((row) => row.id === id)?.value ?? 0;
  return {
    signupsThisWeek: value("signupsThisWeek"),
    completedProfiles: value("completedProfiles"),
    bookings: value("bookings"),
    attendanceRate: value("attendanceRate"),
  };
}

function rangeLabel(analytics: HostAnalyticsResponse): string {
  return `${analytics.range.startDate} to ${analytics.range.endDate} (${analytics.range.granularity})`;
}

function readableId(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (char) => char.toUpperCase());
}

function messageFromError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as {message?: unknown}).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
