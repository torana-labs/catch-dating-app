import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {operationCollections} from "../../operations/collections";
import type {RepairEventAssistanceDeliveryCallablePayload as Command} from
  "../../shared/generated/repairEventAssistanceDeliveryCallablePayload";
import {validateEventAssistanceDeliveriesCallableResponse} from
  "../../shared/generated/validators/eventAssistanceDeliveriesOutput";
import {DELIVERY_REPAIRS, EventAssistanceDeliveriesStore} from
  "./hostDeliveriesStore";
import {listEventAssistanceDeliveriesHandler,
  repairEventAssistanceDeliveryHandler} from "./hostDeliveriesHandlers";
import {hostDeliveryStatus} from "./hostDeliveryRecords";
import {guestCollections, guestIdentity} from "./guestRecords";
import {EVENT_ASSISTANCE_MESSAGES} from "./firestoreMessageOutbox";
import {MessageRecord, newMessageRecord} from "./messageOutbox";
import {deliveryWorkIds} from "./deliveryWorkRecords";
import {AssistanceDeliveryWorkStore} from "./deliveryWorkStore";
import {setupRuntimePublication} from "./runtimeConfigTestHarness";
import type {VerifiedDeliveryReceipt} from "./deliveryReceipts";

const manager = "host-1";
async function harness(db?: Firestore,
  fixtureId?: ReturnType<typeof randomUUID>) {
  const h = await setupRuntimePublication(db, fixtureId);
  const published = await h.publishReady();
  const delivery = await h.delivery(published);
  const store = new EventAssistanceDeliveriesStore(h.db, () => h.clock.now);
  const input = {context: h.context, cursor: null};
  const list = () => store.list(manager, input);
  const view = async () => (await list()).deliveries.find((m) =>
    m.messageId === published.messageId)!;
  const command = async (): Promise<Command> => {
    const row = await view();
    return {expectedMessageRevision: row.revision,
      expectedReviewHash: row.reviewHash, command: {kind: "repairDelivery",
        context: h.context, eventId: h.context.eventId,
        operationId: randomUUID(), payload: {deliveryId: row.messageId,
          action: "manualHandoff"}}};
  };
  const record = async () => (await h.outbox.get(published.messageId))!;
  const path = EVENT_ASSISTANCE_MESSAGES + "/" + published.messageId;
  const receipt = async (state: VerifiedDeliveryReceipt["state"]) => {
    const attempt = (await record()).attempts.at(-1)!;
    assert.ok(attempt.mode === "live");
    return h.outbox.recordReceipt(published.messageId, {...attempt.binding,
      attemptId: attempt.attemptId, providerEventId: randomUUID(),
      receivedAt: h.clock.now, state});
  };
  return {...h, published, delivery, reviewStore: store, input, list, view,
    command, record, path, receipt};
}

test("delivery review separates evidence, coordination and host ownership",
  async () => {
    const h = await harness();
    const before = h.fake.entries();
    const result = await h.list();
    assert.equal(result.coverage, "page");
    assert.equal(result.deliveries.length, 2);
    const row = await h.view();
    assert.equal(row.availability, "current");
    assert.equal(row.attendeeId, h.scope.attendeeId);
    assert.equal(row.deliveryStatus, "notSubmitted");
    assert.equal(row.purpose, "joiningUpdate");
    assert.deepEqual(row.actions, ["manualHandoff"]);
    assert.deepEqual(row.handling, {kind: "automatic"});
    assert.deepEqual(row.coordination, {kind: "tracked", phase: "queued",
      reason: null, dueAt: h.clock.now});
    const explicit = result.deliveries.find((m) =>
      m.messageId === h.messageId)!;
    assert.deepEqual(explicit.coordination, {kind: "untracked"});
    for (const hidden of [h.actor.phone, h.options.routes[0].senderId,
      "providerMessageId", "recipientEndpointId", "secret", "budget",
      "sourceGeneration", "episodeId", "responseUrl", "templateDocumentId"]) {
      assert.ok(!JSON.stringify(result).includes(hidden), hidden);
    }
    assert.deepEqual(h.fake.entries(), before);
  });

