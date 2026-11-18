import {isDeepStrictEqual} from "node:util";
import * as logger from "firebase-functions/logger";
import type {
  OrganizerProgramDocument,
  ProgramGuestDocument,
  ProgramHotelInboundViewDocument,
  ProgramTravelLegDocument,
  ProgramTripViewDocument,
  TransportTripDocument,
} from "../shared/generated/firestoreAdminTypes";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {legTiming} from "../transport/travelLegTiming";
import {projectTripManifest, readTripDispatchSnapshot} from
  "../transport/tripManifestProjection";

export const programTripViewsCollection = "programTripViews";
export const programHotelInboundViewsCollection = "programHotelInboundViews";

/** The key a trip with no destination hotel carries in a view. */
export const noHotelKey = "~";

/**
 * One trip's row, exactly as listProgramTrips returns it: the vehicle, plate,
 * vendor name, status, times, passenger count and the manifest's guest names
 * (from the recorded dispatch snapshot when there is one), plus the pickup
 * and hotel keys rules match. The trip's notes, rate, driver and account ids
 * stay in the source.
 * @param {string} tripId The trip document id.
 * @param {FirebaseFirestore.DocumentData|undefined} data The trip.
 * @param {ReadonlyMap<string, ProgramTravelLegDocument>} legs The legs of
 *   a legacy trip.
 * @param {ReadonlyMap<string, ProgramGuestDocument>} guests Their guests.
 * @return {ProgramTripViewDocument|null} The view, or null when absent.
 */
export function programTripView(tripId: string,
  data: FirebaseFirestore.DocumentData | undefined,
  legs: ReadonlyMap<string, ProgramTravelLegDocument>,
  guests: ReadonlyMap<string, ProgramGuestDocument>):
  ProgramTripViewDocument | null {
  if (!data || typeof data.programId !== "string" || !data.programId ||
      typeof data.organizerId !== "string" || !data.organizerId) return null;
  const trip = data as TransportTripDocument;
  const manifest = projectTripManifest(trip, readTripDispatchSnapshot(trip),
    legs, guests);
  return {programId: trip.programId, organizerId: trip.organizerId, tripId,
    pickupPointId: trip.pickupPointId,
    destinationHotelId: trip.destinationHotelId ?? null,
    pickupKey: trip.pickupPointId,
    hotelKey: trip.destinationHotelId ?? noHotelKey,
    destinationLabel: trip.destinationLabel ?? "Unassigned",
    vehicleClassId: trip.vehicleClassId, plateDisplay: trip.plateDisplay,
    vendorId: trip.vendorId ?? null,
    vendorName: trip.vendorNameSnapshot ?? null, kind: trip.kind,
    status: trip.status, passengerCount: trip.passengerCount,
    departedAtMillis: staffTimestampMillis(trip.departedAt),
    arrivedAtMillis: trip.arrivedAt ?
      staffTimestampMillis(trip.arrivedAt) : null,
    voidReason: trip.voidReason ?? null, ...manifest,
    revision: trip.revision, version: 1};
}

/**
 * The hotel desk's expected-guest row of one inbound journey that is still
 * expected or ready, exactly as getProgramHotelInbound returns it.
 * @param {string} legId The leg document id.
 * @param {FirebaseFirestore.DocumentData|undefined} data The leg.
 * @param {OrganizerProgramDocument["transportSettings"]|undefined} settings
 *   The programme's transport settings.
 * @param {{guestName: string|undefined, partyLabel: string|null}} context
 *   The documents the row reads.
 * @return {ProgramHotelInboundViewDocument|null} The row, or null.
 */
