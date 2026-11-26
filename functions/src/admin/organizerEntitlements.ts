import {CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {AdminGrantOrganizerEntitlementCallablePayload} from
  "../shared/generated/adminGrantOrganizerEntitlementCallablePayload";
import type {AdminRevokeOrganizerEntitlementGrantCallablePayload} from
  "../shared/generated/adminRevokeOrganizerEntitlementGrantCallablePayload";
import type {OrganizerEntitlementMutationCallableResponse} from
  "../shared/generated/organizerEntitlementMutationCallableResponse";
import type {OrganizerEntitlementsDocument} from
  "../shared/generated/organizerEntitlementsDocument";
import {
  validateAdminGrantOrganizerEntitlementCallablePayload,
} from
  "../shared/generated/validators/adminGrantOrganizerEntitlementInput";
import {
  validateAdminRevokeOrganizerEntitlementGrantCallablePayload,
} from
  "../shared/generated/validators/adminRevokeOrganizerEntitlementGrantInput";
import {
  validateOrganizerEntitlementMutationCallableResponse,
} from
  "../shared/generated/validators/organizerEntitlementMutationOutput";
import {validateOrganizerEntitlementsDocument} from
  "../shared/generated/validators/organizerEntitlementsDocument";
import {
  classifyCommandReceiptData,
  commandReceiptRef,
  writeCommandReceipt,
} from "../shared/commandReceipts";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {operationContentHash} from "../operations/durableActions";
import {setAdminAuditLogInTransaction} from "../platform/adminAudit";
import {organizerEntitlementSkuCatalog} from
  "../shared/generated/catalogs/organizerEntitlementSkuCatalog";
import type {AdminContext} from "../platform/adminAuth";
import {
  callable,
  type CallableContext,
  type CallableSpec,
  runCallable,
} from "../platform/callables/callable";
import {adminRoles} from "../platform/callables/policies";

const entitlementCollection = "organizerEntitlements";
const receiptCommand = "adminOrganizerEntitlement";
const allowedRoles = ["adminOwner"] as const;
const maxGrantsPerOrganizer = 50;

interface OrganizerEntitlementDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
  now: () => number;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: OrganizerEntitlementDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  timestampFromMillis: (millis) =>
    admin.firestore.Timestamp.fromMillis(millis),
  now: Date.now,
  checkRateLimit: defaultCheckRateLimit,
};

type EntitlementGrant = OrganizerEntitlementsDocument["grants"][number];

/**
 * Grants one entitlement SKU to an organizer. Idempotent on operationId;
 * grants no dispatch authority and changes no program state.
 * Policy: allowedRoles (STR-10).
 * @param {OrganizerEntitlementDeps} deps Dependencies.
 * @return {CallableSpec} The callable.
 */
export function adminGrantOrganizerEntitlementSpec(
  deps: OrganizerEntitlementDeps = defaultDeps):
  CallableSpec<
    AdminGrantOrganizerEntitlementCallablePayload,
    AdminContext,
    OrganizerEntitlementMutationCallableResponse> {
  return {
    name: "adminGrantOrganizerEntitlement",
    policy: adminRoles(allowedRoles),
    input: validateAdminGrantOrganizerEntitlementCallablePayload,
    normalize: normalizeGrantPayload,
    handle: (context) => adminGrantOrganizerEntitlementWork(context, deps),
  };
}

/** The deployed path of adminGrantOrganizerEntitlement, for tests. */
export function adminGrantOrganizerEntitlementHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerEntitlementDeps = defaultDeps):
  Promise<OrganizerEntitlementMutationCallableResponse> {
  return runCallable(adminGrantOrganizerEntitlementSpec(deps), request);
}

