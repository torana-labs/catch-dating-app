/* firestore-index: programPickupPoints (
  programId:ASCENDING,
  organizerId:ASCENDING,
  active:ASCENDING
) */
/* firestore-index: programHotels (
  programId:ASCENDING,
  organizerId:ASCENDING,
  active:ASCENDING
) */
/* firestore-index: programStaffGrants (
  programId:ASCENDING,
  organizerId:ASCENDING,
  status:ASCENDING,
  expiresAt:ASCENDING
) */
/* firestore-index: programStaffGrants (
  programId:ASCENDING,
  organizerId:ASCENDING
) */
import * as admin from "firebase-admin";
import {FieldPath} from "firebase-admin/firestore";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {
  activeProgramDuties,
  nextRevision,
  programStaffGrantId,
  programOwnerAuthorizationDeadline,
  requireProgramAccess,
  requireProgramMutable,
} from "../shared/programAuthority";
import type {ProgramAccess} from "../shared/programAuthority";
import {staffTimestampMillis} from "../shared/eventOperatorAuthority";
import {normalizeRosterPhone} from "../events/eventAttendees";
import {eventStaffDisplayName, resolveStaffAuthUser} from
  "../events/eventStaff";
import type {
  ProgramFunctionDocument,
  ProgramHotelDocument,
  ProgramPickupPointDocument,
  ProgramStaffGrantDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ProgramIdCallablePayload} from
  "../shared/generated/programIdCallablePayload";
import type {GrantProgramStaffCallablePayload} from
  "../shared/generated/grantProgramStaffCallablePayload";
import type {RevokeProgramStaffCallablePayload} from
  "../shared/generated/revokeProgramStaffCallablePayload";
import type {ProgramAccessCallableResponse} from
  "../shared/generated/programAccessCallableResponse";
import type {ProgramStaffListCallableResponse} from
  "../shared/generated/programStaffListCallableResponse";
import type {ProgramMutationCallableResponse} from
  "../shared/generated/programMutationCallableResponse";
import type {ListProgramStaffCallablePayload} from
  "../shared/generated/listProgramStaffCallablePayload";
import {validateListProgramStaffCallablePayload} from
  "../shared/generated/validators/listProgramStaffInput";
import {
  validateProgramIdCallablePayload,
} from "../shared/generated/validators/programIdInput";
import {
  validateGrantProgramStaffCallablePayload,
} from "../shared/generated/validators/grantProgramStaffInput";
import {
  validateRevokeProgramStaffCallablePayload,
} from "../shared/generated/validators/revokeProgramStaffInput";

import {
  grantDuties,
  authorizeProgramStaffGrant,
  maxGrantDurationMillis,
  maxProgramStaff,
  programAdministrationDeadline,
  requireProgramManager,
  unionScope,
  validateDutyStations,
} from "./programStaffPolicy";

interface ProgramStaffDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
  getUserByPhoneNumber: (
    phoneNumber: string
  ) => Promise<admin.auth.UserRecord>;
}

const defaultDeps: ProgramStaffDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
  getUserByPhoneNumber: (phoneNumber) =>
    admin.auth().getUserByPhoneNumber(phoneNumber),
};

const staffCallableLimits = {timeoutSeconds: 60, maxInstances: 20};

