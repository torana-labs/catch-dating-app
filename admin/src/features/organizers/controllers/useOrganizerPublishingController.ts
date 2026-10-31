import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useEffect, useMemo, useState} from "react";
import type {
  AdminOrganizerDetails,
  AdminOrganizerListRow,
  AdminListOrganizerDetailsPayload,
} from "../../../shared/types/adminTypes";
import {
  listOrganizerProfiles,
  loadOrganizerProfile,
  publishOrganizerProfile,
  saveOrganizerProfile,
} from "../api/organizerPublishingRepository";
import {
  buildOrganizerPublishPayload,
  buildOrganizerSavePayload,
  completePublishChecklist,
  diffOrganizerProfile,
  emptyPublishChecklist,
  hasBlockingIssues,
  type OrganizerDiffRow,
  type OrganizerPublishingFormState,
  type OrganizerValidationIssue,
  type PublishChecklistState,
  formFromOrganizerProfile,
  validateOrganizerPublishingForm,
} from "./organizerPublishingHelpers";
import {
  isLaunchMarketId,
  launchMarketIds,
} from "../../../shared/config/launchMarkets";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {useAdminPendingOperationGuard} from "../../../shared/pendingOperation";

export type OrganizerPublishingFilter =
  | "launchCities"
  | "all"
  | "needsPublish"
  | "published"
  | "appHidden"
  | "routeIssues"
  | "searchIssues";

export type OrganizerPublishingView = "list" | "detail";