async function adminGrantOrganizerEntitlementWork(
  {request, data, actor: adminContext}:
    CallableContext<
      AdminGrantOrganizerEntitlementCallablePayload,
      AdminContext>,
  deps: OrganizerEntitlementDeps):
  Promise<OrganizerEntitlementMutationCallableResponse> {
  const sku = organizerEntitlementSkuCatalog.skus[data.sku];
  if (!sku || data.unit !== sku.unit) {
    throw new HttpsError("invalid-argument",
      "The entitlement unit must match the selected SKU.");
  }
  if (data.source === "manualInvoice" && !data.receiptRef?.trim()) {
    throw new HttpsError("invalid-argument",
      "Manual invoice grants need an invoice receipt reference.");
  }
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminGrantOrganizerEntitlement",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const docRef = db.collection(entitlementCollection).doc(data.organizerId);
  const receiptRef = commandReceiptRef(db, receiptCommand,
    `${data.organizerId}_${data.operationId}`);
  const contentHash = operationContentHash([adminContext.uid, data]);
  const grantId = `grant_${data.operationId}`;

  return db.runTransaction(async (tx) => {
    const [docSnap, receiptSnap] = await tx.getAll(docRef, receiptRef);
    const replayed = replayIfMatching(
      receiptSnap, contentHash, data.organizerId, deps.now());
    if (replayed) return replayed;

    const before = docSnap.exists ?
      parseEntitlements(docSnap.data()) : null;
    const priorGrant = before?.grants.find((grant) =>
      grant.grantId === grantId);
    if (priorGrant) {
      if (priorGrant.operationContentHash !== contentHash ||
          priorGrant.operationResultRevision === undefined) {
        throw new HttpsError("failed-precondition",
          "This grant operation id was already used with a different or " +
          "unverifiable payload.");
      }
      return mutationResponse(data.organizerId,
        priorGrant.operationResultRevision, grantId, true);
    }
    const now = deps.now();
    assertClock(now);
    if ((before?.grants.length ?? 0) >= maxGrantsPerOrganizer) {
      throw new HttpsError(
        "resource-exhausted",
        "This organizer already holds the maximum number of grants."
      );
    }
    const validFrom = data.validFromMillis === undefined ?
      now : data.validFromMillis;
    assertMillis(validFrom, "validFromMillis");
    if (data.validUntilMillis !== undefined &&
        data.validUntilMillis !== null) {
      assertMillis(data.validUntilMillis, "validUntilMillis");
      if (data.validUntilMillis <= validFrom) {
        throw new HttpsError(
          "failed-precondition",
          "validUntil must be after validFrom."
        );
      }
    }
    const timestamp = deps.serverTimestamp();
    const grant: EntitlementGrant = {
      grantId,
      operationContentHash: contentHash,
      operationResultRevision: (before?.revision ?? 0) + 1,
      sku: data.sku,
      unit: data.unit,
      quantityTotal: data.quantityTotal,
      quantityConsumed: 0,
      validFrom: deps.timestampFromMillis(validFrom) as unknown as
        EntitlementGrant["validFrom"],
      validUntil: data.validUntilMillis === undefined ||
          data.validUntilMillis === null ?
        null : deps.timestampFromMillis(data.validUntilMillis) as unknown as
          EntitlementGrant["validUntil"],
      source: data.source,
      receiptRef: data.receiptRef ?? null,
      note: data.note ?? null,
      grantedBy: adminContext.uid,
      grantedAt: timestamp as unknown as EntitlementGrant["grantedAt"],
      revokedAt: null,
      revokedBy: null,
      revokeReason: null,
    };
    const next: OrganizerEntitlementsDocument = {
      schemaVersion: 1,
      organizerId: data.organizerId,
      grants: [...(before?.grants ?? []), grant],
      meters: before?.meters ?? {
        flightDaysUsed: 0,
        waConversationsUsed: 0,
        periodStartsAt: timestamp as unknown as
          OrganizerEntitlementsDocument["meters"]["periodStartsAt"],
      },
      revision: (before?.revision ?? 0) + 1,
      createdAt: (before?.createdAt ?? timestamp) as unknown as
        OrganizerEntitlementsDocument["createdAt"],
      updatedAt: timestamp as unknown as
        OrganizerEntitlementsDocument["updatedAt"],
    };
    if (!validateOrganizerEntitlementsDocument(next)) {
      throw new Error("Invalid organizer entitlements document");
    }
    tx.set(docRef, next);
    writeCommandReceipt(tx, receiptRef, {
      command: receiptCommand, retention: "request", requestHash: contentHash,
      result: {resultRevision: next.revision, grantId}, nowMillis: now,
    });
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminGrantOrganizerEntitlement",
      targetPath: docRef.path,
      request,
      before: docSnap.exists ? docSnap.data() ?? {} : {},
      after: {
        revision: next.revision,
        grant: {
          grantId, sku: grant.sku, unit: grant.unit,
          quantityTotal: grant.quantityTotal, source: grant.source,
        },
      },
      note: data.note,
      serverTimestamp: () => timestamp,
    });
    return mutationResponse(data.organizerId, next.revision, grantId, false);
  });
}

