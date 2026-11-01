import {
  CatchButton,
  CatchGap,
  CatchPageTabBar,
  CatchPaneLayout,
  CatchTable,
  CatchText,
  CatchWorkspaceHeader,
  type CatchTableColumn,
} from "@catch/web-ui";
import type {EventDirectoryRow} from "../api/eventDirectoryRepository";
import {
  eventBookedLabel,
  eventSourceLabel,
  eventStatusLabel,
  type ToneText,
} from "../controllers/eventRecordLabels";
import type {
  EventDirectoryController,
  EventDirectoryView,
} from "../controllers/useEventDirectoryController";
import {eventWhenLabel} from "../../../shared/domain/recordDates";

interface EventTableRow {
  key: string;
  event: {title: string; subtitle?: string};
  when: string;
  source: {label: string; tone: "brand" | "neutral"};
  status: {text: string; tone?: "success" | "warning" | "danger"};
  booked: string;
  city: string;
}

const columns: readonly CatchTableColumn<EventTableRow>[] = [
  {key: "event", label: "Event", kind: "title"},
  {key: "when", label: "When", width: "190px"},
  {key: "source", label: "Source", kind: "badge", width: "130px"},
  {key: "status", label: "Status", width: "150px"},
  {key: "booked", label: "Booked", width: "110px", align: "end"},
  {key: "city", label: "City", width: "100px"},
];

/** One organizer's own Events tab sits in the narrower reading pane: name, when and status. */
const organizerColumns: readonly CatchTableColumn<EventTableRow>[] = [
  {key: "event", label: "Event", kind: "title"},
  {key: "when", label: "When", width: "170px"},
  {key: "status", label: "Status", width: "130px"},
];

function cellTone(value: ToneText): EventTableRow["status"] {
  const tone = value.tone === "success" || value.tone === "warning" ||
    value.tone === "danger" ? value.tone : undefined;
  return tone ? {text: value.text, tone} : {text: value.text};
}

function tableRow(row: EventDirectoryRow, showOrganizer: boolean): EventTableRow {
  const source = eventSourceLabel(row);
  return {
    key: row.key,
    event: showOrganizer && row.organizerName ?
      {title: row.title, subtitle: row.organizerName} :
      {title: row.title},
    when: eventWhenLabel(row.startTime),
    source,
    status: cellTone(eventStatusLabel(row.status)),
    booked: eventBookedLabel(row),
    city: row.cityLabel ?? "—",
  };
}

/**
 * The events table both the Events directory and an organizer's Events tab show, with the
 * page's loading, error and "Show more" states. Rows open the event page.
 */
function EventTable({
  controller,
  onOpenEvent,
  forOrganizer = false,
}: {
  controller: EventDirectoryController;
  onOpenEvent: (row: EventDirectoryRow) => void;
  forOrganizer?: boolean;
}) {
  if (controller.loadState === "loading") {
    return <CatchText as="p" color="ink2" variant="bodyM">Loading events</CatchText>;
  }
  if (controller.loadState === "error") {
    return <CatchText as="p" color="danger" variant="bodyM">{controller.loadError ?? "Events could not load."}</CatchText>;
  }
  if (controller.rows.length === 0) {
    return <CatchText as="p" color="ink2" variant="bodyM">No events match.</CatchText>;
  }
  const byKey = new Map(controller.rows.map((row) => [row.key, row]));
  return (
    <CatchGap size="related">
      <CatchTable
        columns={forOrganizer ? organizerColumns : columns}
        density="compact"
        label="Events"
        onRowPressed={(row) => {
          const event = byKey.get(row.key);
          if (event) onOpenEvent(event);
        }}
        rowKey="key"
        rows={controller.rows.map((row) => tableRow(row, !forOrganizer))}
      />
      {controller.hasMore ? (
        <CatchButton
          label={controller.isLoadingMore ? "Loading more" : "Show more"}
          onPressed={controller.isLoadingMore ? null : controller.loadMore}
          size="sm"
          variant="secondary"
        />
      ) : null}
    </CatchGap>
  );
}

const viewLabels: Record<EventDirectoryView, string> = {
  upcoming: "Upcoming", past: "Past", cancelled: "Cancelled",
};

/**
 * Events: every event, made in Catch or imported from another platform, in one wide table with
 * real totals. The view picks upcoming, past or cancelled; chips narrow by source, check, city and week.
 */
export function EventDirectoryScreen({
  controller,
  onOpenEvent,
}: {
  controller: EventDirectoryController;
  onOpenEvent: (row: EventDirectoryRow) => void;
}) {
  const {facets, filters, views} = controller;
  const chips = facets ? [
    {label: "Catch", count: facets.catch, selected: filters.source === "catch",
      onPressed: () => controller.toggleSource("catch")},
    {label: "Imported", count: facets.imported, selected: filters.source === "imported",
      onPressed: () => controller.toggleSource("imported")},
    {label: "Needs a check", count: facets.needsCheck, selected: filters.needsCheck,
      onPressed: controller.toggleNeedsCheck},
    ...facets.cities.map((city) => ({label: city.label, selected: filters.citySlug === city.value,
      onPressed: () => controller.toggleCity(city.value)})),
    {label: "This week", count: facets.thisWeek, selected: filters.thisWeek,
      onPressed: controller.toggleThisWeek},
  ] : [];
  return (
    <>
      <CatchWorkspaceHeader
        count={controller.total ?? undefined}
        filters={{
          chips,
          search: {placeholder: "Search events", value: filters.query, onChanged: controller.setQuery},
        }}
        note={controller.complete ? undefined : "Counts cover the events read so far"}
        title="Events"
        views={{
          items: (Object.keys(viewLabels) as EventDirectoryView[]).map((value) => ({
            value, label: viewLabels[value], count: views?.[value],
          })),
          value: filters.view,
          label: "Show",
          onChanged: (value) => controller.setView(value as EventDirectoryView),
        }}
      />
      <CatchPaneLayout main={<EventTable controller={controller} onOpenEvent={onOpenEvent} />} pattern="wide-table" />
    </>
  );
}

/** One organizer's events, Catch and imported, for the Events tab of its page. */
export function OrganizerEventsWorkspace({
  controller,
  onOpenEvent,
}: {
  controller: EventDirectoryController;
  onOpenEvent: (row: EventDirectoryRow) => void;
}) {
  const options: Array<{value: EventDirectoryView; label: string}> = [
    {value: "upcoming", label: "Upcoming"},
    {value: "past", label: "Past"},
    {value: "cancelled", label: "Cancelled"},
  ];
  return (
    <CatchGap size="section">
      <CatchPageTabBar
        label="Which events"
        onChanged={(value) => controller.setView(value as EventDirectoryView)}
        options={options.map((option) => ({...option,
          count: controller.filters.view === option.value ? controller.total ?? undefined : undefined}))}
        selected={controller.filters.view}
        size="sm"
      />
      <EventTable controller={controller} forOrganizer onOpenEvent={onOpenEvent} />
    </CatchGap>
  );
}
