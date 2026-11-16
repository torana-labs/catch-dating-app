import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {operationContentHash} from "../../operations/durableActions";
import {validateEventRcsWithdrawalCallableResponse} from
  "../../shared/generated/validators/eventRcsWithdrawalOutput";
import {ProgressFirestore} from "./groupProgressTestFixtures";
import {grantSecret} from "./guestLinkTokens";
import {guestCollections} from "./guestRecords";
import {RcsPreferenceStore} from "./rcsPreferenceStore";
import {readRcsMessagePermission} from "./rcsPermissionReader";
import {RCS_CONSENT_VERSION, rcsConsentCollections, rcsPermissionId,
  parseRcsPermission, parseRcsConsentReceipt, rcsPermissionHasReceipt,
  rcsSenderHash} from "./rcsConsent";
import {rcsTestConfig, rcsTestNow as at, rcsTestGrant, rcsTestIntent,
  rcsTestKeys} from "./rcsTestFixtures";
import {rcsEndpointId, rcsPhoneHash} from "./rcsProtocol";
import {rcsSubscriptionId} from "./rcsSubscriptions";
import {RCS_WITHDRAWAL_GRANTS, newRcsWithdrawalGrant, parseRcsWithdrawalGrant,
  prepareRcsWithdrawal} from "./rcsWithdrawalRecords";
import {RcsWithdrawalStore} from "./rcsWithdrawalStore";
import {getEventRcsWithdrawalHandler, withdrawEventRcsHandler} from
  "./rcsWithdrawalHandlers";
import {withdrawalGrantId} from "./messageConsentCollections";

async function harness(real?: Firestore) {
  const fake = new ProgressFirestore();
  const db = real ?? fake as unknown as Firestore;
  const clock = {now: at};
  const write = async (path: string, value: object) => real ?
    db.doc(path).set(value) :
    fake.write(path, value as Record<string, unknown>);
  const read = async (path: string) => real ?
    (await db.doc(path).get()).data() : fake.read(path);
  const config = rcsTestConfig();
  const grant = rcsTestGrant(rcsTestIntent());
  const context = grant.context;
  const actor = {uid: "guest-1", phone: "+919999999999"};
  const scope = {eventId: context.eventId, attendeeId: grant.attendeeId,
    senderId: config.senderId};
  const eventPath = "events/" + context.eventId;
  const attendeePath = "eventAttendees/" + scope.attendeeId;
  const senderPath = rcsConsentCollections.senders + "/" + config.senderId;
  const permissionPath = rcsConsentCollections.permissions + "/" +
    rcsPermissionId(context, scope.attendeeId, config.senderId);
  const guestPath = guestCollections.grants + "/" + grant.linkId;
  const authorityPath = RCS_WITHDRAWAL_GRANTS + "/" +
  withdrawalGrantId("rcs", grant.linkId);
  await write(eventPath, {organizerId: context.organizerId, status: "active",
    name: "Friday social", endTime: {seconds: (at + 3_600_000) / 1000,
      nanoseconds: 0}});
  await write(attendeePath, {organizerId: context.organizerId,
    eventId: context.eventId, linkedUid: actor.uid, phoneE164: actor.phone,
    status: "registered", createdAt: {seconds: at / 1000, nanoseconds: 1}});
  await write(senderPath, config);
  await write(guestPath, grant);
  const preference = new RcsPreferenceStore(db, () => clock.now);
  const enable = async (requestId = "grant-1") => {
    const {view} = await preference.get(actor, scope);
    return preference.set(actor, {...scope, requestId,
      expectedRevision: view.revision, decision: {kind: "grant",
        copyVersion: RCS_CONSENT_VERSION, reviewHash: view.reviewHash}});
  };
  await enable();
  const permission = async () => parseRcsPermission(await read(permissionPath));
  const prepare = async () => {
    const current = await permission();
    return db.runTransaction(async (tx) => {
      const staged = await prepareRcsWithdrawal(db, tx, current, grant,
        clock.now);
      staged.commit();
      return staged.authority;
    });
  };
  const allowed = () => db.runTransaction((tx) => readRcsMessagePermission(
    db, tx, {...scope, context}, config, clock.now));
  const store = new RcsWithdrawalStore(db, () => clock.now);
  const credential = {linkId: grant.linkId,
    secret: grantSecret(grant, rcsTestKeys)};
  const input = {...credential, requestId: "stop-1", expectedRevision: 1};
  return {db, fake, clock, config, grant, context, actor, scope, write, read,
    eventPath, attendeePath, senderPath, permissionPath, guestPath,
    authorityPath, preference, enable, permission, prepare, allowed, store,
    credential, input};
}

