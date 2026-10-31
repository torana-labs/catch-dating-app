import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import {requireAuth} from "../shared/auth";
import {requireOrganizerManager} from "../shared/organizerManagerAuthority";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import type {GetOrganizerEntitlementCallablePayload} from
  "../shared/generated/getOrganizerEntitlementCallablePayload";
import type {OrganizerEntitlementCallableResponse} from
  "../shared/generated/organizerEntitlementCallableResponse";
import type {OrganizerEntitlementsDocument} from
  "../shared/generated/organizerEntitlementsDocument";
import {organizerEntitlementSkuCatalog} from
  "../shared/generated/catalogs/organizerEntitlementSkuCatalog";
import {
  validateGetOrganizerEntitlementCallablePayload,
} from "../shared/generated/validators/getOrganizerEntitlementInput";
import {
  validateOrganizerEntitlementCallableResponse,
} from "../shared/generated/validators/organizerEntitlementOutput";
import {validateOrganizerEntitlementsDocument} from
  "../shared/generated/validators/organizerEntitlementsDocument";
import {grantIsActive, grantRemaining} from "./entitlementPolicy";
import {adminRolesFromToken} from "../admin/adminAuth";

const entitlementCollection = "organizerEntitlements";

interface OrganizerEntitlementReadDeps {
  firestore: () => FirebaseFirestore.Firestore;
  now: () => number;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: OrganizerEntitlementReadDeps = {
  firestore: () => admin.firestore(),
  now: Date.now,
  checkRateLimit: defaultCheckRateLimit,
};

type SkuCatalog = OrganizerEntitlementCallableResponse["skuCatalog"];
type ResponseGrant = OrganizerEntitlementCallableResponse["grants"][number];

/**
 * Returns the bounded entitlement projection for one managed organizer.
 * Admin internals (grantedBy, receiptRef, note) never leave the server.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OrganizerEntitlementReadDeps} deps Injectable dependencies.
 * @return {Promise<OrganizerEntitlementCallableResponse>} Projection.
 */
export async function getOrganizerEntitlementHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerEntitlementReadDeps = defaultDeps
): Promise<OrganizerEntitlementCallableResponse> {
  const uid = requireAuth(request);
  const data = validateCallableWithAjv<
    GetOrganizerEntitlementCallablePayload
  >(
    request,
    validateGetOrganizerEntitlementCallablePayload,
    normalizePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, uid, "getOrganizerEntitlement", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  const adminRoles = adminRolesFromToken(
    request.auth?.token as Record<string, unknown> | undefined);
  if (!adminRoles.includes("adminOwner")) {
    await requireOrganizerManager({
      db,
      organizerId: data.organizerId,
      actorUid: uid,
    });
  }
  const snap = await db.collection(entitlementCollection)
    .doc(data.organizerId).get();
  const doc = snap.exists ? parseEntitlements(snap.data()) : null;
  const now = deps.now();
  const response: OrganizerEntitlementCallableResponse = {
    schemaVersion: 1,
    organizerId: data.organizerId,
    catalogVersion: organizerEntitlementSkuCatalog.catalogVersion,
    revision: doc?.revision ?? 0,
    grants: (doc?.grants ?? []).map((grant) => projectGrant(grant, now)),
    meters: {
      flightDaysUsed: doc?.meters.flightDaysUsed ?? 0,
      waConversationsUsed: doc?.meters.waConversationsUsed ?? 0,
    },
    skuCatalog: organizerEntitlementSkuCatalog.skus as unknown as SkuCatalog,
  };
  if (!validateOrganizerEntitlementCallableResponse(response)) {
    throw new Error("Invalid organizer entitlement response");
  }
  return response;
}

function projectGrant(
  grant: OrganizerEntitlementsDocument["grants"][number],
  nowMillis: number
): ResponseGrant {
  const catalogEntry = organizerEntitlementSkuCatalog.skus[grant.sku];
  const like = {
    grantId: grant.grantId,
    sku: grant.sku,
    unit: grant.unit,
    quantityTotal: grant.quantityTotal,
    quantityConsumed: grant.quantityConsumed,
    validFromMillis: toMillis(grant.validFrom),
    validUntilMillis: grant.validUntil === null ?
      null : toMillis(grant.validUntil),
    grantedAtMillis: toMillis(grant.grantedAt),
    revokedAtMillis: grant.revokedAt === null ?
      null : toMillis(grant.revokedAt),
  };
  return {
    grantId: grant.grantId,
    sku: grant.sku,
    skuLabel: catalogEntry?.label ?? grant.sku,
    unit: grant.unit,
    quantityTotal: grant.quantityTotal,
    quantityConsumed: grant.quantityConsumed,
    quantityRemaining: grantRemaining(like),
    validFromMillis: like.validFromMillis,
    validUntilMillis: like.validUntilMillis,
    source: grant.source,
    active: grantIsActive(like, nowMillis),
    revoked: grant.revokedAt !== null,
  };
}

function toMillis(value: {_seconds: number; _nanoseconds: number}): number {
  return value._seconds * 1000 + Math.floor(value._nanoseconds / 1_000_000);
}

function parseEntitlements(value: unknown): OrganizerEntitlementsDocument {
  if (!validateOrganizerEntitlementsDocument(value)) {
    throw new HttpsError(
      "failed-precondition",
      "The stored organizer entitlements document is invalid."
    );
  }
  return value;
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const data = value as Record<string, unknown>;
  return {
    ...data,
    organizerId: typeof data.organizerId === "string" ?
      data.organizerId.trim() : data.organizerId,
  };
}

export const getOrganizerEntitlement = onCall(
  appCheckCallableOptions,
  (request) => getOrganizerEntitlementHandler(request)
);
