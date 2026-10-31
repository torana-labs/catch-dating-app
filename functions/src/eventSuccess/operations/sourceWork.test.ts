import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import {rcsSubscriptionId} from "./rcsSubscriptions";
import {AssistanceCheckpointWorkStore} from "./checkpointWorkStore";
import {AssistanceDeliveryWorkStore} from "./deliveryWorkStore";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import test from "node:test";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import {operationCollections} from "../../operations/collections";
import {FakeFirestore} from "../../operations/testFirestore";
import {newLiveWorkRecords} from "./liveWorkRecords";
import {LiveAssistanceWorkRunner} from "./liveWorkRunner";
import {AssistanceSourceWorkStore} from "./sourceWorkStore";
import {AssistanceRosterWorkStore} from "./rosterWorkStore";
import {SourceWorkInput, readSourceWorkRecords, newSourceWorkRecords,
  isCheckpointMemberScope} from "./sourceWorkRecords";
import {AssistanceSourceChange, enqueueAssistanceSourceChange,
  sourceWakeScopes, rosterEnrollmentRequests} from "./sourceWorkSignals";
import {evaluateDueAssistanceWork, processChangedAssistanceWork} from
  "./liveWorkTriggers";
import {setup} from "./liveLateJoinTestHarness";
import {start} from "./whatsappTestHarness";
import {configureRuntime} from "./runtimeConfigTestHarness";

const now = Date.parse("2026-09-07T12:00:00Z");
async function harness(count = 1, realDb?: Firestore) {
  const fake = new FakeFirestore();
  const db = realDb ?? fake as unknown as Firestore;
  const clock = {now};
  const context = {mode: "live" as const, eventId: "e-" + randomUUID(),
    organizerId: "organizer"};
  const guests = new LiveAssistanceWorkRunner(db, () => clock.now);
  const work = new AssistanceSourceWorkStore(db, () => clock.now);
  const records = Array.from({length: count}, (_, i) => newLiveWorkRecords({
    schemaVersion: 1, kind: "liveLateJoin", scope: {context,
      attendeeId: "attendee-" + i, episodeId: "episode-" + i},
    options: {routes: [{routeId: "catchEventRcs", senderId: "rcs-source"}],
      responseDeadline: null,
      deliveryPolicy: {maxAttempts: 3, maxAttemptsPerRoute: 1,
        minimumRetrySeconds: 1}},
    expiresAt: now + 3_600_000, maxEvaluations: 100,
    checkpoint: {dueAt: now + 60_000, evaluatedAt: null, evaluations: 0,
      observation: null, sourceHash: null, publication: null}}, now));
  for (const record of records) {
    await db.runTransaction(async (tx) => {
      tx.create(db.collection(operationCollections.runs).doc(record.run.runId),
        record.run);
      tx.create(db.collection(operationCollections.workItems)
        .doc(record.item.workItemId), record.item);
    });
  }
  const input: SourceWorkInput = {scope: {context, attendeeId: null},
    source: {eventId: randomUUID(), collection: "events",
      documentId: context.eventId, occurredAt: now}};
  const write = async (path: string, value: object) => {
    if (realDb) await realDb.doc(path).set(value);
    else fake.write(path, value as Record<string, unknown>);
  };
  return {db, fake, clock, work, guests, records, input, context, write};
}

test("source signal creation replays and bounded pages resume without rewaking",
  async () => {
    const h = await harness(23);
    const created = await h.work.enqueue(h.input);
    assert.equal((await h.work.enqueue(h.input)).replayed, true);
    const id = created.item.workItemId;
    const first = await h.work.process(id);
    assert.ok(first.kind === "committed");
    assert.equal(first.records.payload.checkpoint.visited, 20);
    assert.equal(first.records.payload.checkpoint.phase, "scan");
    const restarted = new AssistanceSourceWorkStore(h.db, () => h.clock.now);
    const last = await restarted.process(id);
    assert.ok(last.kind === "committed");
    assert.equal(last.records.payload.checkpoint.visited, 23);
    assert.equal(last.records.payload.checkpoint.phase, "complete");
    assert.equal(last.records.run.status, "completed");
    for (const r of h.records) {
      const guest = await h.guests.store.get(r.item.workItemId);
      assert.equal(guest.item.revision, 1);
      assert.equal(guest.payload.checkpoint.dueAt, now);
      assert.equal(guest.payload.checkpoint.evaluations, 0);
    }
    assert.equal((await restarted.process(id)).kind, "idle");
    assert.deepEqual(await restarted.listDue(10), []);
  });

