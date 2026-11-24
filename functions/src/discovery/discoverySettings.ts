import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {setAdminAuditLogInTransaction} from "../platform/adminAudit";
import {
  callable,
  type CallableSpec,
  runCallable,
} from "../platform/callables/callable";
import {adminRoles} from "../platform/callables/policies";
import type {AdminContext} from "../platform/adminAuth";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import type {DiscoverySettingsDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {AdminGetDiscoverySettingsCallableResponse} from
  "../shared/generated/adminGetDiscoverySettingsCallableResponse";
import type {AdminGetDiscoverySettingsCallablePayload} from
  "../shared/generated/adminGetDiscoverySettingsCallablePayload";
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

type Response = AdminGetDiscoverySettingsCallableResponse;

/**
 * Reads Settings → Discovery, with the defaults in code. Discovery readers
 * only (STR-10 policy).
 * @param {DiscoverySettingsDeps} deps Dependencies.
 * @return {CallableSpec} The callable.
 */
export function adminGetDiscoverySettingsSpec(
  deps: DiscoverySettingsDeps = defaultDeps
): CallableSpec<AdminGetDiscoverySettingsCallablePayload, AdminContext,
  Response> {
  return {
    name: "adminGetDiscoverySettings",
    policy: adminRoles(DISCOVERY_READ_ROLES),
    input: validateAdminGetDiscoverySettingsCallablePayload,
    normalize: (data) => data ?? {},
    handle: async () =>
      settingsResponse(await readDiscoverySettings(deps.firestore())),
  };
}

/**
 * Owner-only: replaces the discovery rules. The write lands with an admin
 * audit log entry in one transaction; the city plans trigger then rebuilds
 * every city.
 * @param {DiscoverySettingsDeps} deps Dependencies.
 * @return {CallableSpec} The callable.
 */
export function adminUpdateDiscoverySettingsSpec(
  deps: DiscoverySettingsDeps = defaultDeps
): CallableSpec<AdminUpdateDiscoverySettingsCallablePayload, AdminContext,
  Response> {
  return {
    name: "adminUpdateDiscoverySettings",
    policy: adminRoles(DISCOVERY_OWNER_ROLES),
    input: validateAdminUpdateDiscoverySettingsCallablePayload,
    handle: async ({request, data: payload, actor: context}) => {
      const db = deps.firestore();
      await deps.checkRateLimit?.(db, context.uid,
        "adminUpdateDiscoverySettings", {maxRequests: 20, windowMs: 60_000});
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
    },
  };
}

/** The deployed path of adminGetDiscoverySettings, for tests. */
export function adminGetDiscoverySettingsHandler(
  request: CallableRequest<unknown>,
  deps: DiscoverySettingsDeps = defaultDeps
): Promise<Response> {
  return runCallable(adminGetDiscoverySettingsSpec(deps), request);
}

/** The deployed path of adminUpdateDiscoverySettings, for tests. */
export function adminUpdateDiscoverySettingsHandler(
  request: CallableRequest<unknown>,
  deps: DiscoverySettingsDeps = defaultDeps
): Promise<Response> {
  return runCallable(adminUpdateDiscoverySettingsSpec(deps), request);
}

export const adminGetDiscoverySettings = callable(
  adminGetDiscoverySettingsSpec());

export const adminUpdateDiscoverySettings = callable(
  adminUpdateDiscoverySettingsSpec());
