import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync, writeFileSync} from "node:fs";
import {randomUUID, createHash} from "node:crypto";
import * as admin from "firebase-admin";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {OrganizerDocument} from
  "../shared/generated/firestoreAdminTypes";
import {validateControlEventRehearsalCallablePayload} from
  "../shared/generated/validators/controlEventRehearsalInput";
import {validateEventRehearsalMessageDocument} from
  "../shared/generated/validators/eventRehearsalMessageDocument";
import {FakeFirestore} from "../operations/testFirestore";
import {buildRehearsalActors} from "./engine";
import {practiceSession, practicePlan, practiceDeparture,
  savePracticeDeparture} from "./assistanceTestFixtures";
import {applyPracticeHostCommand, applyPracticeGuestReply,
  applyPracticeAutomations, PracticeCommand} from "./assistanceTransactions";
import {practiceDeliveryReview, practiceDeliveryReviews} from
  "./assistanceDelivery";
import {practiceMessageDocumentId, practiceMessageView, practiceDeliveryView,
  readPracticeMessage,
  rehearsalMessages, PracticeMessage} from "./assistanceRuntime";
import {BRAND} from "../shared/generated/brand";
import type {EventRehearsalBootstrapCallableResponse} from
  "../shared/generated/eventRehearsalBootstrapCallableResponse";
import {contractValidator} from "../shared/contractTestValidators";

const validateEventRehearsalBootstrapCallableResponse =
  contractValidator<EventRehearsalBootstrapCallableResponse>(
    "EventRehearsalBootstrapCallableResponse"
  );

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
type WithoutActor<T> = T extends {actorId: string} ? Omit<T, "actorId"> : never;
function harness(now?: number) {
  const fake = new FakeFirestore();
  const db = fake as unknown as Firestore;
  const session = practiceSession(now);
  const org = organizer();
  let actor = buildRehearsalActors("practice-delivery", 2, 1,
    session.virtualNow)[0];
  const departure = practiceDeparture(session, "practice-delivery");
  fake.write(departure.path, {...departure.record});
  const actorRef = db.collection("eventRehearsalActors")
    .doc(actor.sessionId + "_" + actor.actorId);
  const host = async (command: WithoutActor<PracticeCommand>,
    uid = "host-1") => {
    actor = await db.runTransaction(async (tx) => {
      const next = await applyPracticeHostCommand(db, tx, session, actor,
        {...command, actorId: actor.actorId}, {actorUid: uid, organizer: org,
          operationId: "action-" + session.runtimeRevision});
      tx.set(actorRef, next); return next;
    });
    session.runtimeRevision++;
    return actor;
  };
  const allMessages = () => fake.entries().filter(([p]) =>
    p.startsWith(rehearsalMessages + "/")).map(([, v]) =>
    v as unknown as PracticeMessage);
  const message = () => allMessages().find((m) =>
    m.record.messageId === actor.assistance?.latestMessageId)!;
  const review = () => practiceDeliveryReview(session, actor, message(), org);
  const repair = (row = review()) => ({kind: "repairDelivery" as const,
    expectedMessageRevision: row.revision, expectedReviewHash: row.reviewHash,
    payload: {deliveryId: row.messageId, action: "manualHandoff" as const}});
  const evaluate = async () => {
    [actor] = await db.runTransaction(async (tx) => {
      const next = await applyPracticeAutomations(db, tx, session, [actor]);
      tx.set(actorRef, next[0]); return next;
    });
  };
  const reply = async (choiceId: string) => {
    actor = await db.runTransaction(async (tx) => {
      const next = await applyPracticeGuestReply(db, tx, session, actor,
        {messageId: message().record.messageId, intentRevision: 1, choiceId,
          requestId: "reply-once", actionId: "reply-once"});
      tx.set(actorRef, next); return next;
    });
  };
  const configure = () => host({kind: "configureAutomation",
    plan: practicePlan(session.virtualNow.toMillis()), outcomes: [
      {kind: "unknown", reason: "timeout"}, {kind: "delivered"}]});
  const advance = () => {
    session.virtualNow = Timestamp.fromMillis(
      session.virtualNow.toMillis() + 60000);
  };
  return {fake, db, session, org, host, message, allMessages, review, repair,
    departures: () => new Map([["event:whole", departure.record]]),
    evaluate, reply, configure, advance, actor: () => actor,
    setActor: (value: typeof actor) => {
      actor = value;
    }};
}

