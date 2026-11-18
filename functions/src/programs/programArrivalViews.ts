/* firestore-index: programStays (
  programId:ASCENDING,
  organizerId:ASCENDING,
  hotelId:ASCENDING,
  guestId:ASCENDING
) */
import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  OrganizerProgramDocument,
  ProgramArrivalViewDocument,
  ProgramDepartureViewDocument,
  ProgramGuestDocument,
  ProgramHotelDocument,
  ProgramTravelLegDocument,
  ProgramTravelPartyDocument,
  ProgramVendorViewDocument,
  TransportVendorDocument,
} from "../shared/generated/firestoreAdminTypes";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {programStaffGrantId} from "../shared/programAuthority";
import {legTiming} from "../transport/travelLegTiming";
import {departureLeaveBy, departureState} from
  "../transport/programDepartures";

export const programArrivalViewsCollection = "programArrivalViews";
export const programDepartureViewsCollection = "programDepartureViews";
export const programVendorViewsCollection = "programVendorViews";

/** Journeys the arrivals roster lists, as the callable's query did. */
export const arrivalReadiness: ReadonlyArray<string> =
  ["expected", "ready", "disrupted"];

/** The key a journey with no pickup point or hotel carries in a view. */
export const noKey = "~";

export const programVendorViewId = (programId: string, vendorId: string) =>
  `${programId}__${vendorId}`;

type Settings = OrganizerProgramDocument["transportSettings"];

/** Everything an arrivals row reads besides the leg itself. */
export interface ArrivalContext {
  guest: ProgramGuestDocument | undefined;
  party: ProgramTravelPartyDocument | undefined;
  /** The guests of the party's journeys that are on the roster. */
  partyGuestIds: string[];
  hotel: ProgramHotelDocument | undefined;
  claimantName: string | null;
}

/**
 * The arrivals row of one inbound journey, or null when it is not on the
 * roster: not inbound, not expected, ready or disrupted, or of another
 * organizer. The fields are exactly those getProgramArrivalsRoster returns,
 * plus the claimant's account id and the pickup and hotel keys rules match.
 * @param {string} legId The leg document id.
 * @param {FirebaseFirestore.DocumentData|undefined} data The leg.
 * @param {Settings|undefined} settings The programme's transport settings.
 * @param {ArrivalContext} context The documents the row reads.
 * @return {ProgramArrivalViewDocument|null} The row, or null.
 */
export function programArrivalView(legId: string,
  data: FirebaseFirestore.DocumentData | undefined,
  settings: Settings | undefined, context: ArrivalContext):
  ProgramArrivalViewDocument | null {
  if (!data || !settings || typeof data.programId !== "string" ||
      typeof data.organizerId !== "string" || data.kind !== "inbound" ||
      !arrivalReadiness.includes(String(data.readiness))) return null;
  const leg = data as ProgramTravelLegDocument;
  const timing = legTiming(leg, settings);
  return {programId: leg.programId, organizerId: leg.organizerId, legId,
    guestId: leg.guestId, partyId: leg.partyId ?? null,
    pickupPointId: leg.pickupPointId ?? null,
    pickupKey: leg.pickupPointId ?? noKey,
    hotelKey: leg.destinationHotelId ?? noKey,
    guestDisplayName: context.guest?.displayName ?? "Guest",
    partyLabel: context.party?.label ?? null,
    partyGuestIds: context.party ? context.partyGuestIds : [leg.guestId],
    passengers: leg.passengers, luggageUnits: leg.luggageUnits,
    flightNumber: leg.flightNumber, originIata: leg.originIata,
    arrivalTerminal: leg.arrivalTerminal ?? null,
    flightStatus: leg.flightStatus,
    curbAtMillis: timing.kind === "available" ? timing.curbAtMillis : null,
    curbSource: timing.kind === "available" ? timing.source : null,
    unavailableReason: timing.kind === "unavailable" ? timing.reason : null,
    readiness: leg.readiness,
    claimedByDisplay: leg.claimedByUid ?
      context.claimantName ?? "Staff" : null,
    claimedByUid: leg.claimedByUid ?? null,
    destinationHotelId: leg.destinationHotelId ?? null,
    destinationLabel: leg.destinationHotelId ?
      context.hotel?.name ?? "Unknown hotel" :
      leg.destinationLabel ?? "Unassigned",
    requiredCapabilities: leg.requiredCapabilities,
    dedicatedVehicle: leg.dedicatedVehicle, revision: leg.revision,
    version: 1};
}

/** What a departures row reads besides the leg itself. */
export interface DepartureContext {
  guestName: string | undefined;
  partyLabel: string | null;
  room: string | null;
  stayStatus: string | null;
}

