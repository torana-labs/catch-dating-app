import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {
  ADMIN_ROLE_CLAIMS,
  RETIRED_ADMIN_ROLE_CLAIMS,
  AdminRoleClaim,
  adminRolesFromToken,
  requireAdminRole,
} from "./adminAuth";
import {writeAdminAuditLog} from "./adminAudit";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import type {AdminSetAdminUserRolesCallablePayload} from
  "../shared/generated/adminSetAdminUserRolesCallablePayload";
import type {AdminSetAdminUserRolesCallableResponse} from
  "../shared/generated/adminSetAdminUserRolesCallableResponse";
import {
  validateAdminSetAdminUserRolesCallablePayload,
} from "../shared/generated/validators/adminSetAdminUserRolesInput";
import {validateCallableWithAjv} from "../shared/validation";

const adminUserRoleOwnerRoles = ["adminOwner"] as const;

export interface AdminGetAdminUserRolesPayload {
  targetUid: string;
}

export interface AdminUserRoleRecord {
  targetUid: string;
  email: string | null;
  displayName: string | null;
  disabled: boolean;
  roles: AdminRoleClaim[];
  assignmentPath: string;
}

export interface AdminGetAdminUserRolesResponse {
  user: AdminUserRoleRecord;
}

export interface AdminRoleAssignmentRow extends AdminUserRoleRecord {
  status: "active" | "revoked";
  updatedAt: string | null;
  updatedByUid: string | null;
}

export interface AdminListAdminRoleAssignmentsPayload {
  status?: "active" | "revoked" | "all" | null;
  limit?: number | null;
}

export interface AdminListAdminRoleAssignmentsResponse {
  generatedAt: string;
  rows: AdminRoleAssignmentRow[];
  source: "adminRoleAssignments";
}

export type AdminSetAdminUserRolesPayload =
  AdminSetAdminUserRolesCallablePayload;

export type AdminSetAdminUserRolesResponse =
  AdminSetAdminUserRolesCallableResponse;

interface AuthUserRecord {
  uid: string;
  email?: string;
  displayName?: string;
  disabled: boolean;
  customClaims?: Record<string, unknown>;
}

interface AuthLike {
  getUser(uid: string): Promise<AuthUserRecord>;
  setCustomUserClaims(
    uid: string,
    customUserClaims: Record<string, unknown> | null
  ): Promise<void>;
}

interface AdminUserRolesDeps {
  auth: () => AuthLike;
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: AdminUserRolesDeps = {
  auth: () => admin.auth(),
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * Looks up a Firebase Auth user and returns only Catch admin role claims.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AdminUserRolesDeps} deps Injectable dependencies.
 * @return {Promise<AdminGetAdminUserRolesResponse>} Role lookup response.
 */
export async function adminGetAdminUserRolesHandler(
  request: CallableRequest<unknown>,
  deps: AdminUserRolesDeps = defaultDeps
): Promise<AdminGetAdminUserRolesResponse> {
  const adminContext = requireAdminRole(request, adminUserRoleOwnerRoles);
  const payload = normalizeGetAdminUserRolesPayload(request.data);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminGetAdminUserRoles", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const user = await getAuthUserOrThrow(deps.auth(), payload.targetUid);
  return {
    user: adminUserRoleRecord(user),
  };
}

/**
 * Lists the bounded admin role assignment register.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AdminUserRolesDeps} deps Injectable dependencies.
 * @return {Promise<AdminListAdminRoleAssignmentsResponse>} Assignment rows.
 */
export async function adminListAdminRoleAssignmentsHandler(
  request: CallableRequest<unknown>,
  deps: AdminUserRolesDeps = defaultDeps
): Promise<AdminListAdminRoleAssignmentsResponse> {
  const adminContext = requireAdminRole(request, adminUserRoleOwnerRoles);
  const payload = normalizeListAdminRoleAssignmentsPayload(request.data);
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminListAdminRoleAssignments",
    {maxRequests: 30, windowMs: 60 * 1000}
  );