test("fanout retries failed targets while other guests advance", async () => {
  const h = await harness(3);
  let busy = true;
  const delayed = h.records[0].item.workItemId;
  const work = new AssistanceSourceWorkStore(h.db, () => h.clock.now, {
    process: (id, action) => id === delayed && busy ?
      Promise.resolve({kind: "busy"}) : h.guests.process(id, action),
  });
  const created = await work.enqueue(h.input);
  await work.process(created.item.workItemId);
  const pending = await work.get(created.item.workItemId);
  assert.equal(pending.payload.checkpoint.phase, "retry");
  assert.deepEqual(pending.payload.checkpoint.failures,
    [{workItemId: delayed, reason: "busy"}]);
  assert.equal((await h.guests.store.get(h.records[1].item.workItemId))
    .item.revision, 1);
  assert.equal((await work.process(created.item.workItemId)).kind, "idle");
  busy = false;
  h.clock.now = pending.payload.checkpoint.dueAt!;
  await work.process(created.item.workItemId);
  assert.equal((await work.get(created.item.workItemId)).run.status,
    "completed");
  assert.equal((await h.guests.store.get(delayed)).item.revision, 1);
});

test("large retry rounds persist their cursor and limit each batch to 20",
  async () => {
    const h = await harness(23);
    let busy = true;
    let calls = 0;
    const work = new AssistanceSourceWorkStore(h.db, () => h.clock.now, {
      process: async (id, action) => {
        calls += 1;
        return busy ? {kind: "busy"} : h.guests.process(id, action);
      },
    });
    const id = (await work.enqueue(h.input)).item.workItemId;
    await work.process(id);
    await work.process(id);
    const retry = (await work.get(id)).payload.checkpoint;
    assert.equal(retry.failures.length, 23);
    assert.equal(retry.cursor, null);
    h.clock.now = retry.dueAt!;
    calls = 0;
    await work.process(id);
    const page = (await work.get(id)).payload.checkpoint;
    assert.equal(calls, 20);
    assert.equal(page.retries, 0);
    assert.ok(page.cursor);
    assert.equal(page.dueAt, h.clock.now);
    calls = 0;
    await work.process(id);
    const round = (await work.get(id)).payload.checkpoint;
    assert.equal(calls, 3);
    assert.equal(round.retries, 1);
    assert.equal(round.cursor, null);
    assert.equal(round.failures.length, 23);
    h.clock.now = round.dueAt!;
    busy = false;
    await work.process(id);
    await work.process(id);
    assert.equal((await work.get(id)).payload.checkpoint.phase, "complete");
  });

test("lost page commits replay target receipts; stale fanout leases cannot win",
  async () => {
    const h = await harness();
    let interrupt = true;
    const work = new AssistanceSourceWorkStore(h.db, () => h.clock.now, {
      process: async (id, action) => {
        const result = await h.guests.process(id, action);
        if (interrupt) {
          interrupt = false;
          h.fake.failNextCommit = true;
        }
        return result;
      },
    });
    const source = await work.enqueue(h.input);
    await assert.rejects(work.process(source.item.workItemId), /interruption/);
    assert.equal((await work.get(source.item.workItemId)).item.revision, 0);
    assert.equal((await h.guests.store.get(h.records[0].item.workItemId))
      .item.revision, 1);
    await work.process(source.item.workItemId);
    assert.equal((await h.guests.store.get(h.records[0].item.workItemId))
      .item.revision, 1);
    const nextInput = {...h.input, source: {...h.input.source,
      eventId: randomUUID()}};
    const next = await work.enqueue(nextInput);
    const expired = new AssistanceSourceWorkStore(h.db, () => h.clock.now, {
      process: async () => {
        h.clock.now += 60_000;
        return {kind: "busy"};
      },
    });
    await assert.rejects(expired.process(next.item.workItemId),
      {code: "lease_expired"});
    assert.equal((await work.get(next.item.workItemId)).item.revision, 0);
  });

