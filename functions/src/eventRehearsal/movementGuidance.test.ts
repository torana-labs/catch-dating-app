import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import * as admin from "firebase-admin";
import {Firestore, Timestamp} from "firebase-admin/firestore";
import type {OrganizerDocument} from "../shared/generated/firestoreAdminTypes";
import {FakeFirestore} from "../operations/testFirestore";
import {practiceSession, practicePlan, practiceDeparture} from
  "./assistanceTestFixtures";
import {buildRehearsalActors} from "./engine";
import {applyPracticeHostCommand, applyPracticeAutomations,
  applyPracticeGuestReply} from "./assistanceTransactions";
import {practiceMovementReview, preparePracticeMovementCommand} from
  "./movement";
import {practiceMovementSource, Movement} from "./movementSource";
import {resolvePracticeGuidance} from "./movementGuidance";
import {operationContentHash as hash} from "../operations/durableActions";
import {rehearsalMovements} from "./movementRecords";
import {rehearsalRouteDecisions} from "./routeDecisions";
import {practiceMessageView, readPracticeMessage, PracticeMessage,
  rehearsalMessages} from "./assistanceRuntime";

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
async function harness(count = 2, cap = 4) {
  const id = "confirmed-guidance";
  const session = practiceSession(1_000_000);
  session.actorCount = count;
  const fake = new FakeFirestore();
  const db = fake as unknown as Firestore;
  let actors = buildRehearsalActors(id, count, 1, session.virtualNow);
  const authority = {organizer: organizer(), actorUid: "host-1"};
  const source = practiceMovementSource(id, session, "event:whole");
  const first = source.destinations.find((d) =>
    d.target.kind === "itineraryStop")!.target;
  assert.ok(first.kind === "itineraryStop");
  const plan = {...practicePlan(session.virtualNow.toMillis()), policy: {
    ...practicePlan(session.virtualNow.toMillis()).policy,
    maxMessagesPerEpisode: cap, destination: {kind: "itineraryStop" as const,
      itineraryId: first.itineraryId, permittedStopIds: ["first", "second"]}},
  guidance: {...practicePlan(session.virtualNow.toMillis()).guidance,
    destination: first, text: "Caller-invented directions"}};
  for (let i = 0; i < count; i++) {
    actors[i] = await db.runTransaction((tx) => applyPracticeHostCommand(db,
      tx, session, actors[i], {kind: "configureAutomation",
        actorId: actors[i].actorId, plan,
        outcomes: [{kind: "delivered"}, {kind: "delivered"},
          {kind: "delivered"}]}, authority));
  }
  const confirm = async (stopId: string) => {
    const next = await db.runTransaction(async (tx) => {
      const review = await practiceMovementReview(db, tx, id, session, actors,
        {groupId: "event:whole"}, authority);
      const target = review.progress.destinations.find((d) =>
        d.target.kind === "itineraryStop" &&
          d.target.stopId === stopId)!.target;
      const change = await preparePracticeMovementCommand(db, tx, id,
        session, actors, {kind: "confirmDeparture",
          expectedSourceHash: review.progress.sourceHash,
          payload: {groupId: "event:whole", destination: target,
            expectedProgressRevision: review.progress.revision}}, authority,
        randomUUID());
      const next = await applyPracticeAutomations(db, tx, session, actors,
        change.confirmedDeparture);
      change.commit();
      return next;
    });
    actors = next;
    session.runtimeRevision++; session.actionCount++;
  };
  const reroute = async (stopId: string) => {
    const next = await db.runTransaction(async (tx) => {
      const review = await practiceMovementReview(db, tx, id, session, actors,
        {groupId: "event:whole"}, authority);
      const target = review.progress.destinations.find((destination) =>
        destination.target.kind === "itineraryStop" &&
          destination.target.stopId === stopId)!;
      const change = await preparePracticeMovementCommand(db, tx, id,
        session, actors, {kind: "changeRoute", payload: {
          groupId: "event:whole", routeRevision: review.progress.revision,
          expectedSourceHash: review.progress.sourceHash,
          alternativeId: target.alternativeId,
          decisionId: "route-choice-" + stopId}}, authority, randomUUID());
      const nextActors = await applyPracticeAutomations(db, tx, session,
        actors, change.routeDecision);
      change.commit();
      return nextActors;
    });
    actors = next;
    session.runtimeRevision++; session.actionCount++;
  };
  const all = () => fake.entries().filter(([p]) =>
    p.startsWith(rehearsalMessages + "/")).map(([, m]) =>
    m as unknown as PracticeMessage);
  const message = (i = 0) => all().find((m) => m.record.messageId ===
    actors[i].assistance?.latestMessageId)!;
  const departures = () => new Map(fake.entries().filter(([p]) =>
    p.startsWith(rehearsalMovements + "/")).map(([, d]) =>
    d as unknown as Movement).sort((a, b) =>
    a.progressRevision - b.progressRevision).map((d) => [d.groupId, d]));
  const advance = async (minutes: number) => {
    session.virtualNow = Timestamp.fromMillis(
      session.virtualNow.toMillis() + minutes * 60000);
    actors = await db.runTransaction((tx) =>
      applyPracticeAutomations(db, tx, session, actors));
  };
  const reply = (m: PracticeMessage) => db.runTransaction((tx) =>
    applyPracticeGuestReply(db, tx, session, actors[0], {
      messageId: m.record.messageId, intentRevision: m.record.intent.revision,
      choiceId: "on-my-way", requestId: randomUUID(), actionId: randomUUID()}));
  return {id, session, fake, db, plan, confirm, reroute, all, message,
    departures, advance, reply, actors: () => actors};
}

