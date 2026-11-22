import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {messageRecipientMatches, MessageRecipientBinding,
  reviewMessageRecipient} from "./messageRecipient";
import {rcsHarness} from "./rcsDispatchTestHarness";
import {SmsPreferenceStore} from "./smsPreferenceStore";
import {harness as whatsappHarness} from "./whatsappTestHarness";

const actor = {uid: "guest-1", phone: "+919999999999"};
const source = {linkedUid: actor.uid, rosterPhone: null,
  sourceGeneration: "a".repeat(64)};
const accepts = (value: unknown) => typeof value === "string" &&
  /^\+91[6-9][0-9]{9}$/.test(value);
const binding: MessageRecipientBinding = {kind: "privateVerifiedPhone",
  subjectUid: actor.uid, sourceGeneration: source.sourceGeneration};

test("private review requires a signed phone and canonical absence", () => {
  assert.deepEqual(reviewMessageRecipient(actor, source, accepts, null, false),
    {phone: actor.phone, binding});
  for (const rosterPhone of ["", "bad", 42, false, {}]) {
    assert.deepEqual(reviewMessageRecipient(actor,
      {...source, rosterPhone}, accepts, null, false),
    {phone: null, binding: null});
  }
  assert.deepEqual(reviewMessageRecipient({...actor, phone: null},
    source, accepts, null, false), {phone: null, binding: null});
  assert.deepEqual(reviewMessageRecipient(actor,
    {...source, linkedUid: "other"}, accepts, null, false),
  {phone: null, binding: null});
  const other = "+918888888888";
  assert.equal(reviewMessageRecipient(actor, {...source, rosterPhone: other},
    accepts, null, false).phone, other);
});

test("legacy grants never become private when a roster phone disappears",
  () => {
    const same = (phone: unknown) => phone === actor.phone;
    assert.equal(messageRecipientMatches(undefined, source, same), false);
    assert.equal(messageRecipientMatches(undefined,
      {...source, rosterPhone: actor.phone}, same), true);
    assert.equal(messageRecipientMatches({...binding, kind: "rosterPhone"},
      source, same), false);
    assert.equal(messageRecipientMatches(binding, source, same), true);
    for (const changed of [
      {...source, rosterPhone: actor.phone},
      {...source, linkedUid: "someone-else"},
      {...source, sourceGeneration: "b".repeat(64)},
    ]) assert.equal(messageRecipientMatches(binding, changed, same), false);
  });

test("existing private consent keeps its reviewed number until withdrawal",
  () => {
    const previous = {phoneE164: actor.phone, status: "granted" as const,
      recipientBinding: binding};
    const changed = {...actor, phone: "+918888888888"};
    assert.equal(reviewMessageRecipient(changed, source, accepts, previous,
      true).phone, actor.phone);
    assert.equal(reviewMessageRecipient(changed, source, accepts, previous,
      false).phone, changed.phone);
    assert.equal(reviewMessageRecipient({...actor, phone: null}, source,
      accepts, previous, true).phone, actor.phone);
    assert.equal(reviewMessageRecipient(changed, source, accepts,
      {...previous, status: "revoked"}, false).phone, changed.phone);
    assert.equal(reviewMessageRecipient(changed, source, accepts,
      {...previous, recipientBinding: undefined}, true).phone, changed.phone);
  });

for (const route of ["catchEventSms", "organizerEventWhatsapp",
  "catchEventRcs"] as const) {
  test(route + " dispatch uses consent without a Host-visible phone",
    async () => {
      const h = await rcsHarness(undefined, route, [route], undefined, true);
      const roster = await h.read(h.attendeePath);
      assert.equal(roster!.phoneE164, null);
      const result = await h.dispatch();
      assert.equal(result.kind, "submitted");
      if (result.kind !== "submitted") throw new Error("Expected dispatch");
      assert.equal(result.routeId, route);
      assert.equal(result.outcome.kind, "accepted");
      assert.deepEqual(await h.read(h.attendeePath), roster);
    });
  test(route + " cannot inherit a private grant after a roster phone edit",
    async () => {
      const h = await rcsHarness(undefined, route, [route], undefined, true);
      await h.write(h.attendeePath, {...await h.read(h.attendeePath),
        phoneE164: h.actor.phone});
      const result = await h.dispatch();
      assert.notEqual(result.kind, "submitted");
      assert.equal(h.requests.length, 0);
    });
}

test("private SMS withdrawal works after the signed phone claim disappears",
  async () => {
    const h = await rcsHarness(undefined, "sms-private", undefined,
      undefined, true);
    const store = new SmsPreferenceStore(h.db, () => h.clock.now,
      "sms-sms-private");
    const withoutPhone = {...h.actor, phone: null};
    const scope = {eventId: h.scope.eventId, attendeeId: h.scope.attendeeId};
    const {view} = await store.get(withoutPhone, scope);
    assert.equal(view.preference, "enabled");
    assert.equal(view.canEnable, false);
    const result = await store.set(withoutPhone, {...scope,
      requestId: "private-withdraw", expectedRevision: view.revision,
      expectedReviewHash: view.reviewHash, decision: {kind: "revoke"}});
    assert.equal(result.outcome, "applied");
    assert.equal(result.view.preference, "disabled");
    assert.equal((await h.read(h.attendeePath))!.phoneE164, null);
  });