/**
 * The departures row of one outbound journey, or null when it is not on a
 * hotel's desk. Exactly the row getProgramDeparturesRoster returns.
 * @param {string} legId The leg document id.
 * @param {FirebaseFirestore.DocumentData|undefined} data The leg.
 * @param {DepartureContext} context The documents the row reads.
 * @return {ProgramDepartureViewDocument|null} The row, or null.
 */
export function programDepartureView(legId: string,
  data: FirebaseFirestore.DocumentData | undefined,
  context: DepartureContext): ProgramDepartureViewDocument | null {
  if (!data || data.kind !== "outbound" || data.anonymizedAt ||
      typeof data.programId !== "string" ||
      typeof data.organizerId !== "string" ||
      typeof data.destinationHotelId !== "string" ||
      !data.destinationHotelId) return null;
  const leg = {
    manualCurbAtMillis: data.manualCurbAt ?
      staffTimestampMillis(data.manualCurbAt) : null,
    flightAtMillis: data.scheduledArrivalAt ?
      staffTimestampMillis(data.scheduledArrivalAt) : null,
    readiness: String(data.readiness ?? "expected"),
    pickupPointId: typeof data.pickupPointId === "string" ?
      data.pickupPointId : null,
  };
  return {programId: data.programId, organizerId: data.organizerId, legId,
    hotelId: data.destinationHotelId, guestId: String(data.guestId),
    guestDisplayName: context.guestName ?? "Guest",
    partyLabel: context.partyLabel,
    passengers: typeof data.passengers === "number" ? data.passengers : 1,
    luggageUnits: typeof data.luggageUnits === "number" ?
      data.luggageUnits : 0,
    flightNumber: typeof data.flightNumber === "string" ?
      data.flightNumber : null,
    flightAtMillis: leg.flightAtMillis, leaveByMillis: departureLeaveBy(leg),
    roomLabel: context.room, state: departureState(leg, context.stayStatus),
    revision: typeof data.revision === "number" ? data.revision : 1,
    version: 1};
}

/**
 * The vendor as dispatchers see it, one per programme the vendor is bound
 * to: id, name and active, nothing else. Null when the programme is not
 * among the vendor's.
 * @param {string} programId The programme.
 * @param {string} vendorId The vendor document id.
 * @param {FirebaseFirestore.DocumentData|undefined} data The vendor.
 * @return {ProgramVendorViewDocument|null} The view, or null.
 */
export function programVendorView(programId: string, vendorId: string,
  data: FirebaseFirestore.DocumentData | undefined):
  ProgramVendorViewDocument | null {
  if (!data || typeof data.organizerId !== "string" ||
      !Array.isArray(data.programIds) ||
      !data.programIds.includes(programId)) return null;
  const vendor = data as TransportVendorDocument;
  return {programId, organizerId: vendor.organizerId, vendorId,
    name: vendor.name, active: vendor.active, version: 1};
}

/** The party's journeys that are on the arrivals roster, by guest. */
async function partyRosterGuests(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  party: ProgramTravelPartyDocument | undefined): Promise<string[]> {
  const ids = (party?.legIds ?? []).slice(0, 50);
  const snaps = await Promise.all(ids.map((id) =>
    tx.get(db.collection("programTravelLegs").doc(id))));
  return snaps.flatMap((snap) => {
    const leg = snap.data();
    return leg && leg.kind === "inbound" &&
      arrivalReadiness.includes(String(leg.readiness)) ? [leg.guestId] : [];
  });
}

/** One arrivals row from current sources, read only. */
export async function readProgramArrivalView(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, legId: string):
  Promise<ProgramArrivalViewDocument | null> {
  const legSnap = await tx.get(db.collection("programTravelLegs").doc(legId));
  const leg = legSnap.data();
  if (!leg || typeof leg.programId !== "string") return null;
  const program = await tx.get(
    db.collection("organizerPrograms").doc(leg.programId));
  const get = async <T>(collection: string, id: unknown) =>
    typeof id === "string" && id ?
      (await tx.get(db.collection(collection).doc(id))).data() as T |
        undefined : undefined;
  const own = <T extends {programId?: string; organizerId?: string}>(
    doc: T | undefined) => doc && doc.programId === leg.programId &&
      doc.organizerId === leg.organizerId ? doc : undefined;
  const guest = own(await get<ProgramGuestDocument>("programGuests",
    leg.guestId));
  const party = own(await get<ProgramTravelPartyDocument>(
    "programTravelParties", leg.partyId));
  const hotel = own(await get<ProgramHotelDocument>("programHotels",
    leg.destinationHotelId));
  const claimant = leg.claimedByUid ? (await tx.get(db
    .collection("programStaffGrants").doc(programStaffGrantId(leg.programId,
      leg.claimedByUid)))).data() : undefined;
  const claimantName = claimant && claimant.programId === leg.programId &&
    typeof claimant.displayName === "string" && claimant.displayName ?
    claimant.displayName : null;
  return programArrivalView(legId, leg,
    (program.data() as OrganizerProgramDocument | undefined)
      ?.transportSettings, {guest, party,
      partyGuestIds: await partyRosterGuests(db, tx, party), hotel,
      claimantName});
}

