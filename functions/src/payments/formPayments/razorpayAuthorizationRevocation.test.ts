import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {OrganizerPaymentConnectionDocument as Connection} from
  "../../shared/generated/firestoreAdminTypes";
import {FakeFirestore, type FakeData} from
  "../../shared/testing/programFirestore";
import {requireReadyFormPaymentConnection} from
  "./formPaymentConnectionPolicy";
import {
  authorizationRevokedCode,
  handlePartnerWebhook,
  markRazorpayAuthorizationRevoked,
  watchRazorpayAuthorization,
  type PartnerWebhookDeps,
} from "./razorpayAuthorizationRevocation";
import {FormPaymentProviderError} from "./razorpayPaymentProvider";

const now = Date.UTC(2026, 10, 8, 12);

function connection(extra: Partial<Connection> = {}): Connection {
  return {organizerId: "org", provider: "razorpay", mode: "test",
    status: "ready", accountId: "acc_host1", publicToken: "rzp_test_pub",
    secretVersionResource: "projects/catch-test/secrets/c/versions/1",
    tokenExpiresAt: Timestamp.fromMillis(now + 3_600_000), webhookId: "wh1",
    webhookUrl: "https://example.test/hook",
    webhookVerifiedAt: Timestamp.fromMillis(now - 1000),
    connectedByUid: "owner", revision: 3, refreshLeaseUntil: null,
    createdAt: Timestamp.fromMillis(now - 10_000),
    updatedAt: Timestamp.fromMillis(now - 10_000), disconnectedAt: null,
    lastErrorCode: null, ...extra} as Connection;
}

function harness(records: Record<string, FakeData>, webhookSecret: string |
  null = "partner-hook") {
  const db = new FakeFirestore(records);
  const notified: string[] = [];
  const deps: PartnerWebhookDeps = {
    db: () => db as unknown as FirebaseFirestore.Firestore,
    now: () => now,
    notifyOwner: async (organizerId) => {
      notified.push(organizerId);
    },
    partner: async () => ({webhookSecret, mode: "test"}),
  };
  return {db, deps, notified};
}

function signed(body: unknown, secret = "partner-hook") {
  const rawBody = Buffer.from(JSON.stringify(body));
  return {rawBody, signature: createHmac("sha256", secret).update(rawBody)
    .digest("hex")};
}

const revoked = {entity: "event", account_id: "acc_host1",
  event: "account.app.authorization_revoked", contains: [], payload: {},
  created_at: 1};

test("the partner webhook fails closed until its secret is configured and " +
  "refuses bad signatures", async () => {
  assert.equal(await handlePartnerWebhook(signed(revoked),
    harness({}, null).deps), 503);
  const {deps} = harness({});
  assert.equal(await handlePartnerWebhook({...signed(revoked),
    signature: "00"}, deps), 400);
  assert.equal(await handlePartnerWebhook(signed(revoked, "other"), deps),
    400);
  assert.equal(await handlePartnerWebhook({rawBody: undefined,
    signature: undefined}, deps), 400);
});

test("a revocation marks the account's live connections and tells the " +
  "owner once", async () => {
  const {db, deps, notified} = harness({
    "organizerPaymentConnections/rpc_ready": connection() as unknown as
      FakeData,
    "organizerPaymentConnections/rpc_live": connection({mode: "live"}) as
      unknown as FakeData,
    "organizerPaymentConnections/rpc_old": connection({status: "disconnected",
      disconnectedAt: Timestamp.fromMillis(now - 5000)}) as unknown as
      FakeData,
    "organizerPaymentConnections/rpc_other": connection({
      accountId: "acc_other", organizerId: "org2"}) as unknown as FakeData,
  });
  assert.equal(await handlePartnerWebhook(signed(revoked), deps), 200);
  const ready = db.getDoc("organizerPaymentConnections/rpc_ready") as
    unknown as Connection;
  assert.equal(ready.status, "needsAttention");
  assert.equal(ready.lastErrorCode, authorizationRevokedCode);
  assert.equal(ready.revision, 4);
  for (const untouched of ["rpc_live", "rpc_old", "rpc_other"]) {
    const doc = db.getDoc(`organizerPaymentConnections/${untouched}`) as
      unknown as Connection;
    assert.notEqual(doc.lastErrorCode, authorizationRevokedCode, untouched);
  }
  assert.deepEqual(notified, ["org"]);
  // Razorpay retries deliveries; a replay changes and notifies nothing.
  assert.equal(await handlePartnerWebhook(signed(revoked), deps), 200);
  assert.deepEqual(notified, ["org"]);
  // Checkout no longer finds a ready merchant for the organizer.
  assert.throws(() => requireReadyFormPaymentConnection(ready, "org", now));
});

test("other partner events are acknowledged and ignored", async () => {
  const {db, deps, notified} = harness({
    "organizerPaymentConnections/rpc_ready": connection() as unknown as
      FakeData});
  assert.equal(await handlePartnerWebhook(signed({...revoked,
    event: "account.app.authorization_granted"}), deps), 200);
  assert.equal((db.getDoc("organizerPaymentConnections/rpc_ready") as
    unknown as Connection).status, "ready");
  assert.deepEqual(notified, []);
});

test("a 401 from the organizer's token marks that connection; other " +
  "refusals do not", async () => {
  const {db, deps, notified} = harness({
    "organizerPaymentConnections/rpc_ready": connection() as unknown as
      FakeData});
  const provider = {
    createOrder: async (status: number) => {
      throw new FormPaymentProviderError("Razorpay request failed.",
        "rejected", status);
    },
    verifyCheckout: () => true,
  };
  const watched = watchRazorpayAuthorization(provider, () =>
    markRazorpayAuthorizationRevoked(deps,
      {connectionIds: ["rpc_ready"]}));
  assert.equal(watched.verifyCheckout(), true);
  await assert.rejects(watched.createOrder(400), FormPaymentProviderError);
  assert.equal((db.getDoc("organizerPaymentConnections/rpc_ready") as
    unknown as Connection).status, "ready");
  await assert.rejects(watched.createOrder(401), (error: unknown) =>
    error instanceof FormPaymentProviderError && error.httpStatus === 401);
  const marked = db.getDoc("organizerPaymentConnections/rpc_ready") as
    unknown as Connection;
  assert.equal(marked.lastErrorCode, authorizationRevokedCode);
  assert.deepEqual(notified, ["org"]);
});
