import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import type {EventAssistanceParticipationCallableResponse as Response} from
  "../../shared/generated/eventAssistanceParticipationCallableResponse";
import type {EventAssistanceMessageIntent as Intent} from
  "../../shared/generated/eventAssistanceMessageIntent";
import {EventParticipationStore, PARTICIPATION_RECEIPTS} from
  "./participationStore";
import {getEventAssistanceParticipationHandler,
  setEventAssistanceParticipationHandler} from "./participationHandlers";
import {ProgressFirestore, seedJoiningProgress, progressFixtureManager} from
  "./groupProgressTestFixtures";
import {GuestAssistanceStore} from "./guestAssistanceStore";
import {Guest, guestCollections, guestIdentity, parseGuest} from
  "./guestRecords";
import {readEventAssistanceMessageGate} from "./guestMessageGate";
import {validateEventAssistanceCommand} from
  "../../shared/generated/validators/eventAssistanceCommand";

const manager = progressFixtureManager;
const guestUid = "guest-1";
const start = 1_000_000;
const keys = {currentKeyId: "fixture-key", keyFor: () => Buffer.alloc(32, 9)};
async function harness(realDb?: Firestore) {
  const fake = new ProgressFirestore();
  const db = realDb ?? fake as unknown as Firestore;
  const id = randomUUID();
  const context = {mode: "live" as const, eventId: "e-" + id,
    organizerId: "o-" + id};
  const scope = {context, attendeeId: "a-" + id};
  const progress = await seedJoiningProgress(db, context, start, 3_000_000);
  const attendee = {...JSON.parse(readFileSync(
    "../contracts/fixtures/valid/event_attendee_doc.json", "utf8")),
  eventId: context.eventId, organizerId: context.organizerId,
  status: "registered", linkedUid: guestUid,
  checkedInAt: null, checkedInBy: null, attendanceRevision: 7,
  createdAt: Timestamp.fromMillis(start - 1000),
  updatedAt: Timestamp.fromMillis(start - 1000)};
  const put = async (path: string, value: object) => {
    if (realDb) await db.doc(path).set(value);
    else fake.write(path, value as Record<string, unknown>);
  };
  const attendeePath = "eventAttendees/" + scope.attendeeId;
  await put(attendeePath, attendee);
  const clock = {now: start};
  const store = new EventParticipationStore(db, () => clock.now);
  const guests = new GuestAssistanceStore(db, () => clock.now);
  const view = (await store.get(manager, scope)).view;
  return {db, fake, scope, progress, attendee, attendeePath, clock,
    store, guests, put, view};
}
function command(view: Response["view"], state: Guest["participation"]["state"],
  operationId = "change", resumeAtUnit: string | null = null) {
  return {expectedSourceHash: view.sourceHash, command: {
    kind: "setParticipation", context: view.context,
    eventId: view.context.eventId, operationId,
    payload: {attendeeId: view.attendeeId, episodeId: view.episodeId,
      expectedParticipationRevision: view.revision, state, resumeAtUnit}}};
}
async function current(h: Awaited<ReturnType<typeof harness>>) {
  return (await h.store.get(manager, h.scope)).view;
}
async function publish(h: Awaited<ReturnType<typeof harness>>, guest: Guest) {
  const intent: Extract<Intent, {kind: "joiningUpdate"}> = {
    schemaVersion: 1, intentId: "message-" + randomUUID(), revision: 1,
    context: h.scope.context, eventId: h.scope.context.eventId,
    attendeeId: guest.attendeeId, episodeId: guest.episodeId,
    workflow: {kind: "lateJoin", occurrenceId: "departure"},
    createdAt: start, expiresAt: 2_000_000,
    permittedRoutes: ["catchEventSms", "organizerEventWhatsapp"],
    deliveryPolicy: {maxAttempts: 2, maxAttemptsPerRoute: 1,
      minimumRetrySeconds: 1}, kind: "joiningUpdate",
    guidance: h.progress.guidance, choices: [{choiceId: "way",
      label: "On my way", value: {kind: "joinIntent",
        intention: {kind: "onMyWay", claimedEta: null}}}]};
  const thread = await h.guests.publishMessage(intent, null);
  const link = await h.guests.issueLink(thread.threadId, "send", keys);
  const view = await h.guests.getView(link.linkId, link.secret);
  assert.ok(view.status === "ready");
  const reply = {linkId: link.linkId, secret: link.secret,
    intentId: view.intentId,
    intentRevision: view.intentRevision,
    expectedGuestRevision: view.guestRevision,
    choiceId: "way", requestId: "reply"};
  return {intent, thread, link, reply};
}

