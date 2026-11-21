import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import type {HostEventRequestViewDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  maxRequestViewRows,
  reconcileHostEventRequestView,
  reconcileHostEventRequestViewsForPerson,
} from "./requestViewStore";

const at = (millis: number) => Timestamp.fromMillis(millis);
const nowMillis = 1_000_000;
type View = HostEventRequestViewDocument;
const viewOf = (db: AudienceTestStore, id = "e1") =>
  db.docs[`hostEventRequestViews/${id}`] as unknown as View | undefined;

const event = (extra: Record<string, unknown> = {}) => ({
  organizerId: "org", status: "active", name: "Long Table Supper",
  meetingPoint: "Somewhere", startTime: at(2_000_000),
  endTime: at(2_500_000), capacityLimit: 32, priceInPaise: 0,
  bookedCount: 30, eventPolicy: {admission: {manualApprovalRequired: false}},
  ...extra,
});

const waiting = (uid: string, millis: number, extra = {}) => ({
  uid, eventId: "e1", organizerId: "org", status: "waitlisted",
  waitlistedAt: at(millis), createdAt: at(millis), ...extra,
});

function world(docs: Record<string, Record<string, unknown>> = {}) {
  return new AudienceTestStore({
    "events/e1": event(),
    "eventBookings/e1_zoya": waiting("zoya", 300),
    "eventBookings/e1_ishaan": waiting("ishaan", 200,
      {hostApprovalStatus: "pending"}),
    "eventBookings/e1_nikhil": waiting("nikhil", 100,
      {waitlistOfferStatus: "active", waitlistOfferExpiresAt: at(900_000)}),
    "eventBookings/e1_gone": {...waiting("gone", 50),
      status: "cancelled"},
    "publicProfiles/zoya": {name: "  Zoya Merchant "},
    "publicProfiles/nikhil": {name: "Nikhil Rao"},
    "organizerContacts/c1": {organizerId: "org", linkedUid: "zoya"},
    "organizerContacts/c2": {organizerId: "other", linkedUid: "nikhil"},
    "hostContactSummaries/c1": {organizerId: "org",
      row: {attendedEventCount: 3}},
    "hostContactSummaries/c2": {organizerId: "other",
      row: {attendedEventCount: 9}},
    ...docs,
  });
}

test("one event's view holds requests and the numbered waitlist", async () => {
  const db = world();
  await reconcileHostEventRequestView(db.asFirestore(), "e1", nowMillis);
  const view = db.docs["hostEventRequestViews/e1"];
  assert.deepEqual(view, {
    organizerId: "org", eventId: "e1", eventEndMillis: 2_500_000,
    complete: true, version: 1, rows: [
      {uid: "nikhil", kind: "waitlist", eventId: "e1",
        eventName: "Long Table Supper", eventStartMillis: 2_000_000,
        placesLeft: 2, capacityLimit: 32, name: "Nikhil Rao",
        askedAtMillis: 100, waitlistPosition: 1, attendedEventCount: null,
        offerExpiresAtMillis: 900_000},
      {uid: "ishaan", kind: "request", eventId: "e1",
        eventName: "Long Table Supper", eventStartMillis: 2_000_000,
        placesLeft: 2, capacityLimit: 32, name: null, askedAtMillis: 200,
        waitlistPosition: null, attendedEventCount: null,
        offerExpiresAtMillis: null},
      {uid: "zoya", kind: "waitlist", eventId: "e1",
        eventName: "Long Table Supper", eventStartMillis: 2_000_000,
        placesLeft: 2, capacityLimit: 32, name: "Zoya Merchant",
        askedAtMillis: 300, waitlistPosition: 2, attendedEventCount: 3,
        offerExpiresAtMillis: null},
    ]});
});

test("an event that approves by hand lists only its requests", async () => {
  const db = world({"events/e1": event({
    eventPolicy: {admission: {manualApprovalRequired: true}}})});
  await reconcileHostEventRequestView(db.asFirestore(), "e1", nowMillis);
  assert.deepEqual(viewOf(db)?.rows.map((row) => row.uid), ["ishaan"]);
});

test("an expired offer keeps its expiry for the reader's clock",
  async () => {
    const db = world();
    await reconcileHostEventRequestView(db.asFirestore(), "e1", 950_000);
    assert.equal(viewOf(db)?.rows[0].offerExpiresAtMillis, 900_000);
  });

test("no view without an active coming event or anyone waiting",
  async () => {
    for (const docs of [
      {"events/e1": event({status: "cancelled"})},
      {"events/e1": event({endTime: at(nowMillis)})},
      {"events/e1": event({organizerId: undefined})},
    ]) {
      const db = world(docs);
      await reconcileHostEventRequestView(db.asFirestore(), "e1", nowMillis);
      assert.equal(db.docs["hostEventRequestViews/e1"], undefined);
    }
    const empty = new AudienceTestStore({"events/e1": event()});
    await reconcileHostEventRequestView(empty.asFirestore(), "e1", nowMillis);
    assert.equal(empty.docs["hostEventRequestViews/e1"], undefined);
  });

test("reconcile is idempotent and removes a view nobody needs",
  async () => {
    const db = world();
    await reconcileHostEventRequestView(db.asFirestore(), "e1", nowMillis);
    const first = db.docs["hostEventRequestViews/e1"];
    await reconcileHostEventRequestView(db.asFirestore(), "e1", nowMillis);
    assert.equal(db.docs["hostEventRequestViews/e1"], first);
    db.docs["events/e1"] = event({status: "cancelled"});
    await reconcileHostEventRequestView(db.asFirestore(), "e1", nowMillis);
    assert.equal(db.docs["hostEventRequestViews/e1"], undefined);
  });

test("an event whose policy fails its contract offers nobody", async () => {
  const db = world({"events/e1": event({priceInPaise: undefined})});
  await reconcileHostEventRequestView(db.asFirestore(), "e1", nowMillis);
  assert.deepEqual(viewOf(db)?.rows.map((row) => row.uid), ["ishaan"]);
});

test("a long queue is cut to the view's size and marked incomplete",
  async () => {
    const docs: Record<string, Record<string, unknown>> = {};
    for (let index = 0; index < maxRequestViewRows + 5; index++) {
      docs[`eventBookings/e1_p${index}`] =
        waiting(`p${index}`, 1000 + index);
    }
    const db = world(docs);
    await reconcileHostEventRequestView(db.asFirestore(), "e1", nowMillis);
    assert.equal(viewOf(db)?.rows.length, maxRequestViewRows);
    assert.equal(viewOf(db)?.complete, false);
  });

test("a person's change re-evaluates each event they wait on", async () => {
  const db = world({
    "events/e2": event({organizerId: "other"}),
    "eventBookings/e2_zoya": {...waiting("zoya", 400), eventId: "e2",
      organizerId: "other"},
  });
  await reconcileHostEventRequestViewsForPerson(db.asFirestore(), "zoya",
    "org", nowMillis);
  assert.notEqual(db.docs["hostEventRequestViews/e1"], undefined);
  assert.equal(db.docs["hostEventRequestViews/e2"], undefined);
  await reconcileHostEventRequestViewsForPerson(db.asFirestore(), "zoya",
    null, nowMillis);
  assert.notEqual(db.docs["hostEventRequestViews/e2"], undefined);
});
