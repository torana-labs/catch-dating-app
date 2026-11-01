import {loadUserAnalytics} from "../../../shared/api/adminApi";
import {dataMode} from "../../../shared/api/dataMode";
import type {
  UserAnalyticsQueryPayload,
  UserAnalyticsResponse,
} from "../../../shared/types/adminTypes";

export function loadUserAnalyticsReport(
  payload: UserAnalyticsQueryPayload
): Promise<UserAnalyticsResponse> {
  return loadUserAnalytics(payload);
}

export function isUserAnalyticsSampleMode(): boolean {
  return dataMode() === "sample";
}