test("retry budget becomes an explicit host-review item with retained targets",
  async () => {
    const h = await harness();
    const work = new AssistanceSourceWorkStore(h.db, () => h.clock.now, {
      process: async () => {
        throw new Error("unavailable");
      },
    });
    const created = await work.enqueue(h.input);
    const id = created.item.workItemId;
    await work.process(id);
    for (let i = 0; i < 5; i += 1) {
      h.clock.now = (await work.get(id)).payload.checkpoint.dueAt!;
      await work.process(id);
    }
    const held = await work.get(id);
    assert.equal(held.payload.checkpoint.phase, "review");
    assert.equal(held.payload.checkpoint.retries, 5);
    assert.equal(held.payload.checkpoint.failures.length, 1);
    assert.equal(held.run.status, "paused");
    assert.deepEqual(held.item.taskFlags, ["human_review_required"]);
    assert.equal(held.payload.checkpoint.dueAt, null);
  });

test("source scopes cannot wake other events or other guests", async () => {
  const h = await harness(2);
  const guestScope = {...h.input.scope, attendeeId: "attendee-0"};
  const one = await h.work.enqueue({...h.input, scope: guestScope});
  await h.work.process(one.item.workItemId);
  assert.equal((await h.guests.store.get(h.records[0].item.workItemId))
    .item.revision, 1);
  assert.equal((await h.guests.store.get(h.records[1].item.workItemId))
    .item.revision, 0);
  assert.equal(await h.work.hasTargets({...guestScope,
    context: {...h.context, organizerId: "foreign"}}), false);
  assert.throws(() => readSourceWorkRecords({...one.run, mode: "shadow"},
    one.item, one.item.workItemId, now));
  const expired = await h.work.enqueue({...h.input,
    source: {...h.input.source, eventId: randomUUID()}});
  h.clock.now = expired.payload.expiresAt;
  await h.work.process(expired.item.workItemId);
  assert.equal((await h.work.get(expired.item.workItemId)).item.outcome,
    "expired");
});

test("source filtering ignores counters and targets changed owner scopes",
  async () => {
    const h = await harness();
    const source: AssistanceSourceChange = {source: h.input.source,
      before: {generation: 1, value: {organizerId: "organizer",
        status: "active", checkedInCount: 0}},
      after: {generation: 1, value: {organizerId: "organizer",
        status: "active", checkedInCount: 1}}};
    assert.deepEqual(sourceWakeScopes(source), []);
    const changed = {...source, after: {generation: 1,
      value: {organizerId: "foreign", status: "cancelled"}}};
    assert.equal(sourceWakeScopes(changed).length, 2);
    const ids = await enqueueAssistanceSourceChange(h.work, changed);
    assert.equal(ids.length, 1, "only the enrolled owner has work to wake");
    const setting = {...source, source: {...source.source,
      collection: "eventAssistanceSettings" as const}, before: null,
    after: {generation: 1, value: {context: h.context,
      workflowKind: "checkpoint"}}};
    assert.deepEqual(sourceWakeScopes(setting), []);
    assert.deepEqual(sourceWakeScopes({...setting, after: {generation: 1,
      value: {context: {...h.context, mode: "rehearsal"},
        workflowKind: "lateJoin"}}}), []);
  });

