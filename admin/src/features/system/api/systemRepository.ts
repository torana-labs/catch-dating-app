import {
  listActionExecutions,
  loadEventIntakeDashboard,
  loadHostAnalytics,
  loadMarketingOpsBridge,
  loadOverview,
} from "../../../shared/api/adminApi";
import type {
  AdminListActionExecutionsPayload,
  AdminListActionExecutionsResponse,
  AdminOverviewResponse,
  EventIntakeBridge,
  HostAnalyticsResponse,
  MarketingOpsBridge,
} from "../../../shared/types/adminTypes";

/** The most recent Admin actions, by people and by agents, newest first. */
export function loadSystemActivity(
  payload: AdminListActionExecutionsPayload
): Promise<AdminListActionExecutionsResponse> {
  return listActionExecutions(payload);
}

/** The overview snapshot: when sources were read and each data source's state. */
export function loadSystemHealth(): Promise<AdminOverviewResponse> {
  return loadOverview();
}

export function loadSystemHostAnalytics(): Promise<HostAnalyticsResponse> {
  return loadHostAnalytics({rangePreset: "30d", granularity: "day"});
}

export async function loadSystemMarketingBridge(): Promise<MarketingOpsBridge> {
  return (await loadMarketingOpsBridge()).bridge;
}

export async function loadSystemEventIntake(): Promise<EventIntakeBridge> {
  return (await loadEventIntakeDashboard()).bridge;
}
