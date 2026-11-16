import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {rcsHarness} from "./rcsDispatchTestHarness";
import {start} from "./whatsappTestHarness";
import {reviewEventMessageSetup, MessageSetupScope} from "./messageSetupReview";
import {EventAssistanceRuntimeConfigStore} from "./runtimeConfigStore";
import {validateEventMessagingSetupReview} from
  "../../shared/generated/validators/eventMessagingSetupReview";

type Harness = Awaited<ReturnType<typeof rcsHarness>>;
const routes = ["catchEventSms", "catchEventRcs", "organizerEventWhatsapp"] as
  const;

function selection(h: Harness, routeId: MessageSetupScope["routeId"],
  purpose: MessageSetupScope["purpose"] = "joiningUpdate") {
  return {context: h.context, routeId, senderId: {
    catchEventSms: "sms-review", catchEventRcs: h.rcsConfig.senderId,
    organizerEventWhatsapp: h.scope.senderId,
  }[routeId], purpose};
}
function paths(h: Harness, route: MessageSetupScope["routeId"]) {
  return {catchEventSms: h.smsBudgets, catchEventRcs: h.rcsBudgetPaths,
    organizerEventWhatsapp: h.budgetPaths}[route];
}

for (const route of routes) {
  test(route + " review is bounded and grants no delivery", async () => {
    const h = await rcsHarness(undefined, "review");
    const before = h.fake.entries();
    const reads: string[] = [];
    h.fake.beforeRead = (path) => {
      reads.push(path);
    };
    const result = await reviewEventMessageSetup(h.db, selection(h, route),
      () => start);
    assert.deepEqual(h.fake.entries(), before);
    assert.equal(h.requests.length, 0);
    assert.equal(result.schemaVersion, 1);
    assert.equal(validateEventMessagingSetupReview(result), true);
    assert.equal(validateEventMessagingSetupReview({
      ...result,
      grantsDispatchAuthority: true,
    }), false);
    assert.equal(result.grantsDispatchAuthority, false);
    assert.equal(result.purpose, "joiningUpdate");
    assert.equal(result.runtime.appliesToPurpose, true);
    assert.equal(result.runtime.status, "unconfigured");
    assert.equal(result.runtime.selected, false);
    assert.equal(result.runtime.eventEnd, start + 3_600_000);
    assert.equal(result.sender?.availability, "eligible");
    assert.equal(result.budgets.kind, "reviewed");
    assert.ok(result.budgets.kind === "reviewed");
    assert.equal(result.budgets.currency, "INR");
    assert.match(result.budgets.sourceHash, /^[a-f0-9]{64}$/);
    for (const budget of [result.budgets.event, result.budgets.senderDay]) {
      assert.ok(budget.kind === "recorded");
      assert.equal(budget.issue, null);
      assert.equal(budget.remainingMicros, budget.limitMicros);
      assert.equal(budget.chargedMicros, 0);
      assert.match(budget.reviewHash, /^[a-f0-9]{64}$/);
    }
    assert.ok(reads.length <= 10, JSON.stringify(reads));
    const allowed = new Set(["events", "eventSuccessPlans",
      "eventAssistanceRuntimeConfigs", "eventAssistanceSmsSenders",
      "eventAssistanceRcsSenders", "organizerSenderConnections",
      "eventAssistanceWhatsappPolicies", "organizerMessageTemplates",
      "eventAssistanceBudgets"]);
    assert.ok(reads.every((path) => allowed.has(path.split("/")[0])));
    for (const field of ["secret", "credential", "principalEntityId",
      "phoneE164", "providerAccountId", "agentId"]) {
      assert.ok(!JSON.stringify(result).includes(field));
    }
  });

  test(route + " review retains charges and distinguishes missing limits",
    async () => {
      const h = await rcsHarness(undefined, "review");
      const [eventPath, dayPath] = paths(h, route);
      const event = (await h.read(eventPath))!;
      await h.write(eventPath, {...event, chargedMicros: 300_000,
        status: "paused", revision: 2});
      h.fake.remove(dayPath);
      const review = await reviewEventMessageSetup(h.db, selection(h, route),
        () => start);
      assert.ok(review.budgets.kind === "reviewed");
      assert.ok(review.budgets.event.kind === "recorded");
      assert.equal(review.budgets.event.issue, "paused");
      assert.equal(review.budgets.event.chargedMicros, 300_000);
      assert.equal(review.budgets.event.remainingMicros,
        event.limitMicros - 300_000);
      assert.equal(review.budgets.senderDay.kind, "unavailable");
      assert.deepEqual(review.budgets.senderDay,
        {...review.budgets.senderDay, reason: "missing"});
    });

  test(route + " review rejects mismatched, corrupt and future budget evidence",
    async () => {
      const h = await rcsHarness(undefined, "review");
      const [eventPath, dayPath] = paths(h, route);
      const event = (await h.read(eventPath))!;
      for (const patch of [await h.read(dayPath), {...event, private: "value"},
        {...event, updatedAt: start + 1}, {...event,
          chargedMicros: event.limitMicros + 1}]) {
        await h.write(eventPath, patch!);
        const review = await reviewEventMessageSetup(h.db, selection(h, route),
          () => start);
        assert.ok(review.budgets.kind === "reviewed");
        assert.deepEqual(review.budgets.event, {...review.budgets.event,
          kind: "unavailable", reason: "invalid"});
      }
      for (const [patch, issue] of [
        [{...event, endsAt: start}, "expired"],
        [{...event, chargedMicros: event.limitMicros}, "exhausted"],
      ] as const) {
        await h.write(eventPath, patch);
        const review = await reviewEventMessageSetup(h.db, selection(h, route),
          () => start);
        assert.ok(review.budgets.kind === "reviewed");
        assert.ok(review.budgets.event.kind === "recorded");
        assert.equal(review.budgets.event.issue, issue);
      }
    });
}

