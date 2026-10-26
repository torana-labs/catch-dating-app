import {onCall, CallableRequest} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {AdminDecideOrganizerIntakeCallablePayload} from
  "../shared/generated/adminDecideOrganizerIntakeCallablePayload";
import type {OrganizerIntakeReviewDecisionDocument} from
  "../shared/generated/organizerIntakeReviewDecisionDocument";
import {
  validateAdminDecideOrganizerIntakeCallablePayload,
} from
  "../shared/generated/validators/adminDecideOrganizerIntakeInput";
import {validateCallableWithAjv} from "../shared/validation";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {requireAdminRole} from "./adminAuth";
import {setAdminAuditLogInTransaction} from "./adminAudit";
import {
  assertOrganizerVisibilityDecisionAllowed,
  SupplyAppVisibility,
  SupplyIndexStatus,
  SupplyPublishStatus,
  SupplyVisibilityControls,
} from "./supplyVisibilityPolicy";

const organizerIntakeRoles = ["admin", "adminOwner", "support"] as const;
const decisionCollection = "organizerIntakeReviewDecisions";

interface OrganizerIntakeDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: OrganizerIntakeDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  checkRateLimit: defaultCheckRateLimit,
};

type OrganizerIntakeDecision =
  AdminDecideOrganizerIntakeCallablePayload["decision"];
export interface AdminDecideOrganizerIntakeResponse {
  entityId: string;
  decision: OrganizerIntakeDecision;
  decisionStatus: OrganizerIntakeReviewDecisionDocument["decisionStatus"];
  publishStatus: OrganizerIntakeReviewDecisionDocument["publishStatus"];
  indexStatus: OrganizerIntakeReviewDecisionDocument["indexStatus"];
  appVisibility: OrganizerIntakeReviewDecisionDocument["appVisibility"];
  decisionPath: string;
  projectionState: OrganizerIntakeReviewDecisionDocument["projectionState"];
}

/**
 * Records the latest manual admin decision for an organizer-intake candidate.
 * Candidate evidence stays in operationRuns/operationWorkItems; this stores
 * only the low-volume review decision needed by publication workflows.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {OrganizerIntakeDeps} deps Injectable dependencies.
 * @return {Promise<AdminDecideOrganizerIntakeResponse>} Persisted decision.
 */
export async function adminDecideOrganizerIntakeHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerIntakeDeps = defaultDeps
): Promise<AdminDecideOrganizerIntakeResponse> {
  const adminContext = requireAdminRole(request, organizerIntakeRoles);
  const data =
    validateCallableWithAjv<AdminDecideOrganizerIntakeCallablePayload>(
      request,
      validateAdminDecideOrganizerIntakeCallablePayload,
      normalizeAdminDecideOrganizerIntakePayload
    );
  assertDecisionAllowed(data);

  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminDecideOrganizerIntake",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const decisionRef = db.collection(decisionCollection).doc(data.entityId);
  const organizerRef = db.collection("organizers").doc(data.entityId);
  const timestamp = deps.serverTimestamp();
  const decisionStatus = decisionStatusFor(data.decision);
  const projectionState = data.decision === "approve_public" ?
    "pending_static_generation" :
    "not_projectable";
  const decisionDoc: OrganizerIntakeReviewDecisionDocument = {
    schemaVersion: 1,
    entityId: data.entityId,
    decision: data.decision,
    decisionStatus,
    publishStatus: data.publishStatus,
    indexStatus: data.indexStatus,
    appVisibility: data.appVisibility,
    checklist: data.checklist,
    note: data.note,
    reviewedByUid: adminContext.uid,
    reviewedAt: timestamp as unknown as
      OrganizerIntakeReviewDecisionDocument["reviewedAt"],
    updatedAt: timestamp as unknown as
      OrganizerIntakeReviewDecisionDocument["updatedAt"],
    projectionState,
  };

  await db.runTransaction(async (tx) => {
    const [beforeSnap, organizerSnap] = await Promise.all([
      tx.get(decisionRef),
      tx.get(organizerRef),
    ]);
    assertDecisionAllowed(data, currentOrganizerVisibility(organizerSnap));
    tx.set(decisionRef, decisionDoc, {merge: true});
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminDecideOrganizerIntake",
      targetPath: decisionRef.path,
      request,
      before: beforeSnap.exists ? beforeSnap.data() ?? {} : {},
      after: {
        entityId: data.entityId,
        decision: data.decision,
        decisionStatus,
        publishStatus: data.publishStatus,
        indexStatus: data.indexStatus,
        appVisibility: data.appVisibility,
        projectionState,
      },
      note: data.note,
      serverTimestamp: deps.serverTimestamp,
    });
  });

  return {
    entityId: data.entityId,
    decision: data.decision,
    decisionStatus,
    publishStatus: data.publishStatus,
    indexStatus: data.indexStatus,
    appVisibility: data.appVisibility,
    decisionPath: decisionRef.path,
    projectionState,
  };
}