test("review pagination is bounded and covers recorded messages exactly once",
  async () => {
    const h = await harness();
    for (let i = 0; i < 51; i++) {
      const message = newMessageRecord({...h.intent,
        intentId: "page-" + i}, h.clock.now);
      await h.write(EVENT_ASSISTANCE_MESSAGES + "/" + message.messageId,
        message);
    }
    const a = await h.list();
    const b = await h.reviewStore.list(manager, {...h.input,
      cursor: a.nextCursor});
    assert.equal(a.deliveries.length, 50);
    assert.ok(a.nextCursor);
    assert.equal(b.deliveries.length, 3);
    assert.equal(b.nextCursor, null);
    const ids = [...a.deliveries, ...b.deliveries].map((m) => m.messageId);
    assert.deepEqual(ids, [...new Set(ids)].sort());
    assert.ok(!("total" in a));
  });

test("handoff fences reservations and permits while preserving the message",
  async () => {
    const h = await harness();
    const reserved = await h.delivery.reserve();
    const command = await h.command();
    const before = h.fake.entries();
    const result = await h.reviewStore.repair(manager, command);
    assert.equal(result.outcome, "applied");
    assert.equal(result.operationRevision, command.expectedMessageRevision + 1);
    assert.equal(result.view.lifecycle, "active");
    assert.equal(result.view.deliveryStatus, "reserved");
    assert.deepEqual(result.view.actions, []);
    assert.deepEqual(result.view.handling, {kind: "manual", actorUid: manager,
      at: h.clock.now, authority: "current"});
    assert.deepEqual((await h.record()).attempts, reserved.record.attempts);
    assert.deepEqual((await h.delivery.reserve()).decision,
      {kind: "stop", reason: "hostStopped"});
    assert.equal((await h.delivery.outbox.claimLiveDispatch(
      h.published.messageId, reserved.record.attempts[0].attemptId)).kind,
    "withheld");
    assert.deepEqual(h.fake.entries().filter(([path]) =>
      path !== h.path && !path.startsWith(DELIVERY_REPAIRS + "/")),
    before.filter(([path]) => path !== h.path));
    const coordinator = new AssistanceDeliveryWorkStore(h.db,
      () => h.clock.now);
    await coordinator.processMessage(h.published.messageId);
    const work = await coordinator.get(
      deliveryWorkIds(h.published.messageId).workItemId);
    assert.equal(work.payload.checkpoint.phase, "complete");
    assert.equal(work.payload.checkpoint.reason, "hostStopped");
    assert.equal((await h.view()).deliveryStatus, "reserved");
  });

test("unknown delivery stays unknown and late provider receipts remain valid",
  async () => {
    const h = await harness();
    assert.equal((await h.delivery.claim()).kind, "claimed");
    assert.equal((await h.view()).deliveryStatus, "unknown");
    const command = await h.command();
    const applied = await h.reviewStore.repair(manager, command);
    assert.equal(applied.view.deliveryStatus, "unknown");
    assert.equal((await h.record()).attempts[0].state.kind, "unknown");
    for (const kind of ["accepted", "delivered", "read"] as const) {
      h.clock.now += 1000;
      await h.receipt({kind, at: h.clock.now, providerMessageId: "wamid.late"});
      const replay = await h.reviewStore.repair(manager, command);
      assert.equal(replay.outcome, "replayed");
      assert.equal(replay.operationRevision, applied.operationRevision);
      assert.equal(replay.view.deliveryStatus, kind);
      assert.equal(replay.view.handling.kind, "manual");
      assert.ok(replay.view.revision > applied.operationRevision);
      assert.equal((await h.delivery.reserve()).decision.kind, "stop");
    }
  });

