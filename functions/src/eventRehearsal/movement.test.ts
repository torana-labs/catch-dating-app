import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import {harness, departure, report, changeRoute} from
  "./movementTestFixtures";
import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync, writeFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import * as admin from "firebase-admin";
import {validateControlEventRehearsalCallablePayload} from
  "../shared/generated/validators/controlEventRehearsalInput";
import type {ControlEventRehearsalCallablePayload as Control} from
  "../shared/generated/controlEventRehearsalCallablePayload";
import {operationContentHash as hash} from "../operations/durableActions";
import {buildRehearsalActors, applyRehearsalBehavior} from "./engine";
import {rehearsalMovements, MovementScope, practiceMovementId} from
  "./movementRecords";
import {rehearsalRouteDecisions} from "./routeDecisions";
import {practiceMovementSource} from "./movementSource";

type Command = NonNullable<Control["movement"]>;
test("candidates and schedules cannot confirm movement", async () => {
  const h = harness();
  let r = await h.read();
  assert.equal(r.progress.guidance, null);
  assert.equal(r.progress.revision, 0);
  assert.equal(r.roster.members.length, 0);
  assert.ok(r.roster.unavailable.every((a) => a.reason === "notCheckedIn"));
  h.arrive(); r = await h.read();
  assert.equal(r.roster.members.length, 1);
  assert.equal(r.history.length, 0);
  assert.equal(r.progress.guidance, null);
  const before = structuredClone(h.actors);
  await h.execute(departure(r, [h.actors[0].actorId], true));
  r = await h.read();
  assert.equal(r.progress.guidance?.destination.kind, "itineraryStop");
  assert.equal(r.checkpoint?.availability.kind, "ready");
  assert.equal(r.checkpoint?.request?.state, "awaitingReport");
  assert.equal(r.checkpoint?.report, null);
  assert.deepEqual(structuredClone(h.actors), before);
});

test("route decisions advance guidance without inventing a departure",
  async () => {
    const h = harness(); h.arrive();
    let review = await h.read();
    await assert.rejects(h.execute(changeRoute(review)),
      /Confirm group departure/u);
    await h.execute(departure(review, [h.actors[0].actorId]));
    review = await h.read();
    const original = review.progress.current!;
    const stale = changeRoute(review, 0, "stale-route");
    await h.execute(changeRoute(review, 0, "route-two"));
    review = await h.read();
    assert.equal(review.progress.revision, 2);
    assert.equal(review.progress.current?.progressRevision, 1);
    assert.equal(review.progress.routeDecision?.departureRevision, 1);
    assert.equal(review.progress.routeDecision?.decisionId, "route-two");
    assert.deepEqual(review.progress.current, original);
    assert.deepEqual(review.progress.guidance?.destination,
      review.progress.routeDecision?.destination);
    assert.equal(h.fake.entries().filter(([path]) =>
      path.startsWith(rehearsalMovements + "/")).length, 1);
    assert.equal(h.fake.entries().filter(([path]) =>
      path.startsWith(rehearsalRouteDecisions + "/")).length, 1);
    await assert.rejects(h.execute(stale), {code: "aborted"});
    await h.execute(departure(review, [h.actors[0].actorId]));
    review = await h.read();
    assert.equal(review.progress.revision, 3);
    assert.equal(review.progress.current?.progressRevision, 3);
    assert.equal(review.progress.routeDecision, null);
    assert.equal(review.history.length, 2);
  });

test("omitted and empty rosters remain distinct", async () => {
  const h = harness();
  await h.execute(departure(await h.read()));
  let r = await h.read();
  assert.equal(r.history[0].rosterSize, null);
  assert.deepEqual(r.checkpoint?.availability,
    {kind: "unavailable", reason: "rosterNotRecorded"});
  await assert.rejects(h.execute(report(r, [])), {code: "failed-precondition"});
  await h.execute(departure(r, [], true));
  r = await h.read();
  assert.equal(r.history[0].rosterSize, 0);
  assert.equal(r.checkpoint?.request?.state, "awaitingReport");
  await h.execute(report(r, []));
  r = await h.read();
  assert.equal(r.checkpoint?.request?.state, "complete");
});

