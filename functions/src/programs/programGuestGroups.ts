import {programMembershipProjection} from
  "../workspaces/programMembershipPersistence";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {
  assertRevision,
  nextRevision,
  dutyAssignments,
  programProjectionExpiresAt,
  requireProgramAccess,
  requireProgramMutable,
  requireProgramDuty,
} from "../shared/programAuthority";
import type {
  ProgramGuestDocument,
  ProgramGuestGroupDocument,
  ProgramHotelDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {UpsertProgramGuestGroupCallablePayload} from
  "../shared/generated/upsertProgramGuestGroupCallablePayload";
import type {DeleteProgramGuestGroupCallablePayload} from
  "../shared/generated/deleteProgramGuestGroupCallablePayload";
import type {ProgramIdCallablePayload} from
  "../shared/generated/programIdCallablePayload";
import type {ProgramGuestGroupListCallableResponse} from
  "../shared/generated/programGuestGroupListCallableResponse";
import type {ProgramMutationCallableResponse} from
  "../shared/generated/programMutationCallableResponse";
import {
  validateUpsertProgramGuestGroupCallablePayload,
} from "../shared/generated/validators/upsertProgramGuestGroupInput";
import {
  validateDeleteProgramGuestGroupCallablePayload,
} from "../shared/generated/validators/deleteProgramGuestGroupInput";
import {
  validateProgramIdCallablePayload,
} from "../shared/generated/validators/programIdInput";

interface ProgramGuestGroupDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: ProgramGuestGroupDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
};

const groupCallableLimits = {timeoutSeconds: 60, maxInstances: 20};
const groupInventoryCap = 500;
const groupScrubPageSize = 400;

const normalizeGroupKey = (dimension: string, label: string) =>
  `${dimension.trim().toLowerCase()}|${label.trim().toLowerCase()}`;

/**
 * Load the referenced groups. Missing documents are skipped — a deleted
 * group's id can dangle on guests until the delete scrub lands. Documents
 * owned by another program or organizer are corruption and fail closed.
 */
export async function readProgramGuestGroups(
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  programId: string,
  organizerId: string,
  groupIds: string[],
): Promise<Map<string, ProgramGuestGroupDocument>> {
  const unique = [...new Set(groupIds)];
  const snaps = await Promise.all(unique.map((id) =>
    tx.get(db.collection("programGuestGroups").doc(id))));
  const groups = new Map<string, ProgramGuestGroupDocument>();
  for (const snap of snaps) {
    const group = snap.data() as ProgramGuestGroupDocument | undefined;
    if (!group) continue;
    if (group.programId !== programId || group.organizerId !== organizerId) {
      throw new HttpsError("failed-precondition",
        "Guest group ownership needs reconciliation.");
    }
    groups.set(snap.id, group);
  }
  return groups;
}

/** Apply memberCount deltas for a guest's groupIds transition. */
export function applyGroupMembershipWrites(
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  groups: Map<string, ProgramGuestGroupDocument>,
  previous: readonly string[],
  next: readonly string[],
  now: FirebaseFirestore.Timestamp,
): void {
  const added = next.filter((id) => !previous.includes(id));
  const removed = previous.filter((id) => !next.includes(id));
  for (const [id, delta] of [
    ...added.map((id): [string, number] => [id, 1]),
    ...removed.map((id): [string, number] => [id, -1]),
  ]) {
    const group = groups.get(id);
    if (!group) continue;
    tx.update(db.collection("programGuestGroups").doc(id), {
      memberCount: Math.max(0, group.memberCount + delta),
      updatedAt: now,
      revision: nextRevision(group.revision, now),
    });
    group.memberCount = Math.max(0, group.memberCount + delta);
  }
}