test("all source collections derive their event or guest scope on deletion",
  async () => {
    const h = await harness();
    const cases: Record<SourceWorkInput["source"]["collection"], {
      value: Record<string, unknown>; attendeeId?: string | null;
      scope?: SourceWorkInput["scope"]; documentId?: string;
    }> = {
      events: {value: {organizerId: h.context.organizerId}, attendeeId: null},
      eventAttendees: {value: {eventId: h.context.eventId,
        organizerId: h.context.organizerId}, attendeeId: h.context.eventId},
      eventStaffGrants: {value: {eventId: h.context.eventId,
        organizerId: h.context.organizerId}, attendeeId: null},
      eventSuccessPlans: {value: {eventId: h.context.eventId,
        organizerId: h.context.organizerId}, attendeeId: null},
      eventAssistanceGuests: {value: {context: h.context,
        attendeeId: "guest"}, attendeeId: "guest"},
      eventAssistanceRcsPermissions: {value: {context: h.context,
        attendeeId: "guest"}, attendeeId: "guest"},
      eventAssistanceRcsSenders: {value: {}, scope: {kind: "sender",
        routeId: "catchEventRcs", senderId: h.context.eventId}},
      eventAssistanceRcsBudgets: {value: {scope: {kind: "event",
        context: h.context}}, attendeeId: null},
      eventAssistanceRcsSubscriptions: {
        documentId: rcsSubscriptionId("agent", "a".repeat(64)),
        value: {subscriptionId: rcsSubscriptionId("agent", "a".repeat(64)),
          agentId: "agent", endpointHash: "a".repeat(64), lastStop: {}},
        scope: {kind: "rcsSubscription",
          subscriptionId: rcsSubscriptionId("agent", "a".repeat(64))}},
      eventAssistanceSmsPermissions: {value: {context: h.context,
        attendeeId: "guest"}, attendeeId: "guest"},
      eventAssistanceWhatsappPermissions: {value: {context: h.context,
        attendeeId: "guest"}, attendeeId: "guest"},
      eventAssistanceSettings: {value: {context: h.context,
        workflowKind: "lateJoin"}, attendeeId: null},
      eventAssistanceRuntimeConfigs: {value: {context: h.context,
        workflowKind: "lateJoin"}, attendeeId: null},
      eventAssistanceGroupProgress: {value: {context: h.context},
        attendeeId: null},
      eventAssistanceMemberships: {value: {context: h.context,
        attendeeId: "guest"}, attendeeId: "guest"},
      eventAssistanceMessages: {value: {intent: {context: h.context,
        attendeeId: "guest", workflow: {kind: "lateJoin"}}},
      attendeeId: "guest"},
      eventAssistanceSmsSenders: {value: {}, scope: {kind: "sender",
        routeId: "catchEventSms", senderId: h.context.eventId}},
      eventAssistanceSmsBudgets: {value: {scope: {kind: "event",
        context: h.context}}, attendeeId: null},
      organizerSenderConnections: {value: {channel: "whatsapp"},
        scope: {kind: "sender", routeId: "organizerEventWhatsapp",
          senderId: h.context.eventId}},
      eventAssistanceWhatsappPolicies: {value: {}, scope: {kind: "sender",
        routeId: "organizerEventWhatsapp", senderId: h.context.eventId}},
      organizerMessageTemplates: {value: {connectionId: "sender"},
        scope: {kind: "sender", routeId: "organizerEventWhatsapp",
          senderId: "sender"}},
      eventAssistanceWhatsappBudgets: {value: {scope: {kind: "senderDay"},
        senderId: "sender"}, scope: {kind: "sender",
        routeId: "organizerEventWhatsapp", senderId: "sender"}},
      organizerWhatsappEndpointStops: {value: {
        organizerId: h.context.organizerId, endpointHash: "a".repeat(64)},
      scope: {kind: "whatsappEndpoint", organizerId: h.context.organizerId,
        recipientEndpointId: "whatsapp:" + "a".repeat(64)}},
      organizerContactChannelStates: {value: {channel: "whatsapp",
        organizerId: h.context.organizerId, endpointHash: "a".repeat(64)},
      scope: {kind: "whatsappEndpoint", organizerId: h.context.organizerId,
        recipientEndpointId: "whatsapp:" + "a".repeat(64)}},
    };
    for (const [collection, c] of Object.entries(cases)) {
      const change: AssistanceSourceChange = {
        source: {...h.input.source,
          collection: collection as SourceWorkInput["source"]["collection"],
          documentId: c.documentId ?? h.input.source.documentId},
        before: {generation: 1, value: c.value}, after: null};
      assert.deepEqual(sourceWakeScopes(change),
        [c.scope ?? {context: h.context, attendeeId: c.attendeeId},
          ...(collection === "eventAttendees" ? [{kind: "checkpointMember",
            context: h.context, attendeeId: h.context.eventId}] : [])],
        collection);
      assert.deepEqual(sourceWakeScopes({...change,
        before: null, after: change.before}), sourceWakeScopes(change));
    }
  });

