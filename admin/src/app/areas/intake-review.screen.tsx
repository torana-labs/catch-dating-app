import {lazy} from "react";
import type {AdminAreaRender} from "../adminAreaKit";

const IntakeWorkspaceScreen = lazy(() => import("../../features/intake/ui/IntakeWorkspaceScreen").then((m) => ({default: m.IntakeWorkspaceScreen})));

const render: AdminAreaRender = () => <IntakeWorkspaceScreen />;

export default render;
