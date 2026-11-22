import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore} from "firebase-admin/firestore";
import {operationCollections} from "../../operations/collections";
import {EVENT_PLAN_CHANGES, eventPlanChangeSourceId} from
  "../../events/planChangeRecords";
import {guestCollections, guestIdentity, parseGuest} from "./guestRecords";
import {EventAssistanceSettingsStore} from "./policySettingsStore";
import {OperationalNoticeFanoutStore} from
  "./operationalNoticeFanoutStore";
import {enqueuePlanChangeNoticeFanout, enqueuePostEventFollowUpFanout} from
  "./operationalNoticeFanoutSignals";
import {rcsHarness} from "./rcsDispatchTestHarness";
import {start} from "./whatsappTestHarness";
import {processChangedAssistanceWork} from "./liveWorkTriggers";
import {AssistanceCheckpointWorkStore} from "./checkpointWorkStore";
import {AssistanceDeliveryWorkStore} from "./deliveryWorkStore";
import {AssistanceRosterWorkStore} from "./rosterWorkStore";
import {AssistanceSourceWorkStore} from "./sourceWorkStore";
import {LiveAssistanceWorkRunner} from "./liveWorkRunner";

const stamp = (millis: number) => ({_seconds: Math.floor(millis / 1000),
  _nanoseconds: millis % 1000 * 1_000_000});
const attendeeFixture = () => JSON.parse(readFileSync(
  "../contracts/fixtures/valid/event_attendee_doc.json", "utf8"));

async function setup(count = 1, realDb?: Firestore) {
  const h = await rcsHarness(realDb, randomUUID(), ["catchEventRcs"]);
  const settings = new EventAssistanceSettingsStore(h.db, () => h.clock.now);
  const scope = {context: h.context, groupId: "event:whole",
    workflowKind: "planChangeCommunication" as const};
  const view = (await settings.get("host-1", scope)).view;
  const saved = await settings.set("host-1", {...scope,
    requestId: randomUUID(), expectedRevision: view.ownRevision,
    expectedSourceHash: view.sourceHash,
    preference: {kind: "configured", template: {
      kind: "planChangeCommunication", version: 1,
      setting: {kind: "enabled", authority: "executeWithinPolicy"},
      config: {templateIntent: "planChange", audience: "affectedGuests",
        maximumPerGuest: 1, expiryMinutes: 30, delivery: {
          routes: [{routeId: "catchEventRcs",
            senderId: h.rcsConfig.senderId}],
          policy: {maxAttempts: 2, maxAttemptsPerRoute: 1,
            minimumRetrySeconds: 1}}}}}});
  const original = {...attendeeFixture(), eventId: h.context.eventId,
    organizerId: h.context.organizerId,
    status: "registered", linkedUid: h.actor.uid, phoneE164: h.actor.phone,
    createdAt: stamp(start - 10_000), updatedAt: stamp(start - 1_000),
    registeredAt: stamp(start - 10_000), checkedInAt: null,
    checkedInBy: null};
  await h.write(h.attendeePath, original);
  const attendeeIds = [h.scope.attendeeId];
  for (let i = 1; i < count; i++) {
    const attendeeId = `fanout-${i.toString().padStart(3, "0")}`;
    attendeeIds.push(attendeeId);
    await h.write(`eventAttendees/${attendeeId}`, {...original,
      linkedUid: `guest-${i}`});
  }
  const event = await h.read(`events/${h.context.eventId}`);
  await h.write(`events/${h.context.eventId}`,
    {...event, planChangeRevision: 1});
  const sourceId = eventPlanChangeSourceId(h.context.eventId, 1);
  const source = {schemaVersion: 1, sourceId, eventId: h.context.eventId,
    organizerId: h.context.organizerId, revision: 1,
    changedFields: ["meetingLocation"], eventTitle: "Friday social",
    startTime: stamp(start - 1_000), endTime: stamp(start + 3_600_000),
    meetingPoint: "Second venue", itineraryStopCount: 2,
    occurredAt: stamp(start), validUntil: stamp(start + 3_600_000),
    createdBy: "host-1"};
  await h.write(`${EVENT_PLAN_CHANGES}/${sourceId}`, source);
  const fanout = new OperationalNoticeFanoutStore(h.db, () => h.clock.now);
  const queued = await enqueuePlanChangeNoticeFanout(h.db, sourceId, source,
    fanout);
  assert.ok(queued?.kind === "queued");
  return {h, settings, scope, saved, attendeeIds, sourceId, source, fanout,
    queued};
}

