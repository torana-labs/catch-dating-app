import {lazy} from "react";
import {adminPathForNav} from "../adminRoutes";
import type {AdminAreaRender} from "../adminAreaKit";
import {paymentSettingsPath} from "./settings";

const SettingsRouteScreen = lazy(() => import("../../features/settings/ui/SettingsRouteScreen").then((m) => ({default: m.SettingsRouteScreen})));
const IntakeSettingsRouteScreen = lazy(() => import("../../features/intake/organizer/ui/IntakeSettingsRouteScreen").then((m) => ({default: m.IntakeSettingsRouteScreen})));
const SalesSettingsRouteScreen = lazy(() => import("../../features/sales/ui/SalesSettingsRouteScreen").then((m) => ({default: m.SalesSettingsRouteScreen})));
const PaymentSettingsRouteScreen = lazy(() => import("../../features/settings/ui/PaymentSettingsRouteScreen").then((m) => ({default: m.PaymentSettingsRouteScreen})));
const SafetySettingsRouteScreen = lazy(() => import("../../features/safety/ui/SafetySettingsRouteScreen").then((m) => ({default: m.SafetySettingsRouteScreen})));

const render: AdminAreaRender = ({adminRoles: claims, canOpen, mode, navigate, route, setError, setNotice, userUid}) => {
  // Sample data signs in as the sample owner, who holds no claims.
  const adminRoles = mode === "sample" ? ["adminOwner"] : claims;
  return (
  <SettingsRouteScreen
    canManageTeam={adminRoles.includes("adminOwner")}
    currentUserUid={userUid ?? (mode === "sample" ? "sample-owner" : null)}
    onError={setError}
    onNavigate={navigate}
    onNotice={setNotice}
    otherPages={[
      ...(canOpen("organizer-intake") ? [{
        id: "intake", title: "Intake", subtitle: "Nominations, what runs on its own, launch cities",
        render: () => <IntakeSettingsRouteScreen onError={setError} onNotice={setNotice} />,
      }] : []),
      ...(adminRoles.some((role) => role === "admin" || role === "adminOwner") ? [{
        id: "sales", title: "Sales", subtitle: "Private host fields, imports",
        render: () => (
          <SalesSettingsRouteScreen
            canCorrect={adminRoles.includes("adminOwner")}
            currentUserUid={userUid ?? (mode === "sample" ? "sample-owner" : null)}
            onError={setError}
            onNotice={setNotice}
            onOpenPrivacy={(organizerId) => navigate(`${adminPathForNav("sales-hosts")}/${encodeURIComponent(organizerId)}/privacy`)}
          />
        ),
      }] : []),
      ...(adminRoles.includes("adminOwner") ? [{
        id: "payments", title: "Payments", subtitle: "Terms, partner credit, GST",
        render: () => (
          <PaymentSettingsRouteScreen
            actorUid={userUid ?? (mode === "sample" ? "sample-owner" : "")}
            canManage
            edit={route.paymentsEdit}
            onBackToSettings={() => navigate(adminPathForNav("settings"))}
            onError={setError}
            onNotice={setNotice}
            onOpen={(edit, organizerId) => navigate(paymentSettingsPath(edit ?? null, organizerId ?? null))}
            termsOrganizerId={route.params.termsOrganizerId ?? null}
          />
        ),
      }] : []),
      ...(canOpen("safety") ? [{
        id: "safety", title: "Safety", subtitle: "Account actions, deadlines, grievance contact",
        render: () => <SafetySettingsRouteScreen adminRoles={adminRoles} onError={setError} onNotice={setNotice} />,
      }] : []),
    ]}
    selectedPage={route.params.teamMemberUid ? "team" : route.settingsPage ?? route.params.settingsPage ?? null}
    teamMemberUid={route.params.teamMemberUid ?? null}
  />
  );
};

export default render;