test("manual handling leaves valid guest reply authority intact", async () => {
  const h = await harness();
  const command = await h.command();
  await h.reviewStore.repair(manager, command);
  const {link} = h.delivery;
  const view = await h.guests.getView(link.linkId, link.secret);
  assert.equal(view.status, "ready");
  assert.ok(view.status === "ready");
  const submitted = await h.guests.submit({linkId: link.linkId,
    secret: link.secret, intentId: view.intentId,
    intentRevision: view.intentRevision,
    expectedGuestRevision: view.guestRevision, choiceId: "on-my-way",
    requestId: "reply-after-handoff"});
  assert.equal(submitted.result.kind, "accepted");
  const replay = await h.reviewStore.repair(manager, command);
  assert.equal(replay.view.lifecycle, "responded");
  assert.equal(replay.view.handling.kind, "manual");
  assert.deepEqual(replay.view.actions, []);
});

test("manager authority precedes event and delivery reads including replays",
  async () => {
    const h = await harness();
    const command = await h.command();
    await h.reviewStore.repair(manager, command);
    for (const uid of [h.actor.uid, "checkin-staff", "other-host"]) {
      const reads: string[] = [];
      h.fake.beforeRead = (path) => reads.push(path);
      await assert.rejects(h.reviewStore.list(uid, h.input),
        {code: "permission-denied"});
      await assert.rejects(h.reviewStore.repair(uid, command),
        {code: "permission-denied"});
      assert.deepEqual(reads,
        Array(2).fill("organizers/" + h.context.organizerId));
    }
  });

test("stale evidence, changed source and mutated retries cannot take ownership",
  async () => {
    const h = await harness();
    const stale = await h.command();
    await h.delivery.reserve();
    await assert.rejects(h.reviewStore.repair(manager, stale),
      {code: "aborted"});
    const command = await h.command();
    const attendee = (await h.read(h.attendeePath))!;
    await h.write(h.attendeePath, {...attendee, status: "checkedIn",
      checkedInAt: Timestamp.fromMillis(h.clock.now), checkedInBy: manager});
    await assert.rejects(h.reviewStore.repair(manager, command),
      {code: "aborted"});
    assert.deepEqual((await h.view()).actions, []);
    await h.write(h.attendeePath, attendee);
    await h.reviewStore.repair(manager, command);
    const before = h.fake.entries();
    await assert.rejects(h.reviewStore.repair(manager, {...command,
      expectedReviewHash: "0".repeat(64)}), {code: "aborted"});
    assert.deepEqual(h.fake.entries(), before);
  });

test("removed handoff owners require a fresh explicit takeover", async () => {
  const h = await harness();
  const path = "organizers/" + h.context.organizerId;
  const organizer = (await h.read(path))!;
  await h.write(path, {...organizer,
    hostUserIds: [...organizer.hostUserIds, "host-2"]});
  const command = await h.command();
  await h.reviewStore.repair("host-2", command);
  const oldReview = await h.command();
  await h.write(path, organizer);
  assert.deepEqual((await h.view()).handling, {kind: "manual",
    actorUid: "host-2", at: h.clock.now, authority: "revoked"});
  await assert.rejects(h.reviewStore.repair(manager, oldReview),
    {code: "aborted"});
  await assert.rejects(h.reviewStore.repair("host-2", command),
    {code: "permission-denied"});
  assert.deepEqual((await h.view()).actions, ["manualHandoff"]);
  const takeover = await h.reviewStore.repair(manager, await h.command());
  assert.equal(takeover.view.handling.kind, "manual");
  assert.equal((await h.record()).handoff!.actorUid, manager);
  assert.equal((await h.db.collection(DELIVERY_REPAIRS).get()).size, 2);
});

