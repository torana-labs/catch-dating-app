import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {createHmac, randomUUID} from "node:crypto";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Timestamp} from "firebase-admin/firestore";
import {rcsHarness} from "./rcsDispatchTestHarness";
import {start, keys} from "./whatsappTestHarness";
import {RCS_DISPATCHES, parseRcsDispatch, parseRcsBudget,
  parseRcsCapability, rcsBudgetScopes} from "./rcsDispatchRecords";
import {RCS_WITHDRAWAL_GRANTS} from "./rcsWithdrawalRecords";
import {RcsWithdrawalStore} from "./rcsWithdrawalStore";
import {grantSecret} from "./guestLinkTokens";
import {guestCollections, parseGrant} from "./guestRecords";
import {rcsMessageId, renderEventRcs} from "./rcsProtocol";
import {rcsTestInput} from "./rcsTestFixtures";
import {parseRcsCredentials} from "./rcsWorker";
import {EventMessageWorker} from "./messageWorker";
import {VerifiedRcsCallback} from "./rcsWebhookProtocol";
import {RcsCallbackStore} from "./rcsCallbackStore";
import {newMessageRecord} from "./messageOutbox";
import {operationContentHash} from "../../operations/durableActions";
import {BRAND} from "../../shared/generated/brand";

const onlyRcs = ["catchEventRcs"] as const;
const posts = (h: Awaited<ReturnType<typeof rcsHarness>>) =>
  h.requests.filter((r) => r.method === "POST");

async function stop(h: Awaited<ReturnType<typeof rcsHarness>>) {
  const raw = Buffer.from(JSON.stringify({agentId: h.rcsConfig.agentId,
    senderPhoneNumber: h.actor.phone, eventType: "UNSUBSCRIBE",
    eventId: "stop"}));
  const token = "fixture-rcs-stop-token-12345678901234567890";
  const parsed = VerifiedRcsCallback.receive({rawBody: Buffer.from(
    JSON.stringify({message: {data: raw.toString("base64")}})),
  signature: createHmac("sha512", token).update(raw).digest("base64"),
  clientToken: token, expectedAgentId: h.rcsConfig.agentId,
  receivedAt: h.clock.now});
  assert.equal(parsed.kind, "verified");
  if (parsed.kind !== "verified") throw new Error("Invalid test callback");
  await new RcsCallbackStore(h.db, () => h.clock.now).enqueue(parsed.callback);
}

test("RCS submission commits payload, two debits and opt-out before I/O",
  async () => {
    const h = await rcsHarness();
    h.behavior.beforeSend = async () => {
      const attempt = (await h.record()).attempts[0];
      const evidence = parseRcsDispatch(await h.read(RCS_DISPATCHES + "/" +
        attempt.attemptId));
      assert.equal(evidence.providerMessageId, rcsMessageId(attempt.attemptId));
      assert.equal(evidence.currency, "INR");
      assert.equal(evidence.capability.supportsOpenUrl, true);
      assert.ok(await h.read(RCS_WITHDRAWAL_GRANTS + "/" + h.link.linkId));
      for (const path of h.rcsBudgetPaths) {
        assert.equal((await h.read(path))?.chargedMicros, 500_000);
        assert.equal((await h.read(path))?.revision, 2);
      }
      assert.equal(JSON.stringify(evidence).includes(h.actor.phone), false);
      assert.equal(JSON.stringify(evidence).includes(h.credentials.accessToken),
        false);
    };
    const result = await h.dispatch();
    assert.equal(result.kind, "submitted");
    if (result.kind !== "submitted") throw new Error("Expected send");
    assert.equal(result.routeId, "catchEventRcs");
    assert.equal(result.outcome.kind, "accepted");
    assert.equal(posts(h).length, 1);
    const attempt = (await h.record()).attempts[0];
    assert.equal(attempt.state.kind, "accepted");
    const body = JSON.parse(posts(h)[0].body);
    assert.equal(Date.parse(body.expireTime), start + 600_000);
    assert.ok(body.contentMessage.suggestions.some((s: object) =>
      "reply" in s));
    assert.equal(h.requests.filter((r) => ["SMS", "WA"].includes(r.method))
      .length, 0);
  });

test("capability requires current consent before provider lookup", async () => {
  const h = await rcsHarness();
  await h.revoke();
  const result = await h.dispatch();
  assert.equal(result.kind, "submitted");
  assert.equal(h.requests.filter((r) => r.method === "GET").length, 0);
  assert.equal(posts(h).length, 0);
  assert.equal(h.requests.filter((r) => r.method === "SMS").length, 1);
});