test("saved departure starts outreach; caller flags and copy do not",
  async () => {
    const h = await harness();
    assert.equal(h.all().length, 0);
    assert.equal(h.actors()[0].assistanceAutomation?.nextOutcomeIndex, 0);
    await h.advance(10);
    assert.equal(h.all().length, 0);
    await h.confirm("first");
    assert.equal(h.all().length, 2);
    assert.equal(h.message().plan.guidance.text, "Join us at first.");
    assert.equal(h.message().movementBinding?.progressRevision, 1);
    assert.equal(h.message().record.attempts.length, 1);
    assert.ok(h.actors().every((a) => a.status === "expected"));
    assert.equal(practiceMessageView(h.session, h.actors()[0], h.message()),
      null);
  });

test("new stop refreshes the page immediately and retains cooldown and cap",
  async () => {
    for (const cap of [1, 4]) {
      const h = await harness(2, cap);
      await h.confirm("first");
      const original = h.message();
      await h.confirm("second");
      const current = h.message();
      assert.notEqual(current.record.messageId, original.record.messageId);
      assert.equal(current.plan.guidance.text, "Join us at second.");
      assert.equal(current.record.attempts.length, 0);
      assert.equal(practiceMessageView(h.session, h.actors()[0], original,
        h.departures()), null);
      await assert.rejects(h.reply(original), {code: "failed-precondition"});
      await h.advance(6);
      assert.equal(h.message().record.attempts.length, cap === 1 ? 0 : 1);
      assert.equal(h.actors()[0].assistanceAutomation?.nextOutcomeIndex,
        cap === 1 ? 1 : 2);
      const stableId = h.message().record.messageId;
      await h.confirm("second");
      assert.equal(h.message().record.messageId, stableId);
      assert.equal(h.message().record.attempts.length, cap === 1 ? 0 : 1);
      const replied = await h.reply(h.message());
      assert.equal(replied.assistance?.intention.kind, "onMyWay");
      assert.equal(replied.status, "expected");
    }
  });

test("route recovery refreshes guidance without another departure",
  async () => {
    const h = await harness();
    await h.confirm("first");
    const original = h.message();
    await h.reroute("second");
    const current = h.message();
    assert.notEqual(current.record.messageId, original.record.messageId);
    assert.equal(current.plan.guidance.text, "Join us at second.");
    assert.equal(current.movementBinding?.progressRevision, 2);
    assert.equal(h.fake.entries().filter(([path]) =>
      path.startsWith(rehearsalMovements + "/")).length, 1);
    assert.equal(h.fake.entries().filter(([path]) =>
      path.startsWith(rehearsalRouteDecisions + "/")).length, 1);
    const retired = h.all().find((message) =>
      message.record.messageId === original.record.messageId)!;
    assert.equal(retired.record.lifecycle, "superseded");
  });

