import {CallableRequest, HttpsError} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type {AdminReviewEventMessagingBudgetCallablePayload} from
  "../shared/generated/adminReviewEventMessagingBudgetCallablePayload";
import type {AdminReviewEventMessagingBudgetCallableResponse} from
  "../shared/generated/adminReviewEventMessagingBudgetCallableResponse";
import type {EventMessagingBudgetDecisionDocument} from
  "../shared/generated/eventMessagingBudgetDecisionDocument";
import {
  validateAdminReviewEventMessagingBudgetCallablePayload,
} from
  "../shared/generated/validators/adminReviewEventMessagingBudgetInput";
import {
  validateAdminReviewEventMessagingBudgetCallableResponse,
} from
  "../shared/generated/validators/adminReviewEventMessagingBudgetOutput";
import {validateEventMessagingBudgetDecisionDocument} from
  "../shared/generated/validators/eventMessagingBudgetDecisionDocument";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {reviewEventMessageSetupInTransaction} from
  "../eventSuccess/operations/messageSetupReview";
import {writeAdminAuditLog} from "../platform/adminAudit";
import {eventMessagingBudgetDecisionId} from "./eventMessagingBudget";
import {
  callable,
  type CallableContext,
  type CallableSpec,
  runCallable,
} from "../platform/callables/callable";
import {adminRoles} from "../platform/callables/policies";
import type {AdminContext} from "../platform/adminAuth";

const decisionCollection = "eventMessagingBudgetDecisions";
const allowedRoles = ["adminOwner"] as const;

interface EventMessagingBudgetReviewDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  now: () => number;
  checkRateLimit?: typeof defaultCheckRateLimit;
  writeAudit: typeof writeAdminAuditLog;
}

const defaultDeps: EventMessagingBudgetReviewDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  now: Date.now,
  checkRateLimit: defaultCheckRateLimit,
  writeAudit: writeAdminAuditLog,
};

/**
 * Returns one exact Finance setup review and its current decision revision.
 * It reads no credentials or roster data and grants no spending or dispatch.
 * Policy: allowedRoles (STR-10).
 * @param {EventMessagingBudgetReviewDeps} deps Dependencies.
 * @return {CallableSpec} The callable.
 */
export function adminReviewEventMessagingBudgetSpec(
  deps: EventMessagingBudgetReviewDeps = defaultDeps):
  CallableSpec<
    AdminReviewEventMessagingBudgetCallablePayload,
    AdminContext,
    AdminReviewEventMessagingBudgetCallableResponse> {
  return {
    name: "adminReviewEventMessagingBudget",
    policy: adminRoles(allowedRoles),
    input: validateAdminReviewEventMessagingBudgetCallablePayload,
    normalize: normalizePayload,
    handle: (context) => adminReviewEventMessagingBudgetWork(context, deps),
  };
}

/** The deployed path of adminReviewEventMessagingBudget, for tests. */
export function adminReviewEventMessagingBudgetHandler(
  request: CallableRequest<unknown>,
  deps: EventMessagingBudgetReviewDeps = defaultDeps):
  Promise<AdminReviewEventMessagingBudgetCallableResponse> {
  return runCallable(adminReviewEventMessagingBudgetSpec(deps), request);
}

async function adminReviewEventMessagingBudgetWork(
  {request, data, actor: adminContext}:
    CallableContext<
      AdminReviewEventMessagingBudgetCallablePayload,
      AdminContext>,
  deps: EventMessagingBudgetReviewDeps):
  Promise<AdminReviewEventMessagingBudgetCallableResponse> {
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminReviewEventMessagingBudget",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const decisionId = eventMessagingBudgetDecisionId(data);
  const decisionRef = db.collection(decisionCollection).doc(decisionId);
  const observedAt = deps.now();
  assertClock(observedAt);
  const response = await db.runTransaction(async (tx) => {
    const decisionSnap = await tx.get(decisionRef);
    const review = await reviewEventMessageSetupInTransaction(db, tx, {
      context: {mode: "live", organizerId: data.organizerId,
        eventId: data.eventId},
      routeId: data.routeId,
      senderId: data.senderId,
      purpose: data.purpose,
    }, () => observedAt);
    const decision = decisionSnap.exists ?
      parseDecision(decisionSnap.data()) : null;
    const result: AdminReviewEventMessagingBudgetCallableResponse = {
      schemaVersion: 1,
      review,
      decision: decision ? decisionSummary(decision) : null,
      grantsSpendingAuthority: false,
      grantsDispatchAuthority: false,
    };
    if (!validateAdminReviewEventMessagingBudgetCallableResponse(result)) {
      throw new Error("Invalid event messaging budget review response");
    }
    return result;
  }, {readOnly: true});
  await deps.writeAudit(db, adminContext, {
    action: "adminReviewEventMessagingBudget",
    targetPath: decisionRef.path,
    request,
    after: {
      organizerId: data.organizerId,
      eventId: data.eventId,
      routeId: data.routeId,
      senderId: data.senderId,
      purpose: data.purpose,
      observedAt: response.review.observedAt,
      decisionRevision: response.decision?.revision ?? 0,
      grantsSpendingAuthority: false,
      grantsDispatchAuthority: false,
    },
    serverTimestamp: deps.serverTimestamp,
  });
  return response;
}

function decisionSummary(
  decision: EventMessagingBudgetDecisionDocument
): NonNullable<AdminReviewEventMessagingBudgetCallableResponse["decision"]> {
  return {
    decisionId: decision.decisionId,
    revision: decision.revision,
    decisionStatus: decision.decisionStatus,
    decisionKind: decision.decision.kind,
    reviewedByUid: decision.reviewedByUid,
    note: decision.note,
    effect: "decision_only_no_spending_authority",
    grantsSpendingAuthority: false,
  };
}

function parseDecision(value: unknown): EventMessagingBudgetDecisionDocument {
  if (!validateEventMessagingBudgetDecisionDocument(value)) {
    throw new HttpsError(
      "failed-precondition",
      "The current messaging budget decision is invalid."
    );
  }
  return value;
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  return {
    ...data,
    organizerId: trimmed(data.organizerId),
    eventId: trimmed(data.eventId),
    routeId: trimmed(data.routeId),
    senderId: trimmed(data.senderId),
    purpose: trimmed(data.purpose),
  };
}

function assertClock(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Invalid event messaging budget review clock");
  }
}

function trimmed(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export const adminReviewEventMessagingBudget = callable(
  adminReviewEventMessagingBudgetSpec());