test("manual practice handling stops fallback and preserves guest replies",
  async () => {
    const h = harness(); await h.configure();
    const original = h.message();
    assert.equal(h.review().deliveryStatus, "unknown");
    assert.deepEqual(h.review().actions, ["manualHandoff"]);
    await h.host(h.repair());
    assert.deepEqual(h.message().record.attempts, original.record.attempts);
    assert.equal(h.message().record.lifecycle, "active");
    assert.equal(h.message().record.revision, original.record.revision + 1);
    assert.equal(h.message().record.handoff, undefined);
    assert.deepEqual(h.review().handling, {kind: "manual", actorUid: "host-1",
      at: h.session.virtualNow.toMillis(), authority: "current"});
    assert.deepEqual(h.actor().assistanceAutomation?.evaluation?.delivery,
      {kind: "stop", reason: "hostStopped"});
    h.advance();
    await h.host({kind: "receipt", messageId: original.record.messageId,
      attemptId: original.record.attempts[0].attemptId,
      outcome: {kind: "failed", classification: "technical"}});
    h.advance(); await h.evaluate();
    await h.host({kind: "resumeAutomation"});
    await h.host({kind: "dispatch", messageId: original.record.messageId,
      outcome: {kind: "delivered"}});
    assert.equal(h.message().record.attempts.length, 1);
    assert.equal(h.actor().assistanceAutomation?.nextOutcomeIndex, 1);
    assert.equal(h.review().deliveryStatus, "failed");
    assert.equal(practiceMessageView(h.session, h.actor(),
      h.message(), h.departures())?.canRespond, true);
    await h.reply("on-my-way");
    assert.equal(h.actor().assistance?.intention.kind, "onMyWay");
    assert.equal(h.actor().status, "expected");
    assert.equal(h.message().record.lifecycle, "responded");
    assert.equal(h.message().handoff?.actorUid, "host-1");
    assert.ok(h.fake.entries().every(([p]) =>
      p.startsWith("eventRehearsal")));
  });

test("late receipts retain manual ownership and their actual evidence",
  async () => {
    const h = harness(); await h.configure();
    await h.host(h.repair());
    const original = h.message();
    for (const kind of ["delivered", "read", "revoked"] as const) {
      h.advance();
      await h.host({kind: "receipt", messageId: original.record.messageId,
        attemptId: original.record.attempts[0].attemptId, outcome: {kind}});
      assert.deepEqual(h.message().handoff, original.handoff);
      assert.deepEqual(h.review().actions, []);
      assert.deepEqual(h.actor().assistanceAutomation?.evaluation?.delivery,
        {kind: "stop", reason: "hostStopped"});
    }
    assert.equal(h.review().deliveryStatus, "conflictingEvidence");
    assert.equal(h.message().record.attempts[0].state.kind, "read");
  });

test("a removed manual owner can be explicitly replaced after a new review",
  async () => {
    const h = harness(); await h.configure();
    await h.host(h.repair(), "host-2");
    const prior = h.review();
    h.org.hostUserIds = ["host-1"];
    assert.deepEqual(h.review().handling, {kind: "manual", actorUid: "host-2",
      at: h.session.virtualNow.toMillis(), authority: "revoked"});
    assert.deepEqual(h.review().actions, ["manualHandoff"]);
    await assert.rejects(h.host(h.repair(prior)), {code: "aborted"});
    await assert.rejects(h.host(h.repair(), "host-2"),
      {code: "permission-denied"});
    await h.host(h.repair());
    assert.equal(h.message().handoff?.actorUid, "host-1");
    assert.equal(h.message().record.attempts.length, 1);
  });

test("review hashes bind actor facts, script, time and runtime revision",
  async () => {
    for (const mutate of [
      (h: ReturnType<typeof harness>) => h.advance(),
      (h: ReturnType<typeof harness>) => h.session.runtimeRevision++,
      (h: ReturnType<typeof harness>) => h.setActor({...h.actor(),
        status: "present"}),
      (h: ReturnType<typeof harness>) => h.setActor({...h.actor(),
        assistanceAutomation: {...h.actor().assistanceAutomation!,
          status: "paused"}}),
    ]) {
      const h = harness(); await h.configure();
      const command = h.repair(); mutate(h);
      await assert.rejects(h.host(command), {code: "aborted"});
      assert.equal(h.message().handoff, undefined);
    }
    const h = harness(); await h.configure();
    await assert.rejects(h.host({...h.repair(), expectedMessageRevision: 0}),
      {code: "aborted"});
    for (const action of ["reconcile", "retryDefiniteFailure"] as const) {
      await assert.rejects(h.host({...h.repair(), payload: {
        ...h.repair().payload, action}}), {code: "failed-precondition"});
    }
  });