test("participation is explicit and independent of physical attendance",
  async () => {
    const h = await harness();
    const before = h.fake.entries();
    assert.equal(h.view.freshness, "uninitialized");
    assert.equal(h.view.participation, null);
    assert.equal(h.view.checkedIn, false);
    assert.deepEqual((await h.store.get(guestUid, h.scope)).view, h.view);
    assert.deepEqual(h.fake.entries(), before);
    const input = command(h.view, "active");
    const result = await h.store.set(guestUid, input);
    assert.equal(result.outcome, "applied");
    assert.deepEqual(result.view.participation,
      {state: "active", resumeAtUnit: null});
    assert.equal(result.view.revision, 1);
    assert.equal(result.view.checkedIn, false);
    const changed = h.fake.entries().filter(([path]) => !before.some(
      ([old]) => old === path));
    assert.equal(changed.length, 2);
    assert.ok(changed.every(([path]) =>
      path.startsWith(guestCollections.guests + "/") ||
      path.startsWith(PARTICIPATION_RECEIPTS + "/")));
    assert.deepEqual(h.fake.read(h.attendeePath),
      before.find(([path]) => path === h.attendeePath)?.[1]);
    assert.equal((await h.store.set(guestUid, input)).outcome, "replayed");
  });

test("breaks stop joining effects; re-entry invalidates old links",
  async () => {
    const h = await harness();
    const guest = await h.guests.startEpisode(h.scope.context,
      h.scope.attendeeId, "begin", null);
    const roster = h.fake.read(h.attendeePath);
    const message = await publish(h, guest);
    await h.guests.submit(message.reply);
    const pause = command(await current(h), "temporaryBreak", "break",
      "itinerary:two");
    const result = await h.store.set(guestUid, pause);
    assert.equal(result.view.episodeId, guest.episodeId);
    assert.equal((await h.guests.getView(message.link.linkId,
      message.link.secret)).status, "unavailable");
    assert.equal((await h.guests.submit(message.reply)).result.kind,
      "rejected");
    await assert.rejects(h.guests.publishMessage(message.intent, null),
      /unavailable/);
    await assert.rejects(h.guests.issueLink(message.thread.threadId,
      "another", keys), /unavailable/);
    assert.deepEqual(await h.db.runTransaction((tx) =>
      readEventAssistanceMessageGate(h.db, tx, message.intent, h.clock.now)),
    {kind: "stop", reason: "participationInactive"});
    h.clock.now += 100_000;
    assert.equal((await current(h)).participation?.state, "temporaryBreak");
    const departed = await h.store.set(manager,
      command(await current(h), "departed", "leave"));
    assert.equal(departed.view.checkedIn, false);
    const resumed = await h.store.set(guestUid,
      command(departed.view, "active", "return"));
    assert.notEqual(resumed.view.episodeId, guest.episodeId);
    await assert.rejects(h.guests.getView(message.link.linkId,
      message.link.secret), /unavailable/);
    const latest = parseGuest(h.fake.read(guestCollections.guests + "/" +
      guest.guestId));
    assert.deepEqual(latest.intention, {kind: "unknown"});
    assert.equal(latest.createdAt, guest.createdAt);
    assert.deepEqual(h.fake.read(h.attendeePath), roster);
    const replay = await h.store.set(guestUid, pause);
    assert.equal(replay.outcome, "replayed");
    assert.equal(replay.operationRevision, result.operationRevision);
    assert.equal(replay.view.episodeId, resumed.view.episodeId);
    assert.equal(replay.view.participation?.state, "active");
  });