  let query: FirebaseFirestore.Query =
    db.collection("adminRoleAssignments");
  if (payload.status && payload.status !== "all") {
    query = query.where("status", "==", payload.status);
  }
  const snap = await query
    .orderBy("updatedAt", "desc")
    .limit(payload.limit ?? 50)
    .get();
  return {
    generatedAt: new Date().toISOString(),
    rows: snap.docs.map(adminRoleAssignmentRow),
    source: "adminRoleAssignments",
  };
}

/**
 * Assigns or removes Catch admin role claims for an exact Firebase Auth uid.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {AdminUserRolesDeps} deps Injectable dependencies.
 * @return {Promise<AdminSetAdminUserRolesResponse>} Updated role response.
 */
export async function adminSetAdminUserRolesHandler(
  request: CallableRequest<unknown>,
  deps: AdminUserRolesDeps = defaultDeps
): Promise<AdminSetAdminUserRolesResponse> {
  const adminContext = requireAdminRole(request, adminUserRoleOwnerRoles);
  validateCallableWithAjv(
    request,
    validateAdminSetAdminUserRolesCallablePayload
  );
  const payload = normalizeSetAdminUserRolesPayload(request.data);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminSetAdminUserRoles", {
    maxRequests: 10, windowMs: 60 * 1000,
  });
  if (
    payload.targetUid === adminContext.uid &&
    !payload.roles.includes("adminOwner")
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Admin owners cannot remove their own adminOwner claim."
    );
  }

  const auth = deps.auth();
  const beforeUser = await getAuthUserOrThrow(auth, payload.targetUid);
  const beforeRoles = rolesFromClaims(beforeUser.customClaims);
  const nextClaims = customClaimsWithAdminRoles(
    beforeUser.customClaims,
    payload.roles
  );

  await auth.setCustomUserClaims(
    payload.targetUid,
    Object.keys(nextClaims).length > 0 ? nextClaims : null
  );
  const afterUser = await getAuthUserOrThrow(auth, payload.targetUid);
  const afterRoles = rolesFromClaims(afterUser.customClaims);
  await db.collection("adminRoleAssignments").doc(payload.targetUid).set({
    targetUid: payload.targetUid,
    email: afterUser.email ?? null,
    displayName: afterUser.displayName ?? null,
    disabled: afterUser.disabled,
    roles: afterRoles,
    status: afterRoles.length > 0 ? "active" : "revoked",
    updatedAt: deps.serverTimestamp(),
    updatedByUid: adminContext.uid,
    note: payload.note,
  }, {merge: true});
  await writeAdminAuditLog(db, adminContext, {
    action: "adminSetAdminUserRoles",
    targetPath: assignmentPath(payload.targetUid),
    request,
    before: {roles: beforeRoles},
    after: {roles: afterRoles},
    note: payload.note,
    serverTimestamp: deps.serverTimestamp,
  });

  return {
    user: adminUserRoleRecord(afterUser),
    beforeRoles,
    afterRoles,
  };
}

/**
 * Parses an admin role lookup payload.
 * @param {unknown} data Callable payload.
 * @return {AdminGetAdminUserRolesPayload} Valid payload.
 */
export function normalizeGetAdminUserRolesPayload(
  data: unknown
): AdminGetAdminUserRolesPayload {
  if (!isRecord(data)) {
    throw new HttpsError("invalid-argument", "Expected an object payload.");
  }
  return {targetUid: normalizeUid(data.targetUid)};
}

/**
 * Parses the admin assignment-list payload.
 * @param {unknown} data Callable payload.
 * @return {AdminListAdminRoleAssignmentsPayload} Valid payload.
 */
export function normalizeListAdminRoleAssignmentsPayload(
  data: unknown
): AdminListAdminRoleAssignmentsPayload {
  const record = data === undefined || data === null ? {} : data;
  if (!isRecord(record)) {
    throw new HttpsError("invalid-argument", "Expected an object payload.");
  }
  const rawStatus = stringValue(record.status) ?? "active";
  if (!["active", "revoked", "all"].includes(rawStatus)) {
    throw new HttpsError(
      "invalid-argument",
      "status must be active, revoked, or all."
    );
  }
  const rawLimit = record.limit;
  const limit = typeof rawLimit === "number" ?
    Math.floor(rawLimit) :
    rawLimit === null || rawLimit === undefined ? 50 : Number.NaN;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new HttpsError(
      "invalid-argument",
      "limit must be an integer from 1 to 100."
    );
  }
  return {
    status: rawStatus as AdminListAdminRoleAssignmentsPayload["status"],
    limit,
  };
}