export function useOrganizerPublishingController({
  selectedOrganizerId,
  onBackToList,
  onError,
  onNotice,
  onSelectOrganizerId,
}: {
  selectedOrganizerId?: string | null;
  onBackToList?: () => void;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  onSelectOrganizerId?: (organizerId: string) => void;
}) {
  const queryClient = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, query.trim() ? 250 : 0);
  const [filter, setFilter] =
    useState<OrganizerPublishingFilter>("launchCities");
  const [organizerId, setOrganizerId] = useState("");
  const [organizer, setOrganizer] = useState<AdminOrganizerDetails | null>(null);
  const [form, setForm] = useState<OrganizerPublishingFormState | null>(null);
  const [checklist, setChecklist] =
    useState<PublishChecklistState>(emptyPublishChecklist);
  const listPayload = useMemo(
    () => buildOrganizerListPayload(filter, debouncedQuery),
    [debouncedQuery, filter]
  );
  const listQueryKey = adminQueryKeys.organizers.list(JSON.stringify(listPayload));
  const detailOrganizerId = selectedOrganizerId?.trim() ?? "";
  const view: OrganizerPublishingView = detailOrganizerId ? "detail" : "list";
  const detailQueryKey = detailOrganizerId ?
    adminQueryKeys.organizers.detail(detailOrganizerId) :
    adminQueryKeys.organizers.detail("__none__");
  const listQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () => listOrganizerProfiles(listPayload),
  });
  const detailQuery = useQuery({
    enabled: Boolean(detailOrganizerId),
    queryKey: detailQueryKey,
    queryFn: () => loadOrganizerProfile({organizerId: detailOrganizerId}),
  });
  const saveMutation = useMutation({
    mutationFn: saveOrganizerProfile,
  });
  const publishMutation = useMutation({
    mutationFn: publishOrganizerProfile,
  });
  const rows = listQuery.data?.rows ?? [];
  const listGeneratedAt = listQuery.data?.generatedAt ?? null;

  const refreshList = useCallback(async () => {
    await listQuery.refetch();
  }, [listQuery]);

  useEffect(() => {
    if (!listQuery.error) return;
    onError(messageFromError(listQuery.error, "Unable to load organizer profiles."));
  }, [listQuery.error, onError]);

  useEffect(() => {
    if (!detailQuery.error) return;
    onError(messageFromError(detailQuery.error, "Unable to load organizer profile."));
  }, [detailQuery.error, onError]);

  useEffect(() => {
    if (!detailQuery.data) return;
    setOrganizer(detailQuery.data.organizer);
    setForm(formFromOrganizerProfile(detailQuery.data.organizer));
    setOrganizerId(detailQuery.data.organizer.organizerId);
    setChecklist(emptyPublishChecklist);
    onError(null);
  }, [detailQuery.data, onError]);

  const loadOrganizer = useCallback(async (nextOrganizerId = organizerId) => {
    const normalizedOrganizerId = nextOrganizerId.trim();
    if (!normalizedOrganizerId) {
      onError("Enter an organizers/{id} document id before loading.");
      return;
    }
    if (onSelectOrganizerId && normalizedOrganizerId !== detailOrganizerId) {
      onSelectOrganizerId(normalizedOrganizerId);
      onError(null);
      return;
    }
    try {
      const response = await queryClient.fetchQuery({
        queryKey: adminQueryKeys.organizers.detail(normalizedOrganizerId),
        queryFn: () => loadOrganizerProfile({organizerId: normalizedOrganizerId}),
        staleTime: 0,
      });
      setOrganizer(response.organizer);
      setForm(formFromOrganizerProfile(response.organizer));
      setOrganizerId(response.organizer.organizerId);
      setChecklist(emptyPublishChecklist);
      onError(null);
    } catch (error) {
      onError(messageFromError(error, "Unable to load organizer profile."));
    }
  }, [organizerId, detailOrganizerId, onError, onSelectOrganizerId, queryClient]);

  useEffect(() => {
    const routeOrganizerId = selectedOrganizerId?.trim() ?? "";
    if (!routeOrganizerId) {
      setOrganizerId("");
      setOrganizer(null);
      setForm(null);
      setChecklist(emptyPublishChecklist);
      return;
    }
    setOrganizerId(routeOrganizerId);
  }, [selectedOrganizerId]);

  const selectOrganizer = useCallback((nextOrganizerId: string) => {
    setOrganizerId(nextOrganizerId);
    if (onSelectOrganizerId) {
      onSelectOrganizerId(nextOrganizerId);
      return;
    }
    void loadOrganizer(nextOrganizerId);
  }, [loadOrganizer, onSelectOrganizerId]);

  const backToList = useCallback(() => {
    setOrganizer(null);
    setForm(null);
    setOrganizerId("");
    setChecklist(emptyPublishChecklist);
    onError(null);
    onBackToList?.();
  }, [onBackToList, onError]);

  const diffRows = useMemo(
    () => diffOrganizerProfile(organizer, form),
    [organizer, form]
  );
  const validationIssues = useMemo(
    () => validateOrganizerPublishingForm(
      form,
      {requireReviewNote: diffRows.length > 0}
    ),
    [diffRows.length, form]
  );
  const publishingIssues = useMemo(
    () => validateOrganizerPublishingForm(
      form,
      {publishing: true, requireReviewNote: true}
    ),
    [form]
  );

  const persistOrganizer = useCallback(async (
    payload: ReturnType<typeof buildOrganizerSavePayload>
  ) => {
    if (Object.keys(payload.fields).length === 0) return null;
    const result = await saveMutation.mutateAsync(payload);
    const refreshed = await queryClient.fetchQuery({
      queryKey: adminQueryKeys.organizers.detail(result.organizerId),
      queryFn: () => loadOrganizerProfile({organizerId: result.organizerId}),
      staleTime: 0,
    });
    setOrganizer(refreshed.organizer);
    setForm(formFromOrganizerProfile(refreshed.organizer));
    await refreshList();
    return result;
  }, [queryClient, refreshList, saveMutation]);

  const save = useCallback(async () => {
    if (!organizer || !form) {
      onError("Load an organizer before saving.");
      return false;
    }
    const payload = buildOrganizerSavePayload(organizer, form);
    if (Object.keys(payload.fields).length === 0) {
      onNotice("No organizer changes to save.");
      return true;
    }
    const issues = validateOrganizerPublishingForm(form, {
      requireReviewNote: true,
    });
    if (hasBlockingIssues(issues)) {
      onError(issues.find((issue) => issue.severity === "blocker")?.detail ??
        "Resolve organizer validation issues before saving.");
      return false;
    }
    const operation = beginOperation();
    if (!operation) return false;
    try {
      const result = await persistOrganizer(payload);
      onError(null);
      onNotice(
        result ?
          `Saved ${result.updatedFieldCount} organizer field updates.` :
          "No organizer changes to save."
      );
      return true;
    } catch (error) {
      onError(messageFromError(error, "Unable to save organizer profile."));
      return false;
    } finally {
      endOperation(operation);
    }
  }, [
    beginOperation,
    organizer,
    endOperation,
    form,
    onError,
    onNotice,
    persistOrganizer,
  ]);

  const saveAndPublish = useCallback(async () => {
    if (!organizer || !form) {
      onError("Load an organizer before publishing.");
      return;
    }
    const issues = validateOrganizerPublishingForm(form, {
      publishing: true,
      requireReviewNote: true,
    });
    if (hasBlockingIssues(issues)) {
      onError(issues.find((issue) => issue.severity === "blocker")?.detail ??
        "Resolve organizer validation issues before publishing.");
      return;
    }
    if (!completePublishChecklist(checklist)) {
      onError("Complete the publish checklist before indexing this profile.");
      return;
    }
    const savePayload = buildOrganizerSavePayload(organizer, form);
    const publishPayload = buildOrganizerPublishPayload(form, checklist);
    const operation = beginOperation();
    if (!operation) return;
    try {
      await persistOrganizer(savePayload);
      const result = await publishMutation.mutateAsync(publishPayload);
      const refreshed = await queryClient.fetchQuery({
        queryKey: adminQueryKeys.organizers.detail(result.organizerId),
        queryFn: () => loadOrganizerProfile({organizerId: result.organizerId}),
        staleTime: 0,
      });
      setOrganizer(refreshed.organizer);
      setForm(formFromOrganizerProfile(refreshed.organizer));
      setChecklist(emptyPublishChecklist);
      await refreshList();
      onError(null);
      onNotice(
        `${refreshed.organizer.name} is ${result.publishStatus} with ` +
          `${result.robots}.`
      );
    } catch (error) {
      onError(messageFromError(error, "Unable to publish organizer profile."));
    } finally {
      endOperation(operation);
    }
  }, [
    beginOperation,
    checklist,
    organizer,
    endOperation,
    form,
    onError,
    onNotice,
    publishMutation,
    queryClient,
    refreshList,
    persistOrganizer,
  ]);

  return {
    backToList,
    checklist,
    organizer,
    organizerId,
    diffRows,
    filter,
    form,
    isDetailLoading: detailQuery.isFetching,
    isListLoading: listQuery.isFetching,
    isPublishing: publishMutation.isPending,
    isSaving: saveMutation.isPending,
    listGeneratedAt,
    publishingIssues,
    query,
    rows,
    validationIssues,
    view,
    filteredRows: filterOrganizerRows(rows, filter),
    completeChecklist: completePublishChecklist(checklist),
    refreshList,
    save,
    saveAndPublish,
    selectOrganizer,
    setChecklist,
    setOrganizerId,
    setFilter,
    setForm,
    setQuery,
  };
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);
  return debouncedValue;
}