test("RCS preparation stages immutable withdrawal authority atomically",
  async () => {
    const h = await harness();
    await assert.rejects(h.store.get(h.credential), /unavailable/);
    const p = await h.permission();
    await h.db.runTransaction(async (tx) => {
      const staged = await prepareRcsWithdrawal(h.db, tx, p, h.grant, at);
      assert.equal(await h.read(h.authorityPath), undefined);
      await tx.get(h.db.collection("events").doc(h.context.eventId));
      staged.commit();
      tx.create(h.db.collection("testDispatch").doc("one"), {prepared: true});
    });
    const authority = parseRcsWithdrawalGrant(await h.read(h.authorityPath));
    assert.equal(authority.expiresAt, p.expiresAt);
    assert.equal(authority.sourceGeneration, p.sourceGeneration);
    assert.ok(authority.expiresAt > h.grant.expiresAt);
    h.clock.now += 1000;
    assert.deepEqual(await h.prepare(), authority);
    assert.deepEqual(await h.read("testDispatch/one"), {prepared: true});
  });

test("withdrawal exposes only a recorded preference and stops RCS permission",
  async () => {
    const h = await harness();
    await h.prepare();
    const before = await h.permission();
    assert.equal((await h.allowed()).kind, "allowed");
    const result = await h.store.withdraw(h.input);
    assert.equal(validateEventRcsWithdrawalCallableResponse(result), true);
    assert.deepEqual(result, {outcome: "applied", view: {serverTime: at,
      revision: 2, preference: "disabled", expiresAt: before.expiresAt}});
    const after = await h.permission();
    assert.deepEqual(after.evidence, before.evidence);
    assert.equal(after.subjectUid, before.subjectUid);
    assert.equal(after.phoneE164, before.phoneE164);
    assert.equal((await h.allowed()).kind, "blocked");
    const receipt = parseRcsConsentReceipt(await h.read(
      rcsConsentCollections.receipts + "/" + after.currentReceiptId));
    assert.equal(receipt.source, "messageLink");
    assert.equal(receipt.actorUid, null);
    assert.equal(receipt.decision, "revoke");
    assert.equal(receipt.permissionHash, operationContentHash(after));
    assert.equal(rcsPermissionHasReceipt(before, receipt), false);
    assert.equal(JSON.stringify(receipt).includes(h.credential.secret), false);
    assert.equal(JSON.stringify(result).includes(h.actor.phone), false);
    assert.equal(JSON.stringify(result).includes(h.context.eventId), false);
    assert.equal(JSON.stringify(result).includes(h.config.agentId), false);
  });

test("expired instructions and deleted sources do not obstruct withdrawal",
  async () => {
    const h = await harness();
    await h.prepare();
    const before = await h.permission();
    h.fake.remove(h.eventPath);
    h.fake.remove(h.attendeePath);
    h.fake.remove(h.senderPath);
    h.fake.remove(rcsConsentCollections.receipts + "/" +
      before.currentReceiptId);
    h.clock.now = h.grant.expiresAt + 1000;
    const guestBefore = await h.read(h.guestPath);
    assert.equal((await h.store.withdraw(h.input)).view.preference, "disabled");
    assert.deepEqual(await h.read(h.guestPath), guestBefore);
    h.clock.now = before.expiresAt;
    await assert.rejects(h.store.get(h.credential), /unavailable/);
    await assert.rejects(h.store.withdraw({...h.input, requestId: "expired"}),
      /unavailable/);
  });