/**
 * Parses an admin role mutation payload.
 * @param {unknown} data Callable payload.
 * @return {AdminSetAdminUserRolesPayload} Valid payload.
 */
export function normalizeSetAdminUserRolesPayload(
  data: unknown
): AdminSetAdminUserRolesPayload {
  if (!isRecord(data)) {
    throw new HttpsError("invalid-argument", "Expected an object payload.");
  }
  const roles = normalizeRoles(data.roles);
  const note = stringValue(data.note);
  if (!note) {
    throw new HttpsError(
      "invalid-argument",
      "A review note is required for admin role changes."
    );
  }
  if (note.length > 1000) {
    throw new HttpsError(
      "invalid-argument",
      "Review note must be 1000 characters or fewer."
    );
  }
  return {
    targetUid: normalizeUid(data.targetUid),
    roles,
    note,
  };
}

/**
 * Builds a Firestore/Auth-safe assignment path.
 * @param {string} uid Firebase Auth uid.
 * @return {string} Assignment document path.
 */
function assignmentPath(uid: string): string {
  return `adminRoleAssignments/${uid}`;
}

/**
 * Returns only supported admin roles from custom claims.
 * @param {Record<string, unknown> | undefined} claims Auth custom claims.
 * @return {AdminRoleClaim[]} Supported roles.
 */
function rolesFromClaims(
  claims: Record<string, unknown> | undefined
): AdminRoleClaim[] {
  return adminRolesFromToken(claims);
}

/**
 * Replaces Catch admin role claims while preserving unrelated custom claims.
 * @param {Record<string, unknown> | undefined} existing Existing claims.
 * @param {AdminRoleClaim[]} roles Next admin roles.
 * @return {Record<string, unknown>} Updated claims.
 */
function customClaimsWithAdminRoles(
  existing: Record<string, unknown> | undefined,
  roles: AdminRoleClaim[]
): Record<string, unknown> {
  const next = {...(existing ?? {})};
  for (const role of [...ADMIN_ROLE_CLAIMS, ...RETIRED_ADMIN_ROLE_CLAIMS]) {
    delete next[role];
  }
  for (const role of roles) {
    next[role] = true;
  }
  return next;
}

/**
 * Builds a public admin role record for the console.
 * @param {AuthUserRecord} user Firebase Auth user.
 * @return {AdminUserRoleRecord} Admin role record.
 */
function adminUserRoleRecord(user: AuthUserRecord): AdminUserRoleRecord {
  return {
    targetUid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    disabled: user.disabled,
    roles: rolesFromClaims(user.customClaims),
    assignmentPath: assignmentPath(user.uid),
  };
}

/**
 * Projects an admin assignment document into a console row.
 * @param {FirebaseFirestore.QueryDocumentSnapshot} doc Assignment snapshot.
 * @return {AdminRoleAssignmentRow} Console assignment row.
 */
function adminRoleAssignmentRow(
  doc: FirebaseFirestore.QueryDocumentSnapshot
): AdminRoleAssignmentRow {
  const data = doc.data();
  const targetUid = stringValue(data.targetUid) ?? doc.id;
  const roles = rolesFromUnknown(data.roles);
  const rawStatus = stringValue(data.status);
  const status = rawStatus === "revoked" || roles.length === 0 ?
    "revoked" :
    "active";
  return {
    targetUid,
    email: nullableString(data.email),
    displayName: nullableString(data.displayName),
    disabled: data.disabled === true,
    roles,
    assignmentPath: assignmentPath(targetUid),
    status,
    updatedAt: isoFromTimestamp(data.updatedAt),
    updatedByUid: nullableString(data.updatedByUid),
  };
}

/**
 * Returns supported admin roles from an arbitrary Firestore field.
 * @param {unknown} value Raw roles field.
 * @return {AdminRoleClaim[]} Supported unique roles.
 */
