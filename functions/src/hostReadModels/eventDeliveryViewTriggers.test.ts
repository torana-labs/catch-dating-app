import assert from "node:assert/strict";
import test from "node:test";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {
  deliveryViewAttendeeFields,
  deliveryViewEventFields,
  deliveryViewOrganizerFields,
  resolveEventDeliveryViewIds,
} from "./eventDeliveryViewTriggers";

type Data = Record<string, unknown>;

const db = (docs: Record<string, Data> = {}) =>
  new AudienceTestStore(docs).asFirestore();
const message = (id: string) => "outbox:" + id.repeat(64).slice(0, 64);
const live = {mode: "live", organizerId: "org", eventId: "e1"};
const intent = (patch: Data = {}) => ({intent: {context: live, eventId: "e1",
  attendeeId: "a1", ...patch}});

test("message writes route when either side is a live intent", async () => {
  const route = (before?: Data, after?: Data) => resolveEventDeliveryViewIds(
    db(), "eventAssistanceMessages", "m1", before, after);
  assert.deepEqual(await route(undefined, intent()), ["m1"]);
  assert.deepEqual(await route(intent(), undefined), ["m1"]);
  assert.deepEqual(await route(undefined, intent({context: {mode: "rehearsal",
    sessionId: "s"}})), []);
});

test("guest and attendee writes reach that guest's live messages", async () => {
  const store = db({
    [`eventAssistanceMessages/${message("a")}`]: intent(),
    [`eventAssistanceMessages/${message("b")}`]: intent(),
    [`eventAssistanceMessages/${message("c")}`]: intent({context: {
      mode: "rehearsal", sessionId: "s"}}),
    [`eventAssistanceMessages/${message("d")}`]: intent({attendeeId: "a2"}),
    [`eventAssistanceMessages/${message("e")}`]: intent({eventId: "e2"}),
  });
  const expected = [message("a"), message("b")].sort();
  const guest = {context: live, attendeeId: "a1", updatedAt: 1};
  assert.deepEqual((await resolveEventDeliveryViewIds(store,
    "eventAssistanceGuests", "g1", guest, {...guest, updatedAt: 2})).sort(),
  expected);
  const attendee = {eventId: "e1", organizerId: "org", displayName: "Alex",
    status: "registered", createdAt: 1, phoneE164: "+910000000000"};
  assert.deepEqual(await resolveEventDeliveryViewIds(store, "eventAttendees",
    "a1", attendee, {...attendee, phoneE164: "+911111111111"}), []);
  for (const field of deliveryViewAttendeeFields) {
    if (field === "eventId") continue;
    assert.deepEqual((await resolveEventDeliveryViewIds(store,
      "eventAttendees", "a1", attendee, {...attendee, [field]: "changed"}))
      .sort(), expected, field);
  }
  assert.deepEqual((await resolveEventDeliveryViewIds(store, "eventAttendees",
    "a1", undefined, attendee)).sort(), expected);
});

test("event writes reach the event's live messages when facts change",
  async () => {
    const store = db({
      [`eventAssistanceMessages/${message("a")}`]: intent(),
      [`eventAssistanceMessages/${message("f")}`]: intent({context: {
        mode: "rehearsal", sessionId: "s"}, eventId: "e1"}),
    });
    const base = {organizerId: "org", status: "active", endTime: 1,
      name: "Social"};
    assert.deepEqual(await resolveEventDeliveryViewIds(store, "events", "e1",
      base, {...base, name: "Renamed"}), []);
    for (const field of deliveryViewEventFields) {
      assert.deepEqual(await resolveEventDeliveryViewIds(store, "events",
        "e1", base, {...base, [field]: "changed"}), [message("a")], field);
    }
  });

test("work items and runs name their delivery message", async () => {
  const key = "c".repeat(64);
  const item = {workflowId: "event-assistance",
    entityKind: "message_delivery", externalKey: message("a")};
  assert.deepEqual(await resolveEventDeliveryViewIds(db(),
    "operationWorkItems", "work:delivery:" + key, undefined, item),
  [message("a")]);
  assert.deepEqual(await resolveEventDeliveryViewIds(db(),
    "operationWorkItems", "w", undefined, {...item,
      entityKind: "roster_work"}), []);
  assert.deepEqual(await resolveEventDeliveryViewIds(db(),
    "operationWorkItems", "w", undefined, {...item,
      workflowId: "event-import"}), []);
  const store = db({["operationWorkItems/work:delivery:" + key]: item});
  const run = {workflowId: "event-assistance"};
  assert.deepEqual(await resolveEventDeliveryViewIds(store, "operationRuns",
    "run:delivery:" + key, undefined, run), [message("a")]);
  assert.deepEqual(await resolveEventDeliveryViewIds(store, "operationRuns",
    "run:roster:" + key, undefined, run), []);
  assert.deepEqual(await resolveEventDeliveryViewIds(store, "operationRuns",
    "run:delivery:" + key, undefined, {workflowId: "other"}), []);
  assert.deepEqual(await resolveEventDeliveryViewIds(db(), "operationRuns",
    "run:delivery:" + key, undefined, run), []);
});

test("organizer manager changes reach manually handled views", async () => {
  const store = db({
    "hostEventDeliveryViews/manual": {organizerId: "org",
      view: {handling: {kind: "manual"}}},
    "hostEventDeliveryViews/automatic": {organizerId: "org",
      view: {handling: {kind: "automatic"}}},
    "hostEventDeliveryViews/foreign": {organizerId: "other",
      view: {handling: {kind: "manual"}}},
  });
  const base = {hostUserId: "h1", ownerUserId: "h1", hostUserIds: ["h1"],
    hostProfiles: [], description: "Old"};
  assert.deepEqual(await resolveEventDeliveryViewIds(store, "organizers",
    "org", base, {...base, description: "New"}), []);
  for (const field of deliveryViewOrganizerFields) {
    assert.deepEqual(await resolveEventDeliveryViewIds(store, "organizers",
      "org", base, {...base, [field]: ["changed"]}), ["manual"], field);
  }
});
