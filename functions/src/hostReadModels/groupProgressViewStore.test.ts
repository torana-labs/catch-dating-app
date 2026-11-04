import assert from "node:assert/strict";
import test from "node:test";
import {contractValidator} from "../shared/contractTestValidators";
import {departureRosterHarness} from
  "../eventSuccess/operations/departureRosterTestFixtures";
import {progressFixtureManager as manager} from
  "../eventSuccess/operations/groupProgressTestFixtures";
import {progressIdentity} from
  "../eventSuccess/operations/groupProgressSource";
import {reconcileGroupProgressViews} from "./groupProgressViewStore";
import {groupProgressViewsCollection} from "./movementViewSupport";
import {allowDeletes, documentsOf, viewDeps, withoutServerTime} from
  "./movementViewTestFixtures";

const validate = contractValidator("HostEventGroupProgressViewDocument");
const end = 3_000_000;

async function harness() {
  const h = await departureRosterHarness();
  allowDeletes(h.fake);
  const reconcile = () => reconcileGroupProgressViews(h.db,
    h.scope.context.eventId, viewDeps(h.clock));
  const views = () => documentsOf(h.fake, groupProgressViewsCollection);
  const view = (groupId = "event:whole") =>
    views().get(progressIdentity(h.scope.context, groupId));
  return {...h, reconcile, views, view};
}

test("each configured group gets the manager read without serverTime",
  async () => {
    const h = await harness();
    const outcome = await h.reconcile();
    assert.deepEqual([outcome.written, outcome.unchanged, outcome.removed],
      [1, 0, 0]);
    const doc = h.view()!;
    assert.ok(validate(doc), JSON.stringify(validate.errors));
    assert.equal(doc.organizerId, h.scope.context.organizerId);
    assert.equal(doc.groupId, "event:whole");
    assert.equal(doc.eventEndAtMillis, end);
    assert.equal(doc.sourceCoverage, "complete");
    assert.equal(doc.revision, 1);
    const read = await h.progress.get(manager, h.scope);
    assert.deepEqual(doc.view, withoutServerTime(read.view));
    assert.ok((doc.view as {guidance: unknown}).guidance);
  });

test("an unchanged evaluation writes nothing; a departure rewrites the view",
  async () => {
    const h = await harness();
    await h.reconcile();
    const first = h.view()!;
    const again = await h.reconcile();
    assert.deepEqual([again.written, again.unchanged], [0, 1]);
    assert.deepEqual(h.view(), first);
    await h.progress.confirmDeparture(manager, await h.command());
    const changed = await h.reconcile();
    assert.equal(changed.written, 1);
    const doc = h.view()!;
    assert.equal(doc.revision, 2);
    assert.deepEqual(doc.view,
      withoutServerTime((await h.progress.get(manager, h.scope)).view));
  });

test("openness is evaluated just before the end; the phone applies the clock",
  async () => {
    const h = await harness();
    h.clock.now = end + 60_000;
    await h.reconcile();
    const doc = h.view()!;
    const view = doc.view as {eventOpen: boolean; guidance: unknown};
    assert.equal(view.eventOpen, true,
      "the server never decides that the event has ended");
    assert.ok(view.guidance);
    assert.equal(doc.eventEndAtMillis, end);
    await h.put("eventSuccessPlans/" + h.scope.context.eventId,
      {...h.seed.plan, status: "complete"});
    await h.reconcile();
    assert.equal((h.view()!.view as {eventOpen: boolean}).eventOpen, false);
  });

test("pace groups get their own views; a group that leaves loses its view",
  async () => {
    const h = await harness();
    await h.groups();
    await h.reconcile();
    assert.deepEqual([...h.views().values()].map((v) => v.groupId).sort(),
      ["easy", "event:whole", "fast"]);
    for (const groupId of ["easy", "fast"]) {
      assert.deepEqual(h.view(groupId)!.view, withoutServerTime(
        (await h.progress.get(manager, {...h.scope, groupId})).view));
    }
    const event = await h.read("events/" + h.scope.context.eventId) as {
      eventFormat: {activityDetails: {routePlan: {paceGroups: unknown[]}}}};
    event.eventFormat.activityDetails.routePlan.paceGroups =
      event.eventFormat.activityDetails.routePlan.paceGroups.slice(0, 1);
    await h.put("events/" + h.scope.context.eventId, event);
    const outcome = await h.reconcile();
    assert.equal(outcome.removed, 1);
    assert.deepEqual([...h.views().values()].map((v) => v.groupId).sort(),
      ["easy", "event:whole"]);
  });

test("an event that is gone or has no assistance format has no views",
  async () => {
    const h = await harness();
    await h.reconcile();
    assert.equal(h.views().size, 1);
    const event = await h.read("events/" + h.scope.context.eventId) as
      Record<string, unknown>;
    const {eventFormat: _format, ...withoutFormat} = event;
    void _format;
    await h.put("events/" + h.scope.context.eventId, withoutFormat);
    assert.equal((await h.reconcile()).removed, 1);
    assert.equal(h.views().size, 0);
    await h.put("events/" + h.scope.context.eventId, event);
    await h.reconcile();
    h.fake.remove("events/" + h.scope.context.eventId);
    await h.reconcile();
    assert.equal(h.views().size, 0);
  });

test("an invalid progress row is recorded and keeps the previous view",
  async () => {
    const h = await harness();
    await h.reconcile();
    const before = h.view()!;
    const path = "eventAssistanceGroupProgress/" +
      progressIdentity(h.scope.context, "event:whole");
    const row = await h.read(path) as Record<string, unknown>;
    await h.put(path, {...row, revision: -4});
    const outcome = await h.reconcile();
    assert.deepEqual(outcome.invalidSource.map((i) => i.source),
      ["eventAssistanceGroupProgress"]);
    const doc = h.view()!;
    assert.ok(validate(doc), JSON.stringify(validate.errors));
    assert.equal(doc.sourceCoverage, "invalidSource");
    assert.equal(doc.incompleteSource, "eventAssistanceGroupProgress");
    assert.deepEqual(doc.view, before.view);
    await h.put(path, row);
    await h.reconcile();
    assert.equal(h.view()!.sourceCoverage, "complete");
  });

test("an invalid plan is attributed to the plan and keeps every view",
  async () => {
    const h = await harness();
    await h.reconcile();
    await h.put("eventSuccessPlans/" + h.scope.context.eventId,
      {...h.seed.plan, organizerId: "someone-else"});
    const outcome = await h.reconcile();
    assert.deepEqual(outcome.invalidSource.map((i) => i.source),
      ["eventSuccessPlans"]);
    assert.equal(h.view()!.incompleteSource, "eventSuccessPlans");
    assert.ok(h.view()!.view);
  });
