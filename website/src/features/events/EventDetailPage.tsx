import {CatchBand, CatchNotice, CatchNoticeRegion, CatchPaneLayout, CatchRoot, CatchStack, type CatchNoticeData} from "@catch/web-ui";
import {useEffect, useMemo, useRef, useState} from "react";
import {eventPageCopy as copy, guestEventCopy} from "../../content/events";
import {recordEventInviteLinkOpen} from "../../firebase";
import {eventInviteSessionId, eventInviteTokenFromLocation} from "../../shared/eventInviteAttribution";
import {WebsitePageMain} from "../../shared/site";
import {observeOrganizerPageView, trackOrganizerAnalytics} from "../organizers/analytics";
import {observeOrganizerProviders, trackOrganizerProviderOutboundClick} from "../organizers/observeOrganizerProviders";
import {PublicPageFooter, PublicPageHeader} from "../organizers/sections/PublicPageChrome";
import type {HostListing} from "../organizers/types";
import {EventBooking} from "./EventBooking";
import {GuestEventEntry} from "./GuestEventEntry";
import {buildEventPageView, type EventPageData} from "./eventPageModel";
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
    <CatchRoot theme="day">
      <PublicPageHeader />
      <WebsitePageMain id="event-detail">
        {/* The band is only the page container the booking aside measures to dock on a phone. */}
        <CatchBand as="div" pb="none" pt="none" width="full">
          <CatchPaneLayout
            aside={(
              <EventBooking
                catchEntry={<GuestEventEntry eventId={eventId} key={eventId}
                  startLabel={paid ? guestEventCopy.book : guestEventCopy.register} />}
                onExternalClick={trackBookingClick}
                view={view}
              />
            )}
            main={(
              <CatchStack gap={40}>
                <EventPageMain mapImageUrl={mapImageUrl} onShare={() => void share()} view={view} />
                <PublicPageFooter />
              </CatchStack>
            )}
            pattern="reading"
          />
        </CatchBand>
      </WebsitePageMain>
      {notices.current ? (
        <CatchNoticeRegion label={copy.share}>
          <CatchNotice dismissLabel={guestEventCopy.close} notice={notices.current} onDismiss={notices.dismiss} />
        </CatchNoticeRegion>
      ) : null}
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
