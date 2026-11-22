import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {test} from "node:test";
import {initializeApp, deleteApp} from "firebase-admin/app";
import {getFirestore, type Firestore, Timestamp} from
  "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FormPaymentTestStore} from
  "../payments/formPayments/formPaymentTestStore";
import {handleCatchWhatsappWebhook, parseCatchWhatsappWebhook,
  WEBHOOK_RETENTION_MILLIS} from "./whatsappWebhookProtocol";
import {persistCatchWhatsappWebhookEvents} from "./whatsappWebhook";
import {CATCH_ENDPOINT_STOPS, CATCH_RECEIPTS, isCatchStopReceipt} from
  "./whatsappEndpointStops";
import {CatchWhatsappReplyStore, CATCH_REPLY_OPERATIONS, CATCH_REPLY_READINESS,
  catchReadinessId} from
  "./whatsappReplyStore";
import {catchEndpointHash, catchReplyHash, catchReplyId, catchStopId,
  sendCatchWhatsappReply} from "./whatsappReply";
import type {CatchReplyConfig} from "./whatsappReply";
import {createSyntheticCatchAuthority} from "./whatsappAuthorityTestHarness";
import {CATCH_INGRESS_EVIDENCE} from "./whatsappIngressStore";

const now = 1800000000000;
const webhook = {wabaId: "123", phoneNumberId: "456",
  appSecret: "mock-app-secret", verifyToken: "t".repeat(32)};
const reply: CatchReplyConfig = {enabled: true, wabaId: "123",
  phoneNumberId: "456", atomicStopIngressReady: true,
  actorUid: "agent", recipientUid: "participant",
  recipientE164: "+919000000001",
  credentialVersionResource:
    "projects/demo-catch/secrets/CATCH_WHATSAPP_ACCESS_TOKEN/versions/1",
  graphVersion: "v23.0", readinessEvidenceHash: "d".repeat(64)};

function message(id: string, text: string) {
  return {id, from: "919000000001", timestamp: String(now / 1000),
    type: "text", text: {body: text}};
}
function payload(messages: object[], wabaId = "123") {
  return Buffer.from(JSON.stringify({object: "whatsapp_business_account",
    entry: [{id: wabaId, changes: [{field: "messages", value: {
      messaging_product: "whatsapp", metadata: {phone_number_id: "456"},
      messages,
    }}]}]}));
}
async function receive(db: Firestore, rawBody: Buffer, at = now,
  appSecret = webhook.appSecret) {
  return handleCatchWhatsappWebhook({method: "POST", query: {}, rawBody,
    signature: "sha256=" + createHmac("sha256", appSecret)
      .update(rawBody).digest("hex")}, webhook,
  (events) => persistCatchWhatsappWebhookEvents(db, events, at));
}
function fakeDatabase() {
  const fake = Object.assign(new FormPaymentTestStore(), {
    projectId: "demo-catch-authority", databaseId: "(default)"});
  const db = fake as unknown as Firestore;
  return {fake, db};
}
function service(db: Firestore, inbound: ReturnType<
  typeof parseCatchWhatsappWebhook>[number], hooks: {
    beforeClaim?: () => Promise<void>; beforeSend?: () => Promise<void>;
  } = {}) {
  let sends = 0; let claims = 0;
  const authority = createSyntheticCatchAuthority(db, () => now + 1000,
    reply.recipientE164, String(Reflect.get(db, "projectId")));
  const readiness = {schemaVersion: 1, readinessId: catchReadinessId(reply),
    wabaId: reply.wabaId, phoneNumberId: reply.phoneNumberId,
    recipientUid: reply.recipientUid,
    endpointHash: catchEndpointHash(reply.recipientE164),
    purpose: "serviceSupport", state: "ready", completeHistory: true,
    appAuthorityBindings: authority.bindings,
    historyFromMillis: 0, coveredThroughMillis: now,
    atomicIngressStartedAtMillis: now, evidenceSha256: "d".repeat(64),
    reviewedByUid: "owner", reviewedAtMillis: now,
    expiresAtMillis: now + 24 * 60 * 60 * 1000};
  if (db instanceof FormPaymentTestStore) {
    authority.seedInto(db.records);
    db.records.set(CATCH_REPLY_READINESS + "/" + catchReadinessId(reply),
      readiness);
  }
  const deps = {config: () => ({...reply}), now: () => now + 1000,
    authority: authority.store,
    getUser: async (uid: string) => uid === "owner" ?
      {disabled: false, customClaims: {adminOwner: true}} : uid === "agent" ?
        {disabled: false, customClaims: {support: true}} :
        {disabled: false, phoneNumber: reply.recipientE164}};
  const request = {auth: {uid: "agent", token: {support: true,
    auth_time: now / 1000}},
  rawRequest: {header: () => "Bearer synthetic-current-id-token"},
  data: {purpose: "serviceSupport",
    inboundEventId: inbound.eventId, reviewedInboundTextHash:
      catchReplyHash(inbound.text), confirmSupportRequest: true,
    body: "Here is the requested support."}} as unknown as
    CallableRequest<unknown>;
  const store = new CatchWhatsappReplyStore(db, deps);
  const claim = store.claim.bind(store);
  store.claim = async (...args) => {
    claims++; await hooks.beforeClaim?.(); return claim(...args);
  };
  return {authority, readiness, claims: () => claims, sends: () => sends,
    send: () => sendCatchWhatsappReply(request,
      {...deps, store, prepare: async () => ({send: async () => {
        sends++;
        await hooks.beforeSend?.();
        return "wamid.mock-provider-result";
      }})})};
}

