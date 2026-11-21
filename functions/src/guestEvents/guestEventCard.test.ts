import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {contractValidator} from "../shared/contractTestValidators";
import type {EventDocument} from "../shared/generated/firestoreAdminTypes";
import type {GuestEventCard} from "../shared/generated/guestEventCard";
import {FakeFirestore} from "../shared/testing/fakeFirestore";
import {guestEventCard} from "./guestEventCard";
import {refreshSavedEventCard, refreshSavedEventCardsForEvent} from
  "./savedEventCards";

const asEvent = (data: Record<string, unknown>) =>
  data as unknown as EventDocument;
const savedCard = (db: FakeFirestore, path: string) =>
  db.get(path)?.eventCard as GuestEventCard | undefined;
const validateCard = contractValidator<GuestEventCard>("GuestEventCard");
const start = 1_800_000_000_000;

function event(overrides: Record<string, unknown> = {}):
    Record<string, unknown> {
  return {
    organizerId: "club", name: "Sunday run", publicationState: "published",
    status: "active", startTime: Timestamp.fromMillis(start),
    endTime: Timestamp.fromMillis(start + 3_600_000),
    eventTimezone: "Asia/Kolkata",
    eventFormat: {version: 1, activityKind: "socialRun",
      interactionModel: "pacePods", eventSuccessPrimitives: {big: true}},
    distanceKm: 5, pace: "easy", meetingPoint: "Gate 2",
    capacityLimit: 40, priceInPaise: 25000, currency: "INR",
    bookedCount: 12, checkedInCount: 3, description: "Easy 5k",
    eventPolicy: {pricing: {basePriceInPaise: 25000,
      cohortAdjustmentsInPaise: {}, demandPricingRules: [{}]}},
    ...overrides,
  };
}

test("the card copies list fields, never live counts", () => {
  const card = guestEventCard("e1", asEvent(event()));
  assert.ok(card);
  assert.ok(validateCard(card), JSON.stringify(validateCard.errors));
  assert.equal(card.startTimeMillis, start);
  assert.equal(card.endTimeMillis, start + 3_600_000);
  assert.deepEqual(card.eventFormat, {version: 1, activityKind: "socialRun",
    interactionModel: "pacePods"});
  assert.equal(card.demandPricing, true);
  assert.equal(card.meetingLocation, null);
  assert.equal("bookedCount" in card, false);
  assert.equal("checkedInCount" in card, false);
});

test("a price hidden until booking opens is left off the card", () => {
  const hidden = guestEventCard("e1", asEvent(event({
    priceHiddenUntilBookingOpens: true, publicRegistrationEnabled: false})));
  assert.ok(hidden);
  assert.ok(validateCard(hidden), JSON.stringify(validateCard.errors));
  assert.equal(hidden.priceInPaise, null);
  assert.equal(hidden.demandPricing, false);
  assert.equal(hidden.priceHiddenUntilBookingOpens, true);
  const open = guestEventCard("e1", asEvent(event({
    priceHiddenUntilBookingOpens: true, publicRegistrationEnabled: true})));
  assert.equal(open?.priceInPaise, 25000);
});

test("an event that cannot be listed has no card", () => {
  assert.equal(guestEventCard("e1", undefined), null);
  assert.equal(guestEventCard("e1", asEvent(event({startTime: null}))),
    null);
  assert.equal(guestEventCard("e1", asEvent(event({eventFormat: undefined}))),
    null);
  const bad = guestEventCard("e1",
    asEvent(event({endTime: Timestamp.fromMillis(1)})));
  assert.equal(bad?.endTimeMillis, null);
});

test("a new saved edge gets its card; an unchanged card is not rewritten",
  async () => {
    const db = new FakeFirestore({"events/e1": event(),
      "savedEvents/u_e1": {uid: "u", eventId: "e1",
        savedAt: Timestamp.fromMillis(1)}});
    const firestore = db as unknown as FirebaseFirestore.Firestore;
    assert.equal(await refreshSavedEventCard(firestore, "u_e1"), "written");
    assert.equal(savedCard(db, "savedEvents/u_e1")?.name, "Sunday run");
    assert.equal(await refreshSavedEventCard(firestore, "u_e1"),
      "unchanged");
    assert.equal(await refreshSavedEventCard(firestore, "missing"),
      "skipped");
  });

test("an event change rewrites only its stale saved cards", async () => {
  const db = new FakeFirestore({"events/e1": event(),
    "events/e2": event({name: "Other"}),
    "savedEvents/a_e1": {uid: "a", eventId: "e1",
      savedAt: Timestamp.fromMillis(1)},
    "savedEvents/b_e1": {uid: "b", eventId: "e1",
      savedAt: Timestamp.fromMillis(1)},
    "savedEvents/a_e2": {uid: "a", eventId: "e2",
      savedAt: Timestamp.fromMillis(1)}});
  const firestore = db as unknown as FirebaseFirestore.Firestore;
  assert.equal(await refreshSavedEventCardsForEvent(firestore, "e1"), 2);
  assert.equal(await refreshSavedEventCardsForEvent(firestore, "e1"), 0);
  assert.equal(savedCard(db, "savedEvents/a_e2"), undefined);
  db.put("events/e1", event({name: "Renamed", bookedCount: 39}));
  assert.equal(await refreshSavedEventCardsForEvent(firestore, "e1"), 2);
  assert.equal(savedCard(db, "savedEvents/b_e1")?.name, "Renamed");
});
