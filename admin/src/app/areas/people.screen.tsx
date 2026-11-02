import {lazy} from "react";
import type {AdminAreaRender} from "../adminAreaKit";

const PeopleRouteScreen = lazy(() => import("../../features/people/ui/PeopleRouteScreen").then((m) => ({default: m.PeopleRouteScreen})));

const render: AdminAreaRender = ({navigate}) => <PeopleRouteScreen onOpenSafety={() => navigate("/safety/actions")} />;

export default render;
