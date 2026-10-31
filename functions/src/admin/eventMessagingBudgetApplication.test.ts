import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
// eslint-disable-next-line max-len
import {validateEventMessagingBudgetApplicationReceiptDocument} from "../shared/generated/validators/eventMessagingBudgetApplicationReceiptDocument";
import {reviewEventMessageSetup} from
  "../eventSuccess/operations/messageSetupReview";
import {EventAssistanceRuntimeConfigStore} from
  "../eventSuccess/operations/runtimeConfigStore";
import {rcsHarness} from
  "../eventSuccess/operations/rcsDispatchTestHarness";
import {start} from "../eventSuccess/operations/whatsappTestHarness";
import {
  adminDecideEventMessagingBudgetHandler,
} from "./eventMessagingBudget";
import {
  adminApplyEventMessagingBudgetHandler,
  eventMessagingBudgetApplicationReceiptId,
} from "./eventMessagingBudgetApplication";

type FakeData = Record<string, unknown>;
type RouteId = "catchEventSms" | "catchEventRcs" |
  "organizerEventWhatsapp";

function callableRequest(
  data: FakeData,
  token: Record<string, unknown> = {adminOwner: true},
  uid = "finance-1"
): CallableRequest<unknown> {
  return {
    auth: {uid, token} as CallableRequest["auth"],
    data,
    rawRequest: {
      headers: {"x-cloud-trace-context": "budget-apply-test"},
    } as unknown as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}

async function setup(routeId: RouteId = "catchEventRcs",
  suffix: string = routeId) {
  const h = await rcsHarness(undefined, "budget-apply-" + suffix, [routeId]);
  const senderId = routeId === "catchEventRcs" ? h.rcsConfig.senderId :
    routeId === "catchEventSms" ? "sms-budget-apply-" + suffix :
      h.scope.senderId;
  const budgetPaths = routeId === "catchEventRcs" ? h.rcsBudgetPaths :
    routeId === "catchEventSms" ? h.smsBudgets : h.budgetPaths;
  const scope = {
    context: h.context,
    routeId,
    senderId,
    purpose: "joiningUpdate" as const,
  };
  const store = new EventAssistanceRuntimeConfigStore(h.db, () => start);
  const {view} = await store.get("host-1", {context: h.context});
  await store.set("host-1", {
    context: h.context,
    requestId: "configure-budget-application",
    expectedRevision: view.revision,
    expectedSourceHash: view.sourceHash,
    command: {kind: "configure", configuration: {
      options: {
        routes: [{routeId, senderId}],
        responseDeadline: null,
        deliveryPolicy: {maxAttempts: 2, maxAttemptsPerRoute: 1,
          minimumRetrySeconds: 1},
      },
      expiresAt: start + 100_000,
      maxEvaluations: 100,
    }},
  });
  const eventBefore = (await h.read(budgetPaths[0]))!;
  const senderDayBefore = (await h.read(budgetPaths[1]))!;
  await h.write(budgetPaths[0], {...eventBefore, chargedMicros: 250_000});
  await h.write(budgetPaths[1], {...senderDayBefore, chargedMicros: 400_000});
  const review = await reviewEventMessageSetup(h.db, scope, () => start);
  assert.ok(review.sender);
  assert.equal(review.budgets.kind, "reviewed");
  if (!review.sender || review.budgets.kind !== "reviewed") {
    assert.fail("Expected reviewable messaging setup");
  }
  const decisionPayload = {
    requestId: "budget-decision-1",
    organizerId: h.context.organizerId,
    eventId: h.context.eventId,
    routeId,
    senderId,
    purpose: "joiningUpdate",
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
    note: "Approve exact reviewed ceilings for application test.",
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
  const decision = await adminDecideEventMessagingBudgetHandler(
    callableRequest(decisionPayload), deps
  );
  const applicationPayload = {
    requestId: "budget-application-1",
    decisionId: decision.decisionId,
    expectedDecisionRevision: decision.revision,
    note: "Apply the approved event and sender-day ceilings.",
  };
  return {h, scope, review, budgetPaths, decisionPayload, decision,
    applicationPayload, deps, rateLimitActions};
}

function assertHttpsCode(error: unknown, code: string): boolean {
  assert.equal((error as {code?: string}).code, code);
  return true;
}

for (const routeId of ["catchEventSms", "catchEventRcs",
  "organizerEventWhatsapp"] as const) {
  test(`applies approved ${routeId} ceilings without provider work`,
    async () => {
      const x = await setup(routeId);
      const result = await adminApplyEventMessagingBudgetHandler(
        callableRequest(x.applicationPayload), x.deps
      );

      assert.equal(result.applied, true);
      assert.equal(result.replayed, false);
      assert.equal(result.routeId, routeId);
      assert.equal(result.effect,
        "budgets_staged_paused_no_spending_or_dispatch_authority");
      assert.equal(result.stagesSpendingCeilings, true);
      assert.equal(result.grantsSpendingAuthority, false);
      assert.equal(result.grantsDispatchAuthority, false);
      assert.equal(result.providerContacted, false);
      assert.equal(result.workerActivated, false);
      assert.equal(result.eventBudget.revision, 2);
      assert.equal(result.senderDayBudget.revision, 2);
      const eventBudget = (await x.h.read(x.budgetPaths[0]))!;
      const senderDayBudget = (await x.h.read(x.budgetPaths[1]))!;
      assert.equal(eventBudget.limitMicros, 3_000_000);
      assert.equal(eventBudget.status, "paused");
      assert.equal(eventBudget.chargedMicros, 250_000);
      assert.equal(eventBudget.endsAt, start + 2 * 60 * 60 * 1000);
      assert.equal(senderDayBudget.limitMicros, 5_000_000);
      assert.equal(senderDayBudget.status, "paused");
      assert.equal(senderDayBudget.chargedMicros, 400_000);
      assert.equal(eventBudget.approvalId, result.receiptId);
      assert.equal(senderDayBudget.approvalId, result.receiptId);
      if (routeId === "catchEventRcs") {
        assert.equal(eventBudget.agentId, x.h.rcsConfig.agentId);
        assert.equal(senderDayBudget.agentId, x.h.rcsConfig.agentId);
      } else {
        assert.equal(Object.hasOwn(eventBudget, "agentId"), false);
      }
      const receipt = x.h.fake.read(result.receiptPath);
      assert.equal(validateEventMessagingBudgetApplicationReceiptDocument(
        receipt), true);
      assert.equal(receipt?.providerContacted, false);
      assert.equal(receipt?.workerActivated, false);
      await x.h.dispatch();
      assert.equal(x.h.requests.length, 0);
      assert.equal(
        x.h.fake.entries().filter(([path]) =>
          path.startsWith("adminAuditLogs/")).length,
        2
      );
      assert.deepEqual(x.rateLimitActions, [
        "adminDecideEventMessagingBudget",
        "adminApplyEventMessagingBudget",
      ]);
    });
}

test("application replay is immutable and changed request reuse fails",
  async () => {
    const x = await setup();
    const first = await adminApplyEventMessagingBudgetHandler(
      callableRequest(x.applicationPayload), x.deps
    );
    const replay = await adminApplyEventMessagingBudgetHandler(
      callableRequest(x.applicationPayload), x.deps
    );
    assert.equal(replay.applied, false);
    assert.equal(replay.replayed, true);
    assert.equal(replay.receiptId, first.receiptId);
    assert.equal(
      x.h.fake.entries().filter(([path]) =>
        path.startsWith("adminAuditLogs/")).length,
      2
    );
    await assert.rejects(
      () => adminApplyEventMessagingBudgetHandler(callableRequest({
        ...x.applicationPayload,
        note: "Changed note under an existing request id.",
      }), x.deps),
      (error) => assertHttpsCode(error, "already-exists")
    );
    await assert.rejects(
      () => adminApplyEventMessagingBudgetHandler(callableRequest({
        ...x.applicationPayload,
        requestId: "budget-application-2",
      }), x.deps),
      (error) => assertHttpsCode(error, "aborted")
    );
  });

test("application rejects stale, expired, changed, and unapproved decisions",
  async () => {
    const stale = await setup("catchEventRcs", "stale");
    await assert.rejects(
      () => adminApplyEventMessagingBudgetHandler(callableRequest({
        ...stale.applicationPayload,
        expectedDecisionRevision: 2,
      }), stale.deps),
      (error) => assertHttpsCode(error, "aborted")
    );

    const expired = await setup("catchEventRcs", "expired");
    await assert.rejects(
      () => adminApplyEventMessagingBudgetHandler(
        callableRequest(expired.applicationPayload),
        {...expired.deps, now: () => start + 3 * 60 * 60 * 1000}
      ),
      (error) => assertHttpsCode(error, "failed-precondition")
    );

    const changed = await setup("catchEventRcs", "changed");
    const before = (await changed.h.read(changed.budgetPaths[0]))!;
    await changed.h.write(changed.budgetPaths[0], {...before,
      chargedMicros: 500_000, revision: 2, updatedAt: start});
    await assert.rejects(
      () => adminApplyEventMessagingBudgetHandler(
        callableRequest(changed.applicationPayload), changed.deps),
      (error) => assertHttpsCode(error, "aborted")
    );

    const held = await setup("catchEventRcs", "held");
    const decisionPath = "eventMessagingBudgetDecisions/" +
      held.decision.decisionId;
    const stored = held.h.fake.read(decisionPath)!;
    held.h.fake.write(decisionPath, {...stored, decision: {kind: "hold"},
      decisionStatus: "held"});
    await assert.rejects(
      () => adminApplyEventMessagingBudgetHandler(
        callableRequest(held.applicationPayload), held.deps),
      (error) => assertHttpsCode(error, "failed-precondition")
    );
  });

test("only the admin owner role can apply an approval", async () => {
  const support = await setup("catchEventRcs", "support");
  await assert.rejects(
    () => adminApplyEventMessagingBudgetHandler(
      callableRequest(support.applicationPayload, {support: true}),
      support.deps),
    (error) => assertHttpsCode(error, "permission-denied")
  );
  const owner = await setup("catchEventRcs", "owner");
  const result = await adminApplyEventMessagingBudgetHandler(
    callableRequest(owner.applicationPayload, {adminOwner: true}, "owner-1"),
    owner.deps
  );
  assert.equal(result.applied, true);
  assert.equal(result.receiptId,
    eventMessagingBudgetApplicationReceiptId(
      owner.decision.decisionId,
      owner.applicationPayload.requestId
    ));
});
