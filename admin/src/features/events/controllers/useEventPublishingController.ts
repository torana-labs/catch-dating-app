import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useCallback, useEffect, useMemo, useState} from "react";
import type {
  AdminExternalEventListRow,
  AdminListExternalEventDetailsPayload,
  AdminTakedownExternalEventPayload,
} from "../../../shared/types/adminTypes";
import {
  listExternalEventProfiles,
  takedownExternalEventProfile,
} from "../api/eventPublishingRepository";
import {
  externalEventNeedsReview,
} from "./eventPublishingHelpers";
import {
  isLaunchMarketSlug,
  launchMarketSlugs,
} from "../../../shared/config/launchMarkets";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {useAdminPendingOperationGuard} from "../../../shared/pendingOperation";

export type ExternalEventSupplyFilter =
  | "launchCities"
  | "reviewOpen"
  | "upcoming"
  | "public"
  | "all"
  | "active"
  | "cancelled";


export interface ExternalEventTakedownRequest {
  eventId: string;
  reviewNote: string;
  checklist: AdminTakedownExternalEventPayload["checklist"];
}

/** An imported event's source record and takedown, for the event page's Takedown tab. */
export function useEventPublishingController({
  onError,
  onNotice,
  onSelectExternalEventId,
  selectedExternalEventId: controlledSelectedExternalEventId,
}: {
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
  onSelectExternalEventId?: (eventId: string | null) => void;
  selectedExternalEventId?: string | null;
}) {
  const queryClient = useQueryClient();
  const {beginOperation, endOperation} = useAdminPendingOperationGuard();
  const [localSelectedExternalEventId, setLocalSelectedExternalEventId] =
    useState<string | null>(null);
  const [externalQuery, setExternalQuery] = useState("");
  const debouncedExternalQuery = useDebouncedValue(
    externalQuery,
    externalQuery.trim() ? 250 : 0
  );
  const [externalFilter, setExternalFilter] =
    useState<ExternalEventSupplyFilter>(
      "public"
    );
  const selectedExternalEventId = controlledSelectedExternalEventId === undefined ?
    localSelectedExternalEventId :
    controlledSelectedExternalEventId;
  const setSelectedExternalEventId = useCallback((nextEventId: string | null) => {
    if (controlledSelectedExternalEventId === undefined) {
      setLocalSelectedExternalEventId(nextEventId);
    }
    onSelectExternalEventId?.(nextEventId);
  }, [controlledSelectedExternalEventId, onSelectExternalEventId]);
  const externalListPayload = useMemo(
    () => ({
      ...buildExternalEventListPayload(externalFilter, debouncedExternalQuery),
      publicationStatus: "public" as const,
    }),
    [debouncedExternalQuery, externalFilter]
  );
  const externalListQuery = useQuery({
    enabled: !selectedExternalEventId,
    queryKey: adminQueryKeys.events.externalList(
      JSON.stringify(externalListPayload)
    ),
    queryFn: () => listExternalEventProfiles(externalListPayload),
    placeholderData: (previousData) => previousData,
  });
  const externalDetailQuery = useQuery({
    enabled: Boolean(selectedExternalEventId),
    queryKey: adminQueryKeys.events.externalList(JSON.stringify({
      query: selectedExternalEventId,
      publicationStatus: "public",
      timeWindow: "all",
      limit: 10,
    })),
    queryFn: () => listExternalEventProfiles({
      query: selectedExternalEventId,
      publicationStatus: "public",
      timeWindow: "all",
      limit: 10,
    }),
  });
  const takedownExternalMutation = useMutation({
    mutationFn: takedownExternalEventProfile,
  });
  const externalRows = externalListQuery.data?.rows ?? [];
  const externalListGeneratedAt = externalListQuery.data?.generatedAt ?? null;

  const refreshExternalList = useCallback(async () => {
    // Feedback belongs to the current observer below, including navigation
    // between inventory and detail while this request is pending.
    const result = await (selectedExternalEventId ?
      externalDetailQuery.refetch() : externalListQuery.refetch());
    return !result.error;
  }, [externalDetailQuery, externalListQuery, selectedExternalEventId]);

  useEffect(() => {
    if (selectedExternalEventId || externalListQuery.isFetching) return;
    if (externalListQuery.error) {
      onError(messageFromError(
        externalListQuery.error,
        "Unable to load external event supply."
      ));
    } else if (externalListQuery.isSuccess) {
      onError(null);
    }
  }, [
    externalListQuery.error,
    externalListQuery.isFetching,
    externalListQuery.isSuccess,
    onError,
    selectedExternalEventId,
  ]);

  useEffect(() => {
    if (!selectedExternalEventId || externalDetailQuery.isFetching) return;
    if (externalDetailQuery.error) {
      onError(messageFromError(
        externalDetailQuery.error,
        "Unable to load external event detail."
      ));
    } else if (externalDetailQuery.isSuccess) {
      onError(null);
    }
  }, [
    externalDetailQuery.error,
    externalDetailQuery.isFetching,
    externalDetailQuery.isSuccess,
    onError,
    selectedExternalEventId,
  ]);

  const filteredExternalRows = useMemo(
    () => filterExternalEventRows(
      externalRows,
      externalFilter,
      externalListGeneratedAt
    ),
    [externalFilter, externalListGeneratedAt, externalRows]
  );
  const selectedExternalEvent = useMemo(() => {
    // A list snapshot cannot establish current detail availability. Refetching
    // and failed queries can retain prior data, so expose only settled success.
    if (externalDetailQuery.isFetching || !externalDetailQuery.isSuccess) return null;
    return externalDetailQuery.data.rows.find((row) =>
      row.eventId === selectedExternalEventId) ?? null;
  }, [
    externalDetailQuery.data,
    externalDetailQuery.isFetching,
    externalDetailQuery.isSuccess,
    selectedExternalEventId,
  ]);
  const takedownExternalEvent = useCallback(async (
    takedownRequest: ExternalEventTakedownRequest
  ) => {
    if (!takedownRequest.reviewNote.trim()) {
      onError("Add a review note before removing external supply.");
      return false;
    }
    const operation = beginOperation();
    if (!operation) return false;
    try {
      const operationKey = externalEventOperationKey(
        `${takedownRequest.eventId}:takedown`
      );
      const result = await dispatchDryRunAndApply(
        (payload) => takedownExternalMutation.mutateAsync(payload),
        {
          eventId: takedownRequest.eventId,
          executionMode: "dry_run",
          idempotencyKey: `${operationKey}:dry-run`,
          reviewNote: takedownRequest.reviewNote.trim(),
          checklist: takedownRequest.checklist,
        } satisfies AdminTakedownExternalEventPayload,
        {
          eventId: takedownRequest.eventId,
          executionMode: "apply",
          idempotencyKey: `${operationKey}:apply`,
          reviewNote: takedownRequest.reviewNote.trim(),
          checklist: takedownRequest.checklist,
        } satisfies AdminTakedownExternalEventPayload
      );
      await queryClient.invalidateQueries({
        queryKey: [...adminQueryKeys.all, "events"],
      });
      onError(null);
      onNotice(`Removed ${result.targetPath} from external discovery.`);
      return true;
    } catch (error) {
      onError(messageFromError(error, "Unable to remove external event."));
      return false;
    } finally {
      endOperation(operation);
    }
  }, [
    beginOperation,
    endOperation,
    onError,
    onNotice,
    queryClient,
    takedownExternalMutation,
  ]);

  return {
    externalFilter,
    externalQuery,
    externalListGeneratedAt,
    externalRows,
    filteredExternalRows,
    isExternalDetailError: externalDetailQuery.isError,
    isExternalListLoading: selectedExternalEventId ?
      externalDetailQuery.isPending || externalDetailQuery.isFetching :
      externalListQuery.isPending || externalListQuery.isFetching,
    isTakingDownExternalEvent: takedownExternalMutation.isPending,
    selectedExternalEvent,
    selectedExternalEventId,
    refreshExternalList,
    selectExternalEvent: setSelectedExternalEventId,
    setExternalFilter,
    setExternalQuery,
    takedownExternalEvent,
  };
}