test("wired ingress commits STOP first and preserves original receipt TTL",
  async () => {
    const {fake, db} = fakeDatabase();
    // Support is deliberately first in provider order.
    const raw = payload([message("wamid.support", "Please help"),
      message("wamid.stop", " STOP ")]);
    const events = parseCatchWhatsappWebhook(raw, webhook);
    fake.failNextCommit = true;
    assert.equal((await receive(db, raw)).status, 503);
    assert.equal(fake.records.size, 0,
      "Failed STOP cannot publish a same-batch support receipt");
    assert.equal((await receive(db, raw)).status, 200);
    const receiptKey = CATCH_RECEIPTS + "/" + events[1].eventId;
    const original = fake.records.get(receiptKey)!;
    assert.equal((await receive(db, raw, now + 5000)).status, 200);
    assert.deepEqual(fake.records.get(CATCH_RECEIPTS + "/" + events[1].eventId),
      original);
    assert.equal((original.expiresAt as Timestamp).toMillis(),
      now + WEBHOOK_RETENTION_MILLIS);
    const sender = service(db, events[0]);
    await assert.rejects(sender.send());
    assert.equal(sender.sends(), 0);
  });

test("signature and tenant rejection cannot create a suppression record",
  async () => {
    const {fake, db} = fakeDatabase();
    assert.equal((await receive(db, payload([message("wamid.stop", "stop")]),
      now, "foreign-secret")).status, 401);
    assert.equal((await receive(db, payload([message("wamid.stop", "stop")],
      "999"))).status, 403);
    assert.equal(fake.records.size, 0);
  });

test("only untruncated dispatchable text commands enter the STOP path", () => {
  const [event] = parseCatchWhatsappWebhook(payload([
    message("wamid.stop", " UnSubscribe ")]), webhook);
  assert.equal(isCatchStopReceipt(event), true);
  for (const patch of [{textTruncated: true}, {messageType: "button"},
    {text: "Please stop the video"}, {participantId: "invalid"}]) {
    assert.equal(isCatchStopReceipt({...event, ...patch}), false);
  }
});

test("signed support ingress admits a real claim before STOP suppresses " +
  "its replay", async () => {
  const {fake, db} = fakeDatabase();
  const support = payload([message("wamid.admitted", "Please help")]);
  const [event] = parseCatchWhatsappWebhook(support, webhook);
  assert.equal((await receive(db, support)).status, 200);
  const sender = service(db, event);
  const sent = await sender.send();
  assert.equal(sent.providerMessageId, "wamid.mock-provider-result");
  assert.equal(sender.claims(), 1);
  assert.equal(sender.sends(), 1);
  assert.equal(fake.records.get(
    CATCH_REPLY_OPERATIONS + "/" + sent.operationId)!.state, "completed");
  const stop = payload([message("wamid.admitted-stop", "STOP")]);
  assert.equal((await receive(db, stop)).status, 200);
  await assert.rejects(sender.send(), /Catch replies suppressed/);
  assert.equal(sender.sends(), 1);
});

