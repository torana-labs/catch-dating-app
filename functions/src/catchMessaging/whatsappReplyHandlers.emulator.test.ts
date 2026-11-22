import assert from "node:assert/strict";
import {test} from "node:test";
import {initializeApp, deleteApp} from "firebase-admin/app";
import {getFirestore, Timestamp, type Firestore} from
  "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FormPaymentTestStore} from
  "../payments/formPayments/formPaymentTestStore";
import {checkRateLimit, RateLimitConfig} from "../shared/rateLimit";
import {createCatchReplyHandlers, adminReviewCatchWhatsappInbound,
  adminSendCatchWhatsappReply} from "./whatsappReplyHandlers";
import {catchEndpointHash, CATCH_SUPPORT_WINDOW_MS} from "./whatsappReply";
import type {CatchReplyConfig} from "./whatsappReply";
import {CATCH_RECEIPTS, CATCH_REPLY_READINESS, CATCH_REPLY_OPERATIONS,
  catchReadinessId, persistCatchStopReceipt} from "./whatsappReplyStore";
import {parseCatchWhatsappWebhook, WEBHOOK_RETENTION_MILLIS} from
  "./whatsappWebhookProtocol";
import {prepareCatchReplyProvider} from "./whatsappReplyProvider";
import {processCatchWhatsappReceipt} from "./whatsappReceiptConsumer";
import {createSyntheticCatchAuthority} from "./whatsappAuthorityTestHarness";
import {CATCH_APP_AUTHORITIES} from "./whatsappAppAuthorityStore";
import {CATCH_INGRESS_EVIDENCE} from "./whatsappIngressStore";

const time = 1800000000000;
const config: CatchReplyConfig = {enabled: true, atomicStopIngressReady: true,
  wabaId: "123", phoneNumberId: "456", actorUid: "agent",
  recipientUid: "participant", recipientE164: "+919000000001",
  credentialVersionResource:
    "projects/demo-catch/secrets/CATCH_WHATSAPP_ACCESS_TOKEN/versions/1",
  graphVersion: "v23.0", readinessEvidenceHash: "d".repeat(64)};
function receipt(text = "Please help with my account", id = "wamid.handler") {
  return parseCatchWhatsappWebhook(Buffer.from(JSON.stringify({
    object: "whatsapp_business_account", entry: [{id: "123", changes: [{
      field: "messages", value: {messaging_product: "whatsapp",
        metadata: {phone_number_id: "456"}, messages: [{id,
          from: "919000000001", timestamp: String(time / 1000),
          type: "text", text: {body: text}}]},
    }]}],
  })), config)[0];
}
function fixture(realDb?: Firestore) {
  const fake = Object.assign(new FormPaymentTestStore(), {
    projectId: realDb ? String(Reflect.get(realDb, "projectId")) :
      "demo-catch-authority",
    databaseId: "(default)"});
  const db = realDb ?? fake as unknown as Firestore;
  const event = receipt();
  const original = {...event, receivedAtMillis: time,
    expiresAt: Timestamp.fromMillis(time + WEBHOOK_RETENTION_MILLIS)};
  const authority = createSyntheticCatchAuthority(db, () => time + 1000,
    config.recipientE164, fake.projectId);
  authority.seedInto(fake.records, original);
  const readiness = {schemaVersion: 1, readinessId: catchReadinessId(config),
    wabaId: "123", phoneNumberId: "456", recipientUid: "participant",
    endpointHash: catchEndpointHash(config.recipientE164),
    purpose: "serviceSupport", state: "ready", completeHistory: true,
    appAuthorityBindings: authority.bindings,
    historyFromMillis: 0, coveredThroughMillis: time,
    atomicIngressStartedAtMillis: time, evidenceSha256: "d".repeat(64),
    reviewedByUid: "owner", reviewedAtMillis: time,
    expiresAtMillis: time + CATCH_SUPPORT_WINDOW_MS};
  const readinessPath = CATCH_REPLY_READINESS + "/" +
      catchReadinessId(config);
  fake.records.set(readinessPath, readiness);
  fake.records.set(CATCH_RECEIPTS + "/" + event.eventId, original);
  let sends = 0; let credentialReads = 0;
  const rateActions: string[] = [];
  const deps = {config: () => ({...config}), db: () => db,
    authority: () => authority.store,
    getUser: async (uid: string) => ({disabled: false,
      customClaims: uid === "owner" ? {adminOwner: true} : {support: true},
      phoneNumber: uid === "participant" ? config.recipientE164 : undefined}),
    now: () => time + 1000,
    rateLimit: async (db: FirebaseFirestore.Firestore, uid: string,
      action: string, limit?: RateLimitConfig) => {
      rateActions.push(action);
      assert.ok(limit, `${action} must pass its own limit`);
      await checkRateLimit(db, uid, action, limit);
    },
    prepare: (controlled: CatchReplyConfig) => prepareCatchReplyProvider(
      controlled, {readCredential: async () => {
        credentialReads++;
        return JSON.stringify({schema: "catch.whatsapp-sender-token/v1",
          wabaId: "123", phoneNumberId: "456", accessToken: "mock-only"});
      }, now: () => time + 1000, fetch: async () => {
        sends++;
        return new Response(JSON.stringify({messages: [{id: "wamid.sent"}]}));
      }}),
  };
  const handlers = createCatchReplyHandlers(deps);
  const request = (data: unknown) => ({auth: {uid: "agent", token: {
    support: true, auth_time: time / 1000}}, app: {appId: "mock-app"},
  rawRequest: {header: () => "Bearer synthetic-current-id-token"}, data}) as
    unknown as CallableRequest<unknown>;
  const reviewRequest = request({purpose: "serviceSupport",
    inboundEventId: event.eventId});
  return {fake, db, event, original, readiness, readinessPath, deps, handlers,
    authority,
    request, reviewRequest, rateActions, sends: () => sends,
    reads: () => credentialReads};
}