test("departure binds visits and fences a changed roster", async () => {
  const h = harness(); h.arrive();
  const r = await h.read();
  const command = departure(r, [h.actors[0].actorId]);
  h.leave();
  await assert.rejects(h.execute(command), {code: "aborted"});
  assert.equal(h.fake.entries().length, 0);
  await assert.rejects(h.execute(departure(await h.read(),
    [h.actors[1].actorId])), {code: "failed-precondition"});
  h.arrive();
  await h.execute(departure(await h.read(), [h.actors[0].actorId]));
  const saved = (await h.read()).checkpoint!.departure;
  h.leave(); h.arrive();
  const current = await h.read();
  assert.equal(current.checkpoint?.availability.kind, "ready");
  if (current.checkpoint?.availability.kind === "ready") {
    assert.deepEqual(current.checkpoint.availability.members[0].visit,
      {kind: "unavailable", reason: "visitChanged"});
  }
  assert.deepEqual(current.checkpoint!.departure, saved);
  await assert.rejects(h.execute(report(current, [h.actors[0].actorId])),
    {code: "failed-precondition"});
});

test("pace-group departure requires accepted membership and an actual route",
  async () => {
    const h = harness(); h.group(); h.arrive();
    let r = await h.read({groupId: "easy"});
    assert.equal(r.roster.members.length, 0);
    assert.equal(r.roster.unavailable[0].reason, "membershipUnavailable");
    h.place(); r = await h.read({groupId: "easy"});
    assert.equal(r.roster.members.length, 1);
    assert.ok(r.roster.members[0].membershipHash);
    await h.execute(departure(r, [h.actors[0].actorId]));
    assert.equal((await h.read()).progress.revision, 0);
    assert.equal((await h.read({groupId: "easy"})).progress.revision, 1);
    delete h.session.setup.movementSimulation!.routePlan!.path;
    r = await h.read({groupId: "easy"});
    assert.equal(r.progress.destinations.length, 0);
    assert.equal(r.progress.guidance, null);
    assert.deepEqual(r.checkpoint?.availability,
      {kind: "unavailable", reason: "setupChanged"});
  });

test("corrections preserve the roster after completion",
  async () => {
    const h = harness(); h.arrive(); h.arrive(1);
    const ids = h.actors.map((a) => a.actorId);
    await h.execute(departure(await h.read(), ids, true));
    await h.execute(report(await h.read(), [ids[0]]));
    h.leave(); h.arrive(); h.session.status = "complete";
    let r = await h.read();
    await h.execute(report(r, ids));
    r = await h.read();
    assert.equal(r.checkpoint?.request?.state, "complete");
    await assert.rejects(h.execute(report(r, [ids[1]])),
      /Explain why/u);
    await h.execute(report(r, [ids[1]], "Earlier observation was mistaken."));
    r = await h.read();
    assert.equal(r.checkpoint?.request?.state, "discrepancy");
    assert.equal(r.checkpoint?.departure.roster?.members.length, 2);
    assert.equal(r.progress.guidance, null);
    await assert.rejects(h.execute(departure(r, [])), /Start the event/u);
  });

test("old departures remain reportable and history pages have no omissions",
  async () => {
    const h = harness(); h.arrive();
    for (let i = 0; i < 27; i++) {
      await h.execute(departure(await h.read(), [h.actors[0].actorId]));
    }
    const first = await h.read();
    assert.equal(first.history.length, 25);
    assert.equal(first.nextBeforeRevision, 3);
    const second = await h.read({groupId: "event:whole", beforeRevision: 3,
      progressRevision: 1});
    assert.deepEqual(second.history.map((d) => d.progressRevision), [2, 1]);
    assert.equal(second.nextBeforeRevision, null);
    assert.equal(second.progress.revision, 27);
    assert.equal(second.checkpoint?.progressRevision, 1);
    await h.execute(report(second, [h.actors[0].actorId]));
    assert.equal((await h.read()).checkpoint?.revision, 0);
    assert.equal((await h.read({groupId: "event:whole", progressRevision: 1}))
      .checkpoint?.revision, 1);
  });

test("authority, capacity and failed commits withhold changes",
  async () => {
    const h = harness(); h.arrive();
    const command = departure(await h.read(), [h.actors[0].actorId], true);
    h.fake.failNextCommit = true;
    await assert.rejects(h.execute(command), /transaction interruption/u);
    assert.equal(h.fake.entries().length, 0);
    h.session.actionCount = 500;
    await assert.rejects(h.execute(command), {code: "failed-precondition"});
    h.session.actionCount = 0; h.actors.pop();
    await assert.rejects(h.read(), /roster changed/u);
    h.authority.actorUid = "stranger";
    await assert.rejects(h.read(), {code: "permission-denied"});
  });

