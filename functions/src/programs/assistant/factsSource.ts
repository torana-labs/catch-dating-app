/* eslint-disable max-len */
// Reads one household's own records for the fact pack. Every query is
// keyed by the programme and the household's member guest ids; no read
// returns another household's guests, stays or travel.

import {staffTimestampMillis} from "../../shared/eventOperatorAuthority";
import type {
  FactFunctionGuestInput,
  FactFunctionInput,
  FactHotelInput,
  FactMemberInput,
  FactPackInput,
  FactPickupPointInput,
  FactStayInput,
  FactTravelLegInput,
} from "./facts";

const IN_LIMIT = 30;
const MAX_MEMBERS = 30;

type Data = Record<string, unknown>;

const str = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value : null;
const millisOrNull = (value: unknown): number | null =>
  value === null || value === undefined ? null : staffTimestampMillis(value) || null;

function chunks<T>(values: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

async function byMembers(db: FirebaseFirestore.Firestore, collection: string,
  programId: string, guestIds: string[]): Promise<Array<{id: string; data: Data}>> {
  const snaps = await Promise.all(chunks(guestIds, IN_LIMIT).map((ids) =>
    db.collection(collection).where("programId", "==", programId)
      .where("guestId", "in", ids).limit(200).get()));
  return snaps.flatMap((snap) => snap.docs.map((doc) =>
    ({id: doc.id, data: doc.data() as Data})));
}

export class FactSourceError extends Error {}

/**
 * Loads the fact pack input for [householdId] (or the programme-only pack
 * when null). Throws FactSourceError when the programme or household is
 * missing, archived, anonymised or not this programme's.
 */
export async function loadFactPackInput(db: FirebaseFirestore.Firestore,
  programId: string, householdId: string | null): Promise<FactPackInput> {
  const programSnap = await db.collection("organizerPrograms").doc(programId).get();
  const program = programSnap.data() as Data | undefined;
  if (!program || program.status === "archived" || program.anonymizedAt) {
    throw new FactSourceError("program unavailable");
  }
  const organizerId = program.organizerId;
  let household: FactPackInput["household"] = null;
  if (householdId !== null) {
    const snap = await db.collection("programHouseholds").doc(householdId).get();
    const data = snap.data() as Data | undefined;
    if (!data || data.programId !== programId || data.organizerId !== organizerId ||
        data.anonymizedAt) {
      throw new FactSourceError("household unavailable");
    }
    const memberGuestIds = (Array.isArray(data.memberGuestIds) ?
      data.memberGuestIds : []).filter((id): id is string =>
      typeof id === "string" && id !== "").slice(0, MAX_MEMBERS);
    household = {householdId, label: String(data.label ?? ""), memberGuestIds};
  }
  const memberIds = household?.memberGuestIds ?? [];
  const sameProgram = (row: Data) => row.programId === programId &&
    row.organizerId === organizerId;

  const [memberSnaps, functionSnap, hotelSnap, pickupSnap, rows, stays, legs] =
    await Promise.all([
      Promise.all(memberIds.map((id) => db.collection("programGuests").doc(id).get())),
      db.collection("programFunctions").where("programId", "==", programId)
        .limit(80).get(),
      db.collection("programHotels").where("programId", "==", programId)
        .limit(50).get(),
      memberIds.length ? db.collection("programPickupPoints")
        .where("programId", "==", programId).limit(100).get() : Promise.resolve(null),
      memberIds.length ? byMembers(db, "programFunctionGuests", programId, memberIds) :
        Promise.resolve([]),
      memberIds.length ? byMembers(db, "programStays", programId, memberIds) :
        Promise.resolve([]),
      memberIds.length ? byMembers(db, "programTravelLegs", programId, memberIds) :
        Promise.resolve([]),
    ]);

  const members: FactMemberInput[] = memberSnaps.flatMap((snap) => {
    const data = snap.data() as Data | undefined;
    if (!data || !sameProgram(data) || data.householdId !== householdId ||
        data.anonymizedAt) return [];
    return [{guestId: snap.id, displayName: String(data.displayName ?? ""),
      invitationStatus: data.invitationStatus as FactMemberInput["invitationStatus"],
      rsvpStatus: data.rsvpStatus as FactMemberInput["rsvpStatus"]}];
  });
  const functions: FactFunctionInput[] = functionSnap.docs.flatMap((doc) => {
    const data = doc.data() as Data;
    if (!sameProgram(data)) return [];
    return [{functionId: doc.id, name: String(data.name ?? ""),
      startsAtMillis: staffTimestampMillis(data.startsAt),
      endsAtMillis: staffTimestampMillis(data.endsAt),
      venueName: str(data.venueName),
      status: data.status as FactFunctionInput["status"],
      dressCode: str(data.dressCode), instructions: str(data.instructions),
      invitationMode: data.invitationMode === "selectedGuests" ?
        "selectedGuests" : "allGuests"}];
  });
  const functionGuests: FactFunctionGuestInput[] = rows.flatMap(({data}) =>
    sameProgram(data) ? [{functionId: String(data.functionId),
      guestId: String(data.guestId), invited: data.invited === true,
      rsvpStatus: data.rsvpStatus as FactFunctionGuestInput["rsvpStatus"],
      partySize: typeof data.partySize === "number" ? data.partySize : null}] : []);
  const stayRows: FactStayInput[] = stays.flatMap(({data}) =>
    sameProgram(data) ? [{guestId: String(data.guestId), hotelId: String(data.hotelId),
      roomLabel: str(data.roomLabel), startsAtMillis: millisOrNull(data.startsAt),
      endsAtMillis: millisOrNull(data.endsAt),
      status: data.status as FactStayInput["status"]}] : []);
  const hotels: FactHotelInput[] = hotelSnap.docs.flatMap((doc) => {
    const data = doc.data() as Data;
    return sameProgram(data) ? [{hotelId: doc.id, name: String(data.name ?? ""),
      address: str(data.address), active: data.active !== false}] : [];
  });
  const travelLegs: FactTravelLegInput[] = legs.flatMap(({id, data}) =>
    sameProgram(data) ? [{legId: id, guestId: String(data.guestId),
      kind: String(data.kind ?? ""), flightNumber: str(data.flightNumber),
      originIata: str(data.originIata), destinationIata: str(data.destinationIata),
      scheduledArrivalAtMillis: millisOrNull(data.scheduledArrivalAt),
      estimatedArrivalAtMillis: millisOrNull(data.estimatedArrivalAt),
      flightStatus: str(data.flightStatus), pickupPointId: str(data.pickupPointId),
      destinationHotelId: str(data.destinationHotelId),
      destinationLabel: str(data.destinationLabel)}] : []);
  const pickupPoints: FactPickupPointInput[] = (pickupSnap?.docs ?? []).flatMap((doc) => {
    const data = doc.data() as Data;
    return sameProgram(data) ? [{pickupPointId: doc.id, label: String(data.label ?? ""),
      terminal: str(data.terminal), meetingZone: str(data.meetingZone),
      instructions: str(data.instructions), active: data.active !== false}] : [];
  });

  return {
    program: {programId, title: String(program.title ?? ""),
      timezone: String(program.timezone ?? "UTC"),
      startsAtMillis: millisOrNull(program.startsAt),
      endsAtMillis: millisOrNull(program.endsAt)},
    household, members, functions, functionGuests, stays: stayRows, hotels,
    travelLegs, pickupPoints,
  };
}
