import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {requireDoc, validateCallableWithAjv} from "../shared/validation";
import {
  assertRevision,
  dutyAssignments,
  dutyCoversFunction,
  nextRevision,
  requireProgramAccess,
  requireProgramDuty,
  requireProgramMutable,
  type ProgramAccess,
} from "../shared/programAuthority";
import type {
  ProgramFunctionDocument,
  ProgramFunctionGuestDocument,
  ProgramGuestDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ApplyProgramFunctionInvitationsCallablePayload} from
  "../shared/generated/applyProgramFunctionInvitationsCallablePayload";
import type {RecordProgramFunctionRsvpCallablePayload} from
  "../shared/generated/recordProgramFunctionRsvpCallablePayload";
import type {ProgramFunctionInvitationsCallableResponse} from
  "../shared/generated/programFunctionInvitationsCallableResponse";
import type {RecordProgramFunctionRsvpCallableResponse} from
  "../shared/generated/recordProgramFunctionRsvpCallableResponse";
import {
  validateApplyProgramFunctionInvitationsCallablePayload,
} from
  "../shared/generated/validators/applyProgramFunctionInvitationsInput";
import {
  validateRecordProgramFunctionRsvpCallablePayload,
} from "../shared/generated/validators/recordProgramFunctionRsvpInput";
import {buildConversionPlan} from "./conversionPlan";
import {
  planInvitationDiff,
  resolveEffectiveInviteSet,
  type FunctionGuestRowLike,
  type FunctionLike,
  type ProgramGuestLike,
} from "./functionInvitation";
import {functionCountPatch, rollupGuestRsvpForFunctions} from "./rsvpRollup";

interface ProgramRsvpDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: ProgramRsvpDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
};

const rsvpCallableLimits = {timeoutSeconds: 60, maxInstances: 20};

const functionGuests = (db: FirebaseFirestore.Firestore) =>
  db.collection("programFunctionGuests");
const joinKey = (functionId: string, guestId: string) =>
  `${functionId}_${guestId}`;

const millis = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const ts = value as FirebaseFirestore.Timestamp;
  return typeof ts.toMillis === "function" ? ts.toMillis() : null;
};

const functionLike = (doc: ProgramFunctionDocument & {id?: string},
  id: string): FunctionLike => ({
  functionId: id,
  invitationMode: doc.invitationMode ?? "allGuests",
  status: doc.status,
  expectedCount: doc.expectedCount ?? null,
  checkedInCount: doc.checkedInCount ?? null,
});

const guestLike = (doc: ProgramGuestDocument,
  id: string): ProgramGuestLike => ({
  guestId: id,
  invitationStatus: doc.invitationStatus,
  rsvpStatus: doc.rsvpStatus,
});

const rowLike = (doc: ProgramFunctionGuestDocument): FunctionGuestRowLike => ({
  functionId: doc.functionId,
  guestId: doc.guestId,
  invited: doc.invited,
  rsvpStatus: doc.rsvpStatus,
  attendanceStatus: doc.attendanceStatus,
  partySize: doc.partySize ?? null,
  responseNote: doc.responseNote ?? null,
  respondedAt: millis(doc.respondedAt),
});

/** Staff need guestRelations or functionLead covering this function. */
function requireRsvpWriteAccess(access: ProgramAccess, functionId: string) {
  if (access.role === "manager") return;
  const covering = [
    ...dutyAssignments(access, "guestRelations"),
    ...dutyAssignments(access, "functionLead"),
  ];
  if (!dutyCoversFunction(covering, functionId)) {
    throw new HttpsError(
      "permission-denied",
      "This account lacks a function-scoped RSVP duty for this function."
    );
  }
}

async function readFunctionRows(
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  programId: string,
  functionId: string,
): Promise<ProgramFunctionGuestDocument[]> {
  const snap = await tx.get(functionGuests(db)
    .where("programId", "==", programId)
    .where("functionId", "==", functionId));
  return snap.docs.map((doc) => doc.data() as ProgramFunctionGuestDocument);
}