test("callable composition rejects scope, App Check and payload bypasses",
  async () => {
    const f = fixture();
    for (const request of [{...f.reviewRequest, auth: undefined},
      {...f.reviewRequest, app: undefined},
      {...f.reviewRequest, auth: {uid: "foreign", token: {support: true}}},
      f.request({purpose: "marketing", inboundEventId: f.event.eventId}),
      f.request({purpose: "serviceSupport", inboundEventId: f.event.eventId,
        organizerId: "foreign"})]) {
      await assert.rejects(f.handlers.review(
        request as CallableRequest<unknown>));
    }
    assert.equal(f.reads(), 0); assert.equal(f.sends(), 0);
    assert.equal(f.rateActions.length, 0);
  });

test("missing, incomplete or revoked readiness and stale owners deny review",
  async () => {
    const f = fixture();
    for (const patch of [null, {completeHistory: false}, {historyFromMillis: 1},
      {state: "revoked"}, {evidenceSha256: "e".repeat(64)},
      {recipientUid: "foreign"}, {coveredThroughMillis: time - 1},
      {atomicIngressStartedAtMillis: time + 1},
      {reviewedAtMillis: time + 2000}, {expiresAtMillis: time},
      {expiresAtMillis: time + CATCH_SUPPORT_WINDOW_MS + 1}]) {
      if (patch === null) f.fake.records.delete(f.readinessPath);
      else f.fake.records.set(f.readinessPath, {...f.readiness, ...patch});
      await assert.rejects(f.handlers.review(f.reviewRequest));
    }
    f.fake.records.set(f.readinessPath, f.readiness);
    const revokedOwner = createCatchReplyHandlers({...f.deps,
      getUser: async (uid) => uid === "owner" ?
        {disabled: false, customClaims: {support: true}} :
        f.deps.getUser(uid)});
    await assert.rejects(revokedOwner.review(f.reviewRequest));
    assert.equal(f.reads(), 0); assert.equal(f.sends(), 0);
  });

test("send-time readiness is reread after review and credential preparation",
  async () => {
    const f = fixture();
    const reviewed = await f.handlers.review(f.reviewRequest);
    const handlers = createCatchReplyHandlers({...f.deps,
      prepare: async (scope) => {
        f.fake.records.set(f.readinessPath, {...f.readiness, state: "revoked"});
        return f.deps.prepare(scope);
      }});
    await assert.rejects(handlers.send(f.request({purpose: "serviceSupport",
      inboundEventId: f.event.eventId,
      reviewedInboundTextHash: reviewed.reviewedInboundTextHash,
      confirmSupportRequest: true, body: "Requested support"})));
    assert.equal(f.sends(), 0);
    assert.equal(f.reads(), 1,
      "the final gate must run after credential preparation");
    assert.equal([...f.fake.records.keys()].some((key) =>
      key.startsWith(CATCH_REPLY_OPERATIONS + "/")), false);
  });

test("shared rate limit blocks excess reviews and sends before credentials",
  async () => {
    const f = fixture();
    const reviewed = await f.handlers.review(f.reviewRequest);
    const rejected = createCatchReplyHandlers({...f.deps,
      rateLimit: async () => {
        throw new Error("Rate limited");
      }});
    await assert.rejects(rejected.review(f.reviewRequest), /Rate limited/);
    await assert.rejects(rejected.send(f.request({purpose: "serviceSupport",
      inboundEventId: f.event.eventId,
      reviewedInboundTextHash: reviewed.reviewedInboundTextHash,
      confirmSupportRequest: true, body: "Requested support"})),
    /Rate limited/);
    assert.deepEqual(f.rateActions, ["adminReviewCatchWhatsappInbound"]);
    assert.equal(f.reads(), 0);
  });

