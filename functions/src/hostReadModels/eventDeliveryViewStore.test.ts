import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFileSync, writeFileSync} from "node:fs";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {contractValidator} from "../shared/contractTestValidators";
import {operationCollections} from "../operations/collections";
import type {RepairEventAssistanceDeliveryCallablePayload as Command} from
  "../shared/generated/repairEventAssistanceDeliveryCallablePayload";
import {EventAssistanceDeliveriesStore} from
  "../eventSuccess/operations/hostDeliveriesStore";
import {deliveryWorkIds, hasAutomaticDelivery} from
  "../eventSuccess/operations/deliveryWorkRecords";
import {deliveryActionsUntil} from
  "../eventSuccess/operations/hostDeliveryRecords";
import {messageWindowOpen} from "../eventSuccess/operations/guestRecords";
import type {GuestSourceFacts} from "../eventSuccess/operations/guestRecords";
import type {MessageRecord} from "../eventSuccess/operations/messageOutbox";
import {setupRuntimePublication} from
  "../eventSuccess/operations/runtimeConfigTestHarness";
import type {VerifiedDeliveryReceipt} from
  "../eventSuccess/operations/deliveryReceipts";
import {
  backfillEventDeliveryViews,
  eventDeliveryViewsCollection,
  reconcileEventDeliveryView,
} from "./eventDeliveryViewStore";

type Data = Record<string, unknown>;
const manager = "host-1";
const validateView = contractValidator("HostEventDeliveryViewDocument");

async function harness(fixtureId?: ReturnType<typeof randomUUID>) {
  const h = await setupRuntimePublication(undefined, fixtureId);
  const published = await h.publishReady();
  const delivery = await h.delivery(published);
  const reviewStore = new EventAssistanceDeliveriesStore(h.db,
    () => h.clock.now);
  const deps = {now: () => Timestamp.fromMillis(h.clock.now)};
  const reconcile = (messageId = published.messageId) =>
    reconcileEventDeliveryView(h.db, messageId, deps);
  const view = async (messageId = published.messageId) => await h.read(
    eventDeliveryViewsCollection + "/" + messageId) as Data | undefined;
  const row = async (messageId = published.messageId) =>
    (await view(messageId))!.view as Data;
  const command = async (): Promise<Command> => {
    await reconcile();
    const current = await row();
    return {expectedMessageRevision: current.revision as number,
      expectedReviewHash: current.reviewHash as string, command: {
        kind: "repairDelivery", context: h.context,
        eventId: h.context.eventId, operationId: randomUUID(),
        payload: {deliveryId: published.messageId, action: "manualHandoff"}}};
  };
  const record = async () => (await h.outbox.get(published.messageId))!;
  const receipt = async (state: VerifiedDeliveryReceipt["state"]) => {
    const attempt = (await record()).attempts.at(-1)!;
    assert.ok(attempt.mode === "live");
    return h.outbox.recordReceipt(published.messageId, {...attempt.binding,
      attemptId: attempt.attemptId, providerEventId: randomUUID(),
      receivedAt: h.clock.now, state});
  };
  return {...h, published, delivery, reviewStore, deps, reconcile, view, row,
    command, record, receipt};
}

function fixtureView(id: string, data: Data) {
  const evaluatedAt = data.evaluatedAt as {_seconds?: number;
    _nanoseconds?: number; toMillis?: () => number};
  return {id, data: {...data, evaluatedAt: typeof evaluatedAt.toMillis ===
    "function" ? evaluatedAt.toMillis() : evaluatedAt._seconds! * 1000 +
    Math.floor(evaluatedAt._nanoseconds! / 1_000_000)}};
}

test("a live message gets a complete, current view",
  async () => {
    const h = await harness();
    for (const messageId of [h.published.messageId, h.messageId]) {
      assert.deepEqual(await h.reconcile(messageId),
        {kind: "complete", revision: 1});
      const written = (await h.view(messageId))!;
      assert.ok(validateView(JSON.parse(JSON.stringify({...written,
        evaluatedAt: Timestamp.fromMillis(h.clock.now)}))),
      JSON.stringify(validateView.errors));
      assert.equal(written.messageId, messageId);
      assert.equal(written.organizerId, h.context.organizerId);
      assert.equal(written.eventId, h.context.eventId);
      assert.equal(written.lifecycle, "active");
      assert.equal(written.sourceCoverage, "complete");
      assert.equal((written.view as Data).messageId, messageId);
      assert.equal((written.view as Data).availability, "current");
      assert.equal((written.view as Data).attendeeId, h.scope.attendeeId);
    }
    const record = await h.record();
    const written = (await h.view())!;
    assert.deepEqual((written.view as Data).actions, ["manualHandoff"]);
    assert.ok(typeof written.relevantUntilMillis === "number");
    assert.ok((written.relevantUntilMillis as number) <=
      record.intent.expiresAt);
    for (const hidden of [h.actor.phone, h.options.routes[0].senderId,
      "providerMessageId", "recipientEndpointId", "secret", "budget",
      "sourceGeneration", "episodeId", "responseUrl", "templateDocumentId"]) {
      assert.ok(!JSON.stringify(written).includes(hidden), hidden);
    }
  });