test("replaced guests lose identity and actions but keep delivery evidence",
  async () => {
    const h = await harness();
    const command = await h.command();
    await h.reviewStore.repair(manager, command);
    const attendee = (await h.read(h.attendeePath))!;
    await h.write(h.attendeePath, {...attendee,
      createdAt: Timestamp.fromMillis(h.clock.now + 1)});
    const replay = await h.reviewStore.repair(manager, command);
    assert.equal(replay.outcome, "replayed");
    assert.equal(replay.view.availability, "sourceChanged");
    assert.equal(replay.view.attendeeId, null);
    assert.deepEqual(replay.view.actions, []);
    assert.equal(replay.view.deliveryStatus, "notSubmitted");
  });

test("resolved, expired and declined arrivals offer no manual action",
  async () => {
    for (const change of ["delivered", "expired", "declined"] as const) {
      const h = await harness();
      if (change === "delivered") {
        await h.delivery.claim();
        await h.receipt({kind: "delivered", at: h.clock.now,
          providerMessageId: "wamid.done"});
      } else if (change === "expired") {
        h.clock.now = (await h.record()).intent.expiresAt;
      } else {
        const path = guestCollections.guests + "/" +
          guestIdentity(h.context, h.scope.attendeeId);
        await h.write(path, {...await h.read(path),
          intention: {kind: "notComing"}});
      }
      assert.deepEqual((await h.view()).actions, []);
      await assert.rejects(h.reviewStore.repair(manager, await h.command()),
        {code: "failed-precondition"});
    }
  });

test("malformed matching sources and missing coordinators fail visibly",
  async () => {
    const h = await harness();
    const attendee = (await h.read(h.attendeePath))!;
    await h.write(h.attendeePath, {...attendee, status: "made-up"});
    await assert.rejects(h.list());
    await h.write(h.attendeePath, attendee);
    const ids = deliveryWorkIds(h.published.messageId);
    h.fake.remove(operationCollections.workItems + "/" + ids.workItemId);
    await assert.rejects(h.list());
  });

test("unsupported recovery operations and foreign messages cannot mutate",
  async () => {
    const h = await harness();
    const command = await h.command();
    const before = h.fake.entries();
    for (const action of ["reconcile", "retryDefiniteFailure"] as const) {
      await assert.rejects(h.reviewStore.repair(manager, {...command,
        command: {...command.command, payload: {...command.command.payload,
          action}}}), {code: "failed-precondition"});
    }
    const foreign = newMessageRecord({...h.intent,
      context: {...h.context, organizerId: "another-organizer"}}, h.clock.now);
    await h.write(EVENT_ASSISTANCE_MESSAGES + "/" + foreign.messageId, foreign);
    await assert.rejects(h.reviewStore.repair(manager, {...command,
      command: {...command.command, payload: {...command.command.payload,
        deliveryId: foreign.messageId}}}), {code: "not-found"});
    assert.deepEqual(h.fake.entries().filter(([p]) =>
      !p.endsWith(foreign.messageId)), before);
    assert.ok(!(await h.list()).deliveries.some((m) =>
      m.messageId === foreign.messageId));
  });

test("conflicting and pending evidence is never summarized as failure",
  async () => {
    const h = await harness();
    await h.delivery.claim();
    const message = await h.record();
    const attempt = message.attempts[0];
    const failed = {...attempt, state: {kind: "failed" as const,
      at: h.clock.now, providerMessageId: null,
      classification: "technical" as const, evidenceId: "failure"}};
    const mixed = {...message, attempts: [attempt, failed]};
    assert.equal(hostDeliveryStatus(mixed), "unknown");
    assert.equal(hostDeliveryStatus({...mixed, deliveryConflict: true}),
      "conflictingEvidence");
    const revoked: MessageRecord = {...message, attempts: [{...attempt,
      state: {kind: "revoked", at: h.clock.now,
        providerMessageId: "revoked-id", evidenceId: "confirmed-revocation"}}]};
    assert.equal(hostDeliveryStatus(revoked), "revoked");
    const result = await h.list();
    const row = result.deliveries[0];
    for (const patch of [{providerMessageId: "leak"},
      {availability: "sourceChanged", attendeeId: h.scope.attendeeId},
      {actions: ["retryDefiniteFailure"]}]) {
      assert.equal(validateEventAssistanceDeliveriesCallableResponse({
        ...result, deliveries: [{...row, ...patch}]}), false);
    }
  });