export function programHotelInboundView(legId: string,
  data: FirebaseFirestore.DocumentData | undefined,
  settings: OrganizerProgramDocument["transportSettings"] | undefined,
  context: {guestName: string | undefined; partyLabel: string | null}):
  ProgramHotelInboundViewDocument | null {
  if (!data || !settings || data.kind !== "inbound" ||
      typeof data.programId !== "string" ||
      typeof data.organizerId !== "string" ||
      typeof data.destinationHotelId !== "string" ||
      !data.destinationHotelId ||
      !["expected", "ready"].includes(String(data.readiness))) return null;
  const leg = data as ProgramTravelLegDocument;
  const timing = legTiming(leg, settings);
  return {programId: leg.programId, organizerId: leg.organizerId, legId,
    hotelId: data.destinationHotelId,
    guestDisplayName: context.guestName ?? "Guest",
    partyLabel: context.partyLabel, passengers: leg.passengers,
    curbAtMillis: timing.kind === "available" ? timing.curbAtMillis : null,
    readiness: leg.readiness as "expected" | "ready", version: 1};
}

const own = <T extends {programId?: string; organizerId?: string}>(
  doc: T | undefined, programId: string, organizerId: string) =>
    doc && doc.programId === programId && doc.organizerId === organizerId ?
      doc : undefined;

/** One trip's view from current sources, read only. */
export async function readProgramTripView(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction, tripId: string):
  Promise<ProgramTripViewDocument | null> {
  const tripSnap = await tx.get(
    db.collection("transportTrips").doc(tripId));
  const trip = tripSnap.data() as TransportTripDocument | undefined;
  if (!trip) return null;
  const legs = new Map<string, ProgramTravelLegDocument>();
  const guests = new Map<string, ProgramGuestDocument>();
  // Only a legacy trip (no recorded manifest) reads its journeys and guests.
  if (trip.dispatchSnapshot === undefined) {
    const snaps = await Promise.all(trip.legIds.slice(0, 50).map((id) =>
      tx.get(db.collection("programTravelLegs").doc(id))));
    for (const snap of snaps) {
      const leg = snap.data() as ProgramTravelLegDocument | undefined;
      if (leg) legs.set(snap.id, leg);
    }
    const guestSnaps = await Promise.all([...new Set(
      [...legs.values()].map((leg) => leg.guestId))].map((id) =>
      tx.get(db.collection("programGuests").doc(id))));
    for (const snap of guestSnaps) {
      const guest = own(snap.data() as ProgramGuestDocument | undefined,
        trip.programId, trip.organizerId);
      if (guest) guests.set(snap.id, guest);
    }
  }
  return programTripView(tripId, trip, legs, guests);
}

/** One hotel inbound row from current sources, read only. */
export async function readProgramHotelInboundView(
  db: FirebaseFirestore.Firestore, tx: FirebaseFirestore.Transaction,
  legId: string): Promise<ProgramHotelInboundViewDocument | null> {
  const legSnap = await tx.get(db.collection("programTravelLegs").doc(legId));
  const leg = legSnap.data();
  if (!leg || typeof leg.programId !== "string") return null;
  const [program, guest, party] = await Promise.all([
    tx.get(db.collection("organizerPrograms").doc(leg.programId)),
    tx.get(db.collection("programGuests").doc(String(leg.guestId))),
    leg.partyId ? tx.get(db.collection("programTravelParties")
      .doc(leg.partyId)) : Promise.resolve(null),
  ]);
  const guestData = own(guest.data() as ProgramGuestDocument | undefined,
    leg.programId, leg.organizerId);
  const partyData = own(party?.data() as
    {programId?: string; organizerId?: string; label?: string} | undefined,
  leg.programId, leg.organizerId);
  return programHotelInboundView(legId, leg,
    (program.data() as OrganizerProgramDocument | undefined)
      ?.transportSettings, {guestName: guestData?.displayName,
      partyLabel: partyData?.label ?? null});
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

/** Rewrites one trip's view, writing only on change. */
export function reconcileProgramTripView(db: FirebaseFirestore.Firestore,
  tripId: string): Promise<void> {
  return reconcile(db, programTripViewsCollection, tripId,
    "Programme trip view", (tx) => readProgramTripView(db, tx, tripId));
}

/** Rewrites one journey's hotel inbound row, writing only on change. */
export function reconcileProgramHotelInboundView(
  db: FirebaseFirestore.Firestore, legId: string): Promise<void> {
  return reconcile(db, programHotelInboundViewsCollection, legId,
    "Programme hotel inbound view",
    (tx) => readProgramHotelInboundView(db, tx, legId));
}
