import {CatchButton, CatchIndexRow, CatchSection, CatchStack, CatchSurface, CatchText} from "@catch/web-ui";
import {getProgramDriverTrip, type ProgramDriverTripCallableResponse} from "../../firebase";
import {programmeDriverTripCopy as copy} from "../../content/programmes";
import {ProgrammeLinkFrame} from "./ProgrammeLinkFrame";
import {programmeTime, type ProgrammeLinkCredential, type ProgrammeLinkScreen} from "./programmeLinkModel";
import {useProgrammeLinkRead} from "./useProgrammeLinkRead";

export type DriverTripView = ProgramDriverTripCallableResponse;

export function ProgrammeDriverTripPage({credential}: {credential: ProgrammeLinkCredential | null}) {
  const read = useProgrammeLinkRead("trip", credential, getProgramDriverTrip);
  return <ProgrammeDriverTripView {...read} />;
}

/** Directions from the pickup to the drop, by place names alone; nothing about the passengers. */
export function driverDirectionsUrl(trip: DriverTripView): string | null {
  if (!trip.destinationLabel) return null;
  const query = new URLSearchParams({api: "1", destination: trip.destinationLabel, travelmode: "driving"});
  if (trip.pickupLabel) query.set("origin", trip.pickupLabel);
  return `https://www.google.com/maps/dir/?${query.toString()}`;
}

/**
 * A driver's trip (web only, no app), drawn as the RbProgDriver board: the
 * trip, car and plate, the route as a title, the pickup and drop tile, the
 * passengers with their party sizes and bags, and Directions. The read
 * carries passenger names and counts only: no phone numbers or flights.
 */
export function ProgrammeDriverTripView({screen, refresh, refreshing}: {
  screen: ProgrammeLinkScreen<DriverTripView>;
  refresh: () => void;
  refreshing: boolean;
}) {
  return (
    <ProgrammeLinkFrame refresh={refresh} refreshing={refreshing} screen={screen}
      title={screen.kind === "ready" ? copy.topBar(screen.view.programTitle) : null}>
      {(trip) => {
        const directions = driverDirectionsUrl(trip);
        const kicker = [copy.trip(trip.tripId), trip.vehicleClassLabel, trip.plateDisplay]
          .filter((part): part is string => Boolean(part));
        const seats = trip.passengers.reduce((sum, party) => sum + party.passengers, 0);
        return (
          <>
            <CatchStack gap={4}>
              <CatchText tone="secondary" variant="label-kicker">{copy.kicker(kicker)}</CatchText>
              <CatchText as="h1" variant="page-title">{copy.title(trip.pickupLabel, trip.destinationLabel)}</CatchText>
            </CatchStack>
            <CatchSurface block="tile">
              {trip.pickupLabel ? (
                <CatchIndexRow density="compact" icon="arrivals" title={copy.pickup(trip.pickupLabel)} wrap
                  subtitle={trip.departedAtMillis === null ? copy.notLeft : copy.left(programmeTime(trip.departedAtMillis))} />
              ) : null}
              {trip.destinationLabel ? (
                <CatchIndexRow density="compact" icon="hotel" status={copy.status[trip.status]}
                  title={copy.drop(trip.destinationLabel)} wrap />
              ) : null}
            </CatchSurface>
            <CatchSection note={copy.seats(Math.max(seats, trip.passengerCount))} title={copy.passengers}>
              {trip.passengers.map((party, index) => (
                <CatchIndexRow density="compact" key={`${party.name}-${index}`} subtitle={copy.bags(party.luggageUnits)}
                  title={copy.party(party.name, party.passengers)} wrap />
              ))}
            </CatchSection>
            {directions ? (
              <CatchButton fill href={directions} label={copy.directions} leadingIcon="directions" newTab variant="secondary" />
            ) : null}
          </>
        );
      }}
    </ProgrammeLinkFrame>
  );
}
