import type {ReactNode} from "react";
import {
  CatchButton,
  CatchGap,
  CatchIndexRow,
  CatchMetaRow,
  CatchPageTabBar,
  CatchPaneLayout,
  CatchSection,
  CatchText,
  CatchTopBar,
  type CatchMetaEntry,
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

function fact(label: string, value: string, tone?: ToneText["tone"]): CatchMetaEntry {
  return tone === "success" || tone === "warning" || tone === "danger" ?
    {label, value, tone} : {label, value};
}

function organizerRow(name: string, onOpen: () => void) {
  return (
    <CatchSection dividers="none" title="Organizer">
      <CatchIndexRow
        onTap={onOpen}
        title={name}
        titleVariant="bodyM"
        trailing={<CatchText as="span" color="primary" variant="supportingStrong">Open</CatchText>}
      />
    </CatchSection>
  );
}

function catchOverview(record: Extract<EventPageRecord, {source: "catch"}>, onOpenOrganizer: (id: string) => void) {
  const event = record.event;
  const status = eventStatusLabel(event.status === "cancelled" ? "cancelled" :
    event.bookedCount >= event.capacityLimit ? "full" : "live");
  const facts = [
    fact("Organizer", event.organizerName ?? event.organizerId),
    fact("When", eventWhenLabel(event.startTime)),
    fact("Where", event.meetingPoint),
    fact("Format", event.eventFormat.label),
    fact("Tickets", eventPriceLabel(event.priceInPaise)),
    fact("Source", "Made in Catch"),
    fact("Status", status.text, status.tone),
    fact("In search", event.searchIndexStatus === "indexed" ? "Indexed" : "Not indexed yet",
      event.searchIndexStatus === "indexed" ? null : "warning"),
  ];
  const bookings = (
    <CatchSection title="Bookings">
      <CatchIndexRow title="Booked" titleVariant="bodyM" trailing={<CatchText as="span" variant="supportingStrong">{eventBookedLabel(event)}</CatchText>} />
      <CatchIndexRow title="Waitlist" titleVariant="bodyM" trailing={<CatchText as="span" variant="supportingStrong">{String(event.waitlistedCount)}</CatchText>} />
      <CatchIndexRow title="Checked in" titleVariant="bodyM" trailing={<CatchText as="span" variant="supportingStrong">{String(event.checkedInCount)}</CatchText>} />
    </CatchSection>
  );
  return {main: <CatchGap size="majorSection"><CatchMetaRow entries={facts} />{bookings}</CatchGap>,
    organizer: organizerRow(event.organizerName ?? event.organizerId, () => onOpenOrganizer(event.organizerId)),
    aside: event.cancellationReason ? (
      <CatchSection dividers="none" title="Cancelled">
        <CatchText as="p" variant="bodyM">{event.cancellationReason}</CatchText>
      </CatchSection>
    ) : null};
}

function importedOverview(record: Extract<EventPageRecord, {source: "imported"}>, onOpenOrganizer: (id: string) => void) {
  const event = record.event;
  const status = eventStatusLabel(event.status === "cancelled" ? "cancelled" :
    event.publicationStatus === "draft" ? "needsCheck" :
      event.publicationStatus === "public" ? "live" : "removed");
  const facts = [
    fact("Organizer", event.canonicalHostId),
    fact("When", eventWhenLabel(event.startTime)),
    fact("Where", event.meetingPoint),
    fact("Tickets", event.priceDisplayText ?? "On the source page"),
    fact("Source", eventOriginLabel({source: "imported", platform: event.platform})),
    fact("Status", status.text, status.tone),
  ];
  const checks = (
    <CatchSection title="Checks">
      <CatchIndexRow
        subtitle={event.importPolicyAcknowledged ? "The import policy was acknowledged" : "Not acknowledged yet"}
        title="Import policy"
        titleVariant="bodyM"
      />
      <CatchIndexRow
        subtitle={event.ownerSafeCopyReviewed ? "Reviewed" : "Not reviewed yet"}
        title="Copy the organizer would sign off"
        titleVariant="bodyM"
      />
      <CatchIndexRow
        subtitle={event.duplicateCandidateCount === 0 ? "None found" :
          `${event.duplicateCandidateCount} other listings of the same event`}
        title="Duplicates"
        titleVariant="bodyM"
      />
    </CatchSection>
  );
  return {main: <CatchGap size="majorSection"><CatchMetaRow entries={facts} />{checks}</CatchGap>, aside: null,
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
