import {lazy} from "react";
import type {AdminAreaRender} from "../adminAreaKit";

const SupportRouteScreen = lazy(() => import("../../features/support/ui/SupportRouteScreen").then((m) => ({default: m.SupportRouteScreen})));
const CatchWhatsappTrialWorkspace = lazy(() => import("../../features/catch-support/ui/CatchWhatsappTrialWorkspace").then((m) => ({default: m.CatchWhatsappTrialWorkspace})));

const render: AdminAreaRender = ({mode, navigate, route, session, setError, setNotice, userUid}) => route.supportWorkspace === "trial" ? (
  <CatchWhatsappTrialWorkspace
    scope={{actorUid: userUid ?? "", projectId: session.projectId, sessionKey: session.sessionKey, isCurrent: session.isCurrent}}
  />
) : (
  <SupportRouteScreen
    conversationId={route.params.supportConversationId ?? null}
    onError={setError}
    onNavigate={navigate}
    onNotice={setNotice}
    userUid={userUid ?? (mode === "sample" ? "sample-owner" : null)}
  />
);

export default render;