test("faithful synthetic fixture still rejects changed authority, session " +
  "and ingress proof", async () => {
  const baseline = fixture();
  const reviewed = await baseline.handlers.review(baseline.reviewRequest);
  assert.equal(reviewed.inboundText,
    baseline.event.text);
  for (const changed of ["authority", "session", "ingress"] as const) {
    const f = fixture();
    const request = {...f.reviewRequest};
    if (changed === "authority") {
      f.fake.records.get(CATCH_APP_AUTHORITIES + "/owner")!.revision = 2;
    }
    if (changed === "session") {
      Object.assign(request, {rawRequest: {
        header: () => "Bearer wrong-synthetic-session"}});
    }
    if (changed === "ingress") {
      f.fake.records.get(
        CATCH_INGRESS_EVIDENCE + "/" + f.event.eventId)!.state = "blocked";
    }
    await assert.rejects(f.handlers.review(request));
    assert.equal(f.reads(), 0);
    assert.equal(f.sends(), 0);
  }
});

test("exported callables stay disabled before database or credential access",
  async () => {
    const f = fixture();
    for (const callable of [adminReviewCatchWhatsappInbound,
      adminSendCatchWhatsappReply]) {
      await assert.rejects(callable.run(f.reviewRequest), /disabled/);
    }
  });

test("authenticated mocked reply, delivery and STOP use real Firestore",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST}, async () => {
    assert.match(process.env.FIRESTORE_EMULATOR_HOST!,
      /^(localhost|127\.0\.0\.1):[0-9]+$/u);
    const app = initializeApp({projectId: "demo-catch-cat16-handlers"},
      "cat16-handlers-" + Date.now());
    const db = getFirestore(app); const f = fixture(db);
    const receiptPath = CATCH_RECEIPTS + "/" + f.event.eventId;
    const paths = [f.readinessPath, receiptPath];
    try {
      for (const [key, row] of f.authority.rows) await db.doc(key).set(row);
      await db.doc(CATCH_INGRESS_EVIDENCE + "/" + f.event.eventId)
        .set(f.authority.ingress(f.original));
      await db.doc(f.readinessPath).set(f.readiness);
      await db.doc(receiptPath).set(f.original);
      const reviewed = await f.handlers.review(f.reviewRequest);
      assert.equal(reviewed.inboundText, f.event.text);
      const send = f.request({purpose: "serviceSupport",
        inboundEventId: f.event.eventId,
        reviewedInboundTextHash: reviewed.reviewedInboundTextHash,
        confirmSupportRequest: true, body: "Here is your requested help."});
      const first = await f.handlers.send(send);
      paths.push(CATCH_REPLY_OPERATIONS + "/" + first.operationId);
      const status = parseCatchWhatsappWebhook(Buffer.from(JSON.stringify({
        object: "whatsapp_business_account", entry: [{id: "123", changes: [{
          field: "messages", value: {messaging_product: "whatsapp",
            metadata: {phone_number_id: "456"}, statuses: [{id: "wamid.sent",
              status: "delivered", timestamp: String(time / 1000 + 1),
              recipient_id: "919000000001"}]},
        }]}],
      })), config)[0];
      const statusPath = CATCH_RECEIPTS + "/" + status.eventId;
      paths.push(statusPath);
      await db.doc(statusPath).set({...status, receivedAtMillis: time + 1000,
        expiresAt: Timestamp.fromMillis(time + WEBHOOK_RETENTION_MILLIS)});
      await processCatchWhatsappReceipt(db, status.eventId, config,
        time + 1000);
      const replay = await f.handlers.send(send);
      assert.deepEqual(replay, {...first, replayed: true,
        deliveryStatus: "delivered"});
      assert.equal(f.sends(), 1);
      await persistCatchStopReceipt(db, receipt("stop", "wamid.stop"), time);
      await assert.rejects(f.handlers.send(send));
      assert.equal(f.sends(), 1);
      assert.deepEqual((await db.doc(receiptPath).get()).data(), f.original);
    } finally {
      // Isolated synthetic emulator project: include rate counters and STOP.
      for (const collection of [CATCH_RECEIPTS, CATCH_REPLY_READINESS,
        CATCH_REPLY_OPERATIONS, "catchWhatsappEndpointStops", "rateLimits",
        CATCH_APP_AUTHORITIES, CATCH_INGRESS_EVIDENCE]) {
        await db.recursiveDelete(db.collection(collection));
      }
      await deleteApp(app);
    }
  });
