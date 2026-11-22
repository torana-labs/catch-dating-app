import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {EventAssistanceMessageIntent as Intent} from
  "../../shared/generated/eventAssistanceMessageIntent";
import type {SubmitEventAssistanceGuestChoiceCallablePayload as Submission} from
  "../../shared/generated/submitEventAssistanceGuestChoiceCallablePayload";
import {validateEventAssistanceCommand} from
  "../../shared/generated/validators/eventAssistanceCommand";
import {ProgressFirestore, seedJoiningProgress} from
  "./groupProgressTestFixtures";
import {GuestAssistanceStore} from "./guestAssistanceStore";
import {Guest, guestCollections, parseGuest} from "./guestRecords";
import type {GuestLinkSigningKeys} from
  "../../platform/guestLinkSigningKeys";
import {assistanceMessageId, parseMessageRecord} from "./messageOutbox";
import {EVENT_ASSISTANCE_MESSAGES, FirestoreMessageOutbox} from
  "./firestoreMessageOutbox";
import {readEventAssistanceMessageGate} from "./guestMessageGate";
import {
  getEventAssistanceGuestViewHandler, submitEventAssistanceGuestChoiceHandler,
} from "./guestHandlers";

const context = {mode: "live" as const, eventId: "event-1",
  organizerId: "organizer-1"};
const keys: GuestLinkSigningKeys = {currentKeyId: "key-1",
  keyFor: () => Buffer.alloc(32, 9)};

function sourceEvent() {
  return {organizerId: context.organizerId, status: "active",
    name: "Friday social", endTime: {seconds: 3000, nanoseconds: 0}};
}

function sourceAttendee() {
  return {organizerId: context.organizerId, eventId: context.eventId,
    status: "registered", createdAt: {seconds: 900, nanoseconds: 4},
    phoneE164: "+919999999999", displayName: "Private guest",
    attendanceRevision: 7};
}

function message(guest: Guest,
  guidance: Extract<Intent, {kind: "joiningUpdate"}>["guidance"],
  id = "message:1"): Extract<Intent, {kind: "joiningUpdate"}> {
  return {schemaVersion: 1, intentId: id, revision: 1, context,
    eventId: context.eventId, attendeeId: guest.attendeeId,
    episodeId: guest.episodeId,
    workflow: {kind: "lateJoin", occurrenceId: "departure:episode-1"},
    createdAt: 1000000, expiresAt: 2000000,
    permittedRoutes: ["catchEventSms"],
    deliveryPolicy: {maxAttempts: 2, maxAttemptsPerRoute: 1,
      minimumRetrySeconds: 1}, kind: "joiningUpdate",
    guidance: structuredClone(guidance),
    choices: [
      {choiceId: "on-my-way", label: "I'm on my way",
        value: {kind: "joinIntent", intention: {kind: "onMyWay",
          claimedEta: null}}},
      {choiceId: "not-coming", label: "I can't make it",
        value: {kind: "joinIntent", intention: {kind: "notComing"}}},
      {choiceId: "help", label: "I need help",
        value: {kind: "requestHelp", category: "eventLogistics"}},
    ]};
}

async function harness() {
  const db = new ProgressFirestore();
  const progress = await seedJoiningProgress(db as unknown as Firestore,
    context, 1_000_000, 3_000_000);
  db.write("eventAttendees/attendee-1", sourceAttendee());
  const clock = {now: 1000000};
  const store = new GuestAssistanceStore(db as unknown as Firestore,
    () => clock.now);
  const guest = await store.startEpisode(context, "attendee-1",
    "start-1", null);
  const intent = message(guest, progress.guidance);
  const thread = await store.publishMessage(intent, null);
  const link = await store.issueLink(thread.threadId, "send-1", keys);
  const view = await store.getView(link.linkId, link.secret);
  assert.ok(view.status === "ready");
  const submission: Submission = {linkId: link.linkId, secret: link.secret,
    intentId: view.intentId, intentRevision: view.intentRevision,
    expectedGuestRevision: view.guestRevision, choiceId: "on-my-way",
    requestId: "reply-1"};
  return {progress, db, store, clock, guest, intent, thread, link, view,
    submission};
}

