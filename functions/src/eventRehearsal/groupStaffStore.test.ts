import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import * as admin from "firebase-admin";
import {harness, departure, report} from "./movementTestFixtures";
import {pacer} from "./groupStaffTestFixtures";
import type {EventRehearsalBootstrapCallableResponse as Bootstrap} from
  "../shared/generated/eventRehearsalBootstrapCallableResponse";

test("practice staff controls retain receipts, current Host " +
  "authority and isolation", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const {controlEventRehearsalHandler: control,
    getEventRehearsalBootstrapHandler: bootstrap,
    getEventRehearsalMovementHandler: movement,
    resetEventRehearsalHandler: reset,
    updateEventRehearsalSetupHandler: setup} = await import("./handlers.js");
  if (!admin.apps.length) admin.initializeApp({projectId: "demo-catch-rules"});
  const db = getEmulatorFirestore(); const h = harness();
  h.session.organizerId = "practice-staff-" + h.id;
  h.session.organizerId = h.session.organizerId;
  h.group(); h.arrive(); h.arrive(1); h.place(); h.place(1);
  const sessionRef = db.collection("eventRehearsals").doc(h.id);
  const orgRef = db.collection("organizers").doc(h.session.organizerId);
  const batch = db.batch();
  batch.set(sessionRef, h.session); batch.set(orgRef, h.authority.organizer);
  for (const actor of h.actors) {
    batch.set(db.collection("eventRehearsalActors")
      .doc(h.id + "_" + actor.actorId), actor);
  }
  await batch.commit();
  const request = (data: unknown, uid = "host-1") =>
    ({data, auth: {uid, token: {}}}) as Parameters<typeof control>[0];
  const read = () => bootstrap(request({sessionId: h.id}));
  let current: Bootstrap = await read();
  const input = (fields: Record<string, unknown>) => ({sessionId: h.id,
    expectedSetupRevision: current.session.setupRevision,
    expectedRevision: current.session.runtimeRevision,
    clientActionId: randomUUID(), ...fields});
  const staff = () => ({operatorId: pacer, displayName: "Practice pacer",
    groupId: "easy", expectedRevision: current.staffReview!.revision,
    expectedSourceHash: current.staffReview!.sourceHash,
    decision: {kind: "assign", duty: "pacer",
      expiresAtMillis: current.session.virtualNowMillis + 3600000}});
  const assign = input({action: "staff", staff: staff()});
  const results = await Promise.all([control(request(assign)),
    control(request(assign))]);
  assert.ok(results.every((r) => r.session.actionCount === 1));
  current = results[0];
  assert.equal(current.staffReview!.operators.length, 1);
  assert.equal((await db.collection("eventStaffGrants")
    .where("organizerId", "==", h.session.organizerId).get()).empty, true);
  await assert.rejects(bootstrap(request({sessionId: h.id}, pacer)),
    {code: "permission-denied"});
  const roleScope = {sessionId: h.id, expectedSetupRevision: 0,
    scope: {groupId: "easy"}, practiceOperatorId: pacer};
  let review = await movement(request(roleScope));
  const leave = departure(review, h.actors.map((a) => a.actorId), true);
  if (leave.kind !== "confirmDeparture") throw new Error("Expected departure");
  leave.payload.checkpointRequest!.responsibleOperatorId = pacer;
  const depart = input({action: "movement", movement: leave,
    practiceOperatorId: pacer});
  current = await control(request(depart));
  assert.equal(current.movementReview!.selected!.departure.confirmedBy, pacer);
  assert.equal(current.staffReview!.actorUid, pacer);
  assert.equal(current.staffReview!.hostUid, "host-1");
  review = current.movementReview!;
  const reportInput = input({action: "movement",
    movement: report(review, [h.actors[0].actorId]),
    practiceOperatorId: pacer});
  const reportResults = await Promise.all([control(request(reportInput)),
    control(request(reportInput))]);
  assert.ok(reportResults.every((r) => r.session.actionCount === 3));
  assert.equal(reportResults[0].movementReview!.checkpoint!.report!.reportedBy,
    pacer);
  current = await read();
  const remove = input({action: "staff", staff: {...staff(),
    decision: {kind: "remove"}}});
  current = await control(request(remove));
  assert.equal(current.staffReview!.operators[0].duties.length, 0);
  await assert.rejects(movement(request(roleScope)),
    {code: "permission-denied"});
  await assert.rejects(control(request(reportInput)),
    {code: "permission-denied"});
  const oldAssign = await control(request(assign));
  assert.equal(oldAssign.staffReview!.operators[0].duties.length, 0);
  assert.equal(oldAssign.session.actionCount, 4);
  await assert.rejects(control(request({...remove, staff: {...staff(),
    displayName: "Changed retry"}})), {code: "aborted"});
  // A revoked manager cannot enter even a synthetic role or replay a receipt.
  await orgRef.update({hostUserId: "host-2", ownerUserId: "host-2",
    hostUserIds: ["host-2"], hostProfiles: []});
  await assert.rejects(control(request(assign)), {code: "permission-denied"});
  await reset(request({sessionId: h.id, fork: false, seed: null}, "host-2"));
  assert.equal((await sessionRef.get()).get("staff"), undefined);
  await assert.rejects(control(request(assign, "host-2")), {code: "aborted"});
  current = await bootstrap(request({sessionId: h.id}, "host-2"));
  current = await control(request(input({action: "staff", staff: staff()}),
    "host-2"));
  assert.equal(current.staffReview!.operators.length, 1);
  await setup(request({sessionId: h.id,
    expectedRevision: current.session.setupRevision,
    scenarioId: current.session.scenarioId, actorCount: h.session.actorCount,
    setup: h.session.setup}, "host-2"));
  assert.equal((await sessionRef.get()).get("staff"), undefined);
});
