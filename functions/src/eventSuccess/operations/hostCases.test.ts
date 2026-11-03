import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {operationContentHash} from "../../operations/durableActions";
import type {ResolveEventAssistanceCaseCallablePayload as Command} from
  "../../shared/generated/resolveEventAssistanceCaseCallablePayload";
import {validateEventAssistanceCaseDocument} from
  "../../shared/generated/validators/eventAssistanceCaseDocument";
import {validateEventAssistanceCasesCallableResponse} from
  "../../shared/generated/validators/eventAssistanceCasesOutput";
import {CASE_RECEIPTS, EventAssistanceCasesStore} from "./hostCasesStore";
import {listEventAssistanceCasesHandler, resolveEventAssistanceCaseHandler} from
  "./hostCasesHandlers";
import {guestCollections} from "./guestRecords";
import {assistanceMessageId} from "./messageOutbox";
import {setup} from "./liveLateJoinTestHarness";
import {keys} from "./whatsappTestHarness";

const manager = "host-1";
async function harness(realDb?: Firestore,
  fixtureId?: ReturnType<typeof randomUUID>) {
  const h = await setup(realDb, fixtureId);
  const cases = new EventAssistanceCasesStore(h.db, () => h.clock.now);
  const input = {context: h.context, status: "open" as const, cursor: null};
  const create = async (category: "eventLogistics" | "accessibility" |
    "other" | "comfortSafety" = "eventLogistics",
  id: string = randomUUID()) => {
    const intent = {...h.intent, intentId: "help:" + id,
      workflow: {kind: "lateJoin" as const, occurrenceId: id},
      choices: [{choiceId: "help", label: "I need help",
        value: {kind: "requestHelp" as const, category}}]};
    const thread = await h.guests.publishMessage(intent, null);
    const link = await h.guests.issueLink(thread.threadId, "link", keys);
    const view = await h.guests.getView(link.linkId, link.secret);
    assert.ok(view.status === "ready");
    const submission = {linkId: link.linkId, secret: link.secret,
      intentId: view.intentId, intentRevision: view.intentRevision,
      expectedGuestRevision: view.guestRevision, choiceId: "help",
      requestId: "response"};
    assert.equal((await h.guests.submit(submission)).result.kind, "accepted");
    const rows = await h.db.collection(guestCollections.cases)
      .where("messageId", "==", assistanceMessageId(intent)).get();
    assert.equal(rows.size, 1);
    const data = rows.docs[0].data();
    assert.ok(validateEventAssistanceCaseDocument(data));
    return {data, path: guestCollections.cases + "/" + data.caseId,
      submission};
  };
  const created = await create("eventLogistics",
    fixtureId ? "native-help" : undefined);
  const list = () => cases.list(manager, input);
  const command = async (outcome: Command["command"]["payload"]["outcome"] =
  "resolved", owner = manager): Promise<Command> => {
    const view = (await list()).cases.find((c) =>
      c.caseId === created.data.caseId)!;
    assert.notEqual(view.revision, null);
    return {expectedSourceHash: view.sourceHash, command: {
      kind: "resolveAssistance", context: h.context,
      eventId: h.context.eventId, operationId: randomUUID(),
      payload: {caseId: view.caseId, expectedRevision: view.revision!,
        outcome, owner}}};
  };
  return {...h, cases, input, create, created, list, command};
}

test("guest help becomes a bounded, read-only Host request", async () => {
  const h = await harness();
  const before = h.fake.entries();
  const result = await h.list();
  assert.equal(result.coverage, "page");
  assert.equal(result.nextCursor, null);
  assert.equal(result.cases.length, 1);
  const row = result.cases[0];
  assert.equal(row.availability, "current");
  assert.equal(row.revision, 0);
  assert.equal(row.assignment.kind, "unassigned");
  assert.equal(row.attendeeId, h.scope.attendeeId);
  assert.equal(row.canChange, true);
  for (const hidden of [h.actor.phone, "messageId", "guestId",
    "sourceGeneration",
    "secret", "responseId", "budget", "episodeId"]) {
    assert.ok(!JSON.stringify(result).includes(hidden), hidden);
  }
  assert.deepEqual(h.fake.entries(), before);
});

test("restricted safety requests never enter the practical host queue",
  async () => {
    const h = await harness();
    const safety = await h.create("comfortSafety");
    assert.equal((await h.list()).cases.length, 1);
    const command = await h.command();
    for (const caseId of [safety.data.caseId, "missing-case"]) {
      await assert.rejects(h.cases.resolve(manager, {...command, command: {
        ...command.command, payload: {...command.command.payload, caseId}}}),
      {code: "not-found"});
    }
    assert.equal((await h.read(safety.path))!.status, "open");
  });

