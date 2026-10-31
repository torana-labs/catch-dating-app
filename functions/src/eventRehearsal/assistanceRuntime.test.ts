import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import {validateControlEventRehearsalCallablePayload} from
  "../shared/generated/validators/controlEventRehearsalInput";
import {FakeFirestore} from "../operations/testFirestore";
import {buildRehearsalActors, applyRehearsalBehavior} from "./engine";
import {applyPracticeHostCommand, applyPracticeGuestReply,
  applyPracticeAutomations,
  PracticeCommand} from "./assistanceTransactions";
import {PracticeMessage, practiceMessageView, practiceContext,
  readPracticeMessage, rehearsalMessages} from "./assistanceRuntime";

import {practiceSession, practicePlan, practiceDeparture,
  savePracticeDeparture} from "./assistanceTestFixtures";

test("Host assistance requires a bounded setup generation", () => {
  const data = {sessionId: "practice-1", expectedRevision: 1,
    expectedSetupRevision: 0, clientActionId: "practice-request-1",
    action: "assistance", assistance: {kind: "publish", actorId: "actor-1",
      plan: practicePlan(Date.now())}};
  assert.equal(validateControlEventRehearsalCallablePayload(data), true);
  const {expectedSetupRevision: omitted, ...withoutGeneration} = data;
  assert.equal(omitted, 0);
  assert.equal(validateControlEventRehearsalCallablePayload(withoutGeneration),
    false);
  for (const generation of [-1, 0.5, null, "0", 2147483648]) {
    assert.equal(validateControlEventRehearsalCallablePayload({...data,
      expectedSetupRevision: generation}), false);
  }
  const legacyControl = {sessionId: "practice-1", expectedRevision: 1,
    clientActionId: "practice-request-1", action: "advanceClock", minutes: 1};
  assert.equal(validateControlEventRehearsalCallablePayload(legacyControl),
    true);
  assert.equal(validateControlEventRehearsalCallablePayload({...legacyControl,
    expectedSetupRevision: 0}), false);
});

type WithoutActor<T> = T extends {actorId: string} ? Omit<T, "actorId"> : never;
function setup() {
  const fake = new FakeFirestore();
  const db = fake as unknown as Firestore;
  const session = practiceSession();
  let actor = buildRehearsalActors("practice-1", 2, 1,
    session.virtualNow)[0];
  const departure = practiceDeparture(session, "practice-1");
  fake.write(departure.path, {...departure.record});
  const actorRef = db.collection("eventRehearsalActors").doc(
    "practice-1_actor-1");
  const host = async (command: WithoutActor<PracticeCommand>) => {
    actor = await db.runTransaction(async (tx) => {
      const next = await applyPracticeHostCommand(db, tx, session, actor,
        {...command, actorId: actor.actorId});
      tx.set(actorRef, next);
      return next;
    });
    return actor;
  };
  const message = () => fake.entries().filter(([path]) =>
    path.startsWith(rehearsalMessages + "/")).map(([, value]) =>
    value as unknown as PracticeMessage).find((m) =>
    m.record.messageId === actor.assistance?.latestMessageId)!;
  const reply = async (choiceId: string, requestId = "reply-once") => {
    const current = message();
    actor = await db.runTransaction(async (tx) => {
      const next = await applyPracticeGuestReply(db, tx, session, actor, {
        messageId: current.record.messageId, intentRevision: 1, choiceId,
        requestId, actionId: requestId});
      tx.set(actorRef, next);
      return next;
    });
    return actor;
  };
  const advance = (minutes: number) => {
    session.virtualNow = Timestamp.fromMillis(
      session.virtualNow.toMillis() + minutes * 60000);
  };
  const evaluate = async () => {
    [actor] = await db.runTransaction(async (tx) => {
      const next = await applyPracticeAutomations(db, tx, session, [actor]);
      tx.set(actorRef, next[0]);
      return next;
    });
    return actor;
  };
  const departures = () => new Map(fake.entries().filter(([p]) =>
    p.startsWith("eventRehearsalMovements/"))
    .map(([, v]) => ["event:whole", v as unknown as
      ReturnType<typeof practiceDeparture>["record"]]));
  const confirm = (stopId = "meeting", revision = 1) => {
    const d = practiceDeparture(session, "practice-1", stopId,
      "event:whole", revision);
    fake.write(d.path, {...d.record});
  };
  return {fake, session, host, message, reply, advance, evaluate,
    departures, confirm,
    actor: () => actor, resetActor: () => {
      actor = buildRehearsalActors("practice-1", 2, 1, session.virtualNow)[0];
    }, behavior: (behavior: "arrive" | "leaveEarly") => {
      actor = applyRehearsalBehavior(actor, behavior, [], session.virtualNow);
    }};
}

