import {useQuery} from "@tanstack/react-query";
import {useCallback, useEffect, useMemo, useState} from "react";
import type {
  DataMode,
  HostAnalyticsQueryPayload,
  HostAnalyticsResponse,
} from "../../../shared/types/adminTypes";
import {adminQueryKeys} from "../../../shared/query/queryKeys";
import {loadMarketplaceHostAnalytics} from "../api/marketplaceRepository";

export type MarketplaceAnalyticsRangePreset = NonNullable<
  HostAnalyticsQueryPayload["rangePreset"]
>;
export type MarketplaceAnalyticsGranularity = NonNullable<
  HostAnalyticsQueryPayload["granularity"]
>;

const hostAnalyticsRoles = ["adminOwner"] as const;

export function useMarketplaceController({
  adminRoles,
  isSessionReady,
  mode,
  onError,
  onNotice,
}: {
  adminRoles: string[];
  isSessionReady: boolean;
  mode: DataMode;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}) {
  const [analyticsRangePreset, setAnalyticsRangePreset] =
    useState<MarketplaceAnalyticsRangePreset>("30d");
  const [analyticsGranularity, setAnalyticsGranularity] =
    useState<MarketplaceAnalyticsGranularity>("day");
  const [analyticsStartDate, setAnalyticsStartDate] =
    useState(defaultAnalyticsDate(29));
  const [analyticsEndDate, setAnalyticsEndDate] =
    useState(defaultAnalyticsDate(0));
  const [analyticsOrganizerId, setAnalyticsOrganizerId] = useState("");
  const [analyticsEventId, setAnalyticsEventId] = useState("");

  const analyticsPayload = useMemo(
    () => buildHostAnalyticsPayload({
      organizerId: analyticsOrganizerId,
      eventId: analyticsEventId,
      granularity: analyticsGranularity,
      rangePreset: analyticsRangePreset,
      startDate: analyticsStartDate,
      endDate: analyticsEndDate,
    }),
    [
      analyticsOrganizerId,
      analyticsEndDate,
      analyticsEventId,
      analyticsGranularity,
      analyticsRangePreset,
      analyticsStartDate,
    ]
  );
  const canLoadAnalytics = mode === "sample" ||
    hasAnyAdminRole(adminRoles, hostAnalyticsRoles);
  const analyticsPayloadKey = useMemo(
    () => hostAnalyticsPayloadKey(analyticsPayload),
    [analyticsPayload]
  );
  const analyticsAccess = canLoadAnalytics ? "allowed" : "role-restricted";

  const hostAnalyticsQuery = useQuery({
    enabled: isSessionReady && canLoadAnalytics,
    queryKey: adminQueryKeys.overview.analytics(
      analyticsPayloadKey,
      mode,
      analyticsAccess
    ),
    queryFn: () => loadMarketplaceHostAnalytics(analyticsPayload),
    placeholderData: (previousData) => previousData,
  });
  const hostAnalytics = hostAnalyticsQuery.data ?? null;
  const isAnalyticsLoading = isSessionReady && canLoadAnalytics &&
    (hostAnalyticsQuery.isPending || hostAnalyticsQuery.isFetching);
  const isLoading = isAnalyticsLoading;

  const refreshAnalytics = useCallback(async () => {
    if (!isSessionReady || !canLoadAnalytics) return false;
    const result = await hostAnalyticsQuery.refetch();
    if (result.error) {
      onError(messageFromError(result.error, "Unable to load host analytics."));
      return false;
    }
    onError(null);
    return true;
  }, [canLoadAnalytics, hostAnalyticsQuery, isSessionReady, onError]);

  const refresh = refreshAnalytics;

  useEffect(() => {
    if (!isSessionReady || !canLoadAnalytics) return;
    if (hostAnalyticsQuery.isError) {
      onError(messageFromError(hostAnalyticsQuery.error, "Unable to load host analytics."));
    } else if (hostAnalyticsQuery.isSuccess) {
      onError(null);
    }
  }, [
    canLoadAnalytics,
    hostAnalyticsQuery.error,
    hostAnalyticsQuery.isError,
    hostAnalyticsQuery.isSuccess,
    isSessionReady,
    onError,
  ]);

  const clearAnalyticsScope = useCallback(() => {
    setAnalyticsOrganizerId("");
    setAnalyticsEventId("");
  }, []);

  return {
    analyticsOrganizerId,
    analyticsEndDate,
    analyticsEventId,
    analyticsGranularity,
    analyticsRangePreset,
    analyticsStartDate,
    analyticsError: hostAnalyticsQuery.error ?
      messageFromError(hostAnalyticsQuery.error, "Unable to load host analytics.") :
      null,
    analyticsLoadedAt: hostAnalyticsQuery.dataUpdatedAt ?
      new Date(hostAnalyticsQuery.dataUpdatedAt).toISOString() :
      null,
    canLoadAnalytics,
    hostAnalytics,
    isAnalyticsLoading,
    isLoading,
    clearAnalyticsScope,
    refresh,
    refreshAnalytics,
    setAnalyticsOrganizerId,
    setAnalyticsEndDate,
    setAnalyticsEventId,
    setAnalyticsGranularity,
    setAnalyticsRangePreset,
    setAnalyticsStartDate,
  };
}

function buildHostAnalyticsPayload({
  organizerId,
  endDate,
  eventId,
  granularity,
  rangePreset,
  startDate,
}: {
  organizerId: string;
  endDate: string;
  eventId: string;
  granularity: MarketplaceAnalyticsGranularity;
  rangePreset: MarketplaceAnalyticsRangePreset;
  startDate: string;
}): HostAnalyticsQueryPayload {
  const isCustom = rangePreset === "custom";
  return {
    organizerId: organizerId.trim() || null,
    eventId: eventId.trim() || null,
    rangePreset,
    startDate: isCustom ? startDate : null,
    endDate: isCustom ? endDate : null,
    granularity,
  };
}

function hasAnyAdminRole(
  roles: string[],
  allowedRoles: readonly string[]
): boolean {
  return allowedRoles.some((role) => roles.includes(role));
}

function hostAnalyticsPayloadKey(payload: HostAnalyticsQueryPayload): string {
  return JSON.stringify({
    organizerId: payload.organizerId ?? "",
    eventId: payload.eventId ?? "",
    rangePreset: payload.rangePreset ?? "30d",
    startDate: payload.startDate ?? null,
    endDate: payload.endDate ?? null,
    granularity: payload.granularity ?? "day",
  });
}

function defaultAnalyticsDate(daysAgo: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function messageFromError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as {message?: unknown}).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
