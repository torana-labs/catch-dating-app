import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {start} from "./whatsappTestHarness";
import {prepareLiveLateJoinPublication} from
  "./liveLateJoinPublication";
import {parseMessageRecord} from "./messageOutbox";
import {parseMessageIntent} from "./messageProtocol";
import {messageAllowsSender} from "./lateJoinDispatchPolicy";
import {EVENT_ASSISTANCE_MESSAGES} from "./firestoreMessageOutbox";
import {guestCollections, parseGuest, guestIdentity} from "./guestRecords";
import {readLateJoinMessageHistory} from "./lateJoinMessageHistory";
import {setupRuntimePublication as setup} from "./runtimeConfigTestHarness";

test("automatic publication reuses immutable content after clock advance",
  async () => {
    const h = await setup();
    const first = await h.publishReady();
    const before = h.fake.entries();
    h.clock.now += 1000;
    const retry = await h.publishReady();
    assert.equal(retry.messageId, first.messageId);
    assert.equal(retry.intent.createdAt, first.intent.createdAt);
    assert.equal(retry.thread.revision, first.thread.revision);
    assert.equal(retry.replayed, true);
    assert.deepEqual(h.fake.entries(), before);
    assert.equal(first.intent.kind, "joiningUpdate");
    assert.ok(first.intent.kind === "joiningUpdate" && first.intent.automation);
    assert.ok(messageAllowsSender(first.intent, "organizerEventWhatsapp",
      h.options.routes[0].senderId));
    assert.ok(!messageAllowsSender(first.intent, "organizerEventWhatsapp",
      "foreign-sender"));
    assert.ok(!messageAllowsSender(first.intent, "catchEventSms", "sms"));
  });

test("automatic publication rejects inconsistent authority and stale episodes",
  async () => {
    const h = await setup();
    const first = await h.publishReady();
    assert.ok(first.intent.kind === "joiningUpdate");
    const intent = first.intent;
    const automation = intent.automation!;
    for (const value of [
      {...intent, automation: {...automation, routes: []}},
      {...intent, automation: {...automation,
        routes: [automation.routes[0], automation.routes[0]]}},
      {...intent, permittedRoutes: ["catchEventSms"]},
      {...intent, workflow: {...intent.workflow, kind: "guestCheckIn"}},
      {...intent, automation: {...automation, arbitraryAuthority: true}},
    ]) assert.throws(() => parseMessageIntent(value));
    assert.deepEqual(await h.publisher.publish({...h.scope, episodeId: "old"},
      h.options), {kind: "episodeChanged"});
    await h.guests.startEpisode(h.context, h.scope.attendeeId, "reentry", 0);
    assert.deepEqual(await h.publish(), {kind: "episodeChanged"});
  });

test("publication commits no partial thread or message when interrupted",
  async () => {
    const h = await setup();
    const before = h.fake.entries();
    h.fake.failNextCommit = true;
    await assert.rejects(h.publish(), /interruption/);
    assert.deepEqual(h.fake.entries(), before);
    const retry = await h.publishReady();
    assert.equal(retry.replayed, false);
    const item = parseMessageRecord(await h.read(EVENT_ASSISTANCE_MESSAGES +
      "/" + retry.messageId));
    assert.equal(item.attempts.length, 0);
    assert.equal(item.intent.kind, "joiningUpdate");
  });

test("expired preparation cannot stage its writes in a later checkpoint",
  async () => {
    const h = await setup();
    const before = h.fake.entries();
    await assert.rejects(h.db.runTransaction(async (tx) => {
      const result = await prepareLiveLateJoinPublication(h.db, tx, h.scope,
        h.options, () => h.clock.now);
      assert.ok(result.kind === "prepared");
      h.clock.now = result.validUntil;
      result.commit();
    }), /snapshot expired/);
    assert.deepEqual(h.fake.entries(), before);
  });

test("a suggestion and an absent required deadline never publish",
  async () => {
    const h = await setup();
    await h.configure({...h.template,
      setting: {kind: "enabled", authority: "prepare"}});
    const before = h.fake.entries();
    assert.equal((await h.publish()).kind, "evaluated");
    assert.deepEqual(h.fake.entries(), before);
    await h.configure({...h.template, config: {...h.template.config,
      unanswered: "hostReviewAtDeadline"}});
    const result = await h.publish();
    assert.ok(result.kind === "held");
    assert.equal(result.evaluation.kind, "responseDeadlineMissing");
  });

test("reserved intent keeps its episode slot through final policy recheck",
  async () => {
    const h = await setup();
    await h.configure({...h.template, config: {...h.template.config,
      maxMessagesPerEpisode: 1}});
    const first = await h.publishReady();
    const d = await h.delivery(first);
    assert.equal((await d.reserve()).decision.kind, "dispatch");
    const history = await h.db.runTransaction((tx) =>
      readLateJoinMessageHistory(h.db, tx, h.scope, h.clock.now));
    assert.ok(history.kind === "ready");
    assert.equal(history.facts.messagesThisEpisode, 1);
    assert.equal((await d.claim()).kind, "claimed");
    const retry = await h.publishReady();
    assert.equal(retry.replayed, true);
    assert.equal((await d.reserve()).decision.kind, "reconcile");
  });