test("guest grants are scoped, secret-free and replayable", async () => {
  const h = await harness();
  const repeated = await h.store.issueLink(h.thread.threadId, "send-1", keys);
  assert.deepEqual(repeated, h.link);
  assert.equal(JSON.stringify(h.db.entries()).includes(h.link.secret), false);
  for (const privateValue of ["+919999999999", "Private guest", h.guest.guestId,
    h.guest.episodeId, h.link.secret]) {
    assert.equal(JSON.stringify(h.view).includes(privateValue), false);
  }
  await assert.rejects(h.store.getView(h.link.linkId, "a".repeat(43)),
    /unavailable/);
  const grantPath = guestCollections.grants + "/" + h.link.linkId;
  const grant = h.db.read(grantPath)!;
  h.db.write(grantPath, {...grant, context: {organizerId: context.organizerId,
    eventId: context.eventId, mode: "live"}});
  assert.deepEqual(await h.store.issueLink(h.thread.threadId, "send-1", keys),
    h.link);
  await h.store.revokeLink(h.link.linkId);
  await assert.rejects(h.store.getView(h.link.linkId, h.link.secret),
    /unavailable/);
});

test("old links follow updates; old buttons cannot act", async () => {
  const h = await harness();
  h.clock.now++;
  const next = message(h.guest, h.intent.guidance, "message:2");
  assert.ok(next.kind === "joiningUpdate");
  next.guidance = await h.progress.confirm("two");
  const thread = await h.store.publishMessage(next, h.thread.revision);
  assert.equal(thread.revision, h.thread.revision + 1);
  const view = await h.store.getView(h.link.linkId, h.link.secret);
  assert.ok(view.status === "ready");
  assert.equal(view.text, "Join us at stop two.");
  const result = await h.store.submit(h.submission);
  assert.deepEqual(result.result, {kind: "rejected", reason: "staleIntent"});
  const old = parseMessageRecord(h.db.read(EVENT_ASSISTANCE_MESSAGES + "/" +
    assistanceMessageId(h.intent)));
  assert.equal(old.lifecycle, "superseded");
  await assert.rejects(h.store.publishMessage(
    message(h.guest, next.guidance, "message:3"),
    h.thread.revision), /changed/);
});

test("workflow conversations retain independent instructions", async () => {
  const h = await harness();
  const second = message(h.guest, h.intent.guidance, "another-workflow");
  second.workflow = {kind: "joiningInstructions", occurrenceId: "welcome-1"};
  const thread = await h.store.publishMessage(second, null);
  assert.notEqual(thread.threadId, h.thread.threadId);
  const original = await h.store.getView(h.link.linkId, h.link.secret);
  assert.ok(original.status === "ready");
  assert.equal(original.intentId, h.intent.intentId);
});

test("reply updates intention without physical check-in", async () => {
  const h = await harness();
  const results = await Promise.all(Array.from({length: 8}, () =>
    h.store.submit(h.submission)));
  assert.equal(results.filter((r) => r.result.kind === "accepted").length, 1);
  assert.equal(results.filter((r) => r.result.kind === "replayed").length, 7);
  const guest = parseGuest(h.db.read(guestCollections.guests + "/" +
    h.guest.guestId));
  assert.deepEqual(guest.intention, {kind: "onMyWay", claimedEta: null});
  assert.equal(guest.revision, h.guest.revision + 1);
  assert.deepEqual(h.db.read("eventAttendees/attendee-1"), sourceAttendee());
  const reply = results[0].view;
  assert.ok(reply.status === "ready");
  assert.equal(reply.response?.label, "I'm on my way");
  assert.deepEqual(reply.choices, []);
  const duplicate = await h.store.submit({...h.submission,
    choiceId: "not-coming", requestId: "reply-2"});
  assert.deepEqual(duplicate.result,
    {kind: "rejected", reason: "alreadyResponded"});
});

test("an interrupted response transaction changes neither record", async () => {
  const h = await harness();
  const before = h.db.entries();
  h.db.failNextCommit = true;
  await assert.rejects(h.store.submit(h.submission), /interruption/);
  assert.deepEqual(h.db.entries(), before);
  assert.equal((await h.store.submit(h.submission)).result.kind, "accepted");
});