test(
  "practice outreach supports venues and whole-event stops", async () => {
    for (const kind of ["fixedPlace", "itineraryStop"] as const) {
      const h = setup();
      const plan = practicePlan(h.session.virtualNow.toMillis());
      if (kind === "itineraryStop") {
        plan.policy.destination = {kind,
          itineraryId: practiceContext(h.session, h.actor()).virtualEventId +
          ":itinerary",
          permittedStopIds: ["bar"]};
        plan.guidance.destination = {kind,
          itineraryId: practiceContext(h.session, h.actor()).virtualEventId +
          ":itinerary", stopId: "bar"};
      }
      if (kind === "itineraryStop") h.confirm("bar");
      await h.host({kind: "publish", plan});
      const message = h.message();
      assert.equal(message.record.intent.context.mode, "rehearsal");
      assert.equal(message.plan.guidance.destination.kind, kind);
      assert.equal(h.actor().status, "expected");
      const view = practiceMessageView(h.session, h.actor(), message,
        h.departures())!;
      assert.equal(view.canRespond, true);
      assert.equal("plan" in view, false);
      assert.equal("attempts" in view, false);
      assert.deepEqual(h.fake.entries().map(([p]) => p.split("/")[0]).sort(),
        ["eventRehearsalActors", "eventRehearsalMessages",
          "eventRehearsalMovements"]);
    }
  });

test(
  "uncertainty holds fallback until confirmed non-delivery", async () => {
    const h = setup();
    await h.host({kind: "publish",
      plan: practicePlan(h.session.virtualNow.toMillis())});
    const messageId = h.message().record.messageId;
    await h.host({kind: "dispatch", messageId,
      outcome: {kind: "unknown", reason: "timeout"}});
    const attemptId = h.message().record.attempts[0].attemptId;
    h.advance(3);
    await h.host({kind: "dispatch", messageId,
      outcome: {kind: "delivered"}});
    assert.equal(h.message().record.attempts.length, 1);
    await h.host({kind: "receipt", messageId, attemptId,
      outcome: {kind: "failed", classification: "technical"}});
    h.advance(1);
    await h.host({kind: "dispatch", messageId,
      outcome: {kind: "delivered"}});
    const attempts = h.message().record.attempts;
    assert.equal(attempts.length, 2);
    assert.ok(attempts[1].mode === "rehearsal");
    assert.equal(attempts[1].routeId, "catchEventSms");
    assert.equal(attempts.every((a) => a.mode === "rehearsal" &&
    !("binding" in a)), true);
  });

test("instruction refresh survives an outreach cap without sending again",
  async () => {
    const h = setup();
    const plan = practicePlan(h.session.virtualNow.toMillis());
    plan.policy.maxMessagesPerEpisode = 1;
    await h.host({kind: "publish", plan});
    await h.host({kind: "dispatch", messageId: h.message().record.messageId,
      outcome: {kind: "delivered"}});
    h.advance(10);
    h.session.setup.locationName = "Updated entrance"; h.confirm("meeting", 2);
    const changed = {...plan, guidance: {...plan.guidance, revision: 2,
      materialKey: "venue-2", text: "Meet at the updated entrance."}};
    await h.host({kind: "publish", plan: changed});
    await h.host({kind: "dispatch", messageId: h.message().record.messageId,
      outcome: {kind: "delivered"}});
    assert.equal(h.message().record.attempts.length, 0);
    assert.equal(practiceMessageView(h.session, h.actor(), h.message(),
      h.departures())?.text,
    "Join us at Updated entrance.");
    await h.reply("on-my-way");
    assert.equal(h.actor().assistance?.intention.kind, "onMyWay");
  });

test(
  "arrival and deadlines close current reply controls", async () => {
    for (const change of ["arrive", "deadline"] as const) {
      const h = setup();
      const plan = practicePlan(h.session.virtualNow.toMillis());
      plan.policy.unanswered = "hostReviewAtDeadline";
      plan.responseDeadline = h.session.virtualNow.toMillis() + 60000;
      await h.host({kind: "publish", plan});
      if (change === "arrive") h.behavior("arrive");
      else h.advance(2);
      assert.equal(practiceMessageView(h.session, h.actor(),
        h.message(), h.departures())?.canRespond, false);
      await assert.rejects(h.reply("on-my-way"), {code: "failed-precondition"});
      assert.equal(h.message().record.response, null);
    }
  });

