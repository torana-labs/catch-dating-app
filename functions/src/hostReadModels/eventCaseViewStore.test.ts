import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFileSync, writeFileSync} from "node:fs";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {contractValidator} from "../shared/contractTestValidators";
import {validateEventAssistanceCaseDocument} from
  "../shared/generated/validators/eventAssistanceCaseDocument";
import type {ResolveEventAssistanceCaseCallablePayload as Command} from
  "../shared/generated/resolveEventAssistanceCaseCallablePayload";
import {guestCollections} from "../eventSuccess/operations/guestRecords";
import {EventAssistanceCasesStore} from
  "../eventSuccess/operations/hostCasesStore";
import {assistanceMessageId} from "../eventSuccess/operations/messageOutbox";
import {setup} from "../eventSuccess/operations/liveLateJoinTestHarness";
import {keys} from "../eventSuccess/operations/whatsappTestHarness";
import {
  backfillEventCaseViews,
  eventCaseViewsCollection,
  reconcileEventCaseView,
} from "./eventCaseViewStore";

type Data = Record<string, unknown>;
const manager = "host-1";
const validateView = contractValidator("HostEventCaseViewDocument");

async function harness(fixtureId?: ReturnType<typeof randomUUID>) {
  const h = await setup(undefined, fixtureId);
  const cases = new EventAssistanceCasesStore(h.db, () => h.clock.now);
  const deps = {now: () => Timestamp.fromMillis(h.clock.now)};
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
    assert.equal((await h.guests.submit({linkId: link.linkId,
      secret: link.secret, intentId: view.intentId,
      intentRevision: view.intentRevision,
      expectedGuestRevision: view.guestRevision, choiceId: "help",
      requestId: "response"})).result.kind, "accepted");
    const rows = await h.db.collection(guestCollections.cases)
      .where("messageId", "==", assistanceMessageId(intent)).get();
    assert.equal(rows.size, 1);
    const data = rows.docs[0].data();
    assert.ok(validateEventAssistanceCaseDocument(data));
    return {data, caseId: data.caseId as string,
      path: guestCollections.cases + "/" + data.caseId};
  };
  const created = await create("eventLogistics",
    fixtureId ? "native-help" : undefined);
  const reconcile = (caseId = created.caseId) =>
    reconcileEventCaseView(h.db, caseId, deps);
  const view = async (caseId = created.caseId) =>
    await h.read(eventCaseViewsCollection + "/" + caseId) as Data | undefined;
  const command = async (outcome: Command["command"]["payload"]["outcome"] =
  "resolved", owner = manager): Promise<Command> => {
    await reconcile();
    const row = (await view())!.view as {caseId: string; revision: number;
      sourceHash: string};
    return {expectedSourceHash: row.sourceHash, command: {
      kind: "resolveAssistance", context: h.context,
      eventId: h.context.eventId, operationId: randomUUID(),
      payload: {caseId: row.caseId, expectedRevision: row.revision,
        outcome, owner}}};
  };
  return {...h, cases, deps, create, created, reconcile, view, command};
}

/** A view as the Flutter fixtures hold it: evaluatedAt in milliseconds. */
function fixtureView(id: string, data: Data) {
  const evaluatedAt = data.evaluatedAt as {_seconds?: number;
    _nanoseconds?: number; toMillis?: () => number};
  return {id, data: {...data, evaluatedAt: typeof evaluatedAt.toMillis ===
    "function" ? evaluatedAt.toMillis() : evaluatedAt._seconds! * 1000 +
    Math.floor(evaluatedAt._nanoseconds! / 1_000_000)}};
}

test("a practical live case gets a complete, current view",
  async () => {
    const h = await harness();
    assert.deepEqual(await h.reconcile(), {kind: "complete", revision: 1});
    const written = (await h.view())!;
    assert.ok(validateView(JSON.parse(JSON.stringify({...written,
      evaluatedAt: Timestamp.fromMillis(h.clock.now)}))),
    JSON.stringify(validateView.errors));
    assert.equal(written.caseId, h.created.caseId);
    assert.equal(written.organizerId, h.context.organizerId);
    assert.equal(written.eventId, h.context.eventId);
    assert.equal(written.status, "open");
    assert.equal(written.receivedAt, h.created.data.receivedAt);
    assert.equal(written.sourceCoverage, "complete");
    assert.equal(written.incompleteSource, null);
    const row = written.view as Data;
    assert.equal(row.caseId, h.created.caseId);
    assert.equal(row.availability, "current");
    assert.equal(row.revision, 0);
    assert.equal(row.attendeeId, h.scope.attendeeId);
    assert.equal(row.canChange, true);
    assert.deepEqual(row.assignment, {kind: "unassigned"});
    for (const hidden of [h.actor.phone, "messageId", "guestId",
      "sourceGeneration", "secret", "responseId", "budget", "episodeId"]) {
      assert.ok(!JSON.stringify(written).includes(hidden), hidden);
    }
  });

