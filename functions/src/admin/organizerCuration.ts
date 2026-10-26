import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {AdminRecordOrganizerCurationCallablePayload} from
  "../shared/generated/adminRecordOrganizerCurationCallablePayload";
import type {OrganizerIntakeCurationDecisionDocument} from
  "../shared/generated/organizerIntakeCurationDecisionDocument";
import {
  validateAdminRecordOrganizerCurationCallablePayload,
} from
  "../shared/generated/validators/adminRecordOrganizerCurationInput";
import {validateCallableWithAjv} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireAdminRole} from "./adminAuth";
import {setAdminAuditLogInTransaction} from "./adminAudit";

const organizerIntakeRoles = ["admin", "adminOwner", "support"] as const;
const curationCollection = "organizerIntakeCurationDecisions";

interface OrganizerCurationDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: OrganizerCurationDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

type OrganizerCurationPayload = AdminRecordOrganizerCurationCallablePayload;

export interface AdminRecordOrganizerCurationResponse {
  operationId: string;
  operationType: OrganizerCurationPayload["operationType"];
  operationStatus:
    OrganizerIntakeCurationDecisionDocument["operationStatus"];
  decisionPath: string;
}

/**
 * Records one durable manual organizer-intake curation operation.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OrganizerCurationDeps} deps Injectable dependencies.
 * @return {Promise<AdminRecordOrganizerCurationResponse>} Persisted operation.
 */
export async function adminRecordOrganizerCurationHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerCurationDeps = defaultDeps
): Promise<AdminRecordOrganizerCurationResponse> {
  const adminContext = requireAdminRole(request, organizerIntakeRoles);
  const data =
    validateCallableWithAjv<AdminRecordOrganizerCurationCallablePayload>(
      request,
      validateAdminRecordOrganizerCurationCallablePayload,
      normalizeAdminRecordOrganizerCurationPayload
    );
  assertCurationOperationAllowed(data);

  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminRecordOrganizerCuration",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const operationId = data.operationId ?? generatedOperationId(data);
  const operationRef = db.collection(curationCollection).doc(operationId);
  const timestamp = deps.serverTimestamp();
  const operationDoc = pruneUndefined({
    schemaVersion: 1,
    operationId,
    operationType: data.operationType,
    operationStatus: "active",
    ...operationFields(data),
    reason: data.reason,
    reviewedByUid: adminContext.uid,
    reviewedAt: timestamp as unknown as
      OrganizerIntakeCurationDecisionDocument["reviewedAt"],
    updatedAt: timestamp as unknown as
      OrganizerIntakeCurationDecisionDocument["updatedAt"],
  }) as unknown as OrganizerIntakeCurationDecisionDocument;

  await db.runTransaction(async (tx) => {
    const beforeSnap = await tx.get(operationRef);
    tx.set(operationRef, operationDoc, {merge: true});
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminRecordOrganizerCuration",
      targetPath: operationRef.path,
      request,
      before: beforeSnap.exists ? beforeSnap.data() ?? {} : {},
      after: {
        operationId,
        operationType: data.operationType,
        operationStatus: "active",
      },
      note: data.reason,
      serverTimestamp: deps.serverTimestamp,
    });
  });

  return {
    operationId,
    operationType: data.operationType,
    operationStatus: "active",
    decisionPath: operationRef.path,
  };
}

/**
 * Applies string trimming before schema validation.
 * @param {unknown} value Raw payload.
 * @return {unknown} Normalized payload.
 */
function normalizeAdminRecordOrganizerCurationPayload(
  value: unknown
): unknown {
  if (!value || typeof value !== "object") return value;
  return normalizeStringFields(value);
}

/**
 * Enforces operation-specific constraints that JSON Schema does not encode.
 * @param {OrganizerCurationPayload} data Validated payload.
 */
function assertCurationOperationAllowed(data: OrganizerCurationPayload) {
  if (data.operationType === "attach_surface") {
    requireField(data.entityId, "entityId", data.operationType);
    requireField(
      data.sourceCandidateId,
      "sourceCandidateId",
      data.operationType
    );
    if (!data.surface) {
      throw missingFieldError("surface", data.operationType);
    }
    if (data.surface.crawl.eventDiscoveryStatus !== "disabled") {
      throw new HttpsError(
        "failed-precondition",
        "Organizer curation cannot enable recurring crawl; crawl policy is " +
          "disabled until the crawler budget and platform policy are approved."
      );
    }
    return;
  }
  if (data.operationType === "merge_entity") {
    requireField(data.sourceEntityId, "sourceEntityId", data.operationType);
    requireField(data.targetEntityId, "targetEntityId", data.operationType);
    if (data.sourceEntityId === data.targetEntityId) {
      throw new HttpsError(
        "invalid-argument",
        "merge_entity requires distinct source and target entities."
      );
    }
    return;
  }
  if (data.operationType === "suppress_entity") {
    requireField(data.entityId, "entityId", data.operationType);
    return;
  }
  if (data.operationType === "surface_decision") {
    requireField(data.entityId, "entityId", data.operationType);
    requireField(data.surfaceId, "surfaceId", data.operationType);
    requireField(data.decision, "decision", data.operationType);
    return;
  }
  if (data.operationType === "split_surface") {
    requireField(data.entityId, "entityId", data.operationType);
    requireField(data.surfaceId, "surfaceId", data.operationType);
    requireField(data.newEntityId, "newEntityId", data.operationType);
  }
}