async function readProgramFunctions(
  db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  programId: string,
): Promise<Map<string, ProgramFunctionDocument>> {
  const snap = await tx.get(db.collection("programFunctions")
    .where("programId", "==", programId));
  return new Map(snap.docs.map((doc) =>
    [doc.id, doc.data() as ProgramFunctionDocument]));
}

export async function applyProgramFunctionInvitationsHandler(
  request: CallableRequest<unknown>,
  deps: ProgramRsvpDeps = defaultDeps
): Promise<ProgramFunctionInvitationsCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<ApplyProgramFunctionInvitationsCallablePayload>(
      request, validateApplyProgramFunctionInvitationsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "applyProgramFunctionInvitations", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const functionRef = db.collection("programFunctions").doc(data.functionId);
  let result: ProgramFunctionInvitationsCallableResponse | null = null;
  await db.runTransaction(async (tx) => {
    const access = await requireProgramAccess({
      db, programId: data.programId, actorUid,
      now: deps.now(), transaction: tx,
    });
    requireProgramMutable(access.program);
    requireProgramDuty(access, "programCoordinator");
    const functionSnap = await tx.get(functionRef);
    if (!functionSnap.exists ||
        (functionSnap.data() as ProgramFunctionDocument).programId !==
          data.programId) {
      throw new HttpsError("not-found", "Function not found in this program.");
    }
    const fn = requireDoc<ProgramFunctionDocument>(
      functionSnap, "ProgramFunctionDocument");
    assertRevision(fn.revision, data.expectedRevision);
    if (fn.status === "cancelled") {
      throw new HttpsError("failed-precondition",
        "Cancelled functions keep their invitation list frozen.");
    }
    const [fnRows, programFns, guestsSnap, programRowsSnap] =
      await Promise.all([
        readFunctionRows(db, tx, data.programId, data.functionId),
        readProgramFunctions(db, tx, data.programId),
        tx.get(db.collection("programGuests")
          .where("programId", "==", data.programId)),
        tx.get(functionGuests(db)
          .where("programId", "==", data.programId)),
      ]);
    const guests = guestsSnap.docs.map((doc) =>
      guestLike(doc.data() as ProgramGuestDocument, doc.id));
    const guestIds = guests.map((guest) => guest.guestId);
    // allGuests functions derive their invite set implicitly — explicit
    // rows are never needed, so only stale invited rows are revoked. For
    // selectedGuests the caller's list is the full desired truth.
    const desired = data.invitationMode === "allGuests" ?
      [...resolveEffectiveInviteSet(
        {...functionLike(fn, functionRef.id), invitationMode: "allGuests"},
        guests, fnRows.map(rowLike))] :
      [...(data.selectedGuestIds ?? [])];
    const diff = planInvitationDiff(
      functionLike(fn, functionRef.id), fnRows.map(rowLike),
      desired, guestIds);
    const toCreate = data.invitationMode === "allGuests" ?
      [] : diff.toCreate;
    const now = deps.now();
    const fnLike = {...functionLike(fn, functionRef.id),
      invitationMode: data.invitationMode};
    const liveFunctions = new Map<string, FunctionLike>();
    for (const [id, doc] of programFns) {
      liveFunctions.set(id, id === functionRef.id ? fnLike :
        functionLike(doc, id));
    }
    // Post-diff row state per affected guest drives the derived rollups.
    const rowsByGuest = new Map<string, FunctionGuestRowLike[]>();
    const pushRow = (row: FunctionGuestRowLike) => {
      const list = rowsByGuest.get(row.guestId) ?? [];
      list.push(row);
      rowsByGuest.set(row.guestId, list);
    };
    for (const doc of programRowsSnap.docs) {
      pushRow(rowLike(doc.data() as ProgramFunctionGuestDocument));
    }
    const affected = new Set<string>();
    for (const guestId of toCreate) {
      affected.add(guestId);
      const key = joinKey(data.functionId, guestId);
      const existing = programRowsSnap.docs.find((doc) => doc.id === key);
      const prior = existing?.data() as
        ProgramFunctionGuestDocument | undefined;
      const document: ProgramFunctionGuestDocument = {
        programId: data.programId,
        organizerId: access.program.organizerId,
        functionId: data.functionId,
        guestId,
        invited: true,
        // A re-invite starts the response cycle fresh but keeps createdAt.
        rsvpStatus: "pending",
        attendanceStatus: "expected",
        partySize: null,
        responseNote: null,
        respondedAt: null,
        responseSource: null,
        recordedByUid: null,
        createdAt: prior?.createdAt ?? now,
        updatedAt: now,
        revision: nextRevision(prior?.revision ?? 0, now),
      };
      const list = rowsByGuest.get(guestId) ?? [];
      rowsByGuest.set(guestId, [
        ...list.filter((row) => row.functionId !== data.functionId),
        rowLike(document),
      ]);
      tx.set(functionGuests(db).doc(key), document);
    }
    for (const row of diff.toRevoke) {
      affected.add(row.guestId);
      const key = joinKey(data.functionId, row.guestId);
      const existing = programRowsSnap.docs.find((doc) => doc.id === key);
      const prior = existing?.data() as ProgramFunctionGuestDocument;
      tx.update(functionGuests(db).doc(key), {
        invited: false,
        updatedAt: now,
        revision: nextRevision(prior.revision, now),
      });
      const list = rowsByGuest.get(row.guestId) ?? [];
      rowsByGuest.set(row.guestId, [
        ...list.filter((entry) => entry.functionId !== data.functionId),
        {...row, invited: false},
      ]);
    }
    // Derived rollups: per-guest program status and function counters.
    const guestsById = new Map(guestsSnap.docs.map((doc) => [doc.id, doc]));
    for (const guestId of affected) {
      const guestDoc = guestsById.get(guestId);
      if (!guestDoc) continue;
      const guest = guestDoc.data() as ProgramGuestDocument;
      const rollup = rollupGuestRsvpForFunctions(
        rowsByGuest.get(guestId) ?? [], liveFunctions);
      if (rollup !== guest.rsvpStatus) {
        tx.update(guestDoc.ref, {
          rsvpStatus: rollup,
          updatedAt: now,
          revision: nextRevision(guest.revision, now),
        });
      }
    }
    const countPatch = functionCountPatch(fnLike,
      fnRows.map(rowLike).filter((row) =>
        !affected.has(row.guestId)).concat(
        [...affected].flatMap((guestId) =>
          (rowsByGuest.get(guestId) ?? [])
            .filter((row) => row.functionId === data.functionId))));
    const revision = nextRevision(fn.revision, now);
    tx.update(functionRef, {
      invitationMode: data.invitationMode,
      ...(countPatch ?? {}),
      updatedAt: now,
      revision,
    });
    result = {
      entityId: functionRef.id,
      revision,
      createdCount: toCreate.length,
      revokedCount: diff.toRevoke.length,
      keptCount: diff.toKeep.length,
      alreadyApplied: false,
    };
  });
  return result!;
}

