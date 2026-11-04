import assert from "node:assert/strict";
import test from "node:test";
import {departureRosterHarness} from
  "../eventSuccess/operations/departureRosterTestFixtures";
import {progressFixtureManager as manager} from
  "../eventSuccess/operations/groupProgressTestFixtures";
import {backfillMovementViews} from "./movementViewBackfill";
import {
  checkpointViewsCollection,
  departureViewsCollection,
  groupProgressViewsCollection,
} from "./movementViewSupport";
import {allowDeletes, documentsOf, viewDeps} from "./movementViewTestFixtures";

test("backfill counts without apply and evaluates the organizer's open " +
  "events with apply", async () => {
  const h = await departureRosterHarness();
  allowDeletes(h.fake);
  const input = await h.command();
  await h.progress.confirmDeparture(manager, {...input, command: {
    ...input.command, payload: {...input.command.payload,
      checkpointRequest: {responsibleOperatorId: manager,
        dueAt: h.clock.now + 30_000}}}});
  const organizerId = h.scope.context.organizerId;
  const deps = viewDeps(h.clock);
  const dry = await backfillMovementViews(h.db, organizerId,
    "departure-views", false, deps);
  assert.deepEqual(dry, {events: 1, rosters: 1, outcomes: {}});
  assert.equal(documentsOf(h.fake, departureViewsCollection).size, 0);
  const progress = await backfillMovementViews(h.db, organizerId,
    "group-progress-views", true, deps);
  assert.equal(progress.outcomes.written, 1);
  assert.equal(documentsOf(h.fake, groupProgressViewsCollection).size, 1);
  const departures = await backfillMovementViews(h.db, organizerId,
    "departure-views", true, deps);
  assert.deepEqual(departures.outcomes, {complete: 1});
  const checkpoints = await backfillMovementViews(h.db, organizerId,
    "checkpoint-views", true, deps);
  assert.deepEqual(checkpoints.outcomes, {complete: 1});
  assert.equal(documentsOf(h.fake, checkpointViewsCollection).size, 1);
  h.clock.now = 3_000_000;
  assert.deepEqual(await backfillMovementViews(h.db, organizerId,
    "checkpoint-views", true, deps), {events: 0, rosters: 0, outcomes: {}},
  "an ended event is not backfilled");
});
