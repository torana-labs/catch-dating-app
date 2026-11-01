import type {ReactNode} from "react";
import {
  CatchButton,
  CatchGap,
  CatchGrid,
  CatchIndexRow,
  CatchPageTabBar,
  CatchPaneLayout,
  CatchText,
  CatchTopBar,
} from "@catch/web-ui";
import {eventWhenLabel} from "../../../shared/domain/recordDates";
import {
  eventBookedLabel,
  eventOriginLabel,
  eventPriceLabel,
  eventStatusLabel,
  type ToneText,
} from "../controllers/eventRecordLabels";
import type {EventPageRecord} from "../controllers/useEventPageController";

/** Overview for every event; Page edits a Catch event; Takedown removes a public imported event. */
export type EventPageTab = "overview" | "page" | "takedown";

interface Fact {
  label: string;
  value: string;
  tone?: ToneText["tone"];
}

const toneColor = {success: "positiveText", warning: "attentionText", danger: "danger"} as const;

// Facts as label over value in two columns; PR 3's CatchMetaRow replaces it.
function Facts({items}: {items: readonly Fact[]}) {
  return (
    <CatchGrid columns={2} compactColumns={1} gap="section">
      {items.map((item) => (
        <CatchGap key={item.label} size="headerTitleToSubtitle">
          <CatchText as="span" color="ink2" variant="supporting">{item.label}</CatchText>
          <CatchText
            as="span"
            color={item.tone === "success" || item.tone === "warning" || item.tone === "danger" ?
              toneColor[item.tone] : "ink"}
            variant="bodyM"
          >
            {item.value}
          </CatchText>
        </CatchGap>
      ))}
    </CatchGrid>
  );
}

function organizerRow(name: string, onOpen: () => void) {
  return (
    <CatchGap size="related">
      <CatchText as="h2" variant="sectionTitle">Organizer</CatchText>
      <CatchIndexRow
        onTap={onOpen}
        title={name}
        titleVariant="bodyM"
        trailing={<CatchText as="span" color="primary" variant="supportingStrong">Open</CatchText>}
      />
    </CatchGap>
  );
}

function catchOverview(record: Extract<EventPageRecord, {source: "catch"}>, onOpenOrganizer: (id: string) => void) {
  const event = record.event;
  const status = eventStatusLabel(event.status === "cancelled" ? "cancelled" :
    event.bookedCount >= event.capacityLimit ? "full" : "live");
  const facts: Fact[] = [
    {label: "Organizer", value: event.organizerName ?? event.organizerId},
    {label: "When", value: eventWhenLabel(event.startTime)},
    {label: "Where", value: event.meetingPoint},
    {label: "Format", value: event.eventFormat.label},
    {label: "Tickets", value: eventPriceLabel(event.priceInPaise)},
    {label: "Source", value: "Made in Catch"},
    {label: "Status", value: status.text, tone: status.tone},
    {label: "In search", value: event.searchIndexStatus === "indexed" ? "Indexed" : "Not indexed yet",
      tone: event.searchIndexStatus === "indexed" ? null : "warning"},
  ];
  const bookings = (
    <CatchGap size="related">
      <CatchText as="h2" variant="sectionTitle">Bookings</CatchText>
      <CatchIndexRow title="Booked" titleVariant="bodyM" trailing={<CatchText as="span" variant="supportingStrong">{eventBookedLabel(event)}</CatchText>} />
      <CatchIndexRow title="Waitlist" titleVariant="bodyM" trailing={<CatchText as="span" variant="supportingStrong">{String(event.waitlistedCount)}</CatchText>} />
      <CatchIndexRow title="Checked in" titleVariant="bodyM" trailing={<CatchText as="span" variant="supportingStrong">{String(event.checkedInCount)}</CatchText>} />
    </CatchGap>
  );
  return {main: <CatchGap size="majorSection"><Facts items={facts} />{bookings}</CatchGap>,
    organizer: organizerRow(event.organizerName ?? event.organizerId, () => onOpenOrganizer(event.organizerId)),
    aside: event.cancellationReason ? (
      <CatchGap size="related">
        <CatchText as="h2" variant="sectionTitle">Cancelled</CatchText>
        <CatchText as="p" variant="bodyM">{event.cancellationReason}</CatchText>
      </CatchGap>
    ) : null};
}

