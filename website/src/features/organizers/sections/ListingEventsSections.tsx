import {CatchBadge} from "@catch/web-ui";
import {exploreCopy} from "../../../content/explore";
import {organiserProfileCopy} from "../../../content/organiserProfile";
import {publicExperienceActivities} from "../publicExperience";

import {websiteCopy} from "@content/generated";
import {organizerListingCopy} from "@content/organizer";
import {trackMarketingEvent} from "../../../analytics";
import {SectionHeader} from "../../../shared/site";
import {
  ContentGrid,
  EventActionCard,
  type EventActionCardAction,
  type EventActionCardModel,
  ListingEventEvidenceList,
  ListingRailEmptyState,
  ListingRailSection,
  ListingSuccessMetricGrid,
  ListingSection,
  ButtonLink,
} from "../../../shared/ui/primitives";
import {trackOrganizerAnalytics} from "../analytics";
import {
  eventActionCardForListing,
  externalEventActionCardForListing,
} from "../publicDiscovery";
import type {HostListing, HostListingEventSuccessSummary} from "../types";

export function ListingEventsRailSection({listing}: {listing: HostListing}) {
  const catchCount = listing.catchEvents?.length ?? 0;
  const externalCount = listing.externalEvents?.length ?? 0;
  const total = catchCount + externalCount;

  return (
    <ListingRailSection eyebrow={organizerListingCopy.detail.eventsEyebrow}>
      <ListingRailEmptyState
        title={total ? `${total} published ${total === 1 ? "event" : "events"}` : "No published Catch events yet"}
        body={total
          ? `${catchCount ? `${catchCount} in Catch` : ""}${catchCount && externalCount ? " · " : ""}${externalCount ? `${externalCount} from approved public sources` : ""}.`
          : "This organizer has not published an event on Catch."}
      />
      {total ? (
        <ButtonLink variant="ghost" href="#events">
          {organizerListingCopy.detail.viewEventsAction}
        </ButtonLink>
      ) : null}
    </ListingRailSection>
  );
}

export function ListingCatchEventsSection({listing}: {listing: HostListing}) {
  const events = listing.catchEvents ?? [];
  const eventCards = events.map((event) =>
    eventActionCardForListing(listing, event)
  );

  return (
    <ListingSection
      variant="events"
      id="events"
      aria-labelledby="listing-catch-events-title"
    >
      <SectionHeader
        eyebrow={websiteCopy["listingeventssections_0388"]}
        id="listing-catch-events-title"
        title={organiserProfileCopy.eventsTitle(listing.name)}
        body={organiserProfileCopy.eventsBody} />
      <ContentGrid variant="listing-event">
        {eventCards.map((event, index) => (
          <EventActionCard
            event={event}
            badge={publicExperienceActivities(events[index].catchExperienceActivities).length ?
              <CatchBadge tone="brand" label={exploreCopy.experienceLabel} /> : undefined}
            key={event.id}
            onActionClick={trackListingEventActionClick}
          />
        ))}
      </ContentGrid>

    </ListingSection>
  );
}

export function ListingExternalEventsSection({
  anchorId,
  listing,
}: {
  anchorId: string;
  listing: HostListing;
}) {
  const events = listing.externalEvents ?? [];
  const eventCards = events.map((event) =>
    withExternalEventActionTracking(
      listing,
      event.id,
      externalEventActionCardForListing(listing, event)
    )
  );
  return (
    <ListingSection
      variant="events"
      id={anchorId}
      aria-labelledby="listing-external-events-title"
    >
      <SectionHeader
        eyebrow={websiteCopy["listingeventssections_0395"]}
        id="listing-external-events-title"
        title={websiteCopy["listingeventssections_0401"]}
        body={websiteCopy["listingeventssections_0404"]} />
      <ContentGrid variant="listing-event">
        {eventCards.map((event) => (
          <EventActionCard
            event={event}
            key={event.id}
            onActionClick={trackListingEventActionClick}
          />
        ))}
      </ContentGrid>
    </ListingSection>
  );
}

function trackListingEventActionClick(action: EventActionCardAction) {
  trackMarketingEvent("cta_click", {
    cta_href: action.href,
    cta_label: action.trackingLabel ?? "event_action",
    page_path: `${window.location.pathname}${window.location.search}`,
  });
}

function withExternalEventActionTracking(
  listing: HostListing,
  eventId: string,
  card: EventActionCardModel
): EventActionCardModel {
  return {
    ...card,
    actions: card.actions.map((action) => action.trackingLabel === "external_event_source" ? {
      ...action,
      onClick: () => trackOrganizerAnalytics(listing, "outboundClick", "external_event_booking", eventId),
    } : action),
  };
}

export function ListingEventEvidenceSection({listing}: {listing: HostListing}) {
  const events = listing.eventEvidence ?? [];
  if (!events.length) return null;
  const eventItems = events.map((event) => ({
    date: event.date,
    facts: event.facts,
    key: event.title,
    location: event.location,
    onSourceClick: () => trackOrganizerAnalytics(
      listing,
      "outboundClick",
      "event_evidence"
    ),
    sourceHref: event.sourceHref,
    sourceLabel: event.sourceLabel,
    summary: event.summary,
    title: event.title,
  }));

  return (
    <ListingSection variant="events" id="event-evidence" aria-labelledby="listing-events-title">
      <SectionHeader
        eyebrow={websiteCopy["listingeventssections_0392"]}
        id="listing-events-title"
        title={websiteCopy["listingeventssections_0398"]} />
      <ListingEventEvidenceList items={eventItems} />
    </ListingSection>
  );
}

export function ListingEventSuccessSection({
  summary,
}: {
  summary: HostListingEventSuccessSummary;
}) {
  const metrics = [
    {label: websiteCopy["listingeventssections_0387"], value: summary.bookedCount},
    {label: websiteCopy["listingeventssections_0391"], value: summary.checkedInCount},
    {label: websiteCopy["listingeventssections_0389"], value: summary.catchSentCount},
    {label: websiteCopy["listingeventssections_0397"], value: summary.mutualMatchCount},
    {label: websiteCopy["listingeventssections_0390"], value: summary.chatStartedCount},
    {label: websiteCopy["listingeventssections_0400"], value: summary.safetyIncidentCount},
  ];
  return (
    <ListingSection
      variant="success"
      id="event-success"
      aria-labelledby="event-success-title"
    >
      <SectionHeader
        eyebrow={organiserProfileCopy.outcomesEyebrow}
        id="event-success-title"
        title={organiserProfileCopy.outcomesTitle}
        body={organiserProfileCopy.outcomesBody} />
      <ListingSuccessMetricGrid items={metrics} />
    </ListingSection>
  );
}
