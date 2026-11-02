import {lazy} from "react";
import type {AdminAreaRender} from "../adminAreaKit";
import {moneyPath} from "./money";

const OrganizerBillsRouteWorkspace = lazy(() => import("../../features/money/ui/OrganizerBillsWorkspace").then((m) => ({default: m.OrganizerBillsRouteWorkspace})));
const OrganizersRouteScreen = lazy(() => import("../../features/organizers/ui/OrganizersRouteScreen").then((m) => ({default: m.OrganizersRouteScreen})));
const OrganizerEventsRouteWorkspace = lazy(() => import("../../features/events/ui/EventsRouteScreen").then((m) => ({default: m.OrganizerEventsRouteWorkspace})));

const render: AdminAreaRender = ({canManageCommercialTerms, canOpen, navigate, route}) => (
  <OrganizersRouteScreen
    canChangeTerms={canManageCommercialTerms}
    claimRequestId={route.params.claimRequestId ?? null}
    onNavigate={navigate}
    organizerId={route.params.organizerId ?? null}
    renderBills={canOpen("money") ? (organizerId) => (
      <OrganizerBillsRouteWorkspace
        onOpenBill={(billId) => navigate(moneyPath("bills", billId))}
        organizerId={organizerId}
      />
    ) : null}
    renderEvents={(organizerId) => <OrganizerEventsRouteWorkspace onNavigate={navigate} organizerId={organizerId} />}
    tab={route.organizerTab}
    workspace={route.organizerWorkspace}
  />
);

export default render;
