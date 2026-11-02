import {lazy} from "react";
import {resolveAdminRoute} from "../adminRoutes";
import type {AdminAreaRender} from "../adminAreaKit";

const SystemRouteScreen = lazy(() => import("../../features/system/ui/SystemRouteScreen").then((m) => ({default: m.SystemRouteScreen})));

const render: AdminAreaRender = ({adminRoles, canOpen, isSessionReady, mode, navigate}) => (
  <SystemRouteScreen
    canOpenPath={(path) => {
      const {nav} = resolveAdminRoute(path);
      return nav !== null && canOpen(nav);
    }}
    canReadHostAnalytics={mode === "sample" || adminRoles.includes("adminOwner")}
    isSessionReady={isSessionReady}
    mode={mode}
    onOpenPath={(path) => navigate(path)}
  />
);

export default render;
