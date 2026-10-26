/* firestore-index: transportVendors (
  organizerId:ASCENDING,
  active:ASCENDING
) */
/* firestore-index: transportVendors (
  organizerId:ASCENDING,
  active:ASCENDING,
  programIds:CONTAINS
) */
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {logger} from "firebase-functions";
import {requireAuth} from "../shared/auth";
import {replanProgramMoments} from "../moments/momentRunner";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {requireOrganizerManager} from "../shared/organizerManagerAuthority";
import {
  assertRevision,
  nextRevision,
  requireProgramAccess,
  requireProgramMutable,
  requireProgramDuty,
} from "../shared/programAuthority";
import type {
  OrganizerProgramDocument,
  ProgramFunctionDocument,
  ProgramHotelDocument,
  ProgramPickupPointDocument,
  TransportVendorDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {UpsertProgramFunctionCallablePayload} from
  "../shared/generated/upsertProgramFunctionCallablePayload";
import type {UpsertProgramPickupPointCallablePayload} from
  "../shared/generated/upsertProgramPickupPointCallablePayload";
import type {UpsertProgramHotelCallablePayload} from
  "../shared/generated/upsertProgramHotelCallablePayload";
import type {UpsertTransportVendorCallablePayload} from
  "../shared/generated/upsertTransportVendorCallablePayload";
import type {ListTransportVendorsCallablePayload} from
  "../shared/generated/listTransportVendorsCallablePayload";
import type {ProgramMutationCallableResponse} from
  "../shared/generated/programMutationCallableResponse";
import type {TransportVendorListCallableResponse} from
  "../shared/generated/transportVendorListCallableResponse";
import {
  validateUpsertProgramFunctionCallablePayload,
} from "../shared/generated/validators/upsertProgramFunctionInput";
import {
  validateUpsertProgramPickupPointCallablePayload,
} from "../shared/generated/validators/upsertProgramPickupPointInput";
import {
  validateUpsertProgramHotelCallablePayload,
} from "../shared/generated/validators/upsertProgramHotelInput";
import {
  validateUpsertTransportVendorCallablePayload,
} from "../shared/generated/validators/upsertTransportVendorInput";
import {
  validateListTransportVendorsCallablePayload,
} from "../shared/generated/validators/listTransportVendorsInput";

interface ResourceDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: ResourceDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
};

const resourceCallableLimits = {timeoutSeconds: 60, maxInstances: 20};