test("the handoff lapses exactly at relevantUntilMillis", async () => {
  const h = await harness();
  await h.reconcile();
  const until = (await h.view())!.relevantUntilMillis as number;
  h.clock.now = until - 1;
  await h.reconcile();
  assert.deepEqual((await h.row()).actions, ["manualHandoff"]);
  h.clock.now = until;
  await h.reconcile();
  const written = (await h.view())!;
  assert.deepEqual((written.view as Data).actions, []);
  assert.equal(written.relevantUntilMillis, null);
});

test("a re-evaluation with nothing changed writes nothing", async () => {
  const h = await harness();
  await h.reconcile();
  const first = await h.view();
  h.clock.now += 1000;
  assert.deepEqual(await h.reconcile(), {kind: "unchanged", revision: 1});
  assert.deepEqual(await h.view(), first);
});

test("a handoff and a manager's removal re-evaluate ownership and actions",
  async () => {
    const h = await harness();
    const path = "organizers/" + h.context.organizerId;
    const organizer = (await h.read(path))!;
    await h.write(path, {...organizer,
      hostUserIds: [...organizer.hostUserIds, "host-2"]});
    const applied = await h.reviewStore.repair("host-2", await h.command());
    await h.reconcile();
    assert.deepEqual(await h.row(), applied.view);
    assert.equal((await h.view())!.relevantUntilMillis, null);
    await h.write(path, organizer);
    await h.reconcile();
    assert.deepEqual((await h.row()).handling, {kind: "manual",
      actorUid: "host-2", at: h.clock.now, authority: "revoked"});
    assert.deepEqual((await h.row()).actions, ["manualHandoff"]);
  });

test("a replaced guest loses identity and actions but keeps evidence",
  async () => {
    const h = await harness();
    await h.write(h.attendeePath, {...await h.read(h.attendeePath),
      createdAt: Timestamp.fromMillis(h.clock.now + 1)});
    await h.reconcile();
    const row = await h.row();
    assert.equal(row.availability, "sourceChanged");
    assert.equal(row.attendeeId, null);
    assert.equal(row.displayName, null);
    assert.deepEqual(row.actions, []);
    assert.equal(row.deliveryStatus, "notSubmitted");
    assert.equal((await h.view())!.relevantUntilMillis, null);
  });

test("a missing coordinator records invalidSource and keeps the previous view",
  async () => {
    const h = await harness();
    await h.reconcile();
    const before = (await h.view())!;
    const ids = deliveryWorkIds(h.published.messageId);
    h.fake.remove(operationCollections.workItems + "/" + ids.workItemId);
    const outcome = await h.reconcile();
    assert.ok(outcome.kind === "invalidSource");
    assert.equal(outcome.source, operationCollections.workItems);
    const after = (await h.view())!;
    assert.equal(after.sourceCoverage, "invalidSource");
    assert.deepEqual(after.view, before.view);
    assert.equal(after.relevantUntilMillis, before.relevantUntilMillis);
  });

test("an automatic message under a malformed id fails closed", async () => {
  const h = await harness();
  const raw = (await h.read("eventAssistanceMessages/" +
    h.published.messageId))!;
  assert.ok(hasAutomaticDelivery(await h.record()));
  // The record names the malformed id, or keeps its own under a malformed
  // document id. Either way no projection is written and nothing throws.
  for (const [index, named] of [true, false].entries()) {
    const malformed = "outbox:" + String(index).repeat(3) + "Z".repeat(61);
    await h.write("eventAssistanceMessages/" + malformed,
      named ? {...raw, messageId: malformed} : raw);
    const outcome = await h.reconcile(malformed);
    assert.ok(outcome.kind === "invalidSource", JSON.stringify(outcome));
    assert.equal(outcome.source, "eventAssistanceMessages");
    const written = (await h.view(malformed))!;
    assert.equal(written.sourceCoverage, "invalidSource");
    assert.equal(written.view, null);
    assert.equal(written.relevantUntilMillis, null);
  }
});

