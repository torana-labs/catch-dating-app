import {CatchBand, CatchNotice, CatchNoticeRegion, CatchRoot, CatchStack, type CatchNoticeData} from "@catch/web-ui";
import {useEffect, useMemo, useRef, useState, type ReactNode} from "react";
import {eventPageCopy as copy, guestEventCopy} from "../../content/events";
import {recordEventInviteLinkOpen} from "../../firebase";
import {eventInviteSessionId, eventInviteTokenFromLocation} from "../../shared/eventInviteAttribution";
import {PublicSiteFooter, PublicSiteHeader, WebsitePageMain} from "../../shared/site";
import {observeOrganizerPageView, trackOrganizerAnalytics} from "../organizers/analytics";
import {observeOrganizerProviders, trackOrganizerProviderOutboundClick} from "../organizers/observeOrganizerProviders";
import type {HostListing} from "../organizers/types";
import {EventBooking} from "./EventBooking";
import {GuestEventEntry} from "./GuestEventEntry";
import {buildEventPageView, type EventPageData, type EventPageView} from "./eventPageModel";
import {EventPageMain} from "./sections/EventPageSections";

/**
 * The public event page on the white ground, as the RbWebEventV2 board: the
 * site top bar, then a reading lane (the event and the short footer) beside
 * the booking card. It renders from its eventPublicPage read model.
 * `listing` is the organizer listing the analytics observers still read;
 * `mapImageUrl` is the server's map of the meeting point while maps are on.
 */
export function EventDetailPage({page, listing, mapImageUrl}: {
  page: EventPageData; listing: HostListing; mapImageUrl?: string;
}) {
  const view = useMemo(() => buildEventPageView(page), [page]);
  const {eventId} = view;
  useEffect(() => observeOrganizerPageView(listing, "eventView", "event_detail", eventId), [listing, eventId]);
  useEffect(() => observeOrganizerProviders(listing, eventId), [listing, eventId]);
  const inviteToken = eventInviteTokenFromLocation();
  useEffect(() => {
    if (!inviteToken) return;
    void recordEventInviteLinkOpen({
      eventId,
      inviteLinkId: inviteToken,
      surface: "marketingWeb",
      sessionId: eventInviteSessionId(),
    }).catch(() => undefined);
  }, [eventId, inviteToken]);
  const notices = useNotice();
  const paid = page.item.source === "catch" && page.item.event.registrationMode === "paid";

  async function share() {
    const url = `${window.location.origin}${view.path}`;
    try {
      if (navigator.share) {
        await navigator.share({title: view.title, url});
        return;
      }
      await navigator.clipboard.writeText(url);
      notices.show({id: "share", title: copy.shareCopied, message: url, tone: "success"});
    } catch (error) {
      // A dismissed share sheet is not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return;
      notices.show({id: "share", title: copy.shareFailed, tone: "warning"});
    }
  }

  function trackBookingClick() {
    trackOrganizerAnalytics(listing, "outboundClick", "external_event_booking", eventId);
    trackOrganizerProviderOutboundClick(listing.id, eventId);
  }

  return (
    <EventPageFrame
      booking={(
        <EventBooking
          catchEntry={<GuestEventEntry eventId={eventId} key={eventId}
            startLabel={paid ? guestEventCopy.book : guestEventCopy.register} />}
          onExternalClick={trackBookingClick}
          view={view}
        />
      )}
      mapImageUrl={mapImageUrl}
      onShare={() => void share()}
      view={view}
    >
      {notices.current ? (
        <CatchNoticeRegion label={copy.share}>
          <CatchNotice dismissLabel={guestEventCopy.close} notice={notices.current} onDismiss={notices.dismiss} />
        </CatchNoticeRegion>
      ) : null}
    </EventPageFrame>
  );
}

/**
 * The page around the event: the site top bar, the event beside the booking
 * rail, then the site footer (owner decision, 14 Nov 2026). Stories render it with a
 * stand-in for the booking steps.
 */
export function EventPageFrame({booking, children, mapImageUrl, onShare, view}: {
  booking: ReactNode;
  children?: ReactNode;
  mapImageUrl?: string;
  onShare?: () => void;
  view: EventPageView;
}) {
  return (
    <CatchRoot theme="day">
      <PublicSiteHeader />
      <WebsitePageMain id="event-detail">
        {/*
          * The band is the page container the booking aside measures to dock on a phone,
          * at the site's content width. From expanded up the booking keeps a 380px rail that
          * sticks while the page scrolls, and the page takes the rest (RbWebEventV2, E1).
          */}
        <CatchBand as="div" pb="compact" pt="compact" width="content">
          <CatchStack collapseBelow="expanded" direction="row" gap={48} railWidth={booking ? "narrow" : undefined} stickyRail>
            <CatchStack gap={40}>
              <EventPageMain mapImageUrl={mapImageUrl} onShare={onShare} view={view} />
            </CatchStack>
            {booking}
          </CatchStack>
        </CatchBand>
      </WebsitePageMain>
      <PublicSiteFooter />
      {children}
    </CatchRoot>
  );
}

/** One notice at a time, dismissed after a short read. */
function useNotice() {
  const [current, setCurrent] = useState<CatchNoticeData | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return {
    current,
    show(notice: CatchNoticeData) {
      window.clearTimeout(timer.current);
      setCurrent(notice);
      timer.current = window.setTimeout(() => setCurrent(null), 4000);
    },
    dismiss() {
      window.clearTimeout(timer.current);
      setCurrent(null);
    },
  };
}