test(
  "guest intentions and help commit with the response without attendance",
  async () => {
    for (const choice of ["on-my-way", "not-coming", "need-help"]) {
      const h = setup();
      await h.host({kind: "publish",
        plan: practicePlan(h.session.virtualNow.toMillis())});
      await h.reply(choice);
      assert.equal(h.actor().status, "expected");
      assert.equal(h.actor().assistance?.intention.kind,
        choice === "on-my-way" ? "onMyWay" : choice === "not-coming" ?
          "notComing" : "unknown");
      assert.equal(h.actor().helpRequested, choice === "need-help");
      assert.equal(h.message().record.response?.choiceId, choice);
      assert.equal(practiceMessageView(h.session, h.actor(),
        h.message(), h.departures())?.canRespond, false);
      const before = h.fake.entries();
      await h.reply(choice);
      assert.deepEqual(h.fake.entries(), before);
      await assert.rejects(h.reply(choice, "different-request"),
        {code: "failed-precondition"});
    }
  });

test("join-later keeps the chosen stop", async () => {
  const h = setup();
  const plan = practicePlan(h.session.virtualNow.toMillis());
  plan.policy.destination = {kind: "itineraryStop",
    itineraryId: practiceContext(h.session, h.actor()).virtualEventId +
          ":itinerary",
    permittedStopIds: ["first", "second"]};
  plan.guidance.destination = {kind: "itineraryStop",
    itineraryId: practiceContext(h.session, h.actor()).virtualEventId +
          ":itinerary",
    stopId: "first"};
  const target = {kind: "itineraryStop" as const,
    itineraryId: practiceContext(h.session, h.actor()).virtualEventId +
          ":itinerary",
    stopId: "second"};
  plan.laterChoices = [{label: "Join at the second stop", target}];
  h.confirm("first");
  await h.host({kind: "publish", plan});
  const choice = h.message().record.intent.choices.find((c) =>
    c.label === "Join at the second stop")!;
  await h.reply(choice.choiceId);
  assert.deepEqual(h.actor().assistance?.intention,
    {kind: "joinLater", target});
  assert.equal(h.actor().status, "expected");
  await assert.rejects(h.host({kind: "publish", plan}),
    {code: "failed-precondition"});
  h.advance(30);
  h.confirm("second", 2);
  await h.host({kind: "publish", plan: {...plan, guidance: {...plan.guidance,
    revision: 2, materialKey: "second-stop", destination: target,
    text: "We have reached the second stop."}}});
  assert.equal(h.message().record.lifecycle, "active");
  assert.deepEqual(h.message().plan.guidance.destination, target);
});

test("an interrupted reply leaves both the actor and message unchanged",
  async () => {
    const h = setup();
    await h.host({kind: "publish",
      plan: practicePlan(h.session.virtualNow.toMillis())});
    const before = h.fake.entries();
    h.fake.failNextCommit = true;
    await assert.rejects(h.reply("not-coming"), /interruption/u);
    assert.deepEqual(h.fake.entries(), before);
    await h.reply("not-coming");
    assert.equal(h.message().record.lifecycle, "responded");
  });

test("a reset epoch ignores messages left by an older run", async () => {
  const h = setup();
  const plan = practicePlan(h.session.virtualNow.toMillis());
  await h.host({kind: "publish", plan});
  const old = h.message().record.messageId;
  h.session.setupRevision += 1;
  // Real reset rebuilds the roster as well as advancing the clock generation.
  h.resetActor();
  h.confirm();
  await h.host({kind: "publish", plan});
  assert.notEqual(h.message().record.messageId, old);
  await h.reply("on-my-way");
  assert.equal(h.actor().assistance?.intention.kind, "onMyWay");
});

test(
  "attendance and confirmed departure govern practice outreach", async () => {
    for (const mode of ["arrive", "leaveEarly", "unconfirmed"] as const) {
      const h = setup();
      const plan = practicePlan(h.session.virtualNow.toMillis());
      if (mode === "unconfirmed") {
        h.fake.remove(
          practiceDeparture(h.session, "practice-1").path);
      } else h.behavior(mode);
      await assert.rejects(h.host({kind: "publish", plan}),
        {code: "failed-precondition"});
      assert.equal(h.fake.entries().filter(([p]) =>
        !p.startsWith("eventRehearsalMovements/")).length, 0);
    }
  });