test("old withdrawal requests cannot reverse newer verified consent",
  async () => {
    const h = await harness();
    await h.prepare();
    await h.store.withdraw(h.input);
    h.clock.now++;
    await h.enable("grant-2");
    const replay = await h.store.withdraw(h.input);
    assert.equal(replay.outcome, "replayed");
    assert.equal(replay.view.preference, "enabled");
    assert.equal(replay.view.revision, 3);
    assert.equal((await h.store.withdraw({...h.input,
      requestId: "stale"})).outcome, "conflict");
    await assert.rejects(h.store.withdraw({...h.input, expectedRevision: 3}),
      /new RCS withdrawal request/);
    assert.equal((await h.allowed()).kind, "allowed");
    assert.equal((await h.store.withdraw({...h.input, requestId: "fresh",
      expectedRevision: 3})).view.preference, "disabled");
  });

test("withdrawal rejects incorrect, revoked or replaced bearer credentials",
  async () => {
    for (const change of ["secret", "link", "guestMissing", "authorityMissing",
      "revoked", "guestChanged", "wrongAuthorityLink"]) {
      const h = await harness();
      await h.prepare();
      let input = h.credential;
      if (change === "secret") input = {...input, secret: "x".repeat(43)};
      if (change === "link") input = {...input, linkId: "c".repeat(32)};
      if (change === "guestMissing") h.fake.remove(h.guestPath);
      if (change === "authorityMissing") h.fake.remove(h.authorityPath);
      if (change === "revoked") {
        await h.write(h.guestPath, {...h.grant, revokedAt: at});
      }
      if (change === "guestChanged") {
        await h.write(h.guestPath, {...h.grant, expiresAt: at + 500});
      }
      if (change === "wrongAuthorityLink") {
        await h.write(h.authorityPath, {...await h.read(h.authorityPath),
          linkId: "c".repeat(32)});
      }
      await assert.rejects(h.store.get(input), /unavailable/, change);
    }
  });

test("links cannot revoke replacement subjects, phones, sources or agents",
  async () => {
    for (const change of ["subject", "phone", "attendee", "source", "agent",
      "permissionMissing", "revision"]) {
      const h = await harness();
      await h.prepare();
      const p = await h.permission();
      const patch: Record<string, unknown> = {};
      if (change === "subject") {
        patch.subjectUid = "replacement";
        patch.recipientBinding = {...p.recipientBinding,
          subjectUid: "replacement"};
      }
      if (change === "phone") {
        patch.phoneE164 = "+919888888888";
        patch.subscriptionId = rcsSubscriptionId(p.sender.agentId,
          rcsPhoneHash(patch.phoneE164)!);
        patch.recipientEndpointId = rcsEndpointId(p.context, p.attendeeId,
          patch.phoneE164 as string);
      }
      if (change === "attendee") patch.attendeeGeneration = "c".repeat(64);
      if (change === "source") {
        patch.sourceGeneration = "c".repeat(64);
        patch.recipientBinding = {...p.recipientBinding,
          sourceGeneration: patch.sourceGeneration};
      }
      if (change === "agent") {
        const sender = {...p.sender, agentId: "replacement@rbm.goog"};
        patch.sender = sender;
        patch.subscriptionId = rcsSubscriptionId(sender.agentId,
          rcsPhoneHash(p.phoneE164)!);
        patch.evidence = {...p.evidence,
          senderHash: rcsSenderHash(p.senderId, sender)};
      }
      if (change === "revision") {
        await h.write(h.authorityPath, {...await h.read(h.authorityPath),
          permissionRevisionAtIssue: 2});
      }
      await h.write(h.permissionPath, {...p, ...patch});
      if (change === "permissionMissing") h.fake.remove(h.permissionPath);
      await assert.rejects(h.store.withdraw(h.input), /unavailable/, change);
    }
  });

