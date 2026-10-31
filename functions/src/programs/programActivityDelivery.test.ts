import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import type {Firestore} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {dispatchMomentRun, runMomentSweep} from "../moments/momentRunner";
import {buildMomentRunnerDeps} from "../moments/momentWiring";
import {listProgramStaffAttentionHandler} from "./programStaffAttention";
import {programActivityIntent, recoverProgramActivityJournals} from
  "./programActivityDelivery";
import {newProgramDeliveryRecord} from
  "./programDelivery";
import {ACTIVITY_NOW, ACTIVITY_WINDOW, activityFirestore, activityHarness,
  activityItems, activityRecord, activityRequest} from
  "./programActivityFixture";
import {contractValidator} from "../shared/contractTestValidators";

const validateOrganizerMomentSendDocument =
  contractValidator("OrganizerMomentSendDocument");

function runnerHarness(request = activityRequest) {
  const h = activityHarness(activityFirestore(request), request);
  const deps = buildMomentRunnerDeps({
    firestore: () => h.db as unknown as Firestore,
    nowMillis: () => h.clock.now, sendProgramFcm: h.send,
    pushCopyFor: async () => request.copy});
  const sends = () => [...h.db.docs].filter(([path]) =>
    path.startsWith("organizerMomentSends/"));
  return {...h, deps, sends,
    dispatch: () => dispatchMomentRun(deps, request.run.runId)};
}

for (const change of ["copyAndCap", "expired", "deletedMoment", "deletedScope",
  "changedOwner", "revision"] as const) {
  test(`journal recovery preserves accepted truth after ${change}`,
    async () => {
      const h = runnerHarness();
      const create = h.db.createDoc.bind(h.db);
      let failJournal = true;
      h.db.createDoc = (path, data) => {
        if (failJournal && path.startsWith("organizerMomentSends/")) {
          throw new Error("journal unavailable");
        }
        create(path, data);
      };
      await assert.rejects(h.dispatch(), /journal unavailable/);
      assert.equal(h.messages.length, 1);
      assert.equal(activityRecord(h.db).attempts[0].state.kind, "accepted");
      assert.equal(h.sends().length, 0);
      assert.equal(h.db.getDoc(
        `organizerMomentRuns/${activityRequest.run.runId}`)
        ?.status, "planned");
      failJournal = false;
      h.db.setDoc("users/staff", {prefsRunStatusUpdates: false});
      h.deps.pushCopyFor = async () => {
        throw new Error("Do not recompose");
      };
      h.deps.loadConsentFacts = async () =>
        ({communicationPermission: "optedOut"});
      if (change === "copyAndCap") {
        h.db.updateDoc("organizerPrograms/prog",
          {messagingDailyCap: 1});
      }
      if (change === "expired") h.clock.now += ACTIVITY_WINDOW + 1;
      if (change === "deletedMoment") {
        h.db.deleteDoc("organizerMoments/m_flight");
      }
      if (change === "deletedScope") h.db.deleteDoc("organizerPrograms/prog");
      if (change === "changedOwner") {
        h.db.updateDoc("organizerPrograms/prog",
          {createdBy: "another", organizerId: "another-org"});
      }
      if (change === "revision") {
        h.db.updateDoc("organizerMoments/m_flight",
          {revision: 4});
      }
      await h.dispatch();
      assert.equal(h.messages.length, 1);
      assert.equal(h.sends().length, 1);
      assert.equal(h.sends()[0][1].decision, "sent");
      assert.equal(h.sends()[0][1].deliveryState, "accepted");
      assert.equal(h.sends()[0][1].createdAtMillis, ACTIVITY_NOW);
      assert.equal(h.sends()[0][1].deliveryMessageId,
        activityRecord(h.db).messageId);
    });
}

test("unknown outcome plus journal failure is repaired by the existing sweep",
  async () => {
    const h = runnerHarness();
    const deps = buildMomentRunnerDeps({firestore: h.deps.firestore,
      nowMillis: h.deps.nowMillis, pushCopyFor: h.deps.pushCopyFor,
      sendProgramFcm: async (message) => {
        h.messages.push(message);
        throw new Error("SDK outcome unknown");
      }});
    const create = h.db.createDoc.bind(h.db);
    let fail = true;
    h.db.createDoc = (path, data) => {
      if (fail && path.startsWith("organizerMomentSends/")) {
        throw new Error("journal");
      }
      create(path, data);
    };
    await assert.rejects(dispatchMomentRun(deps, activityRequest.run.runId),
      /journal/);
    assert.equal(activityRecord(h.db).attempts[0].state.kind, "unknown");
    fail = false;
    h.clock.now += ACTIVITY_WINDOW + 1;
    h.db.deleteDoc("organizerMoments/m_flight");
    const summary = await runMomentSweep(deps);
    assert.equal(summary.runsFailed, 0);
    assert.equal(h.messages.length, 1);
    assert.equal(h.sends()[0][1].deliveryState, "unknown");
  });

