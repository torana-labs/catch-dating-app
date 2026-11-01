import {loadOverview} from "../../../shared/api/adminApi";
import type {AdminOverviewResponse} from "../../../shared/types/adminTypes";

/** Today's overview snapshot: every queue waiting on a person, and source freshness. */
export function loadNowSnapshot(): Promise<AdminOverviewResponse> {
  return loadOverview();
}