test("group commands need generation and no actor target", () => {
  const command = {kind: "confirmDeparture", expectedSourceHash: "a".repeat(64),
    payload: {groupId: "event:whole", expectedProgressRevision: 0,
      destination: {kind: "fixedPlace", placeId: "meeting",
        lateEntry: "allowed"}}};
  const input = {sessionId: "practice", expectedRevision: 1,
    expectedSetupRevision: 0, clientActionId: "movement-once",
    action: "movement", movement: command};
  assert.equal(validateControlEventRehearsalCallablePayload(input), true);
  for (const patch of [{expectedSetupRevision: undefined}, {assistance: {}},
    {minutes: 1}, {movement: {...command, actorId: "actor-1"}},
    {action: "assistance"}, {action: "advanceClock"}]) {
    assert.equal(validateControlEventRehearsalCallablePayload({...input,
      ...patch}), false);
  }
});

test("departure and observation cover every roster size from 2 through 50",
  async () => {
    for (let count = 2; count <= 50; count++) {
      const h = harness();
      h.session.actorCount = count;
      h.actors.splice(0, h.actors.length, ...buildRehearsalActors(h.id,
        count, 1, h.session.virtualNow));
      for (let i = 0; i < count; i++) h.arrive(i);
      const r = await h.read();
      assert.equal(r.roster.members.length, count);
      await h.execute(departure(r, h.actors.map((a) => a.actorId)));
      await h.execute(report(await h.read(), h.actors.map((a) => a.actorId)));
      const c = (await h.read()).checkpoint!;
      assert.equal(c.report?.accountedFor.length, count);
      assert.equal(c.departure.roster?.members.length, count);
    }
  });

test("overdue requests retain missing guests and expose revoked ownership",
  async () => {
    const h = harness(); h.arrive();
    let r = await h.read();
    const cmd = departure(r, [h.actors[0].actorId], true);
    assert.equal(cmd.kind, "confirmDeparture");
    if (cmd.kind !== "confirmDeparture") throw new Error("Unexpected command");
    const wrongOwner = {...cmd, payload: {...cmd.payload,
      checkpointRequest: {responsibleOperatorId: "stranger",
        dueAt: r.serverTime + 60000}}};
    await assert.rejects(h.execute(wrongOwner), {code: "permission-denied"});
    await h.execute(cmd);
    h.session.virtualNow = admin.firestore.Timestamp.fromMillis(
      r.serverTime + 60001);
    h.authority.organizer.hostUserIds = ["host-1"];
    r = await h.read();
    assert.equal(r.checkpoint?.request?.state, "overdue");
    assert.equal(r.checkpoint?.request?.ownerAvailability, "needsReassignment");
    assert.equal(r.checkpoint?.departure.roster?.members.length, 1);
    assert.equal(r.checkpoint?.report, null);
    assert.equal(h.actors[0].status, "present");
  });

