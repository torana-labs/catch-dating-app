import {CatchButton, CatchGap, CatchLoadingIndicator, CatchText} from "@catch/web-ui";
import {useEffect, useState} from "react";
import {useParams} from "react-router";
import {eventInviteCopy as copy} from "../../content/eventInvite";
import {type EventInviteLanding, resolveEventInviteLanding} from "../../firebase";
import {eventInviteSessionId} from "../../shared/eventInviteAttribution";
import {EventBookingFrame} from "../../shared/site/EventBookingFrame";

const noop = () => undefined;

function replaceLocation(url: string) {
  window.location.replace(url);
}

/**
 * Where an invitation goes. A Catch event's invitation opens its event page
 * with the token as `il`, which records the open and carries the invitation
 * into registration. An external or event-mode invitation goes to the
 * destination the server issued for it.
 */
export function inviteDestination(landing: EventInviteLanding, inviteToken: string): string | null {
  if (landing.destinationKind !== "catchEvent") return landing.destinationUrl;
  return `/events/${encodeURIComponent(landing.eventId)}/?il=${encodeURIComponent(inviteToken)}`;
}

/**
 * The invitation link (CAT-252). It resolves the opaque token, which also
 * records the open, and goes on to the event page, so booking happens in one
 * place. Only a link that cannot resolve stays here.
 */
export function EventInvitePage({resolve = resolveEventInviteLanding, redirect = replaceLocation}: {
  resolve?: typeof resolveEventInviteLanding;
  redirect?: (url: string) => void;
} = {}) {
  const {inviteToken = ""} = useParams<{inviteToken: string}>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    void resolve({inviteToken, sessionId: eventInviteSessionId()}).then((landing) => {
      if (!active) return;
      const destination = inviteDestination(landing, inviteToken);
      if (destination) redirect(destination);
      else setFailed(true);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => {
      active = false;
    };
  }, [inviteToken, redirect, resolve]);

  return failed ? (
    <EventBookingFrame title={copy.unavailableTitle}>
      <CatchGap size="related">
        <CatchText as="p" color="danger" role="status" variant="bodyM">{copy.unavailableBody}</CatchText>
        <CatchButton fullWidth href="/help/" label={copy.helpAction} onPressed={noop} variant="secondary" />
      </CatchGap>
    </EventBookingFrame>
  ) : (
    <EventBookingFrame title={copy.title}>
      <CatchLoadingIndicator label={copy.loading} />
    </EventBookingFrame>
  );
}
