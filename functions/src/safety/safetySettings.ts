import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import {requireAdminRole} from "../admin/adminAuth";
import {setAdminAuditLogInTransaction} from "../admin/adminAudit";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {SafetySettingsDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {AdminGetSafetySettingsCallableResponse} from
  "../shared/generated/adminGetSafetySettingsCallableResponse";
import type {AdminUpdateSafetySettingsCallablePayload} from
  "../shared/generated/adminUpdateSafetySettingsCallablePayload";
import {validateAdminGetSafetySettingsCallablePayload} from
  "../shared/generated/validators/adminGetSafetySettingsInput";
import {validateAdminUpdateSafetySettingsCallablePayload} from
  "../shared/generated/validators/adminUpdateSafetySettingsInput";
import {
  SAFETY_DEADLINES,
  SAFETY_OPS_ROLES,
  SAFETY_OWNER_ROLES,
  SAFETY_RETENTION_DAYS_AFTER_DELETION,
  SAFETY_SETTINGS_PATH,
  SAFETY_STEP_ROLES,
  SafetySettings,
  readSafetySettings,
} from "./safetyPolicy";

export interface SafetySettingsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Timestamp;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: SafetySettingsDeps = {
  firestore: () => admin.firestore(),
  now: () => Timestamp.now(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

function settingsResponse(settings: SafetySettings):
  AdminGetSafetySettingsCallableResponse {
  return {
    settings,
    deadlines: {...SAFETY_DEADLINES},
    stepRoles: {...SAFETY_STEP_ROLES},
    retentionDaysAfterDeletion: SAFETY_RETENTION_DAYS_AFTER_DELETION,
  };
}

/**
 * Reads Settings → Safety.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {SafetySettingsDeps} deps Dependencies.
 * @return {Promise<AdminGetSafetySettingsCallableResponse>} Settings.
 */
export async function adminGetSafetySettingsHandler(
  request: CallableRequest<unknown>,
  deps: SafetySettingsDeps = defaultDeps
): Promise<AdminGetSafetySettingsCallableResponse> {
  requireAdminRole(request, SAFETY_OPS_ROLES);
  validateCallableWithAjv(request,
    validateAdminGetSafetySettingsCallablePayload, (data) => data ?? {});
  return settingsResponse(await readSafetySettings(deps.firestore()));
}

/**
 * Owner-only: replaces the reasons and rules. Codes stay unique; a reason
 * already used on reports is switched off rather than removed.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {SafetySettingsDeps} deps Dependencies.
 * @return {Promise<AdminGetSafetySettingsCallableResponse>} New settings.
 */
export async function adminUpdateSafetySettingsHandler(
  request: CallableRequest<unknown>,
  deps: SafetySettingsDeps = defaultDeps
): Promise<AdminGetSafetySettingsCallableResponse> {
  const context = requireAdminRole(request, SAFETY_OWNER_ROLES);
  const payload = validateCallableWithAjv<
    AdminUpdateSafetySettingsCallablePayload>(request,
      validateAdminUpdateSafetySettingsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, context.uid, "adminUpdateSafetySettings",
    {maxRequests: 20, windowMs: 60_000});
  const codes = payload.reasons.map((reason) => reason.code);
  if (new Set(codes).size !== codes.length) {
    throw new HttpsError("invalid-argument", "Each reason needs its own code.");
  }
  if (!payload.reasons.some((reason) => reason.active)) {
    throw new HttpsError("invalid-argument",
      "Keep at least one reason people can choose.");
  }
  const now = deps.now();
  const ref = db.doc(SAFETY_SETTINGS_PATH);
  const document: SafetySettingsDocument = {
    schemaVersion: 1,
    reasons: payload.reasons.map((reason) => ({
      ...reason,
      label: reason.label.trim(),
    })),
    restrictOnSevereReport: payload.restrictOnSevereReport,
    organizerBlockLists: payload.organizerBlockLists,
    organizerReports: payload.organizerReports,
    updatedAt: now,
    updatedByUid: context.uid,
  };
  await db.runTransaction(async (tx) => {
    const before = await readSafetySettings(db, tx);
    const removed = before.reasons.map((reason) => reason.code)
      .filter((code) => !codes.includes(code));
    if (removed.length > 0) {
      throw new HttpsError("failed-precondition",
        `Switch reasons off instead of removing them: ${removed.join(", ")}.`);
    }
    tx.set(ref, document);
    setAdminAuditLogInTransaction(tx, db, context, {
      action: "adminUpdateSafetySettings",
      targetPath: SAFETY_SETTINGS_PATH,
      request,
      before: {
        reasons: before.reasons.length,
        restrictOnSevereReport: before.restrictOnSevereReport,
        organizerBlockLists: before.organizerBlockLists,
        organizerReports: before.organizerReports,
      },
      after: {
        reasons: document.reasons.length,
        restrictOnSevereReport: document.restrictOnSevereReport,
        organizerBlockLists: document.organizerBlockLists,
        organizerReports: document.organizerReports,
      },
      serverTimestamp: deps.serverTimestamp,
    });
  });
  return settingsResponse({
    reasons: document.reasons,
    restrictOnSevereReport: document.restrictOnSevereReport,
    organizerBlockLists: document.organizerBlockLists,
    organizerReports: document.organizerReports,
    updatedAtMillis: now.toMillis(),
    updatedByUid: context.uid,
  });
}

export const adminGetSafetySettings = onCall(appCheckCallableOptions,
  (request) => adminGetSafetySettingsHandler(request));

export const adminUpdateSafetySettings = onCall(appCheckCallableOptions,
  (request) => adminUpdateSafetySettingsHandler(request));
