import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
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
import {validateCallableWithAjv} from "../shared/validation";
import {reviewEventMessageSetupInTransaction} from
  "../eventSuccess/operations/messageSetupReview";
import {requireAdminRole} from "./adminAuth";
import {writeAdminAuditLog} from "./adminAudit";
import {eventMessagingBudgetDecisionId} from "./eventMessagingBudget";

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
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {EventMessagingBudgetReviewDeps} deps Injectable dependencies.
 * @return {Promise<AdminReviewEventMessagingBudgetCallableResponse>} Review.
 */
export async function adminReviewEventMessagingBudgetHandler(
  request: CallableRequest<unknown>,
  deps: EventMessagingBudgetReviewDeps = defaultDeps
): Promise<AdminReviewEventMessagingBudgetCallableResponse> {
  const adminContext = requireAdminRole(request, allowedRoles);
  const data = validateCallableWithAjv<
    AdminReviewEventMessagingBudgetCallablePayload
  >(
    request,
    validateAdminReviewEventMessagingBudgetCallablePayload,
    normalizePayload
  );
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

export const adminReviewEventMessagingBudget = onCall(
  appCheckCallableOptions,
  (request) => adminReviewEventMessagingBudgetHandler(request)
);