export function filterOrganizerRows(
  rows: AdminOrganizerListRow[],
  filter: OrganizerPublishingFilter
): AdminOrganizerListRow[] {
  return rows.filter((row) => {
    if (filter === "launchCities" && !isLaunchMarketId(row.citySlug)) {
      return false;
    }
    if (filter === "needsPublish" && !organizerNeedsPublish(row)) {
      return false;
    }
    if (filter === "published" && row.publishStatus !== "published") {
      return false;
    }
    if (filter === "appHidden" && row.appVisibility !== "hidden") {
      return false;
    }
    if (filter === "routeIssues" &&
        row.routeStatus === "valid" &&
        row.routeReservationStatus === "reserved") {
      return false;
    }
    if (filter === "searchIssues" && row.searchIndexStatus === "indexed") {
      return false;
    }
    return true;
  });
}

export function organizerNeedsPublish(row: AdminOrganizerListRow): boolean {
  const publishableSourceConfidence =
    row.sourceConfidence === "high" ||
    row.sourceConfidence === "ownerVerified";
  return row.routeStatus !== "valid" ||
    row.routeReservationStatus !== "reserved" ||
    row.searchIndexStatus !== "indexed" ||
    row.publishStatus !== "published" ||
    row.indexStatus === "noindex" ||
    !publishableSourceConfidence ||
    row.verificationStatus === "unverified";
}

export function countBlockingIssues(
  issues: OrganizerValidationIssue[]
): number {
  return issues.filter((issue) => issue.severity === "blocker").length;
}

export function countDiffRows(rows: OrganizerDiffRow[]): number {
  return rows.length;
}

export function buildOrganizerListPayload(
  filter: OrganizerPublishingFilter,
  query: string
): AdminListOrganizerDetailsPayload {
  const payload: AdminListOrganizerDetailsPayload = {
    limit: 100,
    query: query.trim() || null,
  };
  if (filter === "launchCities") {
    payload.citySlugs = Array.from(launchMarketIds);
  }
  if (filter === "published") payload.publishStatus = "published";
  if (filter === "appHidden") payload.appVisibility = "hidden";
  return payload;
}

function messageFromError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export type OrganizerPublishingController =
  ReturnType<typeof useOrganizerPublishingController>;
