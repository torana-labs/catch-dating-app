import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {validateCallableWithAjv} from "../shared/validation";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {
  dutyAssignments,
  dutyCoversHotel,
  programProjectionExpiresAt,
  requireProgramAccess,
} from "../shared/programAuthority";
import {defaultProgramDataDeps} from "../shared/programDataDeps";
import type {ProgramDataDeps} from "../shared/programDataDeps";
import type {GetProgramDeparturesRosterCallablePayload} from
  "../shared/generated/getProgramDeparturesRosterCallablePayload";
import type {ProgramDeparturesRosterCallableResponse} from
  "../shared/generated/programDeparturesRosterCallableResponse";
import {validateGetProgramDeparturesRosterCallablePayload} from
  "../shared/generated/validators/getProgramDeparturesRosterInput";

/* firestore-index: programTravelLegs (
  programId:ASCENDING,
  organizerId:ASCENDING,
  destinationHotelId:ASCENDING,
  kind:ASCENDING
) */
/* firestore-index: programStays (
  programId:ASCENDING,
  organizerId:ASCENDING,
  hotelId:ASCENDING
) */

const DEPARTURE_CAP = 500;
const HOUR = 60 * 60 * 1000;
/** Without a reviewed curb time, the car leaves this long before the
 *  flight. */
export const DEFAULT_DEPARTURE_LEAD_MILLIS = 3 * HOUR;
/** "Leaving soon" looks this far ahead. */
const SOON_WINDOW_MILLIS = 3 * HOUR;

type Row = ProgramDeparturesRosterCallableResponse["rows"][number];