test("activity-only attention is suppressed and readable by staff",
  async () => {
    const request = {...activityRequest, moment: {...activityRequest.moment,
      action: {kind: "staffAttention" as const, duty: "airportGreeter",
        severity: "urgent" as const, titleTemplate: "Airport staffing gap"}},
    copy: {title: "Airport staffing gap", body: "Airport staffing gap"}};
    const h = runnerHarness(request);
    h.db.setDoc("users/staff", {});
    h.db.setDoc("organizers/org-1", {name: "Organizer"});
    await h.dispatch();
    const row = h.sends()[0][1];
    assert.equal(row.decision, "suppressed");
    assert.equal(row.reason, "noEndpoint");
    assert.equal(row.actionKind, "staffAttention");
    assert.equal(h.messages.length, 0);
    assert.equal(activityItems(h.db).length, 1);
    const projection = await listProgramStaffAttentionHandler({
      auth: {uid: "mgr"}, data: {programId: "prog"},
    } as CallableRequest, {firestore: () => h.db as unknown as Firestore,
      checkRateLimit: async () => {},
      now: () => admin.firestore.Timestamp.fromMillis(ACTIVITY_NOW)});
    assert.equal(projection.items.length, 1);
    assert.equal(projection.items[0].title, "Airport staffing gap");
    assert.equal(projection.items[0].severity, "urgent");
    const run = h.db.getDoc(`organizerMomentRuns/${request.run.runId}`)!;
    assert.equal(run.sent, 0);
    assert.deepEqual(run.suppressed, {noEndpoint: 1});
  });

test("receipt repair pages all recipients and preserves journals",
  async () => {
    const h = activityHarness();
    await h.deliver();
    for (let index = 0; index < 101; index++) {
      const uid = `staff-${index}`;
      const db = activityFirestore();
      const request = {...activityRequest, recipient: {
        recipientKey: `uid:${uid}`, endpoint: {kind: "uid" as const, uid,
          fcmToken: "token-1"}, householdId: null}};
      db.setDoc(`users/${uid}`, {fcmToken: "token-1"});
      db.setDoc(`programStaffGrants/prog__${uid}`, {
        ...db.getDoc("programStaffGrants/prog__staff"), uid});
      await activityHarness(db, request).deliver();
      const actual = activityRecord(db);
      h.db.setDoc(`programDeliveryMessages/${actual.messageId}`, {...actual});
    }
    const preserve = "organizerMomentSends/" +
      activityRequest.run.runId + "_uid:staff";
    h.db.setDoc(preserve, {decision: "sent", immutable: "earlier journal"});
    assert.equal(await recoverProgramActivityJournals(
      h.db as unknown as Firestore,
      activityRequest.run, async () => "1970-01-01"), 101);
    assert.deepEqual(h.db.getDoc(preserve),
      {decision: "sent", immutable: "earlier journal"});
    assert.equal(await recoverProgramActivityJournals(
      h.db as unknown as Firestore,
      activityRequest.run, async () => "1970-01-01"), 0);
  });

test("same message identity cannot replace the frozen activity descriptor",
  async () => {
    const h = activityHarness();
    await h.deliver();
    await assert.rejects(h.deliver({moment: {...activityRequest.moment,
      action: {kind: "push", notificationType: "eventReminder",
        preferenceKey: "eventReminders"}}}), /source binding changed/);
    assert.equal(h.messages.length, 1);
  });

test("uncommitted intent with expired window is not journaled as sent",
  async () => {
    const h = runnerHarness();
    const intent = programActivityIntent(activityRequest);
    const record = newProgramDeliveryRecord(intent, ACTIVITY_NOW);
    h.db.setDoc(`programDeliveryMessages/${record.messageId}`, {...record});
    h.clock.now += ACTIVITY_WINDOW;
    await h.dispatch();
    assert.equal(h.messages.length, 0);
    assert.equal(h.sends().length, 1);
    assert.equal(h.sends()[0][1].decision, "suppressed");
    assert.equal(h.sends()[0][1].reason, "expired");
  });