test("checkpoint member facts have a distinct wake and no new enrollment",
  async () => {
    const h = await harness();
    const value = {eventId: h.context.eventId,
      organizerId: h.context.organizerId, status: "checkedIn",
      checkedInAt: new Timestamp(10, 1)};
    const change: AssistanceSourceChange = {source: {...h.input.source,
      collection: "eventAttendees", documentId: "attendee"},
    before: {value, generation: 1}, after: {value, generation: 1}};
    const checkpoint = {kind: "checkpointMember", context: h.context,
      attendeeId: "attendee"};
    for (const field of ["accountabilityRevision", "accountabilityResolution",
      "accountabilityResolvedAt", "accountabilityResolvedBy",
      "accountabilityResolvedForCheckInAt"]) {
      const changed = {...change, after: {generation: 1,
        value: {...value, [field]: "changed"}}};
      assert.deepEqual(sourceWakeScopes(changed), [checkpoint], field);
      assert.deepEqual(rosterEnrollmentRequests(changed), [], field);
    }
    for (const field of ["checkedInAt", "attendanceRevision", "status",
      "createdAt"]) {
      const changed = {...change, after: {generation: 1,
        value: {...value, [field]: field === "checkedInAt" ?
          new Timestamp(10, 2) : "changed"}}};
      assert.deepEqual(sourceWakeScopes(changed),
        [{context: h.context, attendeeId: "attendee"}, checkpoint], field);
      assert.ok(rosterEnrollmentRequests(changed).every((r) =>
        !isCheckpointMemberScope(r.scope)));
    }
    assert.deepEqual(sourceWakeScopes({...change,
      after: {generation: 1, value: {...value, displayName: "New name"}}}), []);
    assert.deepEqual(sourceWakeScopes({...change, after: {generation: 1,
      value: {...value, phoneE164: "+919999991234"}}}),
    [{context: h.context, attendeeId: "attendee"}]);
    const moved = {...change, after: {generation: 2,
      value: {...value, organizerId: "other"}}};
    assert.equal(sourceWakeScopes(moved).length, 4);
    assert.equal(rosterEnrollmentRequests(moved).length, 2);
  });

test("checkpoint member scope rejects other source and work identities",
  async () => {
    const h = await harness();
    const input: SourceWorkInput = {scope: {kind: "checkpointMember",
      context: h.context, attendeeId: "attendee"}, source: {...h.input.source,
      collection: "eventAttendees", documentId: "attendee"}};
    const valid = newSourceWorkRecords(input, now);
    assert.ok(isCheckpointMemberScope(valid.payload.scope));
    for (const source of [{...input.source, collection: "events" as const},
      {...input.source, documentId: "other"}]) {
      assert.throws(() => newSourceWorkRecords({...input, source}, now));
    }
    assert.throws(() => newSourceWorkRecords({...input,
      scope: {...input.scope, attendeeId: null}} as SourceWorkInput, now));
    const item = {...valid.item, normalizedPayload: {...valid.payload,
      checkpoint: {...valid.payload.checkpoint, visited: 1,
        cursor: h.records[0].item.workItemId}}};
    assert.throws(() => readSourceWorkRecords(valid.run, item,
      item.workItemId, now));
    assert.equal(await h.work.hasTargets(input.scope), false,
      "guest work cannot satisfy checkpoint discovery");
  });

test("source records reject retry, counter and terminal checkpoint drift",
  async () => {
    const h = await harness();
    const original = await h.work.enqueue(h.input);
    for (const field of ["failed", "published", "processed"] as const) {
      const run = structuredClone(original.run);
      run.counters[field] = 1;
      assert.throws(() => readSourceWorkRecords(run, original.item,
        original.item.workItemId, now));
    }
    const item = structuredClone(original.item);
    item.normalizedPayload = {...original.payload, checkpoint:
      {...original.payload.checkpoint, retries: 1}};
    assert.throws(() => readSourceWorkRecords(original.run, item,
      item.workItemId, now));
    await h.work.process(original.item.workItemId);
    const done = await h.work.get(original.item.workItemId);
    assert.throws(() => readSourceWorkRecords({...done.run, finishedAt: null},
      done.item, done.item.workItemId, now));
  });