interface DepartureLeg {
  id: string;
  guestId: string;
  partyId: string | null;
  passengers: number;
  luggageUnits: number;
  flightNumber: string | null;
  flightAtMillis: number | null;
  manualCurbAtMillis: number | null;
  readiness: string;
  pickupPointId: string | null;
  revision: number;
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

/** Desk counts over [rows] at [nowMillis]. */
export function departureCounts(rows: ReadonlyArray<Row>, nowMillis: number):
  Pick<ProgramDeparturesRosterCallableResponse,
    "checkedOut" | "leavingSoon" | "lateCheckouts"> {
  const here = rows.filter((row) => row.state !== "left");
  return {
    checkedOut: rows.filter((row) => row.state === "checkedOut").length,
    leavingSoon: here.filter((row) => row.leaveByMillis !== null &&
      row.leaveByMillis >= nowMillis &&
      row.leaveByMillis <= nowMillis + SOON_WINDOW_MILLIS).length,
    lateCheckouts: here.filter((row) => row.state === "inRoom" &&
      row.leaveByMillis !== null && row.leaveByMillis < nowMillis).length,
  };
}

/**
 * One hotel's departures desk, the mirror of the arrivals roster: every
 * outbound journey whose hotel is this one, with the guest's room and
 * whether they have checked out. Hotel desk staff see only hotels their
 * duty covers; managers see every hotel.
 */
export async function getProgramDeparturesRosterHandler(
  request: CallableRequest<unknown>,
  deps: ProgramDataDeps = defaultProgramDataDeps,
): Promise<ProgramDeparturesRosterCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<GetProgramDeparturesRosterCallablePayload>(
      request, validateGetProgramDeparturesRosterCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "getProgramDeparturesRoster", {
    maxRequests: 120, windowMs: 60 * 1000,
  });
  const now = deps.now();
  const access = await requireProgramAccess({
    db, programId: data.programId, actorUid, now,
  });
  const hotelDuties = dutyAssignments(access, "hotelDesk")
    .filter((duty) => dutyCoversHotel([duty], data.hotelId));
  if (access.role !== "manager" && hotelDuties.length === 0) {
    throw new HttpsError("permission-denied",
      "This hotel is outside your assigned scope.");
  }
  const organizerId = access.program.organizerId;
  const hotelSnap = await db.collection("programHotels")
    .doc(data.hotelId).get();
  const hotel = hotelSnap.data() as Record<string, unknown> | undefined;
  if (!hotel || hotel.programId !== data.programId ||
      hotel.organizerId !== organizerId) {
    throw new HttpsError("not-found", "Hotel not found in this program.");
  }
  const [legSnap, staySnap] = await Promise.all([
    db.collection("programTravelLegs")
      .where("programId", "==", data.programId)
      .where("organizerId", "==", organizerId)
      .where("destinationHotelId", "==", data.hotelId)
      .where("kind", "==", "outbound")
      .limit(DEPARTURE_CAP + 1).get(),
    db.collection("programStays")
      .where("programId", "==", data.programId)
      .where("organizerId", "==", organizerId)
      .where("hotelId", "==", data.hotelId)
      .limit(DEPARTURE_CAP * 2).get(),
  ]);
  if (legSnap.docs.length > DEPARTURE_CAP) {
    throw new HttpsError("resource-exhausted",
      "This departures view exceeds 500 journeys.");
  }
  const legs: DepartureLeg[] = legSnap.docs.flatMap((doc) => {
    const leg = doc.data() as Record<string, unknown>;
    if (leg.organizerId !== organizerId || leg.anonymizedAt) return [];
    return [{
      id: doc.id,
      guestId: String(leg.guestId),
      partyId: typeof leg.partyId === "string" ? leg.partyId : null,
      passengers: typeof leg.passengers === "number" ? leg.passengers : 1,
      luggageUnits: typeof leg.luggageUnits === "number" ?
        leg.luggageUnits : 0,
      flightNumber: typeof leg.flightNumber === "string" ?
        leg.flightNumber : null,
      flightAtMillis: leg.scheduledArrivalAt ?
        staffTimestampMillis(leg.scheduledArrivalAt) : null,
      manualCurbAtMillis: leg.manualCurbAt ?
        staffTimestampMillis(leg.manualCurbAt) : null,
      readiness: String(leg.readiness ?? "expected"),
      pickupPointId: typeof leg.pickupPointId === "string" ?
        leg.pickupPointId : null,
      revision: typeof leg.revision === "number" ? leg.revision : 1,
    }];
  });
  // The latest stay per guest at this hotel carries the room and status.
  const stays = new Map<string, {room: string | null; status: string;
    endsAt: number}>();
  for (const doc of staySnap.docs) {
    const stay = doc.data() as Record<string, unknown>;
    if (stay.organizerId !== organizerId || stay.status === "cancelled" ||
        typeof stay.guestId !== "string") continue;
    const endsAt = staffTimestampMillis(stay.endsAt);
    const current = stays.get(stay.guestId);
    if (current && current.endsAt >= endsAt) continue;
    stays.set(stay.guestId, {
      room: typeof stay.roomLabel === "string" ? stay.roomLabel : null,
      status: String(stay.status ?? "held"),
      endsAt,
    });
  }
  const guestIds = [...new Set(legs.map((leg) => leg.guestId))];
  const partyIds = [...new Set(legs.map((leg) => leg.partyId)
    .filter((id): id is string => id !== null))];
  const [guestSnaps, partySnaps] = await Promise.all([
    Promise.all(guestIds.map((id) =>
      db.collection("programGuests").doc(id).get())),
    Promise.all(partyIds.map((id) =>
      db.collection("programTravelParties").doc(id).get())),
  ]);
  const names = new Map<string, string>();
  for (const snap of guestSnaps) {
    const guest = snap.data() as Record<string, unknown> | undefined;
    if (guest && guest.programId === data.programId &&
        guest.organizerId === organizerId &&
        typeof guest.displayName === "string") {
      names.set(snap.id, guest.displayName);
    }
  }
  const parties = new Map<string, string>();
  for (const snap of partySnaps) {
    const party = snap.data() as Record<string, unknown> | undefined;
    if (party && party.programId === data.programId &&
        party.organizerId === organizerId &&
        typeof party.label === "string") {
      parties.set(snap.id, party.label);
    }
  }
  const rows: Row[] = legs.map((leg) => {
    const stay = stays.get(leg.guestId) ?? null;
    return {
      legId: leg.id,
      guestId: leg.guestId,
      guestDisplayName: names.get(leg.guestId) ?? "Guest",
      partyLabel: leg.partyId ? parties.get(leg.partyId) ?? null : null,
      passengers: leg.passengers,
      luggageUnits: leg.luggageUnits,
      flightNumber: leg.flightNumber,
      flightAtMillis: leg.flightAtMillis,
      leaveByMillis: departureLeaveBy(leg),
      roomLabel: stay?.room ?? null,
      state: departureState(leg, stay?.status ?? null),
      revision: leg.revision,
    };
  }).sort((a, b) => (a.leaveByMillis ?? Number.MAX_SAFE_INTEGER) -
    (b.leaveByMillis ?? Number.MAX_SAFE_INTEGER) ||
    a.legId.localeCompare(b.legId));
  return {
    programId: data.programId,
    hotelId: data.hotelId,
    hotelName: typeof hotel.name === "string" ? hotel.name : "",
    generatedAtMillis: now.toMillis(),
    accessExpiresAtMillis: programProjectionExpiresAt(access, hotelDuties),
    rows,
    ...departureCounts(rows, now.toMillis()),
  };
}

export const getProgramDeparturesRoster = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 40}),
  (request) => getProgramDeparturesRosterHandler(request),
);
