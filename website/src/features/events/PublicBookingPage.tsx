import {CatchLoadingIndicator, CatchText} from "@catch/web-ui";
import {useEffect, useState} from "react";
import {useParams, useSearchParams} from "react-router";
import {publicCheckoutCopy as copy} from "../../content/events";
import {GuestEventEntry} from "./GuestEventEntry";
import {PublicPaidEventRegistration} from "./PublicPaidEventRegistration";
import {EventBookingFrame} from "../../shared/site/EventBookingFrame";

const eventIdPattern = /^[A-Za-z0-9_:-]{1,180}$/u;
const paymentIdPattern = /^pp_[a-f0-9]{32}$/u;

/** Whether the event still has a public page to book on. */
async function eventPageExists(path: string): Promise<boolean> {
  try {
    return (await fetch(path, {method: "HEAD", credentials: "omit"})).ok;
  } catch {
    return false;
  }
}

function replaceLocation(path: string) {
  window.location.replace(path);
}

/**
 * The old booking link (CAT-252). The event page's booking card does what
 * this page did, so the link goes there. A payment receipt stays here: a
 * listing can close or disappear while its guest still needs the receipt,
 * and a payment ID never goes onto a cached public page. So does a booking
 * whose event has no public page any more, with no more event detail than
 * this page ever showed.
 */
export function PublicBookingPage({pageExists = eventPageExists, redirect = replaceLocation}: {
  pageExists?: (path: string) => Promise<boolean>;
  redirect?: (path: string) => void;
} = {}) {
  const {eventId = ""} = useParams<{eventId: string}>();
  const [search] = useSearchParams();
  const paymentId = search.get("payment");
  const valid = eventIdPattern.test(eventId) && (paymentId === null || paymentIdPattern.test(paymentId));
  const eventPath = `/events/${encodeURIComponent(eventId)}/`;
  const [stayed, setStayed] = useState(false);
  useEffect(() => {
    if (!valid || paymentId !== null) return undefined;
    let active = true;
    void pageExists(eventPath).then((exists) => {
      if (!active) return;
      if (exists) redirect(eventPath);
      else setStayed(true);
    });
    return () => {
      active = false;
    };
  }, [eventPath, pageExists, paymentId, redirect, valid]);

  return (
    <EventBookingFrame body={copy.bookingBody} title={copy.bookingTitle}>
      {!valid ? <CatchText as="p" role="status" variant="bodyM">{copy.unavailable}</CatchText> :
        paymentId !== null ? (
          <PublicPaidEventRegistration allowNewBookings={false} eventId={eventId} initialPaymentId={paymentId}
            inviteToken={null} key={`${eventId}:${paymentId}`} />
        ) : stayed ? <GuestEventEntry eventId={eventId} /> : <CatchLoadingIndicator label={copy.loading} />}
    </EventBookingFrame>
  );
}
