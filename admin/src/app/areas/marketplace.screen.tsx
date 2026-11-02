import {lazy} from "react";
import type {AdminAreaRender} from "../adminAreaKit";

const MarketplaceRouteScreen = lazy(() => import("../../features/marketplace/ui/MarketplaceRouteScreen").then((m) => ({default: m.MarketplaceRouteScreen})));

const render: AdminAreaRender = ({adminRoles, isSessionReady, mode, setError, setNotice}) => (
  <MarketplaceRouteScreen adminRoles={adminRoles} isSessionReady={isSessionReady} mode={mode} onError={setError} onNotice={setNotice} />
);

export default render;