test("same-agent renaming preserves original message-link withdrawal",
  async () => {
    const h = await harness();
    await h.prepare();
    await h.write(h.senderPath, {...h.config, displayName: "Updated name"});
    h.clock.now++;
    await h.enable("renamed");
    assert.equal((await h.store.withdraw({...h.input,
      expectedRevision: 2})).view.preference, "disabled");
  });

test("preparation refuses stale or damaged permission and guest evidence",
  async () => {
    for (const change of ["permissionMissing", "permissionChanged",
      "receiptMissing", "receiptChanged", "guestMissing", "guestChanged"]) {
      const h = await harness();
      const p = await h.permission();
      const receiptPath = rcsConsentCollections.receipts + "/" +
        p.currentReceiptId;
      if (change === "permissionMissing") h.fake.remove(h.permissionPath);
      if (change === "permissionChanged") {
        await h.write(h.permissionPath, {...p, revision: 2});
      }
      if (change === "receiptMissing") h.fake.remove(receiptPath);
      if (change === "receiptChanged") {
        await h.write(receiptPath, {...await h.read(receiptPath),
          permissionHash: "0".repeat(64)});
      }
      if (change === "guestMissing") h.fake.remove(h.guestPath);
      if (change === "guestChanged") {
        await h.write(h.guestPath, {...h.grant, expiresAt: at + 500});
      }
      await assert.rejects(h.db.runTransaction((tx) =>
        prepareRcsWithdrawal(h.db, tx, p, h.grant, at)), /stale/, change);
      assert.equal(await h.read(h.authorityPath), undefined);
    }
  });

test("reusing a message link cannot silently extend withdrawal lifetime",
  async () => {
    const h = await harness();
    const authority = await h.prepare();
    const event = await h.read(h.eventPath);
    await h.write(h.eventPath, {...event, endTime: {
      seconds: (at + 7_200_000) / 1000, nanoseconds: 0}});
    h.clock.now++;
    await h.enable("longer");
    await assert.rejects(h.prepare(), /new link/);
    assert.deepEqual(await h.read(h.authorityPath), authority);
    assert.equal((await h.store.withdraw({...h.input,
      expectedRevision: 2})).view.preference, "disabled");
  });

test("withdrawal issuance rejects expired, revoked and mismatched inputs",
  async () => {
    const h = await harness();
    const p = await h.permission();
    for (const now of [NaN, Infinity, -1, at - 1, h.grant.expiresAt]) {
      assert.throws(() => newRcsWithdrawalGrant(p, h.grant, now));
    }
    assert.throws(() => newRcsWithdrawalGrant({...p, status: "revoked"},
      h.grant, at));
    assert.throws(() => newRcsWithdrawalGrant(p,
      {...h.grant, revokedAt: at}, at));
    const foreign = rcsTestGrant({...rcsTestIntent(), attendeeId: "foreign"});
    assert.throws(() => newRcsWithdrawalGrant(p, foreign, at));
    const authority = newRcsWithdrawalGrant(p, h.grant, at);
    for (const patch of [{agentId: "invalid/agent"},
      {context: {...p.context, mode: "rehearsal"}}, {expiresAt: at},
      {sourceGeneration: "missing"}, {permissionId: "wrong"}]) {
      assert.throws(() => parseRcsWithdrawalGrant({...authority, ...patch}));
    }
  });

test("failed commits and invalid clocks leave permission and issuance intact",
  async () => {
    const h = await harness();
    h.fake.failNextCommit = true;
    await assert.rejects(h.prepare(), /interruption/);
    assert.equal(await h.read(h.authorityPath), undefined);
    await h.prepare();
    const before = h.fake.entries();
    h.fake.failNextCommit = true;
    await assert.rejects(h.store.withdraw(h.input), /interruption/);
    assert.deepEqual(h.fake.entries(), before);
    for (const now of [NaN, Infinity, -1, at - 1]) {
      h.clock.now = now;
      await assert.rejects(h.store.withdraw(h.input), /unavailable/);
      assert.deepEqual(h.fake.entries(), before);
    }
  });

