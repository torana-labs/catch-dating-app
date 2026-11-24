/* eslint-disable max-len */
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import type {AdminRecommendOrganizerClaimCallablePayload} from "../shared/generated/adminRecommendOrganizerClaimCallablePayload";
import type {AdminRecommendOrganizerClaimCallableResponse} from "../shared/generated/adminRecommendOrganizerClaimCallableResponse";
import {validateAdminRecommendOrganizerClaimCallablePayload} from "../shared/generated/validators/adminRecommendOrganizerClaimInput";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {setAdminAuditLogInTransaction} from "../platform/adminAudit";
import {
  callable,
  type CallableContext,
  type CallableSpec,
  runCallable,
} from "../platform/callables/callable";
import {adminRoles} from "../platform/callables/policies";
import type {AdminContext} from "../platform/adminAuth";

/**
 * Ops recommend a claim; the owner decides it (adminDecideOrganizerClaim).
 * The request stays pending and carries the recommendation, so the inbox
 * shows "Recommended: approve" and the owner sees who checked what. A later
 * recommendation replaces an earlier one; each is audited.
 */
const recommendRoles = ["admin", "adminOwner", "support"] as const;

interface RecommendDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  now: () => Date;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: RecommendDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  now: () => new Date(),
  checkRateLimit: defaultCheckRateLimit,
};

/**
 * adminRecommendOrganizerClaim: recommendRoles only (STR-10 policy).
 * @param {RecommendDeps} deps Dependencies.
 * @return {CallableSpec} The callable.
 */
export function adminRecommendOrganizerClaimSpec(
  deps: RecommendDeps = defaultDeps):
  CallableSpec<
    AdminRecommendOrganizerClaimCallablePayload,
    AdminContext,
    AdminRecommendOrganizerClaimCallableResponse> {
  return {
    name: "adminRecommendOrganizerClaim",
    policy: adminRoles(recommendRoles),
    input: validateAdminRecommendOrganizerClaimCallablePayload,
    normalize: normalizePayload,
    handle: (context) => adminRecommendOrganizerClaimWork(context, deps),
  };
}

/** The deployed path of adminRecommendOrganizerClaim, for tests. */
export function adminRecommendOrganizerClaimHandler(
  request: CallableRequest<unknown>, deps: RecommendDeps = defaultDeps):
  Promise<AdminRecommendOrganizerClaimCallableResponse> {
  return runCallable(adminRecommendOrganizerClaimSpec(deps), request);
}

async function adminRecommendOrganizerClaimWork(
  {request, data, actor: adminContext}:
    CallableContext<AdminRecommendOrganizerClaimCallablePayload, AdminContext>,
  deps: RecommendDeps):
  Promise<AdminRecommendOrganizerClaimCallableResponse> {
  const db = deps.firestore();
  await deps.checkRateLimit?.(db, adminContext.uid, "adminRecommendOrganizerClaim", {maxRequests: 30, windowMs: 60 * 1000});
  const recommendation = {decision: data.decision, byUid: adminContext.uid, at: deps.now().toISOString(), note: data.note};
  const ref = db.collection("organizerClaimRequests").doc(data.requestId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Organizer claim request not found.");
    const before = snap.data() ?? {};
    if (before.status !== "pending") {
      throw new HttpsError("failed-precondition", "This claim request has already been decided.");
    }
    tx.update(ref, {recommendation, updatedAt: deps.serverTimestamp()});
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminRecommendOrganizerClaim",
      targetPath: ref.path,
      request,
      before: {recommendation: before.recommendation ?? null},
      after: {recommendation},
      note: data.note,
      serverTimestamp: deps.serverTimestamp,
    });
  });
  return {requestId: data.requestId, status: "pending", recommendation};
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  return {...data, note: typeof data.note === "string" ? data.note.trim() : data.note};
}

export const adminRecommendOrganizerClaim = callable(
  adminRecommendOrganizerClaimSpec());
