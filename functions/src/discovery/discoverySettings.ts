import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {CallableRequest, onCall} from "firebase-functions/v2/https";
import {requireAdminRole} from "../platform/adminAuth";
import {setAdminAuditLogInTransaction} from "../platform/adminAudit";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {DiscoverySettingsDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {AdminGetDiscoverySettingsCallableResponse} from
  "../shared/generated/adminGetDiscoverySettingsCallableResponse";
import type {AdminUpdateDiscoverySettingsCallablePayload} from
  "../shared/generated/adminUpdateDiscoverySettingsCallablePayload";
import {validateAdminGetDiscoverySettingsCallablePayload} from
  "../shared/generated/validators/adminGetDiscoverySettingsInput";
import {validateAdminUpdateDiscoverySettingsCallablePayload} from
  "../shared/generated/validators/adminUpdateDiscoverySettingsInput";
import {
  DISCOVERY_OWNER_ROLES,
  DISCOVERY_READ_ROLES,
  DISCOVERY_SETTINGS_PATH,
  DiscoverySettings,
  defaultDiscoveryRules,
  discoveryRulesOf,
  readDiscoverySettings,
} from "./discoveryPolicy";

export interface DiscoverySettingsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => Timestamp;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: DiscoverySettingsDeps = {
  firestore: () => admin.firestore(),
  now: () => Timestamp.now(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

function settingsResponse(settings: DiscoverySettings):
  AdminGetDiscoverySettingsCallableResponse {
  return {
    settings: {
      ...discoveryRulesOf(settings),
      updatedAtMillis: settings.updatedAtMillis,
      updatedByUid: settings.updatedByUid,
    },
    defaults: defaultDiscoveryRules(),
  };
}

/**
 * Reads Settings → Discovery, with the defaults in code.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {DiscoverySettingsDeps} deps Dependencies.
 * @return {Promise<AdminGetDiscoverySettingsCallableResponse>} Settings.
 */
export async function adminGetDiscoverySettingsHandler(
  request: CallableRequest<unknown>,
  deps: DiscoverySettingsDeps = defaultDeps
): Promise<AdminGetDiscoverySettingsCallableResponse> {
  requireAdminRole(request, DISCOVERY_READ_ROLES);
  validateCallableWithAjv(request,
    validateAdminGetDiscoverySettingsCallablePayload, (data) => data ?? {});
  return settingsResponse(await readDiscoverySettings(deps.firestore()));
}

/**
 * Owner-only: replaces the discovery rules. The write lands with an admin
 * audit log entry in one transaction; the city plans trigger then rebuilds
 * every city.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {DiscoverySettingsDeps} deps Dependencies.
 * @return {Promise<AdminGetDiscoverySettingsCallableResponse>} New settings.
 */
export async function adminUpdateDiscoverySettingsHandler(
  request: CallableRequest<unknown>,
  deps: DiscoverySettingsDeps = defaultDeps
): Promise<AdminGetDiscoverySettingsCallableResponse> {
  const context = requireAdminRole(request, DISCOVERY_OWNER_ROLES);
  const payload = validateCallableWithAjv<
    AdminUpdateDiscoverySettingsCallablePayload>(request,
      validateAdminUpdateDiscoverySettingsCallablePayload);
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, context.uid, "adminUpdateDiscoverySettings",
    {maxRequests: 20, windowMs: 60_000});
  const now = deps.now();
  const rules = discoveryRulesOf(payload);
  const document: DiscoverySettingsDocument = {
    schemaVersion: 1,
    ...rules,
    updatedAt: now,
    updatedByUid: context.uid,
  };
  await db.runTransaction(async (tx) => {
    const before = await readDiscoverySettings(db, tx);
    tx.set(db.doc(DISCOVERY_SETTINGS_PATH), document);
    setAdminAuditLogInTransaction(tx, db, context, {
      action: "adminUpdateDiscoverySettings",
      targetPath: DISCOVERY_SETTINGS_PATH,
      request,
      before: {...discoveryRulesOf(before)},
      after: {...rules},
      serverTimestamp: deps.serverTimestamp,
    });
  });
  return settingsResponse({
    ...rules,
    updatedAtMillis: now.toMillis(),
    updatedByUid: context.uid,
  });
}

export const adminGetDiscoverySettings = onCall(appCheckCallableOptions,
  (request) => adminGetDiscoverySettingsHandler(request));

export const adminUpdateDiscoverySettings = onCall(appCheckCallableOptions,
  (request) => adminUpdateDiscoverySettingsHandler(request));
