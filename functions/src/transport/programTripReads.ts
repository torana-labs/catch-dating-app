import {FieldPath} from "firebase-admin/firestore";
import {projectTripManifest, readTripDispatchSnapshot, tripIncludesLeg}
  from "./tripManifestProjection";
import {programResourceScopes} from "../shared/programResourceScopes";
/* firestore-index: transportTrips (
  programId:ASCENDING,
  organizerId:ASCENDING,
  pickupPointId:ASCENDING,
  departedAt:DESCENDING
) */
/* firestore-index: transportTrips (
  programId:ASCENDING,
  organizerId:ASCENDING,
  destinationHotelId:ASCENDING,
  departedAt:DESCENDING
) */
/* firestore-index: transportTrips (
  programId:ASCENDING,
  organizerId:ASCENDING,
  pickupPointId:ASCENDING,
  destinationHotelId:ASCENDING,
  departedAt:DESCENDING
) */
/* firestore-index: transportTrips (
  programId:ASCENDING,
  organizerId:ASCENDING,
  destinationHotelId:ASCENDING,
  status:ASCENDING,
  departedAt:ASCENDING
) */
/* firestore-index: programTravelLegs (
  programId:ASCENDING,
  organizerId:ASCENDING,
  destinationHotelId:ASCENDING,
  kind:ASCENDING,
  readiness:ASCENDING
) */
/* firestore-index: transportTrips (
  programId:ASCENDING,
  organizerId:ASCENDING,
  departedAt:DESCENDING
) */
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {validateCallableWithAjv} from "../shared/validation";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {dutyAssignments, dutyCoversHotel, programProjectionExpiresAt,
  requireProgramAccess} from "../shared/programAuthority";
import type {ProgramDutyAssignment} from "../shared/programAuthority";
import {defaultProgramDataDeps} from "../shared/programDataDeps";
import type {ProgramDataDeps} from "../shared/programDataDeps";
import {legTiming} from "./travelLegTiming";
import type {ProgramGuestDocument, ProgramHotelDocument,
  ProgramTravelLegDocument, ProgramTravelPartyDocument, TransportTripDocument}
  from "../shared/generated/firestoreAdminTypes";
import type {GetProgramHotelInboundCallablePayload} from
  "../shared/generated/getProgramHotelInboundCallablePayload";
import type {ListProgramTripsCallablePayload} from
  "../shared/generated/listProgramTripsCallablePayload";
import type {ProgramHotelInboundCallableResponse} from
  "../shared/generated/programHotelInboundCallableResponse";
import type {ProgramTripListCallableResponse} from
  "../shared/generated/programTripListCallableResponse";
import {validateGetProgramHotelInboundCallablePayload} from
  "../shared/generated/validators/getProgramHotelInboundInput";
import {validateListProgramTripsCallablePayload} from
  "../shared/generated/validators/listProgramTripsInput";

const tripPageCap = 50;
const hotelPageCap = 50;
const readLimits = {timeoutSeconds: 60, maxInstances: 40};

