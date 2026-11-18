import {CatchButton, CatchLoadingIndicator, CatchStack} from "@catch/web-ui";
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

/** What the page shows: the invitation loading, a link that cannot open, or a check that did not finish. */
type InviteScreen = "loading" | "unavailable" | "unreachable";

/** The server's answers for a link that is malformed, unknown, withdrawn, ended or incomplete. */
const unavailableCodes = new Set([
  "functions/not-found", "functions/invalid-argument", "functions/failed-precondition", "functions/permission-denied",
]);

/**
 * Sorts a failed resolve: the server turning the link down means it cannot
 * open; anything else (the network, a blocked App Check, a rate limit, a
 * build without Firebase) means the check did not finish and may be retried.
 */
function inviteFailureScreen(error: unknown): Exclude<InviteScreen, "loading"> {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  return unavailableCodes.has(code) ? "unavailable" : "unreachable";
}

/**
 * The invitation link (CAT-252). It resolves the opaque token, which also
 * records the open, and goes on to the event page, so booking happens in one
 * place. Only a link that cannot resolve stays here: one the server turns
 * down says it is unavailable; one whose check did not finish offers a retry.
 */
export function EventInvitePage({resolve = resolveEventInviteLanding, redirect = replaceLocation}: {
  resolve?: typeof resolveEventInviteLanding;
  redirect?: (url: string) => void;
} = {}) {
  const {inviteToken = ""} = useParams<{inviteToken: string}>();
  const [screen, setScreen] = useState<InviteScreen>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    if (!inviteToken) {
      setScreen("unavailable");
      return;
    }
    setScreen("loading");
    void resolve({inviteToken, sessionId: eventInviteSessionId()}).then((landing) => {
      if (!active) return;
      const destination = inviteDestination(landing, inviteToken);
      if (destination) redirect(destination);
      else setScreen("unavailable");
    }).catch((error: unknown) => {
      if (active) setScreen(inviteFailureScreen(error));
    });
    return () => {
      active = false;
    };
  }, [attempt, inviteToken, redirect, resolve]);

  // The LiveInvite board: an invitation that cannot resolve says why under its
  // headline and offers help; one on its way shows the invitation loading.
  if (screen === "unavailable") {
    return (
      <EventBookingFrame body={copy.unavailableBody} kicker={copy.brand} title={copy.unavailableTitle}>
        <CatchButton fullWidth href="/help/" label={copy.helpAction} onPressed={noop} variant="secondary" />
      </EventBookingFrame>
    );
  }
  if (screen === "unreachable") {
    return (
      <EventBookingFrame body={copy.unreachableBody} kicker={copy.brand} title={copy.unreachableTitle}>
        <CatchStack>
          <CatchButton fullWidth label={copy.retryAction} onPressed={() => setAttempt((count) => count + 1)} />
          <CatchButton fullWidth href="/help/" label={copy.helpAction} onPressed={noop} variant="secondary" />
        </CatchStack>
      </EventBookingFrame>
    );
  }
  return (
    <EventBookingFrame kicker={copy.kicker} title={copy.title}>
      <CatchLoadingIndicator label={copy.loading} />
    </EventBookingFrame>
  );
}