test("Firestore movement uses parent receipts, current authority and reset", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const {controlEventRehearsalHandler: control,
    getEventRehearsalMovementHandler: read,
    resetEventRehearsalHandler: reset} = await import("./handlers.js");
  if (!admin.apps.length) admin.initializeApp({projectId: "demo-catch-rules"});
  const db = getEmulatorFirestore();
  const h = harness(); h.arrive(); h.arrive(1);
  h.session.organizerId = "movement-" + h.id;
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
  const scope = {sessionId: h.id, expectedSetupRevision: 0,
    scope: {groupId: "event:whole"}};
  let current = await read(request(scope));
  const input = (movement: Command) => ({sessionId: h.id,
    expectedSetupRevision: current.setupRevision,
    expectedRevision: current.runtimeRevision, clientActionId: randomUUID(),
    action: "movement", movement});
  const ids = h.actors.map((a) => a.actorId);
  const confirmation = input(departure(current, ids, true));
  const results = await Promise.all([control(request(confirmation)),
    control(request(confirmation))]);
  assert.ok(results.every((r) => r.movementReview?.progress.revision === 1));
  assert.ok(results.every((r) => r.session.actionCount === 1));
  assert.ok(results.every((r) => r.actions[0].actorId === null));
  current = results[0].movementReview!;
  const first = input(report(current, [ids[0]]));
  current = (await control(request(first))).movementReview!;
  const correction = input(report(current, ids));
  current = (await control(request(correction, "host-2"))).movementReview!;
  const replay = await control(request(first));
  assert.equal(replay.movementReview?.checkpoint?.revision, 2);
  assert.equal(replay.movementReview?.checkpoint?.report?.accountedFor
    .length, 2);
  assert.equal(replay.session.actionCount, 3);
  await assert.rejects(control(request({...first,
    movement: report(current, [])})), {code: "aborted"});
  const records = await db.collection(rehearsalMovements)
    .where("sessionId", "==", h.id).get();
  assert.equal(records.size, 1);
  assert.equal(records.docs[0].get("report.rosterHash"),
    hash(records.docs[0].get("departure")));
  const historyBatch = db.batch();
  const original = records.docs[0].data();
  const source = practiceMovementSource(h.id, h.session, "event:whole");
  for (let revision = 2; revision <= 27; revision++) {
    historyBatch.set(db.collection(rehearsalMovements).doc(
      practiceMovementId(source, revision)), {...original,
      progressRevision: revision, report: null,
      departure: {...original.departure, operationId: "history-" + revision}});
  }
  historyBatch.update(sessionRef, {actionCount: 29, runtimeRevision: 30});
  await historyBatch.commit();
  const page = await read(request(scope));
  assert.equal(page.history.length, 25);
  assert.equal(page.nextBeforeRevision, 3);
  current = page;
  const routeInput = input(changeRoute(current, 0, "route-recovery"));
  const routeResults = await Promise.all([control(request(routeInput)),
    control(request(routeInput))]);
  assert.ok(routeResults.every((result) =>
    result.movementReview?.progress.revision === 28));
  assert.ok(routeResults.every((result) =>
    result.movementReview?.progress.current?.progressRevision === 27));
  assert.ok(routeResults.every((result) =>
    result.movementReview?.progress.routeDecision?.decisionId ===
      "route-recovery"));
  assert.ok(routeResults.every((result) => result.session.actionCount === 30));
  assert.equal((await db.collection(rehearsalRouteDecisions)
    .where("sessionId", "==", h.id).get()).size, 1);
  const last = await read(request({...scope,
    scope: {...scope.scope, beforeRevision: 3, progressRevision: 1}}));
  assert.deepEqual(last.history.map((d) => d.progressRevision), [2, 1]);
  assert.equal(last.nextBeforeRevision, null);
  assert.equal(last.checkpoint?.revision, 2);
  await orgRef.update({hostUserIds: ["host-1"]});
  await assert.rejects(control(request(correction, "host-2")),
    {code: "permission-denied"});
  await assert.rejects(read(request(scope, "host-2")),
    {code: "permission-denied"});
  await reset(request({sessionId: h.id, fork: false, seed: null}));
  assert.equal((await db.collection(rehearsalMovements)
    .where("sessionId", "==", h.id).get()).empty, true);
  assert.equal((await db.collection(rehearsalRouteDecisions)
    .where("sessionId", "==", h.id).get()).empty, true);
  await assert.rejects(control(request(confirmation)), {code: "aborted"});
  await assert.rejects(read(request(scope)), {code: "aborted"});
  const resetSession = (await sessionRef.get()).data()!;
  const full = buildRehearsalActors(h.id, 50, 1, resetSession.virtualNow)
    .map((a) => applyRehearsalBehavior(a, "arrive", [],
      resetSession.virtualNow));
  const fullBatch = db.batch();
  fullBatch.update(sessionRef, {actorCount: 50, status: "running"});
  for (const actor of full) {
    fullBatch.set(db.collection("eventRehearsalActors")
      .doc(h.id + "_" + actor.actorId), actor);
  }
  await fullBatch.commit();
  current = await read(request({...scope, expectedSetupRevision:
    resetSession.setupRevision}));
  const fullDeparture = input(departure(current, full.map((a) => a.actorId)));
  const extra = db.collection("eventRehearsalActors").doc(h.id + "_extra");
  await extra.set({...full[0], actorId: "actor-99"});
  await assert.rejects(control(request(fullDeparture)),
    {code: "resource-exhausted"});
  assert.equal((await sessionRef.get()).get("actionCount"), 0);
  await extra.delete();
  current = (await control(request(fullDeparture))).movementReview!;
  assert.equal(current.checkpoint?.departure.roster?.members.length, 50);
  current = (await control(request(input(report(current,
    full.map((a) => a.actorId)))))).movementReview!;
  assert.equal(current.checkpoint?.report?.accountedFor.length, 50);
  await sessionRef.update({expiresAt: admin.firestore.Timestamp.fromMillis(0)});
  await assert.rejects(read(request({...scope, expectedSetupRevision:
    resetSession.setupRevision})), {code: "not-found"});
});


