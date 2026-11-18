import {lazy} from "react";
import {adminPathForNav} from "../adminRoutes";
import type {AdminAreaRender} from "../adminAreaKit";
import {TakedownRequestWorkspace} from "../../features/takedowns/ui/TakedownRequestWorkspace";

const InboxRouteScreen = lazy(() => import("../../features/inbox/ui/InboxRouteScreen").then((m) => ({default: m.InboxRouteScreen})));

const render: AdminAreaRender = ({canOpen, navigate, route, setError, setNotice, userUid, mode}) => (
  <InboxRouteScreen
    canFillIn={canOpen("sales")}
    onError={setError}
    onNotice={setNotice}
    onSelect={(itemId) => navigate(itemId ? `${adminPathForNav("organizer-intake")}/${encodeURIComponent(itemId)}` :
      adminPathForNav("organizer-intake"))}
    selectedItemId={route.params.inboxItemId ?? null}
    takedownPanel={({requestId, onChanged}) => (
      <TakedownRequestWorkspace onChanged={onChanged} onError={setError} onNotice={setNotice} requestId={requestId} />
    )}
    uid={userUid ?? (mode === "sample" ? "sample-owner" : null)}
  />
);

export default render;
