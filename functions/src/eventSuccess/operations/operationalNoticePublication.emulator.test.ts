import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore} from "firebase-admin/firestore";
import {operationCollections} from "../../operations/collections";
import {EventAssistanceSettingsStore} from "./policySettingsStore";
import {deliveryWorkIds} from "./deliveryWorkRecords";
import {rcsHarness} from "./rcsDispatchTestHarness";
import {start} from "./whatsappTestHarness";
import {
  OPERATIONAL_NOTICE_PUBLICATIONS,
  OPERATIONAL_NOTICE_QUOTAS,
  OperationalNoticePublisher,
  OperationalNoticeSource,
  OperationalNoticeSourceReader,
} from "./operationalNoticePublication";

async function setup(maximumPerGuest = 1, realDb?: Firestore) {
  const h = await rcsHarness(realDb, randomUUID(), ["catchEventRcs"]);
  const settings = new EventAssistanceSettingsStore(h.db, () => h.clock.now);
  const settingScope = {context: h.context, groupId: "event:whole",
    workflowKind: "planChangeCommunication" as const};
  const view = (await settings.get("host-1", settingScope)).view;
  const saved = await settings.set("host-1", {...settingScope,
    requestId: randomUUID(),
    expectedRevision: view.ownRevision, expectedSourceHash: view.sourceHash,
    preference: {kind: "configured", template: {
      kind: "planChangeCommunication", version: 1,
      setting: {kind: "enabled", authority: "executeWithinPolicy"},
      config: {templateIntent: "planChange", audience: "affectedGuests",
        maximumPerGuest, expiryMinutes: 30, delivery: {
          routes: [{routeId: "catchEventRcs",
            senderId: h.rcsConfig.senderId}],
          policy: {maxAttempts: 2, maxAttemptsPerRoute: 1,
            minimumRetrySeconds: 1}}}}}});
  let source: OperationalNoticeSource<"planChange"> = {
    kind: "planChange", context: h.context, eventId: h.context.eventId,
    attendeeId: h.scope.attendeeId, groupId: "event:whole",
    sourceId: "plan-change-1", revision: 2, occurredAt: start,
    validUntil: start + 20 * 60_000, title: "Meeting point updated",
    body: "Meet us at the first venue.", choices: [{choiceId: "ack",
      label: "Got it", value: {kind: "acknowledge"}}]};
  const reader: OperationalNoticeSourceReader<"planChange"> = {
    kind: "planChange",
    read: async (_db, _tx, request) =>
      request.source.sourceId === source.sourceId ?
        structuredClone(source) : null,
  };
  const publisher = new OperationalNoticePublisher(h.db, reader,
    () => h.clock.now);
  assert.ok(saved.view.own);
  const request = {context: h.context, attendeeId: h.scope.attendeeId,
    episodeId: h.intent.episodeId, policyBinding: {
      groupId: saved.view.own.groupId, settingId: saved.view.own.settingId,
      expectedRevision: saved.view.own.revision},
    source: {kind: "planChange" as const,
      sourceId: source.sourceId, expectedRevision: source.revision}};
  return {h, settings, settingScope, publisher, request,
    source: () => source,
    replaceSource: (next: OperationalNoticeSource<"planChange">) => {
      source = structuredClone(next);
    }};
}

test("trusted source publication creates one capped message and replays",
  async () => {
    const f = await setup();
    const first = await f.publisher.publish(f.request);
    assert.equal(first.kind, "published");
    assert.equal(first.ordinal, 1);
    assert.deepEqual(first.intent.automation?.routes, [{
      routeId: "catchEventRcs", senderId: f.h.rcsConfig.senderId}]);
    assert.deepEqual(first.intent.deliveryPolicy, {maxAttempts: 2,
      maxAttemptsPerRoute: 1, minimumRetrySeconds: 1});
    const work = deliveryWorkIds(first.messageId);
    assert.ok(f.h.fake.read(operationCollections.runs + "/" + work.runId));
    assert.ok(f.h.fake.read(operationCollections.workItems + "/" +
      work.workItemId));
    assert.equal(f.h.fake.entries().filter(([path]) =>
      path.startsWith(OPERATIONAL_NOTICE_QUOTAS + "/")).length, 1);
    assert.equal(f.h.fake.entries().filter(([path]) =>
      path.startsWith(OPERATIONAL_NOTICE_PUBLICATIONS + "/")).length, 1);

    const replay = await f.publisher.publish(f.request);
    assert.equal(replay.kind, "replayed");
    assert.equal(replay.messageId, first.messageId);
    assert.equal(f.h.fake.entries().filter(([path]) =>
      path.startsWith(OPERATIONAL_NOTICE_PUBLICATIONS + "/")).length, 1);

    const otherEpisode = await f.publisher.publish({...f.request,
      episodeId: "episode:replacement"});
    assert.deepEqual(otherEpisode,
      {kind: "held", reason: "sourceAlreadyPublished"});

    const secondSource = {...f.source(), sourceId: "plan-change-2",
      revision: 1, title: "Venue updated", body: "Meet at the next venue."};
    f.replaceSource(secondSource);
    const capped = await f.publisher.publish({...f.request, source: {
      kind: "planChange", sourceId: secondSource.sourceId,
      expectedRevision: secondSource.revision}});
    assert.deepEqual(capped, {kind: "held", reason: "quotaReached"});
  });

