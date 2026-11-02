import {lazy} from "react";
import {adminPathForNav} from "../adminRoutes";
import type {AdminAreaContext, AdminAreaRender} from "../adminAreaKit";
import {moneyPath} from "./money";

const NowRouteScreen = lazy(() => import("../../features/now/ui/NowRouteScreen").then((m) => ({default: m.NowRouteScreen})));

/** Opens a Needs you item in the area that owns it, at the record when the area has a record route. */
function openQueueItem(
  context: AdminAreaContext,
  destination: "safety" | "organizers" | "money",
  targetPath: string | null
) {
  const {navigate, setError, setNotice} = context;
  if (!context.canOpen(destination)) {
    setNotice(null);
    setError(`Your admin role cannot open ${context.areaLabel(destination)}.`);
    return;
  }
  setError(null);
  setNotice(null);
  const targetId = targetPath?.split("/").filter(Boolean).at(-1) ?? null;
  if (targetPath && destination === "safety") {
    navigate(`/safety/${encodeURIComponent(targetPath)}`);
  } else if (targetId && destination === "organizers") {
    navigate(targetPath?.startsWith("organizerClaimRequests/") ?
      `/organizers/claims/${encodeURIComponent(targetId)}` :
      `/organizers/${encodeURIComponent(targetId)}`);
  } else if (targetPath && destination === "money") {
    // Needs you names a payment by its document path; Money names an issue "collection:id".
    navigate(moneyPath("issues", targetPath.replace("/", ":")));
  } else {
    navigate(adminPathForNav(destination));
  }
}

const render: AdminAreaRender = (context) => (
  <NowRouteScreen
    canOpen={context.canOpen}
    isSessionReady={context.isSessionReady}
    mode={context.mode}
    onOpen={(destination, targetPath) => openQueueItem(context, destination, targetPath ?? null)}
  />
);

export default render;
