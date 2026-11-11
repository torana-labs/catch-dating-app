import assert from "node:assert/strict";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import {buildFcmMessage} from "../shared/notifications";
import {FirestoreDeliveryOutbox} from "../delivery/firestoreDeliveryOutbox";
import {programDeliveryAdapter, programDeliveryMessageId} from
  "./programDelivery";
import {deliverProgramActivity, programActivityIntent,
  recoverProgramActivityJournals} from
  "./programActivityDelivery";
import {prepareProgramActivityChannel} from "./programActivityChannel";
import {ACTIVITY_NOW, ACTIVITY_WINDOW, activityFirestore, activityHarness,
  activityItems, activityRecord, activityRequest, setStaffDevice} from
  "./programActivityFixture";

function reservedChannel() {
  const h = activityHarness();
  const intent = programActivityIntent(activityRequest);
  const channel = prepareProgramActivityChannel(h.db as unknown as Firestore,
    intent, h.send, () => h.clock.now);
  assert.equal(channel.kind, "ready");
  if (channel.kind !== "ready") throw new Error("Expected ready channel");
  const outbox = new FirestoreDeliveryOutbox(h.db as unknown as Firestore,
    programDeliveryAdapter, channel.readFacts, () => h.clock.now);
  return {...h, intent, channel, outbox,
    messageId: programDeliveryMessageId(intent)};
}

test("FCM acceptance uses the real SDK id and canonical Host payload",
  async () => {
    const h = activityHarness();
    const result = await h.deliver();
    assert.equal(result.kind, "sent");
    const record = activityRecord(h.db);
    assert.equal(record.attempts.length, 1);
    assert.deepEqual(record.attempts[0].state, {kind: "accepted",
      at: ACTIVITY_NOW,
      providerMessageId: "projects/test/messages/real-sdk-message-id"});
    assert.deepEqual(h.messages, [buildFcmMessage({token: "token-1",
      ...activityRequest.copy, type: "organizerUpdate", appRole: "host",
      recipientUid: "staff", notificationId:
      `organizerUpdate_${activityRequest.run.runId}`})]);
    assert.equal(activityItems(h.db).length, 1);
  });

for (const [user, device, reason] of [
  [{}, null, "noEndpoint"],
  [{prefsRunStatusUpdates: false}, "token-1", "preferenceOff"],
] as const) {
  test(`local activity persists ${reason} and never gains a later push`,
    async () => {
      const h = activityHarness();
      h.db.setDoc("users/staff", user);
      setStaffDevice(h.db, device);
      const first = await h.deliver();
      assert.equal(first.kind, "suppressed");
      if (first.kind === "suppressed") {
        assert.equal(first.reason, reason);
        assert.equal(first.activityRecorded, true);
      }
      const item = activityItems(h.db)[0];
      const record = activityRecord(h.db);
      assert.equal(record.attempts[0].binding.provider, "catchActivity");
      assert.equal(record.attempts[0].state.kind, "delivered");
      assert.equal("providerMessageId" in record.attempts[0].state &&
        record.attempts[0].state.providerMessageId, item[0]);
      h.db.updateDoc(item[0], {readAt: ACTIVITY_NOW + 1});
      setStaffDevice(h.db, "new-token");
      assert.deepEqual(await h.deliver({copy: {title: "Changed", body: ""}}),
        first);
      assert.equal(h.messages.length, 0);
      assert.equal(activityItems(h.db)[0][1].readAt, ACTIVITY_NOW + 1);
      assert.equal(activityItems(h.db)[0][1].title, activityRequest.copy.title);
    });
}

test("SDK failure stays unknown forever, including after the original window",
  async () => {
    const h = activityHarness();
    let calls = 0;
    const deliver = () => deliverProgramActivity({...activityRequest,
      db: h.db as unknown as Firestore, now: () => h.clock.now,
      send: async () => {
        calls++; throw new Error("network result unknown");
      }});
    const first = await deliver();
    assert.equal(first.kind, "sent");
    assert.equal(first.kind === "sent" && first.deliveryState, "unknown");
    h.clock.now += ACTIVITY_WINDOW + 1;
    assert.deepEqual(await deliver(), first);
    assert.equal(calls, 1);
    assert.equal(activityRecord(h.db).attempts.length, 1);
    const state = activityRecord(h.db).attempts[0].state;
    assert.equal(state.kind === "unknown" && state.reason,
      "sdkOutcomeUnknown");
  });

test("concurrent producers with changing copy share one committed intent",
  async () => {
    const h = activityHarness();
    const results = await Promise.all([h.deliver(),
      h.deliver({copy: {title: "Updated title", body: "Updated copy"}})]);
    assert.ok(results.every((result) => result.kind === "sent"));
    assert.equal(h.messages.length, 1);
    assert.equal(activityRecord(h.db).attempts.length, 1);
    assert.equal(activityItems(h.db).length, 1);
    const stored = activityRecord(h.db).intent;
    assert.equal(h.messages[0].notification?.title, stored.title);
  });