test("unavailable RCS chooses SMS with independent consent and no RCS debit",
  async () => {
    for (const cause of ["unreachable", "unknown", "credential", "budget"]) {
      const h = await rcsHarness();
      if (cause === "credential") h.behavior.credentialMissing = true;
      else if (cause === "budget") h.fake.remove(h.rcsBudgetPaths[0]);
      else h.behavior.capability = cause;
      const result = await h.dispatch();
      assert.equal(result.kind, "submitted");
      if (result.kind !== "submitted") throw new Error("Expected fallback");
      assert.equal(result.routeId, "catchEventSms", cause);
      assert.equal(posts(h).length, 0);
      if (cause === "budget") {
        assert.equal(h.requests.filter((r) => r.method === "GET").length, 0);
      }
      assert.equal((await h.read(h.rcsBudgetPaths[1]))?.chargedMicros, 0);
    }
    const h = await rcsHarness(undefined, "wa-fallback",
      ["catchEventRcs", "organizerEventWhatsapp"]);
    h.behavior.capability = "unreachable";
    const result = await h.dispatch();
    assert.equal(result.kind === "submitted" ? result.routeId : null,
      "organizerEventWhatsapp");
  });

test("RCS never borrows SMS consent, and fallback never borrows RCS consent",
  async () => {
    const h = await rcsHarness(undefined, "independent", [...onlyRcs]);
    await h.revoke();
    assert.equal((await h.dispatch()).kind, "waiting");
    assert.equal(h.requests.length, 0);
    const other = await rcsHarness(undefined, "other");
    other.behavior.capability = "unreachable";
    for (const collection of ["eventAssistanceSmsPermissions",
      "eventAssistanceWhatsappPermissions"]) {
      for (const [path] of other.fake.entries()) {
        if (path.startsWith(collection + "/")) other.fake.remove(path);
      }
    }
    assert.equal((await other.dispatch()).kind, "waiting");
    assert.equal(other.requests.filter((r) => r.method !== "GET").length, 0);
  });

test("uncertain, duplicate and accepted RCS submissions all hold fallback",
  async () => {
    for (const outcome of ["accepted", "unknown", "conflict"]) {
      const h = await rcsHarness();
      h.behavior.send = outcome;
      await h.dispatch();
      h.clock.now += 610_000;
      const retry = await h.dispatch();
      assert.equal(retry.kind, "waiting");
      if (retry.kind !== "waiting") throw new Error("Expected wait");
      assert.equal(retry.decision.kind, "reconcile", outcome);
      assert.equal(posts(h).length, 1);
      assert.equal(h.requests.filter((r) => r.method === "SMS").length, 0);
      assert.equal((await h.read(h.rcsBudgetPaths[0]))?.chargedMicros, 500_000);
    }
  });

test("only explicit rejection enables a fresh independently checked SMS send",
  async () => {
    const h = await rcsHarness();
    h.behavior.send = "rejected";
    await h.dispatch();
    assert.equal((await h.record()).attempts[0].state.kind, "failed");
    h.clock.now += 1001;
    const retry = await h.dispatch();
    assert.equal(retry.kind === "submitted" ? retry.routeId : null,
      "catchEventSms");
    assert.equal(posts(h).length, 1);
    assert.equal((await h.record()).attempts.length, 2);
  });

test("STOP and revoked consent invalidate a completed capability lookup",
  async () => {
    for (const change of ["stop", "revoke", "sender", "phone", "source"]) {
      const h = await rcsHarness(undefined, change, [...onlyRcs]);
      h.behavior.afterCapability = async () => {
        h.clock.now++;
        if (change === "stop") await stop(h);
        if (change === "revoke") await h.revoke();
        if (change === "sender") {
          await h.write(h.rcsSenderPath,
            {...h.rcsConfig, credentialVersion:
            "projects/fixture/secrets/rcs/versions/2"});
        }
        if (change === "phone") {
          await h.write(h.attendeePath,
            {...await h.read(h.attendeePath), phoneE164: "+919888888888"});
        }
        if (change === "source") h.fake.generation = Timestamp.fromMillis(2);
      };
      await h.dispatch();
      assert.equal(posts(h).length, 0, change);
      assert.equal((await h.read(h.rcsBudgetPaths[0]))?.chargedMicros, 0);
    }
  });