test("resolved or irrelevant practice messages do not offer manual handling",
  async () => {
    for (const status of ["present", "late", "returned", "departed",
      "walkIn", "ambiguousClaim", "noShow"] as const) {
      const h = harness(); await h.configure();
      h.setActor({...h.actor(), status});
      assert.deepEqual(h.review().actions, []);
      await assert.rejects(h.host(h.repair()), {code: "failed-precondition"});
    }
    for (const change of ["complete", "expired", "notComing",
      "delivered", "replied"] as const) {
      const h = harness(); await h.configure();
      if (change === "complete") h.session.status = "complete";
      else if (change === "expired") {
        h.session.virtualNow =
        Timestamp.fromMillis(h.message().record.intent.expiresAt);
      } else if (change === "notComing") {
        h.setActor({...h.actor(),
          assistance: {...h.actor().assistance!,
            intention: {kind: "notComing"}}});
      } else if (change === "replied") await h.reply("need-help");
      else {
        await h.host({kind: "receipt",
          messageId: h.message().record.messageId,
          attemptId: h.message().record.attempts[0].attemptId,
          outcome: {kind: "delivered"}});
      }
      assert.deepEqual(h.review().actions, []);
    }
  });

test("interrupted handoffs roll back and later instructions own new handling",
  async () => {
    const h = harness(); await h.configure();
    const command = h.repair(); const before = h.fake.entries();
    h.fake.failNextCommit = true;
    await assert.rejects(h.host(command), /interruption/u);
    assert.deepEqual(h.fake.entries(), before);
    await h.host(command);
    await assert.rejects(h.host(command), {code: "aborted"});
    const original = h.message();
    await h.host({kind: "configureAutomation", plan: original.plan,
      outcomes: [{kind: "delivered"}]});
    h.advance(); await h.evaluate();
    assert.equal(h.message().record.attempts.length, 1);
    assert.equal(h.actor().assistanceAutomation?.nextOutcomeIndex, 0);
    h.session.setup.locationName = "Next venue";
    const moved = practiceDeparture(h.session, h.actor().sessionId,
      "meeting", "event:whole", 2);
    h.fake.write(moved.path, {...moved.record});
    const changedPlan = {...original.plan, guidance: {...original.plan.guidance,
      revision: 2, materialKey: "venue-2", text: "Join at the next stop."}};
    await h.host({kind: "configureAutomation", plan: changedPlan,
      outcomes: [{kind: "accepted"}]});
    assert.notEqual(h.message().record.messageId, original.record.messageId);
    assert.equal(h.message().handoff, undefined);
    assert.deepEqual(h.review().handling, {kind: "automatic"});
    assert.deepEqual(h.allMessages().find((m) =>
      m.record.messageId === original.record.messageId)!.handoff,
    original.handoff);
  });

test("bounded practice reviews preserve live isolation",
  async () => {
    const h = harness(); await h.configure(); await h.host(h.repair());
    const message = h.message();
    const view = practiceDeliveryReviews(h.actor().sessionId, h.session,
      [h.actor()], [message], h.org, "host-1");
    assert.equal(view.coverage, "currentActorMessages");
    assert.deepEqual(view.deliveries[0].coordination, {kind: "untracked"});
    assert.equal(view.deliveries[0].attempts[0].channel, "whatsapp");
    assert.equal("text" in view.deliveries[0], false);
    assert.equal("attemptId" in view.deliveries[0].attempts[0], false);
    for (const records of [[], [message, message],
      [{...message, actorId: "foreign"}]]) {
      assert.throws(() => practiceDeliveryReviews(h.actor().sessionId,
        h.session, [h.actor()], records, h.org, "host-1"));
    }
    assert.equal(validateEventRehearsalMessageDocument(message), true);
    assert.equal(validateEventRehearsalMessageDocument({...message,
      record: {...message.record, intent: {...message.record.intent,
        context: {mode: "live", organizerId: "real", eventId: "real"}}}}),
    false);
    for (const patch of [
      {handoff: {...message.handoff!, at: message.record.createdAt - 1}},
      {handoff: {...message.handoff!, at: message.record.updatedAt + 1}},
      {handoff: {...message.handoff!, senderId: "live"}},
      {record: {...message.record, handoff: message.handoff}},
      {record: {...message.record, intent: {...message.record.intent,
        context: {mode: "live", organizerId: "real", eventId: "real"}}}},
    ]) {
      assert.throws(() => readPracticeMessage({...message, ...patch},
        h.session, h.actor()));
    }
    h.session.setupRevision++;
    assert.throws(() => readPracticeMessage(message, h.session, h.actor()));
  });

