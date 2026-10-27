import crypto from "node:crypto";
import {onCall, CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {AdminDecideOrganizerPolicyGapCallablePayload} from
  "../shared/generated/adminDecideOrganizerPolicyGapCallablePayload";
import type {OrganizerPolicyGapReviewDecisionDocument} from
  "../shared/generated/organizerPolicyGapReviewDecisionDocument";
import {
  validateAdminDecideOrganizerPolicyGapCallablePayload,
} from
  "../shared/generated/validators/adminDecideOrganizerPolicyGapInput";
import {validateCallableWithAjv} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireAdminRole} from "./adminAuth";
import {setAdminAuditLogInTransaction} from "./adminAudit";

const organizerIntakeRoles = ["admin", "adminOwner", "support"] as const;
const decisionCollection = "organizerPolicyGapReviewDecisions";

interface OrganizerPolicyGapDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: OrganizerPolicyGapDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

type OrganizerPolicyGapDecision =
  AdminDecideOrganizerPolicyGapCallablePayload["decision"];
type OrganizerPolicyGapChecklist =
  AdminDecideOrganizerPolicyGapCallablePayload["checklist"];

export interface AdminDecideOrganizerPolicyGapResponse {
  gapId: string;
  decisionId: string;
  decision: OrganizerPolicyGapDecision;
  decisionStatus:
    OrganizerPolicyGapReviewDecisionDocument["decisionStatus"];
  decisionPath: string;
  operationalState:
    OrganizerPolicyGapReviewDecisionDocument["operationalState"];
}

/**
 * Records the latest manual product/admin decision for a policy gap. This is a
 * review bridge only; accepted policy decisions remain blocked until the
 * owning implementation or configuration is explicitly encoded and checked.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OrganizerPolicyGapDeps} deps Injectable dependencies.
 * @return {Promise<AdminDecideOrganizerPolicyGapResponse>} Decision.
 */
export async function adminDecideOrganizerPolicyGapHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerPolicyGapDeps = defaultDeps
): Promise<AdminDecideOrganizerPolicyGapResponse> {
  const adminContext = requireAdminRole(request, organizerIntakeRoles);
  const data =
    validateCallableWithAjv<AdminDecideOrganizerPolicyGapCallablePayload>(
      request,
      validateAdminDecideOrganizerPolicyGapCallablePayload,
      normalizeAdminDecideOrganizerPolicyGapPayload
    );
  assertDecisionAllowed(data);

  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminDecideOrganizerPolicyGap",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const decisionId = decisionIdForPolicyGap(data.gapId);
  const decisionRef = db.collection(decisionCollection).doc(decisionId);
  const timestamp = deps.serverTimestamp();
  const decisionStatus = decisionStatusFor(data.decision);
  const operationalState = operationalStateFor(data.decision);
  const decisionDoc: OrganizerPolicyGapReviewDecisionDocument = {
    schemaVersion: 1,
    decisionId,
    gapId: data.gapId,
    decision: data.decision,
    decisionStatus,
    requiredInputsReviewed: data.requiredInputsReviewed,
    checklist: data.checklist,
    note: data.note,
    reviewedByUid: adminContext.uid,
    reviewedAt: timestamp as unknown as
      OrganizerPolicyGapReviewDecisionDocument["reviewedAt"],
    updatedAt: timestamp as unknown as
      OrganizerPolicyGapReviewDecisionDocument["updatedAt"],
    operationalState,
  };

  await db.runTransaction(async (tx) => {
    const beforeSnap = await tx.get(decisionRef);
    tx.set(decisionRef, decisionDoc, {merge: true});
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminDecideOrganizerPolicyGap",
      targetPath: decisionRef.path,
      request,
      before: beforeSnap.exists ? beforeSnap.data() ?? {} : {},
      after: {
        gapId: data.gapId,
        decisionId,
        decision: data.decision,
        decisionStatus,
        operationalState,
      },
      note: data.note,
      serverTimestamp: deps.serverTimestamp,
    });
  });

  return {
    gapId: data.gapId,
    decisionId,
    decision: data.decision,
    decisionStatus,
    decisionPath: decisionRef.path,
    operationalState,
  };
}

