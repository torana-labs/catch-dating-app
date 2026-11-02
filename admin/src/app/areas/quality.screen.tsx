import {lazy} from "react";
import {adminPathForNav} from "../adminRoutes";
import type {AdminAreaRender} from "../adminAreaKit";

const DataQualityScreen = lazy(() => import("../../features/data-quality/ui/DataQualityScreen").then((m) => ({default: m.DataQualityScreen})));

const render: AdminAreaRender = ({navigate, route, setError}) => (
  <DataQualityScreen
    onBackToList={() => navigate(adminPathForNav("quality"))}
    onError={setError}
    onOpenOwningWorkflow={(path) => navigate(path)}
    onSelectSignalId={(signalId) => navigate(`/quality/signals/${encodeURIComponent(signalId)}`)}
    selectedSignalId={route.params.qualitySignalId ?? null}
  />
);

export default render;
