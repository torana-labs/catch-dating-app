import {lazy} from "react";
import type {AdminAreaRender} from "../adminAreaKit";

const AdminActionExecutionsScreen = lazy(() => import("../../features/operations/ui/AdminActionExecutionsScreen").then((m) => ({default: m.AdminActionExecutionsScreen})));

const render: AdminAreaRender = ({setError}) => <AdminActionExecutionsScreen onError={setError} />;

export default render;
