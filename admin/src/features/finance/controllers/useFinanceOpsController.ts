import {useQuery} from "@tanstack/react-query";
import {useCallback, useEffect, useMemo, useState} from "react";
import type {
  AdminOverviewResponse,
  AdminQueueItem,
  HostAnalyticsEventRow,
  HostAnalyticsResponse,
} from "../../../shared/types/adminTypes";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {
  loadFinanceHostAnalytics,
  loadFinanceOverview,
} from "../api/financeOpsRepository";

export type FinanceIssueKind = "all" | "payment" | "event" | "payout";
export type FinanceSourceId = "overview" | "hostAnalytics";
export type FinanceSourceStatus = "loading" | "ready" | "error" | "restricted";
export type FinanceEvidenceState = "source" | "inferred" | "unknown";

export interface FinanceIssueRow {
  id: string;
  kind: Exclude<FinanceIssueKind, "all">;
  title: string;
  detail: string;
  status: string;
  targetPath: string;
  createdAt: string | null;
  amountMinor: number | null;
  currency: string;
  severity: "high" | "medium" | "watch";
  nextAction: string;
  sourceScope: string;
  amountEvidence: FinanceEvidenceState;
  providerEvidence: FinanceEvidenceState;
}

export type FinanceIssueActionStatus =
  | "manual_provider_review"
  | "aggregate_only"
  | "needs_finance_contract";

export interface FinanceEvidenceField {
  label: string;
  value: string;
  state: FinanceEvidenceState;
}

export interface FinanceIssueReview {
  provider: string;
  sourceModel: string;
  sourceOfTruth: string;
  reconciliationStatus: string;
  actionStatus: FinanceIssueActionStatus;
  statusLabel: string;
  statusDetail: string;
  mutationBoundary: string;
  fieldEvidence: FinanceEvidenceField[];
  requiredEvidence: string[];
  blockedActions: string[];
}

export interface FinanceMetrics {
  paymentPreviewCount: number | null;
  failedPayments: number | null;
  payoutRestrictedHosts: number | null;
  eventIssueCount30d: number | null;
}

export interface FinanceSourceState {
  id: FinanceSourceId;
  label: string;
  scope: string;
  status: FinanceSourceStatus;
  generatedAt: string | null;
  loadedAt: string | null;
  error: string | null;
}

export interface FinanceOpsController {
  filteredRows: FinanceIssueRow[];
  isLoading: boolean;
  isPartial: boolean;
  isUnavailable: boolean;
  kindFilter: FinanceIssueKind;
  malformedCount: number;
  metrics: FinanceMetrics;
  query: string;
  rows: FinanceIssueRow[];
  selected: FinanceIssueRow | null;
  selectedIssueId: string | null;
  selectedReview: FinanceIssueReview | null;
  selectedUnavailable: boolean;
  sources: FinanceSourceState[];
  refresh: () => Promise<boolean>;
  retrySource: (sourceId: FinanceSourceId) => Promise<boolean>;
  select: (row: FinanceIssueRow) => void;
  setKindFilter: (value: FinanceIssueKind) => void;
  setQuery: (value: string) => void;
}

const emptyFinanceMetrics: FinanceMetrics = {
  paymentPreviewCount: null,
  failedPayments: null,
  payoutRestrictedHosts: null,
  eventIssueCount30d: null,
};

