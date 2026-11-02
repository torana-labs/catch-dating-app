import {lazy} from "react";
import {adminPathForNav} from "../adminRoutes";
import type {AdminAreaContext} from "../adminAreaKit";

const SalesRouteScreen = lazy(() => import("../../features/sales/ui/SalesRouteScreen").then((m) => ({default: m.SalesRouteScreen})));
const SalesWorkspaceScreen = lazy(() => import("../../features/sales/ui/SalesWorkspaceScreen").then((m) => ({default: m.SalesWorkspaceScreen})));

const salesAreaPaths = {today: "sales", hosts: "sales-hosts", deals: "sales-deals", nominations: "nominations"} as const;

/** One Sales area. A sales associate sees their own work; anyone else sees the team's. */
export function renderSales(context: AdminAreaContext, area: keyof typeof salesAreaPaths) {
  const {adminRoles, mode, navigate, route, setError, setNotice, userUid} = context;
  const base = adminPathForNav(salesAreaPaths[area]);
  const selectedId = (area === "today" ? route.params.salesTaskId : area === "hosts" ? route.params.salesOrganizerId :
    area === "nominations" ? route.params.nominationItemId : undefined) ?? null;
  return (
    <SalesRouteScreen
      area={area}
      onError={setError}
      onAddHost={() => navigate("/sales/add-host")}
      onNotice={setNotice}
      onOpenHost={(organizerId) => navigate(`${adminPathForNav("sales-hosts")}/${encodeURIComponent(organizerId)}`)}
      onOpenHostTools={(organizerId) => navigate(`${adminPathForNav("sales-hosts")}/${encodeURIComponent(organizerId)}/tools`)}
      onOpenOrganizer={(organizerId) => navigate(`${adminPathForNav("organizers")}/${encodeURIComponent(organizerId)}`)}
      onSelect={(id) => navigate(id ? `${base}/${encodeURIComponent(id)}` : base)}
      ownWorkOnly={adminRoles.includes("salesStaff") && !adminRoles.some((role) => role === "admin" || role === "adminOwner")}
      selectedId={selectedId}
      uid={userUid ?? (mode === "sample" ? "sample-owner" : null)}
    />
  );
}

/**
 * The older Sales pages: settings (custom fields, imports, history), one host's full tools, adding
 * and nominating, and pipeline, pilots and research, for what the new screens can't do yet. Each
 * goes when its replacement lands.
 */
export function renderOlderSales({adminRoles, mode, navigate, route, userUid}: AdminAreaContext) {
  return (
    <SalesWorkspaceScreen
      area={route.salesArea}
      assignedStaffOnly={adminRoles.includes("salesStaff") && !adminRoles.some((role) => role === "admin" || role === "adminOwner")}
      currentUserUid={userUid ?? (mode === "sample" ? "sample-owner" : "")}
      isAdminOwner={adminRoles.includes("adminOwner")}
      onAreaChange={(area) => navigate(`/sales/${area}`)}
      onBackToHosts={() => navigate("/sales/hosts")}
      onOpenHost={(organizerId) => navigate(`/sales/hosts/${encodeURIComponent(organizerId)}`)}
      onOpenIntake={() => navigate("/intake/organizers")}
      onOpenOrganizer={(organizerId) => navigate(`/organizers/${encodeURIComponent(organizerId)}`)}
      selectedOrganizerId={route.params.salesOrganizerId ?? null}
    />
  );
}