/**
 * Applies string trimming before schema validation.
 * @param {unknown} value Raw payload.
 * @return {unknown} Normalized payload.
 */
function normalizeAdminDecideOrganizerIntakePayload(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const data = value as Record<string, unknown>;
  return {
    ...data,
    entityId: normalizeString(data.entityId),
    decision: normalizeString(data.decision),
    publishStatus: normalizeString(data.publishStatus),
    indexStatus: normalizeString(data.indexStatus),
    appVisibility: normalizeString(data.appVisibility),
    note: normalizeString(data.note),
  };
}

/**
 * Enforces product review guardrails that JSON Schema cannot express.
 * @param {AdminDecideOrganizerIntakeCallablePayload} data Validated payload.
 */
function assertDecisionAllowed(
  data: AdminDecideOrganizerIntakeCallablePayload,
  current: {
    claimed: boolean;
    controls: SupplyVisibilityControls;
  } | null = null
) {
  assertOrganizerVisibilityDecisionAllowed({
    decision: data.decision,
    publishStatus: data.publishStatus,
    indexStatus: data.indexStatus,
    appVisibility: data.appVisibility,
    checklist: data.checklist,
  }, current);
}

/**
 * Maps admin decisions to stable decision states.
 * @param {OrganizerIntakeDecision} decision Admin decision.
 * @return {OrganizerIntakeReviewDecisionDocument["decisionStatus"]} State.
 */
function decisionStatusFor(
  decision: OrganizerIntakeDecision
): OrganizerIntakeReviewDecisionDocument["decisionStatus"] {
  if (decision === "approve_public") return "approved_public";
  if (decision === "hold") return "held";
  return "suppressed";
}

/**
 * Reads the current canonical surface ceiling for claimed-organizer guards.
 * Missing organizers are allowed because intake decisions can precede the
 * canonical draft handoff.
 * @param {FirebaseFirestore.DocumentSnapshot} snapshot Organizer snapshot.
 * @return {{claimed: boolean, controls: SupplyVisibilityControls} | null}
 * Current visibility, or null when no organizer exists yet.
 */
function currentOrganizerVisibility(
  snapshot: FirebaseFirestore.DocumentSnapshot
): {claimed: boolean; controls: SupplyVisibilityControls} | null {
  if (!snapshot.exists) return null;
  const data = snapshot.data() ?? {};
  const ownership = data.ownership as Record<string, unknown> | undefined;
  const claim = data.claim as Record<string, unknown> | undefined;
  const publicPage = data.publicPage as Record<string, unknown> | undefined;
  return {
    claimed:
      ownership?.state === "claimed" ||
      ownership?.state === "transferred" ||
      claim?.state === "claimed" ||
      claim?.state === "verified",
    controls: {
      publishStatus: normalizePublishStatus(publicPage?.publishStatus),
      indexStatus: normalizeIndexStatus(publicPage?.indexStatus),
      appVisibility: normalizeAppVisibility(data.appVisibility),
    },
  };
}

function normalizePublishStatus(value: unknown): SupplyPublishStatus {
  if (value === "published") return "published";
  if (value === "suppressed" || value === "removed") return "suppressed";
  return "draft";
}

function normalizeIndexStatus(value: unknown): SupplyIndexStatus {
  return value === "indexed" ? "indexed" : "noindex";
}

function normalizeAppVisibility(value: unknown): SupplyAppVisibility {
  return value === "discoverable" ? "discoverable" : "hidden";
}

/**
 * Trims string payload fields.
 * @param {unknown} value Raw value.
 * @return {unknown} Trimmed value.
 */
function normalizeString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export const adminDecideOrganizerIntake = onCall(
  appCheckCallableOptions,
  (request) => adminDecideOrganizerIntakeHandler(request)
);
