/* firestore-index: programGuests (
  programId:ASCENDING,
  displayName:ASCENDING
) */
/* firestore-index: programFunctionGuests (
  programId:ASCENDING,
  guestId:ASCENDING
) */
import {planManualMembership} from "../workspaces/programMembershipPersistence";
import * as admin from "firebase-admin";
import {householdMemberIds, planHouseholdMembership} from
  "./programHouseholdMembership";
import {applyGroupMembershipWrites, readProgramGuestGroups} from
  "./programGuestGroups";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {
  assertRevision,
  assertProgramGuestDirectoryCurrent,
  dutyAssignments,
  programProjectionExpiresAt,
  nextRevision,
  requireProgramAccess,
  requireProgramMutable,
  requireProgramDuty,
  requireProgramGuestDirectoryAccess,
} from "../shared/programAuthority";
import type {
  ProgramFunctionGuestDocument,
  ProgramGuestDocument,
  ProgramGuestGroupDocument,
  ProgramHouseholdDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {UpsertProgramGuestCallablePayload} from
  "../shared/generated/upsertProgramGuestCallablePayload";
import type {ListProgramGuestsCallablePayload} from
  "../shared/generated/listProgramGuestsCallablePayload";
import type {UpsertProgramHouseholdCallablePayload} from
  "../shared/generated/upsertProgramHouseholdCallablePayload";
import type {ProgramIdCallablePayload} from
  "../shared/generated/programIdCallablePayload";
import type {ProgramGuestListCallableResponse} from
  "../shared/generated/programGuestListCallableResponse";
import type {ProgramMutationCallableResponse} from
  "../shared/generated/programMutationCallableResponse";
import {
  validateUpsertProgramGuestCallablePayload,
} from "../shared/generated/validators/upsertProgramGuestInput";
import {
  validateListProgramGuestsCallablePayload,
} from "../shared/generated/validators/listProgramGuestsInput";
import {
  validateUpsertProgramHouseholdCallablePayload,
} from "../shared/generated/validators/upsertProgramHouseholdInput";
import {
  validateProgramIdCallablePayload,
} from "../shared/generated/validators/programIdInput";

import {
  permittedFieldPointers, planWorkspaceFieldWrite, programGuestFieldContext,
  readProgramGuestFields, readProgramHouseholdFields, readWorkspaceFieldChoices,
  type ScopedProgramGuest, type ScopedProgramHousehold,
  type WorkspaceFieldSelections,
} from "../workspaces/workspaceFieldAuthority";

interface ProgramGuestDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: ProgramGuestDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
};

const guestCallableLimits = {timeoutSeconds: 60, maxInstances: 20};
const guestPageCap = 200;