function rolesFromUnknown(value: unknown): AdminRoleClaim[] {
  if (!Array.isArray(value)) return [];
  const roles: AdminRoleClaim[] = [];
  for (const item of value) {
    const role = stringValue(item);
    if (role && isAdminRoleClaim(role) && !roles.includes(role)) {
      roles.push(role);
    }
  }
  return roles;
}

/**
 * Reads a Firebase Auth user or maps missing users to a callable error.
 * @param {AuthLike} auth Firebase Auth dependency.
 * @param {string} uid Target uid.
 * @return {Promise<AuthUserRecord>} Firebase Auth user.
 */
async function getAuthUserOrThrow(
  auth: AuthLike,
  uid: string
): Promise<AuthUserRecord> {
  try {
    return await auth.getUser(uid);
  } catch (error) {
    if (isAuthUserNotFound(error)) {
      throw new HttpsError("not-found", "Firebase Auth user not found.");
    }
    throw error;
  }
}

/**
 * Checks whether a Firebase Auth error means user-not-found.
 * @param {unknown} error Caught error.
 * @return {boolean} Whether the user is missing.
 */
function isAuthUserNotFound(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as {code?: unknown}).code === "auth/user-not-found"
  );
}

/**
 * Normalizes and validates a Firebase Auth uid.
 * @param {unknown} value Raw uid.
 * @return {string} Valid uid.
 */
function normalizeUid(value: unknown): string {
  const uid = stringValue(value);
  if (!uid || !/^[A-Za-z0-9_-]{3,128}$/u.test(uid)) {
    throw new HttpsError(
      "invalid-argument",
      "A valid targetUid is required."
    );
  }
  return uid;
}

/**
 * Normalizes the requested admin role list.
 * @param {unknown} value Raw roles.
 * @return {AdminRoleClaim[]} Valid unique roles.
 */
function normalizeRoles(value: unknown): AdminRoleClaim[] {
  if (!Array.isArray(value)) {
    throw new HttpsError(
      "invalid-argument",
      "roles must be an array of admin role claims."
    );
  }
  const roles: AdminRoleClaim[] = [];
  for (const item of value) {
    const role = stringValue(item);
    if (!role || !isAdminRoleClaim(role)) {
      throw new HttpsError(
        "invalid-argument",
        "roles may only contain supported admin role claims."
      );
    }
    if (!roles.includes(role)) roles.push(role);
  }
  return roles;
}

/**
 * Checks whether a string is a supported admin role claim.
 * @param {string} value Candidate role.
 * @return {boolean} Whether the role is supported.
 */
function isAdminRoleClaim(value: string): value is AdminRoleClaim {
  return (ADMIN_ROLE_CLAIMS as readonly string[]).includes(value);
}

/**
 * Checks whether a value is a record.
 * @param {unknown} value Candidate value.
 * @return {boolean} Whether the value is a record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null &&
    !Array.isArray(value);
}

/**
 * Returns a trimmed non-empty string.
 * @param {unknown} value Candidate value.
 * @return {string | null} Normalized text.
 */
function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Returns a nullable trimmed string.
 * @param {unknown} value Candidate value.
 * @return {string | null} Normalized string or null.
 */
function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Converts Firestore timestamp-like values to ISO text.
 * @param {unknown} value Timestamp-like value.
 * @return {string | null} ISO timestamp or null.
 */
function isoFromTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && "toDate" in value &&
    typeof (value as {toDate?: unknown}).toDate === "function") {
    const date = (value as {toDate: () => Date}).toDate();
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  }
  if (typeof value === "object" && "_seconds" in value) {
    const seconds = Number((value as {_seconds?: unknown})._seconds);
    if (Number.isFinite(seconds)) {
      return new Date(seconds * 1000).toISOString();
    }
  }
  return null;
}

export const adminListAdminRoleAssignments = onCall(
  appCheckCallableOptions,
  (request) => adminListAdminRoleAssignmentsHandler(request)
);

export const adminGetAdminUserRoles = onCall(
  appCheckCallableOptions,
  (request) => adminGetAdminUserRolesHandler(request)
);

export const adminSetAdminUserRoles = onCall(
  appCheckCallableOptions,
  (request) => adminSetAdminUserRolesHandler(request)
);
