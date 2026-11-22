import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {harness} from "./movementTestFixtures";
import {publishRehearsalHostView, rehearsalHostViews} from "./hostView";
import type {EventRehearsalHostViewDocument} from
  "../shared/generated/firestoreAdminTypes";
import type {EventRehearsalBootstrapCallableResponse as Bootstrap} from
  "../shared/generated/eventRehearsalBootstrapCallableResponse";

async function seeded() {
  if (!admin.apps.length) admin.initializeApp({projectId: "demo-catch-rules"});
  const db = getEmulatorFirestore();
  const h = harness();
  h.session.organizerId = "host-view-" + h.id;
  const batch = db.batch();
  batch.set(db.collection("eventRehearsals").doc(h.id), h.session);
  batch.set(db.collection("organizers").doc(h.session.organizerId),
    h.authority.organizer);
  for (const actor of h.actors) {
    batch.set(db.collection("eventRehearsalActors")
      .doc(h.id + "_" + actor.actorId), actor);
  }
  await batch.commit();
  return {db, h};
}

function request<T>(data: unknown, uid = "host-1",
  token: Record<string, unknown> = {}) {
  return {data, auth: {uid, token}} as T;
}

async function storedView(db: FirebaseFirestore.Firestore, id: string) {
  const snap = await db.collection(rehearsalHostViews).doc(id).get();
  return snap.data() as EventRehearsalHostViewDocument | undefined;
}

test("every rehearsal command leaves the owner's listener view current " +
  "before it returns", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const {rotateEventRehearsalGuestLinkHandler: rotate,
    getEventRehearsalBootstrapHandler: bootstrap,
    expireEventRehearsalsHandler: expire} = await import("./handlers.js");
  const {db, h} = await seeded();
  type Rotate = Parameters<typeof rotate>[0];
  const owner = await rotate(request<Rotate>({sessionId: h.id}, "host-1",
    {internalQa: true}));
  let stored = await storedView(db, h.id);
  assert.ok(stored);
  assert.equal(stored.ownerUid, "host-1");
  assert.equal(stored.organizerId, h.session.organizerId);
  assert.equal(stored.view.guestUrl, owner.guestUrl);
  assert.equal(stored.view.canUseInternalFaults, true);
  // The owner's command answers with exactly what the listener holds.
  assert.deepEqual(stored.view, JSON.parse(JSON.stringify(owner)));
  // The callable read for the owner matches the published view.
  const read = await bootstrap(request<Rotate>({sessionId: h.id}, "host-1",
    {internalQa: true}));
  assert.deepEqual(stored.view, JSON.parse(JSON.stringify(read)));

  // Another manager's command republishes the owner's view, keeping the
  // owner's QA capability, and answers the caller with their own projection.
  const other = await rotate(request<Rotate>({sessionId: h.id}, "host-2"));
  stored = await storedView(db, h.id);
  assert.ok(stored);
  assert.equal(stored.view.guestUrl, other.guestUrl);
  assert.equal(stored.view.canUseInternalFaults, true);
  assert.equal(other.canUseInternalFaults, false);
  assert.equal(stored.view.staffReview?.actorUid, "host-1");
  assert.equal(other.staffReview?.actorUid, "host-2");

  // Expiry removes the view with the session.
  await db.collection("eventRehearsals").doc(h.id).update({
    expiresAt: Timestamp.fromMillis(1),
  });
  await expire(db, Timestamp.fromMillis(2));
  assert.equal(await storedView(db, h.id), undefined);
});

test("a publish computed from an older session version never lands", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const {db, h} = await seeded();
  const sessionRef = db.collection("eventRehearsals").doc(h.id);
  const project = async (session: {runtimeRevision: number}) =>
      ({session: {id: h.id, runtimeRevision: session.runtimeRevision}}) as
        unknown as Bootstrap;
  let nested = false;
  await publishRehearsalHostView(db, h.id, async (session, owner) => {
    if (!nested) {
      nested = true;
      // A concurrent command commits and publishes while this slower
      // projection of the older version is still being built.
      await sessionRef.update({runtimeRevision: 7,
        updatedAt: Timestamp.now()});
      await publishRehearsalHostView(db, h.id, (s) => project(s));
    }
    assert.equal(owner.uid, "host-1");
    return project(session);
  });
  const stored = await storedView(db, h.id);
  assert.equal(stored?.runtimeRevision, 7);
  assert.equal(stored?.view.session.runtimeRevision, 7);
  // The same version republishes; an older one does not.
  await sessionRef.update({updatedAt: Timestamp.now()});
  await publishRehearsalHostView(db, h.id, (s) => project(s));
  assert.equal((await storedView(db, h.id))?.runtimeRevision, 7);
});

test("the view goes away when its owner loses Host authority", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const {rotateEventRehearsalGuestLinkHandler: rotate} =
      await import("./handlers.js");
  const {db, h} = await seeded();
    type Rotate = Parameters<typeof rotate>[0];
    await rotate(request<Rotate>({sessionId: h.id}, "host-1"));
    assert.ok(await storedView(db, h.id));
    await db.collection("organizers").doc(h.session.organizerId).update({
      hostUserId: "host-2", ownerUserId: "host-2", hostUserIds: ["host-2"],
    });
    await rotate(request<Rotate>({sessionId: h.id}, "host-2"));
    assert.equal(await storedView(db, h.id), undefined);
});