export async function upsertProgramGuestHandler(
  request: CallableRequest<unknown>,
  deps: ProgramGuestDeps = defaultDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<UpsertProgramGuestCallablePayload &
    {fieldChoices?: WorkspaceFieldSelections}>(
      request, validateUpsertProgramGuestCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "upsertProgramGuest", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const ref = data.guestId ?
    db.collection("programGuests").doc(data.guestId) :
    db.collection("programGuests").doc();
  let committedRevision = 0;
  await db.runTransaction(async (tx) => {
    const access = await requireProgramAccess({
      db, programId: data.programId, actorUid, now: deps.now(), transaction: tx,
    });
    requireProgramMutable(access.program);
    requireProgramDuty(access, "programCoordinator");
    const snap = await tx.get(ref);
    const existing = snap.data() as ScopedProgramGuest | undefined;
    if (snap.exists &&
        existing!.programId !== data.programId) {
      throw new HttpsError("not-found", "Guest not found in this program.");
    }
    assertRevision(existing?.revision ?? 0, snap.exists ?
      data.expectedRevision : undefined);
    if (!snap.exists && data.expectedRevision !== undefined) {
      throw new HttpsError(
        "failed-precondition", "Guest does not exist yet.");
    }
    if (existing && existing.organizerId !== access.program.organizerId) {
      throw new HttpsError("aborted", "Guest ownership changed.");
    }
    const now = deps.now();
    const nextGroupIds = data.groupIds === undefined ?
      [...(existing?.groupIds ?? [])] : [...new Set(data.groupIds)].sort();
    const groups = await readProgramGuestGroups(db, tx, data.programId,
      access.program.organizerId,
      [...new Set([...(existing?.groupIds ?? []), ...nextGroupIds])]);
    for (const id of nextGroupIds) {
      if (!groups.has(id)) {
        throw new HttpsError("invalid-argument",
          "Unknown guest group for this program.");
      }
    }
    const context = programGuestFieldContext(data.programId,
      access.program.organizerId, ref.id,
      existing ?? {programId: data.programId,
        organizerId: access.program.organizerId});
    const previous = existing ?? {displayName: null, phoneE164: null,
      email: null};
    const pointers = existing ? permittedFieldPointers(previous,
      await readProgramGuestFields({db, tx, programId: data.programId,
        organizerId: access.program.organizerId, guestId: ref.id,
        guest: existing})) : {};
    const choices = await readWorkspaceFieldChoices({db, tx,
      choices: data.fieldChoices});
    const revision = nextRevision(existing?.revision, now);
    const fields = planWorkspaceFieldWrite({context,
      previous: {...previous, ...pointers}, supplied: {
        displayName: data.displayName,
        ...(data.phoneE164 === undefined ? {} : {phoneE164: data.phoneE164}),
        ...(data.email === undefined ? {} : {email: data.email}),
      }, choices, source: {sourceKind: "manualEntry", sourceId: ref.id,
        sourceVersion: revision, actorUid, observedAtMillis: now.toMillis()}});
    const membership = data.groupIds === undefined ? null :
      await planManualMembership({db, tx, guest: existing ?? {},
        programId: data.programId, organizerId: access.program.organizerId,
        guestId: ref.id, groupIds: nextGroupIds,
        currentRevision: existing?.revision ?? 1, nextRevision: revision,
        actorUid, observedAtMillis: now.toMillis()});
    const document: ScopedProgramGuest = {
      ...existing,
      programId: data.programId,
      organizerId: access.program.organizerId,
      displayName: fields.values.displayName!,
      householdId: data.householdId === undefined ?
        existing?.householdId ?? null : data.householdId,
      contactId: existing?.contactId ?? null,
      phoneE164: fields.values.phoneE164,
      email: fields.values.email,
      fieldSelections: fields.fieldSelections,
      fieldConflicts: fields.fieldConflicts,
      externalReference: data.externalReference === undefined ?
        existing?.externalReference ?? null : data.externalReference,
      groupIds: membership?.projection.groupIds ?? nextGroupIds,
      ...(membership ? {
        membershipSelections: membership.projection.selections,
        membershipSuggestions: membership.projection.suggestions,
      } : {}),
      invitationStatus: existing?.invitationStatus ?? "notInvited",
      rsvpStatus: data.rsvpStatus ?? existing?.rsvpStatus ?? "pending",
      source: existing?.source ?? "manual",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      revision,
    };
    const households = await readHouseholds(db, tx,
      [existing?.householdId, document.householdId]);
    const memberships = planHouseholdMembership(data.programId,
      access.program.organizerId, households, [{guestId: ref.id,
        previousHouseholdId: existing?.householdId ?? null,
        nextHouseholdId: document.householdId}]);
    const expiry = programProjectionExpiresAt(access,
      dutyAssignments(access, "programCoordinator").filter((d) =>
        d.expiresAtMillis > deps.now().toMillis()));
    if (expiry !== null && expiry <= deps.now().toMillis()) {
      throw new HttpsError("permission-denied", "Guest duty expired.");
    }
    for (const [id, memberGuestIds] of memberships) {
      tx.update(db.collection("programHouseholds").doc(id), {memberGuestIds,
        updatedAt: now, revision: nextRevision(households.get(id)!.revision,
          now)});
    }
    applyGroupMembershipWrites(db, tx, groups, existing?.groupIds ?? [],
      document.groupIds, now);
    for (const assertion of fields.assertions) {
      tx.create(db.collection("workspaceFieldAssertions").doc(assertion.id),
        assertion.data);
    }
    for (const decision of fields.decisions) {
      tx.create(db.collection("workspaceFieldDecisions").doc(decision.id),
        decision.data);
    }
    for (const write of membership?.writes ?? []) {
      tx.create(db.doc(write.path), write.data);
    }
    committedRevision = document.revision;
    tx.set(ref, document);
  });
  return {entityId: ref.id, revision: committedRevision,
    alreadyApplied: false};
}

export async function listProgramGuestsHandler(
  request: CallableRequest<unknown>,
  deps: ProgramGuestDeps = defaultDeps
): Promise<ProgramGuestListCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ListProgramGuestsCallablePayload>(
    request, validateListProgramGuestsCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listProgramGuests", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  return db.runTransaction(async (tx) => {
    const access = await requireProgramAccess({
      db, programId: data.programId, actorUid, now: deps.now(), transaction: tx,
    });
    requireProgramGuestDirectoryAccess(access);
    const limit = data.limit ?? guestPageCap;
    let query = db.collection("programGuests")
      .where("programId", "==", data.programId)
      .orderBy("displayName")
      .limit(limit + 1);
    if (data.cursor) {
      const cursorRef = db.collection("programGuests").doc(data.cursor);
      const cursorSnap = await tx.get(cursorRef);
      const cursorDoc = cursorSnap.data() as ProgramGuestDocument | undefined;
      if (!cursorDoc || cursorDoc.programId !== data.programId ||
          cursorDoc.organizerId !== access.program.organizerId) {
        throw new HttpsError("invalid-argument", "Unknown page cursor.");
      }
      query = query.startAfter(cursorSnap);
    }
    const snap = await tx.get(query);
    const rawPage = snap.docs.slice(0, limit);
    const permitted = await Promise.all(rawPage.map(async (doc) => {
      const guest = requireDoc<ScopedProgramGuest>(doc, "ProgramGuestDocument");
      const fields = await readProgramGuestFields({db, tx,
        programId: data.programId, organizerId: access.program.organizerId,
        guestId: doc.id, guest});
      return fields.values.displayName === null ? null : {doc, guest, fields};
    }));
    const visible = permitted.filter((entry) => entry !== null);
    const page = visible.map((entry) => entry.doc);
    const nextCursor = snap.docs.length > limit ?
      rawPage[rawPage.length - 1].id : null;
    const householdIds = [...new Set(page
      .map((doc) =>
        (doc.data() as ProgramGuestDocument).householdId)
      .filter((id): id is string => id !== null))];
    const households = await Promise.all(householdIds.map(async (id) => {
      const snap = await tx.get(db.collection("programHouseholds").doc(id));
      const doc = snap.data() as ProgramHouseholdDocument | undefined;
      if (!doc || doc.programId !== data.programId ||
          doc.organizerId !== access.program.organizerId) {
        throw new HttpsError("failed-precondition",
          "Guest household ownership needs reconciliation.");
      }
      return {
        householdId: id,
        label: doc.label,
        memberGuestIds: doc.memberGuestIds,
        revision: doc.revision,
      };
    }));
    const functionGuests = await listFunctionGuestRows(
      db, access.program.organizerId, data.programId,
      page.map((doc) => doc.id), tx,
    );
    const groups = await listReferencedGroups(
      db, access.program.organizerId, data.programId, page, tx);
    assertProgramGuestDirectoryCurrent(access, deps.now().toMillis());
    return {
      programId: data.programId,
      guests: visible.map(({doc, guest, fields}) => ({
        guestId: doc.id,
        displayName: fields.values.displayName!,
        householdId: guest.householdId,
        contactId: guest.contactId,
        phoneE164: fields.values.phoneE164,
        email: fields.values.email,
        fieldAuthority: fields.authority,
        externalReference: guest.externalReference,
        groupIds: guest.groupIds ?? [],
        invitationStatus: guest.invitationStatus,
        rsvpStatus: guest.rsvpStatus,
        revision: guest.revision,
      })),
      households: households.filter((h) => h !== null),
      functionGuests,
      groups,
      nextCursor,
    };
  });
}

