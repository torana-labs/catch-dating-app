import {lazy} from "react";
import type {AdminAreaRender} from "../adminAreaKit";

const UserAnalyticsScreen = lazy(() => import("../../features/users/ui/UserAnalyticsScreen").then((m) => ({default: m.UserAnalyticsScreen})));

const render: AdminAreaRender = ({setError, setNotice}) => (
  <UserAnalyticsScreen handoffRequestId={null} handoffUserId={null} onError={setError} onNotice={setNotice} />
);

export default render;
