import assert from "node:assert/strict";
import test from "node:test";
import {createHash, randomUUID} from "node:crypto";
import {initializeApp, deleteApp} from "firebase-admin/app";
import {Timestamp, type Firestore, type Transaction} from
  "firebase-admin/firestore";
import type {Message} from "firebase-admin/messaging";
import {getEmulatorFirestore} from "../shared/testing/emulatorFirestore";
import {momentToDocument} from "../moments/momentDocuments";
import {dispatchMomentRun, ingestTravelLegEvent} from
  "../moments/momentRunner";
import {buildMomentRunnerDeps} from "../moments/momentWiring";
import {travelOccurrenceId, type TravelLegEvent} from
  "../moments/momentConditions";
import {FirestoreDeliveryOutbox} from "../delivery/firestoreDeliveryOutbox";
import {programDeliveryAdapter, programDeliveryMessageId,
  parseProgramDeliveryRecord} from "./programDelivery";
import {deliverProgramActivity, programActivityIntent,
  recoverProgramActivityJournals} from "./programActivityDelivery";
import {prepareProgramActivityChannel} from "./programActivityChannel";
import {ACTIVITY_NOW, ACTIVITY_WINDOW, activityRequest} from
  "./programActivityFixture";

function latch() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {promise, release};
}

/** Only inject failures around real SDK transactions, never emulate commits. */
async function fixture() {
  const id = randomUUID();
  const app = initializeApp({projectId: "demo-catch-rules"}, id);
  const raw = getEmulatorFirestore(app);
  const programId = `activity-program-${id}`;
  const organizerId = `activity-org-${id}`;
  const momentId = `activity-moment-${id}`;
  const uid = `activity-staff-${id}`;
  const runId = "travel_v1_" + createHash("sha256").update(id).digest("hex");
  const request = {...activityRequest,
    moment: {...activityRequest.moment, momentId,
      scope: {kind: "program" as const, programId}},
    run: {...activityRequest.run, runId, momentId},
    facts: {...activityRequest.facts,
      scope: {...activityRequest.facts.scope, organizerId}},
    recipient: {recipientKey: `uid:${uid}`,
      endpoint: {kind: "uid" as const, uid, fcmToken: "synthetic-token"},
      householdId: null}};
  const clock = {now: ACTIVITY_NOW};
  const controls: {failJournal: boolean;
    afterTransaction: (result: unknown) => Promise<void>} = {
      failJournal: false, afterTransaction: async () => {}};
  const db = new Proxy(raw, {get(target, property) {
    if (property === "runTransaction") {
      return async (callback: (tx: Transaction) => Promise<unknown>) => {
        const result = await target.runTransaction((tx) => callback(
          new Proxy(tx, {get(transaction, member) {
            if (member === "create" || member === "update") {
              return (...args: unknown[]) => {
                if (controls.failJournal &&
                    (args[0] as {path: string}).path
                      .startsWith("organizerMomentSends/")) {
                  throw new Error("synthetic journal interruption");
                }
                return Reflect.apply(Reflect.get(transaction, member),
                  transaction, args);
              };
            }
            const value = Reflect.get(transaction, member);
            return typeof value === "function" ?
              value.bind(transaction) : value;
          }})));
        await controls.afterTransaction(result);
        return result;
      };
    }
    const value = Reflect.get(target, property);
    return typeof value === "function" ? value.bind(target) : value;
  }}) as Firestore;
  const program = raw.doc(`organizerPrograms/${programId}`);
  const moment = raw.doc(`organizerMoments/${momentId}`);
  const run = raw.doc(`organizerMomentRuns/${runId}`);
  const grant = raw.doc(`programStaffGrants/${programId}__${uid}`);
  const user = raw.doc(`users/${uid}`);
  const journal = raw.doc(`organizerMomentSends/${runId}_uid:${uid}`);
  const item = raw.doc(`notifications/${uid}/items/organizerUpdate_${runId}`);
  const until = ACTIVITY_NOW + 2 * ACTIVITY_WINDOW;
  const batch = raw.batch();
  batch.set(program, {organizerId, status: "active", title: "Synthetic travel",
    kind: "wedding", timezone: "UTC", revision: 1, createdBy: "mgr",
    startsAt: Timestamp.fromMillis(ACTIVITY_NOW - 1),
    endsAt: Timestamp.fromMillis(until), capabilities: ["messaging"]});
  batch.set(moment, momentToDocument(request.moment, ACTIVITY_NOW, true));
  batch.set(run, request.run);
  batch.set(grant, {programId, organizerId, uid, status: "active",
    createdBy: "mgr", revision: 1, expiresAt: Timestamp.fromMillis(until),
    duties: [{duty: "airportGreeter", pickupPointIds: ["airport"],
      hotelIds: [], expiresAtMillis: until}]});
  batch.set(user, {fcmToken: "synthetic-token"});
  await batch.commit();
  const messages: Message[] = [];
  const send = async (message: Message) => {
    messages.push(message);
    return `projects/synthetic/messages/${messages.length}`;
  };
  const deps = buildMomentRunnerDeps({firestore: () => db,
    nowMillis: () => clock.now, sendProgramFcm: send,
    pushCopyFor: async () => request.copy});
  const messageId = programDeliveryMessageId(programActivityIntent(request));
  const record = async () => parseProgramDeliveryRecord(
    (await raw.doc(`deliveryMessages/${messageId}`).get()).data());
  return {db, raw, request, clock, controls, program, moment, run, grant,
    user, journal, item, messages, send, deps, messageId, record,
    deliver: () => deliverProgramActivity({...request, db,
      now: () => clock.now, send}),
    dispatch: () => dispatchMomentRun(deps, runId),
    close: async () => {
      // Every query is scoped to this fixture's UUID; no shared reset/clear.
      const rows = await Promise.all([
        raw.collection("deliveryMessages")
          .where("intent.programId", "==", programId).get(),
        raw.collection("organizerMomentRuns")
          .where("momentId", "==", momentId).get(),
        raw.collection("organizerMomentSends")
          .where("momentId", "==", momentId).get(),
        raw.collection(`notifications/${uid}/items`).get(),
      ]);
      await Promise.all([...rows.flatMap((row) =>
        row.docs.map((doc) => doc.ref.delete())),
      program.delete(), moment.delete(), grant.delete(), user.delete()]);
      await raw.terminate();
      await deleteApp(app);
    }};
}

