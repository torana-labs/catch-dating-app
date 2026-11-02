import {matchPath, matchRoutes} from "react-router";
import type {AdminArea, AdminNavId, AdminRoute, AdminRouteFields} from "./adminAreaKit";

export type {AdminNavId} from "./adminAreaKit";

// The route table: every file in areas/, combined. The sign-in entry loads this, so area data
// files hold no screens; each screen is in the area's .screen.tsx.
const areaModules = import.meta.glob<{default: AdminArea}>(["./areas/*.ts", "!./areas/*.test.ts"], {eager: true});

export const adminAreaList: readonly AdminArea[] = Object.values(areaModules)
  .map((module) => module.default)
  .sort((a, b) => (a.id < b.id ? -1 : 1));

export const adminSections = Object.fromEntries(adminAreaList.map(({id, path, title}) => [id, {path, title}])) as
  Record<AdminNavId, {path: string; title: string}>;

// React Router ranks static workspace names ahead of dynamic record IDs.
// Workspace fallbacks retain existing links without selecting an unrelated record.
export const adminRoutes: AdminRoute[] = [
  ...adminAreaList.flatMap((area) => area.routes),
  {path: "*", handle: {nav: null}},
];

const routeDefaults = Object.assign({}, ...adminAreaList.map((area) => area.routeDefaults)) as AdminRouteFields;

export function resolveAdminRoute(pathname: string) {
  const match = matchRoutes(adminRoutes, {pathname})?.at(-1);
  const {nav = null, redirect, title, ...fields} = match?.route.handle ?? {};
  // matchRoutes decodes a path before matching, including an additional %2F
  // replacement. Read parameters from the original path to preserve literal
  // percent-encoded text in opaque IDs (e.g. an ID containing "%2F").
  const rawParams = match?.route.path ? matchPath({
    path: match.route.path, caseSensitive: true,
  }, pathname)?.params ?? {} : {};
  const params = Object.fromEntries(Object.entries(rawParams).map(([key, value]) => {
    try { return [key, value === undefined ? undefined : decodeURIComponent(value)]; }
    catch { return [key, value]; }
  }));
  return {...routeDefaults, ...fields, nav, redirect: redirect ?? null, title, params};
}

export function adminPathForNav(nav: AdminNavId): string {
  return adminSections[nav].path;
}
