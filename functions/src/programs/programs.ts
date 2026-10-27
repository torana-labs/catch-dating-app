/* firestore-index: organizerPrograms (
  organizerId:ASCENDING,
  startsAt:DESCENDING
) */
/* firestore-index: organizerPrograms (
  organizerId:ASCENDING,
  createdBy:ASCENDING,
  startsAt:DESCENDING
) */
/* firestore-index: programFunctions (
  organizerId:ASCENDING,
  programId:ASCENDING
) */
/* firestore-index: programTravelLegs (
  programId:ASCENDING,
  kind:ASCENDING
) */
/* firestore-index: programStaffGrants (
  programId:ASCENDING,
  status:ASCENDING
) */
import {createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {FieldPath} from "firebase-admin/firestore";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {logger} from "firebase-functions";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {requireOrganizerManager} from "../shared/organizerManagerAuthority";
import {isOrganizerManager} from "../shared/organizerHosts";
import {programAdministrationDeadline, requireProgramManager} from
  "./programStaffPolicy";
import type {ProgramAccess} from "../shared/programAuthority";
import {
  assertRevision,
  loadProgramBundle,
  nextRevision,
  requireProgramMutable,
} from "../shared/programAuthority";
import {replanProgramMoments} from "../moments/momentRunner";
import type {
  OrganizerDocument,
  OrganizerProgramDocument,
  ProgramFunctionDocument,
  ProgramHotelDocument,
  ProgramPickupPointDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {CreateOrganizerProgramCallablePayload} from
  "../shared/generated/createOrganizerProgramCallablePayload";
import type {UpdateOrganizerProgramCallablePayload} from
  "../shared/generated/updateOrganizerProgramCallablePayload";
import type {ListOrganizerProgramsCallablePayload} from
  "../shared/generated/listOrganizerProgramsCallablePayload";
import type {ProgramIdCallablePayload} from
  "../shared/generated/programIdCallablePayload";
import type {OrganizerProgramCallableResponse} from
  "../shared/generated/organizerProgramCallableResponse";
import type {OrganizerProgramListCallableResponse} from
  "../shared/generated/organizerProgramListCallableResponse";
import type {ProgramMutationCallableResponse} from
  "../shared/generated/programMutationCallableResponse";
import {
  validateCreateOrganizerProgramCallablePayload,
} from "../shared/generated/validators/createOrganizerProgramInput";
import {
  validateUpdateOrganizerProgramCallablePayload,
} from "../shared/generated/validators/updateOrganizerProgramInput";
import {
  validateListOrganizerProgramsCallablePayload,
} from "../shared/generated/validators/listOrganizerProgramsInput";
import {
  validateProgramIdCallablePayload,
} from "../shared/generated/validators/programIdInput";

interface ProgramDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
}

export async function requireActiveProgramAccount(params: {
  db: FirebaseFirestore.Firestore;
  actorUid: string;
  transaction?: FirebaseFirestore.Transaction;
}): Promise<void> {
  const ref = params.db.collection("deletedUsers").doc(params.actorUid);
  const snapshot = params.transaction ?
    await params.transaction.get(ref) : await ref.get();
  if (snapshot.exists) {
    throw new HttpsError(
      "permission-denied",
      "This account cannot access private program operations."
    );
  }
}

const defaultDeps: ProgramDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
};

const defaultTransportSettings:
  OrganizerProgramDocument["transportSettings"] = {
    bandWindowMillis: 30 * 60 * 1000,
    maxReadyWaitMillis: 10 * 60 * 1000,
    domesticExitLagMillis: 25 * 60 * 1000,
    internationalExitLagMillis: 60 * 60 * 1000,
    vehicleClasses: [
      {id: "sedan", label: "Sedan", passengerCapacity: 3,
        luggageCapacity: 3, capabilities: [], sortOrder: 0},
      {id: "suv", label: "Innova / SUV", passengerCapacity: 6,
        luggageCapacity: 8, capabilities: ["extraLuggage"], sortOrder: 1},
      {id: "tempo", label: "Tempo Traveller", passengerCapacity: 12,
        luggageCapacity: 16, capabilities: ["extraLuggage"], sortOrder: 2},
    ],
  };