test("a missing or rehearsal message, organizer or event removes the view",
  async () => {
    const id = "outbox:" + "b".repeat(64);
    const intent = {context: {mode: "live", organizerId: "org",
      eventId: "event"}, eventId: "event", attendeeId: "attendee"};
    const base: Record<string, Data | undefined> = {
      ["hostEventDeliveryViews/" + id]: {messageId: id, organizerId: "org"},
      ["eventAssistanceMessages/" + id]: {messageId: id, intent},
      "organizers/org": {name: "Org"},
      "events/event": {organizerId: "org"},
    };
    for (const patch of [
      {["eventAssistanceMessages/" + id]: undefined},
      {["eventAssistanceMessages/" + id]: {messageId: id, intent: {...intent,
        context: {mode: "rehearsal", sessionId: "s"}}}},
      {["eventAssistanceMessages/" + id]: {messageId: id, intent: {...intent,
        eventId: "other"}}},
      {"organizers/org": undefined},
      {"events/event": undefined},
    ]) {
      const docs: Record<string, Data | undefined> = {...base, ...patch};
      for (const [key, value] of Object.entries(docs)) {
        if (value === undefined) delete docs[key];
      }
      const store = new AudienceTestStore(docs as Record<string, Data>);
      assert.deepEqual(await reconcileEventDeliveryView(store.asFirestore(),
        id, {now: () => Timestamp.fromMillis(1)}),
      {kind: "removed", existed: true}, JSON.stringify(patch));
      assert.equal(store.docs["hostEventDeliveryViews/" + id], undefined);
    }
  });

test("backfill counts the organizer's live messages and applies", async () => {
  const h = await harness();
  const dry = await backfillEventDeliveryViews(h.db, h.context.organizerId,
    false);
  assert.equal(dry.messages, 2);
  assert.equal(await h.view(), undefined);
  const applied = await backfillEventDeliveryViews(h.db,
    h.context.organizerId, true,
    (messageId) => reconcileEventDeliveryView(h.db, messageId, h.deps));
  assert.equal(applied.outcomes.complete, 2);
  assert.ok(await h.view());
});

test("deliveryActionsUntil is the instant messageWindowOpen closes",
  () => {
    const eventEnd = 10_000;
    const expiresAt = 20_000;
    const source = {eventTitle: "Event", eventStatus: "active",
      eventEnd, attendeeStatus: "registered", attendeeGeneration: "a",
      sourceGeneration: "s"} satisfies GuestSourceFacts;
    const kinds = ["joiningInstructions", "planChanged", "guestRequirement",
      "assignmentChanged", "participationCheck", "eventCancelled",
      "eventFinished", "followUp"] as const;
    const intents = [{kind: "joiningUpdate", expiresAt},
      ...kinds.map((noticeKind) => ({kind: "operationalNotice", noticeKind,
        expiresAt}))] as unknown as MessageRecord["intent"][];
    for (const intent of intents) {
      const until = deliveryActionsUntil(intent, source);
      const label = JSON.stringify(intent);
      if (until < expiresAt) {
        assert.equal(messageWindowOpen(intent, source, until - 1), true, label);
        assert.equal(messageWindowOpen(intent, source, until), false, label);
      } else {
        assert.equal(until, expiresAt, label);
        // Past the event's end the window no longer changes with time.
        assert.equal(messageWindowOpen(intent, source, eventEnd),
          messageWindowOpen(intent, source, expiresAt), label);
      }
    }
  });

test("native delivery fixture holds actual delivery views", async () => {
  const h = await harness("00000000-0000-0000-0000-000000000456");
  await h.write(h.attendeePath, {...await h.read(h.attendeePath),
    displayName: "Alex Morgan"});
  const stage = async () => {
    const views = [];
    for (const messageId of [h.published.messageId, h.messageId].sort()) {
      await h.reconcile(messageId);
      views.push(fixtureView(messageId, (await h.view(messageId))!));
    }
    return {context: h.context, views};
  };
  const initial = await stage();
  await h.delivery.claim();
  h.clock.now += 1000;
  const uncertain = await stage();
  const command = {...await h.command(), command: {
    ...(await h.command()).command, operationId: "native-handoff"}};
  const handedOff = await h.reviewStore.repair(manager, command);
  h.clock.now += 1000;
  await h.receipt({kind: "delivered", at: h.clock.now,
    providerMessageId: "wamid.native"});
  h.clock.now += 1000;
  const delivered = await stage();
  await h.write(h.attendeePath, {...await h.read(h.attendeePath),
    createdAt: Timestamp.fromMillis(h.clock.now)});
  h.clock.now += 1000;
  const replaced = await stage();
  assert.ok(replaced.views.every((v) =>
    ((v.data as Data).view as Data).displayName === null));
  const samples = {initial, uncertain, command, handedOff, delivered,
    replaced};
  const path = "../test/event_success/fixtures/delivery_queue.json";
  if (process.env.UPDATE_DELIVERY_QUEUE_FIXTURE === "1") {
    writeFileSync(path, JSON.stringify(samples, null, 2) + "\n");
  }
  assert.deepEqual(JSON.parse(readFileSync(path, "utf8")),
    JSON.parse(JSON.stringify(samples)));
});
