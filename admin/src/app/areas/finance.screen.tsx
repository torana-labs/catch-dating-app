import {lazy} from "react";
import type {AdminAreaRender} from "../adminAreaKit";
import {moneyPath} from "./money";

const FinanceRouteScreen = lazy(() => import("../../features/finance/ui/FinanceRouteScreen").then((m) => ({default: m.FinanceRouteScreen})));

const render: AdminAreaRender = ({navigate, setNotice}) => (
  <FinanceRouteScreen onNotice={setNotice} onOpenBills={() => navigate(moneyPath("bills"))} />
);

export default render;