test("manager authorization is checked before event, case or guest reads",
  async () => {
    const h = await harness();
    const command = await h.command();
    for (const uid of [h.actor.uid, "checkin-staff", "another-manager"]) {
      const reads: string[] = [];
      h.fake.beforeRead = (path) => reads.push(path);
      await assert.rejects(h.cases.list(uid, h.input),
        {code: "permission-denied"});
      await assert.rejects(h.cases.resolve(uid, command),
        {code: "permission-denied"});
      assert.deepEqual(reads,
        Array(2).fill("organizers/" + h.context.organizerId));
    }
  });

test("queue pagination preserves all requests without claiming a total",
  async () => {
    const h = await harness();
    for (let i = 0; i < 51; i++) {
      const responseId = "fixture:" + i;
      const caseId = "case:" + operationContentHash(responseId);
      await h.write(guestCollections.cases + "/" + caseId,
        {...h.created.data, responseId, caseId});
    }
    const first = await h.list();
    assert.equal(first.cases.length, 50);
    assert.ok(first.nextCursor);
    const second = await h.cases.list(manager, {...h.input,
      cursor: first.nextCursor});
    assert.equal(second.cases.length, 2);
    assert.equal(second.nextCursor, null);
    const ids = [...first.cases, ...second.cases].map((c) => c.caseId);
    assert.equal(new Set(ids).size, 52);
    assert.deepEqual(ids, [...ids].sort());
    assert.ok(!("total" in first));
  });

test("resolution and decline close the request with explicit outcomes",
  async () => {
    for (const outcome of ["resolved", "declined"] as const) {
      const h = await harness();
      const command = await h.command(outcome);
      const before = h.fake.entries();
      const applied = await h.cases.resolve(manager, command);
      assert.equal(applied.outcome, "applied");
      assert.equal(applied.view.status, "resolved");
      assert.equal(applied.view.resolution!.outcome, outcome);
      assert.equal(applied.view.canChange, false);
      assert.equal(applied.operationRevision, 1);
      assert.equal((await h.list()).cases.length, 0);
      assert.equal((await h.cases.list(manager, {...h.input,
        status: "resolved"})).cases.length, 1);
      const replay = await h.cases.resolve(manager, command);
      assert.equal(replay.outcome, "replayed");
      assert.equal(replay.operationRevision, 1);
      assert.deepEqual(replay.view, applied.view);
      // A guest retry cannot reopen the host's already settled request.
      assert.equal((await h.guests.submit(h.created.submission)).result.kind,
        "replayed");
      assert.equal((await h.list()).cases.length, 0);
      const effects = h.fake.entries().filter(([path]) =>
        path === h.created.path || path.startsWith(CASE_RECEIPTS + "/"));
      assert.equal(effects.length, 2);
      assert.deepEqual(h.fake.entries().filter(([path]) =>
        path !== h.created.path && !path.startsWith(CASE_RECEIPTS + "/")),
      before.filter(([path]) => path !== h.created.path));
      await assert.rejects(h.cases.resolve(manager, {...command, command: {
        ...command.command, operationId: "another-close"}}),
      {code: "failed-precondition"});
    }
  });

test("handoff stays open and cannot grant authority to a removed manager",
  async () => {
    const h = await harness();
    const organizerPath = "organizers/" + h.context.organizerId;
    const organizer = (await h.read(organizerPath))!;
    await h.write(organizerPath, {...organizer,
      hostUserIds: [...organizer.hostUserIds, "host-2"]});
    const transfer = await h.command("transferred", "host-2");
    const result = await h.cases.resolve(manager, transfer);
    assert.equal(result.view.status, "open");
    assert.deepEqual(result.view.assignment, {kind: "assigned",
      uid: "host-2", authority: "current"});
    assert.equal(result.view.resolution, null);
    await h.write(organizerPath, organizer);
    assert.deepEqual((await h.list()).cases[0].assignment,
      {kind: "assigned", uid: "host-2", authority: "revoked"});
    await assert.rejects(h.cases.resolve(manager,
      await h.command("transferred", "host-2")), {code: "failed-precondition"});
    await assert.rejects(h.cases.resolve("host-2", transfer),
      {code: "permission-denied"});
    const replay = await h.cases.resolve(manager, transfer);
    assert.equal(replay.outcome, "replayed");
    assert.deepEqual(replay.view.assignment,
      {kind: "assigned", uid: "host-2", authority: "revoked"});
    const closed = await h.cases.resolve(manager, await h.command());
    assert.equal(closed.view.revision, 2);
    const oldReplay = await h.cases.resolve(manager, transfer);
    assert.equal(oldReplay.operationRevision, 1);
    assert.equal(oldReplay.view.revision, 2);
    assert.equal(oldReplay.view.status, "resolved");
  });

