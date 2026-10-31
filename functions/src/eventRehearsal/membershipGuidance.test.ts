import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {randomUUID, createHash} from "node:crypto";
import * as admin from "firebase-admin";
import type {Firestore} from "firebase-admin/firestore";
import type {OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import type {Decision} from
  "../eventSuccess/operations/membershipDecisions";
import {FakeFirestore} from "../operations/testFirestore";
import {practiceSession, practicePlan, practiceDeparture,
  savePracticeDeparture} from "./assistanceTestFixtures";
import {buildRehearsalActors, applyRehearsalBehavior} from "./engine";
import {practiceMembershipView, transferPracticeMembership} from "./membership";
import {publishPracticeMessage, dispatchPracticeMessage, practiceMessageView,
  practiceFacts, readPracticeMessage, practiceMessageDocumentId,
  rehearsalMessages, PracticeMessage,
  practiceContext} from "./assistanceRuntime";
import {configurePracticeAutomation, evaluatePracticeAutomation} from
  "./assistanceAutomation";
import {applyPracticeGuestReply} from "./assistanceTransactions";

function harness(now = 1_000_000, id = "practice-guidance") {
  const session = practiceSession(now);
  session.setup.movementSimulation = {
    itinerary: session.setup.movementSimulation!.itinerary, livePositions: [],
    lateArrivalGuidance: null, routePlan: {version: 2, movementMode: "run",
      routeShape: "loop", groupStrategy: "paceGroups",
      stopCadence: "hostedStops", stopKinds: ["regroup"],
      roleKinds: ["pacer", "sweep"],
      path: [{latitude: 22.7, longitude: 75.8},
        {latitude: 22.71, longitude: 75.81}],
      paceGroups: ["easy", "fast"].map((id, sortOrder) =>
        ({id, label: id, sortOrder}))}};
  const fixture = JSON.parse(readFileSync(
    "../contracts/fixtures/valid/organizer_doc.json", "utf8"));
  const schema = JSON.parse(readFileSync(
    "../contracts/firestore/organizers.schema.json", "utf8"));
  const organizer = {...Object.fromEntries(Object.entries(fixture).filter(
    ([k]) => k in schema.properties)), followerCount: 0, organizerPhotos: [],
  organizerType: "community", hostUserIds: ["host-1", "host-2"]} as
    unknown as OrganizerDocument;
  let actor = buildRehearsalActors(id, 2, 1,
    session.virtualNow)[0];
  const saved = [practiceDeparture(session, id),
    practiceDeparture(session, id, "water", "easy"),
    practiceDeparture(session, id, "water", "fast")];
  const departures = () => new Map(saved.map((d) =>
    [d.record.groupId, d.record]));
  const messages: PracticeMessage[] = [];
  const plan = (groupId = "easy") => ({...practicePlan(now),
    policy: {...practicePlan(now).policy, destination: {
      kind: "groupCheckpoint" as const, routeId: practiceContext(session,
        actor).virtualEventId + ":route", groupId,
      permittedCheckpointIds: ["water"]}},
    guidance: {...practicePlan(now).guidance, destination: {
      kind: "groupCheckpoint" as const, routeId: practiceContext(session,
        actor).virtualEventId + ":route", groupId,
      checkpointId: "water"}}});
  const move = (decision: Decision = {kind: "place", groupId: "easy"},
    actorUid = "host-1") => {
    const authority = {actorUid, organizer};
    const row = practiceMembershipView(session, actor, authority);
    actor = transferPracticeMembership(session, actor, {kind: "transferGroup",
      actorId: actor.actorId, expectedSourceHash: row.sourceHash,
      payload: {attendeeId: actor.actorId, episodeId: row.episodeId!,
        expectedParticipationRevision: row.participationRevision,
        expectedMembershipRevision: row.revision, decision}}, authority,
    randomUUID());
  };
  const publish = (value = plan()) => {
    const result = publishPracticeMessage(session, actor, value, messages,
      departures());
    actor = result.actor;
    if (!result.exists) messages.push(result.message);
    return result.message;
  };
  const propose = () => move({kind: "propose", from: "easy", to: "fast",
    receivingOperatorId: "host-2", expiresAtMillis: now + 10000});
  return {session, organizer, plan, move, publish, propose, messages,
    departures, saved,
    actor: () => actor, setActor: (value: typeof actor) => actor = value};
}

test("group directions require an explicit accepted current membership", () => {
  const h = harness();
  assert.throws(() => h.publish(), /outreach is held/u);
  h.move();
  const message = h.publish();
  assert.equal(message.membershipBinding?.groupId, "easy");
  assert.equal(practiceMessageView(h.session, h.actor(), message,
    h.departures())?.canRespond,
  true);
  assert.throws(() => h.publish(h.plan("fast")), /outreach is held/u);
  assert.equal(h.actor().status, "expected");
  assert.equal(h.actor().visit?.checkedInAtMillis, null);
  assert.equal("membershipBinding" in practiceMessageView(h.session,
    h.actor(), message, h.departures())!, false);
});

test("proposal, rejection and cancellation preserve the original directions",
  () => {
    for (const decision of ["pending", "reject", "cancel"] as const) {
      const h = harness(); h.move();
      const message = h.publish(); h.propose();
      if (decision !== "pending") {
        h.move({kind: decision,
          transferId: h.actor().groupMembership!.transfer!.transferId},
        decision === "reject" ? "host-2" : "host-1");
      }
      assert.equal(h.actor().groupMembership?.assignmentRevision, 1);
      assert.equal(practiceMessageView(h.session, h.actor(), message,
        h.departures())
        ?.canRespond, true);
      assert.equal(dispatchPracticeMessage(h.session, h.actor(), message,
        h.messages, {kind: "delivered"}, h.departures()).decision.kind,
      "dispatch");
    }
  });

test("acceptance hides old directions and stops delivery and reply gates",
  () => {
    const h = harness(); h.move();
    const message = h.publish(); h.propose();
    h.move({kind: "accept",
      transferId: h.actor().groupMembership!.transfer!.transferId}, "host-2");
    assert.equal(practiceMessageView(h.session, h.actor(), message,
      h.departures()), null);
    assert.equal(practiceFacts(h.session, h.actor(), message, h.messages,
      true, h.departures()).gate.kind, "stop");
    const result = dispatchPracticeMessage(h.session, h.actor(), message,
      h.messages, {kind: "delivered"}, h.departures());
    assert.equal(result.decision.kind, "stop");
    assert.equal(result.record.attempts.length, 0);
    assert.equal(readPracticeMessage(message, h.session, h.actor()), message);
    const fresh = h.publish(h.plan("fast"));
    assert.notEqual(fresh.record.messageId, message.record.messageId);
    assert.equal(practiceMessageView(h.session, h.actor(), fresh,
      h.departures())?.canRespond,
    true);
  });

test("same-instant removal and replacement cannot revive an old instruction",
  () => {
    const h = harness(); h.move();
    const message = h.publish(); h.move({kind: "leave"});
    assert.equal(practiceMessageView(h.session, h.actor(), message,
      h.departures()), null);
    h.move();
    assert.equal(h.actor().groupMembership?.assignmentRevision, 3);
    assert.equal(practiceMessageView(h.session, h.actor(), message,
      h.departures()), null);
    const fresh = h.publish();
    assert.notEqual(fresh.record.messageId, message.record.messageId);
    assert.equal(practiceMessageView(h.session, h.actor(), fresh,
      h.departures())?.canRespond,
    true);
  });

test("re-entry, changed group source and missing proof retire group directions",
  () => {
    const h = harness(); h.move();
    const message = h.publish();
    const original = h.actor();
    for (const change of ["reenter", "source", "legacy", "binding"] as const) {
      let actor = original;
      let record = message;
      if (change === "reenter") {
        actor = applyRehearsalBehavior(actor, "leaveEarly", [],
          h.session.virtualNow);
        actor = applyRehearsalBehavior(actor, "arrive", [],
          h.session.virtualNow);
      } else if (change === "legacy") {
        actor = {...actor, groupMembership: {...actor.groupMembership!}};
        delete actor.groupMembership!.assignmentRevision;
      } else if (change === "source") {
        actor = {...actor, groupMembership: {...actor.groupMembership!,
          accepted: {...actor.groupMembership!.accepted!,
            groupSourceHash: "0".repeat(64)}}};
      } else {
        record = {...message}; delete record.membershipBinding;
        delete record.movementBinding;
      }
      assert.equal(practiceMessageView(h.session, actor, record,
        h.departures()), null);
      assert.equal(practiceFacts(h.session, actor, record, [record], false,
        h.departures()).gate.kind,
      "stop");
      assert.equal(readPracticeMessage(record, h.session, actor), record);
    }
    assert.throws(() => readPracticeMessage({...message, membershipBinding: {
      ...message.membershipBinding!, assignmentRevision: 9}}, h.session,
    original), /binding changed/u);
  });

test("automation waits for membership and never consumes a stale-group attempt",
  () => {
    const h = harness();
    let result = configurePracticeAutomation(h.session, h.actor(), h.plan(),
      [{kind: "failed", classification: "technical"}, {kind: "delivered"}],
      [], h.departures());
    assert.equal(result.messages.length, 0);
    assert.deepEqual(result.actor.assistanceAutomation?.evaluation?.policy,
      {kind: "wait", reason: "guidanceUnavailable"});
    h.setActor(result.actor); h.move();
    result = evaluatePracticeAutomation(h.session, h.actor(), [],
      h.departures());
    assert.equal(result.actor.assistanceAutomation?.nextOutcomeIndex, 1);
    h.setActor(result.actor); h.move({kind: "leave"});
    result = evaluatePracticeAutomation(h.session, h.actor(), result.messages,
      h.departures());
    assert.equal(result.actor.assistanceAutomation?.nextOutcomeIndex, 1);
    assert.equal(result.messages[0].record.attempts.length, 1);
    assert.deepEqual(result.actor.assistanceAutomation?.evaluation?.policy,
      {kind: "wait", reason: "guidanceUnavailable"});
  });

test("whole-event venue guidance remains usable without group assignment",
  () => {
    const h = harness();
    const message = publishPracticeMessage(h.session, h.actor(),
      practicePlan(h.session.virtualNow.toMillis()), [], h.departures());
    assert.equal(message.message.membershipBinding, undefined);
    assert.equal(practiceMessageView(h.session, message.actor,
      message.message, h.departures())?.canRespond, true);
  });

test("old replies cannot restore intention after removal and replacement",
  async () => {
    const h = harness(); h.move();
    const message = h.publish();
    const fake = new FakeFirestore();
    const db = fake as unknown as Firestore;
    for (const d of h.saved) fake.write(d.path, {...d.record});
    fake.write(rehearsalMessages + "/" + practiceMessageDocumentId(
      h.actor().sessionId, message.record.messageId), message);
    const submission = {messageId: message.record.messageId, intentRevision: 1,
      choiceId: message.record.intent.choices[0].choiceId,
      requestId: "once", actionId: "once"};
    const replied = await db.runTransaction((tx) => applyPracticeGuestReply(db,
      tx, h.session, h.actor(), submission));
    h.setActor({...replied, assistance: {...replied.assistance!,
      intention: {kind: "unknown"}}});
    const duplicate = await db.runTransaction((tx) => applyPracticeGuestReply(
      db, tx, h.session, h.actor(), submission));
    assert.deepEqual(duplicate.assistance?.intention, {kind: "unknown"});
    h.move({kind: "leave"}); h.move();
    await assert.rejects(db.runTransaction((tx) => applyPracticeGuestReply(db,
      tx, h.session, h.actor(), submission)), /directions need review/u);
    assert.deepEqual(h.actor().assistance?.intention, {kind: "unknown"});
  });

test("Firestore group messages follow handover in Host and guest projections", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const {getEventRehearsalBootstrapHandler: bootstrap,
    controlEventRehearsalHandler: control,
    getEventRehearsalGuestBootstrapHandler: guestBootstrap,
    submitEventRehearsalGuestActionHandler: guestAction} =
      await import("./handlers.js");
  if (!admin.apps.length) admin.initializeApp({projectId: "demo-catch-rules"});
  const db = getEmulatorFirestore();
  const id = randomUUID();
  const h = harness(Date.now(), id);
  h.session.organizerId = "guidance-" + id;
  h.session.organizerId = h.session.organizerId;
  h.session.publicRehearsalId = "public-" + id;
  h.session.viewerTokenHash = createHash("sha256")
    .update(h.session.publicRehearsalId).digest("hex");
  const batch = db.batch();
  batch.set(db.collection("eventRehearsals").doc(id), h.session);
  batch.set(db.collection("organizers").doc(h.session.organizerId),
    h.organizer);
  for (const actor of buildRehearsalActors(id, 2, 1, h.session.virtualNow)) {
    batch.set(db.collection("eventRehearsalActors")
      .doc(id + "_" + actor.actorId), actor);
  }
  const slotId = "a".repeat(24);
  const slotToken = slotId + "_" + "b".repeat(40);
  batch.set(db.collection("eventRehearsalGuestViews").doc(id + "_" + slotId), {
    sessionId: id, slotId, actorId: h.actor().actorId,
    tokenHash: createHash("sha256").update(slotToken).digest("hex"),
    createdAt: h.session.createdAt, lastSeenAt: h.session.createdAt,
    expiresAt: h.session.expiresAt});
  await batch.commit();
  await savePracticeDeparture(db, h.session, id);
  await savePracticeDeparture(db, h.session, id, "water", "easy");
  await savePracticeDeparture(db, h.session, id, "water", "fast");
  const request = (data: unknown, uid = "host-1") =>
    ({data, auth: {uid, token: {}}}) as Parameters<typeof control>[0];
  let current = await bootstrap(request({sessionId: id}));
  const envelope = (assistance: unknown) => ({sessionId: id,
    expectedRevision: current.session.runtimeRevision,
    expectedSetupRevision: current.session.setupRevision,
    clientActionId: randomUUID(), action: "assistance", assistance});
  const move = async (decision: Decision, uid = "host-1") => {
    const row = current.membershipReviews!.rows[0];
    current = await control(request(envelope({kind: "transferGroup",
      actorId: row.attendeeId, expectedSourceHash: row.sourceHash,
      payload: {attendeeId: row.attendeeId, episodeId: row.episodeId,
        expectedMembershipRevision: row.revision,
        expectedParticipationRevision: row.participationRevision, decision}}),
    uid));
  };
  const guest = () => guestBootstrap(request({publicRehearsalId:
    h.session.publicRehearsalId, viewerToken: h.session.publicRehearsalId,
  clientInstanceId: "group-guidance-client", slotToken}));
  await move({kind: "place", groupId: "easy"});
  const publication = envelope({kind: "configureAutomation",
    actorId: h.actor().actorId, plan: h.plan(),
    outcomes: [{kind: "delivered"}]});
  current = await control(request(publication));
  const message = current.actors[0].assistanceMessage!;
  assert.equal((await guest()).actor.assistanceMessage?.canRespond, true);
  await move({kind: "propose", from: "easy", to: "fast",
    receivingOperatorId: "host-2", expiresAtMillis:
      current.session.virtualNowMillis + 10000});
  assert.equal((await guest()).actor.assistanceMessage?.canRespond, true);
  await move({kind: "accept",
    transferId: current.membershipReviews!.rows[0].transfer!.transferId},
  "host-2");
  assert.equal(current.actors[0].assistanceMessage, null);
  assert.deepEqual(current.actors[0].assistanceAutomation?.evaluation?.policy,
    {kind: "wait", reason: "guidanceUnavailable"});
  assert.equal((await guest()).actor.assistanceMessage, null);
  await assert.rejects(guestAction(request({publicRehearsalId:
    h.session.publicRehearsalId, slotToken, clientActionId: randomUUID(),
  action: "respondToAssistance", messageId: message.messageId,
  intentRevision: message.intentRevision, choiceId: "on-my-way"})),
  {code: "failed-precondition"});
  current = await control(request(publication));
  assert.equal(current.actors[0].assistanceMessage, null);
  assert.equal(current.membershipReviews!.rows[0].accepted?.groupId, "fast");
  const stored = await db.collection(rehearsalMessages)
    .where("sessionId", "==", id).get();
  assert.equal(stored.size, 1);
  assert.equal(stored.docs[0].get("membershipBinding.groupId"), "easy");
  assert.equal(stored.docs[0].get("record.attempts").length, 1);
  assert.equal((await db.collection("eventAssistanceMessages")
    .where("intent.context.rehearsalId", "==", id).get()).empty, true);
});