/**
 * Group documents referenced by the page's guest groupIds. Ids dangling after
 * a group delete are skipped — the delete scrub clears them asynchronously.
 */
async function listReferencedGroups(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  programId: string,
  page: FirebaseFirestore.QueryDocumentSnapshot[],
  tx: FirebaseFirestore.Transaction,
): Promise<ProgramGuestListCallableResponse["groups"]> {
  const groupIds = [...new Set(page.flatMap((doc) =>
    (doc.data() as ProgramGuestDocument).groupIds ?? []))];
  const groups = await Promise.all(groupIds.map(async (id) => {
    const snap = await tx.get(db.collection("programGuestGroups").doc(id));
    const doc = snap.data() as ProgramGuestGroupDocument | undefined;
    if (!doc) return null;
    if (doc.programId !== programId || doc.organizerId !== organizerId) {
      throw new HttpsError("failed-precondition",
        "Guest group ownership needs reconciliation.");
    }
    return {
      groupId: id,
      label: doc.label,
      dimension: doc.dimension,
      sortOrder: doc.sortOrder,
      memberCount: doc.memberCount,
      revision: doc.revision,
    };
  }));
  return groups.filter((group) => group !== null);
}

interface FunctionGuestRow {
  guestId: string;
  functionId: string;
  invited: boolean;
  rsvpStatus: ProgramFunctionGuestDocument["rsvpStatus"];
  attendanceStatus: ProgramFunctionGuestDocument["attendanceStatus"];
  partySize: number | null;
}

