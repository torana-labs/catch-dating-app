import crypto from "node:crypto";
import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {AdminRecordEventIntakeReviewDecisionCallablePayload} from
  "../shared/generated/adminRecordEventIntakeReviewDecisionCallablePayload";
import type {EventIntakeReviewDecisionDocument} from
  "../shared/generated/eventIntakeReviewDecisionDocument";
import {
  validateAdminRecordEventIntakeReviewDecisionCallablePayload,
} from
  "../shared/generated/validators/adminRecordEventIntakeReviewDecisionInput";
import {validateCallableWithAjv} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireAdminRole} from "./adminAuth";
import {setAdminAuditLogInTransaction} from "./adminAudit";

const eventIntakeRoles = ["admin", "adminOwner", "support"] as const;
const decisionCollection = "eventIntakeReviewDecisions";

interface EventIntakeReviewDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: EventIntakeReviewDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

type EventIntakeDecision =
  AdminRecordEventIntakeReviewDecisionCallablePayload["decision"];
type EventIntakeTargetType =
  AdminRecordEventIntakeReviewDecisionCallablePayload["targetType"];

export interface AdminRecordEventIntakeReviewDecisionResponse {
  decisionId: string;
  targetType: EventIntakeTargetType;
  targetId: string;
  decision: EventIntakeDecision;
  decisionStatus: EventIntakeReviewDecisionDocument["decisionStatus"];
  decisionPath: string;
}

/**
 * Records a manual admin review decision for one private event-intake object.
 * This is a decision/audit write only; it does not publish marketing content,
 * import external events, or create canonical Firestore events.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {EventIntakeReviewDeps} deps Injectable dependencies.
 * @return {Promise<AdminRecordEventIntakeReviewDecisionResponse>} Decision.
 */
export async function adminRecordEventIntakeReviewDecisionHandler(
  request: CallableRequest<unknown>,
  deps: EventIntakeReviewDeps = defaultDeps
): Promise<AdminRecordEventIntakeReviewDecisionResponse> {
  const adminContext = requireAdminRole(request, eventIntakeRoles);
  const data =
    validateCallableWithAjv<
      AdminRecordEventIntakeReviewDecisionCallablePayload
    >(
      request,
      validateAdminRecordEventIntakeReviewDecisionCallablePayload,
      normalizeAdminRecordEventIntakeReviewDecisionPayload
    );
  assertDecisionAllowed(data);
  assertPayloadSize(data);

  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminRecordEventIntakeReviewDecision",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const decisionId = decisionIdForEventIntakeTarget(
    data.targetType,
    data.targetId
  );
  const decisionRef = db.collection(decisionCollection).doc(decisionId);
  const timestamp = deps.serverTimestamp();
  const decisionStatus = decisionStatusFor(data.decision);
  const decisionDoc: EventIntakeReviewDecisionDocument = {
    schemaVersion: 1,
    decisionId,
    targetType: data.targetType,
    targetId: data.targetId,
    decision: data.decision,
    decisionStatus,
    runId: data.runId ?? null,
    note: data.note,
    checklist: data.checklist,
    edits: sanitizeForFirestore(
      data.edits ?? {}
    ) as EventIntakeReviewDecisionDocument["edits"],
    reviewedByUid: adminContext.uid,
    reviewedAt: timestamp as unknown as
      EventIntakeReviewDecisionDocument["reviewedAt"],
    updatedAt: timestamp as unknown as
      EventIntakeReviewDecisionDocument["updatedAt"],
    effect: "decision_only_no_publish",
  };

  await db.runTransaction(async (tx) => {
    const beforeSnap = await tx.get(decisionRef);
    tx.set(decisionRef, decisionDoc, {merge: true});
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminRecordEventIntakeReviewDecision",
      targetPath: decisionRef.path,
      request,
      before: beforeSnap.exists ? beforeSnap.data() ?? {} : {},
      after: {
        targetType: data.targetType,
        targetId: data.targetId,
        decision: data.decision,
        decisionStatus,
        runId: data.runId ?? null,
        effect: "decision_only_no_publish",
      },
      note: data.note,
      serverTimestamp: deps.serverTimestamp,
    });
  });

  return {
    decisionId,
    targetType: data.targetType,
    targetId: data.targetId,
    decision: data.decision,
    decisionStatus,
    decisionPath: decisionRef.path,
  };
}