export function useFinanceOpsController({
  adminRoles,
  onError,
  onSelectIssueId,
  selectedIssueId = null,
}: {
  adminRoles?: string[];
  onError: (message: string | null) => void;
  onSelectIssueId?: (issueId: string) => void;
  selectedIssueId?: string | null;
}): FinanceOpsController {
  const canLoadHostAnalytics = adminRoles === undefined ||
    adminRoles.some((role) => role === "adminOwner");
  const overviewQuery = useQuery({
    queryKey: adminQueryKeys.finance.overview(),
    queryFn: loadFinanceOverview,
  });
  const hostAnalyticsQuery = useQuery({
    queryKey: adminQueryKeys.finance.hostAnalytics(),
    queryFn: loadFinanceHostAnalytics,
    enabled: canLoadHostAnalytics,
  });
  const [kindFilter, setKindFilter] = useState<FinanceIssueKind>("all");
  const [query, setQuery] = useState("");
  // Disabling a query only stops fetching; TanStack still returns cached data.
  // Gate every projection, including selection, metrics and source timestamps.
  const hostAnalytics = canLoadHostAnalytics ? hostAnalyticsQuery.data : undefined;
  const built = useMemo(() => buildFinanceRows({
    hostAnalytics,
    overview: overviewQuery.data,
  }), [hostAnalytics, overviewQuery.data]);
  const rows = built.rows;
  const metrics = useMemo(() => buildFinanceMetrics({
    hostAnalytics,
    overview: overviewQuery.data,
  }), [hostAnalytics, overviewQuery.data]);
  const sources = useMemo<FinanceSourceState[]>(() => [
    sourceState({
      dataUpdatedAt: overviewQuery.dataUpdatedAt,
      error: overviewQuery.error,
      generatedAt: overviewQuery.data?.generatedAt ?? null,
      id: "overview",
      isPending: overviewQuery.isPending,
      label: "Overview payment preview",
      scope: "Current capped overview preview and current payout restriction metrics",
    }),
    sourceState({
      enabled: canLoadHostAnalytics,
      dataUpdatedAt: canLoadHostAnalytics ? hostAnalyticsQuery.dataUpdatedAt : 0,
      error: hostAnalyticsQuery.error,
      generatedAt: hostAnalytics?.generatedAt ?? null,
      id: "hostAnalytics",
      isPending: hostAnalyticsQuery.isPending,
      label: "Event payment analytics",
      scope: "30-day host analytics, weekly granularity",
    }),
  ], [
    canLoadHostAnalytics,
    hostAnalytics?.generatedAt,
    hostAnalyticsQuery.dataUpdatedAt,
    hostAnalyticsQuery.error,
    hostAnalyticsQuery.isPending,
    overviewQuery.data?.generatedAt,
    overviewQuery.dataUpdatedAt,
    overviewQuery.error,
    overviewQuery.isPending,
  ]);
  const isLoading = sources.some((source) => source.status === "loading");
  const availableSources = sources.filter((source) =>
    source.status !== "restricted"
  );
  const isPartial = availableSources.some((source) => source.status === "error") &&
    availableSources.some((source) => source.status === "ready");
  const isUnavailable = availableSources.length > 0 &&
    availableSources.every((source) => source.status === "error");

  useEffect(() => {
    if (isUnavailable) {
      onError("Finance sources are unavailable. Retry either source below.");
      return;
    }
    onError(null);
  }, [isUnavailable, onError]);

  const retrySource = useCallback(async (sourceId: FinanceSourceId) => {
    if (sourceId === "hostAnalytics" && !canLoadHostAnalytics) return false;
    const result = sourceId === "overview" ?
      await overviewQuery.refetch() :
      await hostAnalyticsQuery.refetch();
    return !result.error;
  }, [canLoadHostAnalytics, hostAnalyticsQuery, overviewQuery]);

  const refresh = useCallback(async () => {
    // Start independent reads together. Cancellation of the first read must
    // not resume an old closure that starts analytics in a later session.
    const [overviewResult, analyticsResult] = await Promise.all([
      overviewQuery.refetch(),
      canLoadHostAnalytics ? hostAnalyticsQuery.refetch() : undefined,
    ]);
    return !overviewResult.error || Boolean(analyticsResult && !analyticsResult.error);
  }, [canLoadHostAnalytics, hostAnalyticsQuery, overviewQuery]);

  const filteredRows = useMemo(
    () => filterRows(rows, kindFilter, query),
    [kindFilter, query, rows]
  );
  const selected = useMemo(() => rows.find((row) =>
    row.id === selectedIssueId || row.targetPath === selectedIssueId
  ) ?? null, [rows, selectedIssueId]);
  const selectedReview = useMemo(
    () => selected ? buildFinanceIssueReview(selected) : null,
    [selected]
  );
  const selectedUnavailable = Boolean(
    selectedIssueId && !selected && !isLoading
  );

  const select = useCallback((row: FinanceIssueRow) => {
    onSelectIssueId?.(row.id);
    onError(null);
  }, [onError, onSelectIssueId]);

  return {
    filteredRows,
    isLoading,
    isPartial,
    isUnavailable,
    kindFilter,
    malformedCount: built.malformedCount,
    metrics,
    query,
    rows,
    selected,
    selectedIssueId,
    selectedReview,
    selectedUnavailable,
    sources,
    refresh,
    retrySource,
    select,
    setKindFilter,
    setQuery,
  };
}

