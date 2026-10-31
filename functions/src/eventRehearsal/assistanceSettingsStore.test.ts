import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import {EVENT_ASSISTANCE_MESSAGES} from
  "../eventSuccess/operations/firestoreMessageOutbox";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import * as admin from "firebase-admin";
import {harness} from "./movementTestFixtures";
import {practicePlan, savePracticeDeparture} from "./assistanceTestFixtures";
import type {EventRehearsalBootstrapCallableResponse as Bootstrap} from
  "../shared/generated/eventRehearsalBootstrapCallableResponse";

test("practice settings commit once, isolate effects and fence reset",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST}, async () => {
    const {controlEventRehearsalHandler: control,
      getEventRehearsalBootstrapHandler: bootstrap,
      resetEventRehearsalHandler: reset,
      updateEventRehearsalSetupHandler: setup} = await import("./handlers.js");
    if (!admin.apps.length) {
      admin.initializeApp({projectId: "demo-catch-rules"});
    }
    const db = getEmulatorFirestore(); const h = harness();
    h.session.organizerId = "practice-settings-" + h.id;
    h.session.organizerId = h.session.organizerId;
    const sessionRef = db.collection("eventRehearsals").doc(h.id);
    const orgRef = db.collection("organizers").doc(h.session.organizerId);
    const batch = db.batch();
    batch.set(sessionRef, h.session); batch.set(orgRef, h.authority.organizer);
    for (const actor of h.actors) {
      batch.set(db.collection("eventRehearsalActors")
        .doc(h.id + "_" + actor.actorId), actor);
    }
    await batch.commit();
    await savePracticeDeparture(db, h.session, h.id);
    const request = (data: unknown, uid = "host-1") =>
      ({data, auth: {uid, token: {}}}) as Parameters<typeof control>[0];
    let current: Bootstrap = await bootstrap(request({sessionId: h.id}));
    const input = (settings: Record<string, unknown>) => ({sessionId: h.id,
      expectedSetupRevision: current.session.setupRevision,
      expectedRevision: current.session.runtimeRevision,
      clientActionId: randomUUID(), action: "settings",
      settings: {expectedSourceHash: current.settingsReview!.sourceHash,
        ...settings}});
    const p = practicePlan(current.session.virtualNowMillis);
    const configuration = {routes: p.routes, responseDeadline: null,
      deliveryPolicy: p.deliveryPolicy,
      outcomes: [{kind: "unknown", reason: "timeout"}, {kind: "delivered"}]};
    const configure = input({kind: "configure", configuration});
    const results = await Promise.all([control(request(configure)),
      control(request(configure))]);
    assert.ok(results.every((r) => r.session.actionCount === 1));
    current = results[0];
    assert.ok(current.actors.every((a) => !a.assistanceAutomation));
    const rule = input({kind: "setRule", groupId: "event:whole",
      preference: {kind: "configured", template: {
        ...current.settingsReview!.suggested,
        setting: {kind: "enabled", authority: "executeWithinPolicy"}}}});
    current = await control(request(rule));
    assert.equal(current.session.actionCount, 2);
    assert.ok(current.actors.every((a) =>
      a.assistanceAutomation?.origin === "eventSettings"));
    const attempts = current.actors.map((a) =>
      a.assistanceAutomation!.nextOutcomeIndex);
    assert.ok(attempts.some((count) => count === 1));
    const messages = await db.collection("eventRehearsalMessages")
      .where("sessionId", "==", h.id).get();
    assert.ok(messages.docs.every((doc) =>
      doc.get("record.intent.context.mode") === "rehearsal"));
    const pause = input({kind: "pause"});
    current = await control(request(pause));
    const replay = await control(request(rule));
    assert.equal(replay.settingsReview!.runtime!.status, "paused");
    assert.equal(replay.session.actionCount, 3);
    assert.deepEqual(replay.actors.map((a) =>
      a.assistanceAutomation!.nextOutcomeIndex), attempts);
    assert.equal((await db.collection(EVENT_ASSISTANCE_MESSAGES)
      .where("intent.context.organizerId", "==", h.session.organizerId)
      .get()).empty, true);
    await assert.rejects(control(request({...pause, settings: {
      ...pause.settings, kind: "configure"}})), {code: "invalid-argument"});
    await assert.rejects(control(request({...pause, settings: {
      ...pause.settings, expectedSourceHash: "0".repeat(64)}})),
    {code: "aborted"});
    await orgRef.update({hostUserId: "host-2", ownerUserId: "host-2",
      hostUserIds: ["host-2"], hostProfiles: []});
    await assert.rejects(control(request(pause)), {code: "permission-denied"});
    await reset(request({sessionId: h.id, fork: false, seed: null}, "host-2"));
    assert.equal((await sessionRef.get()).get("assistanceSettings"), undefined);
    await assert.rejects(control(request(pause, "host-2")), {code: "aborted"});
    current = await bootstrap(request({sessionId: h.id}, "host-2"));
    assert.equal(current.settingsReview!.runtime, null);
    const again = input({kind: "configure",
      configuration});
    current = await control(request(again, "host-2"));
    await setup(request({sessionId: h.id,
      expectedRevision: current.session.setupRevision,
      scenarioId: current.session.scenarioId, actorCount: h.session.actorCount,
      setup: h.session.setup}, "host-2"));
    assert.equal((await sessionRef.get()).get("assistanceSettings"), undefined);
  });
