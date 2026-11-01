import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useEffect, useMemo, useState} from "react";
import type {
  AccessApplicationDecision,
  AdminAccessApplicationDetails,
  AdminQueueItem,
} from "../../../shared/types/adminTypes";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {useAdminPendingOperationGuard} from "../../../shared/pendingOperation";
import {
  decideAccessReview,
  listAccessApplications,
  loadAccessApplicationDetails,
} from "../api/accessReviewRepository";

export interface AccessReviewFormState {
  note: string;
  cohortId: string;
}

export interface AccessReviewController {
  decisionInFlight: AccessApplicationDecision | null;
  detailError: string | null;
  filteredRows: AdminQueueItem[];
  form: AccessReviewFormState;
  generatedAt: string | null;
  isDetailLoading: boolean;
  isLoading: boolean;
  pendingTotal: number;
  query: string;
  rows: AdminQueueItem[];
  selected: AdminQueueItem | null;
  selectedApplicationUid: string | null;
  selectedDetails: AdminAccessApplicationDetails | null;
  selectedUnavailable: boolean;
  validationIssue: string | null;
  decide: (decision: AccessApplicationDecision) => Promise<boolean>;
  refresh: () => Promise<void>;
  refreshDetail: () => Promise<void>;
  select: (row: AdminQueueItem) => void;
  setForm: (form: AccessReviewFormState) => void;
  setQuery: (query: string) => void;
}

export function useAccessReviewController({
  onError,
  onNotice,
  onSelectedApplicationUidChange,
  selectedApplicationUid: controlledSelectedApplicationUid,
}: {
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  onSelectedApplicationUidChange?: (applicationUid: string | null) => void;
  selectedApplicationUid?: string | null;
}): AccessReviewController {
  const queryClient = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const [localSelectedApplicationUid, setLocalSelectedApplicationUid] =
    useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<AccessReviewFormState>({
    note: "",
    cohortId: "",
  });
  const selectedApplicationUid = controlledSelectedApplicationUid === undefined ?
    localSelectedApplicationUid :
    controlledSelectedApplicationUid;

  const setSelectedApplicationUid = useCallback((applicationUid: string | null) => {
    if (controlledSelectedApplicationUid === undefined) {
      setLocalSelectedApplicationUid(applicationUid);
    }
    onSelectedApplicationUidChange?.(applicationUid);
  }, [controlledSelectedApplicationUid, onSelectedApplicationUidChange]);

  const listQuery = useQuery({
    queryKey: adminQueryKeys.access.applications(),
    queryFn: listAccessApplications,
  });
  const rows = listQuery.data?.rows ?? [];

  const filteredRows = useMemo(
    () => filterAccessRows(rows, query),
    [query, rows]
  );
  const selectedRow = useMemo(
    () => rows.find((row) =>
      applicationUidFromTargetPath(row.targetPath) === selectedApplicationUid
    ) ?? null,
    [rows, selectedApplicationUid]
  );
  const detailQuery = useQuery({
    enabled: Boolean(selectedApplicationUid),
    queryKey: adminQueryKeys.access.detail(selectedApplicationUid ?? "none"),
    queryFn: () => loadAccessApplicationDetails({
      applicationUid: selectedApplicationUid ?? "",
    }),
  });
  const decideMutation = useMutation({
    mutationFn: decideAccessReview,
  });
  const selectedDetails = detailQuery.data?.application ?? null;
  const selected = selectedRow ?? (
    selectedDetails ? queueItemFromAccessDetails(selectedDetails) : null
  );
  const validationIssue = validateAccessReview(selected, form);

  useEffect(() => {
    if (listQuery.isError) {
      onError(messageFromError(
        listQuery.error,
        "Unable to load access applications."
      ));
      return;
    }
    if (listQuery.isSuccess && !detailQuery.isError) {
      onError(null);
    }
  }, [detailQuery.isError, listQuery.error, listQuery.isError, listQuery.isSuccess, onError]);

  useEffect(() => {
    if (detailQuery.isError) {
      onError(messageFromError(
        detailQuery.error,
        "Unable to load access application detail."
      ));
      return;
    }
    if (detailQuery.isSuccess && !listQuery.isError) onError(null);
  }, [detailQuery.error, detailQuery.isError, detailQuery.isSuccess, listQuery.isError, onError]);

  const select = useCallback((row: AdminQueueItem) => {
    setForm({note: "", cohortId: ""});
    onError(null);
    const applicationUid = applicationUidFromTargetPath(row.targetPath);
    if (!applicationUid) {
      onError("Cannot load access application detail without a valid target.");
      return;
    }
    setSelectedApplicationUid(applicationUid);
  }, [onError, setSelectedApplicationUid]);

  const decide = useCallback(async (decision: AccessApplicationDecision) => {
    if (!selected) {
      onError("Select an access application before deciding.");
      return false;
    }
    const applicationUid = applicationUidFromTargetPath(selected.targetPath);
    if (!applicationUid) {
      onError("Cannot decide an access application without a valid target.");
      return false;
    }
    const issue = validateAccessReview(selected, form);
    if (issue) {
      onError(issue);
      return false;
    }
    const operation = beginOperation();
    if (!operation) return false;
    try {
      const result = await decideMutation.mutateAsync({
        applicationUid,
        decision,
        note: form.note.trim(),
        cohortId: nullableText(form.cohortId),
      });
      queryClient.setQueryData<{
        generatedAt: string;
        pendingTotal: number;
        rows: AdminQueueItem[];
      }>(
        adminQueryKeys.access.applications(),
        (current) => current ? ({
          ...current,
          pendingTotal: Math.max(0, current.pendingTotal - 1),
          rows: current.rows.filter((row) => row.targetPath !== selected.targetPath),
        }) : current
      );
      await queryClient.invalidateQueries({
        queryKey: adminQueryKeys.access.applications(),
      });
      setSelectedApplicationUid(null);
      setForm({note: "", cohortId: ""});
      onError(null);
      onNotice(
        decision === "approve" ?
          `Approved ${selected.title} for profile creation.` :
          `Marked ${selected.title} as not selected yet.`
      );
      return true;
    } catch (error) {
      onError(messageFromError(error, "Unable to decide access application."));
      return false;
    } finally {
      endOperation(operation);
    }
  }, [
    beginOperation,
    decideMutation,
    endOperation,
    form,
    onError,
    onNotice,
    queryClient,
    selected,
    setSelectedApplicationUid,
  ]);

  const refresh = useCallback(async () => {
    await listQuery.refetch();
  }, [listQuery]);

  const refreshDetail = useCallback(async () => {
    await detailQuery.refetch();
  }, [detailQuery]);

  const detailError = detailQuery.isError ? messageFromError(
    detailQuery.error,
    "Unable to load access application detail."
  ) : null;

  return {
    decisionInFlight: decideMutation.isPending ?
      decideMutation.variables?.decision ?? null :
      null,
    detailError,
    filteredRows,
    form,
    generatedAt: listQuery.data?.generatedAt ?? null,
    isLoading: listQuery.isPending || listQuery.isFetching,
    isDetailLoading: Boolean(selectedApplicationUid) &&
      (detailQuery.isPending || detailQuery.isFetching),
    pendingTotal: listQuery.data?.pendingTotal ?? rows.length,
    query,
    rows,
    selected,
    selectedApplicationUid,
    selectedDetails,
    selectedUnavailable: Boolean(
      selectedApplicationUid &&
      !detailQuery.isPending &&
      (detailQuery.isError || !selectedDetails)
    ),
    validationIssue,
    decide,
    refresh,
    refreshDetail,
    select,
    setForm,
    setQuery,
  };
}