test("stale commands and failed commits cannot overwrite participation",
  async () => {
    const h = await harness();
    const input = command(h.view, "temporaryBreak");
    const before = h.fake.entries();
    h.fake.failNextCommit = true;
    await assert.rejects(h.store.set(manager, input), /interruption/);
    assert.deepEqual(h.fake.entries(), before);
    const saved = await h.store.set(manager, input);
    await assert.rejects(h.store.set(manager,
      command(h.view, "departed", "stale")), {code: "aborted"});
    await assert.rejects(h.store.set(manager,
      command(saved.view, "departed", "change")), {code: "aborted"});
    const snapshot = h.fake.entries();
    h.fake.beforeRead = (path) => {
      if (path.startsWith(PARTICIPATION_RECEIPTS + "/")) {
        h.clock.now = 3_000_000;
      }
    };
    await assert.rejects(h.store.set(manager,
      command(saved.view, "active", "expired-during-read")),
    {code: "failed-precondition"});
    assert.deepEqual(h.fake.entries(), snapshot);
  });

test("authority comes from current organizer membership or the linked guest",
  async () => {
    const h = await harness();
    for (const actor of ["stranger", "check-in-operator"]) {
      await assert.rejects(h.store.get(actor, h.scope),
        {code: "permission-denied"});
      await assert.rejects(h.store.set(actor, command(h.view, "departed")),
        {code: "permission-denied"});
    }
    const input = command(h.view, "active");
    await h.put(h.attendeePath, {...h.attendee, linkedUid: "replacement-uid"});
    await assert.rejects(h.store.set(guestUid, input),
      {code: "permission-denied"});
    await assert.rejects(h.store.set(manager, input), {code: "aborted"});
    const latest = await current(h);
    await h.store.set(manager, command(latest, "active"));
    const organizerPath = "organizers/" + h.scope.context.organizerId;
    const organizer = h.fake.read(organizerPath)!;
    await h.put(organizerPath, {...organizer, hostUserIds: [],
      ownerUserId: "other",
      hostUserId: "other", hostProfiles: []});
    await assert.rejects(h.store.get(manager, h.scope),
      {code: "permission-denied"});
    assert.equal((await h.store.get("replacement-uid", h.scope)).view
      .participation?.state, "active");
  });

test("source generations fence identical replacement records",
  async () => {
    const h = await harness();
    const input = command(h.view, "active");
    const saved = await h.store.set(manager, input);
    h.fake.generation = Timestamp.fromMillis(2);
    const latest = await current(h);
    assert.equal(latest.freshness, "sourceChanged");
    assert.equal(latest.participation, null);
    assert.notEqual(latest.sourceHash, saved.view.sourceHash);
    await assert.rejects(h.store.set(manager, input), {code: "aborted"});
    await assert.rejects(h.store.set(manager,
      command(saved.view, "active", "old-view")), {code: "aborted"});
    const restarted = await h.store.set(manager,
      command(latest, "active", "reviewed-replacement"));
    assert.notEqual(restarted.view.episodeId, saved.view.episodeId);
    assert.equal(restarted.view.freshness, "current");
  });

test("return points and participation changes require current event authority",
  async () => {
    const h = await harness();
    assert.deepEqual(h.view.resumeUnits.map((u) => u.unitId),
      ["itinerary:one", "itinerary:two"]);
    for (const input of [command(h.view, "active", "invalid", "itinerary:one"),
      command(h.view, "departed", "invalid", "itinerary:one")]) {
      assert.equal(validateEventAssistanceCommand(input.command), false);
      await assert.rejects(h.store.set(manager, input),
        {code: "invalid-argument"});
    }
    await assert.rejects(h.store.set(manager,
      command(h.view, "temporaryBreak", "unknown-unit", "other-event")),
    {code: "failed-precondition"});
    const invalid = command(h.view, "active");
    await assert.rejects(h.store.set(manager, {...invalid, command: {
      ...invalid.command, eventId: "other-event"}}),
    {code: "invalid-argument"});
    await assert.rejects(h.store.set(manager, {...invalid, command: {
      ...invalid.command, context: {mode: "rehearsal", rehearsalId: "r",
        virtualEventId: "v", clockId: "c"}}}), {code: "invalid-argument"});
    for (const status of ["waitlisted", "cancelled", "invited"]) {
      await h.put(h.attendeePath, {...h.attendee, status});
      const latest = await current(h);
      assert.equal(latest.canChange, false);
      await assert.rejects(h.store.set(manager, command(latest, "active")),
        {code: "failed-precondition"});
    }
    await h.put(h.attendeePath, h.attendee);
    await h.put("eventSuccessPlans/" + h.scope.context.eventId,
      {...h.progress.plan, status: "complete"});
    assert.equal((await current(h)).canChange, false);
    await assert.rejects(h.store.set(manager,
      command(await current(h), "active")), {code: "failed-precondition"});
  });