test("a replaced guest episode invalidates earlier grants", async () => {
  const h = await harness();
  const next = await h.store.startEpisode(context, "attendee-1", "start-2",
    h.guest.revision);
  assert.notEqual(next.episodeId, h.guest.episodeId);
  await assert.rejects(h.store.submit(h.submission), /unavailable/);
  await assert.rejects(h.store.issueLink(h.thread.threadId, "send-2", keys),
    /unavailable/);
});

test("source generation, check-in and event close invalidate stale directions",
  async () => {
    for (const change of ["generation", "checkIn", "end", "organizer"]) {
      const h = await harness();
      if (change === "generation") {
        h.db.write("eventAttendees/attendee-1", {...sourceAttendee(),
          createdAt: {seconds: 901, nanoseconds: 4}});
      }
      if (change === "checkIn") {
        h.db.write("eventAttendees/attendee-1", {...sourceAttendee(),
          status: "checkedIn"});
      }
      if (change === "end") {
        h.db.write("events/event-1", {...sourceEvent(),
          endTime: {seconds: 999, nanoseconds: 0}});
      }
      if (change === "organizer") {
        h.db.write("events/event-1", {...sourceEvent(), organizerId: "other"});
        await assert.rejects(h.store.submit(h.submission), /unavailable/);
      } else {
        const result = await h.store.submit(h.submission);
        assert.ok(result.result.kind === "rejected");
        assert.ok(result.view.status === "unavailable");
      }
      const guest = parseGuest(h.db.read(guestCollections.guests + "/" +
        h.guest.guestId));
      assert.deepEqual(guest.intention, {kind: "unknown"});
    }
  });

test("joining replies require the latest guest-state revision", async () => {
  const h = await harness();
  const result = await h.store.submit({...h.submission,
    expectedGuestRevision: h.guest.revision + 1});
  assert.deepEqual(result.result,
    {kind: "rejected", reason: "guestStateChanged"});
  const command = {kind: "setJoinIntent", context, eventId: context.eventId,
    operationId: "reply-1", payload: {attendeeId: h.guest.attendeeId,
      intent: {kind: "onMyWay", claimedEta: null}}};
  assert.equal(validateEventAssistanceCommand(command), false);
  assert.equal(validateEventAssistanceCommand({...command, payload: {
    ...command.payload, episodeId: h.guest.episodeId,
    expectedParticipationRevision: h.guest.revision,
  }}), true);
});

test("help replies create one case with the correct owner", async () => {
  for (const category of ["eventLogistics", "comfortSafety"] as const) {
    const h = await harness();
    const next = message(h.guest, h.intent.guidance, "help-message");
    next.choices = [{choiceId: "help", label: "I need help",
      value: {kind: "requestHelp", category}}];
    await h.store.publishMessage(next, h.thread.revision);
    const input = {...h.submission, intentId: next.intentId, choiceId: "help"};
    await h.store.submit(input);
    await h.store.submit(input);
    const cases = h.db.entries().filter(([path]) =>
      path.startsWith(guestCollections.cases + "/"));
    assert.equal(cases.length, 1);
    assert.equal(cases[0][1].owner, category === "comfortSafety" ?
      "authorizedSafetyOperator" : "eventLead");
    assert.equal(cases[0][1].status, "open");
    assert.deepEqual(h.db.read("eventAttendees/attendee-1"), sourceAttendee());
  }
});

