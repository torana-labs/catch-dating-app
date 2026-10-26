/* firestore-index: programFunctionGuests (
  functionId:ASCENDING,
  attendanceStatus:ASCENDING
) */
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {
  dutyAssignments,
  dutyCoversFunction,
  nextRevision,
  requireProgramAccess,
  requireProgramMutable,
  type ProgramAccess,
} from "../shared/programAuthority";
import type {
  ProgramDoorJournalDocument,
  ProgramFunctionDocument,
  ProgramFunctionGuestDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {RecordProgramDoorJournalCallablePayload} from
  "../shared/generated/recordProgramDoorJournalCallablePayload";
import type {RecordProgramDoorJournalCallableResponse} from
  "../shared/generated/recordProgramDoorJournalCallableResponse";
import {
  validateRecordProgramDoorJournalCallablePayload,
} from
  "../shared/generated/validators/recordProgramDoorJournalInput";
import {
  journalIdFor,
  planJournalWrite,
  type JournalExisting,
  type JournalRequest,
} from "./journalPlan";

interface DoorJournalDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: DoorJournalDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
};

const joinKey = (functionId: string, guestId: string) =>
  `${functionId}_${guestId}`;

// Managers and programCoordinators are unrestricted; otherwise a
// functionCheckIn or functionLead assignment must cover the function.
// dutyAssignments already folds coordinator into every duty query.
export function requireDoorAuthority(access: ProgramAccess,
  functionId: string): void {
  if (access.role === "manager") return;
  const covering =
    dutyCoversFunction(dutyAssignments(access, "functionCheckIn"),
      functionId) ||
    dutyCoversFunction(dutyAssignments(access, "functionLead"),
      functionId);
  if (!covering) {
    throw new HttpsError("permission-denied",
      "This account lacks function check-in authority for this " +
      "function.");
  }
}

interface GuestState {
  attendanceStatus: "expected" | "checkedIn" | "noShow";
  partySize: number | null;
}

const headsOf = (state: GuestState | null) =>
  state?.attendanceStatus === "checkedIn" ? state.partySize ?? 1 : 0;