test("real signed ingress races claims and blocks new reviewed inbound replies",
  {skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 30000}, async () => {
    assert.match(process.env.FIRESTORE_EMULATOR_HOST!,
      /^(localhost|127\.0\.0\.1):[0-9]+$/u);
    for (const order of ["claim-first", "stop-first"] as const) {
      const app = initializeApp({projectId: "demo-catch-ingress-" + order},
        "cat16-ingress-" + Date.now());
      const db = getFirestore(app);
      const suffix = String(Date.now());
      const support = payload([message("wamid.support" + suffix,
        "Please help")]);
      const stop = payload([message("wamid.stop" + suffix, "stop")]);
      const later = payload([message("wamid.later" + suffix,
        "Please help again")]);
      const [supportEvent] = parseCatchWhatsappWebhook(support, webhook);
      const [stopEvent] = parseCatchWhatsappWebhook(stop, webhook);
      const [laterEvent] = parseCatchWhatsappWebhook(later, webhook);
      const stopKey = CATCH_ENDPOINT_STOPS + "/" + catchStopId(reply,
        catchEndpointHash(reply.recipientE164));
      const claimKey = CATCH_REPLY_OPERATIONS + "/" + catchReplyId(reply,
        supportEvent.messageId);
      const laterClaimKey = CATCH_REPLY_OPERATIONS + "/" + catchReplyId(reply,
        laterEvent.messageId);
      const paths = [stopKey, claimKey, laterClaimKey,
        ...[supportEvent, stopEvent, laterEvent].map((event) =>
          CATCH_RECEIPTS + "/" + event.eventId)];
      const readinessPath = CATCH_REPLY_READINESS + "/" +
        catchReadinessId(reply);
      paths.push(readinessPath,
        ...[supportEvent, stopEvent, laterEvent].map((event) =>
          CATCH_INGRESS_EVIDENCE + "/" + event.eventId));
      let reached!: () => void; let release!: () => void;
      const boundary = new Promise<void>((resolve) => {
        reached = resolve;
      });
      const resume = new Promise<void>((resolve) => {
        release = resolve;
      });
      const pause = async () => {
        reached(); await resume;
      };
      const sender = service(db, supportEvent, order === "claim-first" ?
        {beforeSend: pause} : {beforeClaim: pause});
      let sending: ReturnType<typeof sender.send> | undefined;
      try {
        for (const [key, row] of sender.authority.rows) {
          await db.doc(key).set(row); paths.push(key);
        }
        await db.doc(readinessPath).set(sender.readiness);
        assert.equal((await receive(db, support)).status, 200);
        sending = sender.send();
        // A missing authority/session/evidence fails here instead of counting
        // as a STOP-winning race. Both orders must reach the exact boundary.
        await Promise.race([boundary, sending.then(() => {
          throw new Error("Reply completed before the controlled " +
            "race boundary");
        })]);
        assert.equal(sender.claims(), 1,
          "preflight must reach the claim boundary");
        const beforeStop = await db.doc(claimKey).get();
        assert.equal(beforeStop.exists, order === "claim-first");
        if (order === "claim-first") {
          assert.equal(beforeStop.get("state"), "claimed");
        }
        assert.equal((await receive(db, stop)).status, 200);
        release();
        if (order === "claim-first") {
          const sent = await sending;
          assert.equal(sent.providerMessageId, "wamid.mock-provider-result");
          const claimTime = (await db.doc(claimKey).get()).createTime!;
          const stopTime = (await db.doc(stopKey).get()).createTime!;
          assert.ok(claimTime.seconds < stopTime.seconds ||
            (claimTime.seconds === stopTime.seconds &&
              claimTime.nanoseconds <= stopTime.nanoseconds));
          assert.equal(sender.sends(), 1);
        } else {
          await assert.rejects(sending, /Catch replies suppressed/);
          assert.equal(sender.sends(), 0);
          assert.equal((await db.doc(claimKey).get()).exists, false);
        }
        const original = (await db.doc(CATCH_RECEIPTS + "/" +
          stopEvent.eventId).get()).data()!;
        const results = await Promise.all(Array.from({length: 5}, () =>
          receive(db, stop, now + 5000)));
        assert.ok(results.every((result) => result.status === 200));
        assert.deepEqual((await db.doc(CATCH_RECEIPTS + "/" + stopEvent.eventId)
          .get()).data(), original);
        assert.equal((await receive(db, later)).status, 200);
        const next = service(db, laterEvent);
        await assert.rejects(next.send(), /Catch replies suppressed/);
        assert.equal(next.sends(), 0);
        assert.equal((await db.doc(laterClaimKey).get()).exists, false);
      } finally {
        release();
        if (sending) await Promise.allSettled([sending]);
        for (const item of paths) await db.doc(item).delete();
        await deleteApp(app);
      }
    }
  });