test("an answered message stops its queued delivery", async () => {
  const h = await harness();
  const db = h.db as unknown as Firestore;
  const outbox = new FirestoreMessageOutbox(db, async (tx, intent, now) => ({
    gate: await readEventAssistanceMessageGate(db, tx, intent, now),
    routes: [{routeId: "catchEventSms", state: {kind: "eligible",
      checkedAt: now, validUntil: now + 30000,
      permissionRevision: "permission-1",
      candidate: {mode: "live", binding: {routeId: "catchEventSms",
        transport: "sms", provider: "sinch", senderIdentity: "catchPlatform",
        senderId: "sender-1", bindingRevision: 1,
        recipientEndpointId: "phone-1",
        fallbackOwner: "catch"}}}}],
  }), () => h.clock.now);
  const {record} = await outbox.reserve(assistanceMessageId(h.intent));
  await h.store.submit(h.submission);
  assert.equal((await outbox.claimLiveDispatch(record.messageId,
    record.attempts[0].attemptId)).kind, "withheld");
  assert.deepEqual((await outbox.reserve(record.messageId)).decision,
    {kind: "stop", reason: "responded"});
});

test("cancellation instructions remain readable after roster cancellation",
  async () => {
    const h = await harness();
    h.db.write("events/event-1", {...sourceEvent(), status: "cancelled"});
    h.db.write("eventAttendees/attendee-1", {...sourceAttendee(),
      status: "cancelled"});
    const base = message(h.guest, h.intent.guidance);
    const intent: Intent = {schemaVersion: 1, intentId: "cancellation:1",
      revision: 1, context, eventId: context.eventId,
      attendeeId: h.guest.attendeeId, episodeId: h.guest.episodeId,
      workflow: {kind: "planChangeCommunication", occurrenceId: "cancelled-1"},
      createdAt: h.clock.now, expiresAt: h.clock.now + 10000,
      permittedRoutes: base.permittedRoutes,
      deliveryPolicy: base.deliveryPolicy,
      kind: "operationalNotice", noticeKind: "eventCancelled",
      title: "Event cancelled", body: "Please do not travel to the venue.",
      instructionRevision: 1, choices: []};
    const thread = await h.store.publishMessage(intent, null);
    const link = await h.store.issueLink(thread.threadId,
      "cancel-send-1", keys);
    const view = await h.store.getView(link.linkId, link.secret);
    assert.ok(view.status === "ready");
    assert.equal(view.title, "Event cancelled");
    assert.equal((await h.store.getView(h.link.linkId, h.link.secret)).status,
      "unavailable");
  });

test("changed progress withholds publication, links and guest effects",
  async () => {
    for (const change of ["destination", "location", "missing", "generation",
      "complete"]) {
      const h = await harness();
      if (change === "destination") await h.progress.confirm("two");
      if (change === "location") {
        const event = structuredClone(h.progress.event);
        event.itinerary[0].location.name = "Different entrance";
        h.db.write("events/event-1", event);
      }
      if (change === "missing") {
        h.db.remove("eventAssistanceGroupProgress/" +
          h.progress.view.progress!.progressId);
      }
      if (change === "generation") {
        h.db.generation = Timestamp.fromMillis(2);
      }
      if (change === "complete") {
        h.db.write("eventSuccessPlans/event-1",
          {...h.progress.plan, status: "complete"});
      }
      const before = h.db.entries();
      assert.deepEqual(await h.store.getView(h.link.linkId, h.link.secret),
        {status: "unavailable", serverTime: h.clock.now,
          reason: change === "generation" ?
            "guestUnavailable" : "noInstructions"});
      assert.equal((await h.store.submit(h.submission)).result.kind,
        "rejected");
      await assert.rejects(h.store.publishMessage(h.intent, null),
        /unavailable/);
      await assert.rejects(h.store.issueLink(h.thread.threadId,
        "fresh-link", keys), /unavailable/);
      const db = h.db as unknown as Firestore;
      const gate = await db.runTransaction((tx) =>
        readEventAssistanceMessageGate(db, tx, h.intent, h.clock.now));
      assert.deepEqual(gate, {kind: "stop", reason: change === "generation" ?
        "notAdmitted" : "superseded"});
      assert.deepEqual(h.db.entries(), before);
    }
  });

test("identical reconfirmation preserves links; invented guidance is rejected",
  async () => {
    const h = await harness();
    await h.progress.confirm("one");
    assert.deepEqual(await h.store.getView(h.link.linkId, h.link.secret),
      h.view);
    for (const guidance of [
      {...h.intent.guidance, revision: 3},
      {...h.intent.guidance, text: "Unconfirmed directions"},
      {...h.intent.guidance, validUntil: 3_000_001},
      {...h.intent.guidance, materialKey: "invented"},
    ]) {
      await assert.rejects(h.store.publishMessage({...h.intent,
        intentId: "changed", guidance}, h.thread.revision), /unavailable/);
    }
    assert.equal((await h.store.submit(h.submission)).result.kind, "accepted");
  });

