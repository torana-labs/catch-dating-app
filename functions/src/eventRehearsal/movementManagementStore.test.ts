import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import * as admin from "firebase-admin";
import {operationContentHash as hash} from "../operations/durableActions";
import {harness, departure, report, Command} from "./movementTestFixtures";
import {reassign, closeout, checkpointVisit} from
  "./movementManagementTestFixtures";

test("checkpoint management uses receipts and current authority", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const {controlEventRehearsalHandler: control,
    getEventRehearsalMovementHandler: read,
    resetEventRehearsalHandler: reset} = await import("./handlers.js");
  if (!admin.apps.length) admin.initializeApp({projectId: "demo-catch-rules"});
  const db = getEmulatorFirestore();
  const h = harness(); h.arrive(); h.arrive(1);
  // A bar-crawl checkpoint does not require the general accountability sweep.
  h.session.setup.moduleIds = h.session.setup.moduleIds.filter((m) =>
    m !== "accountability");
  h.session.organizerId = "checkpoint-management-" + h.id;
  const sessionRef = db.collection("eventRehearsals").doc(h.id);
  const orgRef = db.collection("organizers").doc(h.session.organizerId);
  const actorRef = (id: string) => db.collection("eventRehearsalActors")
    .doc(h.id + "_" + id);
  const batch = db.batch();
  batch.set(sessionRef, h.session); batch.set(orgRef, h.authority.organizer);
  for (const actor of h.actors) batch.set(actorRef(actor.actorId), actor);
  await batch.commit();
  const request = (data: unknown, uid = "host-1") =>
    ({data, auth: {uid, token: {}}}) as Parameters<typeof control>[0];
  const scope = {sessionId: h.id, expectedSetupRevision: 0,
    scope: {groupId: "event:whole"}};
  let current = await read(request(scope));
  const input = (movement: Command) => ({sessionId: h.id,
    expectedSetupRevision: current.setupRevision,
    expectedRevision: current.runtimeRevision, clientActionId: randomUUID(),
    action: "movement", movement});
  current = (await control(request(input(departure(current,
    h.actors.map((a) => a.actorId), true))))).movementReview!;
  const original = current.selected!.departure;
  const assignment = input(reassign(current));
  const assigned = await Promise.all([control(request(assignment)),
    control(request(assignment))]);
  assert.ok(assigned.every((r) => r.session.actionCount === 2));
  current = assigned[0].movementReview!;
  assert.equal(current.checkpoint?.assignment?.revision, 1);
  assert.equal(current.checkpoint?.request?.dueAt,
    original.checkpointRequest!.dueAt);
  const partial = await control(request(input(report(current,
    [h.actors[0].actorId]))));
  current = partial.movementReview!;
  const row = current.checkpoint!.accountabilityReviews!.find((r) =>
    r.attendeeId === h.actors[1].actorId)!;
  const visit = input(checkpointVisit(current, row.attendeeId));
  const resolved = await Promise.all([control(request(visit)),
    control(request(visit))]);
  assert.ok(resolved.every((r) => r.session.actionCount === 4));
  current = resolved[0].movementReview!;
  assert.equal(current.checkpoint!.accountabilityReviews![1].revision, 1);
  const actorBefore = hash(JSON.parse(JSON.stringify(
    (await actorRef(row.attendeeId).get()).data())));
  const close = input(closeout(current));
  const closed = await Promise.all([control(request(close)),
    control(request(close))]);
  current = closed[0].movementReview!;
  assert.equal(current.checkpoint?.request?.state, "closedOut");
  assert.ok(closed.every((r) => r.session.actionCount === 5));
  assert.deepEqual(current.selected?.departure, original);
  assert.equal(current.checkpoint?.report?.accountedFor.length, 1);
  assert.equal(hash(JSON.parse(JSON.stringify(
    (await actorRef(row.attendeeId).get()).data()))), actorBefore);
  const reopen = input(closeout(current, "reopen"));
  current = (await control(request(reopen))).movementReview!;
  const visitReplay = await control(request(visit));
  assert.equal(visitReplay.session.actionCount, 6);
  assert.equal(visitReplay.movementReview!.checkpoint!.request!.state,
    "discrepancy");
  const replay = await control(request(close));
  assert.equal(replay.session.actionCount, 6);
  assert.equal(replay.movementReview?.checkpoint?.closeout?.revision, 2);
  assert.equal(replay.movementReview?.checkpoint?.request?.state,
    "discrepancy");
  assert.equal((await control(request(assignment))).session.actionCount, 6);
  await assert.rejects(control(request({...close,
    movement: closeout(current, "reopen")})), {code: "aborted"});
  await assert.rejects(control(request(input(reassign(current, "outsider")))),
    {code: "permission-denied"});
  // Revocation removes every canonical management source, including ownership.
  await orgRef.update({hostUserId: "host-2", ownerUserId: "host-2",
    hostUserIds: ["host-2"], hostProfiles: []});
  await assert.rejects(control(request(close)), {code: "permission-denied"});
  current = await read(request(scope, "host-2"));
  await control(request(input(reassign(current, "host-2")), "host-2"));
  await reset(request({sessionId: h.id, fork: false, seed: null}, "host-2"));
  assert.equal((await db.collection("eventRehearsalMovements")
    .where("sessionId", "==", h.id).get()).empty, true);
  await assert.rejects(control(request(reopen, "host-2")), {code: "aborted"});
});