/** Work-shell bootstrap: role, duties, station scopes and labeled resources. */
export async function getProgramWorkAccessHandler(
  request: CallableRequest<unknown>,
  deps: ProgramStaffDeps = defaultDeps
): Promise<ProgramAccessCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ProgramIdCallablePayload>(
    request, validateProgramIdCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "getProgramWorkAccess", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const access = await requireProgramAccess({
    db, programId: data.programId, actorUid, now: deps.now(),
  });
  const {program} = access;
  const operationalDuties = access.grant?.duties.filter((assignment) =>
    assignment.duty !== "programAdmin") ?? [];
  const pickupScope = access.role === "manager" ? null :
    unionScope(operationalDuties.filter((duty) => duty.duty !== "hotelDesk"),
      "pickupPointIds");
  const hotelScope = access.role === "manager" ? null :
    unionScope(operationalDuties, "hotelIds");
  // Function surfaces exist only for door and guest-desk duties; other staff
  // never pay the function query and always read an empty list. An empty
  // scope set loads nothing; null means unrestricted.
  const doorDuties = access.grant?.duties.filter((duty) =>
    duty.duty === "functionCheckIn" || duty.duty === "functionLead" ||
    duty.duty === "guestRelations" ||
    duty.duty === "programCoordinator") ?? [];
  const functionScope = access.role === "manager" ? null :
    unionScope(doorDuties, "functionIds");
  const common = {db, programId: data.programId,
    organizerId: program.organizerId};
  const [pickups, destinations, functionRows] = await Promise.all([
    loadWorkResources<ProgramPickupPointDocument>({...common,
      collection: "programPickupPoints", scope: pickupScope, cap: 32}),
    loadWorkResources<ProgramHotelDocument>({...common,
      collection: "programHotels", scope: hotelScope, cap: 64}),
    loadWorkFunctions({...common, scope: functionScope, cap: 40}),
  ]);
  const functions = functionRows
    .sort((a, b) => a.doc.startsAt.toMillis() - b.doc.startsAt.toMillis())
    .map(({id, doc}) => ({
      functionId: id,
      name: doc.name,
      venueName: doc.venueName,
      startsAtMillis: doc.startsAt.toMillis(),
      endsAtMillis: doc.endsAt.toMillis(),
      checkInEnabled: doc.checkInEnabled ?? true,
      status: doc.status,
      expectedCount: doc.expectedCount ?? 0,
      checkedInCount: doc.checkedInCount ?? 0,
    }));
  const pickupPoints = pickups.map((entry) => ({
    pickupPointId: entry.id,
    label: entry.doc.label,
    kind: entry.doc.kind,
    iataCode: entry.doc.iataCode,
    terminal: entry.doc.terminal,
  }));
  const hotels = destinations.map((entry) =>
    ({hotelId: entry.id, name: entry.doc.name}));
  return {
    programId: data.programId,
    organizerId: program.organizerId,
    title: program.title,
    kind: program.kind,
    timezone: program.timezone,
    status: program.status,
    actorRole: access.role,
    duties: access.role === "manager" ? [] : access.grant!.duties,
    grantExpiresAtMillis: access.grant ?
      staffTimestampMillis(access.grant.expiresAt) : null,
    capabilities: program.capabilities,
    pickupPoints,
    hotels,
    functions,
    vehicleClasses: program.transportSettings.vehicleClasses,
  };
}

/** Apply ownership and assignment scope before the response contract cap. */
async function loadWorkResources<
  T extends ProgramPickupPointDocument | ProgramHotelDocument
>(params: {
  db: FirebaseFirestore.Firestore;
  collection: "programPickupPoints" | "programHotels";
  programId: string;
  organizerId: string;
  scope: Set<string> | null;
  cap: number;
}): Promise<Array<{id: string; doc: T}>> {
  const collection = params.db.collection(params.collection);
  const docs = params.scope === null ? (await collection
    .where("programId", "==", params.programId)
    .where("organizerId", "==", params.organizerId)
    .where("active", "==", true).limit(params.cap + 1).get()).docs :
    await Promise.all([...params.scope].sort().map((id) =>
      collection.doc(id).get()));
  const resources: Array<{id: string; doc: T}> = [];
  for (const snap of docs) {
    const doc = snap.data() as T | undefined;
    if (doc && doc.programId === params.programId &&
        doc.organizerId === params.organizerId && doc.active === true) {
      resources.push({id: snap.id, doc});
    }
  }
  if (resources.length > params.cap) {
    const label = params.collection === "programHotels" ?
      "hotels" : "pickup points";
    throw new HttpsError("resource-exhausted",
      `This work view exceeds ${params.cap} active ${label}. ` +
      "Reduce active resources or narrow the staff scope.");
  }
  return resources;
}

/**
 * Functions have no `active` flag — scope loads go by id, unrestricted loads
 * page by programId+organizerId, and overflow is explicit like other
 * resources.
 */
async function loadWorkFunctions(params: {
  db: FirebaseFirestore.Firestore;
  programId: string;
  organizerId: string;
  scope: Set<string> | null;
  cap: number;
}): Promise<Array<{id: string; doc: ProgramFunctionDocument}>> {
  const collection = params.db.collection("programFunctions");
  const docs = params.scope === null ? (await collection
    .where("programId", "==", params.programId)
    .where("organizerId", "==", params.organizerId)
    .limit(params.cap + 1).get()).docs :
    await Promise.all([...params.scope].sort().map((id) =>
      collection.doc(id).get()));
  const resources: Array<{id: string; doc: ProgramFunctionDocument}> = [];
  for (const snap of docs) {
    const doc = snap.data() as ProgramFunctionDocument | undefined;
    if (doc && doc.programId === params.programId &&
        doc.organizerId === params.organizerId) {
      resources.push({id: snap.id, doc});
    }
  }
  if (resources.length > params.cap) {
    throw new HttpsError("resource-exhausted",
      `This work view exceeds ${params.cap} functions. ` +
      "Narrow the staff scope to fewer functions.");
  }
  return resources;
}

