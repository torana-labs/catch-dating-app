import {useInfiniteQuery, useQuery} from "@tanstack/react-query";
import {useMemo, useState} from "react";
import {adminActionCatalog} from "../../../generated/adminActionCatalog";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import type {
  AdminActionExecutionRecord,
  AdminListActionExecutionsResponse,
  DataMode,
} from "../../../shared/types/adminTypes";
import {
  loadSystemActivity,
  loadSystemEventIntake,
  loadSystemHealth,
  loadSystemHostAnalytics,
  loadSystemMarketingBridge,
} from "../api/systemRepository";
import {
  formatWhen,
  healthSource,
  systemSignals,
  type SystemHealthSource,
  type SystemHealthSourceId,
} from "./systemHealth";

const activityPageSize = 100;

/** Who acted: a person in Admin, or an agent through the command line. */
export type SystemActivityFilter = "everyone" | "people" | "automatic" | "problems";

export interface SystemActivityRow {
  key: string;
  who: {title: string; subtitle: string};
  what: string;
  when: string;
  result: {text: string; tone?: "danger" | "warning"};
  automatic: boolean;
  problem: boolean;
  /** The receipt behind the row: its detail pane, and everything search looks through. */
  record: AdminActionExecutionRecord;
}

/** One fact on a receipt; long values (hashes, errors) take the whole row. */
export interface SystemReceiptFact {
  label: string;
  value: string;
  tone?: "danger" | "warning";
  wide?: boolean;
}

const actionSummaries = new Map<string, string>(
  adminActionCatalog.actions.map((action) => [action.actionId, action.summary])
);

const roleLabels: Record<string, string> = {
  adminOwner: "Owner",
  admin: "Ops",
  support: "Support",
  safetyReviewer: "Safety",
  finance: "Finance",
  analyticsViewer: "Analytics",
  salesStaff: "Sales",
};

function activityResult(status: AdminActionExecutionRecord["status"]): SystemActivityRow["result"] {
  if (status === "failed") return {text: "Failed", tone: "danger"};
  if (status === "indeterminate") return {text: "Unclear", tone: "warning"};
  if (status === "started") return {text: "Running", tone: "warning"};
  return {text: "Done"};
}

/** One activity row from an Admin action execution. */
export function activityRow(record: AdminActionExecutionRecord): SystemActivityRow {
  const automatic = record.cliVersion !== null;
  // An unclear action may or may not have happened, so it is a problem until someone checks.
  const problem = record.status === "failed" || record.status === "indeterminate";
  const role = record.actorRoles.map((claim) => roleLabels[claim] ?? claim)[0] ?? "Admin";
  return {
    key: record.executionId,
    who: {
      title: automatic ? "Agent" : role,
      subtitle: automatic ? `Command line ${record.cliVersion}` : record.actorUid,
    },
    what: actionSummaries.get(record.actionId) ?? record.actionId,
    when: formatWhen(record.startedAt),
    result: activityResult(record.status),
    automatic,
    problem,
    record,
  };
}

function durationLabel(record: AdminActionExecutionRecord): string {
  if (!record.finishedAt) return "Still running";
  const duration = Date.parse(record.finishedAt) - Date.parse(record.startedAt);
  if (!Number.isFinite(duration) || duration < 0) return "Not known";
  return duration < 1000 ? `${duration} ms` : `${(duration / 1000).toFixed(1)} s`;
}

/** Everything a receipt holds. Request and response bodies are never stored, only their hashes. */
export function receiptFacts(record: AdminActionExecutionRecord): SystemReceiptFact[] {
  const result = activityResult(record.status);
  const facts: Array<SystemReceiptFact | null> = [
    {label: "What", value: actionSummaries.get(record.actionId) ?? record.actionId, wide: true},
    {label: "Result", value: result.text, tone: result.tone},
    {label: "Took", value: durationLabel(record)},
    {label: "Started", value: formatWhen(record.startedAt)},
    {label: "Finished", value: record.finishedAt ? formatWhen(record.finishedAt) : "Not yet"},
    {label: "Acted on", value: record.target ?? "Nothing specific", wide: true},
    record.errorCode ? {label: "Error code", value: record.errorCode, wide: true} : null,
    record.errorMessage ? {label: "Error", value: record.errorMessage, wide: true} : null,
    {label: "User id", value: record.actorUid, wide: true},
    {label: "Roles", value: record.actorRoles.map((claim) => roleLabels[claim] ?? claim).join(", ") || "None"},
    {label: "Command line", value: record.cliVersion ?? "Not used"},
    {label: "Action", value: record.actionId, wide: true},
    {label: "Function", value: record.callable, wide: true},
    {label: "Execution id", value: record.executionId, wide: true},
    {label: "Request hash", value: record.requestHash, wide: true},
    record.responseHash ? {label: "Response hash", value: record.responseHash, wide: true} : null,
  ];
  return facts.filter((fact) => fact !== null);
}

/** The loaded pages as one list, newest copy of a receipt winning when pages overlap. */
export function activityRecords(
  pages: readonly AdminListActionExecutionsResponse[]
): AdminActionExecutionRecord[] {
  const records = new Map<string, AdminActionExecutionRecord>();
  for (const page of pages) {
    for (const record of page.rows) records.set(record.executionId, record);
  }
  return [...records.values()];
}