export async function upsertProgramGuestGroupHandler(
  request: CallableRequest<unknown>,
  deps: ProgramGuestGroupDeps = defaultDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<UpsertProgramGuestGroupCallablePayload>(
      request, validateUpsertProgramGuestGroupCallablePayload,
      normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "upsertProgramGuestGroup", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const ref = data.groupId ?
    db.collection("programGuestGroups").doc(data.groupId) :
    db.collection("programGuestGroups").doc();
  let committedRevision = 0;
  await db.runTransaction(async (tx) => {
    const access = await requireProgramAccess({
      db, programId: data.programId, actorUid, now: deps.now(),
      transaction: tx,
    });
    requireProgramMutable(access.program);
    requireProgramDuty(access, "programCoordinator");
    // Duplicate (dimension, label) pairs would silently split manifest
    // imports and audience picks, so uniqueness is enforced inside the
    // write transaction.
    const siblings = await tx.get(db.collection("programGuestGroups")
      .where("programId", "==", data.programId));
    const wantedKey = normalizeGroupKey(data.dimension, data.label);
    for (const doc of siblings.docs) {
      if (doc.id === ref.id) continue;
      const group = doc.data() as ProgramGuestGroupDocument;
      if (normalizeGroupKey(group.dimension, group.label) === wantedKey) {
        throw new HttpsError("already-exists",
          "A group with this dimension and label already exists.");
      }
    }
    const snap = await tx.get(ref);
    const existing = snap.data() as ProgramGuestGroupDocument | undefined;
    if (snap.exists &&
        (existing!.programId !== data.programId ||
         existing!.organizerId !== access.program.organizerId)) {
      throw new HttpsError("not-found", "Group not found in this program.");
    }
    if (!snap.exists && data.expectedRevision !== undefined) {
      throw new HttpsError(
        "failed-precondition", "Group does not exist yet.");
    }
    assertRevision(existing?.revision ?? 0, snap.exists ?
      data.expectedRevision : undefined);
    // A dangling hotel link would silently disable distance-aware leads, so
    // the target must live in this program while the write is committed.
    if (typeof data.hotelId === "string") {
      const hotelSnap = await tx.get(
        db.collection("programHotels").doc(data.hotelId));
      const hotel = hotelSnap.data() as ProgramHotelDocument | undefined;
      if (!hotel || hotel.programId !== data.programId ||
          hotel.organizerId !== access.program.organizerId) {
        throw new HttpsError("failed-precondition",
          "Hotel not found in this program.");
      }
    }
    const now = deps.now();
    const document: ProgramGuestGroupDocument = {
      programId: data.programId,
      organizerId: access.program.organizerId,
      label: data.label,
      dimension: data.dimension,
      sortOrder: data.sortOrder === undefined ?
        existing?.sortOrder ?? 0 : data.sortOrder,
      memberCount: existing?.memberCount ?? 0,
      hotelId: data.hotelId === undefined ?
        existing?.hotelId ?? null : data.hotelId,
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

export async function listProgramGuestGroupsHandler(
  request: CallableRequest<unknown>,
  deps: ProgramGuestGroupDeps = defaultDeps
): Promise<ProgramGuestGroupListCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ProgramIdCallablePayload>(
    request, validateProgramIdCallablePayload, normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listProgramGuestGroups", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const access = await requireProgramAccess({
    db, programId: data.programId, actorUid, now: deps.now(),
  });
  requireProgramDuty(access, "programCoordinator");
  const snap = await db.collection("programGuestGroups")
    .where("programId", "==", data.programId)
    .limit(groupInventoryCap + 1)
    .get();
  if (snap.size > groupInventoryCap) {
    throw new HttpsError("resource-exhausted",
      `Group inventory exceeds its ${groupInventoryCap}-record limit.`);
  }
  return {
    programId: data.programId,
    groups: snap.docs.map((doc) => {
      const group = doc.data() as ProgramGuestGroupDocument;
      if (group.organizerId !== access.program.organizerId) {
        throw new HttpsError("failed-precondition",
          "Guest group ownership needs reconciliation.");
      }
      return {
        groupId: doc.id,
        label: group.label,
        dimension: group.dimension,
        sortOrder: group.sortOrder,
        memberCount: group.memberCount,
        hotelId: group.hotelId ?? null,
        revision: group.revision,
      };
    }).sort((a, b) =>
      a.dimension.localeCompare(b.dimension) ||
      a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
  };
}

export async function deleteProgramGuestGroupHandler(
  request: CallableRequest<unknown>,
  deps: ProgramGuestGroupDeps = defaultDeps
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<DeleteProgramGuestGroupCallablePayload>(
      request, validateDeleteProgramGuestGroupCallablePayload,
      normalizePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "deleteProgramGuestGroup", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const ref = db.collection("programGuestGroups").doc(data.groupId);
  let deletedRevision = 0;
  let organizerId = "";
  await db.runTransaction(async (tx) => {
    const access = await requireProgramAccess({
      db, programId: data.programId, actorUid, now: deps.now(),
      transaction: tx,
    });
    requireProgramMutable(access.program);
    requireProgramDuty(access, "programCoordinator");
    const snap = await tx.get(ref);
    const existing = snap.data() as ProgramGuestGroupDocument | undefined;
    if (!existing || existing.programId !== data.programId ||
        existing.organizerId !== access.program.organizerId) {
      throw new HttpsError("not-found", "Group not found in this program.");
    }
    assertRevision(existing.revision, data.expectedRevision);
    deletedRevision = existing.revision;
    organizerId = access.program.organizerId;
    tx.delete(ref);
  });
  // Scan all program guests, including suggestion-only and excluded choices.
  // Advance by stable document identity even when a page has no matching
  // references; only matching guests get a new revision. Evidence is immutable.
  let cursor: string | undefined;
  while (true) {
    const page = await db.runTransaction(async (tx) => {
      const access = await requireProgramAccess({
        db, programId: data.programId, actorUid, now: deps.now(),
        transaction: tx,
      });
      requireProgramMutable(access.program);
      requireProgramDuty(access, "programCoordinator");
      if (access.program.organizerId !== organizerId) {
        throw new HttpsError("failed-precondition",
          "Guest group ownership needs reconciliation.");
      }
      let query = db.collection("programGuests")
        .where("programId", "==", data.programId)
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(groupScrubPageSize);
      if (cursor !== undefined) query = query.startAfter(cursor);
      const snap = await tx.get(query);
      const now = deps.now();
      const expiry = programProjectionExpiresAt(access,
        dutyAssignments(access, "programCoordinator").filter((d) =>
          d.expiresAtMillis > now.toMillis()));
      if (expiry !== null && expiry <= now.toMillis()) {
        throw new HttpsError("permission-denied", "Guest duty expired.");
      }
      for (const doc of snap.docs) {
        const guest = doc.data() as ProgramGuestDocument;
        if (guest.programId !== data.programId ||
            guest.organizerId !== organizerId) {
          throw new HttpsError("failed-precondition",
            "Guest ownership needs reconciliation.");
        }
        const {groupIds, selections, suggestions} =
          programMembershipProjection(guest);
        if (!groupIds.includes(data.groupId) &&
            !selections.some((p) => p.groupId === data.groupId) &&
            !suggestions.some((p) => p.groupId === data.groupId)) {
          continue;
        }
        tx.update(doc.ref, {
          groupIds: groupIds.filter((id) => id !== data.groupId),
          membershipSelections: selections
            .filter((p) => p.groupId !== data.groupId),
          membershipSuggestions: suggestions
            .filter((p) => p.groupId !== data.groupId),
          updatedAt: now,
          revision: nextRevision(guest.revision, now),
        });
      }
      return {scanned: snap.size, lastId: snap.docs.at(-1)?.id};
    });
    if (page.scanned < groupScrubPageSize) break;
    cursor = page.lastId;
  }
  return {entityId: data.groupId, revision: deletedRevision,
    alreadyApplied: false};
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const input = value as Record<string, unknown>;
  const trimmed = {...input};
  for (const key of ["programId", "groupId", "label", "dimension", "hotelId"]) {
    if (typeof trimmed[key] === "string") {
      trimmed[key] = (trimmed[key] as string).trim();
    }
  }
  return trimmed;
}

export const upsertProgramGuestGroup = onCall(
  appCheckCallableOptionsWithLimits(groupCallableLimits),
  (request) => upsertProgramGuestGroupHandler(request)
);
export const listProgramGuestGroups = onCall(
  appCheckCallableOptionsWithLimits(groupCallableLimits),
  (request) => listProgramGuestGroupsHandler(request)
);
export const deleteProgramGuestGroup = onCall(
  appCheckCallableOptionsWithLimits(groupCallableLimits),
  (request) => deleteProgramGuestGroupHandler(request)
);