const programCallableLimits = {timeoutSeconds: 60, maxInstances: 20};

/** Setup preserves organizer management, without granting guest access or
 * creator-only retention authority. A creator or approved program admin can
 * also reopen this exact program after losing organizer membership. */
async function requireProgramSetupAccess(params: {
  db: FirebaseFirestore.Firestore;
  programId: string;
  actorUid: string;
  transaction: FirebaseFirestore.Transaction;
  now: FirebaseFirestore.Timestamp;
}): Promise<{program: OrganizerProgramDocument;
  administration: ProgramAccess | null}> {
  const {program, organizer} = await loadProgramBundle(params);
  if (program.createdBy === params.actorUid ||
      isOrganizerManager(organizer, params.actorUid)) {
    return {program, administration: null};
  }
  const administration = await requireProgramManager(params.db,
    params.programId, params.actorUid, params.transaction, params.now);
  programAdministrationDeadline(administration, params.now.toMillis());
  return {program: administration.program, administration};
}

export async function createOrganizerProgramHandler(
  request: CallableRequest<unknown>,
  deps: ProgramDeps = defaultDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<CreateOrganizerProgramCallablePayload>(
    request,
    validateCreateOrganizerProgramCallablePayload,
    normalizeProgramPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "createOrganizerProgram", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  if (data.endsAtMillis <= data.startsAtMillis) {
    throw new HttpsError(
      "invalid-argument", "Program end must be after its start."
    );
  }
  if (!isIanaTimeZone(data.timezone)) {
    throw new HttpsError(
      "invalid-argument", "Program timezone must be a valid IANA identifier."
    );
  }
  const settings = data.transportSettings ?? defaultTransportSettings;
  validateVehicleClasses(settings.vehicleClasses);
  const requestHash = data.requestId === undefined ? undefined :
    createHash("sha256").update(canonicalProgramCreateJson(data)).digest("hex");
  const programId = data.requestId === undefined ? undefined :
    "program_" + createHash("sha256")
      .update(JSON.stringify([actorUid, data.organizerId, data.requestId]))
      .digest("hex");
  const programs = db.collection("organizerPrograms");
  const ref = programId === undefined ?
    programs.doc() : programs.doc(programId);
  return db.runTransaction(async (tx) => {
    await requireActiveProgramAccount({db, actorUid, transaction: tx});
    await requireOrganizerManager({
      db, organizerId: data.organizerId, actorUid, transaction: tx,
    });
    if (requestHash !== undefined) {
      const existing = await tx.get(ref);
      if (existing.exists) {
        const program = requireDoc<OrganizerProgramDocument>(
          existing, "OrganizerProgramDocument");
        if (program.organizerId !== data.organizerId ||
            program.createdBy !== actorUid ||
            program.createRequestHash !== requestHash) {
          throw new HttpsError("failed-precondition",
            "Program create request was already used with different details.");
        }
        return {entityId: ref.id, revision: program.revision,
          alreadyApplied: true};
      }
    }
    const now = deps.now();
    const document: OrganizerProgramDocument = {
      organizerId: data.organizerId,
      kind: data.kind,
      title: data.title,
      timezone: data.timezone,
      startsAt: admin.firestore.Timestamp.fromMillis(data.startsAtMillis),
      endsAt: admin.firestore.Timestamp.fromMillis(data.endsAtMillis),
      rsvpDeadlineAt: data.rsvpDeadlineAtMillis == null ? null :
        admin.firestore.Timestamp.fromMillis(data.rsvpDeadlineAtMillis),
      status: "draft",
      capabilities: data.capabilities,
      transportSettings: settings,
      createdBy: actorUid,
      createdAt: now,
      updatedAt: now,
      revision: 1,
      ...(requestHash === undefined ? {} : {createRequestHash: requestHash}),
    };
    tx.set(ref, document);
    return {entityId: ref.id, revision: 1, alreadyApplied: false};
  });
}

export async function updateOrganizerProgramHandler(
  request: CallableRequest<unknown>,
  deps: ProgramDeps = defaultDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<UpdateOrganizerProgramCallablePayload>(
    request,
    validateUpdateOrganizerProgramCallablePayload,
    normalizeProgramPayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "updateOrganizerProgram", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const ref = db.collection("organizerPrograms").doc(data.programId);
  let committedRevision = 0;
  await db.runTransaction(async (tx) => {
    await requireActiveProgramAccount({db, actorUid, transaction: tx});
    const {program, administration} = await requireProgramSetupAccess({
      db, programId: data.programId, actorUid,
      transaction: tx, now: deps.now(),
    });
    assertRevision(program.revision, data.expectedRevision);
    // Archive/unarchive are dedicated lifecycle callables; the generic
    // update path may never enter or leave the archived state.
    requireProgramMutable(program);
    if (data.status === "archived") {
      throw new HttpsError(
        "failed-precondition",
        "Archive programs through archiveProgram so the retention clock starts."
      );
    }
    if (data.transportSettings) {
      validateVehicleClasses(data.transportSettings.vehicleClasses);
    }
    if (data.timezone !== undefined && !isIanaTimeZone(data.timezone)) {
      throw new HttpsError(
        "invalid-argument", "Program timezone must be a valid IANA identifier."
      );
    }
    const startsAtMillis = data.startsAtMillis ?? program.startsAt.toMillis();
    const endsAtMillis = data.endsAtMillis ?? program.endsAt.toMillis();
    if (endsAtMillis <= startsAtMillis) {
      throw new HttpsError(
        "invalid-argument", "Program end must be after its start."
      );
    }
    const now = deps.now();
    if (administration !== null) {
      programAdministrationDeadline(administration, now.toMillis());
    }
    const update: Record<string, unknown> = {
      updatedAt: now,
      revision: nextRevision(program.revision, now),
    };
    if (data.title !== undefined) update.title = data.title;
    if (data.timezone !== undefined) update.timezone = data.timezone;
    if (data.status !== undefined) update.status = data.status;
    if (data.capabilities !== undefined) {
      update.capabilities = data.capabilities;
    }
    if (data.transportSettings !== undefined) {
      update.transportSettings = data.transportSettings;
    }
    if (data.startsAtMillis !== undefined) {
      update.startsAt =
        admin.firestore.Timestamp.fromMillis(data.startsAtMillis);
    }
    if (data.endsAtMillis !== undefined) {
      update.endsAt =
        admin.firestore.Timestamp.fromMillis(data.endsAtMillis);
    }
    if (data.rsvpDeadlineAtMillis !== undefined) {
      update.rsvpDeadlineAt = data.rsvpDeadlineAtMillis === null ? null :
        admin.firestore.Timestamp.fromMillis(data.rsvpDeadlineAtMillis);
    }
    committedRevision = update.revision as number;
    tx.update(ref, update);
  });
  // Anchor-bearing edits (dates, deadline, timezone, status) move every
  // scope-anchored occurrence; replan the program's armed moments inline
  // rather than leaving stale plans until the sweep cursor reaches them.
  // Bounded and best-effort — the sweep converges whatever is missed.
  if (data.startsAtMillis !== undefined || data.endsAtMillis !== undefined ||
      data.timezone !== undefined || data.status !== undefined ||
      data.rsvpDeadlineAtMillis !== undefined) {
    try {
      const {capped} = await replanProgramMoments(
        db, data.programId, deps.now().toMillis());
      if (capped) {
        logger.warn(
          "Program replan hit the inline bound; sweep covers the rest",
          {programId: data.programId});
      }
    } catch (error) {
      logger.warn("Program-update replan deferred to sweep",
        {programId: data.programId, error});
    }
  }
  return {
    entityId: data.programId,
    revision: committedRevision,
    alreadyApplied: false,
  };
}

export async function listOrganizerProgramsHandler(
  request: CallableRequest<unknown>,
  deps: ProgramDeps = defaultDeps
): Promise<OrganizerProgramListCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<ListOrganizerProgramsCallablePayload>(
      request,
      validateListOrganizerProgramsCallablePayload,
      normalizeProgramPayload
    );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listOrganizerPrograms", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const pageSize = data.limit ?? 50;
  const {programDocs, hasMore} =
    await db.runTransaction(async (tx) => {
      await requireActiveProgramAccount({db, actorUid, transaction: tx});
      const organizerSnap = await tx.get(
        db.collection("organizers").doc(data.organizerId));
      if (!organizerSnap.exists) {
        throw new HttpsError("not-found", "Organizer not found.");
      }
      const organizer = requireDoc<OrganizerDocument>(
        organizerSnap, "OrganizerDocument");
      const isManager = isOrganizerManager(organizer, actorUid);
      if (data.programId !== undefined) {
        const program = await tx.get(
          db.collection("organizerPrograms").doc(data.programId)
        );
        if (!program.exists ||
            program.data()?.organizerId !== data.organizerId) {
          throw new HttpsError(
            "not-found", "Program is unavailable in this organizer."
          );
        }
        await requireProgramSetupAccess({
          db, programId: data.programId, actorUid,
          transaction: tx, now: deps.now(),
        });
        return {programDocs: [program], hasMore: false};
      }
      let query = db.collection("organizerPrograms")
        .where("organizerId", "==", data.organizerId);
      // Apply creator ownership before the read bound; never fetch an organizer
      // page and filter afterward, which can omit the creator's own programs.
      if (!isManager) query = query.where("createdBy", "==", actorUid);
      query = query
        .orderBy("startsAt", "desc")
        .orderBy(FieldPath.documentId(), "desc");
      if (data.cursor !== undefined) {
        const stableCursor = decodeProgramInventoryCursor(data.cursor);
        const cursorId = stableCursor?.programId ?? data.cursor;
        const cursor = await tx.get(
          db.collection("organizerPrograms").doc(cursorId)
        );
        if (!cursor.exists || cursor.data()?.organizerId !== data.organizerId ||
            (!isManager && cursor.data()?.createdBy !== actorUid)) {
          throw new HttpsError(
            "not-found", "Program inventory cursor is unavailable."
          );
        }
        query = stableCursor === null ? query.startAfter(cursor) :
          query.startAfter(
            admin.firestore.Timestamp.fromMillis(stableCursor.startsAtMillis),
            stableCursor.programId
          );
      }
      const snap = await tx.get(query.limit(pageSize + 1));
      if (!isManager && data.cursor === undefined && snap.empty) {
        throw new HttpsError("permission-denied",
          "This account has no created programs in this organizer.");
      }
      return {
        programDocs: snap.docs.slice(0, pageSize),
        hasMore: snap.size > pageSize,
      };
    });
  // Batch only the authorized inventory IDs. Bound work to two reads for the
  // canonical 50-row inventory; partial or failed counts never conceal rows.
  const functionCounts = new Map<string, number>();
  const countReadLimit = 2000;
  for (let offset = 0; offset < programDocs.length; offset += 30) {
    const ids = programDocs.slice(offset, offset + 30).map((doc) => doc.id);
    try {
      const functions = await db.collection("programFunctions")
        .where("organizerId", "==", data.organizerId)
        .where("programId", "in", ids).limit(countReadLimit + 1).get();
      if (functions.size > countReadLimit) continue;
      for (const id of ids) functionCounts.set(id, 0);
      for (const doc of functions.docs) {
        const value = doc.data();
        if (value.organizerId === data.organizerId &&
            functionCounts.has(value.programId)) {
          functionCounts.set(value.programId,
            functionCounts.get(value.programId)! + 1);
        }
      }
    } catch (error) {
      logger.warn("Program inventory count unavailable", {error});
    }
  }
  let exactProgram: OrganizerProgramDocument | null = null;
  if (data.programId !== undefined) {
    const programId = data.programId;
    // Count reads can outlive a grant, approval, account or organizer role.
    // Read current authority again; cached expiry alone cannot prove access.
    const setup = await db.runTransaction(async (tx) => {
      await requireActiveProgramAccount({db, actorUid, transaction: tx});
      const current = await requireProgramSetupAccess({
        db, programId, actorUid, transaction: tx, now: deps.now(),
      });
      if (current.program.organizerId !== data.organizerId) {
        throw new HttpsError(
          "not-found", "Program is unavailable in this organizer.");
      }
      return current;
    });
    exactProgram = setup.program;
    // Sample time after the final awaited read, with no later awaits before
    // returning the row from the same freshly authorized program version.
    if (setup.administration !== null) {
      programAdministrationDeadline(
        setup.administration, deps.now().toMillis());
    }
  }
  const lastProgram = hasMore ? requireDoc<OrganizerProgramDocument>(
    programDocs.at(-1)!, "OrganizerProgramDocument") : null;
  return {
    nextCursor: lastProgram === null ? null : encodeProgramInventoryCursor({
      startsAtMillis: lastProgram.startsAt.toMillis(),
      programId: programDocs.at(-1)!.id,
    }),
    programs: programDocs.map((doc) => {
      const program = exactProgram ?? requireDoc<OrganizerProgramDocument>(
        doc, "OrganizerProgramDocument");
      return {
        programId: doc.id,
        kind: program.kind,
        title: program.title,
        status: program.status,
        timezone: program.timezone,
        startsAtMillis: program.startsAt.toMillis(),
        endsAtMillis: program.endsAt.toMillis(),
        capabilities: program.capabilities,
        canArchive: program.createdBy === actorUid &&
          program.status !== "archived",
        canUnarchive: program.createdBy === actorUid &&
          program.status === "archived",
        ...(functionCounts.has(doc.id) ?
          {functionCount: functionCounts.get(doc.id)!} : {}),
        archivedAtMillis: program.archivedAt?.toMillis() ?? null,
        anonymizeAtMillis: program.anonymizeAt?.toMillis() ?? null,
        anonymizedAtMillis: program.anonymizedAt?.toMillis() ?? null,
        revision: program.revision,
      };
    }),
  };
}

export async function getOrganizerProgramHandler(
  request: CallableRequest<unknown>,
  deps: ProgramDeps = defaultDeps
): Promise<OrganizerProgramCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ProgramIdCallablePayload>(
    request, validateProgramIdCallablePayload, normalizeProgramPayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "getOrganizerProgram", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  return db.runTransaction(async (tx) => {
    await requireActiveProgramAccount({db, actorUid, transaction: tx});
    const {program, administration} = await requireProgramSetupAccess({
      db, programId: data.programId, actorUid, transaction: tx, now: deps.now(),
    });
    const read = (query: FirebaseFirestore.Query) => tx.get(query);
    const [functionsSnap, pickupsSnap, hotelsSnap, guestsSnap,
      householdsSnap, legsSnap, staffSnap] = await Promise.all([
      read(db.collection("programFunctions")
        .where("programId", "==", data.programId).limit(40)),
      read(db.collection("programPickupPoints")
        .where("programId", "==", data.programId).limit(32)),
      read(db.collection("programHotels")
        .where("programId", "==", data.programId).limit(64)),
      read(db.collection("programGuests")
        .where("programId", "==", data.programId).limit(501)),
      read(db.collection("programHouseholds")
        .where("programId", "==", data.programId).limit(501)),
      read(db.collection("programTravelLegs")
        .where("programId", "==", data.programId)
        .where("kind", "==", "inbound").limit(501)),
      read(db.collection("programStaffGrants")
        .where("programId", "==", data.programId)
        .where("status", "==", "active").limit(101)),
    ]);
    if (administration !== null) {
      programAdministrationDeadline(administration, deps.now().toMillis());
    }
    const capped = (snap: FirebaseFirestore.QuerySnapshot) =>
      Math.min(snap.size, 500);
    return {
      program: {
        programId: data.programId,
        organizerId: program.organizerId,
        kind: program.kind,
        title: program.title,
        timezone: program.timezone,
        status: program.status,
        startsAtMillis: program.startsAt.toMillis(),
        endsAtMillis: program.endsAt.toMillis(),
        capabilities: program.capabilities,
        transportSettings: program.transportSettings,
        archivedAtMillis: program.archivedAt?.toMillis() ?? null,
        anonymizeAtMillis: program.anonymizeAt?.toMillis() ?? null,
        anonymizedAtMillis: program.anonymizedAt?.toMillis() ?? null,
        revision: program.revision,
      },
      functions: functionsSnap.docs.map((doc) => {
        const fn = doc.data() as ProgramFunctionDocument;
        return {
          functionId: doc.id,
          name: fn.name,
          startsAtMillis: fn.startsAt.toMillis(),
          endsAtMillis: fn.endsAt.toMillis(),
          venueName: fn.venueName,
          status: fn.status,
          invitationMode: fn.invitationMode ?? "allGuests",
          checkInEnabled: fn.checkInEnabled ?? false,
          dressCode: fn.dressCode ?? null,
          instructions: fn.instructions ?? null,
          expectedCount: fn.expectedCount ?? null,
          checkedInCount: fn.checkedInCount ?? null,
          revision: fn.revision,
        };
      }),
      pickupPoints: pickupsSnap.docs.map((doc) => {
        const point = doc.data() as ProgramPickupPointDocument;
        return {
          pickupPointId: doc.id,
          kind: point.kind,
          label: point.label,
          iataCode: point.iataCode,
          terminal: point.terminal,
          meetingZone: point.meetingZone,
          instructions: point.instructions,
          active: point.active,
          revision: point.revision,
        };
      }),
      hotels: hotelsSnap.docs.map((doc) => {
        const hotel = doc.data() as ProgramHotelDocument;
        return {
          hotelId: doc.id,
          name: hotel.name,
          address: hotel.address,
          receptionContact: hotel.receptionContact,
          active: hotel.active,
          revision: hotel.revision,
        };
      }),
      counts: {
        guests: capped(guestsSnap),
        households: capped(householdsSnap),
        inboundLegs: capped(legsSnap),
        activeStaff: Math.min(staffSnap.size, 100),
      },
    };
  });
}

export function validateVehicleClasses(
  classes: OrganizerProgramDocument["transportSettings"]["vehicleClasses"]
): void {
  const ids = new Set<string>();
  for (const vehicle of classes) {
    if (ids.has(vehicle.id)) {
      throw new HttpsError(
        "invalid-argument", `Duplicate vehicle class "${vehicle.id}".`
      );
    }
    ids.add(vehicle.id);
  }
}

function canonicalProgramCreateJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalProgramCreateJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort()
      .filter((key) => record[key] !== undefined)
      .map((key) =>
        `${JSON.stringify(key)}:${canonicalProgramCreateJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

type ProgramInventoryCursor = {
  startsAtMillis: number;
  programId: string;
};

function encodeProgramInventoryCursor(cursor: ProgramInventoryCursor): string {
  const payload = JSON.stringify({
    v: 1,
    s: cursor.startsAtMillis,
    i: cursor.programId,
  });
  return `v1.${Buffer.from(payload).toString("base64url")}`;
}

function decodeProgramInventoryCursor(
  value: string
): ProgramInventoryCursor | null {
  if (!value.startsWith("v1.")) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(value.slice(3), "base64url").toString("utf8")
    ) as {v?: unknown; s?: unknown; i?: unknown};
    if (decoded.v !== 1 || !Number.isSafeInteger(decoded.s) ||
        (decoded.s as number) < 0 || typeof decoded.i !== "string" ||
        decoded.i.length < 1 || decoded.i.length > 180) {
      throw new Error("Invalid cursor payload.");
    }
    return {
      startsAtMillis: decoded.s as number,
      programId: decoded.i,
    };
  } catch {
    throw new HttpsError(
      "invalid-argument", "Program inventory cursor is invalid."
    );
  }
}

function isIanaTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", {timeZone: value}).format(0);
    return true;
  } catch {
    return false;
  }
}

function normalizeProgramPayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const input = value as Record<string, unknown>;
  const trimmed = {...input};
  for (const key of [
    "programId", "organizerId", "title", "timezone", "name", "label",
    "venueName", "address",
  ]) {
    if (typeof trimmed[key] === "string") {
      trimmed[key] = (trimmed[key] as string).trim();
    }
  }
  return trimmed;
}

export const createOrganizerProgram = onCall(
  appCheckCallableOptionsWithLimits(programCallableLimits),
  (request) => createOrganizerProgramHandler(request)
);
export const updateOrganizerProgram = onCall(
  appCheckCallableOptionsWithLimits(programCallableLimits),
  (request) => updateOrganizerProgramHandler(request)
);
export const listOrganizerPrograms = onCall(
  appCheckCallableOptionsWithLimits(programCallableLimits),
  (request) => listOrganizerProgramsHandler(request)
);
export const getOrganizerProgram = onCall(
  appCheckCallableOptionsWithLimits(programCallableLimits),
  (request) => getOrganizerProgramHandler(request)
);