test(
  "reset, foreign scope and forged plans fail closed", async () => {
    const h = setup();
    await h.host({kind: "publish",
      plan: practicePlan(h.session.virtualNow.toMillis())});
    const message = h.message();
    for (const other of [{...h.session, setupRevision: 1},
      {...h.session, virtualStartedAt: Timestamp.fromMillis(0)}]) {
      assert.throws(() => readPracticeMessage(message, other, h.actor()));
    }
    for (const patch of [{actorId: "other"}, {sessionId: "other"},
      {record: {...message.record, intent: {...message.record.intent,
        context: {mode: "live", organizerId: "real", eventId: "real"}}}}]) {
      assert.throws(() => readPracticeMessage({...message, ...patch},
        h.session, h.actor()));
    }
    const invalid = {...message.plan, routes: ["catchEventSms"]};
    assert.throws(() => readPracticeMessage({...message, plan: invalid},
      h.session, h.actor()));
  });

test("Firestore serializes Host rehearsal commands, guest replies and reset", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const {readFileSync} = await import("node:fs");
  const {createHash, randomUUID} = await import("node:crypto");
  const {controlEventRehearsalHandler, submitEventRehearsalGuestActionHandler,
    resetEventRehearsalHandler} = await import("./handlers.js");
  if (!admin.apps.length) admin.initializeApp({projectId: "demo-catch-rules"});
  const db = getEmulatorFirestore();
  const id = randomUUID();
  const session = practiceSession();
  session.organizerId = "practice-owner-" + id;
  session.publicRehearsalId = "public-" + id;
  const fixture = JSON.parse(readFileSync(
    "../contracts/fixtures/valid/organizer_doc.json", "utf8"));
  const organizerSchema = JSON.parse(readFileSync(
    "../contracts/firestore/organizers.schema.json", "utf8"));
  const organizer = {...Object.fromEntries(Object.entries(fixture).filter((
    [key]) =>
    key in organizerSchema.properties)), followerCount: 0,
  organizerPhotos: [], organizerType: "community"};
  const sessionRef = db.collection("eventRehearsals").doc(id);
  const actors = buildRehearsalActors(id, 2, 1, session.virtualNow);
  await db.collection("organizers").doc(session.organizerId).set(organizer);
  await sessionRef.set(session);
  await savePracticeDeparture(db, session, id);
  for (const actor of actors) {
    await db.collection("eventRehearsalActors")
      .doc(id + "_" + actor.actorId).set(actor);
  }
  const request = (data: unknown, uid = "host-1") => ({data,
    auth: {uid,
      token: {}}}) as Parameters<typeof controlEventRehearsalHandler>[0];
  const publish = {sessionId: id, expectedRevision: 1, expectedSetupRevision: 0,
    clientActionId: randomUUID(),
    action: "assistance", assistance: {kind: "publish",
      actorId: actors[0].actorId,
      plan: practicePlan(session.virtualNow.toMillis())}};
  await assert.rejects(controlEventRehearsalHandler(request(publish,
    "stranger")),
  {code: "permission-denied"});
  await assert.rejects(controlEventRehearsalHandler(request({...publish,
    expectedSetupRevision: 1})), {code: "aborted"});
  assert.equal((await sessionRef.get()).data()!.actionCount, 0);
  const first = await controlEventRehearsalHandler(request(publish));
  assert.equal(first.session.virtualStartedAtMillis,
    session.virtualStartedAt.toMillis());
  const message = first.actors.find((a) =>
    a.actorId === actors[0].actorId)?.assistanceMessage;
  assert.ok(message);
  const replay = await controlEventRehearsalHandler(request(publish));
  assert.equal(replay.session.runtimeRevision, first.session.runtimeRevision);
  assert.equal(replay.session.actionCount, 1);
  await assert.rejects(controlEventRehearsalHandler(request({...publish,
    expectedSetupRevision: 1})), {code: "aborted"});
  await assert.rejects(controlEventRehearsalHandler(request({...publish,
    assistance: {...publish.assistance, plan: {...publish.assistance.plan,
      departureConfirmed: false}}})), {code: "aborted"});
  const slotId = "a".repeat(24);
  const slotToken = slotId + "_" + "b".repeat(40);
  await db.collection("eventRehearsalGuestViews").doc(id + "_" + slotId).set({
    sessionId: id, slotId, actorId: actors[0].actorId,
    tokenHash: createHash("sha256").update(slotToken).digest("hex"),
    createdAt: session.createdAt, lastSeenAt: session.createdAt,
    expiresAt: session.expiresAt});
  const replies = ["on-my-way", "not-coming"].map((choiceId) => ({
    publicRehearsalId: session.publicRehearsalId, slotToken,
    clientActionId: (choiceId === "on-my-way" ? "a" : "b").repeat(120),
    action: "respondToAssistance",
    messageId: message.messageId, intentRevision: message.intentRevision,
    choiceId}));
  const results = await Promise.allSettled(replies.map((data) =>
    submitEventRehearsalGuestActionHandler(request(data))));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const winner = results.findIndex((r) => r.status === "fulfilled");
  const response = await submitEventRehearsalGuestActionHandler(request(
    replies[winner]));
  assert.equal(response.actor.status, "expected");
  assert.equal(response.actor.assistanceMessage?.responseChoiceId,
    replies[winner].choiceId);
  assert.equal(response.session.runtimeRevision,
    first.session.runtimeRevision + 1);
  await assert.rejects(submitEventRehearsalGuestActionHandler(request({
    ...replies[winner], slotToken: slotId + "_" + "c".repeat(40)})),
  {code: "permission-denied"});
  assert.equal((await db.collection("eventAssistanceMessages")
    .where("intent.context.rehearsalId", "==", id).get()).empty, true);
  // Old-generation remnants must not survive a cleanup batch boundary.
  const remnants = db.batch();
  for (let index = 0; index < 500; index += 1) {
    remnants.set(db.collection(rehearsalMessages).doc(id + "_old_" + index),
      {sessionId: id});
  }
  await remnants.commit();
  await resetEventRehearsalHandler(request({sessionId: id, fork: false,
    seed: null}));
  assert.equal((await db.collection(rehearsalMessages)
    .where("sessionId", "==", id).get()).empty, true);
  await assert.rejects(submitEventRehearsalGuestActionHandler(request(
    replies[winner])));
  // Reset reuses runtime revisions. A delayed command from the old run must
  // fail before it can publish into this run, even with the same actor IDs.
  await sessionRef.update({status: "running", runtimeRevision: 1});
  const afterReset = (await sessionRef.get()).data()!;
  assert.equal(afterReset.setupRevision, publish.expectedSetupRevision + 1);
  await assert.rejects(controlEventRehearsalHandler(request(publish)),
    {code: "aborted"});
  assert.equal((await db.collection(rehearsalMessages)
    .where("sessionId", "==", id).get()).empty, true);
  assert.equal((await sessionRef.get()).data()!.actionCount, 0);
  await savePracticeDeparture(db, afterReset as typeof session, id);
  const newRun = await controlEventRehearsalHandler(request({...publish,
    expectedSetupRevision: afterReset.setupRevision,
    clientActionId: randomUUID()}));
  assert.equal(newRun.session.runtimeRevision, 2);
  assert.equal(newRun.session.actionCount, 1);
  assert.ok(newRun.actors[0].assistanceMessage);
});