/**
 * Applies string trimming before schema validation.
 * @param {unknown} value Raw payload.
 * @return {unknown} Normalized payload.
 */
function normalizeAdminRecordEventIntakeReviewDecisionPayload(
  value: unknown
): unknown {
  if (!value || typeof value !== "object") return value;
  const data = value as Record<string, unknown>;
  return {
    ...data,
    targetType: normalizeString(data.targetType),
    targetId: normalizeString(data.targetId),
    decision: normalizeString(data.decision),
    runId: normalizeNullableString(data.runId),
    note: normalizeString(data.note),
    edits: plainRecord(data.edits),
    checklist: plainRecord(data.checklist),
  };
}

/**
 * Enforces event-intake review guardrails that JSON Schema cannot express.
 * @param {AdminRecordEventIntakeReviewDecisionCallablePayload} data Payload.
 */
function assertDecisionAllowed(
  data: AdminRecordEventIntakeReviewDecisionCallablePayload
): void {
  if (data.decision !== "approve") return;
  const checklist = data.checklist;
  if (!checklist.noCatchHostingImplied) {
    throw new HttpsError(
      "failed-precondition",
      "Approval requires confirming the copy does not imply Catch hosts " +
        "third-party events."
    );
  }
  if (data.targetType === "event_candidate" &&
    (!checklist.sourceReviewed ||
      !checklist.dateReviewed ||
      !checklist.venueReviewed)) {
    throw new HttpsError(
      "failed-precondition",
      "Event candidate approval requires source, date, and venue review."
    );
  }
  if (
    (data.targetType === "source_profile" ||
      data.targetType === "source_result") &&
    !checklist.sourceReviewed
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Event intake source approval requires source review."
    );
  }
}

/**
 * Bounds editable-review payload size before Firestore writes.
 * @param {AdminRecordEventIntakeReviewDecisionCallablePayload} data Payload.
 */
function assertPayloadSize(
  data: AdminRecordEventIntakeReviewDecisionCallablePayload
): void {
  if (JSON.stringify(data.edits ?? {}).length > 50000) {
    throw new HttpsError("invalid-argument", "Edited payload is too large.");
  }
}

/**
 * Maps review decisions to stable states.
 * @param {EventIntakeDecision} decision Decision.
 * @return {EventIntakeReviewDecisionDocument["decisionStatus"]} Status.
 */
function decisionStatusFor(
  decision: EventIntakeDecision
): EventIntakeReviewDecisionDocument["decisionStatus"] {
  if (decision === "approve") return "approved";
  if (decision === "hold") return "held";
  if (decision === "reject") return "rejected";
  return "needs_changes";
}

/**
 * Builds a Firestore-safe document id while preserving target id in the doc.
 * @param {EventIntakeTargetType} targetType Target type.
 * @param {string} targetId Event-intake target id.
 * @return {string} Decision document id.
 */
export function decisionIdForEventIntakeTarget(
  targetType: EventIntakeTargetType,
  targetId: string
): string {
  const slug = `${targetType}-${targetId}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "target";
  const base = `event-intake-${slug}`;
  if (base.length <= 150) return base;
  const hash = crypto
    .createHash("sha256")
    .update(`${targetType}:${targetId}`)
    .digest("hex")
    .slice(0, 12);
  return `${base.slice(0, 137).replace(/-+$/g, "")}-${hash}`;
}

/**
 * Removes values Firestore rejects.
 * @param {Record<string, unknown>} value Raw record.
 * @return {Record<string, unknown>} Sanitized record.
 */
function sanitizeForFirestore(
  value: Record<string, unknown>
): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

/**
 * Returns plain object payload fields and drops non-object values.
 * @param {unknown} value Raw value.
 * @return {Record<string, unknown>} Plain record.
 */
function plainRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
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
 * Trims optional nullable string payload fields.
 * @param {unknown} value Raw value.
 * @return {unknown} Trimmed nullable value.
 */
function normalizeNullableString(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  return normalizeString(value);
}

export const adminRecordEventIntakeReviewDecision = onCall(
  appCheckCallableOptions,
  (request) => adminRecordEventIntakeReviewDecisionHandler(request)
);