export async function recordProgramDoorJournalHandler(
  request: CallableRequest<unknown>,
  deps: DoorJournalDeps = defaultDeps,
): Promise<RecordProgramDoorJournalCallableResponse> {
  const actorUid = requireAuth(request);
  const data =
    validateCallableWithAjv<RecordProgramDoorJournalCallablePayload>(
      request, validateRecordProgramDoorJournalCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "recordProgramDoorJournal", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const access = await requireProgramAccess({
    db, programId: data.programId, actorUid, now: deps.now(),
  });
  requireProgramMutable(access.program);
  requireDoorAuthority(access, data.functionId);
  const now = deps.now();
  type Response =
    RecordProgramDoorJournalCallableResponse;
  type Result = Response["results"][number];
  return db.runTransaction(async (tx) => {
    const functionRef = db.collection("programFunctions")
      .doc(data.functionId);
    const guestIds = [...new Set(
      data.operations.map((op) => op.guestId))];
    // Walk-ins on guests with no join row must still name a real
    // programGuests record; listed guests need no lookup.
    const walkInGuestIds = [...new Set(data.operations
      .filter((op) => op.action === "walkInCreate")
      .map((op) => op.guestId))];
    const journalIds = data.operations.map((op) =>
      journalIdFor({
        scope: {kind: "program", id: data.programId},
        functionId: data.functionId,
        guestId: op.guestId,
        action: op.action,
        occurredAtMillis: op.occurredAtMillis,
        actorUid,
      }));
    const [functionSnap, journalSnaps, rowSnaps, walkInGuestSnaps,
      checkedInSnap] =
      await Promise.all([
        tx.get(functionRef),
        Promise.all(journalIds.map((id) =>
          tx.get(db.collection("programDoorJournal").doc(id)))),
        Promise.all(guestIds.map((guestId) =>
          tx.get(db.collection("programFunctionGuests")
            .doc(joinKey(data.functionId, guestId))))),
        Promise.all(walkInGuestIds.map((guestId) =>
          tx.get(db.collection("programGuests").doc(guestId)))),
        tx.get(db.collection("programFunctionGuests")
          .where("functionId", "==", data.functionId)
          .where("attendanceStatus", "==", "checkedIn")),
      ]);
    if (!functionSnap.exists) {
      throw new HttpsError("not-found", "Function not found.");
    }
    const fn = functionSnap.data() as ProgramFunctionDocument;
    if (fn.programId !== data.programId) {
      throw new HttpsError("not-found",
        "Function not found in this program.");
    }
    if (fn.status === "cancelled") {
      throw new HttpsError("failed-precondition",
        "Cancelled functions cannot take check-ins.");
    }
    const existingJournalIds = new Set<string>();
    for (const snap of journalSnaps) {
      if (snap.exists) existingJournalIds.add(snap.id);
    }
    // Document ids are authoritative; field values are payload.
    const states = new Map<string, GuestState>();
    const rowDocs = new Map<string,
      ProgramFunctionGuestDocument>();
    for (const [index, snap] of rowSnaps.entries()) {
      if (!snap.exists) continue;
      const row = snap.data() as ProgramFunctionGuestDocument;
      if (row.programId !== data.programId) continue;
      const guestId = guestIds[index];
      rowDocs.set(guestId, row);
      states.set(guestId, {
        attendanceStatus: row.attendanceStatus,
        partySize: row.partySize ?? null,
      });
    }
    // Guests with no row are unlisted; only walkInCreate may write them.
    for (const guestId of guestIds) {
      if (!states.has(guestId)) {
        states.set(guestId, {
          attendanceStatus: "expected", partySize: null,
        });
      }
    }
    const knownWalkInGuests = new Set<string>();
    for (const [index, snap] of walkInGuestSnaps.entries()) {
      if (!snap.exists) continue;
      const guest = snap.data() as {programId?: string};
      if (guest.programId === data.programId) {
        knownWalkInGuests.add(walkInGuestIds[index]);
      }
    }
    let checkedInHeads = 0;
    for (const doc of checkedInSnap.docs) {
      const row = doc.data() as ProgramFunctionGuestDocument;
      if (row.programId !== data.programId) continue;
      checkedInHeads += row.partySize ?? 1;
    }
    const results: Result[] = [];
    let appended = 0;
    let duplicates = 0;
    let rejected = 0;
    for (const [index, op] of data.operations.entries()) {
      const journalId = journalIds[index];
      const request: JournalRequest = {
        scope: {kind: "program", id: data.programId},
        functionId: data.functionId,
        guestId: op.guestId,
        actorUid,
        action: op.action,
        occurredAtMillis: op.occurredAtMillis,
        deviceId: op.deviceId ?? null,
        partySize: op.partySize ?? null,
        note: op.note ?? null,
      };
      // A guest that has neither a row nor a prior state is unlisted.
      const listed = rowDocs.has(op.guestId);
      // A walk-in for an unlisted guest must still name a real
      // programGuests record in this program; staff create the guest
      // first, then check them in.
      if (op.action === "walkInCreate" && !listed &&
          !knownWalkInGuests.has(op.guestId)) {
        rejected++;
        results.push({
          guestId: op.guestId, action: op.action,
          outcome: "rejected", journalId: null,
          reason: "invalidTransition",
        });
        continue;
      }
      const existing: JournalExisting = {
        guest: listed ?
          {...states.get(op.guestId)!, lastJournalId: null} : null,
        checkInEnabled: fn.checkInEnabled ?? true,
        journalIds: existingJournalIds,
      };
      let plan;
      try {
        plan = planJournalWrite(existing, request);
      } catch {
        rejected++;
        results.push({
          guestId: op.guestId, action: op.action,
          outcome: "rejected", journalId: null,
          reason: "invalidTransition",
        });
        continue;
      }
      if (plan.kind === "reject") {
        if (plan.reason === "duplicateJournalId") {
          duplicates++;
          results.push({
            guestId: op.guestId, action: op.action,
            outcome: "duplicate", journalId, reason: plan.reason,
          });
        } else {
          rejected++;
          results.push({
            guestId: op.guestId, action: op.action,
            outcome: "rejected", journalId: null, reason: plan.reason,
          });
        }
        continue;
      }
      const entry = plan.entry;
      const previousHeads = listed ? headsOf(states.get(op.guestId)!) : 0;
      const journalDoc: ProgramDoorJournalDocument = {
        programId: data.programId,
        organizerId: fn.organizerId,
        functionId: data.functionId,
        guestId: op.guestId,
        actorUid,
        action: entry.action,
        occurredAtMillis: entry.occurredAtMillis,
        deviceId: entry.deviceId,
        partySize: entry.partySize,
        note: entry.note,
        createdAt: now,
        updatedAt: now,
        revision: 1,
      };
      tx.create(
        db.collection("programDoorJournal").doc(entry.journalId),
        journalDoc);
      const state = states.get(op.guestId)!;
      switch (entry.action) {
      case "checkIn":
      case "walkInCreate":
        state.attendanceStatus = "checkedIn";
        if (entry.action === "walkInCreate" &&
            entry.partySize !== null) {
          state.partySize = entry.partySize;
        }
        break;
      case "undoCheckIn":
        state.attendanceStatus = "expected";
        break;
      case "markNoShow":
        state.attendanceStatus = "noShow";
        break;
      case "partySizeAdjust":
        if (entry.partySize !== null) state.partySize = entry.partySize;
        break;
      }
      const row = rowDocs.get(op.guestId);
      const rowRef = db.collection("programFunctionGuests")
        .doc(joinKey(data.functionId, op.guestId));
      if (row) {
        tx.update(rowRef, {
          attendanceStatus: state.attendanceStatus,
          partySize: state.partySize,
          updatedAt: now,
          revision: nextRevision(row.revision, now),
        });
      } else if (entry.action === "walkInCreate") {
        tx.create(rowRef, {
          programId: data.programId,
          organizerId: fn.organizerId,
          functionId: data.functionId,
          guestId: op.guestId,
          invited: false,
          rsvpStatus: "pending",
          attendanceStatus: "checkedIn",
          partySize: state.partySize,
          respondedAt: null,
          responseNote: null,
          createdAt: now,
          updatedAt: now,
          revision: 1,
        });
        rowDocs.set(op.guestId, {
          programId: data.programId,
          organizerId: fn.organizerId,
          functionId: data.functionId,
          guestId: op.guestId,
          invited: false,
          rsvpStatus: "pending",
          attendanceStatus: "checkedIn",
          partySize: state.partySize,
          respondedAt: null,
          responseNote: null,
          createdAt: now,
          updatedAt: now,
          revision: 1,
        });
      }
      checkedInHeads += headsOf(state) - previousHeads;
      existingJournalIds.add(entry.journalId);
      appended++;
      results.push({
        guestId: op.guestId, action: op.action,
        outcome: "appended", journalId: entry.journalId, reason: null,
      });
    }
    let revision = fn.revision;
    if (appended > 0) {
      revision = nextRevision(fn.revision, now);
      tx.update(functionRef, {
        checkedInCount: checkedInHeads,
        updatedAt: now,
        revision,
      });
    }
    return {
      entityId: data.functionId,
      revision,
      results,
      appendedCount: appended,
      duplicateCount: duplicates,
      rejectedCount: rejected,
      alreadyApplied: appended === 0 && rejected === 0,
    };
  });
}

export const recordProgramDoorJournal = onCall(
  appCheckCallableOptionsWithLimits(
    {timeoutSeconds: 60, maxInstances: 20}),
  (request) => recordProgramDoorJournalHandler(request)
);