test("participation handlers authenticate and rate-limit before store access",
  async () => {
    for (const handler of [getEventAssistanceParticipationHandler,
      setEventAssistanceParticipationHandler]) {
      const calls: string[] = [];
      const deps = {db: () => ({}) as Firestore,
        rateLimit: async () => {
          calls.push("limit");
        },
        store: () => ({get: async () => {
          calls.push("get"); return {} as Response;
        }, set: async () => {
          calls.push("set"); return {} as Response;
        }})};
      await assert.rejects(handler({data: {}} as CallableRequest, deps),
        {code: "unauthenticated"});
      assert.deepEqual(calls, []);
      await handler({data: {}, auth: {uid: guestUid}} as CallableRequest, deps);
      assert.equal(calls[0], "limit");
      assert.equal(calls.length, 2);
    }
  });

test("Firestore commits once and recreated rosters lose their episode", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const app = initializeApp({projectId: "demo-catch-rules"}, randomUUID());
  const db = getEmulatorFirestore(app);
  try {
    const h = await harness(db);
    const input = command(h.view, "active");
    const results = await Promise.all(Array.from({length: 8}, () =>
      h.store.set(guestUid, input)));
    assert.equal(results.filter((r) => r.outcome === "applied").length, 1);
    assert.equal(results.filter((r) => r.outcome === "replayed").length, 7);
    const guest = parseGuest((await db.collection(guestCollections.guests)
      .doc(guestIdentity(h.scope.context, h.scope.attendeeId)).get()).data());
    const message = await publish(h, guest);
    await db.doc(h.attendeePath).delete();
    await h.put(h.attendeePath, h.attendee);
    assert.equal((await current(h)).freshness, "sourceChanged");
    assert.equal((await h.guests.getView(message.link.linkId,
      message.link.secret)).status, "unavailable");
    await assert.rejects(h.store.set(guestUid, input), {code: "aborted"});
    assert.equal((await db.doc(h.attendeePath).get()).data()?.status,
      "registered");
  } finally {
    await deleteApp(app);
  }
});


test("inactive guests keep essential updates but receive no activity prompts",
  async () => {
    const h = await harness();
    await h.store.set(guestUid, command(h.view, "departed"));
    const guest = parseGuest(h.fake.read(guestCollections.guests + "/" +
      guestIdentity(h.scope.context, h.scope.attendeeId)));
    for (const noticeKind of ["joiningInstructions", "guestRequirement",
      "assignmentChanged", "participationCheck", "planChanged"] as const) {
      const intent: Intent = {schemaVersion: 1,
        intentId: "notice-" + noticeKind,
        revision: 1, context: h.scope.context, eventId: h.scope.context.eventId,
        attendeeId: guest.attendeeId, episodeId: guest.episodeId,
        workflow: {kind: "planChangeCommunication", occurrenceId: noticeKind},
        createdAt: start, expiresAt: start + 1000,
        permittedRoutes: ["catchEventSms"], deliveryPolicy: {maxAttempts: 1,
          maxAttemptsPerRoute: 1, minimumRetrySeconds: 1},
        kind: "operationalNotice", noticeKind, title: "Event update",
        body: "The event plan changed.", instructionRevision: 1, choices: []};
      if (noticeKind !== "planChanged") {
        await assert.rejects(h.guests.publishMessage(intent, null),
          /unavailable/);
      } else {
        const thread = await h.guests.publishMessage(intent, null);
        const link = await h.guests.issueLink(thread.threadId, "update", keys);
        assert.equal((await h.guests.getView(link.linkId, link.secret)).status,
          "ready");
      }
    }
  });
