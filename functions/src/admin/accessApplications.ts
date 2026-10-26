import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAdminRole} from "./adminAuth";
import {setAdminAuditLogInTransaction} from "./adminAudit";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import type {AdminDecideAccessApplicationCallablePayload} from
  "../shared/generated/adminDecideAccessApplicationCallablePayload";
import type {AdminDecideAccessApplicationCallableResponse} from
  "../shared/generated/adminDecideAccessApplicationCallableResponse";
import {
  validateAdminDecideAccessApplicationCallablePayload,
} from
  "../shared/generated/validators/adminDecideAccessApplicationInput";
import {validateCallableWithAjv} from "../shared/validation";

const accessReviewRoles = ["admin", "adminOwner", "support"] as const;
const editableStatuses = ["pending", "waitlisted", "notSelectedYet"];

export type AccessApplicationDecision = "approve" | "deny";

export type AdminDecideAccessApplicationPayload =
  AdminDecideAccessApplicationCallablePayload;

export type AdminDecideAccessApplicationResponse =
  AdminDecideAccessApplicationCallableResponse;

export interface AdminGetAccessApplicationDetailsPayload {
  applicationUid: string;
}

export interface AdminAccessApplicationDuplicateSignal {
  id: string;
  label: string;
  value: string;
  count: number;
  sampleTargetPaths: string[];
}

export interface AdminAccessApplicationDetails {
  uid: string;
  targetPath: string;
  status: string;
  city: string | null;
  role: string | null;
  eventTypes: string[];
  availabilityWindows: string[];
  wantsToHost: boolean;
  inviteCode: string | null;
  instagramHandle: string | null;
  referralSource: string | null;
  whyCatch: string | null;
  cohortId: string | null;
  hostUserId: string | null;
  reviewerUid: string | null;
  reviewNote: string | null;
  submissionCount: number;
  createdAt: string | null;
  submittedAt: string | null;
  updatedAt: string | null;
  reviewedAt: string | null;
  duplicateSignals: AdminAccessApplicationDuplicateSignal[];
}

export interface AdminGetAccessApplicationDetailsResponse {
  application: AdminAccessApplicationDetails;
}

interface AccessApplicationDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: AccessApplicationDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * Loads a read-only application detail snapshot for access reviewers.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AccessApplicationDeps} deps Injectable dependencies.
 * @return {Promise<AdminGetAccessApplicationDetailsResponse>} Details.
 */
export async function adminGetAccessApplicationDetailsHandler(
  request: CallableRequest<unknown>,
  deps: AccessApplicationDeps = defaultDeps
): Promise<AdminGetAccessApplicationDetailsResponse> {
  const adminContext = requireAdminRole(request, accessReviewRoles);
  const payload = normalizeDetailsPayload(request.data);
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminGetAccessApplicationDetails",
    {maxRequests: 60, windowMs: 60 * 1000}
  );
  const snapshot = await db.collection("accessApplications")
    .doc(payload.applicationUid)
    .get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "Access application not found.");
  }
  const data = snapshot.data() ?? {};
  const application = publicAccessApplicationDetails(
    payload.applicationUid,
    data
  );
  return {
    application: {
      ...application,
      duplicateSignals: await loadDuplicateSignals(db, application),
    },
  };
}

/**
 * Reviews a launch access application from the admin dashboard.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AccessApplicationDeps} deps Injectable dependencies.
 * @return {Promise<AdminDecideAccessApplicationResponse>} Decision result.
 */
export async function adminDecideAccessApplicationHandler(
  request: CallableRequest<unknown>,
  deps: AccessApplicationDeps = defaultDeps
): Promise<AdminDecideAccessApplicationResponse> {
  const adminContext = requireAdminRole(request, accessReviewRoles);
  validateCallableWithAjv(
    request,
    validateAdminDecideAccessApplicationCallablePayload
  );
  const payload = normalizeDecisionPayload(request.data);
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminDecideAccessApplication",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const applicationPath = `accessApplications/${payload.applicationUid}`;
  const applicationRef = db
    .collection("accessApplications")
    .doc(payload.applicationUid);
  const nextStatus = payload.decision === "approve" ?
    "approvedForProfile" :
    "notSelectedYet";

  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(applicationRef);
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Access application not found.");
    }

    const data = snapshot.data() ?? {};
    const currentStatus = stringValue(data.status) ?? "pending";
    if (!editableStatuses.includes(currentStatus)) {
      throw new HttpsError(
        "failed-precondition",
        "This access application has already been reviewed."
      );
    }

    const reviewPatch: Record<string, unknown> = {
      status: nextStatus,
      reviewerUid: adminContext.uid,
      reviewNote: payload.note ?? null,
      reviewedAt: deps.serverTimestamp(),
      updatedAt: deps.serverTimestamp(),
    };
    if (payload.cohortId) {
      reviewPatch.cohortId = payload.cohortId;
    }

    tx.set(applicationRef, reviewPatch, {merge: true});
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminDecideAccessApplication",
      targetPath: applicationPath,
      request,
      before: {status: currentStatus},
      after: {
        status: nextStatus,
        decision: payload.decision,
        ...(payload.cohortId ? {cohortId: payload.cohortId} : {}),
      },
      note: payload.note,
      serverTimestamp: deps.serverTimestamp,
    });
  });

  return {
    applicationUid: payload.applicationUid,
    decision: payload.decision,
    status: nextStatus,
  };
}

