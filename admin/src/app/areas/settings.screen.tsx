import {lazy} from "react";
import type {AdminAreaRender} from "../adminAreaKit";

const SettingsRouteScreen = lazy(() => import("../../features/settings/ui/SettingsRouteScreen").then((m) => ({default: m.SettingsRouteScreen})));
const IntakeSettingsRouteScreen = lazy(() => import("../../features/intake/organizer/ui/IntakeSettingsRouteScreen").then((m) => ({default: m.IntakeSettingsRouteScreen})));
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
      ...(canOpen("safety") ? [{
        id: "safety", title: "Safety", subtitle: "Account actions, deadlines, grievance contact",
        render: () => <SafetySettingsRouteScreen adminRoles={adminRoles} onError={setError} onNotice={setNotice} />,
      }] : []),
    ]}
    selectedPage={route.params.teamMemberUid ? "team" : route.params.settingsPage ?? null}
    teamMemberUid={route.params.teamMemberUid ?? null}
  />
  );
};

export default render;
