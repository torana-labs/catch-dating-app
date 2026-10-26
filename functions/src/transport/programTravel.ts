import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {validateCallableWithAjv} from "../shared/validation";
import {
  assertRevision,
  nextRevision,
  requireProgramAccess,
  requireProgramMutable,
  requireProgramDuty,
} from "../shared/programAuthority";
import {reconcileTravelLegState} from "./travelLegState";
import type {
  ProgramGuestDocument,
  ProgramTravelLegDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {UpsertProgramTravelLegCallablePayload} from
  "../shared/generated/upsertProgramTravelLegCallablePayload";
import type {ProgramMutationCallableResponse} from
  "../shared/generated/programMutationCallableResponse";
import {
  validateUpsertProgramTravelLegCallablePayload,
} from "../shared/generated/validators/upsertProgramTravelLegInput";

import {defaultProgramDataDeps} from "../shared/programDataDeps";
import type {ProgramDataDeps} from "../shared/programDataDeps";
import {requireMutableTravelLeg, travelDestinationKey}
  from "./travelPartyPolicy";

const travelCallableLimits = {timeoutSeconds: 60, maxInstances: 20};

export async function upsertProgramTravelLegHandler(
  request: CallableRequest<unknown>,
  deps: ProgramDataDeps = defaultProgramDataDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<UpsertProgramTravelLegCallablePayload>(
    request, validateUpsertProgramTravelLegCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "upsertProgramTravelLeg", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const ref = data.legId ?
    db.collection("programTravelLegs").doc(data.legId) :
    db.collection("programTravelLegs").doc();
  let committedRevision = 0;
  await db.runTransaction(async (tx) => {
    const access = await requireProgramAccess({
      db, programId: data.programId, actorUid, now: deps.now(), transaction: tx,
    });
    requireProgramMutable(access.program);
    requireProgramDuty(access, "programCoordinator");
    if (!["draft", "active"].includes(access.program.status)) {
      throw new HttpsError("failed-precondition", "This program is closed.");
    }
    const guestSnap = await tx.get(db.collection("programGuests")
      .doc(data.guestId));
    const guest = guestSnap.data() as ProgramGuestDocument | undefined;
    if (!guest || guest.programId !== data.programId ||
        guest.organizerId !== access.program.organizerId) {
      throw new HttpsError("invalid-argument", "Guest is not in this program.");
    }
    const snap = await tx.get(ref);
    const existing = snap.data() as ProgramTravelLegDocument | undefined;
    if ((data.legId && !existing) ||
        (existing && (existing.programId !== data.programId ||
          existing.organizerId !== access.program.organizerId))) {
      throw new HttpsError("not-found", "Leg not found in this program.");
    }
    assertRevision(existing?.revision ?? 0, snap.exists ?
      data.expectedRevision : undefined);
    if (existing) {
      requireMutableTravelLeg(existing);
      if (existing.guestId !== data.guestId || existing.kind !== data.kind) {
        throw new HttpsError("failed-precondition",
          "Guest and journey kind cannot change. Create a separate journey.");
      }
    }
    const now = deps.now();
    const document: ProgramTravelLegDocument = {
      programId: data.programId,
      organizerId: access.program.organizerId,
      guestId: data.guestId,
      partyId: existing?.partyId ?? null,
      kind: data.kind,
      flightNumber: data.flightNumber === undefined ?
        existing?.flightNumber ?? null : data.flightNumber,
      carrierCode: data.carrierCode === undefined ?
        existing?.carrierCode ?? null : data.carrierCode,
      originIata: data.originIata === undefined ?
        existing?.originIata ?? null : data.originIata,
      destinationIata: data.destinationIata === undefined ?
        existing?.destinationIata ?? null : data.destinationIata,
      scheduledArrivalAt: data.scheduledArrivalAtMillis === undefined ?
        existing?.scheduledArrivalAt ?? null :
        data.scheduledArrivalAtMillis === null ? null :
          admin.firestore.Timestamp.fromMillis(data.scheduledArrivalAtMillis),
      estimatedArrivalAt: existing?.estimatedArrivalAt ?? null,
      actualArrivalAt: existing?.actualArrivalAt ?? null,
      flightStatus: existing?.flightStatus ??
        (data.flightNumber ? "scheduled" : "unknown"),
      flightInstanceId: existing?.flightInstanceId ?? null,
      // Provider-owned fields: itinerary edits never overwrite enrichment.
      arrivalTerminal: existing?.arrivalTerminal ?? null,
      flightRefreshedAt: existing?.flightRefreshedAt ?? null,
      flightNextRefreshAt: existing?.flightNextRefreshAt ?? null,
      international: data.international === undefined ?
        existing?.international ?? null : data.international,
      pickupPointId: data.pickupPointId === undefined ?
        existing?.pickupPointId ?? null : data.pickupPointId,
      destinationHotelId: data.destinationHotelId === undefined ?
        existing?.destinationHotelId ?? null : data.destinationHotelId,
      destinationLabel: data.destinationLabel === undefined ?
        existing?.destinationLabel ?? null : data.destinationLabel,
      readiness: existing?.readiness ?? "expected",
      readyAt: existing?.readyAt ?? null,
      claimedByUid: existing?.claimedByUid ?? null,
      claimedAt: existing?.claimedAt ?? null,
      manualCurbAt: existing?.manualCurbAt ?? null,
      manualCurbNote: existing?.manualCurbNote ?? null,
      passengers: data.passengers,
      luggageUnits: data.luggageUnits,
      requiredCapabilities: data.requiredCapabilities,
      dedicatedVehicle: data.dedicatedVehicle,
      source: existing?.source ?? "planner",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      revision: nextRevision(existing?.revision, now),
    };
    if (!document.destinationHotelId && !document.destinationLabel?.trim()) {
      throw new HttpsError("invalid-argument",
        "A leg needs a hotel destination or a destination label.");
    }
    if (document.pickupPointId) {
      await requireProgramDoc(db, tx, "programPickupPoints",
        document.pickupPointId, data.programId, "Pickup point");
    }
    if (document.destinationHotelId) {
      await requireProgramDoc(db, tx, "programHotels",
        document.destinationHotelId, data.programId, "Hotel");
    }
    if (existing?.partyId &&
        (existing.pickupPointId !== document.pickupPointId ||
        travelDestinationKey(existing) !== travelDestinationKey(document))) {
      throw new HttpsError("failed-precondition",
        "Remove the leg from its travel party before changing its route.");
    }
    const reconciled = reconcileTravelLegState(
      existing, document, now.toDate());
    committedRevision = reconciled.revision;
    tx.set(ref, reconciled);
  });
  return {entityId: ref.id, revision: committedRevision,
    alreadyApplied: false};
}

async function requireProgramDoc(
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  collection: string,
  id: string,
  programId: string,
  label: string
): Promise<void> {
  const snap = await tx.get(db.collection(collection).doc(id));
  const doc = snap.data() as {programId?: string; active?: boolean} | undefined;
  if (!doc || doc.programId !== programId || doc.active !== true) {
    throw new HttpsError(
      "invalid-argument", `${label} is not in this program.`);
  }
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const input = value as Record<string, unknown>;
  const trimmed = {...input};
  for (const key of ["programId", "legId", "guestId",
    "flightNumber", "carrierCode", "originIata", "destinationIata",
    "destinationLabel", "pickupPointId", "destinationHotelId"]) {
    if (typeof trimmed[key] === "string") {
      trimmed[key] = (trimmed[key] as string).trim();
    }
  }
  return trimmed;
}

export const upsertProgramTravelLeg = onCall(
  appCheckCallableOptionsWithLimits(travelCallableLimits),
  (request) => upsertProgramTravelLegHandler(request)
);
export {upsertProgramTravelParty, upsertProgramTravelPartyHandler}
  from "./programTravelParties";