export function buildFinanceRows({
  hostAnalytics,
  overview,
}: {
  hostAnalytics?: HostAnalyticsResponse;
  overview?: AdminOverviewResponse;
}): {rows: FinanceIssueRow[]; malformedCount: number} {
  const rawPayments: unknown[] = overview?.queues?.paymentIssues ?? [];
  const paymentRows = rawPayments.filter(isAdminQueueItem).map(paymentIssue);
  const rawEvents: unknown[] = hostAnalytics?.topEvents ?? [];
  const eventRows = rawEvents.filter(isHostAnalyticsEventRow)
    .filter((event) => event.paymentFailedCount > 0 ||
      event.paymentRefundedCount > 0 ||
      event.checkoutDropoffCount > 0)
    .map(eventPaymentIssue);
  const payoutCount = overview ? metricValue(overview, "payoutRestrictedHosts") : 0;
  const payoutRows = payoutCount > 0 ? [{
    id: "payout-restricted-hosts",
    kind: "payout" as const,
    title: "Payout restricted hosts",
    detail: `${payoutCount} host accounts need provider review.`,
    status: "restricted",
    targetPath: "metrics/payoutRestrictedHosts",
    createdAt: overview?.generatedAt ?? null,
    amountMinor: null,
    currency: "INR",
    severity: "medium" as const,
    nextAction: "Inspect host-level provider evidence before any payout action.",
    sourceScope: "Current overview aggregate",
    amountEvidence: "unknown" as const,
    providerEvidence: "unknown" as const,
  }] : [];
  return {
    malformedCount:
      (rawPayments.length - paymentRows.length) +
      (rawEvents.length - rawEvents.filter(isHostAnalyticsEventRow).length),
    rows: [...paymentRows, ...eventRows, ...payoutRows]
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) ||
        dateRank(a.createdAt, b.createdAt) || a.title.localeCompare(b.title)),
  };
}