for (const route of routes) {
  test(route + " review checks the exact operational purpose", async () => {
    const h = await rcsHarness(undefined, "review");
    const input = selection(h, route, "planChanged");
    if (route === "catchEventRcs") {
      const sender = (await h.read(h.rcsSenderPath))!;
      await h.write(h.rcsSenderPath,
        {...sender, allowedPurposes: ["joiningUpdate"]});
    }
    const missing = await reviewEventMessageSetup(h.db, input, () => start);
    assert.equal(missing.sender?.availability, "templateUnavailable");
    assert.equal(missing.runtime.appliesToPurpose, false);
    assert.equal(missing.runtime.selected, false);
    if (route === "catchEventSms") {
      const path = "eventAssistanceSmsSenders/sms-review";
      const sender = (await h.read(path))!;
      await h.write(path, {...sender, templates:
        sender.templates.map((template: Record<string, unknown>) =>
          ({...template, purpose: "planChanged"}))});
    } else if (route === "catchEventRcs") {
      const sender = (await h.read(h.rcsSenderPath))!;
      await h.write(h.rcsSenderPath,
        {...sender, allowedPurposes: ["planChanged"]});
    } else {
      const policy = (await h.read(h.policyPath))!;
      await h.write(h.policyPath, {...policy, templates:
        policy.templates.map((template: Record<string, unknown>) =>
          ({...template, purpose: "planChanged"}))});
    }
    const eligible = await reviewEventMessageSetup(h.db, input, () => start);
    assert.equal(eligible.sender?.availability, "eligible");
    assert.equal(eligible.purpose, "planChanged");
    assert.equal(eligible.runtime.appliesToPurpose, false);
    assert.equal(eligible.runtime.selected, false);
  });
}

test("RCS setup distinguishes changed billing currency and agent", async () => {
  const h = await rcsHarness(undefined, "review");
  const path = h.rcsBudgetPaths[0];
  const original = (await h.read(path))!;
  for (const [patch, issue] of [[{currency: "USD"}, "currencyChanged"],
    [{agentId: "replacement-agent"}, "agentChanged"]] as const) {
    await h.write(path, {...original, ...patch});
    const result = await reviewEventMessageSetup(h.db,
      selection(h, "catchEventRcs"), () => start);
    assert.ok(result.budgets.kind === "reviewed");
    assert.ok(result.budgets.event.kind === "recorded");
    assert.equal(result.budgets.event.issue, issue);
  }
});

