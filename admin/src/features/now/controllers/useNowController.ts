import {useQuery} from "@tanstack/react-query";
import {useMemo} from "react";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import type {
  AdminOverviewResponse,
  AdminQueueItem,
  DataMode,
} from "../../../shared/types/adminTypes";
import {displayAdminQueueTitle} from "../../../shared/ui/adminPresentation";
import {loadNowSnapshot} from "../api/nowRepository";

/** The area an item opens in. The shell maps it to a route the person may open. */
export type NowDestination = "safety" | "organizers" | "money";

type QueueKey = keyof AdminOverviewResponse["queues"];

const queueKinds: Record<QueueKey, {kind: string; many: string; destination: NowDestination}> = {
  safetyReports: {kind: "Safety report", many: "safety reports", destination: "safety"},
  moderationFlags: {kind: "Moderation flag", many: "moderation flags", destination: "safety"},
  eventSafetyReports: {kind: "Event safety report", many: "event safety reports", destination: "safety"},
  accessApplications: {kind: "Launch access", many: "launch access requests", destination: "safety"},
  organizerClaimRequests: {kind: "Claim", many: "claims", destination: "organizers"},
  organizerIndexReviews: {kind: "Index review", many: "index reviews", destination: "organizers"},
  paymentIssues: {kind: "Payment issue", many: "payment issues", destination: "money"},
};

const kindGroups: Array<{destination: NowDestination; title: string; queues: QueueKey[]}> = [
  {destination: "safety", title: "Safety", queues: ["safetyReports", "moderationFlags", "eventSafetyReports", "accessApplications"]},
  {destination: "organizers", title: "Organizers", queues: ["organizerClaimRequests", "organizerIndexReviews"]},
  {destination: "money", title: "Money", queues: ["paymentIssues"]},
];

const dayMs = 24 * 60 * 60 * 1000;

export type NowTone = "danger" | "warning" | "neutral";

export interface NowItem {
  id: string;
  title: string;
  /** "Kind · detail", the line under the title. */
  subtitle: string;
  /** How long it has waited, in words; null when the source has no date. */
  waiting: string | null;
  tone: NowTone;
  destination: NowDestination;
  targetPath: string;
  createdAt: string | null;
}

export interface NowKind {
  destination: NowDestination;
  title: string;
  count: number;
  summary: string;
}

export interface NowSourceNote {
  id: string;
  title: string;
  detail: string;
  tone: "success" | "warning" | "danger";
}

export interface NowModel {
  items: NowItem[];
  kinds: NowKind[];
  waiting: number;
  overTwoDays: number;
  completedPayments: number | null;
  activeHosts: number | null;
  sources: NowSourceNote[];
  generatedAt: string;
}

export function waitingLabel(createdAt: string | null, now: number): string | null {
  if (!createdAt) return null;
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return null;
  const minutes = Math.max(0, Math.round((now - created) / 60000));
  if (minutes < 60) return minutes <= 1 ? "Just now" : `${minutes} minutes`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return hours === 1 ? "1 hour" : `${hours} hours`;
  return `${Math.round(hours / 24)} days`;
}

function toneFor(createdAt: string | null, now: number): NowTone {
  const created = createdAt ? Date.parse(createdAt) : Number.NaN;
  if (Number.isNaN(created)) return "neutral";
  const age = now - created;
  return age >= 3 * dayMs ? "danger" : age >= 2 * dayMs ? "warning" : "neutral";
}

function metric(overview: AdminOverviewResponse, id: string): number | null {
  return overview.metrics.find((entry) => entry.id === id)?.value ?? null;
}

/** Everything waiting on a person, oldest first, with counts by kind. */
export function buildNowModel(overview: AdminOverviewResponse, now: number): NowModel {
  const items: NowItem[] = (Object.keys(queueKinds) as QueueKey[]).flatMap((queue) =>
    overview.queues[queue].map((item: AdminQueueItem) => ({
      id: `${queue}:${item.id}`,
      title: displayAdminQueueTitle(item.title),
      subtitle: [queueKinds[queue].kind, item.detail].filter(Boolean).join(" · "),
      waiting: waitingLabel(item.createdAt, now),
      tone: toneFor(item.createdAt, now),
      destination: queueKinds[queue].destination,
      targetPath: item.targetPath,
      createdAt: item.createdAt,
    })));
  items.sort((a, b) => {
    if (a.createdAt === b.createdAt) return 0;
    if (a.createdAt === null) return 1;
    if (b.createdAt === null) return -1;
    return Date.parse(a.createdAt) - Date.parse(b.createdAt);
  });
  const kinds = kindGroups.map((group) => {
    const counts = group.queues
      .map((queue) => ({...queueKinds[queue], count: overview.queues[queue].length}))
      .filter((entry) => entry.count > 0);
    return {
      destination: group.destination,
      title: group.title,
      count: counts.reduce((sum, entry) => sum + entry.count, 0),
      summary: counts.length === 0 ? "Nothing waiting" :
        counts.map((entry) => entry.count === 1 ?
          `1 ${entry.kind.toLowerCase()}` : `${entry.count} ${entry.many}`).join(" · "),
    };
  });
  return {
    items,
    kinds,
    waiting: items.length,
    overTwoDays: items.filter((item) => item.tone !== "neutral").length,
    completedPayments: metric(overview, "completedPayments"),
    activeHosts: metric(overview, "activeHosts"),
    sources: overview.dataQuality.map((source) => ({
      id: source.id,
      title: source.label,
      detail: source.state === "ok" ? source.detail : `${source.detail} Next: ${source.nextAction}`,
      tone: source.state === "ok" ? "success" : source.state === "warning" ? "warning" : "danger",
    })),
    generatedAt: overview.generatedAt,
  };
}

/** Needs you: today's queues as one list. */
export function useNowController({
  isSessionReady,
  mode,
}: {
  isSessionReady: boolean;
  mode: DataMode;
}) {
  const query = useQuery({
    enabled: isSessionReady,
    queryKey: adminQueryKeys.overview.snapshot(mode),
    queryFn: loadNowSnapshot,
    placeholderData: (previousData) => previousData,
  });
  const model = useMemo(
    () => (query.data ? buildNowModel(query.data, Date.now()) : null),
    [query.data]
  );
  return {
    model,
    error: query.error ? messageFromError(query.error) : null,
    isLoading: query.isFetching,
    refresh: () => query.refetch(),
  };
}

function messageFromError(error: unknown): string {
  const message = typeof error === "object" && error !== null ?
    (error as {message?: unknown}).message : null;
  return typeof message === "string" && message ? message : "Unable to load what needs you.";
}