test(
  "movement proof is private, immutable and historical absence grants nothing",
  async () => {
    const h = await harness(); await h.confirm("first");
    const m = h.message();
    const view = practiceMessageView(h.session, h.actors()[0], m,
      h.departures())!;
    assert.equal("movementBinding" in view, false);
    assert.throws(() => readPracticeMessage({...m, movementBinding: {
      ...m.movementBinding!, progressRevision: 2}}, h.session, h.actors()[0]));
    const legacy = {...m}; delete legacy.movementBinding;
    // Old unbound ordinary messages remain parseable evidence only.
    assert.equal(readPracticeMessage(legacy, h.session, h.actors()[0]), legacy);
    assert.equal(practiceMessageView(h.session, h.actors()[0], legacy,
      h.departures()), null);
    h.session.setup.locationName = "Changed source";
    assert.equal(practiceMessageView(h.session, h.actors()[0], m,
      h.departures()), null);
    await h.advance(10);
    assert.equal(h.message().record.attempts.length, 1);
  });

test("departure and scripted sends commit atomically for every 2-50 roster",
  async () => {
    for (let count = 2; count <= 50; count++) {
      const h = await harness(count);
      const before = h.fake.entries();
      h.fake.failNextCommit = true;
      await assert.rejects(h.confirm("first"), /interruption/u);
      assert.deepEqual(h.fake.entries(), before);
      assert.equal(h.actors()[0].assistanceAutomation?.nextOutcomeIndex, 0);
      await h.confirm("first");
      assert.equal(h.all().length, count);
      assert.ok(h.actors().every((a) =>
        a.assistanceAutomation?.nextOutcomeIndex === 1));
    }
  });

test("Firestore departure retries publish once and later stops refresh guests",
  {
    skip: !process.env.FIRESTORE_EMULATOR_HOST,
  }, async () => {
    const {controlEventRehearsalHandler: control,
      getEventRehearsalMovementHandler: review,
      getEventRehearsalBootstrapHandler: bootstrap} =
      await import("./handlers.js");
    if (!admin.apps.length) {
      admin.initializeApp({projectId: "demo-catch-rules"});
    }
    const db = getEmulatorFirestore();
    const id = randomUUID();
    const session = practiceSession();
    session.organizerId = "departure-guidance-" + id;
    const actors = buildRehearsalActors(id, 2, 1, session.virtualNow);
    const source = practiceMovementSource(id, session, "event:whole");
    const target = source.destinations.find((d) =>
      d.target.kind === "itineraryStop")!.target;
    assert.ok(target.kind === "itineraryStop");
    const plan = {...practicePlan(session.virtualNow.toMillis()), policy: {
      ...practicePlan(session.virtualNow.toMillis()).policy,
      destination: {kind: "itineraryStop" as const,
        itineraryId: target.itineraryId,
        permittedStopIds: ["first", "second"]}},
    guidance: {...practicePlan(session.virtualNow.toMillis()).guidance,
      destination: target}};
    const batch = db.batch();
    batch.set(db.collection("organizers").doc(session.organizerId),
      organizer());
    batch.set(db.collection("eventRehearsals").doc(id), session);
    for (const actor of actors) {
      batch.set(db.collection("eventRehearsalActors")
        .doc(id + "_" + actor.actorId), {...actor, assistanceAutomation: {
        clockId: source.context.clockId, status: "enabled", plan,
        outcomes: [{kind: "delivered"}, {kind: "delivered"}],
        nextOutcomeIndex: 0, evaluation: null}});
    }
    await batch.commit();
    const request = (data: unknown) => ({data,
      auth: {uid: "host-1", token: {}}}) as Parameters<typeof control>[0];
    let current = await bootstrap(request({sessionId: id}));
    assert.equal(current.actors[0].assistanceMessage, undefined);
    const command = async (stopId: string) => {
      const r = await review(request({sessionId: id, expectedSetupRevision: 0,
        scope: {groupId: "event:whole"}}));
      return {sessionId: id, expectedSetupRevision: 0,
        expectedRevision: current.session.runtimeRevision,
        clientActionId: randomUUID(), action: "movement", movement: {
          kind: "confirmDeparture", expectedSourceHash: r.progress.sourceHash,
          payload: {groupId: "event:whole",
            expectedProgressRevision: r.progress.revision,
            destination: r.progress.destinations.find((d) =>
              d.target.kind === "itineraryStop" &&
            d.target.stopId === stopId)!.target}}};
    };
    const first = await command("first");
    const results = await Promise.all([control(request(first)),
      control(request(first))]);
    current = results[0];
    assert.equal(current.session.actionCount, 1);
    assert.equal(results[1].session.runtimeRevision,
      current.session.runtimeRevision);
    assert.equal(current.actors[0].assistanceMessage?.text,
      "Join us at first.");
    assert.equal(current.actors[0].assistanceDelivery?.attempts.length, 1);
    current = await control(request(await command("second")));
    assert.equal(current.actors[0].assistanceMessage?.text,
      "Join us at second.");
    assert.equal(current.actors[0].assistanceDelivery?.attempts.length, 0);
    current = await control(request({sessionId: id,
      expectedRevision: current.session.runtimeRevision,
      clientActionId: randomUUID(), action: "advanceClock", minutes: 6}));
    assert.equal(current.actors[0].assistanceDelivery?.attempts.length, 1);
    const stable = current.actors[0].assistanceMessage!.messageId;
    current = await control(request(await command("second")));
    assert.equal(current.actors[0].assistanceMessage?.messageId, stable);
    assert.equal(current.actors[0].assistanceAutomation?.nextOutcomeIndex, 2);
    assert.equal((await db.collection(rehearsalMessages)
      .where("sessionId", "==", id).get()).size, 4);
    assert.equal((await db.collection("eventAssistanceMessages")
      .where("intent.context.rehearsalId", "==", id).get()).empty, true);
  });