test("competing terminalization cannot strand an in-flight receipt journal",
  async () => {
    const h = runnerHarness();
    let signalEarlyRead!: () => void;
    const earlyRead = new Promise<void>((resolve) => {
      signalEarlyRead = resolve;
    });
    let releaseTerminal!: () => void;
    const terminalBarrier = new Promise<void>((resolve) => {
      releaseTerminal = resolve;
    });
    let signalProvider!: () => void;
    const providerEntered = new Promise<void>((resolve) => {
      signalProvider = resolve;
    });
    let releaseProvider!: () => void;
    const providerBarrier = new Promise<void>((resolve) => {
      releaseProvider = resolve;
    });
    const competing = {...h.deps, quietEndMillis: async () => {
      signalEarlyRead();
      await terminalBarrier;
      return ACTIVITY_NOW + ACTIVITY_WINDOW + 1;
    }};
    const sender = buildMomentRunnerDeps({firestore: h.deps.firestore,
      nowMillis: h.deps.nowMillis, pushCopyFor: h.deps.pushCopyFor,
      sendProgramFcm: async (message) => {
        h.messages.push(message);
        signalProvider();
        await providerBarrier;
        return "projects/test/messages/accepted";
      }});
    const create = h.db.createDoc.bind(h.db);
    let failJournal = true;
    h.db.createDoc = (path, data) => {
      if (failJournal && path.startsWith("organizerMomentSends/")) {
        throw new Error("journal interrupted");
      }
      create(path, data);
    };
    const b = dispatchMomentRun(competing, activityRequest.run.runId);
    await earlyRead; // B saw no committed outcome before A starts.
    const a = dispatchMomentRun(sender, activityRequest.run.runId);
    await providerEntered; // A has atomically claimed unknown.
    releaseTerminal();
    const bResult = await b;
    releaseProvider();
    await assert.rejects(a, /journal interrupted/);
    assert.equal(bResult, "deferred");
    assert.equal(h.db.getDoc(
      `organizerMomentRuns/${activityRequest.run.runId}`)
      ?.status, "planned");
    failJournal = false;
    h.clock.now += 5 * 60_000;
    const sweep = await runMomentSweep(h.deps);
    assert.equal(sweep.runsFailed, 0);
    assert.equal(h.sends().length, 1);
    assert.equal(h.sends()[0][1].deliveryState, "accepted");
    assert.equal(h.messages.length, 1);
  });

test("paused pre-I/O claim can prove permit expiry and retry without duplicate",
  async () => {
    const h = runnerHarness();
    const transact = h.db.runTransaction.bind(h.db);
    let signalClaim!: () => void;
    const claimed = new Promise<void>((resolve) => {
      signalClaim = resolve;
    });
    let releaseClaim!: () => void;
    const barrier = new Promise<void>((resolve) => {
      releaseClaim = resolve;
    });
    let pause = true;
    let permitUntil = 0;
    h.db.runTransaction = async (callback) => {
      const result = await transact(callback);
      if (pause && result && typeof result === "object" &&
          "kind" in result && result.kind === "claimed" && "permit" in result) {
        pause = false;
        permitUntil = (result.permit as {validUntil: number}).validUntil;
        signalClaim();
        await barrier;
      }
      return result;
    };
    const a = h.dispatch();
    await claimed;
    assert.equal(await h.dispatch(), "deferred");
    assert.equal(h.sends()[0][1].deliveryState, "unknown");
    assert.equal(h.messages.length, 0);
    h.clock.now = permitUntil;
    releaseClaim();
    assert.equal(await a, "deferred");
    assert.equal(activityRecord(h.db).attempts[0].state.kind, "notDispatched");
    const item = activityItems(h.db)[0];
    h.db.updateDoc(item[0], {readAt: h.clock.now});
    await recoverProgramActivityJournals(h.db as unknown as Firestore,
      activityRequest.run, async () => "1970-01-01");
    assert.equal(h.sends()[0][1].decision, "suppressed");
    assert.equal(h.sends()[0][1].deliveryState, "notDispatched");
    assert.equal(validateOrganizerMomentSendDocument(h.sends()[0][1]), true);
    h.clock.now += 60_000;
    const sweep = await runMomentSweep(h.deps);
    assert.equal(sweep.runsFailed, 0);
    assert.equal(h.messages.length, 1);
    assert.deepEqual(activityRecord(h.db).attempts.map((a) => a.state.kind),
      ["notDispatched", "accepted"]);
    assert.equal(h.sends()[0][1].decision, "sent");
    assert.equal(h.sends()[0][1].deliveryState, "accepted");
    assert.equal(activityItems(h.db)[0][1].readAt, permitUntil);
  });