test("reserved RCS claims re-read permission, capability, budgets and guidance",
  async () => {
    for (const change of ["stop", "budget", "currency", "agent", "sender",
      "expiredCapability", "guestRevoked", "guidance", "checkedIn"]) {
      const h = await rcsHarness(undefined, change, [...onlyRcs]);
      const cap = await h.capability();
      const outbox = h.rcsStore.outbox(h.link.linkId, h.rcsConfig, cap);
      const reservation = await outbox.reserve(h.messageId);
      const attempt = reservation.record.attempts[0];
      assert.ok(attempt);
      if (change === "stop") await stop(h);
      if (["budget", "currency", "agent"].includes(change)) {
        const budget = await h.read(h.rcsBudgetPaths[0]);
        await h.write(h.rcsBudgetPaths[0], {...budget,
          ...(change === "budget" ? {limitMicros: 0} : change === "currency" ?
            {currency: "USD"} : {agentId: "other@rbm.goog"})});
      }
      if (change === "sender") {
        await h.write(h.rcsSenderPath,
          {...h.rcsConfig, status: "paused"});
      }
      if (change === "expiredCapability") h.clock.now += 60_000;
      if (change === "guestRevoked") {
        const path = guestCollections.grants + "/" + h.link.linkId;
        await h.write(path, {...await h.read(path), revokedAt: h.clock.now});
      }
      if (change === "guidance") await h.progress.confirm("two");
      if (change === "checkedIn") {
        await h.write(h.attendeePath,
          {...await h.read(h.attendeePath), status: "checkedIn"});
      }
      const claim = await outbox.claimLiveDispatch(h.messageId,
        attempt.attemptId,
        h.rcsStore.prepare(h.link.linkId, h.rcsConfig, cap));
      assert.equal(claim.kind, "withheld", change);
      assert.equal(await h.read(RCS_DISPATCHES + "/" + attempt.attemptId),
        undefined);
      assert.equal((await h.read(h.rcsBudgetPaths[1]))?.chargedMicros, 0);
    }
  });

test("failed claim commits cannot leave partial debits or opt-out bindings",
  async () => {
    const h = await rcsHarness(undefined, "rollback", [...onlyRcs]);
    const cap = await h.capability();
    const outbox = h.rcsStore.outbox(h.link.linkId, h.rcsConfig, cap);
    const attempt = (await outbox.reserve(h.messageId)).record.attempts[0];
    const before = h.fake.entries();
    h.fake.failNextCommit = true;
    await assert.rejects(outbox.claimLiveDispatch(h.messageId,
      attempt.attemptId,
      h.rcsStore.prepare(h.link.linkId, h.rcsConfig, cap)), /interruption/);
    assert.deepEqual(h.fake.entries(), before);
    assert.equal((await outbox.claimLiveDispatch(h.messageId, attempt.attemptId,
      h.rcsStore.prepare(h.link.linkId, h.rcsConfig, cap))).kind, "claimed");
  });

test("capability and credentials cannot outlive their scope or clock",
  async () => {
    const h = await rcsHarness(undefined, "expiry", [...onlyRcs]);
    h.behavior.afterCapability = async () => {
      h.clock.now += 60_000;
    };
    await h.dispatch();
    assert.equal(posts(h).length, 0);
    const cap = await h.capability();
    for (const patch of [{requestId: cap.requestId + "\n"},
      {validUntil: cap.checkedAt}, {validUntil: cap.checkedAt + 60_001}]) {
      assert.throws(() => parseRcsCapability({...cap, ...patch}));
    }
    for (const patch of [{accessToken: "token\n"}, {senderId: "other"},
      {agentId: "other"}, {region: "us" as const}, {expiresAt: h.clock.now},
      {credentialVersion: "projects/fixture/secrets/rcs/versions/99"}]) {
      assert.throws(() => parseRcsCredentials({...h.credentials, ...patch},
        h.rcsConfig, h.clock.now));
    }
  });

test("queued RCS expiry is bounded by event and explicit consent deadlines",
  async () => {
    const h = await rcsHarness(undefined, "short-event", [...onlyRcs],
      start + 120_000);
    await h.dispatch();
    assert.equal(Date.parse(JSON.parse(posts(h)[0].body).expireTime),
      start + 120_000);
    const input = rcsTestInput();
    const rendered = renderEventRcs({...input, expiresBy: input.now + 1234});
    assert.equal(rendered.expiresAt, input.now + 1234);
    for (const expiresBy of [NaN, input.now, -1]) {
      assert.throws(() => renderEventRcs({...input, expiresBy}));
    }
  });