test("fixed entry rules restrict confirmed directions and preserve typed holds",
  async () => {
    for (const entry of ["allowed", "hostDecision", "closed"] as const) {
      const id = "venue-policy-" + entry;
      const session = practiceSession(1_000_000);
      const fake = new FakeFirestore();
      const db = fake as unknown as Firestore;
      let actor = buildRehearsalActors(id, 2, 1, session.virtualNow)[0];
      const authority = {organizer: organizer(), actorUid: "host-1"};
      const base = practicePlan(session.virtualNow.toMillis());
      const plan = {...base, policy: {...base.policy,
        destination: {kind: "fixedPlace" as const, placeId: "meeting",
          lateEntry: entry}}};
      actor = await db.runTransaction((tx) => applyPracticeHostCommand(db, tx,
        session, actor, {kind: "configureAutomation", actorId: actor.actorId,
          plan, outcomes: [{kind: "delivered"}]}, authority));
      assert.equal(actor.assistanceAutomation?.nextOutcomeIndex, 0);
      assert.equal(resolvePracticeGuidance(session, actor, plan, new Map()),
        null);
      const {record, path} = practiceDeparture(session, id);
      fake.write(path, {...record});
      const departures = new Map([["event:whole", record]]);
      const resolved = resolvePracticeGuidance(session, actor, plan,
        departures)!;
      assert.deepEqual(resolved.plan.guidance.destination,
        plan.policy.destination);
      assert.equal(resolved.plan.guidance.materialKey, hash([
        record.departure.sourceHash, plan.policy.destination]));
      assert.deepEqual(record.departure.destination,
        {kind: "fixedPlace", placeId: "meeting", lateEntry: "allowed"});
      [actor] = await db.runTransaction((tx) =>
        applyPracticeAutomations(db, tx, session, [actor]));
      const decision = actor.assistanceAutomation!.evaluation!.policy!;
      assert.equal(decision.kind, entry === "allowed" ? "update" :
        entry === "hostDecision" ? "hostDecision" : "expired");
      if (decision.kind === "hostDecision") {
        assert.equal(decision.reason, "entryDecision");
      }
      if (decision.kind === "expired") {
        assert.equal(decision.reason, "lateEntryClosed");
      }
      assert.equal(actor.assistanceAutomation!.nextOutcomeIndex,
        entry === "allowed" ? 1 : 0);
      assert.equal(fake.entries().filter(([p]) =>
        p.startsWith(rehearsalMessages + "/")).length,
      entry === "allowed" ? 1 : 0);
    }
  });
