import {lazy} from "react";
import type {AdminAreaRender} from "../adminAreaKit";
import {moneyPath} from "./money";
import {commercialTermsPathForOrganizer} from "./payment-setup";

const MoneyRouteScreen = lazy(() => import("../../features/money/ui/MoneyRouteScreen").then((m) => ({default: m.MoneyRouteScreen})));

const render: AdminAreaRender = ({navigate, route, setNotice}) => (
  <MoneyRouteScreen
    onNotice={setNotice}
    onOpen={(view, id) => navigate(moneyPath(view, id))}
    onOpenSettings={() => navigate(commercialTermsPathForOrganizer(null))}
    selectedId={route.params.billId ?? route.params.moneyIssueId ?? null}
    view={route.moneyView}
  />
);

export default render;
