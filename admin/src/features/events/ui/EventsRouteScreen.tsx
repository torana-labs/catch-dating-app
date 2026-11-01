import type {EventDirectoryRow} from "../api/eventDirectoryRepository";
import {
  useEventDirectoryController,
  type EventDirectoryFilters,
} from "../controllers/useEventDirectoryController";
import {useEventPageController, type EventPageSource} from "../controllers/useEventPageController";
import {EventDirectoryScreen, OrganizerEventsWorkspace} from "./EventDirectoryScreen";
import {EventPageScreen, type EventPageTab} from "./EventPageScreen";
import {EventPublishingScreen} from "./EventPublishingScreen";

function eventPath(source: EventPageSource, eventId: string): string {
  return source === "catch" ? `/events/${encodeURIComponent(eventId)}` :
    `/events/external/${encodeURIComponent(eventId)}`;
}

function DirectoryRoute({initial, onNavigate}: {
  initial?: Partial<EventDirectoryFilters>;
  onNavigate: (path: string) => void;
}) {
  const controller = useEventDirectoryController({initial});
  return (
    <EventDirectoryScreen
      controller={controller}
      onOpenEvent={(row: EventDirectoryRow) => onNavigate(eventPath(row.source, row.eventId))}
    />
  );
}

function PageRoute({eventId, onNavigate, source, tab}: {
  eventId: string;
  onNavigate: (path: string) => void;
  source: EventPageSource;
  tab: EventPageTab;
}) {
  const controller = useEventPageController(source, eventId);
  const base = eventPath(source, eventId);
  return (
    <EventPageScreen
      loadError={controller.loadError}
      onBack={() => onNavigate("/events")}
      onOpenOrganizer={(organizerId) => onNavigate(`/organizers/${encodeURIComponent(organizerId)}`)}
      onTabChanged={(next) => onNavigate(next === "overview" ? base : `${base}/${next}`)}
      pageEditor={source === "catch" && tab === "page" ?
        <EventPublishingScreen onBackToList={() => onNavigate("/events")} selectedEventId={eventId} /> :
        source === "imported" && tab === "takedown" ?
          <EventPublishingScreen onBackToList={() => onNavigate("/events")} selectedExternalEventId={eventId} /> :
          null}
      record={controller.record}
      tab={tab}
    />
  );
}

/**
 * The Events area: the directory, or one event's page. Catch events live at /events/:id and
 * imported ones at /events/external/:id; the old External inventory address opens the
 * directory showing imported events.
 */
export function EventsRouteScreen({
  eventId,
  externalEventId,
  onNavigate,
  tab,
  workspace,
}: {
  eventId: string | null;
  externalEventId: string | null;
  onNavigate: (path: string) => void;
  tab: EventPageTab;
  workspace: "directory" | "external";
}) {
  const id = workspace === "external" ? externalEventId : eventId;
  if (id) {
    const source = workspace === "external" ? "imported" : "catch";
    return <PageRoute eventId={id} key={`${source}:${id}`} onNavigate={onNavigate} source={source} tab={tab} />;
  }
  return (
    <DirectoryRoute
      initial={workspace === "external" ? {source: "imported"} : undefined}
      key={workspace}
      onNavigate={onNavigate}
    />
  );
}

/** One organizer's events for the Events tab of its page, read live. */
export function OrganizerEventsRouteWorkspace({onNavigate, organizerId}: {
  onNavigate: (path: string) => void;
  organizerId: string;
}) {
  const controller = useEventDirectoryController({organizerId});
  return (
    <OrganizerEventsWorkspace
      controller={controller}
      onOpenEvent={(row) => onNavigate(eventPath(row.source, row.eventId))}
    />
  );
}