test("delivery handlers authenticate and rate-limit before accessing stores",
  async () => {
    for (const handler of [listEventAssistanceDeliveriesHandler,
      repairEventAssistanceDeliveryHandler]) {
      let calls = 0;
      const deps = {db: () => ({}) as Firestore,
        rateLimit: async () => {
          calls++;
        },
        store: () => {
          throw new Error("store called");
        }};
      await assert.rejects(handler({data: {}} as CallableRequest, deps),
        {code: "unauthenticated"});
      assert.equal(calls, 0);
      await assert.rejects(handler({data: {}, auth: {uid: manager}} as
        CallableRequest, deps), /store called/);
      assert.equal(calls, 1);
      await assert.rejects(handler({data: {}, auth: {uid: manager}} as
        CallableRequest, {...deps, rateLimit: async () => {
        throw new Error("rate limited");
      }}), /rate limited/);
    }
  });

test("Firestore handoff contention, rollback and roster generations", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  const db = getEmulatorFirestore(app);
  try {
    const h = await harness(db);
    const command = await h.command();
    const results = await Promise.all(Array.from({length: 4}, () =>
      h.reviewStore.repair(manager, command)));
    assert.equal(results.filter((r) => r.outcome === "applied").length, 1);
    assert.equal(results.filter((r) => r.outcome === "replayed").length, 3);
    const other = await harness(db);
    const commands = await Promise.all([other.command(), other.command()]);
    const competing = await Promise.allSettled(commands.map((c) =>
      other.reviewStore.repair(manager, c)));
    assert.equal(competing.filter((r) => r.status === "fulfilled").length, 1);
    const attendee = (await db.doc(h.attendeePath).get()).data()!;
    await db.doc(h.attendeePath).delete();
    await db.doc(h.attendeePath).set(attendee);
    const replay = await h.reviewStore.repair(manager, command);
    assert.equal(replay.view.availability, "sourceChanged");
    assert.equal(replay.view.attendeeId, null);
    const racing = await harness(db);
    const reservation = await racing.delivery.reserve();
    const request = await racing.command();
    const [repair, claim] = await Promise.allSettled([
      racing.reviewStore.repair(manager, request),
      racing.delivery.outbox.claimLiveDispatch(racing.published.messageId,
        reservation.record.attempts[0].attemptId)]);
    assert.ok(claim.status === "fulfilled");
    if (repair.status === "fulfilled") {
      assert.equal(claim.value.kind, "withheld");
    } else {
      assert.equal(repair.reason.code, "aborted");
      assert.equal(claim.value.kind, "claimed");
      await racing.reviewStore.repair(manager, await racing.command());
      assert.equal((await racing.view()).deliveryStatus, "unknown");
    }
  } finally {
    await db.terminate();
    await deleteApp(app);
  }
});

test("an interrupted handoff transaction leaves no partial ownership receipt",
  async () => {
    const h = await harness();
    const command = await h.command();
    const before = h.fake.entries();
    h.fake.failNextCommit = true;
    await assert.rejects(h.reviewStore.repair(manager, command),
      /injected transaction interruption/);
    assert.deepEqual(h.fake.entries(), before);
    assert.equal((await h.reviewStore.repair(manager, command)).outcome,
      "applied");
  });

test("a slow source read cannot extend the manual action window", async () => {
  const h = await harness();
  const command = await h.command();
  const expiry = (await h.record()).intent.expiresAt;
  h.fake.beforeRead = (path) => {
    if (path === h.attendeePath) h.clock.now = expiry;
  };
  await assert.rejects(h.reviewStore.repair(manager, command),
    {code: "failed-precondition"});
  assert.equal((await h.record()).handoff, undefined);
});