export async function upsertProgramFunctionHandler(
  request: CallableRequest<unknown>,
  deps: ResourceDeps = defaultDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<UpsertProgramFunctionCallablePayload>(
    request, validateUpsertProgramFunctionCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "upsertProgramFunction", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  if (data.endsAtMillis <= data.startsAtMillis) {
    throw new HttpsError(
      "invalid-argument", "Function end must be after its start.");
  }
  const ref = data.functionId ?
    db.collection("programFunctions").doc(data.functionId) :
    db.collection("programFunctions").doc();
  const revision = await runUpsert(db, ref, data.expectedRevision,
    data.programId, actorUid, deps, (existing, now, organizerId) => {
      const doc = existing as ProgramFunctionDocument | undefined;
      const document: ProgramFunctionDocument = {
        programId: data.programId,
        organizerId,
        name: data.name,
        startsAt:
          admin.firestore.Timestamp.fromMillis(data.startsAtMillis),
        endsAt: admin.firestore.Timestamp.fromMillis(data.endsAtMillis),
        venueName: data.venueName,
        venueNotes: data.venueNotes === undefined ?
          doc?.venueNotes ?? null : data.venueNotes,
        status: data.status ?? doc?.status ?? "scheduled",
        createdAt: doc?.createdAt ?? now,
        updatedAt: now,
        revision: nextRevision(doc?.revision, now),
      };
      return document;
    });
  // Function times/status move every anchored occurrence — replan the
  // program's armed moments inline. Bounded; the sweep converges the rest.
  try {
    const {capped} = await replanProgramMoments(
      db, data.programId, deps.now().toMillis());
    if (capped) {
      logger.warn("Function-upsert replan hit the inline bound",
        {programId: data.programId, functionId: ref.id});
    }
  } catch (error) {
    logger.warn("Function-upsert replan deferred to sweep",
      {programId: data.programId, functionId: ref.id, error});
  }
  return {entityId: ref.id, revision, alreadyApplied: false};
}

export async function upsertProgramPickupPointHandler(
  request: CallableRequest<unknown>,
  deps: ResourceDeps = defaultDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<UpsertProgramPickupPointCallablePayload>(
      request, validateUpsertProgramPickupPointCallablePayload,
      normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "upsertProgramPickupPoint", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const ref = data.pickupPointId ?
    db.collection("programPickupPoints").doc(data.pickupPointId) :
    db.collection("programPickupPoints").doc();
  const revision = await runUpsert(db, ref, data.expectedRevision,
    data.programId, actorUid, deps, (existing, now, organizerId) => {
      const doc = existing as ProgramPickupPointDocument | undefined;
      const document: ProgramPickupPointDocument = {
        programId: data.programId,
        organizerId,
        kind: data.kind,
        label: data.label,
        iataCode: data.iataCode === undefined ?
          doc?.iataCode ?? null : data.iataCode,
        terminal: data.terminal === undefined ?
          doc?.terminal ?? null : data.terminal,
        meetingZone: data.meetingZone === undefined ?
          doc?.meetingZone ?? null : data.meetingZone,
        latitude: data.latitude === undefined ?
          doc?.latitude ?? null : data.latitude,
        longitude: data.longitude === undefined ?
          doc?.longitude ?? null : data.longitude,
        instructions: data.instructions === undefined ?
          doc?.instructions ?? null : data.instructions,
        active: data.active ?? doc?.active ?? true,
        createdAt: doc?.createdAt ?? now,
        updatedAt: now,
        revision: nextRevision(doc?.revision, now),
      };
      return document;
    });
  return {entityId: ref.id, revision, alreadyApplied: false};
}

export async function upsertProgramHotelHandler(
  request: CallableRequest<unknown>,
  deps: ResourceDeps = defaultDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<UpsertProgramHotelCallablePayload>(
    request, validateUpsertProgramHotelCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "upsertProgramHotel", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const ref = data.hotelId ?
    db.collection("programHotels").doc(data.hotelId) :
    db.collection("programHotels").doc();
  const revision = await runUpsert(db, ref, data.expectedRevision,
    data.programId, actorUid, deps, (existing, now, organizerId) => {
      const doc = existing as ProgramHotelDocument | undefined;
      const document: ProgramHotelDocument = {
        programId: data.programId,
        organizerId,
        name: data.name,
        address: data.address,
        latitude: data.latitude === undefined ?
          doc?.latitude ?? null : data.latitude,
        longitude: data.longitude === undefined ?
          doc?.longitude ?? null : data.longitude,
        receptionContact: data.receptionContact === undefined ?
          doc?.receptionContact ?? null : data.receptionContact,
        notes: data.notes === undefined ? doc?.notes ?? null : data.notes,
        active: data.active ?? doc?.active ?? true,
        createdAt: doc?.createdAt ?? now,
        updatedAt: now,
        revision: nextRevision(doc?.revision, now),
      };
      return document;
    });
  return {entityId: ref.id, revision, alreadyApplied: false};
}

/** Vendors are organizer-owned; program binding is explicit. */
export async function upsertTransportVendorHandler(
  request: CallableRequest<unknown>,
  deps: ResourceDeps = defaultDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<UpsertTransportVendorCallablePayload>(
    request, validateUpsertTransportVendorCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "upsertTransportVendor", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const ref = data.vendorId ?
    db.collection("transportVendors").doc(data.vendorId) :
    db.collection("transportVendors").doc();
  let committedRevision = 0;
  await db.runTransaction(async (tx) => {
    await requireOrganizerManager({
      db, organizerId: data.organizerId, actorUid, transaction: tx,
    });
    const snap = await tx.get(ref);
    const existing = snap.data() as TransportVendorDocument | undefined;
    if (snap.exists && existing!.organizerId !== data.organizerId) {
      throw new HttpsError(
        "not-found", "Vendor not found for this organizer.");
    }
    if (!snap.exists && data.expectedRevision !== undefined) {
      throw new HttpsError("failed-precondition", "Vendor does not exist yet.");
    }
    assertRevision(existing?.revision ?? 0, data.expectedRevision);
    const programIds = data.programIds ??
      (existing ? existing.programIds : []);
    if (!Array.isArray(programIds) || programIds.length > 100 ||
        programIds.some((id) => typeof id !== "string" || !id) ||
        new Set(programIds).size !== programIds.length) {
      throw new HttpsError("failed-precondition",
        "Vendor program bindings need reconciliation.");
    }
    const programs = await Promise.all(programIds.map((programId) =>
      tx.get(db.collection("organizerPrograms").doc(programId))));
    for (const programSnap of programs) {
      const program = programSnap.data() as OrganizerProgramDocument |
        undefined;
      if (!program || program.organizerId !== data.organizerId) {
        throw new HttpsError("invalid-argument",
          "Every vendor program must belong to this organizer.");
      }
    }
    const now = deps.now();
    const document: TransportVendorDocument = {
      organizerId: data.organizerId,
      name: data.name,
      contactName: data.contactName === undefined ?
        existing?.contactName ?? null : data.contactName,
      phoneE164: data.phoneE164 === undefined ?
        existing?.phoneE164 ?? null : data.phoneE164,
      programIds,
      active: data.active ?? existing?.active ?? true,
      notes: data.notes === undefined ? existing?.notes ?? null : data.notes,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      revision: nextRevision(existing?.revision, now),
    };
    committedRevision = document.revision;
    tx.set(ref, document);
  });
  return {entityId: ref.id, revision: committedRevision,
    alreadyApplied: false};
}

export async function listTransportVendorsHandler(
  request: CallableRequest<unknown>,
  deps: ResourceDeps = defaultDeps
): Promise<TransportVendorListCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ListTransportVendorsCallablePayload>(
    request, validateListTransportVendorsCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listTransportVendors", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  if (data.programId) {
    // Dispatchers and coordinators may resolve bound vendors for a program.
    const access = await requireProgramAccess({
      db, programId: data.programId, actorUid, now: deps.now(),
    });
    requireProgramDuty(access, "transportDispatcher");
    if (access.program.organizerId !== data.organizerId) {
      throw new HttpsError("permission-denied",
        "This program belongs to a different organizer.");
    }
  } else {
    await requireOrganizerManager({
      db, organizerId: data.organizerId, actorUid,
    });
  }
  let query: FirebaseFirestore.Query = db.collection("transportVendors")
    .where("organizerId", "==", data.organizerId)
    .where("active", "==", true);
  if (data.programId) {
    query = query.where("programIds", "array-contains", data.programId);
  }
  const snap = await query.limit(101).get();
  if (snap.size > 100) {
    throw new HttpsError("resource-exhausted",
      "This vendor inventory exceeds its 100-record limit.");
  }
  return {
    vendors: snap.docs.map((doc) => {
      const vendor = doc.data() as TransportVendorDocument;
      return {
        vendorId: doc.id,
        name: vendor.name,
        active: vendor.active,
        boundToProgram: data.programId ?
          vendor.programIds.includes(data.programId) : false,
      };
    }),
  };
}

async function runUpsert(
  db: FirebaseFirestore.Firestore,
  ref: FirebaseFirestore.DocumentReference,
  expectedRevision: number | undefined,
  programId: string,
  actorUid: string,
  deps: ResourceDeps,
  build: (existing: unknown,
    now: FirebaseFirestore.Timestamp, organizerId: string) =>
    {revision: number; programId: string; organizerId: string}
): Promise<number> {
  return db.runTransaction(async (tx) => {
    const access = await requireProgramAccess({
      db, programId, actorUid, now: deps.now(), transaction: tx,
    });
    requireProgramMutable(access.program);
    requireProgramDuty(access, "programCoordinator");
    const organizerId = access.program.organizerId;
    const snap = await tx.get(ref);
    const existing = snap.data();
    if (existing && (existing.programId !== programId ||
        existing.organizerId !== organizerId)) {
      throw new HttpsError("not-found", "Record not found in this program.");
    }
    if (!snap.exists && expectedRevision !== undefined) {
      throw new HttpsError("failed-precondition", "Record does not exist yet.");
    }
    assertRevision(existing?.revision ?? 0, expectedRevision);
    const document = build(existing, deps.now(), organizerId);
    tx.set(ref, document);
    return document.revision;
  });
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const input = value as Record<string, unknown>;
  const trimmed = {...input};
  for (const key of ["programId", "organizerId", "functionId",
    "pickupPointId", "hotelId", "vendorId", "name", "label", "venueName",
    "address", "iataCode", "terminal"]) {
    if (typeof trimmed[key] === "string") {
      trimmed[key] = (trimmed[key] as string).trim();
    }
  }
  return trimmed;
}

export const upsertProgramFunction = onCall(
  appCheckCallableOptionsWithLimits(resourceCallableLimits),
  (request) => upsertProgramFunctionHandler(request)
);
export const upsertProgramPickupPoint = onCall(
  appCheckCallableOptionsWithLimits(resourceCallableLimits),
  (request) => upsertProgramPickupPointHandler(request)
);
export const upsertProgramHotel = onCall(
  appCheckCallableOptionsWithLimits(resourceCallableLimits),
  (request) => upsertProgramHotelHandler(request)
);
export const upsertTransportVendor = onCall(
  appCheckCallableOptionsWithLimits(resourceCallableLimits),
  (request) => upsertTransportVendorHandler(request)
);
export const listTransportVendors = onCall(
  appCheckCallableOptionsWithLimits(resourceCallableLimits),
  (request) => listTransportVendorsHandler(request)
);
