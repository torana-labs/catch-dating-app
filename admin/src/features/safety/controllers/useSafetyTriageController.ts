import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useEffect, useMemo, useState} from "react";
import type {
  AdminGetSafetyTriageDetailsResponse,
  AdminOverviewResponse,
  AdminSafetyTriageAssignment,
  AdminSafetyTriageDecision,
  AdminQueueItem,
} from "../../../shared/types/adminTypes";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {useAdminPendingOperationGuard} from "../../../shared/pendingOperation";
import {
  assignSafetyTriageItemOwner,
  decideSafetyTriageItemStatus,
  loadSafetyTriageItem,
  loadSafetyTriageSnapshot,
} from "../api/safetyTriageRepository";

export type SafetyQueueKind =
  | "all"
  | "reports"
  | "moderation"
  | "event";

export interface SafetyTriageRow extends AdminQueueItem {
  queueKind: Exclude<SafetyQueueKind, "all">;
  queueLabel: string;
}

export interface SafetyTriageMetrics {
  reports: number;
  moderation: number;
  eventReports: number;
}

export interface SafetyDecisionFormState {
  note: string;
}

export interface SafetyAssignmentFormState {
  assigneeUid: string;
  note: string;
}

export function useSafetyTriageController({
  onError,
  onNotice,
  onSelectedTargetPathChange,
  selectedTargetPath: controlledSelectedTargetPath,
}: {
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  onSelectedTargetPathChange?: (targetPath: string | null) => void;
  selectedTargetPath?: string | null;
}) {
  const queryClient = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const [localSelectedTargetPath, setLocalSelectedTargetPath] = useState<string | null>(
    null
  );
  const selectedTargetPath = controlledSelectedTargetPath === undefined ?
    localSelectedTargetPath :
    controlledSelectedTargetPath;
  const setSelectedTargetPath = useCallback((targetPath: string | null) => {
    if (controlledSelectedTargetPath === undefined) {
      setLocalSelectedTargetPath(targetPath);
    }
    onSelectedTargetPathChange?.(targetPath);
  }, [controlledSelectedTargetPath, onSelectedTargetPathChange]);
  const [queueFilter, setQueueFilter] = useState<SafetyQueueKind>("all");
  const [query, setQuery] = useState("");
  const [decisionForm, setDecisionForm] =
    useState<SafetyDecisionFormState>({note: ""});
  const [assignmentForm, setAssignmentForm] =
    useState<SafetyAssignmentFormState>({assigneeUid: "", note: ""});
  const queueQueryKey = adminQueryKeys.safety.queue();
  const queueQuery = useQuery({
    queryKey: queueQueryKey,
    queryFn: loadSafetyTriageSnapshot,
    placeholderData: (previousData) => previousData,
  });
  const rows = useMemo(
    () => queueQuery.data ? buildSafetyRows(queueQuery.data) : [],
    [queueQuery.data]
  );
  const generatedAt = queueQuery.data?.generatedAt ?? null;
  const metrics = useMemo(
    () => safetyMetrics(queueQuery.data?.metrics),
    [queueQuery.data?.metrics]
  );
  const detailQuery = useQuery({
    enabled: Boolean(selectedTargetPath),
    queryKey: adminQueryKeys.safety.detail(selectedTargetPath ?? "__none__"),
    queryFn: () => {
      if (!selectedTargetPath) {
        throw new Error("Cannot load safety detail without a target path.");
      }
      return loadSafetyTriageItem(selectedTargetPath);
    },
  });
  const selectedDetail = detailQuery.data?.item ?? null;
  const selected = useMemo(() => {
    const row = rows.find((candidate) =>
      candidate.targetPath === selectedTargetPath
    );
    if (row) return row;
    return selectedDetail ? safetyRowFromDetail(selectedDetail) : null;
  }, [rows, selectedDetail, selectedTargetPath]);
  const assignmentMutation = useMutation({
    mutationFn: assignSafetyTriageItemOwner,
  });
  const decisionMutation = useMutation({
    mutationFn: decideSafetyTriageItemStatus,
  });

  const refresh = useCallback(async () => {
    const result = await queueQuery.refetch();
    if (result.error) {
      onError(messageFromError(result.error, "Unable to load safety queues."));
      return false;
    }
    onError(null);
    return true;
  }, [onError, queueQuery]);

  useEffect(() => {
    if (!selectedTargetPath && queueQuery.isError) {
      onError(messageFromError(
        queueQuery.error,
        "Unable to load safety queues."
      ));
      return;
    }
    if (queueQuery.isSuccess) onError(null);
  }, [onError, queueQuery.error, queueQuery.isError, queueQuery.isSuccess, selectedTargetPath]);

  useEffect(() => {
    if (!detailQuery.isError) return;
    onError(messageFromError(
      detailQuery.error,
      "Unable to load safety detail."
    ));
  }, [detailQuery.error, detailQuery.isError, onError]);

  const filteredRows = useMemo(
    () => filterSafetyRows(rows, queueFilter, query),
    [query, queueFilter, rows]
  );

  useEffect(() => {
    if (!selectedDetail) return;
    setAssignmentForm((current) => {
      if (current.note) return current;
      const assigneeUid = selectedDetail.assignment.assigneeUid ?? "";
      if (current.assigneeUid === assigneeUid) return current;
      return {
        ...current,
        assigneeUid,
      };
    });
  }, [selectedDetail]);

  const select = useCallback((row: SafetyTriageRow) => {
    setSelectedTargetPath(row.targetPath);
    setDecisionForm({note: ""});
    setAssignmentForm({assigneeUid: "", note: ""});
    onError(null);
    onNotice(null);
  }, [onError, onNotice, setSelectedTargetPath]);

  const decisionValidationIssue = useMemo(() => {
    if (!selected) return "Select a safety queue item before deciding.";
    const note = decisionForm.note.trim();
    if (!note) return "Add a review note before deciding this item.";
    if (note.length > 1000) return "Review note must be 1000 characters or fewer.";
    return null;
  }, [decisionForm.note, selected]);

  const assignmentValidationIssue = useMemo(() => {
    if (!selected) return "Select a safety queue item before assigning.";
    const assigneeUid = assignmentForm.assigneeUid.trim();
    if (assigneeUid && !/^[A-Za-z0-9_-]{3,128}$/u.test(assigneeUid)) {
      return "Assignee uid must be 3-128 letters, numbers, underscores, or hyphens.";
    }
    const note = assignmentForm.note.trim();
    if (!note) return "Add an assignment note before saving.";
    if (note.length > 1000) {
      return "Assignment note must be 1000 characters or fewer.";
    }
    return null;
  }, [assignmentForm.assigneeUid, assignmentForm.note, selected]);

  const assign = useCallback(async () => {
    if (!selected) {
      onError("Select a safety queue item before assigning.");
      return false;
    }
    const issue = assignmentValidationIssue;
    if (issue) {
      onError(issue);
      return false;
    }
    const note = assignmentForm.note.trim();
    const assigneeUid = nullableText(assignmentForm.assigneeUid);
    onError(null);
    onNotice(null);
    const operation = beginOperation();
    if (!operation) return false;
    try {
      const response = await assignmentMutation.mutateAsync({
        targetPath: selected.targetPath,
        assigneeUid,
        note,
      });
      queryClient.setQueryData<AdminGetSafetyTriageDetailsResponse>(
        adminQueryKeys.safety.detail(selected.targetPath),
        (current) => current ? {
          ...current,
          item: {
            ...current.item,
            assignment: response.assignment,
          },
        } : current
      );
      setAssignmentForm({
        assigneeUid: response.assignment.assigneeUid ?? "",
        note: "",
      });
      onNotice(
        response.assignment.assigneeUid ?
          `Assigned ${selected.title} to ${response.assignment.assigneeUid}.` :
          `Cleared assignment for ${selected.title}.`
      );
      return true;
    } catch (error) {
      onError(messageFromError(error, "Unable to assign safety item."));
      return false;
    } finally {
      endOperation(operation);
    }
  }, [
    assignmentForm.assigneeUid,
    assignmentForm.note,
    assignmentMutation,
    assignmentValidationIssue,
    beginOperation,
    endOperation,
    onError,
    onNotice,
    queryClient,
    selected,
  ]);

  const decide = useCallback(async (decision: AdminSafetyTriageDecision) => {
    if (!selected) {
      onError("Select a safety queue item before deciding.");
      return false;
    }
    const note = decisionForm.note.trim();
    if (!note) {
      onError("Add a review note before deciding this item.");
      return false;
    }
    if (note.length > 1000) {
      onError("Review note must be 1000 characters or fewer.");
      return false;
    }
    onError(null);
    onNotice(null);
    const operation = beginOperation();
    if (!operation) return false;
    try {
      const response = await decisionMutation.mutateAsync({
        targetPath: selected.targetPath,
        decision,
        note,
      });
      queryClient.setQueryData<AdminOverviewResponse>(
        queueQueryKey,
        (current) => current ?
          removeSafetyQueueItem(current, selected.targetPath) :
          current
      );
      queryClient.removeQueries({
        queryKey: adminQueryKeys.safety.detail(selected.targetPath),
      });
      setSelectedTargetPath(null);
      setDecisionForm({note: ""});
      onNotice(
        `${response.status === "reviewed" ? "Reviewed" : "Dismissed"} ${selected.title}.`
      );
      return true;
    } catch (error) {
      onError(messageFromError(error, "Unable to decide safety item."));
      return false;
    } finally {
      endOperation(operation);
    }
  }, [
    beginOperation,
    decisionForm.note,
    decisionMutation,
    endOperation,
    onError,
    onNotice,
    queryClient,
    queueQueryKey,
    selected,
    setSelectedTargetPath,
  ]);

  return {
    assignmentForm,
    assignmentInFlight: assignmentMutation.isPending,
    assignmentValidationIssue,
    decisionForm,
    decisionInFlight: decisionMutation.isPending ?
      decisionMutation.variables?.decision ?? null :
      null,
    decisionValidationIssue,
    filteredRows,
    generatedAt,
    isDetailLoading: selectedTargetPath ?
      detailQuery.isPending || detailQuery.isFetching :
      false,
    isLoading: !selectedTargetPath &&
      (queueQuery.isPending || queueQuery.isFetching),
    metrics,
    query,
    queueFilter,
    rows,
    selected,
    selectedDetail,
    assign,
    decide,
    refresh,
    select,
    setDecisionForm,
    setAssignmentForm,
    setQuery,
    setQueueFilter,
  };
}