test("a safety-owned case never produces a view", async () => {
  const h = await harness();
  const safety = await h.create("comfortSafety");
  assert.notEqual(safety.data.owner, "eventLead");
  assert.deepEqual(await h.reconcile(safety.caseId),
    {kind: "removed", existed: false});
  assert.equal(await h.view(safety.caseId), undefined);
  assert.equal((await h.reconcile()).kind, "complete");
  assert.ok(await h.view());
});

test("a re-evaluation with nothing changed writes nothing", async () => {
  const h = await harness();
  await h.reconcile();
  const first = await h.view();
  h.clock.now += 60_000;
  assert.deepEqual(await h.reconcile(), {kind: "unchanged", revision: 1});
  assert.deepEqual(await h.view(), first);
});

test("resolution moves the view to the resolved queue with the command's row",
  async () => {
    const h = await harness();
    const applied = await h.cases.resolve(manager, await h.command());
    assert.deepEqual(await h.reconcile(), {kind: "complete", revision: 2});
    const written = (await h.view())!;
    assert.equal(written.status, "resolved");
    assert.deepEqual(written.view, applied.view);
  });

test("a manager's removal revokes the assignment authority the view shows",
  async () => {
    const h = await harness();
    const organizerPath = "organizers/" + h.context.organizerId;
    const organizer = (await h.read(organizerPath))!;
    await h.write(organizerPath, {...organizer,
      hostUserIds: [...organizer.hostUserIds, "host-2"]});
    await h.cases.resolve(manager, await h.command("transferred", "host-2"));
    await h.reconcile();
    assert.deepEqual(((await h.view())!.view as Data).assignment,
      {kind: "assigned", uid: "host-2", authority: "current"});
    await h.write(organizerPath, organizer);
    await h.reconcile();
    assert.deepEqual(((await h.view())!.view as Data).assignment,
      {kind: "assigned", uid: "host-2", authority: "revoked"});
  });

test("a replaced guest source hides the name and every action", async () => {
  const h = await harness();
  await h.write(h.attendeePath, {...await h.read(h.attendeePath),
    displayName: "Alex"});
  await h.reconcile();
  assert.equal(((await h.view())!.view as Data).displayName, "Alex");
  await h.write(h.attendeePath, {...await h.read(h.attendeePath),
    displayName: "Replacement",
    createdAt: Timestamp.fromMillis(h.clock.now + 1)});
  await h.reconcile();
  const row = (await h.view())!.view as Data;
  assert.equal(row.availability, "sourceChanged");
  assert.equal(row.displayName, null);
  assert.equal(row.attendeeId, null);
  assert.equal(row.canChange, false);
  assert.ok(!JSON.stringify(await h.view()).includes("Replacement"));
});

test("an invalid case keeps the previous view and records its source",
  async () => {
    const h = await harness();
    await h.reconcile();
    const before = (await h.view())!;
    assert.ok("handling" in h.created.data);
    await h.write(h.created.path, {...h.created.data, handling: {
      ...h.created.data.handling, updatedAt: h.clock.now + 1}});
    const outcome = await h.reconcile();
    assert.equal(outcome.kind, "invalidSource");
    assert.ok(outcome.kind === "invalidSource");
    assert.equal(outcome.incompleteSource, "eventAssistanceCases");
    const after = (await h.view())!;
    assert.equal(after.sourceCoverage, "invalidSource");
    assert.equal(after.incompleteSource, "eventAssistanceCases");
    assert.deepEqual(after.view, before.view);
    assert.equal(after.revision, 2);
    // A second evaluation of the same bad source writes nothing more.
    assert.deepEqual(await h.reconcile(), {kind: "invalidSource",
      incompleteSource: "eventAssistanceCases", detail: outcome.detail,
      revision: 2, written: false});
  });

