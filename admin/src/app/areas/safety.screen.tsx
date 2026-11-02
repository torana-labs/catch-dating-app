import {lazy} from "react";
import type {AdminAreaRender} from "../adminAreaKit";

const SafetyRouteScreen = lazy(() => import("../../features/safety/ui/SafetyRouteScreen").then((m) => ({default: m.SafetyRouteScreen})));

const render: AdminAreaRender = ({adminRoles, mode, navigate, route, setError, setNotice}) => (
  <SafetyRouteScreen
    adminRoles={mode === "sample" ? ["adminOwner"] : adminRoles}
    onError={setError}
    onNavigate={navigate}
    onNotice={setNotice}
    selectedActionId={route.params.safetyActionId ?? null}
    selectedTargetPath={route.params.targetPath ?? null}
    view={route.safetyView}
  />
);

export default render;