test("message-link receipts are statically revoke-only and retain no actor",
  async () => {
    const h = await harness();
    await h.prepare();
    await h.store.withdraw(h.input);
    const p = await h.permission();
    const receipt = await h.read(rcsConsentCollections.receipts + "/" +
      p.currentReceiptId);
    for (const patch of [{decision: "grant"}, {actorUid: h.actor.uid},
      {reviewHash: "0".repeat(64)}, {reviewedStopHash: "0".repeat(64)},
      {linkId: null}, {secret: h.credential.secret}]) {
      assert.throws(() => parseRcsConsentReceipt({...receipt, ...patch}));
    }
  });

test("public withdrawal callables validate and rate-limit without sign-in",
  async () => {
    const h = await harness();
    await h.prepare();
    const calls: Array<{uid: string; action: string}> = [];
    let reads = 0;
    const deps = {firestore: () => {
      reads++; return h.db;
    },
    now: () => h.clock.now,
    checkRateLimit: async (_db: unknown, uid: string, action: string) => {
      calls.push({uid, action});
    }};
    const request = (data: unknown) => ({data, rawRequest: {
      ip: "127.0.0.1"}} as unknown as CallableRequest<unknown>);
    for (const extra of [{decision: "grant"}, {phone: h.actor.phone},
      {senderId: h.config.senderId}, {sourceGeneration: "0".repeat(64)}]) {
      await assert.rejects(withdrawEventRcsHandler(
        request({...h.input, ...extra}), deps), /additional properties/);
    }
    assert.equal(reads, 0);
    assert.equal(calls.length, 0);
    const read = await getEventRcsWithdrawalHandler(request(h.credential),
      deps);
    assert.equal(read.view.preference, "enabled");
    const stop = await withdrawEventRcsHandler(request(h.input), deps);
    assert.equal(stop.view.preference, "disabled");
    assert.deepEqual(calls.map((c) => c.action), ["getEventRcsWithdrawal",
      "getEventRcsWithdrawal", "withdrawEventRcs", "withdrawEventRcs"]);
    assert.match(calls[0].uid, /^rcs_withdrawal_ip_[a-f0-9]{64}$/);
    assert.match(calls[1].uid, /^rcs_withdrawal_grant_[a-f0-9]{64}$/);
    assert.equal(JSON.stringify(calls).includes(h.credential.secret), false);
  });

test("Firestore concurrent issuance and withdrawal preserve one decision", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const key = randomUUID();
  const app = initializeApp({projectId: "demo-rcs-withdraw-" + key.slice(0, 8)},
    "rcs-withdraw-" + key);
  const db = getEmulatorFirestore(app);
  try {
    const h = await harness(db);
    const authorities = await Promise.all(Array.from({length: 4}, () =>
      h.prepare()));
    assert.ok(authorities.every((v) =>
      operationContentHash(v) === operationContentHash(authorities[0])));
    const results = await Promise.all(Array.from({length: 4}, () =>
      h.store.withdraw(h.input)));
    assert.equal(results.filter((r) => r.outcome === "applied").length, 1);
    assert.equal(results.filter((r) => r.outcome === "replayed").length, 3);
    assert.equal((await h.permission()).revision, 2);
    assert.equal((await h.allowed()).kind, "blocked");
    // Both commands review revision 2; Firestore must commit only one winner.
    h.clock.now++;
    const view = (await h.preference.get(h.actor, h.scope)).view;
    const race = await Promise.all([
      h.preference.set(h.actor, {...h.scope, requestId: "race-enable",
        expectedRevision: 2, decision: {kind: "grant",
          copyVersion: RCS_CONSENT_VERSION, reviewHash: view.reviewHash}}),
      h.store.withdraw({...h.input, requestId: "race-stop",
        expectedRevision: 2}),
    ]);
    assert.equal(race.filter((r) => r.outcome === "applied").length, 1);
    assert.equal(race.filter((r) => r.outcome === "conflict").length, 1);
    assert.equal((await h.permission()).revision, 3);
  } finally {
    for (const collection of await db.listCollections()) {
      for (const doc of (await collection.get()).docs) await doc.ref.delete();
    }
    await deleteApp(app);
  }
});