test("RCS opt-out issued by a real claim immediately blocks another message",
  async () => {
    const h = await rcsHarness(undefined, "optout", [...onlyRcs]);
    await h.dispatch();
    const grant = parseGrant(await h.read(guestCollections.grants + "/" +
      h.link.linkId));
    const withdrawal = new RcsWithdrawalStore(h.db, () => h.clock.now);
    const result = await withdrawal.withdraw({linkId: grant.linkId,
      secret: grantSecret(grant, keys), requestId: "stop",
      expectedRevision: 1});
    assert.equal(result.view.preference, "disabled");
    const cap = await h.capability();
    const facts = await h.db.runTransaction((tx) => h.rcsStore.readFacts(tx,
      h.intent, h.link.linkId, h.clock.now, h.rcsConfig, cap));
    assert.equal(facts.routes[0].state.kind, "blocked");
    assert.equal(posts(h).length, 1);
  });

test("provider features change presentation without discarding guest choices",
  async () => {
    const h = await rcsHarness();
    h.behavior.supportsOpenUrl = false;
    await h.dispatch();
    const body = JSON.parse(posts(h)[0].body);
    assert.ok(body.contentMessage.text.includes(`${BRAND.web.origin}/`));
    assert.equal(body.contentMessage.suggestions.length, 1);
    assert.ok(body.contentMessage.suggestions[0].reply);
  });

test("RCS records reject foreign and malformed spending evidence",
  async () => {
    const h = await rcsHarness();
    const budget = parseRcsBudget(await h.read(h.rcsBudgetPaths[1]));
    assert.deepEqual(rcsBudgetScopes(h.context,
      Date.parse("2026-09-07T23:59:59Z"))[1],
    {kind: "senderDay", day: "2026-09-07"});
    assert.throws(() => parseRcsBudget({...budget,
      startsAt: budget.startsAt + 1}));
    await h.dispatch();
    const attempt = (await h.record()).attempts[0];
    const evidence = parseRcsDispatch(await h.read(RCS_DISPATCHES + "/" +
      attempt.attemptId));
    for (const patch of [{providerMessageId: randomUUID()}, {expiresAt: start},
      {permissionId: "foreign"}, {capability: {...evidence.capability,
        configHash: "0".repeat(64)}}, {budgetDebits: [evidence.budgetDebits[1],
        evidence.budgetDebits[0]]}]) {
      assert.throws(() => parseRcsDispatch({...evidence, ...patch}));
    }
  });

test("shared worker cannot load RCS for rehearsal or an unpermitted route",
  async () => {
    const h = await rcsHarness(undefined, "unpermitted", ["catchEventSms"]);
    await h.dispatch();
    assert.equal(h.requests.some((r) => r.method === "GET"), false);
    assert.equal(posts(h).length, 0);
    const current = await h.record();
    const rehearsal = {...current.intent, eventId: "v1",
      context: {mode: "rehearsal",
        rehearsalId: "r1", virtualEventId: "v1", clockId: "c1"}};
    const fake = newMessageRecord(rehearsal as typeof current.intent, start);
    await h.write("eventAssistanceMessages/" + fake.messageId, fake);
    const worker = new EventMessageWorker(h.db, {rcs: {prepareChannel: () => {
      throw new Error("rehearsal attempted credential I/O");
    }}}, () => h.clock.now);
    assert.deepEqual(await worker.dispatch(fake.messageId, h.link.linkId),
      {kind: "withheld", reason: "rehearsal"});
  });

test("Firestore concurrent RCS workers send once and debit both budgets once", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 60_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const key = randomUUID();
  const app = initializeApp({projectId: "demo-rcs-dispatch-" + key.slice(0, 8)},
    "rcs-dispatch-" + key);
  const db = getEmulatorFirestore(app);
  try {
    const h = await rcsHarness(db, "real", [...onlyRcs]);
    await Promise.all(Array.from({length: 4}, () => h.dispatch()));
    assert.equal(posts(h).length, 1);
    assert.equal((await h.record()).attempts.length, 1);
    for (const path of h.rcsBudgetPaths) {
      assert.equal((await h.read(path))?.chargedMicros, 500_000);
    }
    const grant = await h.read(RCS_WITHDRAWAL_GRANTS + "/" + h.link.linkId);
    assert.ok(grant);
    const receipt = parseRcsDispatch(await h.read(RCS_DISPATCHES + "/" +
      (await h.record()).attempts[0].attemptId));
    assert.equal(receipt.permissionHash,
      operationContentHash(await h.permission()));
  } finally {
    for (const collection of await db.listCollections()) {
      for (const doc of (await collection.get()).docs) await doc.ref.delete();
    }
    await deleteApp(app);
  }
});
