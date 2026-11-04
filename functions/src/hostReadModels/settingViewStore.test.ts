import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import test from "node:test";
import {contractValidator} from "../shared/contractTestValidators";
import {departureRosterHarness} from
  "../eventSuccess/operations/departureRosterTestFixtures";
import {progressFixtureManager as manager} from
  "../eventSuccess/operations/groupProgressTestFixtures";
import {SETTINGS, settingId} from "../eventSuccess/operations/policySettings";
import {EventAssistanceSettingsStore} from
  "../eventSuccess/operations/policySettingsStore";
import {reconcileSettingViews} from "./settingViewStore";
import {settingViewsCollection} from "./guestViewSupport";
import {allowDeletes, documentsOf, viewDeps, withoutServerTime} from
  "./movementViewTestFixtures";

const validate = contractValidator("HostEventAssistanceSettingViewDocument");
type Data = Record<string, unknown>;

async function harness() {
  const h = await departureRosterHarness();
  allowDeletes(h.fake);
  await h.groups();
  const settings = new EventAssistanceSettingsStore(h.db, () => h.clock.now);
  const scopeOf = (groupId: string) => ({context: h.scope.context, groupId,
    workflowKind: "lateJoin" as const});
  const reconcile = () => reconcileSettingViews(h.db,
    h.scope.context.eventId, viewDeps(h.clock));
  const docs = () => documentsOf(h.fake, settingViewsCollection);
  const docOf = (groupId: string) =>
    docs().get(settingId(scopeOf(groupId))) as Data | undefined;
  const read = async (groupId: string) => withoutServerTime(
    (await settings.get(manager, scopeOf(groupId))).view);
  const save = async (groupId: string) => {
    const view = (await settings.get(manager, scopeOf(groupId))).view;
    return settings.set(manager, {...scopeOf(groupId),
      requestId: randomUUID(), expectedRevision: view.ownRevision,
      expectedSourceHash: view.sourceHash,
      preference: {kind: "configured", template: view.suggested!}});
  };
  return {...h, settings, scopeOf, reconcile, docs, docOf, read, save};
}

test("each configured group's late-join view is the manager's read",
  async () => {
    const h = await harness();
    const outcome = await h.reconcile();
    assert.deepEqual([outcome.written, outcome.unchanged, outcome.removed],
      [3, 0, 0]);
    for (const groupId of ["event:whole", "easy", "fast"]) {
      const doc = h.docOf(groupId)!;
      assert.ok(validate(doc), JSON.stringify(validate.errors));
      assert.equal(doc.groupId, groupId);
      assert.equal(doc.workflowKind, "lateJoin");
      assert.equal(doc.eventEndAtMillis, 3_000_000);
      assert.deepEqual(doc.view, await h.read(groupId));
    }
    assert.equal((await h.reconcile()).unchanged, 3);
  });

test("a whole-event choice is inherited by every group view", async () => {
  const h = await harness();
  await h.reconcile();
  await h.save("event:whole");
  const outcome = await h.reconcile();
  assert.equal(outcome.written, 3);
  for (const groupId of ["event:whole", "easy", "fast"]) {
    assert.deepEqual(h.docOf(groupId)!.view, await h.read(groupId));
  }
  assert.equal((h.docOf("easy")!.view as Data).origin, "event");
  assert.equal((h.docOf("event:whole")!.view as Data).status, "configured");
});

test("an invalid setting row marks its views and keeps their projection",
  async () => {
    const h = await harness();
    await h.reconcile();
    const before = h.docOf("fast")!;
    await h.put(SETTINGS + "/" + settingId(h.scopeOf("fast")),
      {broken: true});
    const outcome = await h.reconcile();
    assert.deepEqual(outcome.invalidSource.map((i) => i.settingId),
      [settingId(h.scopeOf("fast"))]);
    const doc = h.docOf("fast")!;
    assert.ok(validate(doc), JSON.stringify(validate.errors));
    assert.equal(doc.sourceCoverage, "invalidSource");
    assert.equal(doc.incompleteSource, "eventAssistanceSettings");
    assert.deepEqual(doc.view, before.view);
    assert.equal(h.docOf("easy")!.sourceCoverage, "complete");
  });

test("groups that leave the route plan, and gone events, lose their views",
  async () => {
    const h = await harness();
    await h.reconcile();
    await h.put("events/" + h.scope.context.eventId, h.seed.event);
    const outcome = await h.reconcile();
    assert.equal(outcome.removed, 2);
    assert.deepEqual([...h.docs().keys()],
      [settingId(h.scopeOf("event:whole"))]);
    h.fake.remove("events/" + h.scope.context.eventId);
    assert.equal((await h.reconcile()).removed, 1);
    assert.equal(h.docs().size, 0);
  });
