import assert from "node:assert/strict";
import test from "node:test";
import {contractValidator} from "../shared/contractTestValidators";
import {departureRosterHarness} from
  "../eventSuccess/operations/departureRosterTestFixtures";
import {progressFixtureManager as manager} from
  "../eventSuccess/operations/groupProgressTestFixtures";
import {EventAccountabilityStore} from
  "../eventSuccess/operations/accountabilityStore";
import {guestCollections, guestIdentity} from
  "../eventSuccess/operations/guestRecords";
import {accountabilityViewId, reconcileAccountabilityView} from
  "./accountabilityViewStore";
import {accountabilityViewsCollection} from "./guestViewSupport";
import {allowDeletes, documentsOf, viewDeps} from "./guestViewTestFixtures";

const validate = contractValidator("HostEventAccountabilityViewDocument");
type Data = Record<string, unknown>;

async function harness() {
  const h = await departureRosterHarness();
  allowDeletes(h.fake);
  await h.groups();
  const store = new EventAccountabilityStore(h.db, () => h.clock.now);
  const scope = {context: h.scope.context, groupId: "event:whole",
    attendeeId: h.attendeeId};
  const reconcile = () => reconcileAccountabilityView(h.db,
    h.scope.context.eventId, h.attendeeId, viewDeps(h.clock));
  const doc = () => documentsOf(h.fake, accountabilityViewsCollection).get(
    accountabilityViewId(h.scope.context.eventId, h.attendeeId)) as
    Data | undefined;
  const read = async () => {
    const view = (await store.get(manager, scope)).view;
    return {sourceHash: view.sourceHash, revision: view.revision,
      episodeId: view.episodeId, disposition: view.disposition,
      availability: view.availability};
  };
  return {...h, store, accountabilityScope: scope, reconcile, doc, read};
}

test("a sweep guest's view is the manager's event-wide read", async () => {
  const h = await harness();
  assert.equal((await h.reconcile()).kind, "complete");
  const doc = h.doc()!;
  assert.ok(validate(doc), JSON.stringify(validate.errors));
  assert.equal(doc.organizerId, h.scope.context.organizerId);
  assert.deepEqual(doc.view, await h.read());
  assert.deepEqual((doc.view as Data).availability, {kind: "ready"});
  assert.equal((await h.reconcile()).kind, "unchanged");
});

test("a resolution changes the view; the resolve fence is the view's hash",
  async () => {
    const h = await harness();
    await h.reconcile();
    const view = h.doc()!.view as {sourceHash: string;
      episodeId: string | null};
    await h.store.resolve(manager, {groupId: "event:whole",
      expectedSourceHash: view.sourceHash, command: {
        kind: "resolveAccountability", context: h.scope.context,
        eventId: h.scope.context.eventId, operationId: "resolve-one",
        payload: {attendeeId: h.attendeeId, episodeId: view.episodeId,
          disposition: "returned"}}});
    assert.equal((await h.reconcile()).kind, "complete");
    assert.deepEqual(h.doc()!.view, await h.read());
    assert.equal((h.doc()!.view as Data).disposition, "returned");
  });

test("events without the sweep, and gone attendees, have no view",
  async () => {
    const h = await harness();
    await h.reconcile();
    h.fake.remove(h.attendeePath);
    assert.deepEqual(await h.reconcile(), {kind: "removed", existed: true});
    await h.put(h.attendeePath, h.attendee);
    await h.put("events/" + h.scope.context.eventId, h.seed.event);
    assert.deepEqual(await h.reconcile(), {kind: "removed", existed: false},
      "a bar crawl has no sweep accountability");
  });

test("an invalid guest row is recorded and keeps the previous view",
  async () => {
    const h = await harness();
    await h.reconcile();
    const before = h.doc()!;
    await h.put(guestCollections.guests + "/" + guestIdentity(
      h.scope.context, h.attendeeId), {broken: true});
    const outcome = await h.reconcile();
    assert.equal(outcome.kind, "invalidSource");
    const doc = h.doc()!;
    assert.ok(validate(doc), JSON.stringify(validate.errors));
    assert.equal(doc.sourceCoverage, "invalidSource");
    assert.deepEqual(doc.view, before.view);
  });