test("Firestore concurrent travel events deliver once per stable occurrence",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 30_000}, async () => {
    const h = await fixture();
    try {
      const event: TravelLegEvent = {kind: "travelLegFlightStatusChanged",
        programId: h.request.moment.scope.programId, legId: "synthetic-leg",
        previousFlightStatus: "scheduled", flightStatus: "cancelled",
        source: "synthetic/programTravelLegs", eventId: "same-event",
        observedAtMillis: ACTIVITY_NOW - 100};
      await Promise.all([ingestTravelLegEvent(h.deps, event),
        ingestTravelLegEvent(h.deps, event)]);
      const runId = travelOccurrenceId(h.request.moment, event);
      assert.equal(h.messages.length, 1);
      const original = (await h.raw.doc(`organizerMomentRuns/${runId}`)
        .get()).data()!;
      assert.equal(original.travelOccurrence.momentRevision, 3);
      await h.moment.update({revision: 4});
      h.clock.now += 60_000;
      await ingestTravelLegEvent(h.deps, event);
      assert.equal(h.messages.length, 1);
      assert.deepEqual((await h.raw.doc(`organizerMomentRuns/${runId}`)
        .get()).data(), original);
      await ingestTravelLegEvent(h.deps, {...event, eventId: "new-event",
        observedAtMillis: h.clock.now});
      assert.equal(h.messages.length, 2);
      const receipts = await h.raw.collection("deliveryMessages")
        .where("intent.programId", "==", event.programId).get();
      assert.equal(receipts.size, 2);
      for (const receipt of receipts.docs) {
        assert.deepEqual(parseProgramDeliveryRecord(receipt.data()).attempts
          .map((attempt) => attempt.state.kind), ["accepted"]);
      }
    } finally {
      await h.close();
    }
  });

test("Firestore rechecks revocation after a real reservation",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 30_000},
  async () => {
    const h = await fixture();
    try {
      const intent = programActivityIntent(h.request);
      const channel = prepareProgramActivityChannel(h.db, intent, h.send,
        () => h.clock.now);
      assert.equal(channel.kind, "ready");
      if (channel.kind !== "ready") throw new Error("Expected channel");
      const outbox = new FirestoreDeliveryOutbox(h.db, programDeliveryAdapter,
        channel.readFacts, () => h.clock.now);
      await outbox.enqueue(intent);
      const reserved = await outbox.reserve(h.messageId);
      assert.equal(reserved.decision.kind, "dispatch");
      await h.grant.update({status: "revoked"});
      const result = await channel.dispatchReserved(outbox, h.messageId,
        reserved.record.attempts[0].attemptId);
      assert.equal(result.kind, "withheld");
      assert.equal(h.messages.length, 0);
      assert.equal((await h.item.get()).exists, false);
      assert.equal((await h.record()).attempts[0].state.kind, "reserved");
    } finally {
      await h.close();
    }
  });