test("repair commands retain the typed payload and require the full review",
  async () => {
    const h = harness(); await h.configure();
    const assistance = {...h.repair(), actorId: h.actor().actorId};
    const input = {sessionId: h.actor().sessionId, action: "assistance",
      expectedRevision: 1, expectedSetupRevision: 0,
      clientActionId: "repair-once", assistance};
    assert.equal(validateControlEventRehearsalCallablePayload(input), true);
    for (const key of ["expectedMessageRevision",
      "expectedReviewHash"] as const) {
      const changed: Record<string, unknown> = {...assistance};
      delete changed[key];
      assert.equal(validateControlEventRehearsalCallablePayload({...input,
        assistance: changed}), false);
    }
    assert.equal(validateControlEventRehearsalCallablePayload({...input,
      assistance: {...assistance, payload: {...assistance.payload,
        deliveryId: "some-other-id"}}}), false);
  });

test("Firestore fences practice handoffs, retries, replies and reset", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const {controlEventRehearsalHandler: control,
    getEventRehearsalBootstrapHandler: bootstrap,
    submitEventRehearsalGuestActionHandler: guestAction,
    resetEventRehearsalHandler: reset,
    expireEventRehearsalsHandler: expire} = await import("./handlers.js");
  if (!admin.apps.length) admin.initializeApp({projectId: "demo-catch-rules"});
  const db = getEmulatorFirestore(); const id = randomUUID();
  const session = practiceSession();
  session.organizerId = "practice-delivery-" + id;
  session.publicRehearsalId = "public-" + id;
  const sessionRef = db.collection("eventRehearsals").doc(id);
  const actors = buildRehearsalActors(id, 2, 1, session.virtualNow);
  const batch = db.batch();
  batch.set(db.collection("organizers").doc(session.organizerId), organizer());
  batch.set(sessionRef, session);
  for (const actor of actors) {
    batch.set(db.collection("eventRehearsalActors")
      .doc(id + "_" + actor.actorId), actor);
  }
  await batch.commit();
  await savePracticeDeparture(db, session, id);
  const request = (data: unknown, uid = "host-1") => ({data,
    auth: {uid, token: {}}}) as Parameters<typeof control>[0];
  let current = await bootstrap(request({sessionId: id}));
  const command = (assistance: PracticeCommand) => ({sessionId: id,
    expectedRevision: current.session.runtimeRevision,
    expectedSetupRevision: current.session.setupRevision,
    clientActionId: randomUUID(), action: "assistance", assistance});
  for (const actor of actors) {
    current = await control(request(command({
      kind: "configureAutomation", actorId: actor.actorId,
      plan: practicePlan(session.virtualNow.toMillis()),
      outcomes: [{kind: "unknown", reason: "timeout"}, {kind: "delivered"}]})));
  }
  assert.equal(validateEventRehearsalBootstrapCallableResponse(current), true);
  const rowFor = (actorId: string) => current.deliveryReviews!.deliveries
    .find((v) => v.attendeeId === actorId)!;
  const repair = (actorId: string) => {
    const row = rowFor(actorId);
    return command({kind: "repairDelivery", actorId,
      expectedMessageRevision: row.revision, expectedReviewHash: row.reviewHash,
      payload: {deliveryId: row.messageId, action: "manualHandoff"}});
  };
  const first = repair(actors[0].actorId);
  const count = current.session.actionCount;
  const repeats = await Promise.all([control(request(first)),
    control(request(first)), control(request(first))]);
  assert.ok(repeats.every((r) => r.session.actionCount === count + 1));
  current = repeats[0];
  assert.equal(rowFor(actors[0].actorId).deliveryStatus, "unknown");
  assert.equal(rowFor(actors[0].actorId).handling.kind, "manual");
  await assert.rejects(control(request({...first, assistance: {
    ...first.assistance, expectedReviewHash: "f".repeat(64)}})),
  {code: "aborted"});
  await assert.rejects(control(request(first, "stranger")),
    {code: "permission-denied"});
  const competing = repair(actors[1].actorId);
  const races = await Promise.allSettled([control(request(competing)),
    control(request({...competing, clientActionId: randomUUID()}, "host-2"))]);
  assert.equal(races.filter((r) => r.status === "fulfilled").length, 1);
  current = await bootstrap(request({sessionId: id}));
  const messageId = rowFor(actors[0].actorId).messageId;
  const messageRef = db.collection(rehearsalMessages).doc(
    practiceMessageDocumentId(id, messageId));
  const saved = (await messageRef.get()).data() as PracticeMessage;
  current = await control(request(command({kind: "receipt",
    actorId: actors[0].actorId, messageId,
    attemptId: saved.record.attempts[0].attemptId,
    outcome: {kind: "delivered"}})));
  const replay = await control(request(first));
  assert.equal(replay.deliveryReviews!.deliveries.find((v) =>
    v.messageId === messageId)!.deliveryStatus, "delivered");
  assert.equal(replay.session.runtimeRevision, current.session.runtimeRevision);
  assert.equal(replay.actions.filter((a) =>
    a.clientActionId === first.clientActionId).length, 1);
  const slotId = "a".repeat(24);
  const slotToken = slotId + "_" + "b".repeat(40);
  await db.collection("eventRehearsalGuestViews").doc(id + "_" + slotId).set({
    sessionId: id, slotId, actorId: actors[0].actorId,
    tokenHash: createHash("sha256").update(slotToken).digest("hex"),
    createdAt: session.createdAt, lastSeenAt: session.createdAt,
    expiresAt: session.expiresAt});
  const reply = await guestAction(request({
    publicRehearsalId: session.publicRehearsalId, slotToken,
    clientActionId: randomUUID(), action: "respondToAssistance", messageId,
    intentRevision: 1, choiceId: "on-my-way"}));
  assert.equal(reply.actor.status, "expected");
  assert.equal(reply.actor.assistance?.intention.kind, "onMyWay");
  assert.equal("deliveryReviews" in reply, false);
  assert.equal("assistanceDelivery" in reply.actor, false);
  const afterReply = (await messageRef.get()).data()!;
  assert.deepEqual(afterReply.handoff, saved.handoff);
  assert.equal(afterReply.record.lifecycle, "responded");
  assert.equal((await db.collection("eventAssistanceMessages")
    .where("intent.context.rehearsalId", "==", id).get()).empty, true);
  await reset(request({sessionId: id, fork: false, seed: null}));
  assert.equal((await db.collection(rehearsalMessages)
    .where("sessionId", "==", id).get()).empty, true);
  await assert.rejects(control(request(first)), {code: "aborted"});
  await sessionRef.update({expiresAt: Timestamp.fromMillis(0)});
  await expire(db, Timestamp.fromMillis(0));
  await db.collection("organizers").doc(session.organizerId).delete();
});