test("receipt write failure cannot resend accepted FCM on changed-copy replay",
  async () => {
    const h = activityHarness();
    const write = h.db.setDoc.bind(h.db);
    let failReceipt = true;
    h.db.setDoc = (path, data) => {
      const attempts = data.attempts as
        Array<{state: {kind: string}}> | undefined;
      if (failReceipt && path.startsWith("deliveryMessages/") &&
          attempts?.some((attempt) => attempt.state.kind === "accepted")) {
        throw new Error("receipt unavailable");
      }
      write(path, data);
    };
    await assert.rejects(h.deliver(), /receipt unavailable/);
    assert.equal(activityRecord(h.db).attempts[0].state.kind, "unknown");
    assert.equal(activityItems(h.db).length, 1);
    failReceipt = false;
    h.db.setDoc("users/staff", {prefsRunStatusUpdates: false});
    const result = await h.deliver({copy: {title: "New", body: "New"}});
    assert.equal(result.kind === "sent" && result.deliveryState, "unknown");
    assert.equal(h.messages.length, 1);
  });

test("activity and unknown claim roll back together before provider I/O",
  async () => {
    const h = activityHarness();
    const write = h.db.setDoc.bind(h.db);
    let failActivity = true;
    h.db.setDoc = (path, data) => {
      if (failActivity && path.startsWith("notifications/")) {
        throw new Error("activity unavailable");
      }
      write(path, data);
    };
    await assert.rejects(h.deliver(), /activity unavailable/);
    assert.equal(activityRecord(h.db).attempts[0].state.kind, "reserved");
    assert.equal(activityItems(h.db).length, 0);
    assert.equal(h.messages.length, 0);
    failActivity = false;
    assert.equal((await h.deliver()).kind, "sent");
    assert.equal(activityRecord(h.db).attempts.length, 1);
    assert.equal(activityItems(h.db).length, 1);
    assert.equal(h.messages.length, 1);
  });

for (const [label, mutate] of [
  ["revoked grant", (h: ReturnType<typeof reservedChannel>) =>
    h.db.updateDoc("programStaffGrants/prog__staff", {status: "revoked"})],
  ["deleted account", (h: ReturnType<typeof reservedChannel>) =>
    h.db.setDoc("deletedUsers/staff", {})],
  ["changed token", (h: ReturnType<typeof reservedChannel>) =>
    setStaffDevice(h.db, "changed")],
  ["changed preference", (h: ReturnType<typeof reservedChannel>) =>
    h.db.setDoc("users/staff", {prefsRunStatusUpdates: false})],
  ["edited moment", (h: ReturnType<typeof reservedChannel>) =>
    h.db.updateDoc("organizerMoments/m_flight", {revision: 4})],
  ["ended program", (h: ReturnType<typeof reservedChannel>) =>
    h.db.updateDoc("organizerPrograms/prog", {status: "archived"})],
  ["wrong scope", (h: ReturnType<typeof reservedChannel>) =>
    h.db.updateDoc("programStaffGrants/prog__staff", {duties: [{
      duty: "airportGreeter", pickupPointIds: ["foreign"], hotelIds: [],
      expiresAtMillis: ACTIVITY_NOW + ACTIVITY_WINDOW}]})],
] as const) {
  test(`${label} between reservation and claim prevents activity and FCM`,
    async () => {
      const h = reservedChannel();
      await h.outbox.enqueue(h.intent);
      const reservation = await h.outbox.reserve(h.messageId);
      const attempt = reservation.record.attempts[0];
      mutate(h);
      const result = await h.channel.dispatchReserved(h.outbox, h.messageId,
        attempt.attemptId);
      assert.equal(result.kind, "withheld");
      assert.equal(h.messages.length, 0);
      assert.equal(activityItems(h.db).length, 0);
      assert.equal(activityRecord(h.db).attempts[0].state.kind, "reserved");
    });
}

test("all three definitely-unsent reservations recover, fourth is terminal",
  async () => {
    const h = reservedChannel();
    await h.outbox.enqueue(h.intent);
    for (let ordinal = 1; ordinal <= 3; ordinal++) {
      const result = await h.outbox.reserve(h.messageId);
      assert.equal(result.decision.kind, "dispatch");
      assert.equal(result.record.attempts.at(-1)?.ordinal, ordinal);
      h.clock.now += 120_000;
      await h.outbox.reserve(h.messageId); // releases expired reservation
      h.clock.now += 60_000 * 2 ** (ordinal - 1);
    }
    const exhausted = await h.outbox.reserve(h.messageId);
    assert.deepEqual(exhausted.decision,
      {kind: "hostDecision", reason: "attemptLimit"});
    assert.equal(exhausted.record.attempts.length, 3);
    assert.ok(exhausted.record.attempts.every((a) =>
      a.state.kind === "notDispatched"));
    assert.equal(h.messages.length, 0);
  });