export const adminDecideAccessApplication = onCall(
  appCheckCallableOptions,
  (request) => adminDecideAccessApplicationHandler(request)
);

export const adminGetAccessApplicationDetails = onCall(
  appCheckCallableOptions,
  (request) => adminGetAccessApplicationDetailsHandler(request)
);

/**
 * Parses and validates the admin details payload.
 * @param {unknown} data Raw callable payload.
 * @return {AdminGetAccessApplicationDetailsPayload} Valid payload.
 */
export function normalizeDetailsPayload(
  data: unknown
): AdminGetAccessApplicationDetailsPayload {
  if (!isRecord(data)) {
    throw new HttpsError("invalid-argument", "Expected an object payload.");
  }
  return {applicationUid: normalizeApplicationUid(data.applicationUid)};
}

/**
 * Parses and validates the admin decision payload.
 * @param {unknown} data Raw callable payload.
 * @return {AdminDecideAccessApplicationPayload} Valid payload.
 */
export function normalizeDecisionPayload(
  data: unknown
): AdminDecideAccessApplicationPayload {
  if (!isRecord(data)) {
    throw new HttpsError("invalid-argument", "Expected an object payload.");
  }

  const applicationUid = stringValue(data.applicationUid);
  if (
    !applicationUid ||
    !isValidApplicationUid(applicationUid)
  ) {
    throw new HttpsError(
      "invalid-argument",
      "A valid applicationUid is required."
    );
  }

  const decision = stringValue(data.decision);
  if (decision !== "approve" && decision !== "deny") {
    throw new HttpsError(
      "invalid-argument",
      "Decision must be approve or deny."
    );
  }

  const note = nullableStringValue(data.note);
  if (!note) {
    throw new HttpsError(
      "invalid-argument",
      "A review note is required for access decisions."
    );
  }
  if (note.length > 1000) {
    throw new HttpsError(
      "invalid-argument",
      "Review note must be 1000 characters or fewer."
    );
  }

  const cohortId = nullableStringValue(data.cohortId);
  if (cohortId && cohortId.length > 120) {
    throw new HttpsError(
      "invalid-argument",
      "Cohort id must be 120 characters or fewer."
    );
  }

  return {applicationUid, decision, note, cohortId};
}

/**
 * Builds an admin-safe read-only detail snapshot.
 * @param {string} uid Access application document id.
 * @param {FirebaseFirestore.DocumentData} data Document data.
 * @return {AdminAccessApplicationDetails} Details.
 */
function publicAccessApplicationDetails(
  uid: string,
  data: FirebaseFirestore.DocumentData
): Omit<AdminAccessApplicationDetails, "duplicateSignals"> {
  return {
    uid,
    targetPath: `accessApplications/${uid}`,
    status: stringValue(data.status) ?? "unknown",
    city: stringValue(data.city),
    role: stringValue(data.role),
    eventTypes: stringArrayValue(data.eventTypes).slice(0, 20),
    availabilityWindows:
      stringArrayValue(data.availabilityWindows).slice(0, 20),
    wantsToHost: data.wantsToHost === true,
    inviteCode: stringValue(data.inviteCode),
    instagramHandle: stringValue(data.instagramHandle),
    referralSource: stringValue(data.referralSource),
    whyCatch: stringValue(data.whyCatch),
    cohortId: stringValue(data.cohortId),
    hostUserId: stringValue(data.hostUserId),
    reviewerUid: stringValue(data.reviewerUid),
    reviewNote: stringValue(data.reviewNote),
    submissionCount: numberValue(data.submissionCount) ?? 0,
    createdAt: isoFromTimestamp(data.createdAt),
    submittedAt: isoFromTimestamp(data.submittedAt),
    updatedAt: isoFromTimestamp(data.updatedAt),
    reviewedAt: isoFromTimestamp(data.reviewedAt),
  };
}

/**
 * Loads bounded deterministic overlap signals for a single application.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {Omit<AdminAccessApplicationDetails, "duplicateSignals">} application
 * Application detail.
 * @return {Promise<AdminAccessApplicationDuplicateSignal[]>} Signals.
 */
