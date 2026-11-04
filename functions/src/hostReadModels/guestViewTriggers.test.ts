import assert from "node:assert/strict";
import test from "node:test";
import {departureRosterHarness} from
  "../eventSuccess/operations/departureRosterTestFixtures";
import {membershipIdentity} from
  "../eventSuccess/operations/membershipReader";
import {settingId} from "../eventSuccess/operations/policySettings";
import {runtimeConfigId} from
  "../eventSuccess/operations/runtimeConfigRecords";
import {
  guestViewAttendeeFields,
  GuestViewTargets,
  reconcileGuestViewTargets,
  resolveGuestViewTargets,
} from "./guestViewTriggers";
import {
  accountabilityViewsCollection,
  membershipViewsCollection,
  runtimeViewsCollection,
  settingViewsCollection,
} from "./guestViewSupport";
import {allowDeletes, documentsOf, viewDeps} from "./guestViewTestFixtures";

const empty: GuestViewTargets = {attendeesOf: [], guests: [],
  membershipsOf: [], organizers: [], settings: [], runtimes: []};

test("event and plan writes route to the event's views", () => {
  const event = {status: "active", endTime: 2, name: "A"};
  assert.deepEqual(resolveGuestViewTargets("events", "e1", event,
    {...event, name: "B"}), empty, "a rename changes no guest view");
  for (const field of ["status", "endTime", "eventFormat", "organizerId"]) {
    assert.deepEqual(resolveGuestViewTargets("events", "e1", event,
      {...event, [field]: "changed"}), {...empty, attendeesOf: ["e1"],
      settings: ["e1"], runtimes: ["e1"]}, field);
  }
  assert.deepEqual(resolveGuestViewTargets("events", "e1", undefined, event)
    .settings, ["e1"], "creates always evaluate");
  assert.deepEqual(resolveGuestViewTargets("eventSuccessPlans", "e1",
    {status: "live"}, {status: "live", note: 1}), empty);
  assert.deepEqual(resolveGuestViewTargets("eventSuccessPlans", "e1",
    {status: "live"}, {status: "complete"}), {...empty,
    attendeesOf: ["e1"], runtimes: ["e1"]});
});

test("guest rows route to their attendee; settings and automation to " +
  "their event", () => {
  const attendee = {eventId: "e1", status: "checkedIn", displayName: "A"};
  assert.deepEqual(resolveGuestViewTargets("eventAttendees", "a1", attendee,
    {...attendee, displayName: "B"}), empty);
  assert.ok(guestViewAttendeeFields.includes("accountabilityResolution"));
  assert.deepEqual(resolveGuestViewTargets("eventAttendees", "a1", attendee,
    {...attendee, status: "registered"}).guests,
  [{eventId: "e1", attendeeId: "a1"}]);
  assert.deepEqual(resolveGuestViewTargets("eventAssistanceMemberships", "m",
    {context: {eventId: "e1"}, attendeeId: "a1"},
    {context: {eventId: "e1"}, attendeeId: "a1"}).guests,
  [{eventId: "e1", attendeeId: "a1"}]);
  assert.deepEqual(resolveGuestViewTargets("eventStaffGrants", "g",
    {eventId: "e1"}, undefined).membershipsOf, ["e1"]);
  assert.deepEqual(resolveGuestViewTargets("eventAssistanceSettings", "s",
    undefined, {context: {eventId: "e2"}}).settings, ["e2"]);
  assert.deepEqual(resolveGuestViewTargets("eventAssistanceRuntimeConfigs",
    "r", {context: {eventId: "e3"}}, undefined).runtimes, ["e3"]);
  const organizer = {hostUserIds: ["u1"], followerCount: 1};
  assert.deepEqual(resolveGuestViewTargets("organizers", "o1", organizer,
    {...organizer, followerCount: 2}), empty);
  assert.deepEqual(resolveGuestViewTargets("organizers", "o1", organizer,
    {...organizer, hostUserIds: ["u1", "u2"]}).organizers, ["o1"]);
});

test("an event change re-evaluates every guest, setting and automation view",
  async () => {
    const h = await departureRosterHarness();
    allowDeletes(h.fake);
    await h.groups();
    const eventId = h.scope.context.eventId;
    await reconcileGuestViewTargets(h.db, {...empty, attendeesOf: [eventId],
      settings: [eventId], runtimes: [eventId]}, viewDeps(h.clock));
    assert.equal(documentsOf(h.fake, accountabilityViewsCollection).size, 1);
    assert.equal(documentsOf(h.fake, membershipViewsCollection).size, 1);
    assert.equal(documentsOf(h.fake, settingViewsCollection).size, 3);
    assert.equal(documentsOf(h.fake, runtimeViewsCollection).size, 1);
    await h.grant("pacer", "fast", "pacer");
    const before = documentsOf(h.fake, membershipViewsCollection);
    await reconcileGuestViewTargets(h.db, {...empty,
      membershipsOf: [eventId]}, viewDeps(h.clock));
    const after = documentsOf(h.fake, membershipViewsCollection);
    const id = membershipIdentity({context: h.scope.context,
      attendeeId: h.attendeeId});
    assert.equal((after.get(id) as {revision: number}).revision,
      (before.get(id) as {revision: number}).revision + 1,
      "a staff grant refreshes the open membership views' receivers");
  });

test("view ids are pinned: the phone derives the same ones", () => {
  const context = {mode: "live" as const, organizerId: "org-1",
    eventId: "event-1"};
  // test/contexts/live/event_assistance_guest_views_test.dart pins these.
  assert.equal(membershipIdentity({context, attendeeId: "attendee-1"}),
    "membership:" +
    "c977039896305665999f971d428725fc1c1ff4eaf9368f56d7816f765ff8bdb8");
  assert.equal(settingId({context, groupId: "event:whole",
    workflowKind: "lateJoin"}), "setting:" +
    "beb96281cb3d04664c22a8f22ad658a114f9956768225dbb566a46284db92e09");
  assert.equal(settingId({context, groupId: "easy",
    workflowKind: "lateJoin"}), "setting:" +
    "94721d947f042210df263a3748a6d71138910ea8983da4c2d1078a83a44ef4f0");
  assert.equal(runtimeConfigId(context), "runtime:lateJoin:" +
    "468f3e8fcfbaed5ffd78013b0b0770ca4f2a178c6dee1c8a5110fc0c107b3927");
});