test("first committed six-hour window cannot be renewed by deferred dueAt",
  async () => {
    const db = activityFirestore();
    const h = activityHarness(db);
    h.clock.now += ACTIVITY_WINDOW;
    const result = await h.deliver({run: {...activityRequest.run,
      dueAtMillis: h.clock.now}});
    assert.deepEqual(result, {kind: "suppressed", reason: "expired"});
    assert.equal(h.messages.length, 0);
    assert.equal([...db.docs.keys()].some((p) =>
      p.startsWith("deliveryMessages/")), false);
  });

test("claim retry preserves an activity item already read",
  async () => {
    const h = reservedChannel();
    await h.outbox.enqueue(h.intent);
    const reserved = await h.outbox.reserve(h.messageId);
    const itemPath = "notifications/staff/items/organizerUpdate_" +
      activityRequest.run.runId;
    let race = true;
    h.db.beforeCommit = async () => {
      if (!race) return;
      race = false;
      h.db.setDoc(itemPath, {uid: "staff", title: "Already recorded",
        readAt: ACTIVITY_NOW - 1});
    };
    await h.channel.dispatchReserved(h.outbox, h.messageId,
      reserved.record.attempts[0].attemptId);
    assert.equal(h.messages.length, 1);
    assert.equal(h.db.getDoc(itemPath)?.readAt, ACTIVITY_NOW - 1);
    assert.equal(h.db.getDoc(itemPath)?.title, "Already recorded");
    assert.equal(activityRecord(h.db).attempts.length, 1);
    assert.equal(activityRecord(h.db).attempts[0].state.kind, "accepted");
  });

test("third reserved attempt can send after two definitely-unsent expirations",
  async () => {
    const h = reservedChannel();
    await h.outbox.enqueue(h.intent);
    for (let ordinal = 1; ordinal <= 2; ordinal++) {
      const result = await h.outbox.reserve(h.messageId);
      assert.equal(result.decision.kind, "dispatch");
      h.clock.now += 120_000;
      await h.outbox.reserve(h.messageId);
      h.clock.now += 60_000 * 2 ** (ordinal - 1);
    }
    const result = await h.deliver();
    assert.equal(result.kind === "sent" && result.deliveryState, "accepted");
    assert.equal(activityRecord(h.db).attempts.length, 3);
    assert.equal(h.messages.length, 1);
    const record = activityRecord(h.db);
    const path = `organizerMomentSends/${activityRequest.run.runId}_uid:staff`;
    h.db.setDoc(path, {momentId: activityRequest.run.momentId,
      recipientKey: "uid:staff", deliveryMessageId: record.messageId,
      decision: "sent", deliveryState: "unknown", dayKey: "day",
      createdAtMillis: ACTIVITY_NOW});
    await recoverProgramActivityJournals(h.db as unknown as Firestore,
      activityRequest.run, async () => "day");
    assert.equal(h.db.getDoc(path)?.deliveryState, "accepted");
    assert.equal(h.db.getDoc(path)?.decision, "sent");
  });

test("local receipt failure retains original suppression and never gains FCM",
  async () => {
    const h = activityHarness();
    setStaffDevice(h.db, null);
    const write = h.db.setDoc.bind(h.db);
    let fail = true;
    h.db.setDoc = (path, data) => {
      const attempts = data.attempts as
        Array<{state: {kind: string}}> | undefined;
      if (fail && path.startsWith("deliveryMessages/") &&
          attempts?.some((attempt) => attempt.state.kind === "delivered")) {
        throw new Error("local receipt unavailable");
      }
      write(path, data);
    };
    await assert.rejects(h.deliver(), /local receipt unavailable/);
    assert.equal(activityRecord(h.db).attempts[0].state.kind, "unknown");
    assert.equal(activityItems(h.db).length, 1);
    fail = false;
    setStaffDevice(h.db, "new-token");
    const outcome = await h.deliver();
    assert.equal(outcome.kind, "suppressed");
    assert.equal(outcome.kind === "suppressed" && outcome.reason, "noEndpoint");
    assert.equal(outcome.kind === "suppressed" &&
      outcome.activityRecorded, true);
    assert.equal(h.messages.length, 0);
  });