/**
 * Applies string trimming before schema validation.
 * @param {unknown} value Raw payload.
 * @return {unknown} Normalized payload.
 */
function normalizeAdminDecideOrganizerPolicyGapPayload(
  value: unknown
): unknown {
  if (!value || typeof value !== "object") return value;
  const data = value as Record<string, unknown>;
  const requiredInputsReviewed = Array.isArray(data.requiredInputsReviewed) ?
    [...new Set(data.requiredInputsReviewed
      .map((entry) => normalizeString(entry))
      .filter((entry): entry is string =>
        typeof entry === "string" && entry.length > 0
      ))].sort() :
    data.requiredInputsReviewed;
  return {
    ...data,
    gapId: normalizeString(data.gapId),
    decision: normalizeString(data.decision),
    note: normalizeString(data.note),
    requiredInputsReviewed,
  };
}

/**
 * Enforces manual review guardrails that JSON Schema cannot express.
 * @param {AdminDecideOrganizerPolicyGapCallablePayload} data Payload.
 */
function assertDecisionAllowed(
  data: AdminDecideOrganizerPolicyGapCallablePayload
) {
  if (data.decision !== "accept") return;
  if (data.requiredInputsReviewed.length === 0 ||
    !reviewChecklistComplete(data.checklist)) {
    throw new HttpsError(
      "failed-precondition",
      "Required inputs, cost and safety, implementation ownership, and " +
        "disabled-behavior acknowledgement must be complete before accepting " +
        "a policy gap."
    );
  }
}

/**
 * Maps admin decisions to stable decision states.
 * @param {OrganizerPolicyGapDecision} decision Admin decision.
 * @return {OrganizerPolicyGapReviewDecisionDocument["decisionStatus"]} State.
 */
function decisionStatusFor(
  decision: OrganizerPolicyGapDecision
): OrganizerPolicyGapReviewDecisionDocument["decisionStatus"] {
  if (decision === "accept") return "accepted";
  if (decision === "hold") return "held";
  return "rejected";
}

/**
 * Maps review decisions to operational state. Accepted policies do not enable
 * behavior until the owning planner/config changes separately.
 * @param {OrganizerPolicyGapDecision} decision Admin decision.
 * @return {OrganizerPolicyGapReviewDecisionDocument["operationalState"]}
 * State.
 */
function operationalStateFor(
  decision: OrganizerPolicyGapDecision
): OrganizerPolicyGapReviewDecisionDocument["operationalState"] {
  if (decision === "reject") return "not_approved";
  return "blocked_until_policy_encoded";
}

/**
 * Returns whether every policy acceptance checklist field was reviewed.
 * @param {OrganizerPolicyGapChecklist} checklist Admin checklist.
 * @return {boolean} True when complete.
 */
function reviewChecklistComplete(
  checklist: OrganizerPolicyGapChecklist
): boolean {
  return checklist.requiredInputsReviewed &&
    checklist.costAndSafetyReviewed &&
    checklist.implementationOwnerReviewed &&
    checklist.behaviorStillDisabledAcknowledged;
}

/**
 * Builds a Firestore-safe document id while preserving gapId in the doc.
 * @param {string} gapId Policy gap id.
 * @return {string} Decision document id.
 */
export function decisionIdForPolicyGap(gapId: string): string {
  const slug = gapId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "policy-gap";
  const base = `policy-${slug}`;
  if (base.length <= 150) return base;
  const hash = crypto
    .createHash("sha256")
    .update(gapId)
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

export const adminDecideOrganizerPolicyGap = onCall(
  appCheckCallableOptions,
  (request) => adminDecideOrganizerPolicyGapHandler(request)
);