test("publication requires exact source revision and current execution policy",
  async () => {
    const f = await setup(2);
    const changed = await f.publisher.publish({...f.request, source: {
      ...f.request.source, expectedRevision: f.request.source.expectedRevision -
        1}});
    assert.deepEqual(changed, {kind: "held", reason: "sourceChanged"});
    const view = (await f.settings.get("host-1", f.settingScope)).view;
    await f.settings.set("host-1", {...f.settingScope,
      requestId: randomUUID(), expectedRevision: view.ownRevision,
      expectedSourceHash: view.sourceHash,
      preference: {kind: "disabled"}});
    const held = await f.publisher.publish(f.request);
    assert.deepEqual(held, {kind: "held", reason: "policyUnavailable"});
    assert.equal(f.h.fake.entries().filter(([path]) =>
      path.startsWith(OPERATIONAL_NOTICE_PUBLICATIONS + "/")).length, 0);
  });

test("message, delivery work, quota and receipt share one commit", async () => {
  const f = await setup(2);
  f.h.fake.failNextCommit = true;
  await assert.rejects(f.publisher.publish(f.request),
    /injected transaction interruption/);
  assert.equal(f.h.fake.entries().filter(([path]) =>
    path.startsWith(OPERATIONAL_NOTICE_QUOTAS + "/") ||
    path.startsWith(OPERATIONAL_NOTICE_PUBLICATIONS + "/")).length, 0);
  const published = await f.publisher.publish(f.request);
  assert.equal(published.kind, "published");
  assert.equal(published.ordinal, 1);
});

test("execution policy rejects a sender that is not currently eligible",
  async () => {
    const f = await setup(2);
    const view = (await f.settings.get("host-1", f.settingScope)).view;
    await assert.rejects(f.settings.set("host-1", {...f.settingScope,
      requestId: randomUUID(), expectedRevision: view.ownRevision,
      expectedSourceHash: view.sourceHash,
      preference: {kind: "configured", template: {
        kind: "planChangeCommunication", version: 1,
        setting: {kind: "enabled", authority: "executeWithinPolicy"},
        config: {templateIntent: "planChange", audience: "affectedGuests",
          maximumPerGuest: 2, expiryMinutes: 30, delivery: {
            routes: [{routeId: "catchEventRcs", senderId: "missing-sender"}],
            policy: {maxAttempts: 2, maxAttemptsPerRoute: 1,
              minimumRetrySeconds: 1}}}}}}),
    {code: "failed-precondition"});
  });

test("a source adapter cannot redirect a notice to another guest", async () => {
  const f = await setup(2);
  f.replaceSource({...f.source(), attendeeId: "another-attendee"});
  await assert.rejects(f.publisher.publish(f.request),
    /source is outside its request/);
  assert.equal(f.h.fake.entries().filter(([path]) =>
    path.startsWith(OPERATIONAL_NOTICE_PUBLICATIONS + "/")).length, 0);
});

test("Firestore serializes competing source publications", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  try {
    const db = getEmulatorFirestore(app);
    const f = await setup(1, db);
    const results = await Promise.all(Array.from({length: 8}, () =>
      f.publisher.publish(f.request)));
    assert.equal(results.filter((result) =>
      result.kind === "published").length, 1);
    assert.equal(results.filter((result) =>
      result.kind === "replayed").length, 7);
    const [quotas, publications] = await Promise.all([
      db.collection(OPERATIONAL_NOTICE_QUOTAS)
        .where("eventId", "==", f.h.context.eventId).get(),
      db.collection(OPERATIONAL_NOTICE_PUBLICATIONS)
        .where("eventId", "==", f.h.context.eventId).get(),
    ]);
    assert.equal(quotas.size, 1);
    assert.equal(quotas.docs[0].data().count, 1);
    assert.equal(publications.size, 1);
  } finally {
    await deleteApp(app);
  }
});