export async function getProgramHotelInboundHandler(
  request: CallableRequest<unknown>,
  deps: ProgramDataDeps = defaultProgramDataDeps
): Promise<ProgramHotelInboundCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<GetProgramHotelInboundCallablePayload>(
      request, validateGetProgramHotelInboundCallablePayload,
      normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "getProgramHotelInbound", {
    maxRequests: 120, windowMs: 60 * 1000,
  });
  const access = await requireProgramAccess({
    db, programId: data.programId, actorUid, now: deps.now(),
  });
  const hotelDuties = dutyAssignments(access, "hotelDesk");
  if (access.role !== "manager") {
    if (!dutyCoversHotel(hotelDuties, data.hotelId)) {
      throw new HttpsError(
        "permission-denied",
        "This hotel is outside your assigned scope.");
    }
  }
  const hotelSnap = await db.collection("programHotels")
    .doc(data.hotelId).get();
  const hotel = hotelSnap.data() as ProgramHotelDocument | undefined;
  if (!hotel || hotel.programId !== data.programId ||
      hotel.organizerId !== access.program.organizerId) {
    throw new HttpsError("not-found", "Hotel not found in this program.");
  }
  const limit = data.limit ?? hotelPageCap;
  let tripQuery = db.collection("transportTrips")
    .where("programId", "==", data.programId)
    .where("organizerId", "==", access.program.organizerId)
    .where("destinationHotelId", "==", data.hotelId)
    .where("status", "==", "enRoute")
    .orderBy("departedAt")
    .limit(limit + 1);
  if (data.tripCursor) {
    const cursor = await db.collection("transportTrips")
      .doc(data.tripCursor).get();
    const trip = cursor.data() as TransportTripDocument | undefined;
    // A received vehicle still provides a valid position in departure order.
    if (!trip || trip.programId !== data.programId ||
        trip.organizerId !== access.program.organizerId ||
        trip.destinationHotelId !== data.hotelId) {
      throw new HttpsError("invalid-argument",
        "This vehicle page is unavailable. Refresh the hotel view.");
    }
    tripQuery = tripQuery.startAfter(cursor);
  }
  let expectedQuery = db.collection("programTravelLegs")
    .where("programId", "==", data.programId)
    .where("organizerId", "==", access.program.organizerId)
    .where("destinationHotelId", "==", data.hotelId)
    .where("kind", "==", "inbound")
    .where("readiness", "in", ["expected", "ready"])
    .orderBy(FieldPath.documentId())
    .limit(limit + 1);
  // Document-ID positions survive dispatch, rebooking and deleted rows. The
  // query itself always reapplies this hotel's current ownership and scope.
  if (data.expectedCursor) {
    expectedQuery = expectedQuery.startAfter(data.expectedCursor);
  }
  const [tripsSnap, legsSnap] = await Promise.all([
    tripQuery.get(), expectedQuery.get()]);
  const tripPage = tripsSnap.docs.slice(0, limit);
  const expectedPage = legsSnap.docs.slice(0, limit);
  const nextTripCursor = tripsSnap.size > limit ?
    tripPage[tripPage.length - 1].id : null;
  const nextExpectedCursor = legsSnap.size > limit ?
    expectedPage[expectedPage.length - 1].id : null;
  const legs = new Map<string, ProgramTravelLegDocument>();
  const guestIds = new Set<string>();
  for (const doc of expectedPage) {
    const leg = doc.data() as ProgramTravelLegDocument;
    legs.set(doc.id, leg);
    guestIds.add(leg.guestId);
  }
  const trips = tripPage.map((doc) => ({
    id: doc.id, doc: doc.data() as TransportTripDocument}));
  const snapshots = new Map(trips.map((trip) =>
    [trip.id, readTripDispatchSnapshot(trip.doc)]));
  const tripLegIds = trips.filter((trip) => !snapshots.get(trip.id))
    .flatMap((trip) => trip.doc.legIds)
    .filter((id) => !legs.has(id));
  const tripLegSnaps = await readTripDocuments(db, "programTravelLegs",
    tripLegIds);
  for (const snap of tripLegSnaps) {
    const leg = snap.data() as ProgramTravelLegDocument | undefined;
    if (leg && trips.some((trip) => trip.doc.legIds.includes(snap.id) &&
        tripIncludesLeg(trip.doc, leg))) {
      legs.set(snap.id, leg);
      guestIds.add(leg.guestId);
    }
  }
  const partyIds = [...new Set([...legs.values()]
    .map((leg) => leg.partyId)
    .filter((id): id is string => id !== null))];
  const [guestSnaps, partySnaps] = await Promise.all([
    readTripDocuments(db, "programGuests", [...guestIds]),
    readTripDocuments(db, "programTravelParties", partyIds),
  ]);
  const guests = new Map<string, ProgramGuestDocument>();
  for (const snap of guestSnaps) {
    const guest = snap.data() as ProgramGuestDocument | undefined;
    if (guest && guest.programId === data.programId &&
        guest.organizerId === access.program.organizerId) {
      guests.set(snap.id, guest);
    }
  }
  const parties = new Map<string, ProgramTravelPartyDocument>();
  for (const snap of partySnaps) {
    const party = snap.data() as ProgramTravelPartyDocument | undefined;
    if (party && party.programId === data.programId &&
        party.organizerId === access.program.organizerId) {
      parties.set(snap.id, party);
    }
  }
  const settings = access.program.transportSettings;
  const now = deps.now();
  return {
    programId: data.programId,
    hotelId: data.hotelId,
    hotelName: hotel.name,
    nextTripCursor, nextExpectedCursor,
    accessExpiresAtMillis: programProjectionExpiresAt(access,
      hotelDuties.filter((duty) => dutyCoversHotel([duty], data.hotelId))),
    generatedAtMillis: now.toMillis(),
    trips: trips.map((trip) => ({
      tripId: trip.id,
      plateDisplay: trip.doc.plateDisplay,
      vehicleClassId: trip.doc.vehicleClassId,
      vendorName: trip.doc.vendorNameSnapshot,
      departedAtMillis: staffTimestampMillis(trip.doc.departedAt),
      estimatedArriveAtMillis: null,
      passengerCount: trip.doc.passengerCount,
      ...projectTripManifest(trip.doc, snapshots.get(trip.id), legs, guests),
      status: trip.doc.status,
      revision: trip.doc.revision,
    })),
    expectedLegs: expectedPage.map((doc) => {
      const leg = legs.get(doc.id)!;
      const timing = legTiming(leg, settings);
      return {
        legId: doc.id,
        guestDisplayName: guests.get(leg.guestId)?.displayName ?? "Guest",
        partyLabel: leg.partyId ? parties.get(leg.partyId)?.label ??
          null : null,
        passengers: leg.passengers,
        curbAtMillis: timing.kind === "available" ?
          timing.curbAtMillis : null,
        readiness: leg.readiness,
      };
    }),
  };
}