for (const state of ["absent", "reserved", "unknown"] as const) {
  test(`${state} attempt cannot become proven-unsent projection`, async () => {
    const h = reservedChannel();
    await h.outbox.enqueue(h.intent);
    if (state !== "absent") {
      const reserved = await h.outbox.reserve(h.messageId);
      if (state === "unknown") {
        await h.outbox.claimLiveDispatch(h.messageId,
          reserved.record.attempts[0].attemptId);
      }
    }
    const path = `organizerMomentSends/${activityRequest.run.runId}_uid:staff`;
    h.db.setDoc(path, {momentId: activityRequest.run.momentId,
      recipientKey: "uid:staff", deliveryMessageId: h.messageId,
      decision: "sent", deliveryState: "unknown", dayKey: "day",
      createdAtMillis: ACTIVITY_NOW});
    await recoverProgramActivityJournals(h.db as unknown as Firestore,
      activityRequest.run, async () => "day");
    assert.equal(h.db.getDoc(path)?.deliveryState, "unknown");
    assert.equal(h.db.getDoc(path)?.decision, "sent");
    assert.equal(h.messages.length, 0);
  });
}

for (const change of ["accepted", "laterUnknown", "binding", "intent",
  "otherAttempt", "closed", "conflict"] as const) {
  test(`SDK settlement CAS preserves ${change} evidence`, async () => {
    const h = reservedChannel();
    await h.outbox.enqueue(h.intent);
    const reserved = await h.outbox.reserve(h.messageId);
    let expected: unknown;
    const channel = prepareProgramActivityChannel(h.db as unknown as Firestore,
      h.intent, async () => {
        const record = structuredClone(activityRecord(h.db));
        const attempt = record.attempts[0];
        if (change === "accepted") {
          attempt.state = {kind: "accepted", at: ACTIVITY_NOW,
            providerMessageId: "projects/test/messages/proven"};
        }
        if (change === "laterUnknown" && attempt.state.kind === "unknown") {
          attempt.state.reason = "connectionLost";
        }
        if (change === "binding") {
          attempt.binding.recipientEndpointId = "new";
        }
        if (change === "intent") record.intent.title = "Changed source";
        if (change === "otherAttempt") attempt.attemptId = "other-attempt";
        if (change === "closed") record.lifecycle = "cancelled";
        if (change === "conflict") record.deliveryConflict = true;
        expected = record;
        h.db.setDoc(`deliveryMessages/${record.messageId}`, {...record});
        throw new Error("SDK settled without acceptance evidence");
      }, () => h.clock.now);
    assert.equal(channel.kind, "ready");
    if (channel.kind !== "ready") throw new Error("Expected channel");
    await channel.dispatchReserved(h.outbox, h.messageId,
      reserved.record.attempts[0].attemptId);
    assert.deepEqual(activityRecord(h.db), expected);
  });
}

test("SDK settlement write failure leaves provisional unknown and no resend",
  async () => {
    const h = activityHarness();
    const write = h.db.setDoc.bind(h.db);
    h.db.setDoc = (path, data) => {
      const attempts = data.attempts as Array<{state: {reason?: string}}>;
      if (attempts?.some((attempt) =>
        attempt.state.reason === "sdkOutcomeUnknown")) {
        throw new Error("settlement unavailable");
      }
      write(path, data);
    };
    let calls = 0;
    const deliver = () => deliverProgramActivity({...activityRequest,
      db: h.db as unknown as Firestore, now: () => h.clock.now,
      send: async () => {
        calls++; return "";
      }});
    await assert.rejects(deliver(), /settlement unavailable/);
    const state = activityRecord(h.db).attempts[0].state;
    assert.equal(state.kind === "unknown" && state.reason, "workerInterrupted");
    h.clock.now += ACTIVITY_WINDOW + 1;
    assert.equal((await deliver()).kind, "sent");
    assert.equal(calls, 1);
  });

test("stronger accepted receipt advances settled unknown without another send",
  async () => {
    const h = reservedChannel();
    await h.outbox.enqueue(h.intent);
    const reserved = await h.outbox.reserve(h.messageId);
    const attempt = reserved.record.attempts[0];
    const channel = prepareProgramActivityChannel(h.db as unknown as Firestore,
      h.intent, async () => "", () => h.clock.now);
    if (channel.kind !== "ready") throw new Error("Expected channel");
    await channel.dispatchReserved(h.outbox, h.messageId, attempt.attemptId);
    const state = activityRecord(h.db).attempts[0].state;
    assert.equal(state.kind === "unknown" && state.reason,
      "sdkOutcomeUnknown");
    await h.outbox.recordReceipt(h.messageId, {attemptId: attempt.attemptId,
      ...attempt.binding, providerEventId: "synthetic-confirmation",
      receivedAt: ACTIVITY_NOW, state: {kind: "accepted", at: ACTIVITY_NOW,
        providerMessageId: "projects/test/messages/proven"}});
    assert.equal(activityRecord(h.db).attempts[0].state.kind, "accepted");
    assert.equal(h.messages.length, 0);
  });