test("stale reviews, mutated retries and attribution spoofing cannot write",
  async () => {
    const h = await harness();
    const command = await h.command("transferred");
    const pending = await h.command();
    await assert.rejects(h.cases.resolve(manager, {...pending, command: {
      ...pending.command, payload: {...pending.command.payload,
        owner: "host-2"}}}),
    {code: "permission-denied"});
    await h.cases.resolve(manager, command);
    const before = h.fake.entries();
    await assert.rejects(h.cases.resolve(manager, pending), {code: "aborted"});
    await assert.rejects(h.cases.resolve(manager, {...command, command: {
      ...command.command, payload: {...command.command.payload,
        outcome: "declined"}}}),
    {code: "aborted"});
    assert.deepEqual(h.fake.entries(), before);
  });

test("legacy and replaced guest sources are explicit and cannot be acted on",
  async () => {
    for (const variant of ["legacy", "recreated", "generationChanged",
      "deleted", "foreign"] as const) {
      const h = await harness();
      const command = await h.command();
      if (variant === "legacy") {
        const raw = {...h.created.data} as Record<string, unknown>;
        delete raw.handling;
        delete raw.sourceGeneration;
        delete raw.attendeeGeneration;
        await h.write(h.created.path, raw);
      } else if (variant === "recreated") {
        h.fake.generation = Timestamp.fromMillis(2);
      } else if (variant === "generationChanged") {
        await h.write(h.attendeePath, {...await h.read(h.attendeePath),
          createdAt: Timestamp.fromMillis(h.clock.now + 1)});
      } else if (variant === "deleted") h.fake.remove(h.attendeePath);
      else {
        await h.write(h.attendeePath,
          {...await h.read(h.attendeePath), eventId: "another-event"});
      }
      const row = (await h.list()).cases[0];
      assert.equal(row.availability,
        variant === "legacy" ? "legacy" : "sourceChanged");
      assert.equal(row.attendeeId, null);
      assert.equal(row.canChange, false);
      await assert.rejects(h.cases.resolve(manager, command),
        {code: "failed-precondition"});
    }
  });

test("attendance, departure and event closure do not silently settle a request",
  async () => {
    const h = await harness();
    await h.write(h.attendeePath, {...await h.read(h.attendeePath),
      status: "checkedIn", checkedInAt: Timestamp.fromMillis(h.clock.now),
      checkedInBy: manager});
    const guestPath = guestCollections.guests + "/" + h.created.data.guestId;
    await h.write(guestPath, {...await h.read(guestPath),
      episodeId: "new-episode",
      participation: {state: "departed", resumeAtUnit: null}});
    h.clock.now += 86_400_000;
    await h.write("events/" + h.context.eventId,
      {...await h.read("events/" + h.context.eventId), status: "cancelled"});
    assert.equal((await h.list()).cases[0].canChange, true);
    const result = await h.cases.resolve(manager, await h.command());
    assert.equal(result.outcome, "applied");
  });

test("malformed case state fails rather than becoming an empty queue",
  async () => {
    const h = await harness();
    assert.ok("handling" in h.created.data);
    for (const patch of [
      {status: "resolved"},
      {caseId: "case:wrong"},
      {handling: {...h.created.data.handling, updatedAt: h.clock.now + 1}},
      {handling: {...h.created.data.handling, revision: 0.5}},
    ]) {
      await h.write(h.created.path, {...h.created.data, ...patch});
      await assert.rejects(h.cases.list(manager, {...h.input,
        status: patch.status === "resolved" ? "resolved" : "open"}));
    }
  });

test("invalid and rehearsal inputs fail before reading source documents",
  async () => {
    const h = await harness();
    const command = await h.command();
    const reads: string[] = [];
    h.fake.beforeRead = (path) => reads.push(path);
    for (const input of [{...h.input, cursor: "a/b"},
      {...h.input, limit: 10000},
      {...h.input, status: "everything"},
      {...h.input, context: {mode: "rehearsal"}}]) {
      await assert.rejects(h.cases.list(manager, input),
        {code: "invalid-argument"});
    }
    const payload: Record<string, unknown> = {...command.command.payload};
    delete payload.expectedRevision;
    await assert.rejects(h.cases.resolve(manager, {...command, command: {
      ...command.command, payload}}), {code: "invalid-argument"});
    await assert.rejects(h.cases.resolve(manager, {...command, command: {
      ...command.command, eventId: "wrong-event"}}),
    {code: "invalid-argument"});
    assert.deepEqual(reads, []);
  });