/**
 * Function-guest join rows covering one guest page, loaded in chunks of the
 * Firestore `in` limit so the organizer grid needs a single read per page.
 * Rows belong only to this program and organizer; anything else is corrupt
 * and fails closed.
 */
async function listFunctionGuestRows(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  programId: string,
  guestIds: string[],
  tx: FirebaseFirestore.Transaction,
): Promise<FunctionGuestRow[]> {
  const rows: FunctionGuestRow[] = [];
  for (let i = 0; i < guestIds.length; i += 30) {
    const chunk = guestIds.slice(i, i + 30);
    const snap = await tx.get(db.collection("programFunctionGuests")
      .where("programId", "==", programId)
      .where("guestId", "in", chunk));
    for (const doc of snap.docs) {
      const row = doc.data() as ProgramFunctionGuestDocument;
      if (row.organizerId !== organizerId ||
          row.programId !== programId) {
        throw new HttpsError("failed-precondition",
          "Function guest ownership needs reconciliation.");
      }
      rows.push({
        guestId: row.guestId,
        functionId: row.functionId,
        invited: row.invited,
        rsvpStatus: row.rsvpStatus,
        attendanceStatus: row.attendanceStatus,
        partySize: row.partySize ?? null,
      });
    }
  }
  return rows;
}

