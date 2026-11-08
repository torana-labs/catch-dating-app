import {CatchButton, CatchIndexRow, CatchSection, CatchStack, CatchSurface, CatchText} from "@catch/web-ui";
import {getProgramHouseholdRsvpView, programHouseholdItineraryIcsUrl} from "../../firebase";
import {programmeItineraryCopy as copy} from "../../content/programmes";
import type {ProgramHouseholdRsvpViewCallableResponse as View} from "../../firebase";
import {ProgrammeLinkFrame} from "./ProgrammeLinkFrame";
import {programmeFormat} from "./programmeBrandingModel";
import {itineraryOf, type ItineraryLeg} from "./programmeItineraryModel";
import {programmeDay, programmeDays, programmeTime, type ProgrammeLinkCredential, type ProgrammeLinkScreen} from "./programmeLinkModel";
import {useProgrammeLinkRead} from "./useProgrammeLinkRead";

export function ProgrammeItineraryPage({credential}: {credential: ProgrammeLinkCredential | null}) {
  const read = useProgrammeLinkRead("itinerary", credential, getProgramHouseholdRsvpView);
  return <ProgrammeItineraryView credential={credential} {...read} />;
}

/**
 * A household's weekend (web only, no app), drawn as the RbProgItinerary
 * board: the kicker and greeting, Add to calendar and Change our reply,
 * getting there, where they stay, a timeline per day of the functions they
 * said yes or maybe to, and going home. It reads the household RSVP view, so
 * it shows only what the household itself sent and was invited to.
 */
export function ProgrammeItineraryView({credential, screen, refresh, refreshing}: {
  credential: ProgrammeLinkCredential | null;
  screen: ProgrammeLinkScreen<View>;
  refresh: () => void;
  refreshing: boolean;
}) {
  return (
    <ProgrammeLinkFrame
      branding={screen.kind === "ready" ? screen.view.branding : undefined}
      refresh={refresh} refreshing={refreshing} screen={screen}
      title={screen.kind === "ready" ? screen.view.programTitle : null}>
      {(view) => <ItineraryReady credential={credential} view={view} />}
    </ProgrammeLinkFrame>
  );
}

/** "Fri 11 Dec · AI 471 lands 11:40 am", as the board writes a journey. */
function legTitle(leg: ItineraryLeg, zone: string, when: (time: string) => string): string {
  if (leg.atMillis === null) return copy.flight(leg.flight);
  const time = when(programmeTime(leg.atMillis, zone));
  return `${programmeDay(leg.atMillis, zone)} · ${[leg.flight, time].filter(Boolean).join(" ")}`;
}

function ItineraryReady({credential, view}: {credential: ProgrammeLinkCredential | null; view: View}) {
  const itinerary = itineraryOf(view);
  const zone = view.timezone;
  const icsUrl = credential ? programHouseholdItineraryIcsUrl(credential.token) : null;
  const replyHref = credential ? `/rsvp/${encodeURIComponent(credential.token)}/` : undefined;
  return (
    <>
      <CatchStack gap={4}>
        <CatchText tone="secondary" variant="label-kicker">{copy.kicker}</CatchText>
        <CatchText as="h1" variant="page-title">{copy.title(view.householdLabel)}</CatchText>
      </CatchStack>
      <CatchStack direction="row" equal gap={8}>
        {icsUrl ? <CatchButton fill href={icsUrl} label={copy.addToCalendar} leadingIcon="addToCalendar" /> : null}
        {replyHref ? <CatchButton fill href={replyHref} label={copy.changeReply} variant="secondary" /> : null}
      </CatchStack>
      {itinerary.arrivals.length > 0 ? (
        <CatchSection container="tile" title={copy.gettingThere}>
          {itinerary.arrivals.map((leg) => (
            <CatchIndexRow density="regular" icon="arrivals" iconTone={programmeFormat(view.branding)} key={leg.key}
              meta={copy.passengers(leg.passengers)} subtitle={copy.whoIsComing(leg.names)}
              title={legTitle(leg, zone, copy.lands)} wrap />
          ))}
        </CatchSection>
      ) : null}
      {itinerary.hotels.length > 0 ? (
        <CatchSection container="tile" title={copy.staying}>
          {itinerary.hotels.map((hotel) => (
            <CatchIndexRow density="regular" icon="hotel" key={hotel.key} subtitle={copy.whoIsComing(hotel.names)}
              title={copy.stayingAt(hotel.name)} wrap />
          ))}
        </CatchSection>
      ) : null}
      {itinerary.functions.length > 0 ? programmeDays(itinerary.functions, (fn) => fn.startsAtMillis, zone).map(({day, items}) => (
        <CatchSection dividers="none" key={day} timeline title={day}>
          {items.map((fn) => (
            <CatchIndexRow density="compact" key={fn.functionId} marker={{tone: "format", size: 12}}
              meta={fn.meta ?? undefined} status={fn.maybe ? copy.maybe : undefined}
              subtitle={[fn.venueName, fn.dressCode ? copy.wear(fn.dressCode) : null].filter(Boolean).join(" · ") || undefined}
              time={programmeTime(fn.startsAtMillis, zone)} title={fn.name} wrap />
          ))}
        </CatchSection>
      )) : (
        <CatchSurface block="tile">
          <CatchText as="h2" variant="title-row">{copy.nothingYet}</CatchText>
          <CatchText tone="secondary" variant="body-small">{copy.nothingYetBody}</CatchText>
          {replyHref ? <CatchStack align="start"><CatchButton href={replyHref} label={copy.reply} size="sm" /></CatchStack> : null}
        </CatchSurface>
      )}
      {itinerary.departures.length > 0 ? (
        <CatchSection container="tile" title={copy.goingHome}>
          {itinerary.departures.map((leg) => (
            <CatchIndexRow density="regular" icon="forward" key={leg.key} subtitle={copy.whoIsComing(leg.names)}
              title={legTitle(leg, zone, copy.leaves)} wrap />
          ))}
        </CatchSection>
      ) : null}
    </>
  );
}