test("host disabling or changing a policy withholds a previously reserved send",
  async () => {
    for (const change of ["disabled", "prepare", "revision"] as const) {
      const h = await setup();
      const first = await h.publishReady();
      const d = await h.delivery(first);
      const reserved = await d.reserve();
      assert.equal(reserved.decision.kind, "dispatch");
      await h.configure(change === "disabled" ? "disabled" :
        change === "prepare" ? {...h.template,
          setting: {kind: "enabled", authority: "prepare"}} :
          {...h.template, config: {...h.template.config,
            maxMessagesPerEpisode: 2}});
      const attempt = reserved.record.attempts[0];
      assert.equal((await d.outbox.claimLiveDispatch(first.messageId,
        attempt.attemptId, h.store.prepare(d.link.linkId,
          (await h.store.sender())!))).kind, "withheld");
      for (const path of h.budgetPaths) {
        assert.equal((await h.read(path))?.chargedMicros, 0);
      }
    }
  });

test("new guidance updates the guest page while cooldown withholds outreach",
  async () => {
    const h = await setup();
    const first = await h.publishReady();
    const d = await h.delivery(first);
    assert.equal((await d.claim()).kind, "claimed");
    const updated = await h.progress.confirm("two");
    const next = await h.publishReady();
    assert.notEqual(next.messageId, first.messageId);
    assert.equal(next.thread.threadId, first.thread.threadId);
    const view = await h.guests.getView(d.link.linkId, d.link.secret);
    assert.ok(view.status === "ready");
    assert.equal(view.text, updated.text);
    const nextDelivery = await h.delivery(next);
    assert.equal((await nextDelivery.reserve()).decision.kind, "stop");
    assert.ok(next.evaluation.decision.kind === "update");
    assert.equal(next.evaluation.decision.nextEvaluationAt, start + 600_000);
    h.clock.now = start + 600_000;
    assert.equal((await nextDelivery.reserve()).decision.kind, "dispatch");
  });

test("dispatch history rejects missing, changed and conflicting evidence",
  async () => {
    const h = await setup();
    const first = await h.publishReady();
    const d = await h.delivery(first);
    await d.reserve();
    const history = (intent = first.intent) => h.db.runTransaction((tx) =>
      readLateJoinMessageHistory(h.db, tx, h.scope, h.clock.now, intent));
    const counted = await history();
    assert.ok(counted.kind === "ready");
    assert.equal(counted.facts.messagesThisEpisode, 0);
    const full = await h.db.runTransaction((tx) =>
      readLateJoinMessageHistory(h.db, tx, h.scope, h.clock.now));
    assert.ok(full.kind === "ready");
    assert.equal(full.facts.messagesThisEpisode, 1);
    assert.notEqual(full.evidenceHash, counted.evidenceHash);
    await assert.rejects(history({...first.intent, expiresAt:
      first.intent.expiresAt - 1}), /does not match/);
    await assert.rejects(history({...first.intent, intentId: "missing"}),
      /absent/);
    const record = (await d.outbox.get(first.messageId))!;
    await h.write(EVENT_ASSISTANCE_MESSAGES + "/" + first.messageId,
      {...record, deliveryConflict: true});
    assert.deepEqual(await history(), {kind: "unavailable",
      reason: "deliveryConflict"});
  });

test("Firestore arbitrates publication, final claims and host edits", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  try {
    const h = await setup(getEmulatorFirestore(app));
    await h.configure({...h.template, config: {...h.template.config,
      maxMessagesPerEpisode: 1}});
    const [a, b] = await Promise.all([h.publishReady(), h.publishReady()]);
    assert.equal(a.messageId, b.messageId);
    assert.equal(Number(a.replayed) + Number(b.replayed), 1);
    const d = await h.delivery(a);
    const reserved = await d.reserve();
    const attempt = reserved.record.attempts.at(-1)!;
    const claim = () => d.outbox.claimLiveDispatch(a.messageId,
      attempt.attemptId, h.store.prepare(d.link.linkId, h.expected));
    // Pass current template-policy evidence at the final resource boundary.
    const expected = (await h.store.sender())!;
    const results = await Promise.all([d.outbox.claimLiveDispatch(a.messageId,
      attempt.attemptId, h.store.prepare(d.link.linkId, expected)),
    d.outbox.claimLiveDispatch(a.messageId, attempt.attemptId,
      h.store.prepare(d.link.linkId, expected))]);
    assert.equal(results.filter((r) => r.kind === "claimed").length, 1);
    assert.equal((await claim()).kind, "withheld");
    await h.progress.confirm("two");
    const next = await h.publishReady();
    assert.ok(next.evaluation.decision.kind === "update" &&
      !next.evaluation.decision.shouldSend);
    h.clock.now += 600_000;
    assert.equal((await (await h.delivery(next)).reserve()).decision.kind,
      "stop", "episode cap still includes the superseded first intent");
    await h.configure("disabled");
    assert.equal((await h.publish()).kind, "held");
    const guest = parseGuest(await h.read(guestCollections.guests + "/" +
      guestIdentity(h.context, h.scope.attendeeId)));
    assert.equal(guest.intention.kind, "unknown");
    assert.equal((await h.read(h.attendeePath))?.status, "registered");
  } finally {
    await deleteApp(app);
  }
});