test("operational notice fanout resumes across bounded attendee pages",
  async () => {
    const f = await setup(23);
    const replay = await enqueuePlanChangeNoticeFanout(f.h.db, f.sourceId,
      f.source, f.fanout);
    assert.ok(replay?.kind === "queued");
    assert.equal(replay.replayed, true);
    await f.fanout.process(f.queued.item.workItemId);
    const first = await f.fanout.get(f.queued.item.workItemId);
    assert.equal(first.payload.checkpoint.phase, "scan");
    assert.equal(first.payload.checkpoint.visited, 20);
    assert.equal(first.payload.checkpoint.published, 20);
    await f.fanout.process(f.queued.item.workItemId);
    const complete = await f.fanout.get(f.queued.item.workItemId);
    assert.equal(complete.payload.checkpoint.phase, "complete");
    assert.equal(complete.payload.checkpoint.visited, 23);
    assert.equal(complete.payload.checkpoint.published, 23);
    assert.equal(complete.payload.checkpoint.skipped, 0);
    assert.equal(complete.run.counters.published, 23);
    assert.equal(f.h.fake.entries().filter(([path, value]) =>
      path.startsWith("eventAssistanceMessages/") &&
      (value as {intent?: {kind?: string}}).intent?.kind ===
        "operationalNotice").length, 23);
    for (const attendeeId of f.attendeeIds) {
      const guest = parseGuest(await f.h.read(`${guestCollections.guests}/${
        guestIdentity(f.h.context, attendeeId)}`));
      assert.match(guest.episodeId, /^episode:[a-f0-9]{64}$/);
    }
    assert.deepEqual(await f.fanout.listDue(10), []);
    assert.equal((await f.fanout.process(f.queued.item.workItemId)).kind,
      "idle");
  });

test("a policy revision change stops unfinished fanout before publication",
  async () => {
    const f = await setup();
    await f.settings.set("host-1", {...f.scope, requestId: randomUUID(),
      expectedRevision: f.saved.view.ownRevision,
      expectedSourceHash: f.saved.view.sourceHash,
      preference: {kind: "disabled"}});
    await f.fanout.process(f.queued.item.workItemId);
    const stopped = await f.fanout.get(f.queued.item.workItemId);
    assert.equal(stopped.payload.checkpoint.phase, "stopped");
    assert.equal(stopped.payload.checkpoint.stopReason, "policyUnavailable");
    assert.equal(stopped.payload.checkpoint.visited, 0);
    assert.equal(f.h.fake.entries().filter(([path]) =>
      path.startsWith("eventAssistanceMessages/")).length, 1,
    "the harness message is the only pre-existing message");
  });

