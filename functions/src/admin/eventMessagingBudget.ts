import {CallableRequest, HttpsError, onCall} from
  "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {appCheckCallableOptions} from "../shared/callableOptions";
import type {AdminDecideEventMessagingBudgetCallablePayload} from
  "../shared/generated/adminDecideEventMessagingBudgetCallablePayload";
import type {AdminDecideEventMessagingBudgetCallableResponse} from
  "../shared/generated/adminDecideEventMessagingBudgetCallableResponse";
import type {EventMessagingBudgetDecisionDocument} from
  "../shared/generated/eventMessagingBudgetDecisionDocument";
import type {EventMessagingBudgetDecisionReceiptDocument} from
  "../shared/generated/eventMessagingBudgetDecisionReceiptDocument";
import {
  validateAdminDecideEventMessagingBudgetCallablePayload,
} from
  "../shared/generated/validators/adminDecideEventMessagingBudgetInput";
import {
  validateAdminDecideEventMessagingBudgetCallableResponse,
} from
  "../shared/generated/validators/adminDecideEventMessagingBudgetOutput";
import {validateEventMessagingBudgetDecisionDocument} from
  "../shared/generated/validators/eventMessagingBudgetDecisionDocument";
import {validateEventMessagingBudgetDecisionReceiptDocument} from
  "../shared/generated/validators/eventMessagingBudgetDecisionReceiptDocument";
