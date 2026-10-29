import {
  loadEventIntakeDashboard,
  loadHostAnalytics,
  loadMarketingOpsBridge,
  loadOverview,
} from "../../../shared/api/adminApi";
import type {
  AdminOverviewResponse,
  EventIntakeBridge,
  HostAnalyticsResponse,
  MarketingOpsBridge,
} from "../../../shared/types/adminTypes";

export function loadDataQualityOverview(): Promise<AdminOverviewResponse> {
  return loadOverview();
}

export function loadDataQualityHostAnalytics(): Promise<HostAnalyticsResponse> {
  return loadHostAnalytics({rangePreset: "30d", granularity: "day"});
}

export async function loadDataQualityMarketingBridge(): Promise<MarketingOpsBridge> {
  return (await loadMarketingOpsBridge()).bridge;
}

export async function loadDataQualityEventIntakeBridge(): Promise<EventIntakeBridge> {
  return (await loadEventIntakeDashboard()).bridge;
}
