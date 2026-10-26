/* firestore-index: programFunctions (
  programId:ASCENDING,
  startsAt:ASCENDING
) */
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {
  programProjectionExpiresAt,
  requireProgramAccess,
  requireProgramDuty,
} from "../shared/programAuthority";
import type {ProgramFunctionGuestDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {ProgramIdCallablePayload} from
  "../shared/generated/programIdCallablePayload";
import type {ProgramAttendanceReportCallableResponse} from
  "../shared/generated/programAttendanceReportCallableResponse";
import {
  validateProgramIdCallablePayload,
} from "../shared/generated/validators/programIdInput";
import {
  buildAttendanceReport,
  type AttendanceGuestRow,
} from "./programAttendanceReport";

// Reports drive reconciliation, so they fail closed rather than silently
// truncating a program past the read cap.
const ROW_LIMIT = 5000;
const FUNCTION_LIMIT = 500;

export interface AttendanceReportDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: AttendanceReportDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
};

/**
 * Program-wide attendance report for reconciliationViewer staff,
 * coordinators, and managers. Functions report in start order; exception
 * lists carry guest ids only — no names, contacts, or notes cross.
 */
export async function getProgramAttendanceReportHandler(
  request: CallableRequest<unknown>,
  deps: AttendanceReportDeps = defaultDeps,
): Promise<ProgramAttendanceReportCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ProgramIdCallablePayload>(
    request, validateProgramIdCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "getProgramAttendanceReport", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  const access = await requireProgramAccess({
    db, programId: data.programId, actorUid, now: deps.now(),
  });
  const assignments = requireProgramDuty(access, "reconciliationViewer");
  const now = deps.now();

  const functionsSnap = await db.collection("programFunctions")
    .where("programId", "==", data.programId)
    .orderBy("startsAt")
    .limit(FUNCTION_LIMIT + 1)
    .get();
  if (functionsSnap.size > FUNCTION_LIMIT) {
    throw new HttpsError("resource-exhausted",
      "Program functions exceed the report read cap.");
  }
  const functionIds = functionsSnap.docs.map((snap) => snap.id);

  const rowsSnap = await db.collection("programFunctionGuests")
    .where("programId", "==", data.programId)
    .limit(ROW_LIMIT + 1)
    .get();
  if (rowsSnap.size > ROW_LIMIT) {
    throw new HttpsError("resource-exhausted",
      "Program function guest rows exceed the report read cap.");
  }
  const rows: AttendanceGuestRow[] = [];
  for (const snap of rowsSnap.docs) {
    const doc = snap.data() as ProgramFunctionGuestDocument;
    rows.push({
      functionId: doc.functionId,
      guestId: doc.guestId,
      invited: doc.invited,
      rsvpStatus: doc.rsvpStatus,
      attendanceStatus: doc.attendanceStatus,
      partySize: doc.partySize ?? null,
    });
  }

  const report = buildAttendanceReport(functionIds, rows);
  return {
    programId: data.programId,
    serverTimeMillis: now.toMillis(),
    accessExpiresAtMillis: programProjectionExpiresAt(access, assignments),
    programGuests: report.programGuests,
    programInvitedGuests: report.programInvitedGuests,
    programAttendingGuests: report.programAttendingGuests,
    programCheckedInGuests: report.programCheckedInGuests,
    programNoShowGuests: report.programNoShowGuests,
    functions: report.functions,
  };
}

export const getProgramAttendanceReport = onCall(
  appCheckCallableOptionsWithLimits(
    {timeoutSeconds: 60, maxInstances: 20}),
  (request) => getProgramAttendanceReportHandler(request)
);