test("automation advances fallback once per transition", async () => {
  const h = setup();
  await h.host({kind: "configureAutomation",
    plan: practicePlan(h.session.virtualNow.toMillis()), outcomes: [
      {kind: "failed", classification: "technical"}, {kind: "delivered"}]});
  assert.equal(h.actor().assistanceAutomation?.nextOutcomeIndex, 1);
  assert.equal(h.actor().assistanceAutomation?.evaluation?.delivery.kind,
    "wait");
  await h.evaluate();
  assert.equal(h.message().record.attempts.length, 1);
  h.advance(1);
  await h.evaluate();
  assert.deepEqual(h.message().record.attempts.map((a) =>
    a.mode === "rehearsal" && a.routeId),
  ["organizerEventWhatsapp", "catchEventSms"]);
  assert.equal(h.actor().assistanceAutomation?.evaluation?.delivery.kind,
    "delivered");
  h.advance(30);
  await h.evaluate();
  assert.equal(h.message().record.attempts.length, 2);
  assert.equal(h.actor().assistanceAutomation?.nextOutcomeIndex, 2);
});

test("automation uncertainty requires a confirmed receipt before fallback",
  async () => {
    const h = setup();
    await h.host({kind: "configureAutomation",
      plan: practicePlan(h.session.virtualNow.toMillis()), outcomes: [
        {kind: "unknown", reason: "timeout"}, {kind: "delivered"}]});
    h.advance(10);
    await h.evaluate();
    assert.equal(h.message().record.attempts.length, 1);
    assert.equal(h.actor().assistanceAutomation?.evaluation?.delivery.kind,
      "reconcile");
    await h.host({kind: "receipt", messageId: h.message().record.messageId,
      attemptId: h.message().record.attempts[0].attemptId,
      outcome: {kind: "failed", classification: "technical"}});
    assert.equal(h.message().record.attempts.length, 1);
    h.advance(1);
    await h.evaluate();
    assert.equal(h.message().record.attempts.length, 2);
    assert.equal(h.actor().assistanceAutomation?.status, "enabled");
  });

