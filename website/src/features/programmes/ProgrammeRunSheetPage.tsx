import {CatchBadge, CatchIndexRow, CatchSection, CatchStack, CatchText, type CatchMarkerProps} from "@catch/web-ui";
import {getProgramVendorRunSheet, type ProgramVendorRunSheetCallableResponse} from "../../firebase";
import {programmeLinkCopy, programmeRunSheetCopy as copy} from "../../content/programmes";
import {ProgrammeLinkFrame} from "./ProgrammeLinkFrame";
import {programmeDayTime, programmeDays, programmeTime, type ProgrammeLinkCredential, type ProgrammeLinkScreen} from "./programmeLinkModel";
import {useProgrammeLinkRead} from "./useProgrammeLinkRead";

export type RunSheetView = ProgramVendorRunSheetCallableResponse;
type RunSheetFunction = RunSheetView["functions"][number];
type CueState = "done" | "now" | "next" | "later";

export function ProgrammeRunSheetPage({credential}: {credential: ProgrammeLinkCredential | null}) {
  const read = useProgrammeLinkRead("runsheet", credential, getProgramVendorRunSheet);
  return <ProgrammeRunSheetView {...read} now={Date.now()} />;
}

/** Each function's place in the evening: done, on now, the next one, or later. */
function cueStates(functions: readonly RunSheetFunction[], now: number): Map<string, CueState> {
  const states = new Map<string, CueState>();
  let nextTaken = false;
  for (const fn of [...functions].sort((a, b) => a.startsAtMillis - b.startsAtMillis)) {
    if (fn.endsAtMillis <= now) states.set(fn.functionId, "done");
    else if (fn.startsAtMillis <= now) states.set(fn.functionId, "now");
    else if (!nextTaken) { states.set(fn.functionId, "next"); nextTaken = true; }
    else states.set(fn.functionId, "later");
  }
  return states;
}

const markers: Record<CueState, CatchMarkerProps> = {
  done: {tone: "muted", size: 12},
  now: {tone: "format", live: true, size: 12},
  next: {tone: "ink", size: 12},
  later: {kind: "ring", size: 12},
};

const statusLabels: Record<CueState, string | undefined> = {done: copy.done, now: copy.now, next: copy.next, later: undefined};

/**
 * A vendor's view-only run sheet (shared link), drawn as the RbProgRunSheet
 * board: the site bar with View only, the vendor and the title, a timeline
 * per day of the programme's functions marked done, now, next and later,
 * and, for a car vendor, the trips booked with them. No guest names or
 * contact details are in the read.
 */
export function ProgrammeRunSheetView({screen, refresh, refreshing, now}: {
  screen: ProgrammeLinkScreen<RunSheetView>;
  refresh: () => void;
  refreshing: boolean;
  now: number;
}) {
  return (
    <ProgrammeLinkFrame actions={<CatchBadge label={programmeLinkCopy.viewOnly} />} refresh={refresh} refreshing={refreshing}
      screen={screen} title={screen.kind === "ready" ? copy.topBar(screen.view.programTitle) : null}>
      {(sheet) => {
        const states = cueStates(sheet.functions, now);
        const zone = sheet.timezone || undefined;
        return (
          <>
            <CatchStack gap={4}>
              <CatchText tone="secondary" variant="label-kicker">{copy.kicker(sheet.vendorName)}</CatchText>
              <CatchText as="h1" variant="page-title">{copy.title}</CatchText>
            </CatchStack>
            {sheet.functions.length === 0 ? <CatchText tone="secondary" variant="body">{copy.nothing}</CatchText> : null}
            {programmeDays(sheet.functions, (fn) => fn.startsAtMillis, zone).map(({day, items}) => (
              <CatchSection dividers="none" key={day} timeline title={day}>
                {items.map((fn) => {
                  const state = states.get(fn.functionId) ?? "later";
                  return (
                    <CatchIndexRow density="compact" key={fn.functionId} marker={markers[state]} status={statusLabels[state]}
                      subtitle={fn.venueName || undefined} time={programmeTime(fn.startsAtMillis, zone)} title={fn.name} wrap />
                  );
                })}
              </CatchSection>
            ))}
            {sheet.trips.length > 0 ? (
              <CatchSection note={copy.tripsNote(sheet.trips.length)} title={copy.trips}>
                {[...sheet.trips].sort((a, b) => (a.departedAtMillis ?? 0) - (b.departedAtMillis ?? 0)).map((trip) => (
                  <CatchIndexRow density="compact" key={trip.tripId}
                    meta={trip.departedAtMillis === null ? undefined : programmeDayTime(trip.departedAtMillis, zone)}
                    status={copy.status[trip.status]} statusTone={trip.status === "arrived" ? "success" : "secondary"}
                    subtitle={copy.tripSubtitle(trip.plateDisplay, trip.passengerCount)}
                    title={copy.tripTitle(trip.pickupLabel, trip.destinationLabel)} wrap />
                ))}
              </CatchSection>
            ) : null}
          </>
        );
      }}
    </ProgrammeLinkFrame>
  );
}
