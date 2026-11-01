import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {rcsHarness} from
  "../eventSuccess/operations/rcsDispatchTestHarness";
import {
  adminDecideEventMessagingBudgetHandler,
  eventMessagingBudgetDecisionId,
} from "./eventMessagingBudget";
import {adminReviewEventMessagingBudgetHandler} from
  "./eventMessagingBudgetReview";

const start = Date.UTC(2026, 8, 16, 6, 30);

function request(
  data: Record<string, unknown>,
  token: Record<string, unknown> = {adminOwner: true}
): CallableRequest<unknown> {
  return {
    auth: {uid: "finance-1", token} as CallableRequest["auth"],
    data,
    rawRequest: {
      headers: {"x-cloud-trace-context": "budget-review-test"},
    } as unknown as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}

async function setup() {
  const h = await rcsHarness(undefined, "admin-budget-review",
    ["catchEventRcs"]);
  const payload = {
    organizerId: h.context.organizerId,
    eventId: h.context.eventId,
    routeId: "catchEventRcs" as const,
    senderId: h.rcsConfig.senderId,
    purpose: "joiningInstructions" as const,
  };
  const rateLimitActions: string[] = [];
  const auditTargets: string[] = [];
  const deps = {
    firestore: () => h.db,
    serverTimestamp: () => ({_seconds: start / 1000, _nanoseconds: 0}) as
      unknown as FirebaseFirestore.FieldValue,
    now: () => start,
    checkRateLimit: async (_db: FirebaseFirestore.Firestore, _uid: string,
      action: string) => {
      rateLimitActions.push(action);
    },
    writeAudit: async (_db: FirebaseFirestore.Firestore, _context: unknown,
      input: {targetPath: string}) => {
      auditTargets.push(input.targetPath);
    },
  };
  return {h, payload, deps, rateLimitActions, auditTargets};
}

function assertHttpsCode(error: unknown, code: string): boolean {
  assert.equal((error as {code?: string}).code, code);
  return true;
}

test("Finance reviews exact setup and current decision without authority",
  async () => {
    const x = await setup();
    const first = await adminReviewEventMessagingBudgetHandler(
      request(x.payload), x.deps
    );
    assert.equal(first.decision, null);
    assert.equal(first.review.context.eventId, x.payload.eventId);
    assert.equal(first.review.sender?.senderId, x.payload.senderId);
    assert.equal(first.review.budgets.kind, "reviewed");
    assert.equal(first.grantsSpendingAuthority, false);
    assert.equal(first.grantsDispatchAuthority, false);
    assert.equal(JSON.stringify(first).includes(x.h.rcsConfig.agentId), false);
    if (!first.review.sender || first.review.budgets.kind !== "reviewed") {
      assert.fail("Expected a complete setup review");
    }

    const decided = await adminDecideEventMessagingBudgetHandler(request({
      requestId: "budget-review-hold-1",
      ...x.payload,
      expectedRevision: 0,
      expectedRuntimeSourceHash: first.review.runtime.sourceHash,
      expectedSenderReviewHash: first.review.sender.reviewHash,
      expectedBudgetSourceHash: first.review.budgets.sourceHash,
      decision: {kind: "hold"},
      note: "Hold until the operator confirms the event ceiling.",
    }), x.deps);
    const second = await adminReviewEventMessagingBudgetHandler(
      request(x.payload), x.deps
    );
    assert.deepEqual(second.decision, {
      decisionId: decided.decisionId,
      revision: 1,
      decisionStatus: "held",
      decisionKind: "hold",
      reviewedByUid: "finance-1",
      note: "Hold until the operator confirms the event ceiling.",
      effect: "decision_only_no_spending_authority",
      grantsSpendingAuthority: false,
    });
    assert.deepEqual(x.rateLimitActions, [
      "adminReviewEventMessagingBudget",
      "adminDecideEventMessagingBudget",
      "adminReviewEventMessagingBudget",
    ]);
    assert.deepEqual(x.auditTargets, [
      `eventMessagingBudgetDecisions/${decided.decisionId}`,
      `eventMessagingBudgetDecisions/${decided.decisionId}`,
    ]);
  });

test("budget setup review is restricted and fails closed on corrupt decisions",
  async () => {
    const x = await setup();
    await assert.rejects(
      () => adminReviewEventMessagingBudgetHandler(
        request(x.payload, {support: true}), x.deps),
      (error) => assertHttpsCode(error, "permission-denied")
    );
    const decisionId = eventMessagingBudgetDecisionId(x.payload);
    x.h.fake.write(`eventMessagingBudgetDecisions/${decisionId}`, {
      schemaVersion: 1,
      decisionId,
      revision: "broken",
    });
    await assert.rejects(
      () => adminReviewEventMessagingBudgetHandler(request(x.payload), x.deps),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  });
