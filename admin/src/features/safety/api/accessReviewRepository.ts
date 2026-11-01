import {
  decideAccessApplication,
  getAccessApplicationDetails,
  loadOverview,
} from "../../../shared/api/adminApi";
import type {
  AdminDecideAccessApplicationPayload,
  AdminDecideAccessApplicationResponse,
  AdminGetAccessApplicationDetailsPayload,
  AdminGetAccessApplicationDetailsResponse,
  AdminOverviewResponse,
} from "../../../shared/types/adminTypes";

export interface AccessApplicationListSnapshot {
  generatedAt: string;
  pendingTotal: number;
  rows: AdminOverviewResponse["queues"]["accessApplications"];
}

export async function listAccessApplications(): Promise<AccessApplicationListSnapshot> {
  const overview = await loadOverview();
  const rows = overview.queues.accessApplications;
  const pendingTotal = overview.metrics.find(
    (metric) => metric.id === "pendingApplications"
  )?.value ?? rows.length;
  return {
    generatedAt: overview.generatedAt,
    pendingTotal,
    rows,
  };
}

export function decideAccessReview(
  payload: AdminDecideAccessApplicationPayload
): Promise<AdminDecideAccessApplicationResponse> {
  return decideAccessApplication(payload);
}

export function loadAccessApplicationDetails(
  payload: AdminGetAccessApplicationDetailsPayload
): Promise<AdminGetAccessApplicationDetailsResponse> {
  return getAccessApplicationDetails(payload);
}
