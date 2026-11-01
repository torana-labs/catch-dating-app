import {loadHostAnalytics} from "../../../shared/api/adminApi";
import type {
  HostAnalyticsQueryPayload,
  HostAnalyticsResponse,
} from "../../../shared/types/adminTypes";

export function loadMarketplaceHostAnalytics(
  payload: HostAnalyticsQueryPayload
): Promise<HostAnalyticsResponse> {
  return loadHostAnalytics(payload);
}
