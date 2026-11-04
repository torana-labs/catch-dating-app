import assert from "node:assert/strict";
import test from "node:test";
import {contractValidator} from "../shared/contractTestValidators";
import {setup} from "../eventSuccess/operations/liveLateJoinTestHarness";
import {configureRuntime} from
  "../eventSuccess/operations/runtimeConfigTestHarness";
import {EventAssistanceRuntimeConfigStore} from
  "../eventSuccess/operations/runtimeConfigStore";
import {runtimeConfigId} from
  "../eventSuccess/operations/runtimeConfigRecords";
import {start} from "../eventSuccess/operations/whatsappTestHarness";
import {reconcileRuntimeView} from "./runtimeViewStore";
import {runtimeViewsCollection} from "./guestViewSupport";
import {allowDeletes, documentsOf, viewDeps, withoutServerTime} from
  "./movementViewTestFixtures";

const validate = contractValidator("HostEventRuntimeViewDocument");
const end = start + 3_600_000;
type Data = Record<string, unknown>;

async function harness() {
  const h = await setup();
  allowDeletes(h.fake);
  const runtime = new EventAssistanceRuntimeConfigStore(h.db,
    () => h.clock.now);
  const reconcile = () => reconcileRuntimeView(h.db, h.context.eventId,
    viewDeps(h.clock));
  const doc = () => documentsOf(h.fake, runtimeViewsCollection)
    .get(runtimeConfigId(h.context)) as Data | undefined;
  const readView = async () => {
    const {senderSetup: _setup, ...view} = withoutServerTime(
      (await runtime.get("host-1", {context: h.context})).view);
    void _setup;
    return view;
  };
  return {...h, runtime, reconcile, doc, readView};
}

test("the automation view is the manager's read without the sender picker",
  async () => {
    const h = await harness();
    assert.equal((await h.reconcile()).kind, "complete");
    let doc = h.doc()!;
    assert.ok(validate(doc), JSON.stringify(validate.errors));
    assert.equal(doc.eventEndAtMillis, end);
    assert.equal(doc.closed, false);
    assert.deepEqual(doc.view, await h.readView());
    assert.equal((doc.view as Data).status, "unconfigured");
    await configureRuntime(h);
    assert.equal((await h.reconcile()).kind, "complete");
    doc = h.doc()!;
    assert.ok(validate(doc), JSON.stringify(validate.errors));
    assert.deepEqual(doc.view, await h.readView());
    assert.equal((doc.view as Data).status, "configured");
    assert.equal((await h.reconcile()).kind, "unchanged");
  });

test("the view never decides the end passed; closure is the event's own",
  async () => {
    const h = await harness();
    await configureRuntime(h);
    h.clock.now = end + 60_000;
    await h.reconcile();
    const view = h.doc()!.view as {canConfigure: boolean; status: string};
    assert.equal(view.canConfigure, true);
    assert.equal(view.status, "configured");
    assert.equal(h.doc()!.closed, false);
    h.clock.now = start;
    const planPath = "eventSuccessPlans/" + h.context.eventId;
    await h.write(planPath, {...await h.read(planPath), status: "complete"});
    await h.reconcile();
    assert.equal(h.doc()!.closed, true);
    assert.deepEqual(h.doc()!.view, await h.readView());
    assert.equal((h.doc()!.view as Data).status, "eventClosed");
  });

test("an invalid organizer keeps the view; a gone event removes it",
  async () => {
    const h = await harness();
    await h.reconcile();
    const before = h.doc()!;
    await h.write("organizers/" + h.context.organizerId, {broken: true});
    const outcome = await h.reconcile();
    assert.equal(outcome.kind, "invalidSource");
    const doc = h.doc()!;
    assert.ok(validate(doc), JSON.stringify(validate.errors));
    assert.equal(doc.incompleteSource, "organizers");
    assert.deepEqual(doc.view, before.view);
    h.fake.remove("events/" + h.context.eventId);
    assert.deepEqual(await h.reconcile(), {kind: "removed", existed: true});
    assert.equal(h.doc(), undefined);
  });