test("due orchestration selects saved work and ignores unrelated writes",
  async () => {
    const h = await harness();
    const source = await h.work.enqueue(h.input);
    const ports = {
      checkpoint: new AssistanceCheckpointWorkStore(h.db, () => h.clock.now),
      delivery: new AssistanceDeliveryWorkStore(h.db, () => h.clock.now),
      source: h.work, guest: h.guests,
      roster: new AssistanceRosterWorkStore(h.db, () => h.clock.now)};
    await processChangedAssistanceWork(source.item.workItemId,
      source.item, ports, now);
    assert.equal((await h.work.get(source.item.workItemId)).run.status,
      "completed");
    const calls: string[] = [];
    const busy = async (id: string) => {
      calls.push(id);
      return {kind: "busy" as const};
    };
    const fakePorts = {
      checkpoint: {listDue: async () => [], process: busy},
      delivery: {listDue: async () => ["delivery"], process: busy},
      source: {listDue: async () => ["source"], process: busy},
      roster: {listDue: async () => [], process: busy},
      guest: {store: {listDue: async () =>
        [{workItemId: "guest", revision: 1}]}, process: busy}};
    assert.deepEqual(await evaluateDueAssistanceWork(fakePorts),
      {rosterItems: 0, sourceItems: 1, noticeItems: 0, guestItems: 1,
        deliveryItems: 1, checkpointItems: 0, busy: 3});
    assert.deepEqual(calls, ["source", "guest", "delivery"]);
    calls.length = 0;
    await processChangedAssistanceWork("unrelated", {normalizedPayload:
      {kind: "shadow", checkpoint: {dueAt: now}}}, fakePorts, now);
    assert.deepEqual(calls, []);
    await assert.rejects(processChangedAssistanceWork("guest", {
      normalizedPayload: {kind: "liveLateJoin", checkpoint: {dueAt: now}},
    }, fakePorts, now), {name: "AssistanceWorkBusy"});
  });

test("roster change wakes the real evaluator and check-in resolves its work",
  async () => {
    const h = await setup();
    const runtime = await configureRuntime(h);
    const guest = new LiveAssistanceWorkRunner(h.db, () => h.clock.now);
    const source = new AssistanceSourceWorkStore(h.db, () => h.clock.now);
    const item = await guest.store.start({scope: h.scope,
      ...runtime.configuration, runtimeBinding: runtime.binding});
    const ports = {guest, source,
      checkpoint: new AssistanceCheckpointWorkStore(h.db, () => h.clock.now),
      delivery: new AssistanceDeliveryWorkStore(h.db, () => h.clock.now),
      roster: new AssistanceRosterWorkStore(h.db, () => h.clock.now)};
    await processChangedAssistanceWork(item.item.workItemId,
      item.item, ports, h.clock.now);
    const first = await guest.store.get(item.item.workItemId);
    assert.ok(first.payload.checkpoint.publication);
    assert.equal(first.run.counters.published, 1);
    const before = await h.read(h.attendeePath);
    assert.ok(before);
    const after = {...before, status: "checkedIn",
      checkedInAt: Timestamp.fromMillis(start), checkedInBy: "host-1",
      attendanceRevision: 1};
    await h.write(h.attendeePath, after);
    const ids = await enqueueAssistanceSourceChange(source, {
      source: {collection: "eventAttendees", eventId: randomUUID(),
        documentId: h.scope.attendeeId, occurredAt: start},
      before: {generation: 1, value: before},
      after: {generation: 1, value: after},
    });
    assert.equal(ids.length, 1);
    await source.process(ids[0]);
    await evaluateDueAssistanceWork(ports);
    const closed = await guest.store.get(item.item.workItemId);
    assert.equal(closed.run.status, "completed");
    assert.equal(closed.item.outcome, "resolved");
    assert.equal(closed.run.counters.published, 1,
      "check-in must not publish another joining message");
  });

test("Firestore arbitrates source work and indexed scope fanout", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  try {
    const h = await harness(2, getEmulatorFirestore(app));
    const [a, b] = await Promise.all([h.work.enqueue(h.input),
      h.work.enqueue(h.input)]);
    assert.equal(Number(a.replayed) + Number(b.replayed), 1);
    const result = await Promise.all([h.work.process(a.item.workItemId),
      h.work.process(a.item.workItemId)]);
    assert.equal(result.filter((r) => r.kind === "committed").length, 1);
    const done = await h.work.get(a.item.workItemId);
    assert.equal(done.payload.checkpoint.visited, 2);
    assert.equal(done.run.status, "completed");
    const specific = await h.work.enqueue({...h.input,
      scope: {...h.input.scope, attendeeId: "attendee-1"}});
    await h.work.process(specific.item.workItemId);
    assert.equal((await h.work.get(specific.item.workItemId))
      .payload.checkpoint.visited, 1);
    assert.ok(!(await h.work.listDue(100)).includes(specific.item.workItemId));
  } finally {
    await deleteApp(app);
  }
});