test("source read failure stays retryable and cannot produce a guest effect",
  async () => {
    const h = await harness();
    const before = h.db.entries();
    h.db.beforeRead = (path) => {
      if (path.startsWith("eventAssistanceGroupProgress/")) {
        throw new Error("temporary Firestore read failure");
      }
    };
    await assert.rejects(h.store.submit(h.submission), /temporary Firestore/);
    assert.deepEqual(h.db.entries(), before);
    h.db.beforeRead = undefined;
    assert.equal((await h.store.submit(h.submission)).result.kind, "accepted");
  });

test("guest callables validate, rate-limit and expose only scoped output",
  async () => {
    const h = await harness();
    const calls: string[] = [];
    const deps = {firestore: () => h.db as unknown as Firestore,
      now: () => h.clock.now, checkRateLimit: async (
        _db: Firestore, identity: string, action: string
      ) => {
        calls.push(identity + ":" + action);
      }};
    const request = (data: unknown) => ({data,
      rawRequest: {ip: "127.0.0.1"}} as CallableRequest<unknown>);
    const view = await getEventAssistanceGuestViewHandler(request({
      linkId: h.link.linkId, secret: h.link.secret,
    }), deps);
    assert.deepEqual(view, h.view);
    const reply = await submitEventAssistanceGuestChoiceHandler(
      request(h.submission), deps);
    assert.equal(reply.result.kind, "accepted");
    assert.equal(calls.length, 4);
    assert.equal(calls.join().includes(h.link.secret), false);
    await assert.rejects(submitEventAssistanceGuestChoiceHandler(request({
      ...h.submission, attendeeId: "someone-else",
    }), deps), /additional properties/);
  });

test("Firestore commits one reply and one guest effect under contention", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  const db = getEmulatorFirestore(app);
  try {
    const progress = await seedJoiningProgress(db, context, 1_000_000,
      3_000_000);
    await db.collection("eventAttendees").doc("attendee-1")
      .set(sourceAttendee());
    const store = new GuestAssistanceStore(db, () => 1000000);
    const guest = await store.startEpisode(context, "attendee-1",
      "start-1", null);
    const intent = message(guest, progress.guidance);
    const thread = await store.publishMessage(intent, null);
    const link = await store.issueLink(thread.threadId, "send-1", keys);
    const input: Submission = {linkId: link.linkId, secret: link.secret,
      intentId: intent.intentId,
      intentRevision: intent.revision, choiceId: "on-my-way",
      expectedGuestRevision: guest.revision, requestId: "reply-1"};
    const results = await Promise.all(Array.from({length: 8}, () =>
      store.submit(input)));
    assert.equal(results.filter((r) => r.result.kind === "accepted").length, 1);
    assert.equal(results.filter((r) => r.result.kind === "replayed").length, 7);
    const saved = (await db.collection(guestCollections.guests)
      .doc(guest.guestId).get()).data();
    assert.equal(saved?.revision, 1);
    assert.equal(saved?.intention.kind, "onMyWay");
    assert.equal((await db.collection("eventAttendees").doc("attendee-1").get())
      .data()?.status, "registered");
    const updatedGuidance = await progress.confirm("two");
    assert.equal((await store.getView(link.linkId, link.secret)).status,
      "unavailable");
    assert.equal((await store.submit(input)).result.kind, "rejected");
    const updated = message(guest, updatedGuidance, "new-destination");
    await store.publishMessage(updated, thread.revision);
    const view = await store.getView(link.linkId, link.secret);
    assert.ok(view.status === "ready");
    assert.equal(view.text, "Join us at stop two.");
    assert.deepEqual((await store.submit(input)).result,
      {kind: "rejected", reason: "staleIntent"});
  } finally {
    await deleteApp(app);
  }
});
