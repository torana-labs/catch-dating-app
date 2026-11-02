import type {AdminRoleClaim} from "../shared/types/adminTypes";
import type {AdminNavId, AdminNavigationEntry as AreaNavigationEntry} from "./adminAreaKit";
import type {AdminJob} from "./adminJobs";
import {adminAreaList} from "./adminRoutes";

/** Who may open each Admin area, and each job's navigation: read from the files in areas/. */
export const adminAreaRoles = Object.fromEntries(adminAreaList.map(({id, roles}) => [id, roles])) as
  Record<AdminNavId, readonly AdminRoleClaim[]>;

export interface AdminNavigationEntry extends AreaNavigationEntry {
  nav: AdminNavId;
}

function navigationFor(job: AdminJob): AdminNavigationEntry[] {
  return adminAreaList.flatMap((area) => {
    const entry = area.navigation?.[job];
    return entry ? [{...entry, nav: area.id}] : [];
  }).sort((a, b) => a.order - b.order).map(({order: _order, ...entry}) => entry);
}

export const adminNavigation: Record<AdminJob, AdminNavigationEntry[]> = {
  owner: navigationFor("owner"),
  sales: navigationFor("sales"),
  ops: navigationFor("ops"),
};