test("arrival and intentions stop automation with separate attendance",
  async () => {
    for (const response of ["arrive", "on-my-way", "not-coming"] as const) {
      const h = setup();
      await h.host({kind: "configureAutomation",
        plan: practicePlan(h.session.virtualNow.toMillis()), outcomes: [
          {kind: "failed", classification: "technical"}, {kind: "delivered"}]});
      if (response === "arrive") {
        h.behavior("arrive");
        await h.evaluate();
      } else await h.reply(response);
      h.advance(10);
      await h.evaluate();
      assert.equal(h.message().record.attempts.length, 1);
      assert.equal(h.actor().status,
        response === "arrive" ? "present" : "expected");
      assert.equal(h.message().record.lifecycle,
        response === "arrive" ? "cancelled" : "responded");
    }
  });

test("pause retains the script cursor; manual publish pauses it", async () => {
  const h = setup();
  const plan = practicePlan(h.session.virtualNow.toMillis());
  await h.host({kind: "configureAutomation", plan, outcomes: [
    {kind: "failed", classification: "technical"}, {kind: "delivered"}]});
  await h.host({kind: "pauseAutomation"});
  h.advance(1);
  await h.evaluate();
  assert.equal(h.actor().assistanceAutomation?.nextOutcomeIndex, 1);
  await h.host({kind: "resumeAutomation"});
  assert.equal(h.actor().assistanceAutomation?.nextOutcomeIndex, 2);
  h.session.setup.locationName = "Next stop"; h.confirm("meeting", 2);
  const revised = {...plan, guidance: {...plan.guidance, revision: 2,
    materialKey: "second-stop", text: "Meet us at the next stop."}};
  await h.host({kind: "publish", plan: {...revised, policy: {...revised.policy,
    maxMessagesPerEpisode: 2}}});
  assert.equal(h.actor().assistanceAutomation?.status, "paused");
  h.advance(10);
  await h.evaluate();
  assert.equal(h.message().plan.guidance.text, "Join us at Next stop.");
  assert.equal(h.message().record.attempts.length, 0);
  await assert.rejects(h.host({kind: "resumeAutomation"}),
    {code: "failed-precondition"});
});

test("held plans, caps and exhausted scripts cannot invent simulated sends",
  async () => {
    const h = setup();
    const plan = practicePlan(h.session.virtualNow.toMillis());
    h.fake.remove(practiceDeparture(h.session, "practice-1").path);
    await h.host({kind: "configureAutomation", plan: {...plan,
      departureConfirmed: false}, outcomes: [{kind: "delivered"}]});
    h.advance(10);
    await h.evaluate();
    assert.equal(h.message(), undefined);
    assert.equal(h.actor().assistanceAutomation?.nextOutcomeIndex, 0);
    assert.deepEqual(h.actor().assistanceAutomation?.evaluation?.policy,
      {kind: "wait", reason: "departureUnconfirmed"});
    h.confirm();
    await h.host({kind: "configureAutomation", plan: {...plan,
      policy: {...plan.policy, maxMessagesPerEpisode: 0}},
    outcomes: [{kind: "delivered"}]});
    assert.equal(h.message().record.attempts.length, 0);
    await h.host({kind: "configureAutomation", plan,
      outcomes: [{kind: "failed", classification: "technical"}]});
    h.advance(1);
    await h.evaluate();
    assert.equal(h.message().record.attempts.length, 1);
    assert.equal(h.actor().assistanceAutomation?.evaluation?.delivery.kind,
      "scriptExhausted");
  });

