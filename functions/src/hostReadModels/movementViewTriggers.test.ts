import assert from "node:assert/strict";
import test from "node:test";
import {departureRosterHarness} from
  "../eventSuccess/operations/departureRosterTestFixtures";
import {progressFixtureManager as manager} from
  "../eventSuccess/operations/groupProgressTestFixtures";
import {
  movementAttendeeFields,
  reconcileMovementTargets,
  resolveMovementTargets,
} from "./movementViewTriggers";
import {
  checkpointViewsCollection,
  departureViewsCollection,
  groupProgressViewsCollection,
} from "./movementViewSupport";
import {asFirestore, allowDeletes, documentsOf, viewDeps} from
  "./movementViewTestFixtures";
import {FakeFirestore} from "../operations/testFirestore";
import {progressIdentity} from
  "../eventSuccess/operations/groupProgressSource";
import {checkpointIdentity} from
  "../eventSuccess/operations/checkpointRecords";

const day = 24 * 60 * 60 * 1000;

test("event, plan and progress writes route to the event", async () => {
  const db = asFirestore(new FakeFirestore());
  const event = {status: "active", startTime: 1, endTime: 2, name: "A"};
  assert.deepEqual((await resolveMovementTargets(db, "events", "e1", event,
    {...event, name: "B"})).events, [], "a rename changes no movement view");
  for (const field of ["status", "endTime", "itinerary", "meetingLocation",
    "eventFormat", "organizerId", "startTime"]) {
    assert.deepEqual((await resolveMovementTargets(db, "events", "e1", event,
      {...event, [field]: "changed"})).events, ["e1"], field);
  }
  assert.deepEqual((await resolveMovementTargets(db, "events", "e1",
    undefined, event)).events, ["e1"], "creates always evaluate");
  assert.deepEqual((await resolveMovementTargets(db, "eventSuccessPlans",
    "e1", {status: "live"}, {status: "live", note: 1})).events, []);
  assert.deepEqual((await resolveMovementTargets(db, "eventSuccessPlans",
    "e1", {status: "live"}, undefined)).events, ["e1"]);
  assert.deepEqual((await resolveMovementTargets(db,
    "eventAssistanceGroupProgress", "p1", {context: {eventId: "e1"}},
    {context: {eventId: "e2"}})).events, ["e1", "e2"]);
});

test("rosters, reports and checkpoint work route to their roster",
  async () => {
    const db = asFirestore(new FakeFirestore());
    assert.deepEqual((await resolveMovementTargets(db,
      "eventAssistanceDepartureRosters", "r1", undefined, {})).rosters,
    ["r1"]);
    assert.deepEqual((await resolveMovementTargets(db,
      "eventAssistanceCheckpoints", "c1", undefined, {rosterId: "r2"}))
      .rosters, ["r2"]);
    const work = {workflowId: "event-assistance",
      normalizedPayload: {kind: "liveCheckpointReport", rosterId: "r3"}};
    assert.deepEqual((await resolveMovementTargets(db, "operationWorkItems",
      "w1", work, {...work, revision: 2})).checkpointRosters, ["r3"]);
    assert.deepEqual((await resolveMovementTargets(db, "operationWorkItems",
      "w2", undefined, {workflowId: "event-assistance",
        normalizedPayload: {kind: "liveMessageDelivery"}}))
      .checkpointRosters, []);
  });

test("attendee, guest, membership, grant and organizer writes reach only " +
  "the open checkpoint views they can change", async () => {
  const fake = new FakeFirestore();
  const db = asFirestore(fake);
  const now = 10 * day;
  fake.write(checkpointViewsCollection + "/open", {rosterId: "r-open",
    eventId: "e1", organizerId: "o1", memberAttendeeIds: ["a1", "a2"],
    eventEndAtMillis: now});
  fake.write(checkpointViewsCollection + "/frozen", {rosterId: "r-frozen",
    eventId: "e2", organizerId: "o1", memberAttendeeIds: ["a1"],
    eventEndAtMillis: now - day});
  const attendee = {eventId: "e1", status: "checkedIn", displayName: "A"};
  assert.deepEqual((await resolveMovementTargets(db, "eventAttendees", "a1",
    attendee, {...attendee, displayName: "B"}, now)).checkpointRosters,
  ["r-open"]);
  assert.deepEqual((await resolveMovementTargets(db, "eventAttendees", "a1",
    attendee, {...attendee, note: "x"}, now)).checkpointRosters, []);
  assert.ok(movementAttendeeFields.includes("accountabilityResolution"));
  assert.deepEqual((await resolveMovementTargets(db, "eventAssistanceGuests",
    "g1", undefined, {attendeeId: "a2"}, now)).checkpointRosters, ["r-open"]);
  assert.deepEqual((await resolveMovementTargets(db,
    "eventAssistanceMemberships", "m1", {attendeeId: "a3"}, undefined, now))
    .checkpointRosters, []);
  assert.deepEqual((await resolveMovementTargets(db, "eventStaffGrants",
    "e1_u", undefined, {eventId: "e1"}, now)).checkpointRosters, ["r-open"]);
  const organizer = {hostUserIds: ["u1"], followerCount: 1};
  assert.deepEqual((await resolveMovementTargets(db, "organizers", "o1",
    organizer, {...organizer, followerCount: 2}, now)).checkpointRosters, []);
  assert.deepEqual((await resolveMovementTargets(db, "organizers", "o1",
    organizer, {...organizer, hostUserIds: ["u1", "u2"]}, now))
    .checkpointRosters, ["r-open"]);
});

test("an event change re-evaluates its group views and every roster view",
  async () => {
    const h = await departureRosterHarness();
    allowDeletes(h.fake);
    const input = await h.command();
    await h.progress.confirmDeparture(manager, {...input, command: {
      ...input.command, payload: {...input.command.payload,
        checkpointRequest: {responsibleOperatorId: manager,
          dueAt: h.clock.now + 30_000}}}});
    await reconcileMovementTargets(h.db, {events: [h.scope.context.eventId],
      rosters: [], checkpointRosters: []}, viewDeps(h.clock));
    assert.equal(documentsOf(h.fake, groupProgressViewsCollection).size, 1);
    assert.equal(documentsOf(h.fake, departureViewsCollection).size, 1);
    assert.equal(documentsOf(h.fake, checkpointViewsCollection).size, 1);
  });

test("view ids are pinned: the phone derives the same ones", () => {
  const context = {mode: "live" as const, organizerId: "org-1",
    eventId: "event-1"};
  // test/contexts/live/event_assistance_view_identity_test.dart pins these.
  assert.equal(progressIdentity(context, "event:whole"), "progress:" +
    "763536da95cdb87bce6bad6f19ac4b406a48212521bb493f673300ca87bde7a5");
  assert.equal(progressIdentity(context, "easy"), "progress:" +
    "ecbd2b57677bea99746c770abdce60b48bd7ecd6a1739e9585d771bdf84d2a1f");
  assert.equal(checkpointIdentity({context, groupId: "event:whole",
    progressRevision: 3, checkpointId: "stop-2"}), "checkpoint:" +
    "b0cd2cb234df1869e45add17f36e3d810453a98739a899ac6e12ad09d7301ed1");
});