/**
 * Returns the operation-specific fields for Firestore storage.
 * @param {OrganizerCurationPayload} data Validated payload.
 * @return {Partial<OrganizerIntakeCurationDecisionDocument>} Persisted fields.
 */
function operationFields(
  data: OrganizerCurationPayload
): Partial<OrganizerIntakeCurationDecisionDocument> {
  if (data.operationType === "attach_surface") {
    return {
      entityId: data.entityId,
      sourceCandidateId: data.sourceCandidateId,
      surfaceId: data.surface?.surfaceId,
      surface: data.surface,
    };
  }
  if (data.operationType === "merge_entity") {
    return {
      sourceEntityId: data.sourceEntityId,
      targetEntityId: data.targetEntityId,
    };
  }
  if (data.operationType === "suppress_entity") {
    return {entityId: data.entityId};
  }
  if (data.operationType === "surface_decision") {
    return {
      entityId: data.entityId,
      surfaceId: data.surfaceId,
      decision: data.decision,
    };
  }
  return {
    entityId: data.entityId,
    surfaceId: data.surfaceId,
    newEntityId: data.newEntityId,
  };
}

/**
 * Builds a stable operation id so repeated admin clicks overwrite the same op.
 * @param {OrganizerCurationPayload} data Validated payload.
 * @return {string} Stable Firestore document id.
 */
function generatedOperationId(data: OrganizerCurationPayload): string {
  if (data.operationType === "attach_surface") {
    return docId([
      "attach",
      data.entityId,
      data.surface?.surfaceId ?? data.sourceCandidateId,
    ]);
  }
  if (data.operationType === "merge_entity") {
    return docId(["merge", data.sourceEntityId, "to", data.targetEntityId]);
  }
  if (data.operationType === "suppress_entity") {
    return docId(["suppress", data.entityId]);
  }
  if (data.operationType === "surface_decision") {
    return docId([
      "surface",
      data.entityId,
      data.surfaceId,
      data.decision,
    ]);
  }
  return docId([
    "split",
    data.entityId,
    data.surfaceId,
    "to",
    data.newEntityId,
  ]);
}

/**
 * Checks that an operation-specific string field is present.
 * @param {string|undefined} value Field value.
 * @param {string} field Field name.
 * @param {OrganizerCurationPayload["operationType"]} operation Operation type.
 */
function requireField(
  value: string | undefined,
  field: string,
  operation: OrganizerCurationPayload["operationType"]
) {
  if (!value) throw missingFieldError(field, operation);
}

/**
 * Builds a consistent callable validation error.
 * @param {string} field Field name.
 * @param {OrganizerCurationPayload["operationType"]} operation Operation type.
 * @return {HttpsError} Callable error.
 */
function missingFieldError(
  field: string,
  operation: OrganizerCurationPayload["operationType"]
): HttpsError {
  return new HttpsError(
    "invalid-argument",
    `${operation} requires ${field}.`
  );
}

/**
 * Recursively trims string fields.
 * @param {unknown} value Raw value.
 * @return {unknown} Normalized value.
 */
function normalizeStringFields(value: unknown): unknown {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(normalizeStringFields);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      normalizeStringFields(nested),
    ])
  );
}

/**
 * Removes undefined fields before writing to Firestore.
 * @param {Record<string, unknown>} value Object with possible undefined values.
 * @return {Record<string, unknown>} Object without undefined values.
 */
function pruneUndefined(
  value: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, nested]) => nested !== undefined)
  );
}

/**
 * Produces a document-id-safe slug from operation parts.
 * @param {Array<string|undefined>} parts Operation id parts.
 * @return {string} Document id.
 */
function docId(parts: Array<string | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part))
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

export const adminRecordOrganizerCuration = onCall(
  appCheckCallableOptions,
  (request) => adminRecordOrganizerCurationHandler(request)
);