/**
 * Revokes one existing entitlement grant. Idempotent on operationId; unknown
 * or already-revoked grants fail closed.
 * Policy: allowedRoles (STR-10).
 * @param {OrganizerEntitlementDeps} deps Dependencies.
 * @return {CallableSpec} The callable.
 */
export function adminRevokeOrganizerEntitlementGrantSpec(
  deps: OrganizerEntitlementDeps = defaultDeps):
  CallableSpec<
    AdminRevokeOrganizerEntitlementGrantCallablePayload,
    AdminContext,
    OrganizerEntitlementMutationCallableResponse> {
  return {
    name: "adminRevokeOrganizerEntitlementGrant",
    policy: adminRoles(allowedRoles),
    input: validateAdminRevokeOrganizerEntitlementGrantCallablePayload,
    normalize: normalizeRevokePayload,
    handle: (context) =>
      adminRevokeOrganizerEntitlementGrantWork(context, deps),
  };
}

/** The deployed path of adminRevokeOrganizerEntitlementGrant, for tests. */
export function adminRevokeOrganizerEntitlementGrantHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerEntitlementDeps = defaultDeps):
  Promise<OrganizerEntitlementMutationCallableResponse> {
  return runCallable(adminRevokeOrganizerEntitlementGrantSpec(deps), request);
}

async function adminRevokeOrganizerEntitlementGrantWork(
  {request, data, actor: adminContext}:
    CallableContext<
      AdminRevokeOrganizerEntitlementGrantCallablePayload,
      AdminContext>,
  deps: OrganizerEntitlementDeps):
  Promise<OrganizerEntitlementMutationCallableResponse> {
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminRevokeOrganizerEntitlementGrant",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const docRef = db.collection(entitlementCollection).doc(data.organizerId);
  const receiptRef = commandReceiptRef(db, receiptCommand,
    `${data.organizerId}_${data.operationId}`);
  const contentHash = operationContentHash([adminContext.uid, data]);

  return db.runTransaction(async (tx) => {
    const [docSnap, receiptSnap] = await tx.getAll(docRef, receiptRef);
    const replayed = replayIfMatching(
      receiptSnap, contentHash, data.organizerId, deps.now());
    if (replayed) return replayed;
    if (!docSnap.exists) {
      throw new HttpsError(
        "not-found",
        "This organizer has no entitlement document."
      );
    }
    const before = parseEntitlements(docSnap.data());
    const grantIndex = before.grants.findIndex(
      (grant) => grant.grantId === data.grantId);
    if (grantIndex < 0) {
      throw new HttpsError(
        "not-found",
        "Unknown entitlement grant for this organizer."
      );
    }
    const existing = before.grants[grantIndex];
    if (existing.revokedAt !== null) {
      throw new HttpsError(
        "failed-precondition",
        "This entitlement grant is already revoked."
      );
    }
    const now = deps.now();
    assertClock(now);
    const timestamp = deps.serverTimestamp();
    const grants = before.grants.slice();
    grants[grantIndex] = {
      ...existing,
      revokedAt: deps.timestampFromMillis(now) as unknown as
        EntitlementGrant["revokedAt"],
      revokedBy: adminContext.uid,
      revokeReason: data.reason,
    };
    const next: OrganizerEntitlementsDocument = {
      ...before,
      grants,
      revision: before.revision + 1,
      updatedAt: timestamp as unknown as
        OrganizerEntitlementsDocument["updatedAt"],
    };
    if (!validateOrganizerEntitlementsDocument(next)) {
      throw new Error("Invalid organizer entitlements document");
    }
    tx.set(docRef, next);
    writeCommandReceipt(tx, receiptRef, {
      command: receiptCommand, retention: "request", requestHash: contentHash,
      result: {resultRevision: next.revision, grantId: data.grantId},
      nowMillis: now,
    });
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminRevokeOrganizerEntitlementGrant",
      targetPath: docRef.path,
      request,
      before: {grant: existing},
      after: {grantId: data.grantId, revision: next.revision,
        revoked: true},
      note: data.reason,
      serverTimestamp: () => timestamp,
    });
    return mutationResponse(
      data.organizerId, next.revision, data.grantId, false);
  });
}

