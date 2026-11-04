import assert from "node:assert/strict";
import test from "node:test";
import {departureRosterHarness} from
  "../eventSuccess/operations/departureRosterTestFixtures";
import {backfillGuestViews} from "./guestViewBackfill";
import {
  accountabilityViewsCollection,
  membershipViewsCollection,
  runtimeViewsCollection,
  settingViewsCollection,
} from "./guestViewSupport";
import {allowDeletes, documentsOf, viewDeps} from "./guestViewTestFixtures";

test("backfill counts without apply and evaluates the organizer's open " +
  "events with apply", async () => {
  const h = await departureRosterHarness();
  allowDeletes(h.fake);
  await h.groups();
  const organizerId = h.scope.context.organizerId;
  const deps = viewDeps(h.clock);
  assert.deepEqual(await backfillGuestViews(h.db, organizerId,
    "membership-views", false, deps), {events: 1, attendees: 1,
    outcomes: {}});
  assert.equal(documentsOf(h.fake, membershipViewsCollection).size, 0);
  assert.deepEqual((await backfillGuestViews(h.db, organizerId,
    "accountability-views", true, deps)).outcomes, {complete: 1});
  assert.deepEqual((await backfillGuestViews(h.db, organizerId,
    "membership-views", true, deps)).outcomes, {complete: 1});
  assert.deepEqual((await backfillGuestViews(h.db, organizerId,
    "setting-views", true, deps)).outcomes, {written: 3, unchanged: 0,
    removed: 0, invalidSource: 0});
  assert.deepEqual((await backfillGuestViews(h.db, organizerId,
    "runtime-views", true, deps)).outcomes, {complete: 1});
  for (const [collection, size] of [[accountabilityViewsCollection, 1],
    [membershipViewsCollection, 1], [settingViewsCollection, 3],
    [runtimeViewsCollection, 1]] as const) {
    assert.equal(documentsOf(h.fake, collection).size, size, collection);
  }
  h.clock.now = 3_000_000;
  assert.deepEqual(await backfillGuestViews(h.db, organizerId,
    "runtime-views", true, deps), {events: 0, attendees: 0, outcomes: {}},
  "an ended event is not backfilled");
});
