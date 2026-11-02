import type {CatchIconName, CatchTabBarItem} from "@catch/web-ui";
import type {ReactNode} from "react";
import type {Location, NavigateFunction, NonIndexRouteObject} from "react-router";
import type {DataMode} from "../shared/types/adminTypes";
import {adminRoleClaimKeys, type AdminRoleClaim} from "../shared/types/adminTypes";
import type {AdminJob} from "./adminJobs";
import type {resolveAdminRoute} from "./adminRoutes";

// What every file in areas/ is written against. To add an area, add areas/<id>.ts (its address,
// roles and navigation) and areas/<id>.screen.tsx (its screen); no list names them.

/**
 * Every area's id. Each area file adds its own, so the union has no central list:
 * `declare module "../adminAreaKit" {interface AdminNavIds {money: true}}`
 */
export interface AdminNavIds {
  now: true;
}
export type AdminNavId = keyof AdminNavIds;

/** What an area's routes tell its screen. Each area file adds its own fields, the same way. */
export interface AdminRouteFields {}

interface RouteState extends Partial<AdminRouteFields> {
  nav: AdminNavId | null;
  /** An old address: the shell replaces it with this path. */
  redirect?: string;
  title?: string;
}

export type AdminRoute = Omit<NonIndexRouteObject, "handle"> & {handle: RouteState};

export function route(path: string, nav: AdminNavId, state: Omit<RouteState, "nav"> = {}): AdminRoute {
  return {path, caseSensitive: true, handle: {nav, ...state}};
}

export const allButSales = adminRoleClaimKeys.filter((role) => role !== "salesStaff");
export const owner: readonly AdminRoleClaim[] = ["adminOwner"];
export const opsAndOwner: readonly AdminRoleClaim[] = ["admin", "adminOwner", "support"];
export {adminRoleClaimKeys};

export interface AdminNavigationEntry {
  section?: string;
  /** Kept on the phone bar; everything else is under More. */
  pinned?: boolean;
  /** This job's name for the area, where it differs from the area's own. */
  label?: string;
  /** Areas with no entry of their own in this job's navigation that highlight this one. */
  alsoActive?: readonly AdminNavId[];
}

export interface AdminArea {
  id: AdminNavId;
  /** Where the area's navigation item goes. */
  path: string;
  title: string;
  /** The navigation label, where it differs from the title. */
  label: string;
  icon: CatchIconName;
  /**
   * redrawn: the screen draws its own headers in the quiet register. legacy: a screen not yet
   * redrawn keeps the old workspace frame under a plain header; legacy-fill also fills the height.
   */
  frame: "redrawn" | "legacy" | "legacy-fill";
  /** Who may open the area, by role claim. The sign-in entry reads this without loading any screen. */
  roles: readonly AdminRoleClaim[];
  /**
   * The area's place in each job's navigation. Lower order comes first, in the order of the
   * redesign's NAV table (catch-design-source gen/admin_common.py); equal orders fall back to the
   * area id, so two PRs picking the same number still merge. A job with no entry doesn't list it.
   */
  navigation?: Partial<Record<AdminJob, AdminNavigationEntry & {order: number}>>;
  /** The values of this area's route fields where a route doesn't set them. */
  routeDefaults?: Partial<AdminRouteFields>;
  routes: AdminRoute[];
}

export function defineArea(area: Omit<AdminArea, "label"> & {label?: string}): AdminArea {
  return {...area, label: area.label ?? area.title};
}

/** What the shell hands every area's screen. */
export interface AdminAreaContext {
  route: ReturnType<typeof resolveAdminRoute>;
  location: Location;
  navigate: NavigateFunction;
  mode: DataMode;
  adminRoles: string[];
  userUid: string | null;
  isSessionReady: boolean;
  session: {sessionKey: string; isCurrent: () => boolean; projectId: string};
  canOpen: (nav: AdminNavId) => boolean;
  areaLabel: (nav: AdminNavId) => string;
  /** This person's navigation, for the phone's More page. */
  navigation: CatchTabBarItem[];
  canManageCommercialTerms: boolean;
  setError: (message: string | null) => void;
  setNotice: (message: string | null) => void;
  setMarketingDirty: (dirty: boolean) => void;
}

export type AdminAreaRender = (context: AdminAreaContext) => ReactNode;