test("Firestore unknown receipt repairs after journal failure without resend",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 30_000}, async () => {
    const h = await fixture();
    try {
      const sender = buildMomentRunnerDeps({firestore: () => h.db,
        nowMillis: () => h.clock.now, pushCopyFor: h.deps.pushCopyFor,
        sendProgramFcm: async (message) => {
          h.messages.push(message);
          throw new Error("synthetic unknown provider outcome");
        }});
      h.controls.failJournal = true;
      await assert.rejects(dispatchMomentRun(sender, h.request.run.runId),
        /synthetic journal interruption/);
      assert.equal((await h.record()).attempts[0].state.kind, "unknown");
      assert.equal((await h.run.get()).data()?.status, "planned");
      assert.equal((await h.item.get()).exists, true);
      assert.equal((await h.journal.get()).exists, false);
      h.controls.failJournal = false;
      h.clock.now += ACTIVITY_WINDOW + 1;
      await h.moment.delete();
      await h.user.set({prefsRunStatusUpdates: false});
      await h.dispatch();
      assert.equal((await h.journal.get()).data()?.deliveryState, "unknown");
      assert.equal(h.messages.length, 1);
      assert.equal((await h.record()).attempts.length, 1);
    } finally {
      await h.close();
    }
  });

test("Firestore terminalization cannot strand accepted journal evidence",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 30_000}, async () => {
    const h = await fixture();
    const early = latch();
    const terminal = latch();
    const entered = latch();
    const provider = latch();
    try {
      h.controls.failJournal = true;
      const competing = {...h.deps, quietEndMillis: async () => {
        early.release(); await terminal.promise;
        return ACTIVITY_NOW + ACTIVITY_WINDOW + 1;
      }};
      const sender = buildMomentRunnerDeps({firestore: () => h.db,
        nowMillis: () => h.clock.now, pushCopyFor: h.deps.pushCopyFor,
        sendProgramFcm: async (message) => {
          h.messages.push(message); entered.release(); await provider.promise;
          return "projects/synthetic/messages/accepted";
        }});
      const b = dispatchMomentRun(competing, h.request.run.runId);
      await early.promise;
      const a = dispatchMomentRun(sender, h.request.run.runId);
      const rejected = assert.rejects(a, /synthetic journal interruption/);
      await entered.promise;
      terminal.release();
      assert.equal(await b, "deferred");
      provider.release();
      await rejected;
      assert.equal((await h.run.get()).data()?.status, "planned");
      assert.equal((await h.record()).attempts[0].state.kind, "accepted");
      h.controls.failJournal = false;
      h.clock.now += ACTIVITY_WINDOW + 1;
      await h.dispatch();
      assert.equal((await h.journal.get()).data()?.deliveryState, "accepted");
      assert.equal(h.messages.length, 1);
    } finally {
      terminal.release(); provider.release(); await h.close();
    }
  });

test("Firestore pre-I/O expiry corrects unknown projection and safely retries",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 30_000}, async () => {
    const h = await fixture();
    const claimed = latch();
    const resume = latch();
    let permitUntil = 0;
    let pause = true;
    try {
      h.controls.afterTransaction = async (result) => {
        if (pause && result && typeof result === "object" &&
            "kind" in result && result.kind === "claimed" &&
            "permit" in result) {
          pause = false;
          permitUntil = (result.permit as {validUntil: number}).validUntil;
          claimed.release(); await resume.promise;
        }
      };
      const a = h.dispatch();
      await claimed.promise;
      assert.equal(await h.dispatch(), "deferred");
      assert.equal((await h.journal.get()).data()?.deliveryState, "unknown");
      assert.equal((await h.item.get()).exists, true);
      assert.equal(h.messages.length, 0);
      h.clock.now = permitUntil;
      resume.release();
      assert.equal(await a, "deferred");
      assert.equal((await h.record()).attempts[0].state.kind, "notDispatched");
      await h.item.update({readAt: Timestamp.fromMillis(permitUntil)});
      await recoverProgramActivityJournals(h.db, h.request.run,
        async () => "1970-01-01");
      assert.equal((await h.journal.get()).data()?.deliveryState,
        "notDispatched");
      h.clock.now += 60_000;
      await h.dispatch();
      assert.deepEqual((await h.record()).attempts.map((attempt) =>
        attempt.state.kind), ["notDispatched", "accepted"]);
      assert.equal((await h.journal.get()).data()?.deliveryState, "accepted");
      assert.equal((await h.item.get()).data()?.readAt.toMillis(), permitUntil);
      assert.equal(h.messages.length, 1);
    } finally {
      resume.release(); await h.close();
    }
  });