test("post-event fanout waits and skips guests who did not attend",
  async () => {
    const eventEnd = start + 60_000;
    const h = await rcsHarness(undefined, randomUUID(), ["catchEventRcs"],
      eventEnd);
    const settings = new EventAssistanceSettingsStore(h.db,
      () => h.clock.now);
    const scope = {context: h.context, groupId: "event:whole",
      workflowKind: "postEventFollowUp" as const};
    const view = (await settings.get("host-1", scope)).view;
    await settings.set("host-1", {...scope, requestId: randomUUID(),
      expectedRevision: view.ownRevision,
      expectedSourceHash: view.sourceHash,
      preference: {kind: "configured", template: {
        kind: "postEventFollowUp", version: 1,
        setting: {kind: "enabled", authority: "executeWithinPolicy"},
        config: {templateIntent: "followUp", audience: "affectedGuests",
          maximumPerGuest: 1, expiryMinutes: 60, delivery: {
            routes: [{routeId: "catchEventRcs",
              senderId: h.rcsConfig.senderId}],
            policy: {maxAttempts: 2, maxAttemptsPerRoute: 1,
              minimumRetrySeconds: 1}}}}}});
    const checkedIn = {...attendeeFixture(), eventId: h.context.eventId,
      organizerId: h.context.organizerId,
      status: "checkedIn", linkedUid: h.actor.uid, phoneE164: h.actor.phone,
      createdAt: stamp(start - 10_000), updatedAt: stamp(start - 1_000),
      registeredAt: stamp(start - 10_000), checkedInAt: stamp(start - 1_000),
      checkedInBy: "host-1"};
    await h.write(h.attendeePath, checkedIn);
    await h.write("eventAttendees/no-show", {...checkedIn,
      status: "registered", linkedUid: "no-show", checkedInAt: null,
      checkedInBy: null});
    const planPath = `eventSuccessPlans/${h.context.eventId}`;
    const plan = await h.read(planPath);
    const complete = {...plan, status: "complete", liveControlRevision: 2,
      completedAt: stamp(start), updatedAt: stamp(start)};
    await h.write(planPath, complete);
    const fanout = new OperationalNoticeFanoutStore(h.db, () => h.clock.now);
    const queued = await enqueuePostEventFollowUpFanout(h.db,
      h.context.eventId, complete, fanout);
    assert.ok(queued?.kind === "queued");
    assert.equal(queued.payload.checkpoint.dueAt, eventEnd);
    assert.deepEqual(await fanout.listDue(10), []);
    assert.equal((await fanout.process(queued.item.workItemId)).kind, "idle");
    h.clock.now = eventEnd + 1;
    await fanout.process(queued.item.workItemId);
    const done = await fanout.get(queued.item.workItemId);
    assert.equal(done.payload.checkpoint.phase, "complete");
    assert.equal(done.payload.checkpoint.visited, 2);
    assert.equal(done.payload.checkpoint.published, 1);
    assert.equal(done.payload.checkpoint.skipped, 1);
  });

test("work trigger dispatches due notice fanout and ignores future work",
  async () => {
    const f = await setup();
    let calls = 0;
    const worker = {
      notice: {process: async (id: string) => {
        assert.equal(id, f.queued.item.workItemId);
        calls += 1;
        return f.fanout.process(id);
      }, listDue: async () => []},
      checkpoint: new AssistanceCheckpointWorkStore(f.h.db,
        () => f.h.clock.now),
      delivery: new AssistanceDeliveryWorkStore(f.h.db,
        () => f.h.clock.now),
      roster: new AssistanceRosterWorkStore(f.h.db, () => f.h.clock.now),
      source: new AssistanceSourceWorkStore(f.h.db, () => f.h.clock.now),
      guest: new LiveAssistanceWorkRunner(f.h.db, () => f.h.clock.now),
    };
    await processChangedAssistanceWork(f.queued.item.workItemId,
      f.queued.item, worker, f.h.clock.now);
    assert.equal(calls, 1);
    const future = {...f.queued.item, normalizedPayload: {
      ...f.queued.payload, checkpoint: {...f.queued.payload.checkpoint,
        dueAt: f.h.clock.now + 1}}};
    await processChangedAssistanceWork(f.queued.item.workItemId, future,
      worker, f.h.clock.now);
    assert.equal(calls, 1);
    assert.ok(f.h.fake.read(`${operationCollections.workItems}/${
      f.queued.item.workItemId}`));
  });

test("Firestore arbitrates notice fanout and indexed due work", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  try {
    const f = await setup(2, getEmulatorFirestore(app));
    const id = f.queued.item.workItemId;
    assert.ok((await f.fanout.listDue(100)).includes(id));
    const results = await Promise.all([
      f.fanout.process(id), f.fanout.process(id),
    ]);
    assert.equal(results.filter((result) =>
      result.kind === "committed").length, 1);
    const done = await f.fanout.get(id);
    assert.equal(done.payload.checkpoint.phase, "complete");
    assert.equal(done.payload.checkpoint.published, 2);
    const receipts = await f.h.db.collection(
      operationCollections.actionReceipts)
      .where("workItemId", "==", id).get();
    assert.equal(receipts.size, 1);
    assert.ok(!(await f.fanout.listDue(100)).includes(id));
  } finally {
    await deleteApp(app);
  }
});