import {checkRateLimit as defaultCheckRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {operationContentHash} from "../operations/durableActions";
import {
  MessageBudgetReview,
  MessageSetupReview,
  reviewEventMessageSetupInTransaction,
} from "../eventSuccess/operations/messageSetupReview";
import {requireAdminRole} from "./adminAuth";
import {setAdminAuditLogInTransaction} from "./adminAudit";

const decisionCollection = "eventMessagingBudgetDecisions";
const receiptCollection = "eventMessagingBudgetDecisionReceipts";
const allowedRoles = ["adminOwner", "finance"] as const;
const serviceTailMillis = 24 * 60 * 60 * 1000;
const effect = "decision_only_no_spending_authority" as const;

interface EventMessagingBudgetDeps {
  firestore: () => FirebaseFirestore.Firestore;
  serverTimestamp: () => FirebaseFirestore.FieldValue;
  now: () => number;
  checkRateLimit?: typeof defaultCheckRateLimit;
}

const defaultDeps: EventMessagingBudgetDeps = {
  firestore: () => admin.firestore(),
  serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  now: Date.now,
  checkRateLimit: defaultCheckRateLimit,
};

type BudgetDecision =
  AdminDecideEventMessagingBudgetCallablePayload["decision"];
type DecisionStatus =
  EventMessagingBudgetDecisionDocument["decisionStatus"];
type BudgetEvidence =
  EventMessagingBudgetDecisionDocument["reviewEvidence"]["eventBudget"];

/**
 * Records a revision-fenced finance decision against a current messaging setup
 * review. This callable never writes a provider budget or grants spend.
 * @param {CallableRequest<unknown>} request Callable request.
 * @param {EventMessagingBudgetDeps} deps Injectable dependencies.
 * @return {Promise<AdminDecideEventMessagingBudgetCallableResponse>} Result.
 */
export async function adminDecideEventMessagingBudgetHandler(
  request: CallableRequest<unknown>,
  deps: EventMessagingBudgetDeps = defaultDeps
): Promise<AdminDecideEventMessagingBudgetCallableResponse> {
  const adminContext = requireAdminRole(request, allowedRoles);
  const data = validateCallableWithAjv<
    AdminDecideEventMessagingBudgetCallablePayload
  >(
    request,
    validateAdminDecideEventMessagingBudgetCallablePayload,
    normalizePayload
  );
  const db = deps.firestore();
  await deps.checkRateLimit?.(
    db,
    adminContext.uid,
    "adminDecideEventMessagingBudget",
    {maxRequests: 30, windowMs: 60 * 1000}
  );
  const decisionId = eventMessagingBudgetDecisionId(data);
  const decisionRef = db.collection(decisionCollection).doc(decisionId);
  const requestHash = operationContentHash([adminContext.uid, data]);
  const receiptId = eventMessagingBudgetDecisionReceiptId(
    decisionId,
    data.requestId
  );
  const receiptRef = db.collection(receiptCollection).doc(receiptId);

  return db.runTransaction(async (tx) => {
    const [beforeSnap, receiptSnap] = await tx.getAll(
      decisionRef,
      receiptRef
    );
    if (receiptSnap.exists) {
      const receipt = parseReceipt(receiptSnap.data());
      if (receipt.requestHash !== requestHash) {
        throw new HttpsError(
          "already-exists",
          "This request id already belongs to another budget decision."
        );
      }
      return responseForReceipt(receipt, false, true);
    }
    const before = beforeSnap.exists ? parseDecision(beforeSnap.data()) : null;
    const currentRevision = before?.revision ?? 0;
    if (data.expectedRevision !== currentRevision) {
      throw new HttpsError(
        "aborted",
        "The messaging budget decision changed. Review it again."
      );
    }

    const observedAt = deps.now();
    assertClock(observedAt);
    const setup = await reviewEventMessageSetupInTransaction(db, tx, {
      context: {mode: "live", organizerId: data.organizerId,
        eventId: data.eventId},
      routeId: data.routeId,
      senderId: data.senderId,
      purpose: data.purpose,
    }, () => observedAt);
    assertExpectedReview(data, setup);
    assertDecisionAllowed(data.decision, setup);

    const timestamp = deps.serverTimestamp();
    const next: EventMessagingBudgetDecisionDocument = {
      schemaVersion: 1,
      decisionId,
      revision: currentRevision + 1,
      requestId: data.requestId,
      requestHash,
      context: setup.context,
      routeId: setup.routeId,
      senderId: setup.senderId,
      purpose: setup.purpose,
      decision: data.decision,
      decisionStatus: decisionStatusFor(data.decision),
      reviewEvidence: {
        observedAt: setup.observedAt,
        completedAt: setup.completedAt,
        eventEnd: setup.runtime.eventEnd,
        runtimeSourceHash: setup.runtime.sourceHash,
        senderReviewHash: setup.sender!.reviewHash,
        budgetSourceHash: setup.budgets.kind === "reviewed" ?
          setup.budgets.sourceHash : unreachableBudgetSource(),
        setupReviewHash: operationContentHash(setup),
        eventBudget: budgetEvidence(setup, "event"),
        senderDayBudget: budgetEvidence(setup, "senderDay"),
      },
      reviewedByUid: adminContext.uid,
      note: data.note,
      createdAt: (before?.createdAt ?? timestamp) as unknown as
        EventMessagingBudgetDecisionDocument["createdAt"],
      updatedAt: timestamp as unknown as
        EventMessagingBudgetDecisionDocument["updatedAt"],
      effect,
      grantsSpendingAuthority: false,
    };
    const receipt: EventMessagingBudgetDecisionReceiptDocument = {
      schemaVersion: 1,
      receiptId,
      decisionId,
      requestId: data.requestId,
      requestHash,
      revision: next.revision,
      decisionStatus: next.decisionStatus,
      decisionPath: decisionRef.path,
      effect,
      grantsSpendingAuthority: false,
      createdAt: timestamp as unknown as
        EventMessagingBudgetDecisionReceiptDocument["createdAt"],
    };

    tx.set(decisionRef, next);
    tx.create(receiptRef, receipt);
    setAdminAuditLogInTransaction(tx, db, adminContext, {
      action: "adminDecideEventMessagingBudget",
      targetPath: decisionRef.path,
      request,
      before: beforeSnap.exists ? beforeSnap.data() ?? {} : {},
      after: {
        decisionId,
        revision: next.revision,
        context: next.context,
        routeId: next.routeId,
        senderId: next.senderId,
        purpose: next.purpose,
        decisionStatus: next.decisionStatus,
        setupReviewHash: next.reviewEvidence.setupReviewHash,
        effect,
        grantsSpendingAuthority: false,
      },
      note: data.note,
      serverTimestamp: () => timestamp,
    });
    return responseFor(next, decisionRef.path, true, false);
  });
}

/**
 * Returns the deterministic scope id used for revision fencing.
 * @param {AdminDecideEventMessagingBudgetCallablePayload} data Input.
 * @return {string} Firestore document id.
 */
export function eventMessagingBudgetDecisionId(
  data: Pick<AdminDecideEventMessagingBudgetCallablePayload,
    "organizerId" | "eventId" | "routeId" | "senderId" | "purpose">
): string {
  return "message-budget-decision:" + operationContentHash([
    data.organizerId,
    data.eventId,
    data.routeId,
    data.senderId,
    data.purpose,
  ]).slice(0, 48);
}

/**
 * Returns the immutable receipt id for one request within a decision scope.
 * @param {string} decisionId Deterministic scope id.
 * @param {string} requestId Client request id.
 * @return {string} Firestore document id.
 */
export function eventMessagingBudgetDecisionReceiptId(
  decisionId: string,
  requestId: string
): string {
  return "message-budget-decision-receipt:" + operationContentHash([
    decisionId,
    requestId,
  ]).slice(0, 48);
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const data = value as Record<string, unknown>;
  const decision = data.decision && typeof data.decision === "object" &&
      !Array.isArray(data.decision) ?
    data.decision as Record<string, unknown> : null;
  return {
    ...data,
    requestId: trimmed(data.requestId),
    organizerId: trimmed(data.organizerId),
    eventId: trimmed(data.eventId),
    routeId: trimmed(data.routeId),
    senderId: trimmed(data.senderId),
    purpose: trimmed(data.purpose),
    expectedRuntimeSourceHash: normalizedHash(data.expectedRuntimeSourceHash),
    expectedSenderReviewHash: normalizedHash(data.expectedSenderReviewHash),
    expectedBudgetSourceHash: normalizedHash(data.expectedBudgetSourceHash),
    decision: decision ? {
      ...decision,
      kind: trimmed(decision.kind),
      ...(Object.hasOwn(decision, "currency") ? {
        currency: typeof decision.currency === "string" ?
          decision.currency.trim().toUpperCase() : decision.currency,
      } : {}),
    } : data.decision,
    note: trimmed(data.note),
  };
}

function assertExpectedReview(
  data: AdminDecideEventMessagingBudgetCallablePayload,
  setup: MessageSetupReview
): void {
  if (!setup.sender || setup.budgets.kind !== "reviewed") {
    throw new HttpsError(
      "failed-precondition",
      "The selected sender does not have reviewable budget configuration."
    );
  }
  if (setup.runtime.sourceHash !== data.expectedRuntimeSourceHash ||
      setup.sender.reviewHash !== data.expectedSenderReviewHash ||
      setup.budgets.sourceHash !== data.expectedBudgetSourceHash) {
    throw new HttpsError(
      "aborted",
      "The messaging setup changed. Review it again before deciding."
    );
  }
}

function assertDecisionAllowed(
  decision: BudgetDecision,
  setup: MessageSetupReview
): void {
  if (decision.kind !== "approve") return;
  if (!setup.sender || setup.sender.availability !== "eligible" ||
      setup.budgets.kind !== "reviewed") {
    throw new HttpsError(
      "failed-precondition",
      "Budget approval requires an eligible sender and reviewed budget source."
    );
  }
  if (setup.runtime.appliesToPurpose &&
      (setup.runtime.status !== "configured" || !setup.runtime.selected)) {
    throw new HttpsError(
      "failed-precondition",
      "This route must be selected in the current event runtime before " +
        "its budget can be approved."
    );
  }
  if (decision.currency !== setup.budgets.currency) {
    throw new HttpsError(
      "failed-precondition",
      "The proposed currency does not match the reviewed sender quote."
    );
  }
  if (decision.validUntil <= setup.completedAt ||
      decision.validUntil > serviceHorizon(setup.runtime.eventEnd)) {
    throw new HttpsError(
      "failed-precondition",
      "Budget approval must expire after review and no later than 24 hours " +
        "after the event ends."
    );
  }
  const eventCharged = chargedMicros(setup.budgets.event);
  const senderDayCharged = chargedMicros(setup.budgets.senderDay);
  if (decision.eventLimitMicros < eventCharged ||
      decision.senderDayLimitMicros < senderDayCharged) {
    throw new HttpsError(
      "failed-precondition",
      "A proposed ceiling cannot be lower than reviewed charges."
    );
  }
}

function budgetEvidence(
  setup: MessageSetupReview,
  scope: "event" | "senderDay"
): BudgetEvidence {
  if (setup.budgets.kind !== "reviewed") return unreachableBudgetSource();
  const budget = setup.budgets[scope];
  return budget.kind === "recorded" ? {
    budgetId: budget.budgetId,
    revision: budget.revision,
    reviewHash: budget.reviewHash,
    chargedMicros: budget.chargedMicros,
  } : {
    budgetId: budget.budgetId,
    revision: null,
    reviewHash: null,
    chargedMicros: 0,
  };
}

function chargedMicros(budget: MessageBudgetReview): number {
  return budget.kind === "recorded" ? budget.chargedMicros : 0;
}

function parseDecision(value: unknown): EventMessagingBudgetDecisionDocument {
  if (!validateEventMessagingBudgetDecisionDocument(value)) {
    throw new HttpsError(
      "failed-precondition",
      "The existing messaging budget decision is invalid."
    );
  }
  return value;
}

function parseReceipt(
  value: unknown
): EventMessagingBudgetDecisionReceiptDocument {
  if (!validateEventMessagingBudgetDecisionReceiptDocument(value)) {
    throw new HttpsError(
      "failed-precondition",
      "The existing messaging budget decision receipt is invalid."
    );
  }
  return value;
}

function decisionStatusFor(decision: BudgetDecision): DecisionStatus {
  if (decision.kind === "approve") return "approved";
  if (decision.kind === "hold") return "held";
  return "rejected";
}

function responseFor(
  decision: EventMessagingBudgetDecisionDocument,
  decisionPath: string,
  applied: boolean,
  replayed: boolean
): AdminDecideEventMessagingBudgetCallableResponse {
  const response: AdminDecideEventMessagingBudgetCallableResponse = {
    schemaVersion: 1,
    applied,
    replayed,
    decisionId: decision.decisionId,
    revision: decision.revision,
    decisionStatus: decision.decisionStatus,
    decisionPath,
    effect,
    grantsSpendingAuthority: false,
  };
  if (!validateAdminDecideEventMessagingBudgetCallableResponse(response)) {
    throw new Error("Invalid event messaging budget decision response");
  }
  return response;
}

function responseForReceipt(
  receipt: EventMessagingBudgetDecisionReceiptDocument,
  applied: boolean,
  replayed: boolean
): AdminDecideEventMessagingBudgetCallableResponse {
  const response: AdminDecideEventMessagingBudgetCallableResponse = {
    schemaVersion: 1,
    applied,
    replayed,
    decisionId: receipt.decisionId,
    revision: receipt.revision,
    decisionStatus: receipt.decisionStatus,
    decisionPath: receipt.decisionPath,
    effect,
    grantsSpendingAuthority: false,
  };
  if (!validateAdminDecideEventMessagingBudgetCallableResponse(response)) {
    throw new Error("Invalid event messaging budget decision replay response");
  }
  return response;
}

function serviceHorizon(eventEnd: number): number {
  return eventEnd > Number.MAX_SAFE_INTEGER - serviceTailMillis ?
    Number.MAX_SAFE_INTEGER : eventEnd + serviceTailMillis;
}

function assertClock(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Invalid event messaging budget review clock");
  }
}

function trimmed(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function normalizedHash(value: unknown): unknown {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

function unreachableBudgetSource(): never {
  throw new Error("Reviewed budget source required");
}

export const adminDecideEventMessagingBudget = onCall(
  appCheckCallableOptions,
  (request) => adminDecideEventMessagingBudgetHandler(request)
);