function importedOverview(record: Extract<EventPageRecord, {source: "imported"}>, onOpenOrganizer: (id: string) => void) {
  const event = record.event;
  const status = eventStatusLabel(event.status === "cancelled" ? "cancelled" :
    event.publicationStatus === "draft" ? "needsCheck" :
      event.publicationStatus === "public" ? "live" : "removed");
  const facts: Fact[] = [
    {label: "Organizer", value: event.canonicalHostId},
    {label: "When", value: eventWhenLabel(event.startTime)},
    {label: "Where", value: event.meetingPoint},
    {label: "Tickets", value: event.priceDisplayText ?? "On the source page"},
    {label: "Source", value: eventOriginLabel({source: "imported", platform: event.platform})},
    {label: "Status", value: status.text, tone: status.tone},
  ];
  const checks = (
    <CatchGap size="related">
      <CatchText as="h2" variant="sectionTitle">Checks</CatchText>
      <CatchIndexRow
            titleVariant="bodyM"
        subtitle={event.importPolicyAcknowledged ? "The import policy was acknowledged" : "Not acknowledged yet"}
        title="Import policy"
      />
      <CatchIndexRow
            titleVariant="bodyM"
        subtitle={event.ownerSafeCopyReviewed ? "Reviewed" : "Not reviewed yet"}
        title="Copy the organizer would sign off"
      />
      <CatchIndexRow
            titleVariant="bodyM"
        subtitle={event.duplicateCandidateCount === 0 ? "None found" :
          `${event.duplicateCandidateCount} other listings of the same event`}
        title="Duplicates"
      />
    </CatchGap>
  );
  return {main: <CatchGap size="majorSection"><Facts items={facts} />{checks}</CatchGap>, aside: null,
    organizer: organizerRow(event.canonicalHostId, () => onOpenOrganizer(event.canonicalHostId))};
}

/**
 * One event's page in the reading pattern: its facts and bookings, and for an event made in
 * Catch a Page tab that edits it. Imported events link to the page they came from.
 */
export function EventPageScreen({
  loadError,
  onBack,
  onOpenOrganizer,
  onTabChanged,
  pageEditor,
  record,
  tab,
}: {
  loadError: string | null;
  onBack: () => void;
  onOpenOrganizer: (organizerId: string) => void;
  onTabChanged: (tab: EventPageTab) => void;
  /** The Page tab's editor for a Catch event, or the Takedown tab's review for an imported one. */
  pageEditor: ReactNode;
  record: EventPageRecord | null;
  tab: EventPageTab;
}) {
  const sourceUrl = record?.source === "imported" ? record.event.primaryExternalUrl ?? record.event.eventUrl : null;
  const top = (
    <CatchTopBar
      actions={sourceUrl ? (
        <CatchButton href={sourceUrl} label={eventOriginLabel({source: "imported",
          platform: record?.source === "imported" ? record.event.platform : null}).replace("From", "Open on")}
        newTab onPressed={() => undefined} size="sm" variant="secondary" />
      ) : undefined}
      back={{label: "Back to events", onPressed: onBack}}
      kicker="Events"
      title={record?.event.title ?? "Event"}
      variant="tool"
    />
  );
  if (!record) {
    return (
      <>
        {top}
        <CatchPaneLayout
          main={<CatchText as="p" color={loadError ? "danger" : "ink2"} variant="bodyM">
            {loadError ?? "Loading the event"}
          </CatchText>}
          pattern="reading"
        />
      </>
    );
  }
  const editorTab = record.source === "catch" ? {value: "page", label: "Page"} :
    record.event.publicationStatus === "public" ? {value: "takedown", label: "Takedown"} : null;
  const tabs = editorTab ? (
    <CatchPageTabBar
      label="Event"
      onChanged={(value) => onTabChanged(value as EventPageTab)}
      options={[{value: "overview", label: "Overview"}, editorTab]}
      selected={tab}
      size="sm"
    />
  ) : null;
  if (editorTab && tab === editorTab.value) {
    return (
      <>
        {top}
        {tabs}
        {pageEditor}
      </>
    );
  }
  const body = record.source === "catch" ? catchOverview(record, onOpenOrganizer) :
    importedOverview(record, onOpenOrganizer);
  return (
    <>
      {top}
      <CatchPaneLayout
        aside={<CatchGap size="majorSection">{body.organizer}{body.aside}</CatchGap>}
        main={<CatchGap size="section">{tabs}{body.main}</CatchGap>}
        pattern="reading"
      />
    </>
  );
}