test("Firestore keeps an in-flight unknown journal repairable beyond expiry",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 30_000}, async () => {
    const h = await fixture();
    const entered = latch();
    const provider = latch();
    try {
      const sender = buildMomentRunnerDeps({firestore: () => h.db,
        nowMillis: () => h.clock.now, pushCopyFor: h.deps.pushCopyFor,
        sendProgramFcm: async (message) => {
          h.messages.push(message); entered.release(); await provider.promise;
          return "projects/synthetic/messages/late-accepted";
        }});
      const a = dispatchMomentRun(sender, h.request.run.runId)
        .then(() => null, (error: Error) => error);
      await entered.promise;
      assert.equal(await h.dispatch(), "deferred");
      assert.equal((await h.journal.get()).data()?.deliveryState, "unknown");
      h.clock.now += ACTIVITY_WINDOW + 1;
      const afterExpiry = await h.dispatch();
      h.controls.failJournal = true;
      provider.release();
      assert.match((await a)?.message ?? "", /synthetic journal interruption/);
      assert.equal((await h.record()).attempts[0].state.kind, "accepted");
      assert.equal(afterExpiry, "deferred");
      assert.equal((await h.run.get()).data()?.status, "planned");
      h.controls.failJournal = false;
      await h.dispatch();
      assert.equal((await h.journal.get()).data()?.deliveryState, "accepted");
      assert.equal(h.messages.length, 1);
    } finally {
      provider.release(); await h.close();
    }
  });

test("Firestore enforces three definitely-unsent attempts and no fourth",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 30_000}, async () => {
    const h = await fixture();
    try {
      const intent = programActivityIntent(h.request);
      const channel = prepareProgramActivityChannel(h.db, intent, h.send,
        () => h.clock.now);
      if (channel.kind !== "ready") throw new Error("Expected channel");
      const outbox = new FirestoreDeliveryOutbox(h.db, programDeliveryAdapter,
        channel.readFacts, () => h.clock.now);
      await outbox.enqueue(intent);
      for (let ordinal = 1; ordinal <= 3; ordinal++) {
        const reserved = await outbox.reserve(h.messageId);
        assert.equal(reserved.decision.kind, "dispatch");
        assert.equal(reserved.record.attempts.at(-1)?.ordinal, ordinal);
        h.clock.now += 120_000;
        await outbox.reserve(h.messageId);
        h.clock.now += 60_000 * 2 ** (ordinal - 1);
      }
      const fourth = await outbox.reserve(h.messageId);
      assert.deepEqual(fourth.decision,
        {kind: "hostDecision", reason: "attemptLimit"});
      assert.equal((await h.record()).attempts.length, 3);
      assert.ok((await h.record()).attempts.every((attempt) =>
        attempt.state.kind === "notDispatched"));
      assert.equal(h.messages.length, 0);
      assert.equal((await h.item.get()).exists, false);
    } finally {
      await h.close();
    }
  });

test("Firestore deferral cannot renew the original six-hour send window",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 30_000}, async () => {
    const h = await fixture();
    try {
      const intent = programActivityIntent(h.request);
      const channel = prepareProgramActivityChannel(h.db, intent, h.send,
        () => h.clock.now);
      if (channel.kind !== "ready") throw new Error("Expected channel");
      const outbox = new FirestoreDeliveryOutbox(h.db, programDeliveryAdapter,
        channel.readFacts, () => h.clock.now);
      await outbox.enqueue(intent);
      assert.equal((await outbox.reserve(h.messageId)).decision.kind,
        "dispatch");
      h.clock.now = ACTIVITY_NOW + ACTIVITY_WINDOW;
      const deferred = {...h.request.run, dueAtMillis: h.clock.now + 60_000};
      await h.run.update({dueAtMillis: deferred.dueAtMillis});
      const result = await deliverProgramActivity({...h.request, run: deferred,
        db: h.db, now: () => h.clock.now, send: h.send});
      assert.equal(result.kind, "suppressed");
      assert.equal(result.kind === "suppressed" && result.reason, "expired");
      const record = await h.record();
      assert.equal(record.intent.createdAt, ACTIVITY_NOW);
      assert.equal(record.intent.expiresAt, ACTIVITY_NOW + ACTIVITY_WINDOW);
      assert.deepEqual(record.attempts.map((attempt) => attempt.state.kind),
        ["notDispatched"]);
      assert.equal(h.messages.length, 0);
      assert.equal((await h.item.get()).exists, false);
    } finally {
      await h.close();
    }
  });
