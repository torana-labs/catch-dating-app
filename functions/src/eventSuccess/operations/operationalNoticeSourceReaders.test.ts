import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import type {Firestore} from "firebase-admin/firestore";
import {ProgressFirestore, seedJoiningProgress} from
  "./groupProgressTestFixtures";
import {EVENT_PLAN_CHANGES, eventPlanChangeSourceId} from
  "../../events/planChangeRecords";
import {EventPlanChangeSourceReader, PostEventFollowUpSourceReader,
  postEventFollowUpSourceId} from "./operationalNoticeSourceReaders";
import {OperationalNoticePublisher} from "./operationalNoticePublication";
import {EventAssistanceSettingsStore} from "./policySettingsStore";
import {rcsHarness} from "./rcsDispatchTestHarness";

const start = Date.parse("2026-09-07T12:00:00Z");
const end = start + 3_600_000;
const stamp = (millis: number) => ({_seconds: Math.floor(millis / 1000),
  _nanoseconds: millis % 1000 * 1_000_000});
const fixture = (name: string) => JSON.parse(readFileSync(
  "../contracts/fixtures/valid/" + name + ".json", "utf8"));

async function setup() {
  const fake = new ProgressFirestore();
  const db = fake as unknown as Firestore;
  const context = {mode: "live" as const, eventId: "event-source",
    organizerId: "organizer-source"};
  const attendeeId = "attendee-source";
  const seeded = await seedJoiningProgress(db, context, start, end);
  const attendee = {...fixture("event_attendee_doc"),
    eventId: context.eventId, organizerId: context.organizerId,
    status: "checkedIn",
    createdAt: stamp(start - 10_000), updatedAt: stamp(start - 1_000),
    registeredAt: stamp(start - 10_000),
    checkedInAt: stamp(start - 1_000)};
  fake.write(`eventAttendees/${attendeeId}`, attendee);
  return {fake, db, context, attendeeId, seeded, attendee};
}

test("plan change reader derives copy only for an affected current guest",
  async () => {
    const h = await setup();
    const revision = 2;
    const sourceId = eventPlanChangeSourceId(h.context.eventId, revision);
    h.fake.write(`events/${h.context.eventId}`,
      {...h.seeded.event, planChangeRevision: revision});
    h.fake.write(`${EVENT_PLAN_CHANGES}/${sourceId}`, {
      schemaVersion: 1, sourceId, eventId: h.context.eventId,
      organizerId: h.context.organizerId, revision,
      changedFields: ["meetingLocation", "itinerary"],
      eventTitle: "Friday social", startTime: stamp(start - 1_000),
      endTime: stamp(end), meetingPoint: "Second venue",
      itineraryStopCount: 3, occurredAt: stamp(start),
      validUntil: stamp(end), createdBy: "host-1",
    });
    const request = {context: h.context, attendeeId: h.attendeeId,
      episodeId: "episode-1", policyBinding: dummyPolicyBinding,
      source: {kind: "planChange" as const,
        sourceId, expectedRevision: revision}};
    const reader = new EventPlanChangeSourceReader();
    const source = await h.db.runTransaction((tx) =>
      reader.read(h.db, tx, request, start));
    assert.equal(source?.title, "Event details updated");
    assert.equal(source?.body,
      "Friday social: Meet at Second venue. The itinerary changed. " +
      "Check the event page for the latest details.");
    assert.equal(source?.groupId, "event:whole");
    assert.deepEqual(source?.choices.map((choice) => choice.value.kind),
      ["acknowledge", "requestHelp"]);

    h.fake.write(`eventAttendees/${h.attendeeId}`,
      {...h.attendee, createdAt: stamp(start + 1)});
    assert.equal(await h.db.runTransaction((tx) =>
      reader.read(h.db, tx, request, start + 1)), null);
  });

test("plan change reader rejects a superseded immutable revision", async () => {
  const h = await setup();
  const sourceId = eventPlanChangeSourceId(h.context.eventId, 1);
  h.fake.write(`events/${h.context.eventId}`,
    {...h.seeded.event, planChangeRevision: 2});
  h.fake.write(`${EVENT_PLAN_CHANGES}/${sourceId}`, {
    schemaVersion: 1, sourceId, eventId: h.context.eventId,
    organizerId: h.context.organizerId, revision: 1,
    changedFields: ["meetingLocation"], eventTitle: "Friday social",
    startTime: stamp(start - 1_000), endTime: stamp(end),
    meetingPoint: "Old venue", itineraryStopCount: 2,
    occurredAt: stamp(start), validUntil: stamp(end), createdBy: "host-1",
  });
  const reader = new EventPlanChangeSourceReader();
  const source = await h.db.runTransaction((tx) => reader.read(h.db, tx, {
    context: h.context, attendeeId: h.attendeeId, episodeId: "episode-1",
    policyBinding: dummyPolicyBinding,
    source: {kind: "planChange", sourceId, expectedRevision: 1},
  }, start));
  assert.equal(source, null);
});

