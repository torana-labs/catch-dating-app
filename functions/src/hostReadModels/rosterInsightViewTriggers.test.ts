import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {
  onPaymentWrite,
  resolveRosterInsightEventIds,
} from "./rosterInsightViewTriggers";

type Data = Record<string, unknown>;

const hour = 60 * 60 * 1000;
const day = 24 * hour;
// The payment path reconciles at the real time, so fixtures follow it.
const nowMillis = Date.now();
const at = (millis: number) => Timestamp.fromMillis(millis);

/** Contact c1's edges: two past events, one tonight, one next week. */
function edge(eventId: string, startOffset: number, patch: Data = {}): Data {
  const start = nowMillis + startOffset;
  return {organizerId: "org", contactId: "c1", eventId,
    attendeeId: `${eventId}-c1`, expected: true, cancelled: false,
    checkedIn: false, eventStartAt: at(start), eventEndAt: at(start + 3 * hour),
    checkedInAt: null, ...patch};
}

function store(): AudienceTestStore {
  return new AudienceTestStore({
    "organizerContactEventEdges/past-a-c1": edge("past-a", -20 * day),
    "organizerContactEventEdges/past-b-c1": edge("past-b", -10 * day),
    "organizerContactEventEdges/tonight-c1": edge("tonight", 2 * hour),
    "organizerContactEventEdges/next-c1": edge("next", 7 * day),
    "organizerContactEventEdges/other-c2": {...edge("other", day),
      contactId: "c2"},
    "organizerContacts/c1": {organizerId: "org", linkedUid: "user-1",
      identityState: "verified", sourceCount: 2},
    "events/tonight": {organizerId: "org", startTime: at(nowMillis + 2 * hour),
      endTime: at(nowMillis + 5 * hour)},
    "events/next": {organizerId: "org", startTime: at(nowMillis + 7 * day),
      endTime: at(nowMillis + 7 * day + 3 * hour)},
  });
}

const resolve = (db: AudienceTestStore, source: Parameters<
  typeof resolveRosterInsightEventIds>[1], id: string, before?: Data,
after?: Data) => resolveRosterInsightEventIds(db.asFirestore(), source, id,
  before, after, nowMillis);

test("events re-evaluate when their organizer, start or end changes",
  async () => {
    const db = store();
    const event = {organizerId: "org", startTime: at(nowMillis),
      endTime: at(nowMillis + hour), name: "Run"};
    assert.deepEqual(await resolve(db, "events", "e1", event,
      {...event, name: "Renamed"}), []);
    assert.deepEqual(await resolve(db, "events", "e1", event,
      {...event, startTime: at(nowMillis + day)}), ["e1"]);
    assert.deepEqual(await resolve(db, "events", "e1", undefined, event),
      ["e1"]);
  });

test("attendees matter only when they arrive or leave", async () => {
  const db = store();
  const attendee = {eventId: "tonight", status: "registered"};
  assert.deepEqual(await resolve(db, "eventAttendees", "a1", attendee,
    {...attendee, status: "checkedIn"}), []);
  assert.deepEqual(await resolve(db, "eventAttendees", "a1", undefined,
    attendee), ["tonight"]);
  assert.deepEqual(await resolve(db, "eventAttendees", "a1", attendee,
    undefined), ["tonight"]);
});

test("a past attendance change reaches the contact's later open events",
  async () => {
    const db = store();
    const before = edge("past-b", -10 * day);
    const after = {...before, checkedIn: true,
      checkedInAt: at(nowMillis - 10 * day + hour)};
    assert.deepEqual((await resolve(db, "organizerContactEventEdges",
      "past-b-c1", before, after)).sort(), ["next", "past-b", "tonight"]);
  });

test("tonight's check-in reaches only tonight and later events", async () => {
  const db = store();
  const before = edge("tonight", 2 * hour);
  const after = {...before, checkedIn: true, checkedInAt: at(nowMillis)};
  assert.deepEqual((await resolve(db, "organizerContactEventEdges",
    "tonight-c1", before, after)).sort(), ["next", "tonight"]);
});

test("an edge update outside the attendance fields is skipped", async () => {
  const db = store();
  const before = edge("tonight", 2 * hour);
  assert.deepEqual(await resolve(db, "organizerContactEventEdges",
    "tonight-c1", before, {...before, displayName: "Asha"}), []);
});

test("a merge moves an edge between contacts and re-evaluates both",
  async () => {
    const db = store();
    const before = edge("past-b", -10 * day);
    const after = {...before, contactId: "c2"};
    assert.deepEqual((await resolve(db, "organizerContactEventEdges",
      "past-b-c1", before, after)).sort(),
    ["next", "other", "past-b", "tonight"]);
  });

test("contacts and traits reach the contact's open events", async () => {
  const db = store();
  const contact = {identityState: "verified", sourceCount: 2,
    linkedUid: "user-1", deletedAt: null, hiddenAt: null, revision: 1};
  assert.deepEqual(await resolve(db, "organizerContacts", "c1", contact,
    {...contact, revision: 2}), []);
  assert.deepEqual((await resolve(db, "organizerContacts", "c1", contact,
    {...contact, linkedUid: "user-2"})).sort(), ["next", "tonight"]);
  assert.deepEqual(await resolve(db, "organizerContactTraits", "c1",
    {segmentIds: ["advocate"]}, {segmentIds: ["advocate"], revision: 2}), []);
  assert.deepEqual((await resolve(db, "organizerContactTraits", "c1",
    {segmentIds: ["advocate"]}, {segmentIds: []})).sort(),
  ["next", "tonight"]);
});

test("a payment updates spend, then the account's open roster views",
  async () => {
    const db = store();
    const payment = {userId: "user-1", orderId: "o1", paymentId: "p1",
      eventId: "next", amount: 500, amountMinor: 500, currency: "INR",
      status: "completed", signUpFailed: false, createdAt: at(nowMillis),
      completedAt: at(nowMillis)};
    const eventIds = await onPaymentWrite(db.asFirestore(),
      {changeId: "c1", before: undefined, after: payment}, nowMillis);
    assert.deepEqual(eventIds.sort(), ["next", "tonight"]);
    assert.equal((db.docs["organizerSpendTotals/org"]!.uidCount), 1);
    assert.ok(db.docs["hostEventRosterInsightViews/tonight"]);
    assert.deepEqual(await onPaymentWrite(db.asFirestore(),
      {changeId: "c2", before: payment, after: {...payment, orderId: "o2"}},
      nowMillis), []);
  });
