import {listActionExecutions, loadOverview} from "../../../shared/api/adminApi";
import type {
  AdminListActionExecutionsResponse,
  AdminOverviewResponse,
} from "../../../shared/types/adminTypes";

/** The most recent Admin actions, by people and by agents, newest first. */
export function loadSystemActivity(limit: number): Promise<AdminListActionExecutionsResponse> {
  return listActionExecutions({limit});
}

/** The overview snapshot: when sources were read and each data source's state. */
export function loadSystemHealth(): Promise<AdminOverviewResponse> {
  return loadOverview();
}