test("post-event reader uses terminal completion for checked-in guests",
  async () => {
    const h = await setup();
    const revision = 4;
    h.fake.write(`eventSuccessPlans/${h.context.eventId}`, {
      ...h.seeded.plan, status: "complete", liveControlRevision: revision,
      completedAt: stamp(end - 1_000), updatedAt: stamp(end - 1_000),
    });
    const sourceId = postEventFollowUpSourceId(h.context, revision);
    const request = {context: h.context, attendeeId: h.attendeeId,
      episodeId: "episode-1", policyBinding: dummyPolicyBinding,
      source: {kind: "followUp" as const,
        sourceId, expectedRevision: revision}};
    const reader = new PostEventFollowUpSourceReader();
    const source = await h.db.runTransaction((tx) =>
      reader.read(h.db, tx, request, end + 1));
    assert.equal(source?.occurredAt, end);
    assert.equal(source?.validUntil, end + 86_400_000);
    assert.equal(source?.title, "Thanks for joining");
    assert.match(source?.body ?? "", /Friday social/);

    h.fake.write(`eventAttendees/${h.attendeeId}`,
      {...h.attendee, status: "registered", checkedInAt: null});
    assert.equal(await h.db.runTransaction((tx) =>
      reader.read(h.db, tx, request, end + 1)), null);
  });

test("trusted plan-change source publishes through the notice boundary",
  async () => {
    const h = await rcsHarness(undefined, "plan-source",
      ["catchEventRcs"], end);
    const attendee = {...fixture("event_attendee_doc"),
      eventId: h.context.eventId, organizerId: h.context.organizerId,
      status: "registered",
      linkedUid: h.actor.uid, phoneE164: h.actor.phone,
      createdAt: stamp(start), updatedAt: stamp(start),
      registeredAt: stamp(start), checkedInAt: null, checkedInBy: null};
    await h.write(`eventAttendees/${h.scope.attendeeId}`, attendee);
    const event = await h.read(`events/${h.context.eventId}`);
    await h.write(`events/${h.context.eventId}`,
      {...event, planChangeRevision: 1});
    const sourceId = eventPlanChangeSourceId(h.context.eventId, 1);
    await h.write(`${EVENT_PLAN_CHANGES}/${sourceId}`, {
      schemaVersion: 1, sourceId, eventId: h.context.eventId,
      organizerId: h.context.organizerId, revision: 1,
      changedFields: ["meetingLocation"], eventTitle: "Friday social",
      startTime: stamp(start - 1_000), endTime: stamp(end),
      meetingPoint: "Second venue", itineraryStopCount: 2,
      occurredAt: stamp(start), validUntil: stamp(end), createdBy: "host-1",
    });
    const saved = await configure(h, "planChangeCommunication", "planChange");
    assert.ok(saved.view.own);
    const publisher = new OperationalNoticePublisher(h.db,
      new EventPlanChangeSourceReader(), () => h.clock.now);
    const result = await publisher.publish({context: h.context,
      attendeeId: h.scope.attendeeId, episodeId: h.intent.episodeId,
      policyBinding: {groupId: saved.view.own.groupId,
        settingId: saved.view.own.settingId,
        expectedRevision: saved.view.own.revision},
      source: {kind: "planChange", sourceId, expectedRevision: 1}});
    assert.equal(result.kind, "published");
    assert.equal(result.intent.noticeKind, "planChanged");
    assert.match(result.intent.body, /Second venue/);
  });

async function configure(h: Awaited<ReturnType<typeof rcsHarness>>,
  workflowKind: "planChangeCommunication" | "postEventFollowUp",
  templateIntent: "planChange" | "followUp") {
  const store = new EventAssistanceSettingsStore(h.db, () => h.clock.now);
  const scope = {context: h.context, groupId: "event:whole", workflowKind};
  const view = (await store.get("host-1", scope)).view;
  return store.set("host-1", {...scope, requestId: `setting-${workflowKind}`,
    expectedRevision: view.ownRevision, expectedSourceHash: view.sourceHash,
    preference: {kind: "configured", template: {kind: workflowKind,
      version: 1, setting: {kind: "enabled",
        authority: "executeWithinPolicy"}, config: {templateIntent,
        audience: "affectedGuests", maximumPerGuest: 1,
        expiryMinutes: 30, delivery: {routes: [{routeId: "catchEventRcs",
          senderId: h.rcsConfig.senderId}], policy: {maxAttempts: 2,
          maxAttemptsPerRoute: 1, minimumRetrySeconds: 1}}}}}});
}

const dummyPolicyBinding = {groupId: "event:whole", settingId: "setting-1",
  expectedRevision: 1};