export async function upsertProgramHouseholdHandler(
  request: CallableRequest<unknown>,
  deps: ProgramGuestDeps = defaultDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<UpsertProgramHouseholdCallablePayload &
    {fieldChoices?: WorkspaceFieldSelections}>(
      request, validateUpsertProgramHouseholdCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "upsertProgramHousehold", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const ref = data.householdId ?
    db.collection("programHouseholds").doc(data.householdId) :
    db.collection("programHouseholds").doc();
  let committedRevision = 0;
  await db.runTransaction(async (tx) => {
    const access = await requireProgramAccess({
      db, programId: data.programId, actorUid, now: deps.now(), transaction: tx,
    });
    requireProgramMutable(access.program);
    requireProgramDuty(access, "programCoordinator");
    const snap = await tx.get(ref);
    const existing = snap.data() as ScopedProgramHousehold | undefined;
    if (existing && (existing.programId !== data.programId ||
        existing.organizerId !== access.program.organizerId)) {
      throw new HttpsError("not-found", "Household not found in this program.");
    }
    if (!existing && data.expectedRevision !== undefined) {
      throw new HttpsError("failed-precondition",
        "Household does not exist yet.");
    }
    assertRevision(existing?.revision ?? 0, data.expectedRevision);
    if (existing) householdMemberIds(existing);
    const selected = new Set(data.memberGuestIds);
    const guestIds = [...new Set([
      ...(existing?.memberGuestIds ?? []), ...selected])];
    const guestSnaps = await Promise.all(guestIds.map((id) =>
      tx.get(db.collection("programGuests").doc(id))));
    const guests = new Map<string, ProgramGuestDocument>();
    for (const guestSnap of guestSnaps) {
      const guest = guestSnap.data() as ProgramGuestDocument | undefined;
      if (!guest || guest.programId !== data.programId ||
          guest.organizerId !== access.program.organizerId) {
        throw new HttpsError("failed-precondition",
          "Household guests need reconciliation.");
      }
      if (!selected.has(guestSnap.id) && guest.householdId !== ref.id) {
        throw new HttpsError("failed-precondition",
          "Household and guest membership disagree; reconcile them first.");
      }
      guests.set(guestSnap.id, guest);
    }
    const households = await readHouseholds(db, tx,
      [...guests.values()].map((guest) => guest.householdId)
        .filter((id) => id !== ref.id));
    const now = deps.now();
    const context = programGuestFieldContext(data.programId,
      access.program.organizerId, ref.id, existing ?? {
        programId: data.programId, organizerId: access.program.organizerId});
    context.relationshipRef.kind = "programHousehold";
    const previous = {displayName: existing?.primaryContactName ?? null,
      phoneE164: existing?.primaryPhoneE164 ?? null,
      email: existing?.primaryEmail ?? null,
      fieldSelections: existing?.fieldSelections,
      fieldConflicts: existing?.fieldConflicts};
    const pointers = existing ? permittedFieldPointers(previous,
      await readProgramHouseholdFields({db, tx, programId: data.programId,
        organizerId: access.program.organizerId, householdId: ref.id,
        household: existing})) : {};
    const choices = await readWorkspaceFieldChoices({db, tx,
      choices: data.fieldChoices});
    const fields = planWorkspaceFieldWrite({context,
      previous: {...previous, ...pointers}, supplied: {
        displayName: data.primaryContactName,
        ...(data.primaryPhoneE164 === undefined ? {} :
          {phoneE164: data.primaryPhoneE164}),
        ...(data.primaryEmail === undefined ? {} : {email: data.primaryEmail}),
      }, choices, source: {sourceKind: "manualEntry", sourceId: ref.id,
        sourceVersion: nextRevision(existing?.revision, now), actorUid,
        observedAtMillis: now.toMillis()}});
    const document: ScopedProgramHousehold = {
      ...existing,
      programId: data.programId,
      organizerId: access.program.organizerId,
      label: data.label,
      primaryContactName: fields.values.displayName,
      primaryPhoneE164: fields.values.phoneE164,
      primaryEmail: fields.values.email,
      fieldSelections: fields.fieldSelections,
      fieldConflicts: fields.fieldConflicts,
      memberGuestIds: existing?.memberGuestIds ?? [],
      deliveryPreference: data.deliveryPreference ??
        existing?.deliveryPreference ?? "none",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      revision: nextRevision(existing?.revision, now),
    };
    households.set(ref.id, document);
    const memberships = planHouseholdMembership(data.programId,
      access.program.organizerId, households, [...guests].map(([id, guest]) =>
        ({guestId: id, previousHouseholdId: guest.householdId,
          nextHouseholdId: selected.has(id) ? ref.id : null})));
    document.memberGuestIds = memberships.get(ref.id) ??
      document.memberGuestIds;
    const committedAtMillis = deps.now().toMillis();
    const expiry = programProjectionExpiresAt(access,
      dutyAssignments(access, "programCoordinator").filter((assignment) =>
        assignment.expiresAtMillis > committedAtMillis));
    if (expiry !== null && expiry <= committedAtMillis) {
      throw new HttpsError("permission-denied", "Household duty expired.");
    }
    for (const assertion of fields.assertions) {
      tx.create(db.collection("workspaceFieldAssertions").doc(assertion.id),
        assertion.data);
    }
    for (const decision of fields.decisions) {
      tx.create(db.collection("workspaceFieldDecisions").doc(decision.id),
        decision.data);
    }
    committedRevision = document.revision;
    tx.set(ref, document);
    for (const [id, memberGuestIds] of memberships) {
      if (id === ref.id) continue;
      tx.update(db.collection("programHouseholds").doc(id), {memberGuestIds,
        updatedAt: now, revision: nextRevision(households.get(id)!.revision,
          now)});
    }
    for (const [id, guest] of guests) {
      const householdId = selected.has(id) ? ref.id : null;
      if (guest.householdId === householdId) continue;
      tx.update(db.collection("programGuests").doc(id), {householdId,
        updatedAt: now, revision: nextRevision(guest.revision, now)});
    }
  });
  return {entityId: ref.id, revision: committedRevision,
    alreadyApplied: false};
}

export async function listProgramHouseholdsHandler(
  request: CallableRequest<unknown>,
  deps: ProgramGuestDeps = defaultDeps
): Promise<ProgramGuestListCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ProgramIdCallablePayload>(
    request, validateProgramIdCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listProgramHouseholds", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  return db.runTransaction(async (tx) => {
    const access = await requireProgramAccess({
      db, programId: data.programId, actorUid, now: deps.now(), transaction: tx,
    });
    requireProgramGuestDirectoryAccess(access);
    const snap = await tx.get(db.collection("programHouseholds")
      .where("programId", "==", data.programId)
      .limit(501));
    if (snap.size > 500) {
      throw new HttpsError("resource-exhausted",
        "Household inventory exceeds its 500-record limit.");
    }
    assertProgramGuestDirectoryCurrent(access, deps.now().toMillis());
    return {
      programId: data.programId,
      guests: [],
      functionGuests: [],
      groups: [],
      households: snap.docs.map((doc) => {
        const household = doc.data() as ProgramHouseholdDocument;
        if (household.organizerId !== access.program.organizerId) {
          throw new HttpsError("failed-precondition",
            "Household ownership needs reconciliation.");
        }
        return {
          householdId: doc.id,
          label: household.label,
          memberGuestIds: household.memberGuestIds,
          revision: household.revision,
        };
      }),
      nextCursor: null,
    };
  });
}

