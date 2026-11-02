import {lazy} from "react";
import type {AdminAreaRender} from "../adminAreaKit";

const SystemRouteScreen = lazy(() => import("../../features/system/ui/SystemRouteScreen").then((m) => ({default: m.SystemRouteScreen})));

const render: AdminAreaRender = ({isSessionReady, mode}) => <SystemRouteScreen isSessionReady={isSessionReady} mode={mode} />;

export default render;
