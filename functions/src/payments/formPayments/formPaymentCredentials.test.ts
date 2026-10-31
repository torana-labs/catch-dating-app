import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {createFormPaymentFixture} from "./formPaymentTestStore";
import {FormPaymentCredentials} from "./formPaymentCredentials";
import {FormPaymentProviderError} from "./razorpayFormProvider";
import type {RazorpayStoredCredential} from "./razorpayCredentialVault";

function harness() {
  const h = createFormPaymentFixture();
  const binding = {organizerId: "org", connectionId: "connection",
    accountId: "acc_merchant", mode: "test" as const};
  const path = "organizerPaymentConnections/connection";
  const original = String(h.store.records.get(path)?.secretVersionResource);
  const versions = new Map<string, RazorpayStoredCredential>([[original, {
    ...binding, webhookSecret: "s".repeat(43), token: {
      accessToken: "access", refreshToken: "refresh", accountId: "acc_merchant",
      publicToken: "rzp_test_oauth_public", expiresAt: 1001,
    },
  }]]);
  const disabled: string[] = [];
  let calls = 0;
  let now = 1000;
  const provider = {refreshToken: async () => {
    calls++;
    return {...versions.get(original)!.token,
      accessToken: "rotated", refreshToken: "rotatedRefresh",
      publicToken: "rzp_test_oauth_rotated", expiresAt: 10_000_000};
  }};
  const service = new FormPaymentCredentials({db: h.db, provider,
    now: () => now, vault: {
      access: async (version, value) => {
        assert.deepEqual(value, binding);
        return versions.get(version)!;
      },
      save: async (credential) => {
        const id = `${original}0`;
        versions.set(id, credential); return id;
      },
      disable: async (version) => {
        disabled.push(version);
      },
    }});
  return {...h, service, binding, provider, versions, original, disabled,
    path, calls: () => calls, setNow: (value: number) => {
      now = value;
    }};
}

test("one refresh owner rotates credentials and preserves the webhook secret",
  async () => {
    const h = harness();
    const results = await Promise.allSettled([
      h.service.access(h.binding), h.service.access(h.binding)]);
    assert.equal(h.calls(), 1);
    assert.ok(results.some((result) => result.status === "fulfilled"));
    const credential = await h.service.access(h.binding);
    assert.equal(credential.token.accessToken, "rotated");
    assert.equal(credential.webhookSecret, "s".repeat(43));
    assert.equal(h.calls(), 1);
    const record = h.store.records.get(h.path)!;
    assert.equal(record.refreshLeaseUntil, null);
    assert.equal(record.publicToken, "rzp_test_oauth_rotated");
    assert.equal(JSON.stringify(record).includes("rotatedRefresh"), false);
  });

test("uncertain rotation fails closed and never repeats the refresh POST",
  async () => {
    const h = harness();
    let attempts = 0;
    h.provider.refreshToken = async () => {
      attempts++; throw new Error("private lost response");
    };
    await assert.rejects(h.service.access(h.binding), /being checked/u);
    h.setNow(100_000);
    await assert.rejects(h.service.access(h.binding), /being checked/u);
    assert.equal(attempts, 1);
    assert.equal(h.store.records.get(h.path)?.status, "needsAttention");
    assert.equal(h.store.records.get(h.path)?.lastErrorCode,
      "refreshOutcomeUnknown");
  });

test("dead refresh leases require reconnection; requests never sent can retry",
  async () => {
    const h = harness();
    h.store.records.set(h.path, {...h.store.records.get(h.path),
      refreshLeaseUntil: Timestamp.fromMillis(999)});
    await assert.rejects(h.service.access(h.binding));
    assert.equal(h.calls(), 0);
    assert.equal(h.store.records.get(h.path)?.lastErrorCode,
      "refreshOutcomeUnknown");
    const other = harness();
    const refresh = other.provider.refreshToken;
    other.provider.refreshToken = async () => {
      throw new FormPaymentProviderError("Not sent", "requestNotSent");
    };
    await assert.rejects(other.service.access(other.binding));
    assert.equal(other.store.records.get(other.path)?.status, "ready");
    other.provider.refreshToken = refresh;
    await other.service.access(other.binding);
    assert.equal(other.store.records.get(other.path)?.lastErrorCode, null);
  });

test("disconnect during refresh cannot be undone and foreign bindings fail",
  async () => {
    const h = harness();
    await assert.rejects(h.service.access({
      ...h.binding, organizerId: "other"}));
    assert.equal(h.calls(), 0);
    const refresh = h.provider.refreshToken;
    h.provider.refreshToken = async () => {
      h.store.records.set(h.path, {...h.store.records.get(h.path),
        status: "disconnected", disconnectedAt: Timestamp.fromMillis(1000),
        revision: 2});
      return refresh();
    };
    await h.service.access(h.binding);
    assert.equal(h.store.records.get(h.path)?.status, "disconnected");
    assert.equal(h.store.records.get(h.path)?.revision, 3);
  });