export type SafetyTriageController =
  ReturnType<typeof useSafetyTriageController>;

function removeSafetyQueueItem(
  snapshot: AdminOverviewResponse,
  targetPath: string
): AdminOverviewResponse {
  const metricId = snapshot.queues.safetyReports.some((row) =>
    row.targetPath === targetPath
  ) ? "openReports" : snapshot.queues.moderationFlags.some((row) =>
    row.targetPath === targetPath
  ) ? "pendingModerationFlags" : snapshot.queues.eventSafetyReports.some((row) =>
    row.targetPath === targetPath
  ) ? "eventSafetyReports" : null;
  return {
    ...snapshot,
    metrics: snapshot.metrics.map((metric) => metric.id === metricId ? {
      ...metric,
      value: Math.max(0, metric.value - 1),
    } : metric),
    queues: {
      ...snapshot.queues,
      safetyReports: snapshot.queues.safetyReports.filter((row) =>
        row.targetPath !== targetPath
      ),
      moderationFlags: snapshot.queues.moderationFlags.filter((row) =>
        row.targetPath !== targetPath
      ),
      eventSafetyReports: snapshot.queues.eventSafetyReports.filter((row) =>
        row.targetPath !== targetPath
      ),
    },
  };
}

function buildSafetyRows(snapshot: Awaited<
  ReturnType<typeof loadSafetyTriageSnapshot>
>): SafetyTriageRow[] {
  const reportRows = snapshot.queues.safetyReports.map((row) =>
    safetyRow(row, "reports", "User reports")
  );
  const moderationRows = snapshot.queues.moderationFlags.map((row) =>
    safetyRow(row, "moderation", "Moderation flags")
  );
  const eventRows = snapshot.queues.eventSafetyReports.map((row) =>
    safetyRow(row, "event", "Event safety")
  );
  return [...reportRows, ...moderationRows, ...eventRows];
}

