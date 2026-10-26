import crypto from "node:crypto";
import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {AdminResolveOrganizerEventLocationCallablePayload} from
  "../shared/generated/adminResolveOrganizerEventLocationCallablePayload";
import type {OrganizerEventLocationResolutionDecisionDocument} from
  "../shared/generated/organizerEventLocationResolutionDecisionDocument";
import {
  validateAdminResolveOrganizerEventLocationCallablePayload,
} from
  "../shared/generated/validators/adminResolveOrganizerEventLocationInput";
import {validateCallableWithAjv} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireAdminRole} from "./adminAuth";
import {setAdminAuditLogInTransaction} from "./adminAudit";

const organizerIntakeRoles = ["admin", "adminOwner", "support"] as const;
const decisionCollection = "organizerEventLocationResolutionDecisions";

interface OrganizerEventLocationResolutionDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: OrganizerEventLocationResolutionDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

type ResolvedLocation =
  AdminResolveOrganizerEventLocationCallablePayload["location"];

export interface AdminResolveOrganizerEventLocationResponse {
  candidateId: string;
  resolutionId: string;
  resolutionStatus:
    OrganizerEventLocationResolutionDecisionDocument["resolutionStatus"];
  decisionPath: string;
  location: ResolvedLocation;
}

/**
 * Records an admin-reviewed exact location for an external event candidate.
 * This does not import the event or enable provider lookups; it only stores
 * manually reviewed coordinates that local import planning can consume.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OrganizerEventLocationResolutionDeps} deps Injectable dependencies.
 * @return {Promise<AdminResolveOrganizerEventLocationResponse>} Resolution.
 */
export async function adminResolveOrganizerEventLocationHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerEventLocationResolutionDeps = defaultDeps
): Promise<AdminResolveOrganizerEventLocationResponse> {
  const adminContext = requireAdminRole(request, organizerIntakeRoles);
  const data =
    validateCallableWithAjv<AdminResolveOrganizerEventLocationCallablePayload>(
      request,
      validateAdminResolveOrganizerEventLocationCallablePayload,
      normalizeAdminResolveOrganizerEventLocationPayload
    );
  assertResolutionAllowed(data);

  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminResolveOrganizerEventLocation",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const resolutionId = resolutionIdForCandidate(data.candidateId);
  const decisionRef = db.collection(decisionCollection).doc(resolutionId);
  const timestamp = deps.serverTimestamp();
  const decisionDoc: OrganizerEventLocationResolutionDecisionDocument = {
    schemaVersion: 1,
    resolutionId,
    candidateId: data.candidateId,
    location: data.location,
    checklist: data.checklist,
    note: data.note,
    reviewedByUid: adminContext.uid,
    reviewedAt: timestamp as unknown as
      OrganizerEventLocationResolutionDecisionDocument["reviewedAt"],
    updatedAt: timestamp as unknown as
      OrganizerEventLocationResolutionDecisionDocument["updatedAt"],
    resolutionStatus: "resolved",
  };

  await db.runTransaction(async (tx) => {
    const beforeSnap = await tx.get(decisionRef);
    tx.set(decisionRef, decisionDoc, {merge: true});
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminResolveOrganizerEventLocation",
      targetPath: decisionRef.path,
      request,
      before: beforeSnap.exists ? beforeSnap.data() ?? {} : {},
      after: {
        candidateId: data.candidateId,
        resolutionId,
        resolutionStatus: "resolved",
        location: data.location,
      },
      note: data.note,
      serverTimestamp: deps.serverTimestamp,
    });
  });

  return {
    candidateId: data.candidateId,
    resolutionId,
    resolutionStatus: "resolved",
    decisionPath: decisionRef.path,
    location: data.location,
  };
}

/**
 * Applies string trimming before schema validation.
 * @param {unknown} value Raw payload.
 * @return {unknown} Normalized payload.
 */
function normalizeAdminResolveOrganizerEventLocationPayload(
  value: unknown
): unknown {
  if (!value || typeof value !== "object") return value;
  const data = value as Record<string, unknown>;
  if (!data.location || typeof data.location !== "object") {
    return {
      ...data,
      candidateId: normalizeString(data.candidateId),
      note: normalizeString(data.note),
    };
  }
  const location = data.location as Record<string, unknown>;
  return {
    ...data,
    candidateId: normalizeString(data.candidateId),
    note: normalizeString(data.note),
    location: {
      ...location,
      name: normalizeString(location.name),
      address: nullableString(location.address),
      placeId: nullableString(location.placeId),
      notes: nullableString(location.notes),
    },
  };
}

/**
 * Enforces manual location review guardrails that JSON Schema cannot express.
 * @param {AdminResolveOrganizerEventLocationCallablePayload} data Payload.
 */
function assertResolutionAllowed(
  data: AdminResolveOrganizerEventLocationCallablePayload
) {
  if (!resolutionChecklistComplete(data.checklist)) {
    throw new HttpsError(
      "failed-precondition",
      "Source location, coordinates, place identity, and import safety " +
        "checks must be complete before storing event coordinates."
    );
  }
  if (typeof data.location.latitude !== "number" ||
    typeof data.location.longitude !== "number") {
    throw new HttpsError(
      "failed-precondition",
      "Exact latitude and longitude are required before marking a location " +
        "resolved."
    );
  }
}

/**
 * Returns whether every location-resolution checklist field was reviewed.
 * @param {AdminResolveOrganizerEventLocationCallablePayload["checklist"]}
 * checklist Admin checklist.
 * @return {boolean} True when complete.
 */
function resolutionChecklistComplete(
  checklist: AdminResolveOrganizerEventLocationCallablePayload["checklist"]
): boolean {
  return checklist.sourceLocationReviewed &&
    checklist.coordinatesReviewed &&
    checklist.placeIdentityReviewed &&
    checklist.importSafetyReviewed;
}

/**
 * Builds a Firestore-safe document id while preserving candidateId in the doc.
 * @param {string} candidateId External event candidate id.
 * @return {string} Resolution document id.
 */
export function resolutionIdForCandidate(candidateId: string): string {
  const slug = candidateId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "candidate";
  const base = `loc-${slug}`;
  if (base.length <= 150) return base;
  const hash = crypto
    .createHash("sha256")
    .update(candidateId)
    .digest("hex")
    .slice(0, 12);
  return `${base.slice(0, 137).replace(/-+$/g, "")}-${hash}`;
}

/**
 * Trims string payload fields.
 * @param {unknown} value Raw value.
 * @return {unknown} Trimmed value.
 */
function normalizeString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

/**
 * Trims nullable string payload fields and preserves omitted values.
 * @param {unknown} value Raw value.
 * @return {unknown} Trimmed value.
 */
function nullableString(value: unknown): unknown {
  if (value === undefined || value === null) return value;
  return normalizeString(value);
}

export const adminResolveOrganizerEventLocation = onCall(
  appCheckCallableOptions,
  (request) => adminResolveOrganizerEventLocationHandler(request)
);
