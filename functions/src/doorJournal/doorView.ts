import * as admin from "firebase-admin";
import {createHash} from "node:crypto";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {
  nextRevision,
  requireProgramAccess,
  requireProgramMutable,
} from "../shared/programAuthority";
import type {
  ProgramDoorJournalDocument,
  ProgramFunctionDocument,
  ProgramFunctionGuestDocument,
  ProgramGuestDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {CreateProgramWalkInCallablePayload} from
  "../shared/generated/createProgramWalkInCallablePayload";
import type {ProgramMutationCallableResponse} from
  "../shared/generated/programMutationCallableResponse";
import {
  validateCreateProgramWalkInCallablePayload,
} from
  "../shared/generated/validators/createProgramWalkInInput";
import {journalIdFor} from "./journalPlan";
import {requireDoorAuthority} from "./recordProgramDoorJournal";

const WALK_IN_ID_PREFIX = "walkin_";

export interface DoorViewDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: DoorViewDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
};

const joinKey = (functionId: string, guestId: string) =>
  `${functionId}_${guestId}`;

/** Deterministic guest id for a walk-in; same inputs replay, never merge. */
const walkInGuestId = (
  programId: string,
  functionId: string,
  clientOperationId: string,
) =>
  WALK_IN_ID_PREFIX +
  createHash("sha256")
    .update(`${programId}|${functionId}|${clientOperationId}`)
    .digest("hex")
    .slice(0, 48);

async function loadFunction(
  db: FirebaseFirestore.Firestore,
  programId: string,
  functionId: string,
): Promise<ProgramFunctionDocument> {
  const snap = await db.collection("programFunctions").doc(functionId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Function not found.");
  }
  const fn = snap.data() as ProgramFunctionDocument;
  if (fn.programId !== programId) {
    throw new HttpsError(
      "not-found", "Function not found in this program.");
  }
  return fn;
}

/**
 * Create a walk-in guest and check them in through the durable journal in
 * one transaction. The guest id derives from the clientOperationId, so a
 * retried call replays with alreadyApplied instead of double-creating.
 */
export async function createProgramWalkInHandler(
  request: CallableRequest<unknown>,
  deps: DoorViewDeps = defaultDeps,
): Promise<ProgramMutationCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<CreateProgramWalkInCallablePayload>(
    request, validateCreateProgramWalkInCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "createProgramWalkIn", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const access = await requireProgramAccess({
    db, programId: data.programId, actorUid, now: deps.now(),
  });
  const fn = await loadFunction(db, data.programId, data.functionId);
  requireProgramMutable(access.program);
  requireDoorAuthority(access, data.functionId);
  if (fn.status === "cancelled") {
    throw new HttpsError("failed-precondition",
      "Cancelled functions cannot take walk-ins.");
  }
  if (fn.checkInEnabled === false) {
    throw new HttpsError("failed-precondition",
      "Check-in is disabled for this function.");
  }
  const now = deps.now();
  const guestId = walkInGuestId(
    data.programId, data.functionId, data.clientOperationId);
  const guestRef = db.collection("programGuests").doc(guestId);

  return db.runTransaction(async (tx) => {
    const [guestSnap, checkedInSnap] = await Promise.all([
      tx.get(guestRef),
      tx.get(db.collection("programFunctionGuests")
        .where("functionId", "==", data.functionId)
        .where("attendanceStatus", "==", "checkedIn")),
    ]);
    if (guestSnap.exists) {
      const existing = guestSnap.data() as ProgramGuestDocument;
      if (existing.programId !== data.programId) {
        throw new HttpsError("not-found", "Guest not found in this program.");
      }
      return {
        entityId: guestId,
        revision: existing.revision,
        alreadyApplied: true,
      };
    }

    const journalId = journalIdFor({
      scope: {kind: "program", id: data.programId},
      functionId: data.functionId,
      guestId,
      action: "walkInCreate",
      occurredAtMillis: data.occurredAtMillis,
      actorUid,
    });
    const journalRef = db.collection("programDoorJournal").doc(journalId);
    const journalSnap = await tx.get(journalRef);
    if (journalSnap.exists) {
      return {
        entityId: guestId,
        revision: 0,
        alreadyApplied: true,
      };
    }

    const guestDoc: ProgramGuestDocument = {
      programId: data.programId,
      organizerId: fn.organizerId,
      displayName: data.displayName,
      householdId: null,
      contactId: null,
      phoneE164: null,
      email: null,
      externalReference: null,
      groupIds: [],
      invitationStatus: "notInvited",
      rsvpStatus: "pending",
      source: "manual",
      createdAt: now,
      updatedAt: now,
      revision: 1,
    };
    tx.set(guestRef, guestDoc);

    const partySize = data.partySize ?? null;
    tx.create(db.collection("programFunctionGuests")
      .doc(joinKey(data.functionId, guestId)), {
      programId: data.programId,
      organizerId: fn.organizerId,
      functionId: data.functionId,
      guestId,
      invited: false,
      rsvpStatus: "pending",
      attendanceStatus: "checkedIn",
      partySize,
      respondedAt: null,
      responseNote: null,
      responseSource: "staff",
      recordedByUid: actorUid,
      createdAt: now,
      updatedAt: now,
      revision: 1,
    });

    tx.create(journalRef, {
      programId: data.programId,
      organizerId: fn.organizerId,
      functionId: data.functionId,
      guestId,
      actorUid,
      action: "walkInCreate",
      occurredAtMillis: data.occurredAtMillis,
      deviceId: data.deviceId ?? null,
      partySize,
      note: data.note ?? null,
      createdAt: now,
      updatedAt: now,
      revision: 1,
    } satisfies Partial<ProgramDoorJournalDocument>);

    let checkedInHeads = partySize ?? 1;
    for (const snap of checkedInSnap.docs) {
      const row = snap.data() as ProgramFunctionGuestDocument;
      if (row.programId !== data.programId) continue;
      checkedInHeads += row.partySize ?? 1;
    }
    tx.update(db.collection("programFunctions").doc(data.functionId), {
      checkedInCount: checkedInHeads,
      updatedAt: now,
      revision: nextRevision(fn.revision, now),
    });

    return {entityId: guestId, revision: 1, alreadyApplied: false};
  });
}

export const createProgramWalkIn = onCall(
  appCheckCallableOptionsWithLimits(
    {timeoutSeconds: 60, maxInstances: 20}),
  (request) => createProgramWalkInHandler(request)
);
