import {GuestEventEntry} from "./GuestEventEntry";
import {observeOrganizerProviders} from "../organizers/observeOrganizerProviders";
import {observeOrganizerPageView} from "../organizers/analytics";
import {useEffect} from "react";
import {consumerEventCopy} from "../../content/consumerEvent";
import {ConsumerEventPage, EventDiscoveryLink} from "../../shared/ui/primitives/consumerEvent";
import {PlainLink} from "../../shared/ui/primitives";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import type {EventDetailRecord} from "./eventDetailModel";
import {recordEventInviteLinkOpen} from "../../firebase";
import {
  eventInviteSessionId,
  eventInviteTokenFromLocation,
} from "../../shared/eventInviteAttribution";
import {
  EventDetailFactsSection,
  EventDetailHeroSection,
  EventDetailProvenanceSection,
  EventDetailReviewsSection,
} from "./sections/EventDetailSections";

export function EventDetailPage({event}: {event: EventDetailRecord}) {
  useEffect(() => observeOrganizerPageView(event.listing, "eventView", "event_detail", event.eventId), [event.listing, event.eventId]);
  useEffect(() => observeOrganizerProviders(event.listing, event.eventId), [event.listing, event.eventId]);
  const inviteToken = eventInviteTokenFromLocation();
  useEffect(() => {
    if (!inviteToken) return;
    void recordEventInviteLinkOpen({
      eventId: event.eventId,
      inviteLinkId: inviteToken,
      surface: "marketingWeb",
      sessionId: eventInviteSessionId(),
    }).catch(() => undefined);
  }, [event.eventId, inviteToken]);
  return (
    <ConsumerEventPage>
      <PublicSiteHeader />

      <WebsitePageMain id="event-detail">
        <EventDiscoveryLink aria-label={consumerEventCopy.discoveryLabel}>
          <PlainLink href="/explore/">← {consumerEventCopy.back}</PlainLink>
        </EventDiscoveryLink>
        <EventDetailHeroSection
          event={event}
          guestEntry={event.supply === "catchNative" ? <GuestEventEntry key={event.eventId} eventId={event.eventId} invitation={{price: event.priceLabel, title: event.title}} /> : undefined}
        />
        <EventDetailFactsSection event={event} />
        <EventDetailProvenanceSection event={event} />
        <EventDetailReviewsSection event={event} />
      </WebsitePageMain>

      <PublicSiteFooter />
    </ConsumerEventPage>
  );
}
