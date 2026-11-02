import {lazy} from "react";
import {adminPathForNav} from "../adminRoutes";
import type {AdminAreaRender} from "../adminAreaKit";

const GrowthKpiScreen = lazy(() => import("../../features/growth/ui/GrowthKpiScreen").then((m) => ({default: m.GrowthKpiScreen})));

const render: AdminAreaRender = ({navigate, route, setError}) => (
  <GrowthKpiScreen
    onBackToList={() => navigate(adminPathForNav("growth"))}
    onError={setError}
    onSelectSignalId={(signalId) => navigate(`/growth/signals/${encodeURIComponent(signalId)}`)}
    selectedSignalId={route.params.growthSignalId ?? null}
  />
);

export default render;