export function buildFinanceIssueReview(row: FinanceIssueRow): FinanceIssueReview {
  if (row.kind === "payout") {
    return {
      provider: "Unknown in aggregate row",
      sourceModel: row.sourceScope,
      sourceOfTruth: "hostPaymentAccounts/{uid} plus provider account state",
      reconciliationStatus: "Needs host-level provider account list",
      actionStatus: "needs_finance_contract",
      statusLabel: "Payout lifecycle unavailable",
      statusDetail: "This is an aggregate count, not a host-level execution record.",
      mutationBoundary: "No finance callable releases payouts, edits settlements, or clears restrictions.",
      fieldEvidence: [
        {label: "Count", value: row.detail, state: "source"},
        {label: "Provider", value: "Not identified by this aggregate", state: "unknown"},
        {label: "Amount", value: "Not available", state: "unknown"},
      ],
      requiredEvidence: [
        "hostPaymentAccounts/{uid}.onboardingStatus and payoutsEnabled",
        "Provider account requirements and disabled reason",
        "Host ownership and settlement eligibility",
        "Audited finance approval for any future payout action",
      ],
      blockedActions: ["Release payout", "Clear restriction", "Edit settlement"],
    };
  }

  if (row.kind === "event") {
    return {
      provider: "Unknown or mixed across event payments",
      sourceModel: row.sourceScope,
      sourceOfTruth: "payments/{paymentId}, eventParticipations, provider dashboard, and future ledger",
      reconciliationStatus: "Aggregate signal only",
      actionStatus: "aggregate_only",
      statusLabel: "Reconcile individual payments first",
      statusDetail: "Event analytics can flag a problem but cannot identify which payment, refund, attendee, or settlement should change.",
      mutationBoundary: "No event-level refund, settlement correction, or payout action is available here.",
      fieldEvidence: [
        {label: "Counts", value: row.detail, state: "source"},
        {label: "Gross amount", value: evidenceAmount(row), state: row.amountEvidence},
        {label: "Provider", value: "Not present in event aggregate", state: "unknown"},
      ],
      requiredEvidence: [
        `Payments where eventId matches ${eventIdFromTarget(row.targetPath)}`,
        "Provider payment and refund records for every affected payment",
        "eventParticipations paymentId and booking status",
        "Analytics generatedAt and provider reconciliation timestamp",
      ],
      blockedActions: ["Bulk refund event payments", "Mark event settled", "Change booking state"],
    };
  }

  const normalizedStatus = normalizeStatus(row.status);
  const refundFailed = normalizedStatus === "refundfailed";
  const refunded = normalizedStatus === "refunded";
  return {
    provider: row.currency.toUpperCase() === "INR" ?
      "Likely Razorpay from currency; verify payment.provider" :
      "Unknown from preview row",
    sourceModel: row.sourceScope,
    sourceOfTruth: "payments/{paymentId}, provider order/payment/refund object, and pending-order reconciliation state",
    reconciliationStatus: refundFailed ? "Manual refund required" :
      refunded ? "Refund needs provider verification" : "Provider record required",
    actionStatus: "manual_provider_review",
    statusLabel: refundFailed ? "Manual refund escalation" :
      refunded ? "Verify refund settlement" : "Verify payment outcome",
    statusDetail: "The capped overview row is a triage signal. Confirm provider capture, fulfillment, and refund state before closing follow-up.",
    mutationBoundary: "No admin finance callable retries payment, issues a manual refund, edits status, or marks settlement complete.",
    fieldEvidence: [
      {label: "Status", value: row.status, state: "source"},
      {label: "Amount", value: evidenceAmount(row), state: row.amountEvidence},
      {label: "Provider", value: row.currency.toUpperCase() === "INR" ? "Inferred from INR" : "Not present", state: row.providerEvidence},
    ],
    requiredEvidence: [
      `${row.targetPath} status, provider, orderId, paymentId, amount, and signUpFailed`,
      "Provider order/payment/refund object",
      "razorpayPendingOrders/{orderId} when provider is Razorpay",
      "eventParticipations paymentId and booking state",
    ],
    blockedActions: ["Retry payment", "Issue manual refund", "Edit payment status", "Send final support resolution"],
  };
}

function paymentIssue(row: AdminQueueItem): FinanceIssueRow {
  const amountMinor = amountFromTitle(row.title);
  return {
    id: row.id,
    kind: "payment",
    title: row.title,
    detail: row.detail,
    status: row.status,
    targetPath: row.targetPath,
    createdAt: row.createdAt,
    amountMinor,
    currency: "INR",
    severity: row.status === "failed" ? "high" : "medium",
    nextAction: "Open the payment and provider records before manual follow-up.",
    sourceScope: "Current capped overview payment preview",
    amountEvidence: amountMinor === null ? "unknown" : "inferred",
    providerEvidence: "inferred",
  };
}

function eventPaymentIssue(event: HostAnalyticsEventRow): FinanceIssueRow {
  const failed = event.paymentFailedCount;
  const refunded = event.paymentRefundedCount;
  const dropoff = event.checkoutDropoffCount;
  return {
    id: `event-${event.eventId}-payments`,
    kind: "event",
    title: event.title,
    detail: `${failed} failed, ${refunded} refunded, ${dropoff} checkout drop-off.`,
    status: failed > 0 ? "failed" : refunded > 0 ? "refunded" : "dropoff",
    targetPath: `events/${event.eventId}`,
    createdAt: event.startTime,
    amountMinor: event.grossRevenueMinor,
    currency: event.currency,
    severity: failed > 0 ? "high" : "watch",
    nextAction: "Use payment and provider records to reconcile the aggregate signal.",
    sourceScope: "30-day host event analytics",
    amountEvidence: "source",
    providerEvidence: "unknown",
  };
}

