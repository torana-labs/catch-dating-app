import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {createFormPaymentFixture} from "./formPaymentTestStore";
import {FormPaymentCredentials} from "./formPaymentCredentials";
import {requireReadyFormPaymentConnection} from
  "./formPaymentConnectionPolicy";
import {FormPaymentProviderError} from "./razorpayFormProvider";
import type {RazorpayStoredCredential} from "./razorpayCredentialVault";
import {formPaymentTokenRefreshWindowMillis as window,
  refreshOrganizerFormPaymentTokensHandler as sweep} from
  "./formPaymentTokenRefresh";

const day = 86400_000;

function harness(tokenExpiresAt: number) {
  const h = createFormPaymentFixture();
  const path = "organizerPaymentConnections/connection";
  const binding = {organizerId: "org", connectionId: "connection",
    accountId: "acc_merchant", mode: "test" as const};
  h.store.records.set(path, {...h.store.records.get(path),
    tokenExpiresAt: Timestamp.fromMillis(tokenExpiresAt)});
  const original = String(h.store.records.get(path)?.secretVersionResource);
  const versions = new Map<string, RazorpayStoredCredential>([[original, {
    ...binding, webhookSecret: "s".repeat(43), token: {
      accessToken: "access", refreshToken: "refresh", accountId: "acc_merchant",
      publicToken: "rzp_test_oauth_public", expiresAt: tokenExpiresAt,
    },
  }]]);
  let now = 1000;
  let calls = 0;
  const provider = {refreshToken: async (token: RazorpayStoredCredential[
    "token"]): Promise<RazorpayStoredCredential["token"]> => {
    calls++;
    return {...token, accessToken: `rotated${calls}`,
      refreshToken: `rotatedRefresh${calls}`,
      publicToken: `rzp_test_oauth_rotated${calls}`,
      expiresAt: now + 90 * day};
  }};
  const credentials = new FormPaymentCredentials({db: h.db, provider,
    now: () => now, vault: {
      access: async (version) => versions.get(version)!,
      save: async (credential) => {
        const id = `${original}${versions.size}`;
        versions.set(id, credential); return id;
      },
      disable: async () => undefined,
    }});
  const run = () => sweep({db: h.db, mode: "test", credentials}, now,
    () => now);
  const record = () => h.store.records.get(path)!;
  const ready = () => requireReadyFormPaymentConnection(
    record() as never, "org", now);
  return {...h, path, binding, provider, credentials, run, record, ready,
    calls: () => calls, setNow: (value: number) => {
      now = value;
    }};
}

test("an expired access token is refreshed before checkout needs it",
  async () => {
    const h = harness(500);
    assert.throws(h.ready, /Connect Razorpay/u);
    assert.deepEqual(await h.run(),
      {refreshed: 1, failed: 0, skipped: 0, deferred: 0});
    assert.equal(h.calls(), 1);
    assert.equal(h.ready().publicToken, "rzp_test_oauth_rotated1");
    assert.equal((h.record().tokenExpiresAt as Timestamp).toMillis(),
      1000 + 90 * day);
    assert.equal(h.record().refreshLeaseUntil, null);
    assert.equal(JSON.stringify(h.record()).includes("rotatedRefresh"), false);
    // The checkout path then uses the refreshed token without another POST.
    const credential = await h.credentials.access(h.binding);
    assert.equal(credential.token.accessToken, "rotated1");
    assert.equal(h.calls(), 1);
  });

test("a token nearing expiry is refreshed early; a distant one is not",
  async () => {
    const h = harness(1000 + window + 1);
    assert.deepEqual(await h.run(),
      {refreshed: 0, failed: 0, skipped: 0, deferred: 0});
    assert.equal(h.calls(), 0);
    h.setNow(2000);
    assert.equal((await h.run()).refreshed, 1);
    assert.equal(h.calls(), 1);
    // The refreshed token is far outside the window, so later runs are idle.
    assert.equal((await h.run()).refreshed, 0);
    assert.equal(h.calls(), 1);
  });

test("only ready connections in the runtime's mode are refreshed",
  async () => {
    for (const patch of [{mode: "live"}, {status: "needsAttention"},
      {status: "disconnected"}, {status: "connecting"}]) {
      const h = harness(500);
      h.store.records.set(h.path, {...h.record(), ...patch});
      assert.equal((await h.run()).refreshed, 0);
      assert.equal(h.calls(), 0);
    }
  });

test("an uncertain refresh is recorded once and never sent again",
  async () => {
    for (const failure of [new Error("lost response"),
      new FormPaymentProviderError("Rejected", "rejected")]) {
      const h = harness(500);
      let attempts = 0;
      h.provider.refreshToken = async () => {
        attempts++; throw failure;
      };
      assert.equal((await h.run()).failed, 1);
      assert.equal(h.record().status, "needsAttention");
      assert.equal(h.record().lastErrorCode, failure instanceof
        FormPaymentProviderError ? "refreshRejected" : "refreshOutcomeUnknown");
      for (const later of [2000, 3600_000, 30 * day]) {
        h.setNow(later);
        await h.run();
        await assert.rejects(h.credentials.access(h.binding));
      }
      assert.equal(attempts, 1);
      assert.throws(h.ready, /Connect Razorpay/u);
    }
  });

test("a flagged record still marked ready is skipped, not resent",
  async () => {
    for (const lastErrorCode of ["refreshOutcomeUnknown", "refreshRejected"]) {
      const h = harness(500);
      h.store.records.set(h.path, {...h.record(), lastErrorCode});
      assert.deepEqual(await h.run(),
        {refreshed: 0, failed: 0, skipped: 1, deferred: 0});
      assert.equal(h.calls(), 0);
    }
  });

test("a dead refresh lease requires reconnection without a refresh POST",
  async () => {
    const h = harness(500);
    h.store.records.set(h.path, {...h.record(),
      refreshLeaseUntil: Timestamp.fromMillis(999)});
    assert.equal((await h.run()).failed, 1);
    assert.equal(h.record().lastErrorCode, "refreshOutcomeUnknown");
    assert.equal(h.record().status, "needsAttention");
    h.setNow(3600_000);
    await h.run();
    assert.equal(h.calls(), 0);
  });

test("the sweep and a checkout share one refresh lease", async () => {
  const h = harness(500);
  const results = await Promise.allSettled([h.run(),
    h.credentials.access(h.binding)]);
  assert.equal(h.calls(), 1);
  assert.equal(results[0].status, "fulfilled");
  assert.equal(h.ready().publicToken, "rzp_test_oauth_rotated1");
});

test("an early refresh that was never sent keeps the connection ready",
  async () => {
    const h = harness(1000 + day);
    const refresh = h.provider.refreshToken;
    h.provider.refreshToken = async () => {
      throw new FormPaymentProviderError("Not sent", "requestNotSent");
    };
    assert.equal((await h.run()).failed, 1);
    assert.equal(h.record().lastErrorCode, null);
    assert.equal(h.record().refreshLeaseUntil, null);
    assert.equal(h.ready().publicToken, "rzp_test_oauth_public");
    h.provider.refreshToken = refresh;
    assert.equal((await h.run()).refreshed, 1);
    assert.equal(h.ready().publicToken, "rzp_test_oauth_rotated1");
  });

test("work beyond the run budget is deferred to the next run", async () => {
  const h = harness(500);
  let clock = 0;
  const result = await sweep({db: h.db, mode: "test",
    credentials: h.credentials}, 1000, () => (clock += 5 * 60_000));
  assert.deepEqual(result, {refreshed: 0, failed: 0, skipped: 0, deferred: 1});
  assert.equal(h.calls(), 0);
});
