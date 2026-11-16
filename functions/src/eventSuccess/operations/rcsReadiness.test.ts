import {getEmulatorFirestore} from "../../shared/testing/emulatorFirestore";
import assert from "node:assert/strict";
import test from "node:test";
import {createHmac, randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {Firestore} from "firebase-admin/firestore";
import {operationCollections} from "../../operations/collections";
import {rcsHarness} from "./rcsDispatchTestHarness";
import {rcsConsentCollections, parseRcsPermission, rcsPermissionId} from
  "./rcsConsent";
import {rcsEndpointId, rcsPhoneHash} from "./rcsProtocol";
import {RcsCallbackStore} from "./rcsCallbackStore";
import {VerifiedRcsCallback} from "./rcsWebhookProtocol";
import {RCS_SUBSCRIPTIONS, rcsSubscriptionId} from "./rcsSubscriptions";
import {readEventMessageContactability, MessagePurpose} from
  "./messageContactability";
import {AssistanceSourceChange, sourceWakeScopes} from "./sourceWorkSignals";
import {ReadinessSourceScope, SourceWorkInput, sourceWorkIds} from
  "./sourceWorkRecords";
import {SourceReadinessTargets, parseReadinessTargetKey} from
  "./sourceReadinessTargets";
import {AssistanceSourceWorkStore} from "./sourceWorkStore";
import {newLiveWorkRecords} from "./liveWorkRecords";
import {LiveAssistanceWorkRunner} from "./liveWorkRunner";
import {setupRuntimePublication} from "./runtimeConfigTestHarness";
import {RUNTIME_CONFIGS} from "./runtimeConfigRecords";

type Harness = Awaited<ReturnType<typeof rcsHarness>>;
async function contact(h: Harness, purpose: MessagePurpose = "joiningUpdate") {
  const result = await h.db.runTransaction((tx) =>
    readEventMessageContactability(h.db, tx,
      {context: h.context, attendeeId: h.scope.attendeeId},
      [{routeId: "catchEventRcs", senderId: h.rcsConfig.senderId}],
      purpose, h.clock.now));
  return result[0].state;
}
async function subscription(h: Harness,
  eventType: "SUBSCRIBE" | "UNSUBSCRIBE") {
  const payload = Buffer.from(JSON.stringify({agentId: h.rcsConfig.agentId,
    senderPhoneNumber: h.actor.phone, eventType, eventId: randomUUID()}));
  const token = "fixture-only-rcs-token-12345678901234567890";
  const verified = VerifiedRcsCallback.receive({rawBody:
    Buffer.from(JSON.stringify({message: {data: payload.toString("base64")}})),
  signature: createHmac("sha512", token).update(payload).digest("base64"),
  clientToken: token, expectedAgentId: h.rcsConfig.agentId,
  receivedAt: h.clock.now});
  assert.ok(verified.kind === "verified");
  await new RcsCallbackStore(h.db, () => h.clock.now)
    .enqueue(verified.callback);
}

test("RCS contactability is short-lived, private and independent of dispatch",
  async () => {
    const h = await rcsHarness();
    for (const path of h.rcsBudgetPaths) h.fake.remove(path);
    h.behavior.credentialMissing = true;
    const before = h.fake.entries();
    const result = await contact(h);
    assert.ok(result.kind === "canPrepare");
    assert.equal(result.validUntil, h.clock.now + 30_000);
    assert.deepEqual(h.fake.entries(), before);
    assert.equal(h.requests.length, 0);
    for (const hidden of [h.actor.phone, h.rcsConfig.credentialVersion,
      h.rcsConfig.agentId]) {
      assert.equal(JSON.stringify(result)
        .includes(hidden), false);
    }
    await h.write(h.rcsSenderPath, {...h.rcsConfig, quote:
      {...h.rcsConfig.quote, validUntil: h.clock.now + 1000}});
    const limited = await contact(h);
    assert.ok(limited.kind === "canPrepare");
    assert.equal(limited.validUntil, h.clock.now + 1000);
    assert.notEqual(limited.evidenceHash, result.evidenceHash);
    h.clock.now += 1000;
    assert.deepEqual(await contact(h),
      {kind: "blocked", reason: "notProvisioned"});
  });

test("RCS planning reuses current consent and sender checks", async () => {
  for (const change of ["sender", "agent", "pause", "future", "purpose",
    "prefix", "phone", "receipt", "permission", "revoked", "admission",
    "closed"]) {
    const h = await rcsHarness();
    const config = structuredClone(h.rcsConfig);
    if (change === "sender") config.senderId = "foreign";
    if (change === "agent") config.agentId = "different-agent";
    if (change === "pause") config.status = "paused";
    if (change === "future") config.activation.approvedAt = h.clock.now + 1;
    if (change === "purpose") config.allowedPurposes = ["followUp"];
    if (change === "prefix") config.recipientPrefixes = ["+1"];
    await h.write(h.rcsSenderPath, config);
    if (change === "phone" || change === "admission") {
      await h.write(h.attendeePath, {...await h.read(h.attendeePath),
        ...(change === "phone" ? {phoneE164: "+918888888888"} :
          {status: "waitlisted"})});
    }
    if (change === "receipt") {
      h.fake.remove(rcsConsentCollections.receipts +
      "/" + (await h.permission()).currentReceiptId);
    }
    if (change === "permission") h.fake.remove(h.rcsPermissionPath);
    if (change === "revoked") await h.revoke();
    if (change === "closed") h.clock.now += 2 * 86_400_000;
    assert.equal((await contact(h)).kind, "blocked", change);
  }
});

test("START preserves evidence; STOP restricts RCS without changing SMS or WA",
  async () => {
    const h = await rcsHarness();
    const initial = await contact(h);
    assert.ok(initial.kind === "canPrepare");
    h.clock.now++;
    await subscription(h, "SUBSCRIBE");
    const started = await contact(h);
    assert.ok(started.kind === "canPrepare");
    assert.equal(started.evidenceHash, initial.evidenceHash);
    h.clock.now++;
    await subscription(h, "UNSUBSCRIBE");
    assert.deepEqual(await contact(h),
      {kind: "blocked", reason: "suppressed"});
    const other = await h.db.runTransaction((tx) =>
      readEventMessageContactability(h.db, tx,
        {context: h.context, attendeeId: h.scope.attendeeId}, [
          {routeId: "catchEventSms", senderId: "sms-rcs"},
          {routeId: "organizerEventWhatsapp", senderId: h.scope.senderId}],
        "joiningUpdate", h.clock.now));
    assert.deepEqual(other.map((r) => r.state.kind),
      ["canPrepare", "canPrepare"]);
    h.clock.now++;
    await subscription(h, "SUBSCRIBE");
    assert.equal((await contact(h)).kind, "blocked");
    h.clock.now++;
    await h.enable("review-after-stop");
    assert.equal((await contact(h)).kind, "canPrepare");
  });

test("RCS source scopes ignore START and debits and select exact repairs",
  async () => {
    const h = await rcsHarness();
    const permission = await h.permission();
    assert.equal(permission.subscriptionId, rcsSubscriptionId(
      h.rcsConfig.agentId, rcsPhoneHash(h.actor.phone)!));
    assert.throws(() => parseRcsPermission({...permission,
      subscriptionId: "rcs-subscription:" + "0".repeat(64)}));
    const scopes = (collection: AssistanceSourceChange["source"]["collection"],
      documentId: string, before: object | null, after: object | null) =>
      sourceWakeScopes({source: {collection, documentId, eventId: "cloud-event",
        occurredAt: h.clock.now}, before: before === null ? null :
        {value: {...before}, generation: 1}, after: after === null ? null :
        {value: {...after}, generation: 1}});
    assert.deepEqual(scopes(rcsConsentCollections.permissions,
      permission.permissionId, null, permission),
    [{context: h.context, attendeeId: h.scope.attendeeId}]);
    assert.deepEqual(scopes(rcsConsentCollections.senders,
      h.rcsConfig.senderId, h.rcsConfig, {...h.rcsConfig, status: "paused"}),
    [{kind: "sender", routeId: "catchEventRcs",
      senderId: h.rcsConfig.senderId}]);
    for (const path of h.rcsBudgetPaths) {
      const budget = (await h.read(path))!;
      assert.equal(scopes("eventAssistanceBudgets", path.split("/")[1],
        budget, {...budget, chargedMicros: 1, revision: 2}).length, 0);
      for (const patch of [{limitMicros: 3_000_000}, {agentId: "new-agent"},
        {status: "paused"}]) {
        assert.equal(scopes("eventAssistanceBudgets", path.split("/")[1],
          budget, {...budget, ...patch}).length, 1);
      }
      assert.equal(scopes("eventAssistanceBudgets", path.split("/")[1],
        {...budget, chargedMicros: 1}, budget).length, 1);
    }
    h.clock.now++;
    await subscription(h, "SUBSCRIBE");
    const path = RCS_SUBSCRIPTIONS + "/" + permission.subscriptionId;
    const started = (await h.read(path))!;
    assert.equal(scopes(RCS_SUBSCRIPTIONS, permission.subscriptionId,
      null, started).length, 0);
    h.clock.now++;
    await subscription(h, "UNSUBSCRIBE");
    const stopped = (await h.read(path))!;
    const exact = [{kind: "rcsSubscription",
      subscriptionId: permission.subscriptionId}];
    assert.deepEqual(scopes(RCS_SUBSCRIPTIONS, permission.subscriptionId,
      started, stopped), exact);
    h.clock.now++;
    await subscription(h, "SUBSCRIBE");
    assert.equal(scopes(RCS_SUBSCRIPTIONS, permission.subscriptionId,
      stopped, (await h.read(path))!).length, 0);
    assert.deepEqual(scopes(RCS_SUBSCRIPTIONS, permission.subscriptionId,
      stopped, null), exact);
  });

async function conversationDiscovery(db?: Firestore) {
  const h = await rcsHarness(db, randomUUID());
  const permission = await h.permission();
  const scope: ReadinessSourceScope = {kind: "rcsSubscription",
    subscriptionId: permission.subscriptionId};
  const lookup = new SourceReadinessTargets(h.db, () => h.clock.now);
  const source = new AssistanceSourceWorkStore(h.db, () => h.clock.now);
  const input: SourceWorkInput = {scope, source: {collection: RCS_SUBSCRIPTIONS,
    documentId: permission.subscriptionId, eventId: randomUUID(),
    occurredAt: h.clock.now}};
  const children: Array<{sourceId: string; guestId: string}> = [];
  for (let i = 0; i < 24; i++) {
    const context = {...h.context, eventId: "rcs-discovery-" + i};
    const id = rcsPermissionId(context, permission.attendeeId,
      permission.senderId);
    // Canonical discovery data is not consent authority: publication still
    // requires the actual source and matching immutable receipt.
    await h.write(rcsConsentCollections.permissions + "/" + id,
      {...permission, permissionId: id, context,
        recipientEndpointId: rcsEndpointId(context, permission.attendeeId,
          permission.phoneE164), expiresAt: h.clock.now + 1000 * (30 - i)});
    const work = newLiveWorkRecords({schemaVersion: 1, kind: "liveLateJoin",
      scope: {context, attendeeId: permission.attendeeId, episodeId: "episode"},
      options: {routes: [{routeId: "catchEventRcs",
        senderId: permission.senderId}], responseDeadline: null,
      deliveryPolicy: {maxAttempts: 3, maxAttemptsPerRoute: 1,
        minimumRetrySeconds: 1}}, expiresAt: h.clock.now + 60_000,
      maxEvaluations: 100, checkpoint: {dueAt: h.clock.now + 60_000,
        evaluatedAt: null, evaluations: 0, observation: null, sourceHash: null,
        publication: null}}, h.clock.now);
    await h.write(operationCollections.runs + "/" + work.run.runId, work.run);
    await h.write(operationCollections.workItems + "/" + work.item.workItemId,
      work.item);
    children.push({sourceId: sourceWorkIds({scope: {context,
      attendeeId: permission.attendeeId}, source: input.source}).workItemId,
    guestId: work.item.workItemId});
  }
  const keys = await lookup.list(scope, h.clock.now, null, 21);
  assert.equal(keys.length, 21);
  await assert.rejects(lookup.list(scope, h.clock.now, null, 22));
  assert.equal((await lookup.list({...scope,
    subscriptionId: "rcs-subscription:" + "f".repeat(64)},
  h.clock.now, null, 21)).length, 0);
  assert.throws(() => parseReadinessTargetKey(keys[0], {
    kind: "whatsappEndpoint",
    organizerId: h.context.organizerId,
    recipientEndpointId: "whatsapp:" + "a".repeat(64)}));
  const parentId = (await source.enqueue(input)).item.workItemId;
  await source.process(parentId);
  const first = (await source.get(parentId)).payload.checkpoint;
  assert.equal(first.visited, 20);
  const [, lastId] = parseReadinessTargetKey(first.cursor!, scope);
  if (db) {
    await db.collection(rcsConsentCollections.permissions)
      .doc(lastId).delete();
  } else h.fake.remove(rcsConsentCollections.permissions + "/" + lastId);
  await source.process(parentId);
  assert.equal((await source.get(parentId)).payload.checkpoint.visited, 25);
  assert.equal((await source.get(parentId)).payload.checkpoint.phase,
    "complete");
  const guest = new LiveAssistanceWorkRunner(h.db, () => h.clock.now);
  for (const child of children) {
    await source.process(child.sourceId);
    const work = await guest.store.get(child.guestId);
    assert.equal(work.payload.checkpoint.dueAt, h.clock.now);
    assert.equal(work.item.revision, 1);
  }
  const key = keys[0];
  h.clock.now += 60_000;
  assert.equal(await lookup.resolve(scope, key, input.source.occurredAt), null);
  assert.equal((await lookup.list(scope, h.clock.now, null, 21)).length, 1,
    "only the original permission retains its later event-service expiry");
  assert.equal(h.requests.length, 0, "waking work never sends a message");
}

test("conversation discovery resumes a deleted cursor", async () => {
  await conversationDiscovery();
});

test("RCS sender discovery requires an exact configured route and index",
  async () => {
    const h = await setupRuntimePublication();
    const path = RUNTIME_CONFIGS + "/" + h.runtime.binding.runtimeId;
    const scope: ReadinessSourceScope = {kind: "sender",
      routeId: "catchEventRcs", senderId: "rcs-configured"};
    await h.write(path, {...await h.read(path), configuration:
      {...h.runtime.configuration, options: {...h.runtime.configuration.options,
        routes: [{routeId: scope.routeId, senderId: scope.senderId}]}}});
    const lookup = new SourceReadinessTargets(h.db, () => h.clock.now);
    const keys = await lookup.list(scope, h.clock.now, null, 21);
    assert.equal(keys.length, 1);
    assert.deepEqual(await lookup.resolve(scope, keys[0], h.clock.now),
      {context: h.context, attendeeId: null});
    assert.equal((await lookup.list({...scope, routeId: "catchEventSms"},
      h.clock.now, null, 21)).length, 0);
    const indexes = JSON.parse(readFileSync(
      "../firestore.indexes.json", "utf8"))
      .indexes as Array<{collectionGroup: string; fields: unknown[]}>;
    assert.ok(indexes.some((i) =>
      i.collectionGroup === rcsConsentCollections.permissions &&
      JSON.stringify(i.fields) === JSON.stringify([
        {fieldPath: "channel", order: "ASCENDING"},
        {fieldPath: "subscriptionId", order: "ASCENDING"},
        {fieldPath: "expiresAt", order: "ASCENDING"},
        {fieldPath: "__name__", order: "ASCENDING"}])));
  });

test("Firestore resolves exact RCS conversation pages and guest wakes", {
  skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 120_000,
}, async () => {
  assert.match(process.env.FIRESTORE_EMULATOR_HOST ?? "",
    /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/);
  const id = randomUUID();
  const app = initializeApp({projectId: "demo-rcs-readiness-" + id.slice(0, 8)},
    "rcs-readiness-" + id);
  try {
    await conversationDiscovery(getEmulatorFirestore(app));
  } finally {
    await deleteApp(app);
  }
});