async function loadDuplicateSignals(
  db: FirebaseFirestore.Firestore,
  application: Omit<AdminAccessApplicationDetails, "duplicateSignals">
): Promise<AdminAccessApplicationDuplicateSignal[]> {
  const signals = await Promise.all([
    loadExactFieldSignal(
      db,
      application,
      "inviteCode",
      application.inviteCode,
      "Invite code"
    ),
    loadExactFieldSignal(
      db,
      application,
      "instagramHandle",
      application.instagramHandle,
      "Instagram"
    ),
    loadExactFieldSignal(
      db,
      application,
      "referralSource",
      application.referralSource,
      "Referral source"
    ),
    loadCityRoleSignal(db, application),
  ]);
  return signals.filter(
    (signal): signal is AdminAccessApplicationDuplicateSignal =>
      signal !== null
  );
}

/**
 * Loads a bounded same-field overlap signal.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {Omit<AdminAccessApplicationDetails, "duplicateSignals">} application
 * Current application.
 * @param {string} field Firestore field.
 * @param {string | null} value Field value.
 * @param {string} label Display label.
 * @return {Promise<AdminAccessApplicationDuplicateSignal | null>} Signal.
 */
async function loadExactFieldSignal(
  db: FirebaseFirestore.Firestore,
  application: Omit<AdminAccessApplicationDetails, "duplicateSignals">,
  field: string,
  value: string | null,
  label: string
): Promise<AdminAccessApplicationDuplicateSignal | null> {
  if (!value) return null;
  const snapshot = await db.collection("accessApplications")
    .where(field, "==", value)
    .limit(10)
    .get();
  return duplicateSignalFromDocs({
    docs: snapshot.docs,
    id: field,
    label,
    value,
    currentUid: application.uid,
  });
}

/**
 * Loads a bounded same-city-and-role overlap signal.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {Omit<AdminAccessApplicationDetails, "duplicateSignals">} application
 * Current application.
 * @return {Promise<AdminAccessApplicationDuplicateSignal | null>} Signal.
 */
async function loadCityRoleSignal(
  db: FirebaseFirestore.Firestore,
  application: Omit<AdminAccessApplicationDetails, "duplicateSignals">
): Promise<AdminAccessApplicationDuplicateSignal | null> {
  if (!application.city || !application.role) return null;
  const snapshot = await db.collection("accessApplications")
    .where("city", "==", application.city)
    .limit(25)
    .get();
  const docs = snapshot.docs.filter((doc) =>
    stringValue(doc.data().role) === application.role
  );
  return duplicateSignalFromDocs({
    docs,
    id: "cityRole",
    label: "City and role",
    value: `${application.city} / ${application.role}`,
    currentUid: application.uid,
  });
}

/**
 * Converts matched docs into a compact overlap signal.
 * @param {object} args Signal args.
 * @return {AdminAccessApplicationDuplicateSignal} Signal.
 */
function duplicateSignalFromDocs(args: {
  docs: Array<{id: string}>;
  id: string;
  label: string;
  value: string;
  currentUid: string;
}): AdminAccessApplicationDuplicateSignal {
  const targetPaths = args.docs
    .filter((doc) => doc.id !== args.currentUid)
    .map((doc) => `accessApplications/${doc.id}`);
  return {
    id: args.id,
    label: args.label,
    value: args.value,
    count: targetPaths.length,
    sampleTargetPaths: targetPaths.slice(0, 5),
  };
}

/**
 * Validates a single Firestore document id.
 * @param {unknown} value Raw value.
 * @return {string} Application uid.
 */
function normalizeApplicationUid(value: unknown): string {
  const uid = stringValue(value);
  if (!uid || !isValidApplicationUid(uid)) {
    throw new HttpsError(
      "invalid-argument",
      "A valid applicationUid is required."
    );
  }
  return uid;
}

/**
 * Checks whether an application uid is a single safe document id.
 * @param {string} value Candidate uid.
 * @return {boolean} Whether uid is valid.
 */
function isValidApplicationUid(value: string): boolean {
  return /^[A-Za-z0-9_-]{3,128}$/u.test(value);
}

/**
 * Checks whether a value is a plain object record.
 * @param {unknown} value Candidate value.
 * @return {boolean} Whether the value is a record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&
    !Array.isArray(value);
}

/**
 * Returns a trimmed string when non-empty.
 * @param {unknown} value Candidate value.
 * @return {string | null} String value.
 */
function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Returns string items from an array value.
 * @param {unknown} value Candidate array.
 * @return {string[]} String values.
 */
function stringArrayValue(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => stringValue(item))
    .filter((item): item is string => item !== null);
}

/**
 * Returns a finite number from a field.
 * @param {unknown} value Candidate number.
 * @return {number | null} Number value.
 */
function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Converts Firestore Timestamp/Date/string values to ISO text.
 * @param {unknown} value Timestamp-like value.
 * @return {string | null} ISO string.
 */
function isoFromTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as {toDate?: unknown}).toDate === "function"
  ) {
    const date = (value as {toDate: () => Date}).toDate();
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  return null;
}

/**
 * Returns a trimmed nullable string.
 * @param {unknown} value Candidate value.
 * @return {string | null} Nullable string.
 */
function nullableStringValue(value: unknown): string | null {
  if (value == null) return null;
  return stringValue(value);
}
