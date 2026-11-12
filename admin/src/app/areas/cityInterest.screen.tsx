import {lazy} from "react";
import type {AdminAreaRender} from "../adminAreaKit";

const CityInterestRouteScreen = lazy(() => import("../../features/cityInterest/ui/CityInterestRouteScreen").then((m) => ({default: m.CityInterestRouteScreen})));

const render: AdminAreaRender = () => <CityInterestRouteScreen />;

export default render;