test("in-flight unknown journal cannot close before late SDK acceptance",
  async () => {
    const h = runnerHarness();
    let enter!: () => void;
    const entered = new Promise<void>((resolve) => {
      enter = resolve;
    });
    let resume!: () => void;
    const barrier = new Promise<void>((resolve) => {
      resume = resolve;
    });
    const sender = buildMomentRunnerDeps({firestore: h.deps.firestore,
      nowMillis: h.deps.nowMillis, pushCopyFor: h.deps.pushCopyFor,
      sendProgramFcm: async (message) => {
        h.messages.push(message); enter(); await barrier;
        return "projects/test/messages/late-accepted";
      }});
    const a = dispatchMomentRun(sender, activityRequest.run.runId)
      .then(() => null, (error: Error) => error);
    await entered;
    assert.equal(await h.dispatch(), "deferred");
    assert.equal(h.sends()[0][1].deliveryState, "unknown");
    h.clock.now += ACTIVITY_WINDOW + 1;
    const afterExpiry = await h.dispatch();
    const update = h.db.updateDoc.bind(h.db);
    let fail = true;
    h.db.updateDoc = (path, data) => {
      if (fail && path.startsWith("organizerMomentSends/")) {
        throw new Error("late journal unavailable");
      }
      update(path, data);
    };
    resume();
    assert.match((await a)?.message ?? "", /late journal unavailable/);
    assert.equal(activityRecord(h.db).attempts[0].state.kind, "accepted");
    assert.equal(afterExpiry, "deferred");
    assert.equal(h.db.getDoc(
      `organizerMomentRuns/${activityRequest.run.runId}`)?.status, "planned");
    fail = false;
    h.clock.now += 5 * 60_000;
    await runMomentSweep(h.deps);
    assert.equal(h.sends()[0][1].deliveryState, "accepted");
    assert.equal(h.messages.length, 1);
  });

test("a full page of held receipts cannot starve newly due activity",
  async () => {
    const h = runnerHarness();
    await h.deliver();
    const source = activityRecord(h.db);
    h.db.deleteDoc(`programDeliveryMessages/${source.messageId}`);
    h.messages.length = 0;
    for (let index = 0; index < 200; index++) {
      const run = {...activityRequest.run,
        runId: "travel_v1_" + index.toString(16).padStart(64, "0")};
      const intent = programActivityIntent({...activityRequest, run});
      const record = newProgramDeliveryRecord(intent, ACTIVITY_NOW);
      record.attempts = [{...source.attempts[0], intentId: intent.intentId,
        state: {kind: "unknown", at: ACTIVITY_NOW, providerMessageId: null,
          reason: "workerInterrupted",
          reconcileAfter: ACTIVITY_NOW + 120_000}}];
      h.db.setDoc(`programDeliveryMessages/${record.messageId}`, {...record});
      h.db.setDoc(`organizerMomentRuns/${run.runId}`, {...run});
    }
    h.clock.now += ACTIVITY_WINDOW + 1;
    const healthy = {...activityRequest.run, dueAtMillis: h.clock.now,
      expiresAtMillis: h.clock.now + ACTIVITY_WINDOW,
      travelOccurrence: {...activityRequest.run.travelOccurrence!,
        createdAtMillis: h.clock.now, occurredAtMillis: h.clock.now}};
    h.db.setDoc(`organizerMomentRuns/${healthy.runId}`, {...healthy});
    h.db.setDoc("users/healthy", {fcmToken: "healthy-token"});
    h.db.setDoc("programStaffGrants/prog__healthy", {
      ...h.db.getDoc("programStaffGrants/prog__staff"), uid: "healthy"});
    const first = await runMomentSweep(h.deps);
    assert.equal(first.runsDeferred, 200);
    assert.equal(first.runsFailed, 0);
    assert.equal(h.messages.length, 0);
    const held = h.db.getDoc(
      "organizerMomentRuns/travel_v1_" + "0".repeat(64))!;
    assert.equal(held.dueAtMillis, h.clock.now + 5 * 60_000);
    assert.equal(held.expiresAtMillis, ACTIVITY_NOW + ACTIVITY_WINDOW);
    assert.deepEqual(held.travelOccurrence,
      activityRequest.run.travelOccurrence);
    const second = await runMomentSweep(h.deps);
    assert.equal(second.runsFired, 1);
    assert.equal(second.runsFailed, 0);
    assert.equal(h.messages.length, 1);
    assert.equal("token" in h.messages[0] && h.messages[0].token,
      "healthy-token");
  });