export async function listProgramTripsHandler(
  request: CallableRequest<unknown>,
  deps: ProgramDataDeps = defaultProgramDataDeps
): Promise<ProgramTripListCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ListProgramTripsCallablePayload>(
    request, validateListProgramTripsCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listProgramTrips", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const access = await requireProgramAccess({
    db, programId: data.programId, actorUid, now: deps.now(),
  });
  const duties: ProgramDutyAssignment[] = [
    ...dutyAssignments(access, "reconciliationViewer"),
    ...dutyAssignments(access, "transportDispatcher"),
  ];
  if (access.role !== "manager") {
    if (duties.length === 0) {
      throw new HttpsError(
        "permission-denied",
        "This account has no reconciliation or dispatcher duty.");
    }
  }
  // Apply resource predicates before each page cap. Filtering a global first
  // page could hide every trip at a less busy assigned station.
  const scopes = programResourceScopes(
    access.role === "manager" ? null : duties);
  const limit = data.limit ?? tripPageCap;
  const cursor = data.cursor ? await db.collection("transportTrips")
    .doc(data.cursor).get() : null;
  if (cursor) {
    const trip = cursor.data() as TransportTripDocument | undefined;
    if (!trip || trip.programId !== data.programId ||
        trip.organizerId !== access.program.organizerId ||
        !scopes.some((scope) =>
          (!scope.pickup.length || scope.pickup.includes(trip.pickupPointId)) &&
          (!scope.hotels.length || (trip.destinationHotelId !== null &&
            scope.hotels.includes(trip.destinationHotelId))))) {
      throw new HttpsError("invalid-argument",
        "This page is no longer available. Return to the latest trips.");
    }
  }
  const pages = await Promise.all(scopes.map((scope) => {
    let query = db.collection("transportTrips")
      .where("programId", "==", data.programId)
      .where("organizerId", "==", access.program.organizerId)
      .orderBy("departedAt", "desc")
      .limit(limit + 1);
    if (scope.pickup.length) {
      query = query.where("pickupPointId", "in", scope.pickup);
    }
    if (scope.hotels.length) {
      query = query.where("destinationHotelId", "in", scope.hotels);
    }
    if (cursor) query = query.startAfter(cursor);
    return query.get();
  }));
  const byId = new Map(pages.flatMap((page) =>
    page.docs.map((doc) => [doc.id, doc])));
  // Match Firestore's full Timestamp order and implicit descending document
  // ID tie-break, including when duties overlap or departure times are equal.
  const orderedTrips = [...byId.values()].sort((a, b) => {
    const at = a.data().departedAt as FirebaseFirestore.Timestamp;
    const bt = b.data().departedAt as FirebaseFirestore.Timestamp;
    return bt.seconds - at.seconds || bt.nanoseconds - at.nanoseconds ||
      (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
  });
  const visibleTrips = orderedTrips.slice(0, limit);
  const nextCursor = orderedTrips.length > limit ?
    visibleTrips[visibleTrips.length - 1].id : null;
  const snapshots = new Map(visibleTrips.map((doc) =>
    [doc.id, readTripDispatchSnapshot(doc.data() as TransportTripDocument)]));
  const guestIds = new Set<string>();
  const legIds = new Set<string>();
  for (const doc of visibleTrips) {
    if (snapshots.get(doc.id)) continue;
    for (const legId of (doc.data() as TransportTripDocument).legIds) {
      legIds.add(legId);
    }
  }
  const legSnaps = await readTripDocuments(db, "programTravelLegs",
    [...legIds]);
  const legs = new Map<string, ProgramTravelLegDocument>();
  for (const snap of legSnaps) {
    const leg = snap.data() as ProgramTravelLegDocument | undefined;
    if (leg && visibleTrips.some((trip) => {
      const record = trip.data() as TransportTripDocument;
      return record.legIds.includes(snap.id) && tripIncludesLeg(record, leg);
    })) {
      legs.set(snap.id, leg);
      guestIds.add(leg.guestId);
    }
  }
  const guestSnaps = await readTripDocuments(db, "programGuests",
    [...guestIds]);
  const guests = new Map<string, ProgramGuestDocument>();
  for (const snap of guestSnaps) {
    const guest = snap.data() as ProgramGuestDocument | undefined;
    if (guest && guest.programId === data.programId &&
        guest.organizerId === access.program.organizerId) {
      guests.set(snap.id, guest);
    }
  }
  return {
    programId: data.programId,
    accessExpiresAtMillis: programProjectionExpiresAt(access, duties),
    nextCursor,
    trips: visibleTrips.map((doc) => {
      const trip = doc.data() as TransportTripDocument;
      return {
        tripId: doc.id,
        pickupPointId: trip.pickupPointId,
        destinationHotelId: trip.destinationHotelId,
        destinationLabel: trip.destinationLabel ?? "Unassigned",
        vehicleClassId: trip.vehicleClassId,
        plateDisplay: trip.plateDisplay,
        vendorId: trip.vendorId,
        vendorName: trip.vendorNameSnapshot,
        kind: trip.kind,
        status: trip.status,
        passengerCount: trip.passengerCount,
        departedAtMillis: staffTimestampMillis(trip.departedAt),
        arrivedAtMillis: trip.arrivedAt ?
          staffTimestampMillis(trip.arrivedAt) : null,
        voidReason: trip.voidReason,
        ...projectTripManifest(trip, snapshots.get(doc.id), legs, guests),
        revision: trip.revision,
      };
    }),
  };
}

/** Deduplicate references and bound concurrent RPCs for large manifests. */
async function readTripDocuments(db: FirebaseFirestore.Firestore,
  collection: string, ids: string[],
): Promise<FirebaseFirestore.DocumentSnapshot[]> {
  const unique = [...new Set(ids)];
  const snapshots: FirebaseFirestore.DocumentSnapshot[] = [];
  for (let offset = 0; offset < unique.length; offset += 32) {
    snapshots.push(...await Promise.all(unique.slice(offset, offset + 32)
      .map((id) => db.collection(collection).doc(id).get())));
  }
  return snapshots;
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const input = value as Record<string, unknown>;
  const trimmed = {...input};
  for (const key of ["programId", "hotelId", "cursor", "tripCursor",
    "expectedCursor"]) {
    if (typeof trimmed[key] === "string") {
      trimmed[key] = (trimmed[key] as string).trim();
    }
  }
  return trimmed;
}

export const getProgramHotelInbound = onCall(
  appCheckCallableOptionsWithLimits(readLimits),
  (request) => getProgramHotelInboundHandler(request)
);
export const listProgramTrips = onCall(
  appCheckCallableOptionsWithLimits(readLimits),
  (request) => listProgramTripsHandler(request)
);