test("a case invalid at its first evaluation has a null view", async () => {
  const h = await harness();
  await h.write(h.created.path, {...h.created.data, caseId: "case:wrong"});
  assert.equal((await h.reconcile()).kind, "invalidSource");
  const written = (await h.view())!;
  assert.equal(written.view, null);
  assert.equal(written.status, "open");
  assert.equal(written.sourceCoverage, "invalidSource");
});

test("a missing, rehearsal or safety case, organizer or event removes the view",
  async () => {
    const id = "case:" + "a".repeat(64);
    const context = {mode: "live", organizerId: "org", eventId: "event"};
    const base: Record<string, Data> = {
      ["hostEventCaseViews/" + id]: {caseId: id, organizerId: "org"},
      ["eventAssistanceCases/" + id]: {owner: "eventLead", context,
        attendeeId: "attendee"},
      "organizers/org": {name: "Org"},
      "events/event": {organizerId: "org"},
    };
    const now = {now: () => Timestamp.fromMillis(1)};
    for (const patch of [
      {["eventAssistanceCases/" + id]: undefined},
      {["eventAssistanceCases/" + id]: {owner: "safety", context}},
      {["eventAssistanceCases/" + id]: {owner: "eventLead",
        context: {...context, mode: "rehearsal"}}},
      {["eventAssistanceCases/" + id]: {owner: "eventLead",
        context: {...context, organizerId: "bad/id"}}},
      {"organizers/org": undefined},
      {"events/event": undefined},
    ]) {
      const docs = {...base, ...patch} as Record<string, Data>;
      for (const [key, value] of Object.entries(docs)) {
        if (value === undefined) delete docs[key];
      }
      const store = new AudienceTestStore(docs);
      assert.deepEqual(await reconcileEventCaseView(store.asFirestore(), id,
        now), {kind: "removed", existed: true}, JSON.stringify(patch));
      assert.equal(store.docs["hostEventCaseViews/" + id], undefined);
    }
  });

test("backfill counts the organizer's live practical cases and applies",
  async () => {
    const h = await harness();
    await h.create("comfortSafety");
    const dry = await backfillEventCaseViews(h.db, h.context.organizerId,
      false);
    assert.deepEqual(dry, {cases: 1, outcomes: {removed: 0, unchanged: 0,
      complete: 0, invalidSource: 0}});
    assert.equal(await h.view(), undefined);
    const applied = await backfillEventCaseViews(h.db, h.context.organizerId,
      true, (caseId) => reconcileEventCaseView(h.db, caseId, h.deps));
    assert.equal(applied.outcomes.complete, 1);
    assert.ok(await h.view());
  });

test("native help queue fixtures hold actual case views", async () => {
  const h = await harness("00000000-0000-0000-0000-000000000123");
  const path = "organizers/" + h.context.organizerId;
  await h.write(path, {...await h.read(path),
    hostUserIds: [manager, "host-2"], hostProfiles: [
      {uid: manager, displayName: "Sam", avatarUrl: null, role: "host"},
      {uid: "host-2", displayName: "Priya", avatarUrl: null, role: "host"},
    ]});
  await h.write(h.attendeePath, {...await h.read(h.attendeePath),
    displayName: "Alex Morgan"});
  const organizer = (await h.read(path))!;
  const stage = async () => {
    await h.reconcile();
    return {context: h.context, organizer: {hostUserId: organizer.hostUserId,
      ownerUserId: organizer.ownerUserId ?? null,
      hostUserIds: organizer.hostUserIds, hostName: organizer.hostName ?? null,
      hostProfiles: organizer.hostProfiles},
    views: [fixtureView(h.created.caseId, (await h.view())!)]};
  };
  const initial = await stage();
  const transfer = await h.cases.resolve(manager,
    await h.command("transferred", "host-2"));
  h.clock.now += 1000;
  const assigned = await stage();
  const resolved = await h.cases.resolve(manager, await h.command());
  h.clock.now += 1000;
  const handled = await stage();
  const samples = {initial, transfer, assigned, resolved, handled};
  const file = "../test/event_success/fixtures/help_queue.json";
  if (process.env.UPDATE_HELP_QUEUE_FIXTURE === "1") {
    writeFileSync(file, JSON.stringify(samples, null, 2) + "\n");
  }
  assert.deepEqual(JSON.parse(readFileSync(file, "utf8")),
    JSON.parse(JSON.stringify(samples)));
});