function replayIfMatching(
  receiptSnap: FirebaseFirestore.DocumentSnapshot,
  contentHash: string,
  organizerId: string,
  nowMillis: number
): OrganizerEntitlementMutationCallableResponse | null {
  const lookup = classifyCommandReceiptData<{
    resultRevision?: number;
    grantId?: string;
  }>(receiptSnap.data(), {
    command: receiptCommand, requestHash: contentHash, nowMillis,
  });
  if (lookup.kind === "none") return null;
  const result = lookup.kind === "replay" ? lookup.result : undefined;
  if (typeof result?.resultRevision !== "number" ||
      typeof result.grantId !== "string") {
    throw new HttpsError(
      "failed-precondition",
      "This operation id was already used with a different payload."
    );
  }
  return mutationResponse(
    organizerId, result.resultRevision, result.grantId, true);
}

function mutationResponse(
  organizerId: string,
  revision: number,
  grantId: string,
  replayed: boolean
): OrganizerEntitlementMutationCallableResponse {
  const response: OrganizerEntitlementMutationCallableResponse = {
    schemaVersion: 1,
    organizerId,
    revision,
    grantId,
    replayed,
  };
  if (!validateOrganizerEntitlementMutationCallableResponse(response)) {
    throw new Error("Invalid organizer entitlement mutation response");
  }
  return response;
}

function parseEntitlements(value: unknown): OrganizerEntitlementsDocument {
  if (!validateOrganizerEntitlementsDocument(value)) {
    throw new HttpsError(
      "failed-precondition",
      "The existing organizer entitlements document is invalid."
    );
  }
  return value;
}

function normalizeGrantPayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const data = value as Record<string, unknown>;
  return {
    ...data,
    organizerId: trimmed(data.organizerId),
    operationId: trimmed(data.operationId),
    sku: trimmed(data.sku),
    unit: trimmed(data.unit),
    source: trimmed(data.source),
    ...(Object.hasOwn(data, "receiptRef") ?
      {receiptRef: trimmed(data.receiptRef)} : {}),
    ...(Object.hasOwn(data, "note") ? {note: trimmed(data.note)} : {}),
  };
}

function normalizeRevokePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  const data = value as Record<string, unknown>;
  return {
    ...data,
    organizerId: trimmed(data.organizerId),
    operationId: trimmed(data.operationId),
    grantId: trimmed(data.grantId),
    reason: trimmed(data.reason),
  };
}

function assertClock(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Invalid organizer entitlement clock");
  }
}

function assertMillis(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new HttpsError(
      "invalid-argument",
      `${field} must be non-negative safe milliseconds.`
    );
  }
}

function trimmed(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export const adminGrantOrganizerEntitlement = callable(
  adminGrantOrganizerEntitlementSpec());

export const adminRevokeOrganizerEntitlementGrant = callable(
  adminRevokeOrganizerEntitlementGrantSpec());