async function readHouseholds(
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  ids: Array<string | null | undefined>,
): Promise<Map<string, ProgramHouseholdDocument>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  const snaps = await Promise.all(unique.map((id) =>
    tx.get(db.collection("programHouseholds").doc(id))));
  return new Map(snaps.filter((snap) => snap.exists).map((snap) =>
    [snap.id, snap.data() as ProgramHouseholdDocument]));
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const input = value as Record<string, unknown>;
  const trimmed = {...input};
  for (const key of ["programId", "guestId", "householdId", "displayName",
    "label", "primaryContactName", "cursor"]) {
    if (typeof trimmed[key] === "string") {
      trimmed[key] = (trimmed[key] as string).trim();
    }
  }
  return trimmed;
}

export const upsertProgramGuest = onCall(
  appCheckCallableOptionsWithLimits(guestCallableLimits),
  (request) => upsertProgramGuestHandler(request)
);
export const listProgramGuests = onCall(
  appCheckCallableOptionsWithLimits(guestCallableLimits),
  (request) => listProgramGuestsHandler(request)
);
export const upsertProgramHousehold = onCall(
  appCheckCallableOptionsWithLimits(guestCallableLimits),
  (request) => upsertProgramHouseholdHandler(request)
);
export const listProgramHouseholds = onCall(
  appCheckCallableOptionsWithLimits(guestCallableLimits),
  (request) => listProgramHouseholdsHandler(request)
);
