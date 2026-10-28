import {CatchBand, CatchNotice, CatchNoticeRegion, CatchSplit, type CatchNoticeData} from "@catch/web-ui";
import {useEffect, useMemo, useRef, useState, type ReactNode} from "react";
import {eventPageCopy as copy, guestEventCopy} from "../../content/events";
import {recordEventInviteLinkOpen} from "../../firebase";
import {eventInviteSessionId, eventInviteTokenFromLocation} from "../../shared/eventInviteAttribution";
import {PublicSiteFooter, PublicSiteHeader} from "../../shared/site";
import {EventGuestActions} from "../../shared/ui/primitives/eventDetail";
import {observeOrganizerPageView, trackOrganizerAnalytics} from "../organizers/analytics";
import {observeOrganizerProviders, trackOrganizerProviderOutboundClick} from "../organizers/observeOrganizerProviders";
import type {HostListing} from "../organizers/types";
import {GuestEventEntry} from "./GuestEventEntry";
import {buildEventPageView, type EventPageData} from "./eventPageModel";
import {EventBookingCard, EventPageHeader, EventPageMain} from "./sections/EventPageSections";

/**
 * The public event page, rendered from its eventPublicPage read model.
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
    <>
      <PublicSiteHeader />
      <CatchBand as="div" pb="none" pt="compact">
        <EventPageHeader onShare={() => void share()} view={view} />
      </CatchBand>
      <CatchBand as="main" id="event-detail" pt="compact">
        <CatchSplit
          end={(
            <EventBookingCard
              catchEntry={<GuestEventEntry eventId={eventId} invitation={{price: view.priceLabel, title: view.title}} key={eventId} />}
              externalAction={(button: ReactNode, note: string) => <EventGuestActions price={view.priceLabel} status={note}>{button}</EventGuestActions>}
              onExternalClick={trackBookingClick}
              view={view}
            />
          )}
          gap="regular"
          railSide="end"
          ratio="narrowRail"
          start={<EventPageMain mapImageUrl={mapImageUrl} view={view} />}
        />
      </CatchBand>
      <PublicSiteFooter />
      {notices.current ? (
        <CatchNoticeRegion label={copy.share}>
          <CatchNotice dismissLabel={guestEventCopy.close} notice={notices.current} onDismiss={notices.dismiss} />
        </CatchNoticeRegion>
      ) : null}
    </>
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
