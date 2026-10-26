import {assertTravelLegRevision} from "./travelLegRevision";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {validateCallableWithAjv} from "../shared/validation";
import {hashRequest} from "../shared/programOperationHash";
import {defaultProgramDataDeps} from "../shared/programDataDeps";
import type {ProgramDataDeps} from "../shared/programDataDeps";
import {dutyAssignments, dutyCoversTransportRoute, nextRevision}
  from "../shared/programAuthority";
import {requireStationAccess} from "../shared/programStationAuthority";
import type {ProgramTravelLegDocument, ProgramPickupPointDocument,
  TransportOperationReceiptDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {SetProgramTravelReadinessCallablePayload} from
  "../shared/generated/setProgramTravelReadinessCallablePayload";
import type {ProgramMutationCallableResponse} from
  "../shared/generated/programMutationCallableResponse";
import {validateSetProgramTravelReadinessCallablePayload} from
  "../shared/generated/validators/setProgramTravelReadinessInput";

const receiptRetentionMillis = 7 * 24 * 60 * 60 * 1000;

export async function setProgramTravelReadinessHandler(
  request: CallableRequest<unknown>,
  deps: ProgramDataDeps = defaultProgramDataDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<SetProgramTravelReadinessCallablePayload>(
      request, validateSetProgramTravelReadinessCallablePayload,
      normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "setProgramTravelReadiness", {
    maxRequests: 120, windowMs: 60 * 1000,
  });
  const requestHash = hashRequest({
    programId: data.programId,
    legId: data.legId,
    action: data.action,
    expectedRevision: data.expectedRevision,
    afterObservation: data.afterObservation ?? null,
    observedAtMillis: data.observedAtMillis,
    manualCurbAtMillis: data.manualCurbAtMillis ?? null,
    manualCurbNote: data.manualCurbNote ?? null,
  });
  const receiptRef = db.collection("transportOperationReceipts").doc(
    `${data.programId}__${data.action}__${data.clientOperationId}`);
  const legRef = db.collection("programTravelLegs").doc(data.legId);
  let result: {revision: number; alreadyApplied: boolean} | null = null;
  await db.runTransaction(async (tx) => {
    const {access, assignments} = await requireStationAccess(
      db, data.programId, actorUid, deps.now(), tx);
    const [receiptSnap, legSnap] = await Promise.all([
      tx.get(receiptRef), tx.get(legRef)]);
    const receipt = receiptSnap.data() as
      TransportOperationReceiptDocument | undefined;
    const leg = legSnap.data() as ProgramTravelLegDocument | undefined;
    if (!leg || leg.programId !== data.programId ||
        leg.organizerId !== access.program.organizerId) {
      throw new HttpsError("not-found", "Leg not found in this program.");
    }
    // Re-check duty scope inside the transaction against the stored leg.
    if (access.role !== "manager" &&
        !dutyCoversTransportRoute(assignments, leg.pickupPointId ?? "",
          leg.destinationHotelId)) {
      throw new HttpsError(
        "permission-denied",
        "This station is outside your assigned scope.");
    }
    if (receipt) {
      if (receipt.requestHash !== requestHash ||
          receipt.actorUid !== actorUid) {
        throw new HttpsError(
          "aborted",
          "This operation id was already used for a different request.");
      }
      result = {revision: receipt.resultRevision, alreadyApplied: true};
      return;
    }
    if (data.action !== "unclaim" &&
        (access.program.status !== "active" ||
        !access.program.capabilities.includes("arrivalsTransport"))) {
      throw new HttpsError("failed-precondition",
        "Arrival observations require an active arrivals program.");
    }
    if (!leg.pickupPointId) {
      throw new HttpsError("failed-precondition",
        "Assign this guest to a pickup point before recording an observation.");
    }
    const pickupSnap = await tx.get(db.collection("programPickupPoints")
      .doc(leg.pickupPointId));
    const pickup = pickupSnap.data() as ProgramPickupPointDocument | undefined;
    if (!pickup || pickup.programId !== data.programId ||
        pickup.organizerId !== access.program.organizerId ||
        (data.action !== "unclaim" && !pickup.active)) {
      throw new HttpsError("failed-precondition",
        "This pickup point is unavailable for arrival observations.");
    }
    if (data.manualCurbAtMillis != null &&
        data.manualCurbAtMillis > 253402300799999) {
      throw new HttpsError("invalid-argument", "Invalid curb estimate time.");
    }
    await assertTravelLegRevision({db, tx, programId: data.programId,
      legId: data.legId, actorUid, actualRevision: leg.revision,
      expectedRevision: data.expectedRevision,
      afterObservation: data.afterObservation});
    if (["dispatched", "arrived"].includes(leg.readiness)) {
      throw new HttpsError(
        "failed-precondition",
        "This guest is already dispatched.");
    }
    const now = deps.now();
    if (data.observedAtMillis < now.toMillis() - receiptRetentionMillis ||
        data.observedAtMillis > now.toMillis() + 5 * 60_000) {
      throw new HttpsError("failed-precondition",
        "This observation time needs review before it can be applied.");
    }
    // Clamp small positive clock skew so a physical ready fact is never future.
    const observedAt = admin.firestore.Timestamp.fromMillis(
      Math.min(data.observedAtMillis, now.toMillis()));
    const update: Record<string, unknown> = {
      updatedAt: now,
      revision: nextRevision(leg.revision, now),
    };
    switch (data.action) {
    case "claim":
      if (leg.claimedByUid && leg.claimedByUid !== actorUid) {
        throw new HttpsError(
          "already-exists", "Another greeter has claimed this guest.");
      }
      update.claimedByUid = actorUid;
      update.claimedAt = leg.claimedByUid === actorUid && leg.claimedAt ?
        leg.claimedAt : observedAt;
      break;
    case "unclaim":
      if (leg.claimedByUid && leg.claimedByUid !== actorUid &&
            access.role !== "manager" &&
            !dutyCoversTransportRoute(
              dutyAssignments(access, "transportDispatcher"),
              leg.pickupPointId, leg.destinationHotelId)) {
        throw new HttpsError(
          "permission-denied", "Only the claimant can release a claim.");
      }
      update.claimedByUid = null;
      update.claimedAt = null;
      break;
    case "markReady":
      update.readiness = "ready";
      update.readyAt = leg.readiness === "ready" && leg.readyAt ?
        leg.readyAt : observedAt;
      if (data.manualCurbAtMillis !== undefined &&
            data.manualCurbAtMillis !== null) {
        update.manualCurbAt = admin.firestore.Timestamp.fromMillis(
          data.manualCurbAtMillis);
        update.manualCurbNote = data.manualCurbNote ?? null;
      }
      break;
    case "markDisrupted":
      update.readiness = "disrupted";
      update.readyAt = null;
      if (data.manualCurbAtMillis !== undefined &&
            data.manualCurbAtMillis !== null) {
        update.manualCurbAt = admin.firestore.Timestamp.fromMillis(
          data.manualCurbAtMillis);
        update.manualCurbNote = data.manualCurbNote ?? null;
      }
      break;
    }
    tx.update(legRef, update);
    const receiptDoc: TransportOperationReceiptDocument = {
      programId: data.programId,
      operationKind: data.action,
      clientOperationId: data.clientOperationId,
      actorUid,
      requestHash,
      tripId: null,
      legId: data.legId,
      resultRevision: update.revision as number,
      resultJson: null,
      createdAt: now,
      expiresAt: admin.firestore.Timestamp.fromMillis(
        now.toMillis() + receiptRetentionMillis),
    };
    tx.set(receiptRef, receiptDoc);
    result = {revision: update.revision as number, alreadyApplied: false};
  });
  return {entityId: data.legId, revision: result!.revision,
    alreadyApplied: result!.alreadyApplied};
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = {...value} as Record<string, unknown>;
  for (const key of ["programId", "legId", "clientOperationId"]) {
    if (typeof input[key] === "string") input[key] = input[key].trim();
  }
  return input;
}

export const setProgramTravelReadiness = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 40}),
  (request) => setProgramTravelReadinessHandler(request)
);