/** One departures row from current sources, read only. */
export async function readProgramDepartureView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  legId: string): Promise<ProgramDepartureViewDocument | null> {
  const legSnap = await tx.get(db.collection("programTravelLegs").doc(legId));
  const leg = legSnap.data();
  if (!leg || leg.kind !== "outbound" ||
      typeof leg.destinationHotelId !== "string") return null;
  const [guest, party, stays] = await Promise.all([
    tx.get(db.collection("programGuests").doc(String(leg.guestId))),
    leg.partyId ? tx.get(db.collection("programTravelParties")
      .doc(leg.partyId)) : Promise.resolve(null),
    // One equality filter keeps this off the composite index list; a
    // guest's stays are few, and the programme, organizer and hotel are
    // checked below.
    tx.get(db.collection("programStays")
      .where("guestId", "==", leg.guestId).limit(100)),
  ]);
  // The latest stay at this hotel carries the room and status.
  let room: string | null = null;
  let stayStatus: string | null = null;
  let latestEnd = -1;
  for (const doc of stays.docs) {
    const stay = doc.data();
    if (stay.programId !== leg.programId ||
        stay.organizerId !== leg.organizerId ||
        stay.hotelId !== leg.destinationHotelId ||
        stay.status === "cancelled") continue;
    const endsAt = staffTimestampMillis(stay.endsAt);
    if (endsAt <= latestEnd) continue;
    latestEnd = endsAt;
    room = typeof stay.roomLabel === "string" ? stay.roomLabel : null;
    stayStatus = String(stay.status ?? "held");
  }
  const guestData = guest.data();
  const partyData = party?.data();
  const ownGuest = guestData && guestData.programId === leg.programId &&
    guestData.organizerId === leg.organizerId;
  const ownParty = partyData && partyData.programId === leg.programId &&
    partyData.organizerId === leg.organizerId;
  return programDepartureView(legId, leg, {
    guestName: ownGuest && typeof guestData.displayName === "string" ?
      guestData.displayName : undefined,
    partyLabel: ownParty && typeof partyData.label === "string" ?
      partyData.label : null, room, stayStatus});
}

/** One vendor view from current sources, read only. */
export async function readProgramVendorView(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, programId: string, vendorId: string):
  Promise<ProgramVendorViewDocument | null> {
  const vendor = await tx.get(db.collection("transportVendors")
    .doc(vendorId));
  return programVendorView(programId, vendorId, vendor.data());
}

async function reconcile<T>(db: FirebaseFirestore.Firestore,
  collection: string, id: string, what: string,
  read: (tx: FirebaseFirestore.Transaction) => Promise<T | null>):
  Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(collection).doc(id);
    const old = await tx.get(ref);
    let next: T | null;
    try {
      next = await read(tx);
    } catch (error) {
      logger.warn(`${what} kept a source that fails its contract.`, {id,
        reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/** Rewrites one journey's arrivals row, writing only on change. */
export function reconcileProgramArrivalView(db: FirebaseFirestore.Firestore,
  legId: string): Promise<void> {
  return reconcile(db, programArrivalViewsCollection, legId,
    "Programme arrivals view",
    (tx) => readProgramArrivalView(db, tx, legId));
}

/** Rewrites one journey's departures row, writing only on change. */
export function reconcileProgramDepartureView(
  db: FirebaseFirestore.Firestore, legId: string): Promise<void> {
  return reconcile(db, programDepartureViewsCollection, legId,
    "Programme departures view",
    (tx) => readProgramDepartureView(db, tx, legId));
}

/** Rewrites one vendor's view for one programme, writing only on change. */
export function reconcileProgramVendorView(db: FirebaseFirestore.Firestore,
  programId: string, vendorId: string): Promise<void> {
  return reconcile(db, programVendorViewsCollection,
    programVendorViewId(programId, vendorId), "Programme vendor view",
    (tx) => readProgramVendorView(db, tx, programId, vendorId));
}