export async function listProgramStaffHandler(
  request: CallableRequest<unknown>,
  deps: ProgramStaffDeps = defaultDeps
): Promise<ProgramStaffListCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ListProgramStaffCallablePayload>(
    request, validateListProgramStaffCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listProgramStaff", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  return db.runTransaction(async (tx) => {
    const access = await requireProgramManager(db, data.programId, actorUid,
      tx, deps.now());
    return programStaffList(db, data, access, tx, deps.now);
  });
}

export async function grantProgramStaffHandler(
  request: CallableRequest<unknown>,
  deps: ProgramStaffDeps = defaultDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<GrantProgramStaffCallablePayload>(
    request, validateGrantProgramStaffCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "grantProgramStaff", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  const initial = await requireProgramManager(db, data.programId, actorUid,
    undefined, deps.now());
  const {program} = initial;
  requireProgramMutable(program);
  const now = deps.now();
  if (data.expiresAtMillis <= now.toMillis() ||
      data.expiresAtMillis > now.toMillis() + maxGrantDurationMillis) {
    throw new HttpsError(
      "invalid-argument",
      "Program staff access must expire within the next 14 days."
    );
  }
  authorizeProgramStaffGrant(initial, actorUid, data.expiresAtMillis,
    now.toMillis());
  await validateDutyStations({db, programId: data.programId,
    organizerId: program.organizerId, duties: data.duties});
  const phone = normalizeRosterPhone(data.phoneNumber);
  if (!phone.value || phone.issue) {
    throw new HttpsError("invalid-argument", phone.issue ?? "Invalid phone.");
  }
  const authUser = await resolveStaffAuthUser(
    deps.getUserByPhoneNumber, phone.value);
  if (program.createdBy === authUser.uid) {
    throw new HttpsError(
      "failed-precondition",
      "The program creator already owns this program."
    );
  }
  const ref = db.collection("programStaffGrants").doc(
    programStaffGrantId(data.programId, authUser.uid));
  return db.runTransaction(async (tx) => {
    const fresh = await requireProgramManager(
      db, data.programId, actorUid, tx, deps.now());
    requireProgramMutable(fresh.program);
    if (fresh.program.organizerId !== program.organizerId ||
        fresh.program.createdBy === authUser.uid) {
      throw new HttpsError("aborted", "Program staff authority changed.");
    }
    await validateDutyStations({db, programId: data.programId,
      organizerId: fresh.program.organizerId, duties: data.duties,
      transaction: tx});
    const [currentSnap, activeSnap] = await Promise.all([
      tx.get(ref),
      tx.get(db.collection("programStaffGrants")
        .where("programId", "==", data.programId)
        .where("organizerId", "==", fresh.program.organizerId)
        .where("status", "==", "active")
        .where("expiresAt", ">", now)
        .limit(maxProgramStaff)),
    ]);
    const current = currentSnap.data() as ProgramStaffGrantDocument |
      undefined;
    if (current && (current.programId !== data.programId ||
        current.organizerId !== fresh.program.organizerId ||
        current.uid !== authUser.uid)) {
      throw new HttpsError("failed-precondition",
        "Staff grant ownership changed.");
    }
    if (current && programOwnerAuthorizationDeadline(fresh.program,
      current) === null && fresh.role !== "manager") {
      throw new HttpsError("permission-denied",
        "The program creator must approve legacy staff access.");
    }
    const currentActive = current?.status === "active" &&
      staffTimestampMillis(current.expiresAt) > now.toMillis();
    if (!currentActive && activeSnap.size >= maxProgramStaff) {
      throw new HttpsError(
        "resource-exhausted",
        "This program already has the maximum number of staff grants."
      );
    }
    const committedAt = deps.now();
    if (data.expiresAtMillis <= committedAt.toMillis() ||
        data.expiresAtMillis >
          committedAt.toMillis() + maxGrantDurationMillis) {
      throw new HttpsError("failed-precondition",
        "Staff access window changed.");
    }
    const programAuthorization = authorizeProgramStaffGrant(fresh, actorUid,
      data.expiresAtMillis, committedAt.toMillis());
    const document: ProgramStaffGrantDocument = {
      organizerId: program.organizerId,
      programId: data.programId,
      uid: authUser.uid,
      displayName: eventStaffDisplayName(authUser),
      phoneLastFour: phone.value!.slice(-4),
      duties: grantDuties(data.duties, data.expiresAtMillis),
      status: "active",
      programAuthorization,
      createdBy: current?.createdBy ?? actorUid,
      createdAt: current?.createdAt ?? committedAt,
      expiresAt:
        admin.firestore.Timestamp.fromMillis(data.expiresAtMillis),
      revokedBy: null,
      revokedAt: null,
      updatedAt: committedAt,
      revision: nextRevision(current?.revision, committedAt),
    };
    tx.set(ref, document);
    return {entityId: authUser.uid, revision: document.revision,
      alreadyApplied: false};
  });
}

export async function revokeProgramStaffHandler(
  request: CallableRequest<unknown>,
  deps: ProgramStaffDeps = defaultDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<RevokeProgramStaffCallablePayload>(
    request, validateRevokeProgramStaffCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "revokeProgramStaff", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  const {program: programForRevoke} =
    await requireProgramManager(db, data.programId, actorUid,
      undefined, deps.now());
  requireProgramMutable(programForRevoke);
  const ref = db.collection("programStaffGrants").doc(
    programStaffGrantId(data.programId, data.uid));
  return db.runTransaction(async (tx) => {
    const access = await requireProgramManager(
      db, data.programId, actorUid, tx, deps.now());
    const {program} = access;
    requireProgramMutable(program);
    const snap = await tx.get(ref);
    const grant = snap.data() as ProgramStaffGrantDocument | undefined;
    if (!grant || grant.programId !== data.programId ||
        grant.organizerId !== program.organizerId || grant.uid !== data.uid) {
      throw new HttpsError("not-found", "Program staff member not found.");
    }
    if (grant.revision !== data.expectedRevision) {
      throw new HttpsError(
        "aborted", "Staff access changed. Reload and retry.");
    }
    const committedAt = deps.now();
    programAdministrationDeadline(access, committedAt.toMillis());
    const revision = nextRevision(grant.revision, committedAt);
    tx.update(ref, {
      status: "revoked",
      revokedBy: actorUid,
      revokedAt: committedAt,
      updatedAt: committedAt,
      revision,
    });
    return {entityId: data.uid, revision, alreadyApplied: false};
  });
}

async function programStaffList(
  db: FirebaseFirestore.Firestore,
  data: ListProgramStaffCallablePayload,
  access: ProgramAccess,
  tx: FirebaseFirestore.Transaction,
  now: () => FirebaseFirestore.Timestamp
): Promise<ProgramStaffListCallableResponse> {
  const limit = data.limit ?? 50;
  let query = db.collection("programStaffGrants")
    .where("programId", "==", data.programId)
    .where("organizerId", "==", access.program.organizerId)
    .orderBy(FieldPath.documentId())
    .limit(limit + 1);
  // Stable identity order survives grant renewal, revocation and deletion.
  // The query reapplies current manager authorization and owner scope.
  if (data.cursor) {
    query = query.startAfter(programStaffGrantId(data.programId, data.cursor));
  }
  const snap = await tx.get(query);
  const page = snap.docs.slice(0, limit);
  const members = page.map((doc) => {
    const member = doc.data() as ProgramStaffGrantDocument;
    if (doc.id !== programStaffGrantId(data.programId, member.uid)) {
      throw new HttpsError("failed-precondition",
        "Staff identity bindings need repair before continuing.");
    }
    return member;
  });
  const currentMillis = now().toMillis();
  // Reads and authority share the transaction; time is checked after paging.
  programAdministrationDeadline(access, currentMillis);
  return {
    programId: data.programId,
    nextCursor: snap.size > limit ? members[members.length - 1].uid : null,
    members: members.map((member) => ({
      uid: member.uid,
      displayName: member.displayName,
      phoneLastFour: member.phoneLastFour,
      duties: member.duties.map((assignment) => ({...assignment,
        expiresAtMillis: Number.isSafeInteger(assignment.expiresAtMillis) &&
          assignment.expiresAtMillis > 0 ? assignment.expiresAtMillis : 1})),
      status: member.status === "revoked" || member.revokedAt != null ||
        member.revokedBy != null ? "revoked" :
        programOwnerAuthorizationDeadline(access.program, member) === null ?
          "approvalRequired" :
          activeProgramDuties(member, currentMillis).length === 0 ?
            "expired" : "active",
      expiresAtMillis: staffTimestampMillis(member.expiresAt),
      revision: member.revision,
    })),
  };
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const input = value as Record<string, unknown>;
  const trimmed = {...input};
  for (const key of ["programId", "uid", "phoneNumber", "cursor"]) {
    if (typeof trimmed[key] === "string") {
      trimmed[key] = (trimmed[key] as string).trim();
    }
  }
  return trimmed;
}

export const getProgramWorkAccess = onCall(
  appCheckCallableOptionsWithLimits(staffCallableLimits),
  (request) => getProgramWorkAccessHandler(request)
);
export const listProgramStaff = onCall(
  appCheckCallableOptionsWithLimits(staffCallableLimits),
  (request) => listProgramStaffHandler(request)
);
export const grantProgramStaff = onCall(
  appCheckCallableOptionsWithLimits(staffCallableLimits),
  (request) => grantProgramStaffHandler(request)
);
export const revokeProgramStaff = onCall(
  appCheckCallableOptionsWithLimits(staffCallableLimits),
  (request) => revokeProgramStaffHandler(request)
);