test("wire contracts reject impossible case state combinations", async () => {
  const h = await harness();
  const result = await h.list();
  const row = result.cases[0];
  assert.ok("handling" in h.created.data);
  for (const data of [
    {...h.created.data, sourceGeneration: undefined},
    {...h.created.data, attendeeGeneration: undefined},
    {...h.created.data, category: "comfortSafety"},
    {...h.created.data, status: "resolved"},
  ]) {
    assert.equal(validateEventAssistanceCaseDocument(
      JSON.parse(JSON.stringify(data))), false);
  }
  for (const patch of [
    {attendeeId: null}, {canChange: false}, {revision: null},
    {availability: "sourceChanged"}, {status: "resolved"},
    {assignment: {kind: "assigned", uid: "host-2"}},
    {assignment: {kind: "unassigned", uid: "host-2"}},
    {resolution: {outcome: "transferred", actorUid: manager, at: h.clock.now}},
  ]) {
    assert.equal(validateEventAssistanceCasesCallableResponse({...result,
      cases: [{...row, ...patch}]}), false);
  }
});

test("case handlers authenticate and rate-limit before accessing the store",
  async () => {
    for (const handler of [listEventAssistanceCasesHandler,
      resolveEventAssistanceCaseHandler]) {
      const calls: string[] = [];
      const deps = {db: () => ({}) as Firestore,
        rateLimit: async () => {
          calls.push("limit");
        },
        store: () => {
          throw new Error("store called");
        }};
      await assert.rejects(handler({data: {}} as CallableRequest, deps),
        {code: "unauthenticated"});
      assert.deepEqual(calls, []);
      await assert.rejects(handler(
      {data: {}, auth: {uid: manager}} as CallableRequest,
      deps), /store called/);
      assert.deepEqual(calls, ["limit"]);
      await assert.rejects(handler(
      {data: {}, auth: {uid: manager}} as CallableRequest,
      {...deps, rateLimit: async () => {
        throw new Error("rate limited");
      }}),
      /rate limited/);
    }
  });

test("Firestore contending resolutions apply once and fence recreated guests", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  const db = getEmulatorFirestore(app);
  try {
    const h = await harness(db);
    const command = await h.command();
    const replies = await Promise.all(Array.from({length: 4}, () =>
      h.cases.resolve(manager, command)));
    assert.equal(replies.filter((r) => r.outcome === "applied").length, 1);
    assert.equal(replies.filter((r) => r.outcome === "replayed").length, 3);
    const competing = await harness(db);
    const commands = await Promise.all([
      competing.command("resolved"), competing.command("declined")]);
    const outcomes = await Promise.allSettled(commands.map((command) =>
      competing.cases.resolve(manager, command)));
    assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(outcomes.filter((r) => r.status === "rejected").length, 1);
    const attendee = (await db.doc(h.attendeePath).get()).data()!;
    await db.doc(h.attendeePath).delete();
    await db.doc(h.attendeePath).set(attendee);
    const replay = await h.cases.resolve(manager, command);
    assert.equal(replay.outcome, "replayed");
    assert.equal(replay.view.availability, "sourceChanged");
    assert.equal(replay.view.attendeeId, null);
    await db.collection("organizers").doc(h.context.organizerId).delete();
    await assert.rejects(h.cases.resolve(manager, command),
      {code: "permission-denied"});
  } finally {
    await db.terminate();
    await deleteApp(app);
  }
});


test("guest-help names and manager choices remain bound to current sources",
  async () => {
    const h = await harness();
    const attendee = (await h.read(h.attendeePath))!;
    await h.write(h.attendeePath, {...attendee, displayName: "Alex"});
    const before = await h.list();
    assert.equal(before.cases[0].displayName, "Alex");
    assert.equal(before.managerOptions!.actorUid, manager);
    const command = await h.command();
    await h.write(h.attendeePath, {...attendee, displayName: "Alex M"});
    await assert.rejects(h.cases.resolve(manager, command), {code: "aborted"});
    await h.write(h.attendeePath, {...attendee, displayName: "Replacement",
      createdAt: Timestamp.fromMillis(h.clock.now + 1)});
    const changed = await h.list();
    assert.equal(changed.cases[0].availability, "sourceChanged");
    assert.equal(changed.cases[0].displayName, null);
    assert.ok(!JSON.stringify(changed).includes("Replacement"));
  });