test("native practice delivery fixture comes from message evidence",
  async () => {
    const h = harness(1000);
    await h.configure();
    const samples: Record<string, unknown> = {};
    const sample = (name: string) => {
      const actors = [h.actor(), buildRehearsalActors("practice-delivery",
        2, 1, h.session.virtualStartedAt)[1]];
      const deliveries = practiceDeliveryReviews(h.actor().sessionId,
        h.session, actors, h.allMessages(), h.org, "host-1");
      samples[name] = JSON.parse(JSON.stringify({session: {
        id: h.actor().sessionId, ...h.session,
        virtualStartedAtMillis: h.session.virtualStartedAt.toMillis(),
        virtualNowMillis: h.session.virtualNow.toMillis(),
        expiresAtMillis: h.session.expiresAt.toMillis()},
      actors: actors.map((a) => ({...a, layoutUnitId: null,
        confirmedLayoutUnitId: null, ...(a.assistance ? {
          assistanceDelivery: practiceDeliveryView(h.message()),
          assistanceMessage: practiceMessageView(h.session, a,
            h.message(), h.departures())} : {})})),
      actions: [], canUseInternalFaults: false,
      guestUrl: `${BRAND.web.origin}/rehearse/practicepublic1234567890`,
      deliveryReviews: deliveries}));
    };
    sample("uncertain");
    const command = h.repair();
    const actor = h.actor();
    h.setActor({...actor, displayName: "Changed name"});
    await assert.rejects(h.host(command), {code: "aborted"});
    h.setActor(actor);
    await h.host(h.repair());
    sample("handedOff");
    h.advance();
    await h.host({kind: "receipt", messageId: h.message().record.messageId,
      attemptId: h.message().record.attempts[0].attemptId,
      outcome: {kind: "delivered"}});
    sample("delivered");
    const path = "../test/event_rehearsal/fixtures/delivery_queue.json";
    if (process.env.UPDATE_DELIVERY_QUEUE_FIXTURE === "1") {
      writeFileSync(path, JSON.stringify(samples, null, 2) + "\n");
    }
    assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), samples);
  });
