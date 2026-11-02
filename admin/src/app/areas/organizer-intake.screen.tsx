import {lazy} from "react";
import {adminPathForNav} from "../adminRoutes";
import type {AdminAreaRender} from "../adminAreaKit";

const InboxRouteScreen = lazy(() => import("../../features/inbox/ui/InboxRouteScreen").then((m) => ({default: m.InboxRouteScreen})));

const render: AdminAreaRender = ({navigate, route, setError, setNotice, userUid, mode}) => (
  <InboxRouteScreen
    onError={setError}
    onNotice={setNotice}
    onOpenReview={() => navigate(adminPathForNav("intake-review"))}
    onSelect={(itemId) => navigate(itemId ? `${adminPathForNav("organizer-intake")}/${encodeURIComponent(itemId)}` :
      adminPathForNav("organizer-intake"))}
    selectedItemId={route.params.inboxItemId ?? null}
    uid={userUid ?? (mode === "sample" ? "sample-owner" : null)}
  />
);

export default render;