export async function recordProgramFunctionRsvpHandler(
  request: CallableRequest<unknown>,
  deps: ProgramRsvpDeps = defaultDeps
): Promise<RecordProgramFunctionRsvpCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<RecordProgramFunctionRsvpCallablePayload>(
      request, validateRecordProgramFunctionRsvpCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "recordProgramFunctionRsvp", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const functionRef = db.collection("programFunctions").doc(data.functionId);
  const guestRef = db.collection("programGuests").doc(data.guestId);
  let result: RecordProgramFunctionRsvpCallableResponse | null = null;
  await db.runTransaction(async (tx) => {
    const access = await requireProgramAccess({
      db, programId: data.programId, actorUid,
      now: deps.now(), transaction: tx,
    });
    requireProgramMutable(access.program);
    requireRsvpWriteAccess(access, data.functionId);
    const [functionSnap, guestSnap, fnRows, guestRowsSnap, programFns] =
      await Promise.all([
        tx.get(functionRef),
        tx.get(guestRef),
        readFunctionRows(db, tx, data.programId, data.functionId),
        tx.get(functionGuests(db)
          .where("programId", "==", data.programId)
          .where("guestId", "==", data.guestId)),
        readProgramFunctions(db, tx, data.programId),
      ]);
    if (!functionSnap.exists ||
        (functionSnap.data() as ProgramFunctionDocument).programId !==
          data.programId) {
      throw new HttpsError("not-found", "Function not found in this program.");
    }
    if (!guestSnap.exists ||
        (guestSnap.data() as ProgramGuestDocument).programId !==
          data.programId) {
      throw new HttpsError("not-found", "Guest not found in this program.");
    }
    const fn = requireDoc<ProgramFunctionDocument>(
      functionSnap, "ProgramFunctionDocument");
    const guest = requireDoc<ProgramGuestDocument>(
      guestSnap, "ProgramGuestDocument");
    const now = deps.now();
    const liveFunctions = new Map<string, FunctionLike>();
    for (const [id, doc] of programFns) {
      liveFunctions.set(id, functionLike(doc, id));
    }
    const guestRows = guestRowsSnap.docs.map((doc) =>
      rowLike(doc.data() as ProgramFunctionGuestDocument));
    const plan = buildConversionPlan({
      guestId: data.guestId,
      functionId: data.functionId,
      rsvpStatus: data.rsvpStatus,
      // undefined keeps the prior answer; explicit null clears it.
      partySize: data.partySize,
      responseNote: data.responseNote,
      respondedAt: now.toMillis(),
    }, {
      functions: liveFunctions,
      rows: guestRows,
      guests: [guestLike(guest, guestRef.id)],
    }, {allowUninvited: data.allowUninvited === true});
    if (plan.rejected) {
      throw new HttpsError("failed-precondition",
        `RSVP rejected: ${plan.rejected.reason}.`);
    }
    const upsert = plan.functionGuestUpserts[0];
    const rowRef = functionGuests(db).doc(upsert.joinKey);
    const existing = guestRowsSnap.docs.find((doc) => doc.id === upsert.joinKey)
      ?.data() as ProgramFunctionGuestDocument | undefined;
    const document: ProgramFunctionGuestDocument = {
      programId: data.programId,
      organizerId: access.program.organizerId,
      functionId: upsert.fields.functionId,
      guestId: upsert.fields.guestId,
      invited: upsert.fields.invited,
      rsvpStatus: upsert.fields.rsvpStatus,
      attendanceStatus: upsert.fields.attendanceStatus,
      partySize: upsert.fields.partySize,
      responseNote: upsert.fields.responseNote,
      respondedAt: admin.firestore.Timestamp.fromMillis(
        upsert.fields.respondedAt),
      responseSource: "staff",
      recordedByUid: actorUid,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      revision: nextRevision(existing?.revision ?? 0, now),
    };
    tx.set(rowRef, document);
    const nextFnRows = [
      ...fnRows.map(rowLike).filter((row) => row.guestId !== data.guestId),
      rowLike(document),
    ];
    const countPatch = functionCountPatch(
      functionLike(fn, functionRef.id), nextFnRows);
    if (countPatch !== null) {
      tx.update(functionRef, {
        ...countPatch, updatedAt: now,
        revision: nextRevision(fn.revision, now),
      });
    }
    const rollup = plan.guestRollup.rsvpStatus;
    if (rollup !== guest.rsvpStatus ||
        guest.invitationStatus !== "responded") {
      tx.update(guestRef, {
        rsvpStatus: rollup,
        invitationStatus: "responded",
        updatedAt: now,
        revision: nextRevision(guest.revision, now),
      });
    }
    result = {
      entityId: upsert.joinKey,
      revision: document.revision,
      guestRsvpStatus: rollup,
      alreadyApplied: false,
    };
  });
  return result!;
}

export const applyProgramFunctionInvitations = onCall(
  appCheckCallableOptionsWithLimits(rsvpCallableLimits),
  (request) => applyProgramFunctionInvitationsHandler(request)
);
export const recordProgramFunctionRsvp = onCall(
  appCheckCallableOptionsWithLimits(rsvpCallableLimits),
  (request) => recordProgramFunctionRsvpHandler(request)
);