function queueItemFromAccessDetails(
  details: AdminAccessApplicationDetails
): AdminQueueItem {
  return {
    id: details.targetPath,
    title: details.uid,
    detail: [details.city, details.role].filter(Boolean).join(" · "),
    status: details.status,
    createdAt: details.submittedAt ?? details.createdAt,
    targetPath: details.targetPath,
  };
}

export function applicationUidFromTargetPath(targetPath: string): string | null {
  const [collection, uid, extra] = targetPath.split("/");
  if (collection !== "accessApplications" || !uid || extra) return null;
  return uid;
}

function filterAccessRows(
  rows: AdminQueueItem[],
  query: string
): AdminQueueItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return rows;
  const tokens = normalizedQuery.split(/\s+/u).filter(Boolean);
  return rows.filter((row) => {
    const haystack = [
      row.id,
      row.title,
      row.detail,
      row.status,
      row.targetPath,
      row.createdAt,
    ].join(" ").toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

function validateAccessReview(
  selected: AdminQueueItem | null,
  form: AccessReviewFormState
): string | null {
  if (!selected) return "Select an access application before deciding.";
  if (!form.note.trim()) {
    return "Add a review note before approving or denying access.";
  }
  if (form.note.trim().length > 1000) {
    return "Review note must be 1000 characters or fewer.";
  }
  if (form.cohortId.trim().length > 120) {
    return "Cohort id must be 120 characters or fewer.";
  }
  return null;
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function messageFromError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as {message?: unknown}).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