function buildFinanceMetrics({
  hostAnalytics,
  overview,
}: {
  hostAnalytics?: HostAnalyticsResponse;
  overview?: AdminOverviewResponse;
}): FinanceMetrics {
  const eventIssueCount30d = hostAnalytics ? hostAnalytics.topEvents
    .filter(isHostAnalyticsEventRow)
    .filter((event) => event.paymentFailedCount > 0 ||
      event.paymentRefundedCount > 0 || event.checkoutDropoffCount > 0).length : null;
  return {
    paymentPreviewCount: overview?.queues.paymentIssues.length ?? null,
    failedPayments: overview ? metricValue(overview, "failedPayments") : null,
    payoutRestrictedHosts: overview ? metricValue(overview, "payoutRestrictedHosts") : null,
    eventIssueCount30d,
  };
}

function sourceState({
  dataUpdatedAt,
  enabled = true,
  error,
  generatedAt,
  id,
  isPending,
  label,
  scope,
}: {
  dataUpdatedAt: number;
  enabled?: boolean;
  error: unknown;
  generatedAt: string | null;
  id: FinanceSourceId;
  isPending: boolean;
  label: string;
  scope: string;
}): FinanceSourceState {
  return {
    id,
    label,
    scope,
    status: !enabled ? "restricted" : isPending ? "loading" : error ? "error" : "ready",
    generatedAt,
    loadedAt: dataUpdatedAt > 0 ? new Date(dataUpdatedAt).toISOString() : null,
    error: !enabled ? "Your Finance role can manage messaging budgets without host analytics access." :
      error ? messageFromError(error, "Source unavailable") : null,
  };
}

function filterRows(rows: FinanceIssueRow[], kind: FinanceIssueKind, query: string) {
  const tokens = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  return rows.filter((row) => {
    if (kind !== "all" && row.kind !== kind) return false;
    const haystack = [row.id, row.kind, row.title, row.detail, row.status,
      row.targetPath, row.nextAction].join(" ").toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

function isAdminQueueItem(value: unknown): value is AdminQueueItem {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<AdminQueueItem>;
  return [row.id, row.title, row.detail, row.status, row.targetPath]
    .every((field) => typeof field === "string");
}

function isHostAnalyticsEventRow(value: unknown): value is HostAnalyticsEventRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<HostAnalyticsEventRow>;
  return typeof row.eventId === "string" && typeof row.title === "string" &&
    typeof row.paymentFailedCount === "number" &&
    typeof row.paymentRefundedCount === "number" &&
    typeof row.checkoutDropoffCount === "number" &&
    typeof row.grossRevenueMinor === "number" && typeof row.currency === "string";
}

function metricValue(overview: AdminOverviewResponse, id: string): number {
  return overview.metrics.find((item) => item.id === id)?.value ?? 0;
}

function amountFromTitle(title: string): number | null {
  const match = title.match(/\bINR\s*(\d+)\b/u);
  return match ? Number.parseInt(match[1], 10) : null;
}

function evidenceAmount(row: FinanceIssueRow): string {
  if (row.amountMinor === null) return "Not available";
  return `${row.currency} ${Math.round(row.amountMinor / 100).toLocaleString("en-IN")}`;
}

function severityRank(severity: FinanceIssueRow["severity"]): number {
  return severity === "high" ? 3 : severity === "medium" ? 2 : 1;
}

function dateRank(left: string | null, right: string | null): number {
  return Date.parse(right ?? "") - Date.parse(left ?? "") || 0;
}

function eventIdFromTarget(targetPath: string): string {
  return targetPath.startsWith("events/") ? targetPath.slice(7) : "the selected event";
}

function normalizeStatus(status: string): string {
  return status.replace(/[_\s-]+/gu, "").toLowerCase();
}

function messageFromError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as {message?: unknown}).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
