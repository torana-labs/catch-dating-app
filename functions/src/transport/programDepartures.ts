import type {ProgramDepartureViewDocument} from
  "../shared/generated/firestoreAdminTypes";

// Departure desk rules the programDepartureViews read model applies.

const HOUR = 60 * 60 * 1000;
/** Without a reviewed curb time, the car leaves this long before the
 *  flight. */
export const DEFAULT_DEPARTURE_LEAD_MILLIS = 3 * HOUR;

type Row = ProgramDepartureViewDocument;

interface DepartureLeg {
  flightAtMillis: number | null;
  manualCurbAtMillis: number | null;
  readiness: string;
  pickupPointId: string | null;
}

/** The leave-by time: the reviewed curb time, else the default lead. */
export function departureLeaveBy(leg: Pick<DepartureLeg,
  "manualCurbAtMillis" | "flightAtMillis">): number | null {
  if (leg.manualCurbAtMillis !== null) return leg.manualCurbAtMillis;
  return leg.flightAtMillis === null ? null :
    leg.flightAtMillis - DEFAULT_DEPARTURE_LEAD_MILLIS;
}

/** A departure's desk state from its journey and its stay. */
export function departureState(
  leg: Pick<DepartureLeg, "readiness" | "pickupPointId">,
  stayStatus: string | null,
): Row["state"] {
  if (leg.readiness === "dispatched" || leg.readiness === "arrived") {
    return "left";
  }
  if (stayStatus === "checkedOut") return "checkedOut";
  if (leg.pickupPointId === null) return "carNotNeeded";
  return "inRoom";
}