test("reconfigured instructions retain the episode cooldown", async () => {
  const h = setup();
  const plan = practicePlan(h.session.virtualNow.toMillis());
  await h.host({kind: "configureAutomation", plan,
    outcomes: [{kind: "delivered"}]});
  const old = h.message();
  h.session.setup.locationName = "Next stop"; h.confirm("meeting", 2);
  const revised = {...plan, guidance: {...plan.guidance, revision: 2,
    materialKey: "second-stop", text: "Meet at the next stop."}};
  await h.host({kind: "configureAutomation", plan: revised,
    outcomes: [{kind: "delivered"}]});
  assert.equal(h.message().record.attempts.length, 0);
  assert.equal(h.fake.entries().filter(([p]) =>
    p.startsWith(rehearsalMessages + "/"))
    .map(([, v]) => v as unknown as PracticeMessage)
    .find((m) => m.record.messageId === old.record.messageId)?.record.lifecycle,
  "superseded");
  h.advance(6);
  await h.evaluate();
  assert.equal(h.message().record.attempts.length, 1);
});

test("deadlines, completion and reset hold automation", async () => {
  const h = setup();
  const plan = practicePlan(h.session.virtualNow.toMillis());
  plan.policy.unanswered = "hostReviewAtDeadline";
  plan.responseDeadline = h.session.virtualNow.toMillis() + 60000;
  await h.host({kind: "configureAutomation", plan,
    outcomes: [{kind: "accepted"}]});
  h.advance(2);
  await h.evaluate();
  assert.equal(h.actor().assistanceAutomation?.evaluation?.policy?.kind,
    "hostDecision");
  assert.equal(practiceMessageView(h.session, h.actor(),
    h.message(), h.departures())?.canRespond, false);
  h.session.status = "complete";
  await h.evaluate();
  assert.equal(h.actor().assistanceAutomation?.evaluation?.policy?.kind,
    "cancelled");
  assert.equal(h.message().record.lifecycle, "cancelled");
  h.session.setupRevision++;
  await h.evaluate();
  assert.deepEqual(h.actor().assistanceAutomation?.evaluation?.delivery,
    {kind: "hostDecision", reason: "historyUnavailable"});
});

test("failed commits preserve script and attempt history", async () => {
  const h = setup();
  const command = {kind: "configureAutomation" as const,
    plan: practicePlan(h.session.virtualNow.toMillis()),
    outcomes: [{kind: "delivered" as const}]};
  h.fake.failNextCommit = true;
  await assert.rejects(h.host(command), /transaction interruption/u);
  assert.equal(h.actor().assistanceAutomation, undefined);
  assert.equal(h.fake.entries().filter(([p]) =>
    !p.startsWith("eventRehearsalMovements/")).length, 0);
  await h.host(command);
  assert.equal(h.actor().assistanceAutomation?.nextOutcomeIndex, 1);
  assert.equal(h.message().record.attempts.length, 1);
});

test("unusable history holds automation and preserves an arrival", async () => {
  const h = setup();
  await h.host({kind: "configureAutomation",
    plan: practicePlan(h.session.virtualNow.toMillis()),
    outcomes: [{kind: "delivered"}]});
  const message = h.message();
  h.fake.write(rehearsalMessages + "/invalid-identity", {...message});
  h.behavior("arrive");
  await h.evaluate();
  assert.equal(h.actor().status, "present");
  assert.equal(h.actor().assistanceAutomation?.nextOutcomeIndex, 1);
  assert.deepEqual(h.actor().assistanceAutomation?.evaluation?.delivery,
    {kind: "hostDecision", reason: "historyUnavailable"});
});

