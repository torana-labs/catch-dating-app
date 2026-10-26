import {assertTravelLegRevision} from "./travelLegRevision";
import {validateTravelPartyMembership} from "./travelPartyPolicy";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {validateCallableWithAjv} from "../shared/validation";
import {
  assertRevision,
  dutyAssignments,
  dutyCoversTransportRoute,
  nextRevision,
  requireProgramAccess,
  requireProgramMutable,
} from "../shared/programAuthority";
import {vehicleFits} from "./vehicleCapacity";
import {hashRequest} from "../shared/programOperationHash";
import type {
  ProgramGuestDocument,
  ProgramHotelDocument,
  ProgramPickupPointDocument,
  ProgramTravelLegDocument,
  ProgramTravelPartyDocument,
  TransportActiveAssignmentDocument,
  TransportVehicleAssignmentDocument,
  TransportOperationReceiptDocument,
  TransportTripDocument,
  TransportVendorDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {DispatchProgramTripCallablePayload} from
  "../shared/generated/dispatchProgramTripCallablePayload";
import type {ProgramTripActionCallablePayload} from
  "../shared/generated/programTripActionCallablePayload";
import type {DispatchProgramTripCallableResponse} from
  "../shared/generated/dispatchProgramTripCallableResponse";
import type {ProgramMutationCallableResponse} from
  "../shared/generated/programMutationCallableResponse";
import {
  validateDispatchProgramTripCallablePayload,
} from "../shared/generated/validators/dispatchProgramTripInput";
import {
  validateProgramTripActionCallablePayload,
} from "../shared/generated/validators/programTripActionInput";

import {defaultProgramDataDeps} from "../shared/programDataDeps";
import type {ProgramDataDeps} from "../shared/programDataDeps";

const dispatchCallableLimits = {timeoutSeconds: 60, maxInstances: 40};
const receiptRetentionMillis = 7 * 24 * 60 * 60 * 1000;

export function transportAssignmentId(programId: string,
  legId: string): string {
  return `${programId}__${legId}`;
}

export function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Composite hash avoids delimiter ambiguity in organizer/plate identities. */
export function transportVehicleAssignmentId(organizerId: string,
  plateNormalized: string): string {
  return hashRequest({organizerId, plateNormalized});
}

export async function dispatchProgramTripHandler(
  request: CallableRequest<unknown>,
  deps: ProgramDataDeps = defaultProgramDataDeps
): Promise<DispatchProgramTripCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<DispatchProgramTripCallablePayload>(
    request, validateDispatchProgramTripCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "dispatchProgramTrip", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const requestHash = hashRequest({
    ...data,
    destinationHotelId: data.destinationHotelId ?? null,
    destinationLabel: data.destinationLabel ?? null,
    vendorId: data.vendorId ?? null,
    kind: data.kind ?? "guestTransfer",
    notes: data.notes ?? null,
    legIds: [...data.legIds].sort(),
    expectedLegRevisions: data.expectedLegRevisions ?
      [...data.expectedLegRevisions].sort((a, b) =>
        a.legId.localeCompare(b.legId)) : null,
    departedAtMillis: data.departedAtMillis ?? null,
  });
  const receiptRef = db.collection("transportOperationReceipts").doc(
    `${data.programId}__dispatch__${data.clientOperationId}`);
  const tripRef = db.collection("transportTrips").doc();
  let result: DispatchProgramTripCallableResponse | null = null;
  await db.runTransaction(async (tx) => {
    const access = await requireProgramAccess({
      db, programId: data.programId, actorUid, now: deps.now(), transaction: tx,
    });
    requireProgramMutable(access.program);
    const assignments = dutyAssignments(access, "transportDispatcher");
    if (access.role !== "manager" && assignments.length === 0) {
      throw new HttpsError(
        "permission-denied",
        "This account has no dispatcher duty for this program.");
    }
    if (access.role !== "manager" &&
        !dutyCoversTransportRoute(assignments, data.pickupPointId,
          data.destinationHotelId ?? null)) {
      throw new HttpsError(
        "permission-denied",
        "This station is outside your assigned scope.");
    }
    const receiptSnap = await tx.get(receiptRef);
    const receipt = receiptSnap.data() as
      TransportOperationReceiptDocument | undefined;
    if (receipt) {
      if (receipt.requestHash !== requestHash ||
          receipt.actorUid !== actorUid) {
        throw new HttpsError(
          "aborted",
          "This operation id was already used for a different request.");
      }
      if (!receipt.tripId) {
        throw new HttpsError("failed-precondition",
          "Dispatch receipt has no trip. Reconcile before retrying.");
      }
      const tripSnap = await tx.get(
        db.collection("transportTrips").doc(receipt.tripId));
      const trip = tripSnap.data() as TransportTripDocument | undefined;
      if (!trip || trip.programId !== data.programId ||
          trip.organizerId !== access.program.organizerId ||
          trip.clientOperationId !== data.clientOperationId ||
          trip.departedByUid !== actorUid) {
        throw new HttpsError("failed-precondition",
          "Dispatch receipt no longer identifies a trip in this program.");
      }
      result = {
        tripId: receipt.tripId!,
        revision: receipt.resultRevision,
        alreadyApplied: true,
        passengerCount: trip.passengerCount,
      };
      return;
    }
    if (access.program.status !== "active" ||
        !access.program.capabilities.includes("arrivalsTransport")) {
      throw new HttpsError("failed-precondition",
        "Transport dispatch requires an active arrivals program.");
    }
    const pickupSnap = await tx.get(db.collection("programPickupPoints")
      .doc(data.pickupPointId));
    const pickup = pickupSnap.data() as ProgramPickupPointDocument | undefined;
    if (!pickup || pickup.programId !== data.programId ||
        pickup.organizerId !== access.program.organizerId || !pickup.active) {
      throw new HttpsError("failed-precondition",
        "Pickup point is not active in this program.");
    }
    let hotelName: string | null = null;
    if (data.destinationHotelId) {
      const hotelSnap = await tx.get(db.collection("programHotels")
        .doc(data.destinationHotelId));
      const hotel = hotelSnap.data() as ProgramHotelDocument | undefined;
      if (!hotel || hotel.programId !== data.programId ||
          hotel.organizerId !== access.program.organizerId || !hotel.active) {
        throw new HttpsError(
          "invalid-argument", "Destination hotel is not in this program.");
      }
      hotelName = hotel.name;
    }
    const vehicleClass = access.program.transportSettings.vehicleClasses
      .find((entry) => entry.id === data.vehicleClassId);
    if (!vehicleClass) {
      throw new HttpsError(
        "invalid-argument",
        `Unknown vehicle class "${data.vehicleClassId}".`);
    }
    let vendorName: string | null = null;
    if (data.vendorId) {
      const vendorSnap = await tx.get(db.collection("transportVendors")
        .doc(data.vendorId));
      const vendor = vendorSnap.data() as TransportVendorDocument | undefined;
      if (!vendor || !vendor.active ||
          vendor.organizerId !== access.program.organizerId ||
          !vendor.programIds.includes(data.programId)) {
        throw new HttpsError(
          "invalid-argument", "Vendor is not bound to this program.");
      }
      vendorName = vendor.name;
    }
    const plateNormalized = normalizePlate(data.plateDisplay);
    if (plateNormalized.length < 4 || plateNormalized.length > 16) {
      throw new HttpsError("invalid-argument",
        "Enter a vehicle plate with 4 to 16 letters or numbers.");
    }
    if (data.kind !== undefined && data.kind !== "guestTransfer") {
      throw new HttpsError("failed-precondition",
        "Passenger dispatch cannot record an empty vehicle repositioning.");
    }
    const vehicleAssignmentRef = db.collection("transportVehicleAssignments")
      .doc(transportVehicleAssignmentId(
        access.program.organizerId, plateNormalized));
    const vehicleAssignmentSnap = await tx.get(vehicleAssignmentRef);
    const vehicleAssignment = vehicleAssignmentSnap.data() as
      TransportVehicleAssignmentDocument | undefined;
    if (vehicleAssignment &&
        (vehicleAssignment.organizerId !== access.program.organizerId ||
        vehicleAssignment.plateNormalized !== plateNormalized)) {
      throw new HttpsError("failed-precondition",
        "Vehicle assignment ownership changed. Reconcile before dispatch.");
    }
    if (vehicleAssignment?.status === "active") {
      throw new HttpsError("already-exists",
        "This vehicle is already assigned to an active trip.");
    }
    const legSnaps = await Promise.all(data.legIds.map((legId) =>
      tx.get(db.collection("programTravelLegs").doc(legId))));
    const assignmentSnaps = await Promise.all(data.legIds.map((legId) =>
      tx.get(db.collection("transportActiveAssignments")
        .doc(transportAssignmentId(data.programId, legId)))));
    const revisionFences = new Map(data.expectedLegRevisions
      .map((fence) => [fence.legId, fence]));
    if (revisionFences.size !== data.legIds.length ||
        data.expectedLegRevisions.length !== data.legIds.length ||
        !data.legIds.every((id) => revisionFences.has(id))) {
      throw new HttpsError("invalid-argument",
        "A unique revision fence is required for every manifest leg.");
    }
    const legs: Array<{id: string; doc: ProgramTravelLegDocument}> = [];
    for (const snap of legSnaps) {
      const leg = snap.data() as ProgramTravelLegDocument | undefined;
      if (!leg || leg.programId !== data.programId ||
          leg.organizerId !== access.program.organizerId) {
        throw new HttpsError(
          "not-found", `Leg ${snap.id} is not in this program.`);
      }
      const fence = revisionFences.get(snap.id);
      await assertTravelLegRevision({db, tx, programId: data.programId,
        legId: snap.id, actorUid, actualRevision: leg.revision,
        expectedRevision: fence!.revision,
        afterObservation: fence!.afterObservation});
      if (leg.pickupPointId !== data.pickupPointId) {
        throw new HttpsError(
          "failed-precondition",
          `Leg ${snap.id} is not staged at this pickup point.`);
      }
      if (leg.readiness !== "ready" || !leg.readyAt) {
        throw new HttpsError(
          "failed-precondition",
          `Leg ${snap.id} is not dispatchable (state ${leg.readiness}).`);
      }
      if (leg.kind !== "inbound" ||
          leg.destinationHotelId !== (data.destinationHotelId ?? null) ||
          (!leg.destinationHotelId &&
            (!leg.destinationLabel?.trim() ||
            leg.destinationLabel.trim().toLowerCase() !==
              data.destinationLabel?.trim().toLowerCase()))) {
        throw new HttpsError("failed-precondition",
          "Every passenger must be inbound to the selected destination.");
      }
      legs.push({id: snap.id, doc: leg});
    }
    for (const snap of assignmentSnaps) {
      const assignment = snap.data() as
        TransportActiveAssignmentDocument | undefined;
      if (assignment && (assignment.programId !== data.programId ||
          transportAssignmentId(assignment.programId, assignment.legId) !==
            snap.id)) {
        throw new HttpsError("failed-precondition",
          "Journey assignment ownership changed. Reconcile before dispatch.");
      }
      if (assignment && assignment.status === "active") {
        throw new HttpsError(
          "already-exists",
          `Guest leg ${snap.id.split("__").pop()} is already on a vehicle.`);
      }
    }
    if (new Set(legs.map((leg) => leg.doc.guestId)).size !== legs.length) {
      throw new HttpsError("failed-precondition",
        "A guest cannot occupy multiple manifest rows on the same trip.");
    }
    const guestSnaps = await Promise.all(legs.map((leg) =>
      tx.get(db.collection("programGuests").doc(leg.doc.guestId))));
    const guests = new Map<string, ProgramGuestDocument>();
    for (const snap of guestSnaps) {
      const guest = snap.data() as ProgramGuestDocument | undefined;
      if (!guest || guest.programId !== data.programId ||
          guest.organizerId !== access.program.organizerId ||
          typeof guest.displayName !== "string" ||
          guest.displayName.length < 1 || guest.displayName.length > 140) {
        throw new HttpsError("failed-precondition",
          "A manifest guest needs reconciliation before dispatch.");
      }
      guests.set(snap.id, guest);
    }
    const partyIds = [...new Set(legs.map((leg) => leg.doc.partyId)
      .filter((id): id is string => id !== null))].sort();
    const partySnaps = await Promise.all(partyIds.map((id) =>
      tx.get(db.collection("programTravelParties").doc(id))));
    for (const snap of partySnaps) {
      const party = snap.data() as ProgramTravelPartyDocument | undefined;
      const members = legs.filter((leg) => leg.doc.partyId === snap.id);
      if (!party || party.programId !== data.programId ||
          party.organizerId !== access.program.organizerId ||
          party.legIds?.length !== members.length) {
        throw new HttpsError("failed-precondition",
          "The complete travel party must be ready on the same manifest.");
      }
      validateTravelPartyMembership(snap.id, party,
        new Map(members.map((leg) => [leg.id, leg.doc])));
      if (party.dedicatedVehicle && members.length !== legs.length) {
        throw new HttpsError("failed-precondition",
          "A private party cannot share a vehicle with another party.");
      }
    }
    for (const leg of legs.filter((entry) => entry.doc.dedicatedVehicle)) {
      if (legs.some((other) => other.id !== leg.id &&
          (!leg.doc.partyId || other.doc.partyId !== leg.doc.partyId))) {
        throw new HttpsError("failed-precondition",
          "A private transfer cannot share a vehicle with another party.");
      }
    }
    const passengerCount = legs.reduce(
      (sum, leg) => sum + leg.doc.passengers, 0);
    const luggageUnits = legs.reduce(
      (sum, leg) => sum + leg.doc.luggageUnits, 0);
    const capabilities = [...new Set(legs.flatMap((leg) =>
      leg.doc.requiredCapabilities))];
    if (!vehicleFits(
      vehicleClass, passengerCount, luggageUnits, capabilities)) {
      throw new HttpsError(
        "failed-precondition",
        `Manifest exceeds ${vehicleClass.label} capabilities or capacity ` +
        `(${passengerCount}/${vehicleClass.passengerCapacity} seats, ` +
        `${luggageUnits}/${vehicleClass.luggageCapacity} luggage).`);
    }
    const now = deps.now();
    if (data.departedAtMillis != null &&
        (data.departedAtMillis > now.toMillis() + 5 * 60 * 1000 ||
        data.departedAtMillis < now.toMillis() - receiptRetentionMillis)) {
      throw new HttpsError("failed-precondition",
        "Departure time needs review before this trip can be recorded.");
    }
    const departedAt = data.departedAtMillis !== undefined &&
      data.departedAtMillis !== null ?
      admin.firestore.Timestamp.fromMillis(data.departedAtMillis) : now;
    const destinationLabel = hotelName ?? data.destinationLabel ??
      legs[0].doc.destinationLabel ??
      (data.destinationHotelId ? "Hotel" : "Unassigned");
    const trip: TransportTripDocument = {
      programId: data.programId,
      organizerId: access.program.organizerId,
      kind: data.kind ?? "guestTransfer",
      pickupPointId: data.pickupPointId,
      destinationHotelId: data.destinationHotelId ?? null,
      destinationLabel,
      vehicleClassId: data.vehicleClassId,
      vendorId: data.vendorId ?? null,
      vendorNameSnapshot: vendorName,
      plateNormalized,
      plateDisplay: data.plateDisplay,
      partyIds,
      legIds: [...data.legIds].sort(),
      passengerCount,
      dispatchSnapshot: {
        recordedAt: now,
        vehicleClass,
        manifest: [...legs].sort((a, b) => a.id.localeCompare(b.id))
          .map((leg) => ({legId: leg.id, guestId: leg.doc.guestId,
            guestDisplayName: guests.get(leg.doc.guestId)!.displayName,
            partyId: leg.doc.partyId, passengers: leg.doc.passengers,
            luggageUnits: leg.doc.luggageUnits})),
      },
      status: "enRoute",
      departedAt,
      departedByUid: actorUid,
      voidedByUid: null,
      voidReason: null,
      arrivedAt: null,
      arrivedByUid: null,
      rateSnapshot: null,
      clientOperationId: data.clientOperationId,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
      revision: 1,
    };
    const vehicleReservation: TransportVehicleAssignmentDocument = {
      organizerId: access.program.organizerId,
      plateNormalized,
      programId: data.programId,
      tripId: tripRef.id,
      status: "active",
      assignedAt: now,
      releasedAt: null,
      revision: nextRevision(vehicleAssignment?.revision, now),
    };
    tx.set(vehicleAssignmentRef, vehicleReservation);
    tx.set(tripRef, trip);
    for (const leg of legs) {
      const assignment: TransportActiveAssignmentDocument = {
        programId: data.programId,
        legId: leg.id,
        tripId: tripRef.id,
        status: "active",
        assignedAt: now,
        releasedAt: null,
        revision: 1,
      };
      tx.set(db.collection("transportActiveAssignments")
        .doc(transportAssignmentId(data.programId, leg.id)), assignment);
      tx.update(db.collection("programTravelLegs").doc(leg.id), {
        readiness: "dispatched",
        updatedAt: now,
        revision: nextRevision(leg.doc.revision, now),
      });
    }
    const receiptDoc: TransportOperationReceiptDocument = {
      programId: data.programId,
      operationKind: "dispatch",
      clientOperationId: data.clientOperationId,
      actorUid,
      requestHash,
      tripId: tripRef.id,
      legId: null,
      resultRevision: 1,
      resultJson: null,
      createdAt: now,
      expiresAt: admin.firestore.Timestamp.fromMillis(
        now.toMillis() + receiptRetentionMillis),
    };
    tx.set(receiptRef, receiptDoc);
    result = {
      tripId: tripRef.id,
      revision: 1,
      alreadyApplied: false,
      passengerCount,
    };
  });
  return result!;
}

async function tripActionHandler(
  request: CallableRequest<unknown>,
  action: "markArrived" | "void",
  deps: ProgramDataDeps = defaultProgramDataDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ProgramTripActionCallablePayload>(
    request, validateProgramTripActionCallablePayload, normalizePayload);
  const db = deps.firestore();
  if (action === "void" && data.reason == null) {
    throw new HttpsError(
      "invalid-argument", "A void reason is required.");
  }
  const requestHash = hashRequest({
    programId: data.programId,
    tripId: data.tripId,
    action,
    expectedRevision: data.expectedRevision,
    reason: data.reason ?? null,
  });
  const receiptRef = db.collection("transportOperationReceipts").doc(
    `${data.programId}__${action}__${data.clientOperationId}`);
  const tripRef = db.collection("transportTrips").doc(data.tripId);
  let result: ProgramMutationCallableResponse | null = null;
  await db.runTransaction(async (tx) => {
    const access = await requireProgramAccess({
      db, programId: data.programId, actorUid, now: deps.now(), transaction: tx,
    });
    requireProgramMutable(access.program);
    const [receiptSnap, tripSnap] = await Promise.all([
      tx.get(receiptRef), tx.get(tripRef)]);
    const receipt = receiptSnap.data() as
      TransportOperationReceiptDocument | undefined;
    const trip = tripSnap.data() as TransportTripDocument | undefined;
    if (!trip || trip.programId !== data.programId ||
        trip.organizerId !== access.program.organizerId) {
      throw new HttpsError("not-found", "Trip not found in this program.");
    }
    if (access.role !== "manager") {
      if (action === "markArrived") {
        const hotelDuties = dutyAssignments(access, "hotelDesk");
        const dispatcherDuties =
          dutyAssignments(access, "transportDispatcher");
        const allowed = dutyCoversTransportRoute(
          hotelDuties, trip.pickupPointId,
          trip.destinationHotelId) ||
          dutyCoversTransportRoute(dispatcherDuties, trip.pickupPointId,
            trip.destinationHotelId);
        if (!allowed) {
          throw new HttpsError(
            "permission-denied",
            "This trip is outside your assigned scope.");
        }
      } else {
        const dispatcherDuties =
          dutyAssignments(access, "transportDispatcher");
        if (!dutyCoversTransportRoute(dispatcherDuties, trip.pickupPointId,
          trip.destinationHotelId)) {
          throw new HttpsError(
            "permission-denied",
            "Only the dispatching station can void this trip.");
        }
      }
    }
    if (receipt) {
      if (receipt.requestHash !== requestHash ||
          receipt.actorUid !== actorUid) {
        throw new HttpsError(
          "aborted",
          "This operation id was already used for a different request.");
      }
      result = {entityId: data.tripId, revision: receipt.resultRevision,
        alreadyApplied: true};
      return;
    }
    assertRevision(trip.revision, data.expectedRevision);
    if (trip.status !== "enRoute") {
      throw new HttpsError(
        "failed-precondition",
        `Trip is already ${trip.status}.`);
    }
    const now = deps.now();
    const vehicleAssignmentRef = db.collection("transportVehicleAssignments")
      .doc(transportVehicleAssignmentId(
        trip.organizerId, trip.plateNormalized));
    const vehicleAssignmentSnap = await tx.get(vehicleAssignmentRef);
    const vehicleAssignment = vehicleAssignmentSnap.data() as
      TransportVehicleAssignmentDocument | undefined;
    if (!vehicleAssignment || vehicleAssignment.status !== "active" ||
        vehicleAssignment.tripId !== data.tripId ||
        vehicleAssignment.organizerId !== trip.organizerId ||
        vehicleAssignment.plateNormalized !== trip.plateNormalized ||
        vehicleAssignment.programId !== data.programId) {
      throw new HttpsError("failed-precondition",
        "Vehicle assignment changed. Reconcile the trip before continuing.");
    }
    const assignmentSnaps = await Promise.all(trip.legIds.map((legId) =>
      tx.get(db.collection("transportActiveAssignments")
        .doc(transportAssignmentId(data.programId, legId)))));
    const legSnaps = await Promise.all(trip.legIds.map((legId) =>
      tx.get(db.collection("programTravelLegs").doc(legId))));
    for (let index = 0; index < trip.legIds.length; index++) {
      const assignment = assignmentSnaps[index].data() as
        TransportActiveAssignmentDocument | undefined;
      const leg = legSnaps[index].data() as
        ProgramTravelLegDocument | undefined;
      if (!assignment || assignment.status !== "active" ||
          assignment.tripId !== data.tripId ||
          assignment.programId !== data.programId ||
          assignment.legId !== trip.legIds[index] ||
          !leg || leg.programId !== data.programId ||
          leg.organizerId !== access.program.organizerId ||
          leg.readiness !== "dispatched") {
        throw new HttpsError("failed-precondition",
          "Trip assignments changed. Reload and reconcile before continuing.");
      }
    }
    const tripUpdate: Record<string, unknown> = {
      updatedAt: now,
      revision: nextRevision(trip.revision, now),
    };
    if (action === "markArrived") {
      tripUpdate.status = "arrived";
      tripUpdate.arrivedAt = now;
      tripUpdate.arrivedByUid = actorUid;
    } else {
      tripUpdate.status = "voided";
      tripUpdate.voidedByUid = actorUid;
      tripUpdate.voidReason = data.reason;
    }
    tx.update(vehicleAssignmentRef, {
      status: "released", releasedAt: now,
      revision: nextRevision(vehicleAssignment.revision, now),
    });
    tx.update(tripRef, tripUpdate);
    const legReadiness = action === "markArrived" ? "arrived" : "ready";
    for (let index = 0; index < trip.legIds.length; index += 1) {
      const assignmentSnap = assignmentSnaps[index];
      if (assignmentSnap.exists) {
        tx.update(assignmentSnap.ref, {
          status: "released",
          releasedAt: now,
          revision: nextRevision(
            (assignmentSnap.data() as
              TransportActiveAssignmentDocument).revision, now),
        });
      }
      const legSnap = legSnaps[index];
      const leg = legSnap.data() as ProgramTravelLegDocument | undefined;
      if (leg && leg.readiness === "dispatched") {
        tx.update(legSnap.ref, {
          readiness: legReadiness,
          updatedAt: now,
          revision: nextRevision(leg.revision, now),
        });
      }
    }
    const receiptDoc: TransportOperationReceiptDocument = {
      programId: data.programId,
      operationKind: action === "void" ? "voidTrip" : "markArrived",
      clientOperationId: data.clientOperationId,
      actorUid,
      requestHash,
      tripId: data.tripId,
      legId: null,
      resultRevision: tripUpdate.revision as number,
      resultJson: null,
      createdAt: now,
      expiresAt: admin.firestore.Timestamp.fromMillis(
        now.toMillis() + receiptRetentionMillis),
    };
    tx.set(receiptRef, receiptDoc);
    result = {entityId: data.tripId,
      revision: tripUpdate.revision as number, alreadyApplied: false};
  });
  return result!;
}

export async function markProgramTripArrivedHandler(
  request: CallableRequest<unknown>,
  deps: ProgramDataDeps = defaultProgramDataDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  await deps.checkRateLimit(
    deps.firestore(), actorUid, "markProgramTripArrived",
    {maxRequests: 60, windowMs: 60 * 1000});
  return tripActionHandler(request, "markArrived", deps);
}

export async function voidProgramTripHandler(
  request: CallableRequest<unknown>,
  deps: ProgramDataDeps = defaultProgramDataDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  await deps.checkRateLimit(
    deps.firestore(), actorUid, "voidProgramTrip",
    {maxRequests: 60, windowMs: 60 * 1000});
  return tripActionHandler(request, "void", deps);
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const input = value as Record<string, unknown>;
  const trimmed = {...input};
  for (const key of ["programId", "tripId", "pickupPointId", "hotelId",
    "vehicleClassId", "plateDisplay", "vendorId", "destinationHotelId",
    "destinationLabel", "clientOperationId", "reason"]) {
    if (typeof trimmed[key] === "string") {
      trimmed[key] = (trimmed[key] as string).trim();
    }
  }
  return trimmed;
}

export const dispatchProgramTrip = onCall(
  appCheckCallableOptionsWithLimits(dispatchCallableLimits),
  (request) => dispatchProgramTripHandler(request)
);
export const markProgramTripArrived = onCall(
  appCheckCallableOptionsWithLimits(dispatchCallableLimits),
  (request) => markProgramTripArrivedHandler(request)
);
export const voidProgramTrip = onCall(
  appCheckCallableOptionsWithLimits(dispatchCallableLimits),
  (request) => voidProgramTripHandler(request)
);
export {getProgramHotelInbound, getProgramHotelInboundHandler,
  listProgramTrips, listProgramTripsHandler} from "./programTripReads";
