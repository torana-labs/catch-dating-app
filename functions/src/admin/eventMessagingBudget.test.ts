import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {validateEventMessagingBudgetDecisionDocument} from
  "../shared/generated/validators/eventMessagingBudgetDecisionDocument";
import {validateEventMessagingBudgetDecisionReceiptDocument} from
  "../shared/generated/validators/eventMessagingBudgetDecisionReceiptDocument";
import {reviewEventMessageSetup} from
  "../eventSuccess/operations/messageSetupReview";
import {EventAssistanceRuntimeConfigStore} from
  "../eventSuccess/operations/runtimeConfigStore";
import {rcsHarness} from
  "../eventSuccess/operations/rcsDispatchTestHarness";
import {start} from "../eventSuccess/operations/whatsappTestHarness";
import {
  adminDecideEventMessagingBudgetHandler,
  eventMessagingBudgetDecisionId,
  eventMessagingBudgetDecisionReceiptId,
} from "./eventMessagingBudget";

type FakeData = Record<string, unknown>;

function callableRequest(
  data: FakeData,
  token: Record<string, unknown> = {adminOwner: true},
  uid = "finance-1"
): CallableRequest<unknown> {
  return {
    auth: {uid, token} as CallableRequest["auth"],
    data,
    rawRequest: {
      headers: {"x-cloud-trace-context": "budget-test"},
    } as unknown as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}

async function setup(configure = true) {
  const h = await rcsHarness(undefined, "budget-decision");
  const scope = {
    context: h.context,
    routeId: "catchEventRcs" as const,
    senderId: h.rcsConfig.senderId,
    purpose: "joiningUpdate" as const,
  };
  if (configure) {
    const store = new EventAssistanceRuntimeConfigStore(h.db, () => start);
    const {view} = await store.get("host-1", {context: h.context});
    await store.set("host-1", {
      context: h.context,
      requestId: "configure-budget-review",
      expectedRevision: view.revision,
      expectedSourceHash: view.sourceHash,
      command: {kind: "configure", configuration: {
        options: {
          routes: [{routeId: scope.routeId, senderId: scope.senderId}],
          responseDeadline: null,
          deliveryPolicy: {maxAttempts: 2, maxAttemptsPerRoute: 1,
            minimumRetrySeconds: 1},
        },
        expiresAt: start + 100_000,
        maxEvaluations: 100,
      }},
    });
  }
  const review = await reviewEventMessageSetup(h.db, scope, () => start);
  assert.ok(review.sender);
  assert.ok(review.budgets.kind === "reviewed");
  const payload = {
    requestId: "budget-request-1",
    organizerId: h.context.organizerId,
    eventId: h.context.eventId,
    routeId: scope.routeId,
    senderId: scope.senderId,
    purpose: scope.purpose,
    expectedRevision: 0,
    expectedRuntimeSourceHash: review.runtime.sourceHash,
    expectedSenderReviewHash: review.sender.reviewHash,
    expectedBudgetSourceHash: review.budgets.sourceHash,
    decision: {
      kind: "approve",
      currency: review.budgets.currency,
      eventLimitMicros: 3_000_000,
      senderDayLimitMicros: 5_000_000,
      validUntil: start + 2 * 60 * 60 * 1000,
    },
    note: "Reviewed fixture ceiling; this decision grants no spend.",
  };
  const rateLimitActions: string[] = [];
  const deps = {
    firestore: () => h.db,
    serverTimestamp: () => ({_seconds: start / 1000, _nanoseconds: 0}) as
      unknown as FirebaseFirestore.FieldValue,
    now: () => start,
    checkRateLimit: async (_db: FirebaseFirestore.Firestore, _uid: string,
      action: string) => {
      rateLimitActions.push(action);
    },
  };
  return {h, scope, review, payload, deps, rateLimitActions};
}

function assertHttpsCode(error: unknown, code: string): boolean {
  assert.equal((error as {code?: string}).code, code);
  return true;
}

test("finance decision records exact setup evidence without changing budgets",
  async () => {
    const x = await setup();
    const budgetsBefore = await Promise.all(x.h.rcsBudgetPaths.map(x.h.read));

    const result = await adminDecideEventMessagingBudgetHandler(
      callableRequest(x.payload), x.deps
    );

    assert.equal(result.applied, true);
    assert.equal(result.replayed, false);
    assert.equal(result.decisionStatus, "approved");
    assert.equal(result.effect, "decision_only_no_spending_authority");
    assert.equal(result.grantsSpendingAuthority, false);
    const stored = x.h.fake.read(result.decisionPath);
    assert.equal(validateEventMessagingBudgetDecisionDocument(stored), true);
    assert.deepEqual(stored?.decision, x.payload.decision);
    assert.equal(stored?.revision, 1);
    assert.equal(stored?.grantsSpendingAuthority, false);
    assert.equal(
      (stored?.reviewEvidence as FakeData).runtimeSourceHash,
      x.review.runtime.sourceHash
    );
    const receiptId = eventMessagingBudgetDecisionReceiptId(
      result.decisionId,
      x.payload.requestId
    );
    assert.equal(validateEventMessagingBudgetDecisionReceiptDocument(
      x.h.fake.read("eventMessagingBudgetDecisionReceipts/" + receiptId)
    ), true);
    assert.deepEqual(
      await Promise.all(x.h.rcsBudgetPaths.map(x.h.read)),
      budgetsBefore
    );
    assert.equal(x.h.requests.length, 0);
    assert.equal(
      x.h.fake.entries().filter(([path]) =>
        path.startsWith("adminAuditLogs/")).length,
      1
    );
    assert.deepEqual(x.rateLimitActions,
      ["adminDecideEventMessagingBudget"]);
  });

test("same request replays while changed reuse and stale revisions fail",
  async () => {
    const x = await setup();
    const first = await adminDecideEventMessagingBudgetHandler(
      callableRequest(x.payload), x.deps
    );
    const replay = await adminDecideEventMessagingBudgetHandler(
      callableRequest(x.payload), x.deps
    );
    assert.equal(replay.applied, false);
    assert.equal(replay.replayed, true);
    assert.equal(replay.revision, first.revision);
    assert.equal(
      x.h.fake.entries().filter(([path]) =>
        path.startsWith("adminAuditLogs/")).length,
      1
    );
    await assert.rejects(
      () => adminDecideEventMessagingBudgetHandler(callableRequest({
        ...x.payload,
        note: "Changed payload under the same request id.",
      }), x.deps),
      (error) => assertHttpsCode(error, "already-exists")
    );
    await assert.rejects(
      () => adminDecideEventMessagingBudgetHandler(callableRequest({
        ...x.payload,
        requestId: "budget-request-2",
      }), x.deps),
      (error) => assertHttpsCode(error, "aborted")
    );
  });

test("a new reviewed decision advances the deterministic scope revision",
  async () => {
    const x = await setup();
    await adminDecideEventMessagingBudgetHandler(callableRequest(x.payload),
      x.deps);
    const next = await adminDecideEventMessagingBudgetHandler(callableRequest({
      ...x.payload,
      requestId: "budget-request-2",
      expectedRevision: 1,
      decision: {kind: "hold"},
      note: "Hold until the sender-day ceiling is reconciled.",
    }), x.deps);
    assert.equal(next.revision, 2);
    assert.equal(next.decisionStatus, "held");
    assert.equal(next.grantsSpendingAuthority, false);
    assert.equal(next.decisionId, eventMessagingBudgetDecisionId(x.payload));
    const oldReplay = await adminDecideEventMessagingBudgetHandler(
      callableRequest(x.payload), x.deps
    );
    assert.equal(oldReplay.replayed, true);
    assert.equal(oldReplay.revision, 1);
    assert.equal(oldReplay.decisionStatus, "approved");
  });

test("only the admin owner role can record budget decisions",
  async () => {
    const x = await setup();
    await assert.rejects(
      () => adminDecideEventMessagingBudgetHandler(
        callableRequest(x.payload, {support: true}), x.deps),
      (error) => assertHttpsCode(error, "permission-denied")
    );
    const ownerResult = await adminDecideEventMessagingBudgetHandler(
      callableRequest(x.payload, {adminOwner: true}, "owner-1"), x.deps
    );
    assert.equal(ownerResult.decisionStatus, "approved");
  });

test("approval requires the selected runtime and current reviewed hashes",
  async () => {
    const unselected = await setup(false);
    await assert.rejects(
      () => adminDecideEventMessagingBudgetHandler(
        callableRequest(unselected.payload), unselected.deps),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
    const changed = await setup();
    await assert.rejects(
      () => adminDecideEventMessagingBudgetHandler(callableRequest({
        ...changed.payload,
        expectedBudgetSourceHash: "a".repeat(64),
      }), changed.deps),
      (error) => assertHttpsCode(error, "aborted")
    );
  });

test("approval bounds currency, validity, and ceilings to reviewed evidence",
  async () => {
    for (const decision of [
      {kind: "approve", currency: "USD", eventLimitMicros: 3_000_000,
        senderDayLimitMicros: 5_000_000, validUntil: start + 1},
      {kind: "approve", currency: "INR", eventLimitMicros: 3_000_000,
        senderDayLimitMicros: 5_000_000, validUntil: start},
      {kind: "approve", currency: "INR", eventLimitMicros: 3_000_000,
        senderDayLimitMicros: 5_000_000,
        validUntil: start + 26 * 60 * 60 * 1000},
    ]) {
      const x = await setup();
      await assert.rejects(
        () => adminDecideEventMessagingBudgetHandler(callableRequest({
          ...x.payload,
          decision,
        }), x.deps),
        (error) => assertHttpsCode(error, "failed-precondition")
      );
    }

    const charged = await setup();
    const eventPath = charged.h.rcsBudgetPaths[0];
    const eventBudget = (await charged.h.read(eventPath))!;
    await charged.h.write(eventPath, {...eventBudget, chargedMicros: 600_000});
    const rereview = await reviewEventMessageSetup(charged.h.db,
      charged.scope, () => start);
    const sender = rereview.sender;
    const budgets = rereview.budgets;
    if (!sender || budgets.kind !== "reviewed") {
      assert.fail("Expected a reviewable sender and budget source");
    }
    await assert.rejects(
      () => adminDecideEventMessagingBudgetHandler(callableRequest({
        ...charged.payload,
        expectedRuntimeSourceHash: rereview.runtime.sourceHash,
        expectedSenderReviewHash: sender.reviewHash,
        expectedBudgetSourceHash: budgets.sourceHash,
        decision: {...charged.payload.decision, eventLimitMicros: 500_000},
      }), charged.deps),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  });