function safetyRow(
  row: AdminQueueItem,
  queueKind: Exclude<SafetyQueueKind, "all">,
  queueLabel: string
): SafetyTriageRow {
  return {
    ...row,
    queueKind,
    queueLabel,
  };
}

function safetyRowFromDetail(
  detail: AdminGetSafetyTriageDetailsResponse["item"]
): SafetyTriageRow {
  const queueKind: SafetyTriageRow["queueKind"] =
    detail.kind === "report" ? "reports" :
      detail.kind === "moderationFlag" ? "moderation" :
        "event";
  const queueLabel = queueKind === "reports" ? "User reports" :
    queueKind === "moderation" ? "Moderation flags" :
      "Event safety";
  return {
    id: detail.targetPath,
    title: detail.title,
    detail: detail.summary,
    status: detail.status,
    targetPath: detail.targetPath,
    createdAt: detail.createdAt,
    queueKind,
    queueLabel,
  };
}

function safetyMetrics(
  metrics: AdminOverviewResponse["metrics"] | undefined
): SafetyTriageMetrics {
  return {
    reports: overviewMetricValue(metrics, "openReports"),
    moderation: overviewMetricValue(metrics, "pendingModerationFlags"),
    eventReports: overviewMetricValue(metrics, "eventSafetyReports"),
  };
}

function overviewMetricValue(
  metrics: AdminOverviewResponse["metrics"] | undefined,
  id: string
): number {
  const value = metrics?.find((metric) => metric.id === id)?.value ?? 0;
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function filterSafetyRows(
  rows: SafetyTriageRow[],
  queueFilter: SafetyQueueKind,
  query: string
): SafetyTriageRow[] {
  const tokens = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  return rows.filter((row) => {
    if (queueFilter !== "all" && row.queueKind !== queueFilter) return false;
    if (tokens.length === 0) return true;
    const haystack = [
      row.id,
      row.title,
      row.detail,
      row.status,
      row.targetPath,
      row.queueLabel,
    ].join(" ").toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

function messageFromError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as {message?: unknown}).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
