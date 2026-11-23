import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FakeFirestore} from "../shared/testing/fakeFirestore";
import {contractValidator} from "../shared/contractTestValidators";
import {organizerEventSuccessLayoutDocumentId} from
  "../domain/formats/layoutDocumentId";
import {getEventSuccessSpatialLayoutHandler} from "./layoutAssets";
import {reconcileEventSuccessLayoutView, reconcileLayoutViewsForLayout} from
  "./layoutViews";

const validate = contractValidator("EventSuccessLayoutViewDocument");
const unit = (id: string, gridX: number) => ({id, label: `Table ${id}`,
  shape: "round", capacity: 6, gridX, gridY: 0, order: gridX + 1});

function store() {
  return new FakeFirestore({
    "organizers/org": {ownerUserId: "host", hostUserId: "host",
      hostUserIds: ["host"], name: "Lantern Lane"},
    "events/e1": {organizerId: "org", status: "active", name: "Supper"},
    "eventSuccessPlans/e1": {eventId: "e1", organizerId: "org",
      layoutId: "hall", structureConfig: {unitKind: "tables"}},
    [`organizerEventSuccessLayouts/${
      organizerEventSuccessLayoutDocumentId("org", "hall")}`]: {
      organizerId: "org", layoutId: "hall", label: "Main hall",
      units: [unit("t1", 0), unit("t2", 1)], createdByUid: "host",
      updatedByUid: "host", createdAt: Timestamp.fromMillis(1),
      updatedAt: Timestamp.fromMillis(1)},
    "eventBookings/e1_guest": {eventId: "e1", organizerId: "org",
      uid: "guest", status: "signedUp"},
  });
}

const request = (uid: string) => ({auth: {uid, token: {}},
  data: {eventId: "e1"}}) as unknown as CallableRequest<unknown>;

test("the view is the callable's layout, geometry only", async () => {
  const fake = store();
  const db = fake.asFirestore();
  await reconcileEventSuccessLayoutView(db, "e1");
  const view = fake.get("eventSuccessLayoutViews/e1")!;
  assert.equal(validate(view), true, JSON.stringify(validate.errors));
  const callable = await getEventSuccessSpatialLayoutHandler(
    request("guest"), {firestore: () => db,
      now: () => Timestamp.fromMillis(2), randomLayoutId: () => "unused"});
  assert.deepEqual(view.layout, callable.layout);
  assert.equal(JSON.stringify(view).includes("host"), false);
});

test("a whole-group plan or no layout reads as no map; a gone plan has no " +
  "view", async () => {
  const fake = store();
  const db = fake.asFirestore();
  fake.put("eventSuccessPlans/e1", {eventId: "e1", organizerId: "org",
    layoutId: "hall", structureConfig: {unitKind: "wholeGroup"}});
  await reconcileEventSuccessLayoutView(db, "e1");
  assert.equal(fake.get("eventSuccessLayoutViews/e1")!.layout, null);
  fake.remove("eventSuccessPlans/e1");
  await reconcileEventSuccessLayoutView(db, "e1");
  assert.equal(fake.get("eventSuccessLayoutViews/e1"), undefined);
});

test("a layout edit rewrites every event that selects it", async () => {
  const fake = store();
  const db = fake.asFirestore();
  fake.put("events/e2", {organizerId: "org", status: "active"});
  fake.put("eventSuccessPlans/e2", {eventId: "e2", organizerId: "org",
    layoutId: "hall", structureConfig: {unitKind: "tables"}});
  fake.put("events/e3", {organizerId: "other", status: "active"});
  fake.put("eventSuccessPlans/e3", {eventId: "e3", organizerId: "other",
    layoutId: "hall", structureConfig: {unitKind: "tables"}});
  assert.equal(await reconcileLayoutViewsForLayout(db, "org", "hall"), 2);
  assert.equal((fake.get("eventSuccessLayoutViews/e2")!.layout as
    {label: string}).label, "Main hall");
  assert.equal(fake.get("eventSuccessLayoutViews/e3"), undefined);
});