test("review reports saved selection separately from source and pause status",
  async () => {
    const h = await rcsHarness(undefined, "review");
    const input = selection(h, "catchEventRcs");
    const store = new EventAssistanceRuntimeConfigStore(h.db, () => start);
    const {view} = await store.get("host-1", {context: h.context});
    const saved = await store.set("host-1", {context: h.context,
      requestId: "configure-review", expectedRevision: view.revision,
      expectedSourceHash: view.sourceHash, command: {kind: "configure",
        configuration: {options: {routes: [{routeId: input.routeId,
          senderId: input.senderId}], responseDeadline: null,
        deliveryPolicy: {maxAttempts: 2, maxAttemptsPerRoute: 1,
          minimumRetrySeconds: 1}}, expiresAt: start + 100_000,
        maxEvaluations: 100}}});
    const current = await reviewEventMessageSetup(h.db, input, () => start);
    assert.equal(current.runtime.selected, true);
    assert.equal(current.runtime.appliesToPurpose, true);
    assert.equal(current.runtime.status, "configured");
    await h.write("events/" + h.context.eventId, {...h.progress.event,
      startTime: {_seconds: start / 1000, _nanoseconds: 0}});
    const changed = await reviewEventMessageSetup(h.db, input, () => start);
    assert.equal(changed.runtime.status, "sourceChanged");
    await store.set("host-1", {context: h.context, requestId: "pause-review",
      expectedRevision: saved.view.revision,
      expectedSourceHash: changed.runtime.sourceHash,
      command: {kind: "pause"}});
    const paused = await reviewEventMessageSetup(h.db, input, () => start);
    assert.equal(paused.runtime.status, "paused");
    assert.equal(paused.runtime.selected, true);
    assert.equal(paused.grantsDispatchAuthority, false);
    const otherPurpose = await reviewEventMessageSetup(h.db,
      {...input, purpose: "planChanged"}, () => start);
    assert.equal(otherPurpose.runtime.appliesToPurpose, false);
    assert.equal(otherPurpose.runtime.selected, false);
  });

test("foreign or invalid WhatsApp provisioning cannot reveal its budgets",
  async () => {
    const h = await rcsHarness(undefined, "review");
    const original = (await h.read(h.policyPath))!;
    for (const patch of [{organizerId: "foreign"},
      {providerAccountId: "99999"}]) {
      await h.write(h.policyPath, {...original, ...patch});
      const result = await reviewEventMessageSetup(h.db,
        selection(h, "organizerEventWhatsapp"), () => start);
      assert.deepEqual(result.budgets, {kind: "senderUnavailable"});
    }
  });

test("read failures and a billing-day rollover require another complete review",
  async () => {
    const h = await rcsHarness(undefined, "review");
    h.fake.beforeRead = (path) => {
      if (path === h.rcsBudgetPaths[1]) throw new Error("read unavailable");
    };
    await assert.rejects(reviewEventMessageSetup(h.db,
      selection(h, "catchEventRcs"), () => start), /read unavailable/);
    h.fake.beforeRead = undefined;
    for (const [route, boundary] of [
      ["catchEventSms", "2026-09-07T18:30:00Z"],
      ["catchEventRcs", "2026-09-08T00:00:00Z"],
      ["organizerEventWhatsapp", "2026-09-08T00:00:00Z"],
    ] as const) {
      let calls = 0;
      await assert.rejects(reviewEventMessageSetup(h.db, selection(h, route),
        () => ++calls === 1 ? Date.parse(boundary) - 1 : Date.parse(boundary)),
      /crossed a billing day/);
    }
  });

test("Firestore setup review reads each channel without modifying budgets", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const key = randomUUID();
  const app = initializeApp({projectId: "demo-setup-" + key.slice(0, 8)},
    "setup-review-" + key);
  const db = getEmulatorFirestore(app);
  try {
    const h = await rcsHarness(db, "review");
    const budgetPaths = routes.flatMap((route) => paths(h, route));
    const before = await Promise.all(budgetPaths.map(h.read));
    for (const route of routes) {
      const result = await reviewEventMessageSetup(db, selection(h, route),
        () => start);
      assert.ok(result.budgets.kind === "reviewed");
      assert.equal(result.budgets.event.kind, "recorded");
      assert.equal(result.budgets.senderDay.kind, "recorded");
      assert.equal(result.grantsDispatchAuthority, false);
    }
    assert.deepEqual(await Promise.all(budgetPaths.map(h.read)), before);
    assert.equal(h.requests.length, 0);
  } finally {
    for (const collection of await db.listCollections()) {
      for (const doc of (await collection.get()).docs) await doc.ref.delete();
    }
    await deleteApp(app);
  }
});