export type EventPublishingController =
  ReturnType<typeof useEventPublishingController>;

async function dispatchDryRunAndApply<TPayload, TResult>(
  dispatch: (payload: TPayload) => Promise<TResult>,
  dryRunPayload: TPayload,
  applyPayload: TPayload
): Promise<TResult> {
  await dispatch(dryRunPayload);
  return dispatch(applyPayload);
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, value]);
  return debouncedValue;
}

export function filterExternalEventRows(
  rows: AdminExternalEventListRow[],
  filter: ExternalEventSupplyFilter,
  generatedAt?: string | null
): AdminExternalEventListRow[] {
  const now = snapshotTimeMillis(generatedAt);
  return rows.filter((row) => {
    if (filter === "reviewOpen") {
      return isLaunchMarketSlug(row.citySlug) &&
        externalEventNeedsReview(row);
    }
    if (filter === "launchCities" && !isLaunchMarketSlug(row.citySlug)) {
      return false;
    }
    if (filter === "launchCities" && row.status !== "active") return false;
    if (filter === "launchCities" && row.publicationStatus !== "public") {
      return false;
    }
    if (filter === "launchCities" && !externalEventIsUpcoming(row, now)) {
      return false;
    }
    if (filter === "upcoming" && !externalEventIsUpcoming(row, now)) {
      return false;
    }
    if (filter === "upcoming" && row.status !== "active") return false;
    if (filter === "upcoming" && row.publicationStatus !== "public") {
      return false;
    }
    if (filter === "public" && row.publicationStatus !== "public") {
      return false;
    }
    if (filter === "active" && row.status !== "active") return false;
    if (filter === "cancelled" && row.status !== "cancelled") return false;
    return true;
  });
}

