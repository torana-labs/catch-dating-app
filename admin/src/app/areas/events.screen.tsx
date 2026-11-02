import {lazy} from "react";
import type {AdminAreaRender} from "../adminAreaKit";

const EventsRouteScreen = lazy(() => import("../../features/events/ui/EventsRouteScreen").then((m) => ({default: m.EventsRouteScreen})));

const render: AdminAreaRender = ({navigate, route}) => (
  <EventsRouteScreen
    eventId={route.params.eventId ?? null}
    externalEventId={route.params.externalEventId ?? null}
    onNavigate={navigate}
    tab={route.eventTab}
    workspace={route.eventWorkspace}
  />
);

export default render;