test("Firestore automates a 50-guest rehearsal in the existing callables", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const {readFileSync} = await import("node:fs");
  const {createHash, randomUUID} = await import("node:crypto");
  const {practiceContext} = await import("./assistanceRuntime.js");
  const {controlEventRehearsalHandler, injectEventRehearsalBehaviorHandler,
    submitEventRehearsalGuestActionHandler, resetEventRehearsalHandler} =
      await import("./handlers.js");
  if (!admin.apps.length) admin.initializeApp({projectId: "demo-catch-rules"});
  const db = getEmulatorFirestore();
  const id = randomUUID();
  const session = {...practiceSession(), actorCount: 50};
  session.organizerId = "practice-owner-" + id;
  session.publicRehearsalId = "public-" + id;
  const fixture = JSON.parse(readFileSync(
    "../contracts/fixtures/valid/organizer_doc.json", "utf8"));
  const schema = JSON.parse(readFileSync(
    "../contracts/firestore/organizers.schema.json", "utf8"));
  await db.collection("organizers").doc(session.organizerId).set({
    ...Object.fromEntries(Object.entries(fixture).filter(([k]) =>
      k in schema.properties)), followerCount: 0,
    organizerPhotos: [], organizerType: "community"});
  const sessionRef = db.collection("eventRehearsals").doc(id);
  const actors = buildRehearsalActors(id, 50, 1, session.virtualNow);
  const plan = practicePlan(session.virtualNow.toMillis());
  const outcomes = [{kind: "failed" as const,
    classification: "technical" as const}, {kind: "delivered" as const}];
  const batch = db.batch();
  batch.set(sessionRef, session);
  for (const actor of actors) {
    batch.set(db.collection("eventRehearsalActors")
      .doc(id + "_" + actor.actorId), {...actor,
      assistanceAutomation: {clockId: practiceContext(session, actor).clockId,
        status: "enabled", plan, outcomes, nextOutcomeIndex: 0,
        evaluation: null}});
  }
  await batch.commit();
  await savePracticeDeparture(db, session, id);
  const request = (data: unknown) => ({data,
    auth: {uid: "host-1", token: {}}}) as
    Parameters<typeof controlEventRehearsalHandler>[0];
  const configured = await controlEventRehearsalHandler(request({
    sessionId: id, expectedRevision: 1, expectedSetupRevision: 0,
    clientActionId: randomUUID(), action: "assistance",
    assistance: {kind: "configureAutomation", actorId: actors[0].actorId,
      plan, outcomes: [{kind: "unknown", reason: "timeout"},
        {kind: "delivered"}]}}));
  const advance = {sessionId: id,
    expectedRevision: configured.session.runtimeRevision,
    clientActionId: randomUUID(), action: "advanceClock", minutes: 1};
  const first = await controlEventRehearsalHandler(request(advance));
  assert.equal(first.actors.length, 50);
  assert.ok(first.actors.every((actor) =>
    actor.assistanceDelivery?.attempts.length === 1));
  const replay = await controlEventRehearsalHandler(request(advance));
  assert.equal(replay.session.runtimeRevision, first.session.runtimeRevision);
  assert.ok(replay.actors.every((actor) =>
    actor.assistanceAutomation?.nextOutcomeIndex === 1));
  const second = await controlEventRehearsalHandler(request({...advance,
    expectedRevision: first.session.runtimeRevision,
    clientActionId: randomUUID()}));
  assert.equal(second.actors[0].assistanceDelivery?.attempts.length, 1);
  assert.ok(second.actors.slice(1).every((actor) =>
    actor.assistanceDelivery?.attempts.length === 2));
  const present = await injectEventRehearsalBehaviorHandler(request({
    sessionId: id, expectedRevision: second.session.runtimeRevision,
    clientActionId: randomUUID(), actorId: actors[2].actorId,
    behavior: "arrive", faultId: "none"}));
  assert.equal(present.actors[2].assistanceMessage?.lifecycle, "cancelled");
  assert.equal(present.actors[2].assistanceAutomation?.evaluation?.policy?.kind,
    "resolved");
  const slotId = "a".repeat(24);
  const slotToken = slotId + "_" + "b".repeat(40);
  await db.collection("eventRehearsalGuestViews").doc(id + "_" + slotId).set({
    sessionId: id, slotId, actorId: actors[1].actorId,
    tokenHash: createHash("sha256").update(slotToken).digest("hex"),
    createdAt: session.createdAt, lastSeenAt: session.createdAt,
    expiresAt: session.expiresAt});
  const guest = await submitEventRehearsalGuestActionHandler(request({
    publicRehearsalId: session.publicRehearsalId, slotToken,
    clientActionId: randomUUID(), action: "checkIn"}));
  assert.equal(guest.actor.status, "present");
  assert.equal(guest.actor.assistanceMessage?.lifecycle, "cancelled");
  assert.equal("assistanceAutomation" in guest.actor, false);
  const current = (await sessionRef.get()).data()!;
  await controlEventRehearsalHandler(request({
    sessionId: id, expectedRevision: current.runtimeRevision,
    clientActionId: randomUUID(), action: "complete"}));
  const records = await db.collection(rehearsalMessages)
    .where("sessionId", "==", id).get();
  assert.equal(records.size, 50);
  assert.ok(records.docs.every((doc) => doc.get("record.lifecycle") ===
    "cancelled"));
  await resetEventRehearsalHandler(request({sessionId: id, fork: false,
    seed: null}));
  const resetActors = await db.collection("eventRehearsalActors")
    .where("sessionId", "==", id).get();
  assert.equal(resetActors.size, 50);
  assert.ok(resetActors.docs.every((doc) =>
    !doc.get("assistanceAutomation")));
  assert.equal((await db.collection(rehearsalMessages)
    .where("sessionId", "==", id).get()).empty, true);
});