test("native movement fixtures retain selected departures and real source " +
  "identities", async () => {
  let h = harness(0, "session-1");
  h.session.virtualNow = admin.firestore.Timestamp.fromMillis(1000);
  const samples: Record<string, unknown> = {};
  const sample = async (name: string, scope?: MovementScope) => {
    const review = await h.read(scope);
    samples[name] = JSON.parse(JSON.stringify({review, session: {
      id: h.id, ...h.session,
      virtualStartedAtMillis: h.session.virtualStartedAt.toMillis(),
      virtualNowMillis: h.session.virtualNow.toMillis(),
      expiresAtMillis: h.session.expiresAt.toMillis(),
    }, actors: h.actors}));
    return review;
  };
  await sample("initial");
  h.arrive(); h.arrive(1);
  const ready = await sample("ready");
  await h.execute(departure(ready, h.actors.map((a) => a.actorId), true),
    "departure_0001");
  let r = await sample("departed");
  await h.execute(changeRoute(r, 0, "route-choice-0001"),
    "route_action_0001");
  r = await sample("rerouted");
  await h.execute(report(r, [h.actors[0].actorId]), "report_0001");
  await sample("partial");
  h.leave(); h.arrive();
  r = await sample("reentered");
  await h.execute(report(r, h.actors.map((a) => a.actorId)), "report_0002");
  await sample("reported");
  await h.execute(departure(await h.read()), "departure_0002");
  await sample("omitted");
  await h.execute(departure(await h.read(), [], true), "departure_0003");
  await sample("empty");
  const fixed = departure(await h.read());
  if (fixed.kind !== "confirmDeparture") throw new Error("Expected departure");
  fixed.payload.destination = {kind: "fixedPlace", placeId: "meeting",
    lateEntry: "allowed"};
  await h.execute(fixed, "departure_0004");
  await sample("fixed");
  await h.execute(departure(await h.read(), []), "departure_0005");
  r = await sample("oldFixed", {groupId: "event:whole", progressRevision: 5});
  assert.equal(r.selected?.departure.destination.kind, "fixedPlace");
  assert.equal(r.selected?.progressRevision, 5);
  assert.equal(r.progress.revision, 6);
  assert.equal(r.checkpoint, null);
  h.session.status = "complete";
  await sample("complete", {groupId: "event:whole", progressRevision: 1});
  h.session.status = "running";
  h.group(); h.place();
  r = await sample("groupReady", {groupId: "easy"});
  await h.execute(departure(r, [h.actors[0].actorId], true),
    "group_departure_1");
  await sample("groupDeparted", {groupId: "easy"});
  // The shared Host sheet defaults to a self-owned report in 30 minutes.
  h = harness(0, "session-1");
  h.session.virtualNow = admin.firestore.Timestamp.fromMillis(1000);
  h.arrive(); h.arrive(1);
  const uiDeparture = departure(await h.read(),
    h.actors.map((a) => a.actorId), true);
  if (uiDeparture.kind !== "confirmDeparture") {
    throw new Error("Expected departure");
  }
  uiDeparture.payload.checkpointRequest = {responsibleOperatorId: "host-1",
    dueAt: h.session.virtualNow.toMillis() + 1800000};
  await h.execute(uiDeparture, "departure_ui_0001");
  await sample("uiDeparted");
  const path = "../test/event_rehearsal/fixtures/movement_reviews.json";
  // Update only deliberately, then both runtimes validate this shared fixture.
  if (process.env.UPDATE_REHEARSAL_MOVEMENT_FIXTURE === "1") {
    writeFileSync(path, JSON.stringify(samples, null, 2) + "\n");
  }
  assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), samples);
});
