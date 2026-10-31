import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {randomUUID, createHash} from "node:crypto";
import * as admin from "firebase-admin";
import type {OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import {validateControlEventRehearsalCallablePayload} from
  "../shared/generated/validators/controlEventRehearsalInput";
import {validateEventRehearsalBootstrapCallableResponse} from
  "../shared/generated/validators/eventRehearsalBootstrapOutput";
import type {Decision} from
  "../eventSuccess/operations/membershipDecisions";
import {practiceMembershipView as view, practiceMembershipProjection,
  transferPracticeMembership as transfer} from "./membership";
import {practiceSession} from "./assistanceTestFixtures";
import {buildRehearsalActors, applyRehearsalBehavior as behavior,
  applyRehearsalSpatialAction} from "./engine";

function organizer(): OrganizerDocument {
  const fixture = JSON.parse(readFileSync(
    "../contracts/fixtures/valid/organizer_doc.json", "utf8"));
  const schema = JSON.parse(readFileSync(
    "../contracts/firestore/organizers.schema.json", "utf8"));
  return {...Object.fromEntries(Object.entries(fixture).filter(([k]) =>
    k in schema.properties)), followerCount: 0, organizerPhotos: [],
  organizerType: "community", hostUserIds: ["host-1", "host-2"]} as
    unknown as OrganizerDocument;
}
function harness(now = 1_000_000, id = "practice-membership") {
  const session = practiceSession(now);
  session.setup.movementSimulation = {itinerary: [], livePositions: [],
    lateArrivalGuidance: null, routePlan: {version: 2, movementMode: "run",
      routeShape: "loop", groupStrategy: "paceGroups",
      stopCadence: "hostedStops", stopKinds: ["regroup"],
      roleKinds: ["pacer", "sweep"],
      paceGroups: ["easy", "fast"].map((id, sortOrder) =>
        ({id, label: id, sortOrder}))}};
  const actors = buildRehearsalActors(id, 2, 1, session.virtualNow);
  const authority = {actorUid: "host-1", organizer: organizer()};
  return {session, actors, authority};
}
function command(row: ReturnType<typeof view>, decision: Decision) {
  return {kind: "transferGroup" as const, actorId: row.attendeeId,
    expectedSourceHash: row.sourceHash, payload: {attendeeId: row.attendeeId,
      episodeId: row.episodeId!, expectedMembershipRevision: row.revision,
      expectedParticipationRevision: row.participationRevision, decision}};
}
function move(h: ReturnType<typeof harness>, actor = h.actors[0],
  decision: Decision = {kind: "place", groupId: "easy"}, uid = "host-1") {
  const authority = {...h.authority, actorUid: uid};
  return transfer(h.session, actor, command(view(h.session, actor, authority),
    decision), authority, randomUUID());
}
function propose(h: ReturnType<typeof harness>, actor = move(h)) {
  return move(h, actor, {kind: "propose", from: "easy", to: "fast",
    receivingOperatorId: "host-2",
    expiresAtMillis: h.session.virtualNow.toMillis() + 10000});
}

test("explicit placement covers every actor across 2–50 guests", () => {
  const h = harness();
  for (let count = 2; count <= 50; count++) {
    const actors = buildRehearsalActors("coverage", count, 1,
      h.session.virtualNow);
    const review = practiceMembershipProjection("coverage",
      {...h.session, actorCount: count}, actors, h.authority);
    assert.equal(review.rows.length, count);
    assert.ok(review.rows.every((r) => r.accepted === null && r.ready));
  }
  const actor = move(h);
  assert.equal(actor.status, "expected");
  assert.equal(actor.visit?.checkedInAtMillis, null);
  assert.equal(view(h.session, actor, h.authority).accepted?.groupId, "easy");
  assert.equal(actor.layoutUnitId, h.actors[0].layoutUnitId);
  assert.equal(h.actors[0].groupMembership, undefined);
});

test("only the named Host can accept the proposed handover", () => {
  const h = harness();
  const proposed = propose(h);
  const decision = {kind: "accept" as const,
    transferId: proposed.groupMembership!.transfer!.transferId};
  assert.equal(proposed.groupMembership?.accepted?.groupId, "easy");
  assert.throws(() => move(h, proposed, decision), {code: "permission-denied"});
  const accepted = move(h, proposed, decision, "host-2");
  assert.equal(accepted.groupMembership?.accepted?.groupId, "fast");
  assert.equal(accepted.groupMembership?.revision, 3);
  assert.equal(accepted.groupMembership?.transfer?.status, "accepted");
  assert.equal(accepted.status, proposed.status);
});

test("rejection, cancellation and timeout keep the accepted group", () => {
  const h = harness();
  const actor = propose(h);
  const transferId = actor.groupMembership!.transfer!.transferId;
  for (const kind of ["reject", "cancel"] as const) {
    const next = move(h, actor, {kind, transferId},
      kind === "reject" ? "host-2" : "host-1");
    assert.equal(next.groupMembership?.accepted?.groupId, "easy");
    assert.equal(next.groupMembership?.transfer?.status,
      kind === "reject" ? "rejected" : "cancelled");
  }
  h.session.virtualNow = admin.firestore.Timestamp.fromMillis(1_010_000);
  assert.equal(view(h.session, actor, h.authority).transferState, "expired");
  assert.throws(() => move(h, actor, {kind: "accept", transferId}, "host-2"),
    {code: "permission-denied"});
  assert.equal(move(h, actor, {kind: "leave"}).groupMembership?.accepted, null);
});

test("membership removal cancels handovers and preserves attendance", () => {
  const h = harness();
  const actor = propose(h);
  const left = move(h, actor, {kind: "leave"});
  assert.equal(left.groupMembership?.accepted, null);
  assert.equal(left.groupMembership?.transfer?.status, "cancelled");
  assert.deepEqual(left.visit, actor.visit);
  assert.deepEqual(left.participation, actor.participation);
});

test("first arrival preserves membership; same-time re-entry changes episode",
  () => {
    const h = harness();
    const actor = propose(h);
    const row = view(h.session, actor, h.authority);
    let current = behavior(actor, "arrive", [], h.session.virtualNow);
    assert.equal(view(h.session, current, h.authority).episodeId,
      row.episodeId);
    assert.deepEqual(current.participation, actor.participation);
    const behaviors = ["disconnect", "reconnect", "optOut", "optIn"] as const;
    for (const kind of behaviors) {
      current = behavior(current, kind, [], h.session.virtualNow);
      assert.deepEqual(current.participation, actor.participation);
      assert.equal(view(h.session, current, h.authority).freshness, "current");
    }
    current = applyRehearsalSpatialAction(current, "reassign", "table-2",
      "pinned", 2, h.session.virtualNow);
    assert.equal(current.groupMembership?.accepted?.groupId, "easy");
    current = behavior(current, "leaveEarly", [], h.session.virtualNow);
    assert.equal(view(h.session, current, h.authority).ready, false);
    current = behavior(current, "return", [], h.session.virtualNow);
    const next = view(h.session, current, h.authority);
    assert.notEqual(next.episodeId, row.episodeId);
    assert.equal(next.freshness, "sourceChanged");
    assert.equal(next.transferState, "sourceChanged");
    assert.throws(() => transfer(h.session, current, command(row,
      {kind: "leave"}), h.authority, "old-request"), {code: "aborted"});
    assert.equal(move(h, current).groupMembership?.transfer, null);
  });

test("pending, legacy and non-group availability remain explicit",
  () => {
    const h = harness();
    const walkIn = behavior(h.actors[0], "walkIn", [], h.session.virtualNow);
    assert.equal(view(h.session, walkIn, h.authority).ready, false);
    const resolved = behavior(walkIn, "resolveClaim", [], h.session.virtualNow);
    assert.equal(view(h.session, resolved, h.authority).ready, true);
    const {participation: _participation, ...legacy} = h.actors[0];
    assert.ok(_participation);
    assert.equal(view(h.session, legacy, h.authority).availability,
      "participationNotRecorded");
    assert.deepEqual(view(h.session, legacy, h.authority).actions, []);
    assert.equal(behavior(legacy, "arrive", [],
      h.session.virtualNow).participation, undefined);
    h.session.setup.movementSimulation = undefined;
    assert.equal(view(h.session, h.actors[0], h.authority).availability,
      "notApplicable");
  });

test("current authority, source, revisions, limits and deadlines fence changes",
  () => {
    const h = harness();
    const actor = h.actors[0];
    const c = command(view(h.session, actor, h.authority),
      {kind: "place", groupId: "easy"});
    for (const changed of [{...c, actorId: "other"},
      {...c, expectedSourceHash: "b".repeat(64)},
      {...c, payload: {...c.payload, expectedMembershipRevision: 9}},
      {...c, payload: {...c.payload, expectedParticipationRevision: 9}},
      {...c, payload: {...c.payload,
        episodeId: "episode:" + "f".repeat(64)}}]) {
      assert.throws(() => transfer(h.session, actor, changed, h.authority,
        "request-1"), {code: "aborted"});
    }
    assert.throws(() => transfer(h.session, actor, c,
      {...h.authority, actorUid: "stranger"}, "request-1"),
    {code: "permission-denied"});
    assert.throws(() => move(h, move(h), {kind: "propose", from: "easy",
      to: "fast", receivingOperatorId: "stranger", expiresAtMillis: 1_100_000}),
    {code: "permission-denied"});
    assert.throws(() => transfer({...h.session, setupRevision: 1}, actor, c,
      h.authority, "request-1"), {code: "aborted"});
    for (const changed of [{...h.session, actionCount: 500},
      {...h.session, status: "draft" as const},
      {...h.session, runtimeRevision: 2147483647}]) {
      assert.throws(() => transfer(changed, actor, c, h.authority, "request-1"),
        {code: "failed-precondition"});
    }
    assert.throws(() => move(h, move(h), {kind: "propose", from: "easy",
      to: "fast", receivingOperatorId: "host-2", expiresAtMillis: 9_000_000}),
    {code: "failed-precondition"});
  });

test("completion permits cleanup and prevents new handovers", () => {
  const h = harness();
  const actor = propose(h);
  h.session.status = "complete";
  const row = view(h.session, actor, {...h.authority, actorUid: "host-2"});
  assert.deepEqual(row.actions, ["reject", "cancel", "leave"]);
  assert.equal(move(h, actor, {kind: "leave"}).groupMembership?.accepted, null);
});

test("the command contract rejects unknown actions and foreign context", () => {
  const h = harness();
  const input = {sessionId: h.actors[0].sessionId, expectedRevision: 1,
    expectedSetupRevision: 0, clientActionId: "request-1", action: "assistance",
    assistance: command(view(h.session, h.actors[0], h.authority),
      {kind: "place", groupId: "easy"})};
  assert.equal(validateControlEventRehearsalCallablePayload(input), true);
  assert.equal(validateControlEventRehearsalCallablePayload({...input,
    assistance: {...input.assistance, context: {mode: "live"}}}), false);
  assert.equal(validateControlEventRehearsalCallablePayload({...input,
    assistance: {...input.assistance, payload: {...input.assistance.payload,
      decision: {kind: "forceAccept"}}}}), false);
});

test("Firestore membership retries, cohosts, reset and guest isolation", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const {getEventRehearsalBootstrapHandler: bootstrap,
    controlEventRehearsalHandler: control,
    getEventRehearsalGuestBootstrapHandler: guestBootstrap,
    resetEventRehearsalHandler: reset} = await import("./handlers.js");
  if (!admin.apps.length) admin.initializeApp({projectId: "demo-catch-rules"});
  const db = getEmulatorFirestore();
  const id = randomUUID();
  const h = harness(Date.now(), id);
  h.session.organizerId = "membership-" + id;
  h.session.publicRehearsalId = "public-" + id;
  h.session.viewerTokenHash = createHash("sha256")
    .update(h.session.publicRehearsalId).digest("hex");
  const sessionRef = db.collection("eventRehearsals").doc(id);
  const orgRef = db.collection("organizers").doc(h.session.organizerId);
  const batch = db.batch();
  batch.set(sessionRef, h.session);
  batch.set(orgRef, h.authority.organizer);
  for (const actor of h.actors) {
    batch.set(db.collection("eventRehearsalActors")
      .doc(id + "_" + actor.actorId), actor);
  }
  await batch.commit();
  const request = (data: unknown, uid = "host-1") =>
    ({data, auth: {uid, token: {}}}) as Parameters<typeof control>[0];
  let current = await bootstrap(request({sessionId: id}));
  assert.equal(validateEventRehearsalBootstrapCallableResponse(current), true);
  const payload = (decision: Decision, clientActionId = randomUUID()) => ({
    sessionId: id, expectedRevision: current.session.runtimeRevision,
    expectedSetupRevision: current.session.setupRevision, clientActionId,
    action: "assistance", assistance: command(
      current.membershipReviews!.rows[0], decision)});
  const placement = payload({kind: "place", groupId: "easy"});
  const results = await Promise.all([control(request(placement)),
    control(request(placement))]);
  assert.ok(results.every((r) => r.membershipReviews!.rows[0].revision === 1));
  current = results[0];
  assert.equal(current.session.actionCount, 1);
  const proposal = payload({kind: "propose", from: "easy", to: "fast",
    receivingOperatorId: "host-2", expiresAtMillis:
      current.session.virtualNowMillis + 10000});
  current = await control(request(proposal));
  const acceptance = payload({kind: "accept",
    transferId: current.membershipReviews!.rows[0].transfer!.transferId});
  await assert.rejects(control(request(acceptance)),
    {code: "permission-denied"});
  current = await control(request(acceptance, "host-2"));
  assert.equal(current.membershipReviews!.rows[0].accepted?.groupId, "fast");
  current = await control(request(placement));
  assert.equal(current.membershipReviews!.rows[0].accepted?.groupId, "fast");
  assert.equal(current.session.actionCount, 3);
  const removal = payload({kind: "leave"});
  const second = db.collection("eventRehearsalActors")
    .doc(id + "_" + h.actors[1].actorId);
  await second.delete();
  await assert.rejects(control(request(removal)),
    {code: "failed-precondition"});
  assert.equal((await sessionRef.get()).get("actionCount"), 3);
  await second.set(h.actors[1]);
  const extra = db.collection("eventRehearsalActors").doc(id + "_extra");
  await extra.set({...h.actors[1], actorId: "actor-99"});
  await assert.rejects(control(request(removal)),
    {code: "failed-precondition"});
  assert.equal((await sessionRef.get()).get("actionCount"), 3);
  await extra.delete();
  const guest = await guestBootstrap(request({publicRehearsalId:
    h.session.publicRehearsalId, viewerToken: h.session.publicRehearsalId,
  clientInstanceId: randomUUID(), slotToken: null}));
  assert.equal("membershipReviews" in guest, false);
  assert.equal("groupMembership" in guest.actor, false);
  assert.equal("participation" in guest.actor, false);
  await orgRef.update({hostUserIds: ["host-1"]});
  await assert.rejects(control(request(acceptance, "host-2")),
    {code: "permission-denied"});
  await reset(request({sessionId: id, fork: false, seed: null}));
  await assert.rejects(control(request(placement)), {code: "aborted"});
  current = await bootstrap(request({sessionId: id}));
  assert.ok(current.membershipReviews!.rows.every((r) => r.revision === 0));
  const resetSession = (await sessionRef.get()).data()!;
  const fullRoster = buildRehearsalActors(id, 50, 1, resetSession.virtualNow);
  const fullBatch = db.batch();
  fullBatch.update(sessionRef, {actorCount: 50, status: "running"});
  for (const actor of fullRoster) {
    fullBatch.set(db.collection("eventRehearsalActors")
      .doc(id + "_" + actor.actorId), actor);
  }
  await fullBatch.commit();
  current = await bootstrap(request({sessionId: id}));
  const boundedPlacement = payload({kind: "place", groupId: "easy"});
  await extra.set({...fullRoster[0], actorId: "actor-99"});
  await assert.rejects(control(request(boundedPlacement)),
    {code: "resource-exhausted"});
  await assert.rejects(bootstrap(request({sessionId: id})),
    {code: "failed-precondition"});
  assert.equal((await sessionRef.get()).get("actionCount"), 0);
  await extra.delete();
  const actorIds = new Set(h.actors.map((a) => a.actorId));
  const real = await db.collection("eventAssistanceMemberships").get();
  assert.ok(real.docs.every((d) => !actorIds.has(d.get("attendeeId"))));
  await sessionRef.update({expiresAt: admin.firestore.Timestamp.fromMillis(0)});
  await assert.rejects(bootstrap(request({sessionId: id})),
    {code: "not-found"});
});
