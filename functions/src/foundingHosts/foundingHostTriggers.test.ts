import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {platformTermsDocument} from "../commercialTerms/testFixture";
import {dayMillis} from "../money/hostTrial";
import {FakeFirestore} from "../shared/testing/fakeFirestore";
import type {FoundingHostOffer} from "./foundingHostOffer";
import {gainedOwner, reconcileFoundingHostPlaces} from "./foundingHostTriggers";

const owned = {ownership: {state: "userCreated"}};
const unclaimed = {ownership: {state: "unclaimed"}};

test("only the write that gives an organizer an owner takes a place", () => {
  assert.equal(gainedOwner(undefined, owned), true);
  assert.equal(gainedOwner(unclaimed, {ownership: {state: "claimed"}}), true);
  assert.equal(gainedOwner(owned, {...owned, name: "Renamed"}), false);
  assert.equal(gainedOwner({ownership: {state: "claimed"}},
    {ownership: {state: "transferred"}}), false);
  assert.equal(gainedOwner(undefined, unclaimed), false);
  assert.equal(gainedOwner(owned, undefined), false);
});

test("the daily reconcile takes places the trigger missed, once", async () => {
  const now = 1_763_300_000_000;
  const opened = now - 10 * dayMillis;
  const offer = (marketId: string, patch: Partial<FoundingHostOffer> = {}):
    FoundingHostOffer => ({schemaVersion: 1, marketId, revision: 1, cap: 50,
    endsAtMillis: null, trialDays: 90, takenCount: 0, openedAtMillis: opened,
    lastPlaceAtMillis: null, reason: "Owner decision", updatedByUid: "owner",
    updatedAtMillis: opened, ...patch});
  const facts = (marketId: string, claimedAtMillis: number) => ({
    marketId, milestones: {claimedAt: Timestamp.fromMillis(claimedAtMillis),
      firstEventAt: null, firstPaidBookingAt: null}});
  const organizer = (marketId: string) => ({...owned,
    locationMarketId: marketId});
  const store = new FakeFirestore({
    "commercialTerms/platform": platformTermsDocument(),
    "foundingHostOffers/in-mh-mumbai": {...offer("in-mh-mumbai")},
    "foundingHostOffers/in-mp-indore": {...offer("in-mp-indore",
      {cap: 1, takenCount: 1})},
    // Missed by the trigger yesterday.
    "organizers/missed": organizer("in-mh-mumbai"),
    "organizerGrowthFacts/missed": facts("in-mh-mumbai", now - dayMillis),
    // Already granted by the trigger.
    "organizers/granted": organizer("in-mh-mumbai"),
    "organizerGrowthFacts/granted": facts("in-mh-mumbai", now - dayMillis),
    "foundingHostPlaces/granted": {organizerId: "granted"},
    // Indore sold out; Pune has no offer; this one is too old to look at.
    "organizers/indore": organizer("in-mp-indore"),
    "organizerGrowthFacts/indore": facts("in-mp-indore", now - dayMillis),
    "organizers/pune": organizer("in-mh-pune"),
    "organizerGrowthFacts/pune": facts("in-mh-pune", now - dayMillis),
    "organizers/old": organizer("in-mh-mumbai"),
    "organizerGrowthFacts/old": facts("in-mh-mumbai", now - 5 * dayMillis),
  });
  const deps = {db: store as unknown as FirebaseFirestore.Firestore,
    now: () => now};
  assert.deepEqual(await reconcileFoundingHostPlaces(deps),
    {checked: 2, granted: 1});
  const place = store.get("foundingHostPlaces/missed");
  assert.deepEqual([place?.placeNumber, place?.source, place?.ownedAtMillis],
    [1, "dailyReconcile", now - dayMillis]);
  assert.equal(store.get("foundingHostPlaces/indore"), undefined);
  assert.equal(store.get("foundingHostPlaces/pune"), undefined);
  assert.equal(store.get("foundingHostPlaces/old"), undefined);
  // A second run finds nothing new to grant.
  assert.deepEqual(await reconcileFoundingHostPlaces(deps),
    {checked: 2, granted: 0});
  assert.equal(store.get("foundingHostOffers/in-mh-mumbai")?.takenCount, 1);
});
