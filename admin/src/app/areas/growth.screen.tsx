import {lazy} from "react";
import type {AdminAreaRender} from "../adminAreaKit";
import {growthPath} from "./growth";

const GrowthRouteScreen = lazy(() => import("../../features/growth/ui/GrowthRouteScreen").then((m) => ({default: m.GrowthRouteScreen})));

const render: AdminAreaRender = ({navigate, route}) => (
  <GrowthRouteScreen
    onOpen={(view, nominatorUid) => navigate(growthPath(view, nominatorUid))}
    selectedNominatorUid={route.params.nominatorUid ?? null}
    view={route.growthView}
  />
);

export default render;