test("a WhatsApp STOP releases a prior private number for fresh enrollment",
  async () => {
    const h = await whatsappHarness(undefined, "private-stop", undefined,
      undefined, true);
    const changed = {...h.actor, phone: "+918888887777"};
    const before = (await h.preferences.get(changed, h.scope)).view;
    assert.equal(before.preference, "enabled");
    assert.equal(before.canEnable, false);
    h.clock.now += 1000;
    await h.stop(h.clock.now);
    h.clock.now++;
    const {view} = await h.preferences.get(changed, h.scope);
    assert.equal(view.preference, "notSet");
    assert.equal(view.phoneLastFour, "7777");
    assert.equal(view.canEnable, true);
    assert.equal(view.stopRecordHash, null);
    const result = await h.preferences.set(changed, {...h.grant,
      requestId: "new-private-number", expectedRevision: view.revision,
      decision: {...h.grant.decision, reviewHash: view.reviewHash,
        senderHash: view.sender!.bindingHash,
        stopRecordHash: view.stopRecordHash}});
    assert.equal(result.view.preference, "enabled");
    assert.equal(result.view.phoneLastFour, "7777");
    assert.equal((await h.read(h.attendeePath))!.phoneE164, null);
  });

test("expired private grants do not pin a changed verified phone",
  async () => {
    const h = await rcsHarness(undefined, "private-expiry", undefined,
      undefined, true);
    const changed = {...h.actor, phone: "+918888887777"};
    h.clock.now = (await h.permission()).expiresAt;
    const sms = new SmsPreferenceStore(h.db, () => h.clock.now,
      "sms-private-expiry");
    for (const {view} of [
      await sms.get(changed, {...h.scope, senderId: "sms-private-expiry"}),
      await h.preferences.get(changed, h.scope),
      await h.rcsPreferences.get(changed, h.rcsScope),
    ]) {
      assert.equal(view.preference, "notSet");
      assert.equal(view.phoneLastFour, "7777");
      assert.equal(view.availability, "eventClosed");
      assert.equal(view.canEnable, false);
    }
    assert.equal((await h.read(h.attendeePath))!.phoneE164, null);
  });

test("Firestore private grants and dispatch leave the canonical roster intact",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST}, async () => {
    const app = initializeApp({projectId: "demo-catch-rules"},
      "private-recipient-" + randomUUID());
    const db = getEmulatorFirestore(app);
    try {
      const h = await rcsHarness(db, randomUUID(),
        ["catchEventRcs"], undefined, true);
      const before = await db.doc(h.attendeePath).get();
      assert.equal(before.data()!.phoneE164, null);
      assert.equal((await h.permission()).recipientBinding?.kind,
        "privateVerifiedPhone");
      const result = await h.dispatch();
      assert.equal(result.kind, "submitted");
      const after = await db.doc(h.attendeePath).get();
      assert.deepEqual(after.data(), before.data());
      assert.equal(after.updateTime!.isEqual(before.updateTime!), true);
    } finally {
      await db.terminate();
      await deleteApp(app);
    }
  });

for (const channel of ["SMS", "WhatsApp", "RCS"] as const) {
  for (const operation of ["read", "grant"] as const) {
    test(channel + " " + operation + " cannot outlive its consent window",
      async () => {
        const h = await rcsHarness(undefined, "slow-consent", undefined,
          undefined, true);
        const sms = new SmsPreferenceStore(h.db, () => h.clock.now,
          "sms-slow-consent");
        const smsScope = {...h.scope, senderId: "sms-slow-consent"};
        const smsView = (await sms.get(h.actor, smsScope)).view;
        const waView = (await h.preferences.get(h.actor, h.scope)).view;
        const rcsView = (await h.rcsPreferences.get(h.actor, h.rcsScope)).view;
        const expiresAt = (await h.permission()).expiresAt;
        const before = h.fake.entries();
        h.fake.beforeRead = (path) => {
          if (path === h.attendeePath) h.clock.now = expiresAt;
        };
        if (operation === "read") {
          const {view} = await (channel === "SMS" ?
            sms.get(h.actor, smsScope) : channel === "WhatsApp" ?
              h.preferences.get(h.actor, h.scope) :
              h.rcsPreferences.get(h.actor, h.rcsScope));
          assert.equal(view.canEnable, false);
          assert.equal(view.availability, "eventClosed");
          assert.equal(view.serverTime, expiresAt);
        } else {
          const pending = channel === "SMS" ?
            sms.set(h.actor, {...smsScope, requestId: "slow-grant",
              expectedRevision: smsView.revision,
              expectedReviewHash: smsView.reviewHash, decision: {kind: "grant",
                copyVersion: smsView.consent.version}}) :
            channel === "WhatsApp" ?
              h.preferences.set(h.actor, {...h.grant, requestId: "slow-grant",
                expectedRevision: waView.revision,
                decision: {...h.grant.decision,
                  reviewHash: waView.reviewHash}}) :
              h.rcsPreferences.set(h.actor, {...h.rcsScope,
                requestId: "slow-grant", expectedRevision: rcsView.revision,
                decision: {kind: "grant", copyVersion: rcsView.consent.version,
                  reviewHash: rcsView.reviewHash}});
          await assert.rejects(pending, {code: "failed-precondition"});
        }
        assert.deepEqual(h.fake.entries(), before);
      });
  }
}