export function buildExternalEventListPayload(
  filter: ExternalEventSupplyFilter,
  query: string
): AdminListExternalEventDetailsPayload {
  return {
    query: query.trim() || null,
    citySlugs:
      filter === "launchCities" || filter === "reviewOpen" ?
        Array.from(launchMarketSlugs) :
        null,
    publicationStatus: externalPublicationStatusForFilter(filter),
    status: eventStatusForFilter(filter),
    timeWindow: eventTimeWindowForFilter(filter),
    limit: 100,
  };
}

function eventStatusForFilter(
  filter: ExternalEventSupplyFilter
): AdminListExternalEventDetailsPayload["status"] {
  if (
    filter === "launchCities" ||
    filter === "upcoming"
  ) {
    return "active";
  }
  if (filter === "cancelled") return "cancelled";
  return null;
}

function externalPublicationStatusForFilter(
  filter: ExternalEventSupplyFilter
): AdminListExternalEventDetailsPayload["publicationStatus"] {
  if (
    filter === "launchCities" ||
    filter === "upcoming" ||
    filter === "public"
  ) {
    return "public";
  }
  return null;
}

function eventTimeWindowForFilter(
  filter: ExternalEventSupplyFilter
): AdminListExternalEventDetailsPayload["timeWindow"] {
  if (
    filter === "launchCities" ||
    filter === "upcoming"
  ) {
    return "upcoming";
  }
  return "all";
}

function externalEventIsUpcoming(
  row: Pick<AdminExternalEventListRow, "startTime">,
  nowMillis: number
): boolean {
  if (!row.startTime) return false;
  const startMillis = Date.parse(row.startTime);
  return Number.isFinite(startMillis) && startMillis >= nowMillis;
}

function snapshotTimeMillis(generatedAt?: string | null): number {
  if (generatedAt) {
    const parsed = Date.parse(generatedAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.NaN;
}

function messageFromError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as {message?: unknown}).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function externalEventOperationKey(prefix: string): string {
  const entropy = globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const boundedPrefix = prefix
    .replace(/[^A-Za-z0-9:_-]/g, "-")
    .slice(0, 80);
  return `${boundedPrefix}:${entropy}`;
}