export function filterActivity(rows: SystemActivityRow[], filter: SystemActivityFilter, query: string) {
  const needle = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (filter === "people" && row.automatic) return false;
    if (filter === "automatic" && !row.automatic) return false;
    if (filter === "problems" && !row.problem) return false;
    if (!needle) return true;
    const {record} = row;
    return [
      row.who.title, row.who.subtitle, row.what, row.result.text, record.actionId, record.callable,
      record.actorUid, record.executionId, record.target ?? "", record.errorCode ?? "", record.errorMessage ?? "",
    ].some((text) => text.toLowerCase().includes(needle));
  });
}

/** System: one activity log of people's and agents' Admin actions, beside data health. */
export function useSystemController({
  canReadHostAnalytics,
  isSessionReady,
  mode,
}: {
  /** Host analytics is owner-only on the server, so nobody else asks for it. */
  canReadHostAnalytics: boolean;
  isSessionReady: boolean;
  mode: DataMode;
}) {
  const [filter, setFilter] = useState<SystemActivityFilter>("everyone");
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const activityQuery = useInfiniteQuery({
    enabled: isSessionReady,
    queryKey: adminQueryKeys.operations.executions(),
    queryFn: ({pageParam}) => loadSystemActivity({limit: activityPageSize, cursor: pageParam}),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    retry: false,
  });
  const overviewQuery = useQuery({
    enabled: isSessionReady,
    queryKey: adminQueryKeys.overview.snapshot(mode),
    queryFn: loadSystemHealth,
    placeholderData: (previousData) => previousData,
  });
  const hostAnalyticsQuery = useQuery({
    enabled: isSessionReady && canReadHostAnalytics,
    queryKey: adminQueryKeys.dataQuality.source("host-analytics"),
    queryFn: loadSystemHostAnalytics,
  });
  const marketingQuery = useQuery({
    enabled: isSessionReady,
    queryKey: adminQueryKeys.dataQuality.source("marketing-bridge"),
    queryFn: loadSystemMarketingBridge,
  });
  const eventIntakeQuery = useQuery({
    enabled: isSessionReady,
    queryKey: adminQueryKeys.dataQuality.source("event-intake"),
    queryFn: loadSystemEventIntake,
  });
  const allRows = useMemo(
    () => activityRecords(activityQuery.data?.pages ?? []).map(activityRow),
    [activityQuery.data]
  );
  const rows = useMemo(() => filterActivity(allRows, filter, query), [allRows, filter, query]);
  const counts = useMemo(() => ({
    everyone: allRows.length,
    people: allRows.filter((row) => !row.automatic).length,
    automatic: allRows.filter((row) => row.automatic).length,
    problems: allRows.filter((row) => row.problem).length,
  }), [allRows]);
  const signals = useMemo(() => systemSignals({
    eventIntake: eventIntakeQuery.data,
    hostAnalytics: hostAnalyticsQuery.data,
    marketingBridge: marketingQuery.data,
    overview: overviewQuery.data,
  }), [eventIntakeQuery.data, hostAnalyticsQuery.data, marketingQuery.data, overviewQuery.data]);
  const healthReads: Array<{
    id: SystemHealthSourceId;
    query: {data?: unknown; error: unknown; isPending: boolean; refetch: () => Promise<unknown>};
    generatedAt: string | undefined;
  }> = [
    {id: "overview", query: overviewQuery, generatedAt: overviewQuery.data?.generatedAt},
    ...(canReadHostAnalytics ? [{
      id: "host-analytics" as const, query: hostAnalyticsQuery, generatedAt: hostAnalyticsQuery.data?.generatedAt,
    }] : []),
    {id: "marketing-bridge", query: marketingQuery, generatedAt: marketingQuery.data?.generatedAt},
    {id: "event-intake", query: eventIntakeQuery, generatedAt: eventIntakeQuery.data?.generatedAt ?? undefined},
  ];
  const sources: SystemHealthSource[] = healthReads.map(({generatedAt, id, query: read}) => healthSource(id, {
    generatedAt: generatedAt ?? null,
    hasData: read.data !== undefined,
    failed: read.error !== null,
    isLoading: read.isPending,
  }));
  return {
    filter,
    setFilter,
    query,
    setQuery,
    rows,
    counts,
    selected: allRows.find((row) => row.key === selectedKey) ?? null,
    select: (key: string | null) => {
      setSelectedKey(key);
      setSelectedSignalId(null);
    },
    // A failed Load more keeps the rows already on screen.
    activityError: activityQuery.isFetchNextPageError ? "Unable to load more activity." :
      activityQuery.error ? "Unable to load activity." : null,
    isActivityLoading: activityQuery.isPending && isSessionReady,
    hasMore: activityQuery.hasNextPage,
    isLoadingMore: activityQuery.isFetchingNextPage,
    loadMore: () => activityQuery.fetchNextPage(),
    sources,
    signals,
    selectedSignal: signals.find((signal) => signal.id === selectedSignalId) ?? null,
    selectSignal: (id: string | null) => {
      setSelectedSignalId(id);
      setSelectedKey(null);
    },
    /** Retries one source's read and leaves the others alone. */
    retrySource: (id: SystemHealthSourceId) => healthReads.find((read) => read.id === id)?.query.refetch(),
    refresh: () => Promise.all([activityQuery.refetch(), ...healthReads.map(({query: read}) => read.refetch())]),
  };
}
