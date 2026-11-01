import {useQuery} from "@tanstack/react-query";
import {useMemo, useState} from "react";
import {adminActionCatalog} from "../../../generated/adminActionCatalog";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import type {
  AdminActionExecutionRecord,
  AdminOverviewResponse,
  DataMode,
} from "../../../shared/types/adminTypes";
import {loadSystemActivity, loadSystemHealth} from "../api/systemRepository";

const activityLimit = 100;

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
}

export interface SystemHealthRow {
  id: string;
  title: string;
  subtitle: string;
  tone: "success" | "warning" | "danger";
}

const actionSummaries = new Map<string, string>(
  adminActionCatalog.actions.map((action) => [action.actionId, action.summary])
);

const whenFormat = new Intl.DateTimeFormat("en-IN", {
  weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
});

function formatWhen(value: string): string {
  const time = Date.parse(value);
  return Number.isNaN(time) ? value : whenFormat.format(new Date(time));
}

const roleLabels: Record<string, string> = {
  adminOwner: "Owner",
  admin: "Ops",
  support: "Support",
  safetyReviewer: "Safety",
  finance: "Finance",
  analyticsViewer: "Analytics",
  salesStaff: "Sales",
};

/** One activity row from an Admin action execution. */
export function activityRow(record: AdminActionExecutionRecord): SystemActivityRow {
  const automatic = record.cliVersion !== null;
  const problem = record.status === "failed";
  const role = record.actorRoles.map((claim) => roleLabels[claim] ?? claim)[0] ?? "Admin";
  return {
    key: record.executionId,
    who: {
      title: automatic ? "Agent" : role,
      subtitle: automatic ? `Command line ${record.cliVersion}` : record.actorUid,
    },
    what: actionSummaries.get(record.actionId) ?? record.actionId,
    when: formatWhen(record.startedAt),
    result: record.status === "failed" ?
      {text: record.errorCode ?? "Failed", tone: "danger"} :
      record.status === "started" ? {text: "Running", tone: "warning"} : {text: "Done"},
    automatic,
    problem,
  };
}

/** The health list: when the snapshot was read, then each data source's state. */
export function healthRows(overview: AdminOverviewResponse): SystemHealthRow[] {
  return [
    {
      id: "overview",
      title: "Queues and metrics",
      subtitle: `Read ${formatWhen(overview.generatedAt)}`,
      tone: "success",
    },
    ...overview.dataQuality.map((source): SystemHealthRow => ({
      id: source.id,
      title: source.label,
      subtitle: source.state === "ok" ? source.detail : `${source.detail} Owner: ${source.owner}.`,
      tone: source.state === "ok" ? "success" : source.state === "warning" ? "warning" : "danger",
    })),
  ];
}

export function filterActivity(rows: SystemActivityRow[], filter: SystemActivityFilter, query: string) {
  const needle = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (filter === "people" && row.automatic) return false;
    if (filter === "automatic" && !row.automatic) return false;
    if (filter === "problems" && !row.problem) return false;
    if (!needle) return true;
    return [row.who.title, row.who.subtitle, row.what, row.result.text]
      .some((text) => text.toLowerCase().includes(needle));
  });
}

/** System: one activity log of people's and agents' Admin actions, beside data health. */
export function useSystemController({isSessionReady, mode}: {isSessionReady: boolean; mode: DataMode}) {
  const [filter, setFilter] = useState<SystemActivityFilter>("everyone");
  const [query, setQuery] = useState("");
  const activityQuery = useQuery({
    enabled: isSessionReady,
    queryKey: adminQueryKeys.operations.executions(),
    queryFn: () => loadSystemActivity(activityLimit),
    retry: false,
  });
  const healthQuery = useQuery({
    enabled: isSessionReady,
    queryKey: adminQueryKeys.overview.snapshot(mode),
    queryFn: loadSystemHealth,
    placeholderData: (previousData) => previousData,
  });
  const allRows = useMemo(() => (activityQuery.data?.rows ?? []).map(activityRow), [activityQuery.data]);
  const rows = useMemo(() => filterActivity(allRows, filter, query), [allRows, filter, query]);
  const counts = useMemo(() => ({
    everyone: allRows.length,
    people: allRows.filter((row) => !row.automatic).length,
    automatic: allRows.filter((row) => row.automatic).length,
    problems: allRows.filter((row) => row.problem).length,
  }), [allRows]);
  return {
    filter,
    setFilter,
    query,
    setQuery,
    rows,
    counts,
    activityError: activityQuery.error ? "Unable to load activity." : null,
    isActivityLoading: activityQuery.isPending && isSessionReady,
    health: healthQuery.data ? healthRows(healthQuery.data) : [],
    healthError: healthQuery.error ? "Unable to load data health." : null,
    refresh: () => Promise.all([activityQuery.refetch(), healthQuery.refetch()]),
  };
}
