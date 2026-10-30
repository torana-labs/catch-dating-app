import assert from "node:assert/strict";
import test from "node:test";
import {OrganizerRazorpayConnectionService} from
  "./organizerRazorpayConnection";
import {BRAND} from "../../shared/generated/brand";

type Data = Record<string, unknown>;
interface MemoryQuery {
  filters: Array<[string, unknown]>;
  where: (field: string, op: string, value: unknown) => MemoryQuery;
  limit: (count: number) => MemoryQuery;
  get: () => Promise<{docs: Array<{id: string}>}>;
}
class MemoryDb {
  records = new Map<string, Data>();
  private tail: Promise<unknown> = Promise.resolve();
  collection(name: string) {
    return {doc: (id: string) => this.ref(`${name}/${id}`),
      where: (field: string, op: string, value: unknown) =>
        this.query(name, []).where(field, op, value)};
  }
  query(name: string, filters: Array<[string, unknown]>,
    count = 100): MemoryQuery {
    return {filters,
      where: (field, op, value) => {
        assert.equal(op, "==");
        return this.query(name, [...filters, [field, value]], count);
      },
      limit: (value) => this.query(name, filters, value),
      get: async () => ({docs: [...this.records.entries()]
        .filter(([path, data]) => path.startsWith(`${name}/`) &&
          filters.every(([field, value]) => data[field] === value))
        .slice(0, count)
        .map(([path]) => ({id: path.split("/").at(-1)!}))}),
    };
  }
  ref(path: string) {
    return {path, get: async () => this.snapshot(path)};
  }
  snapshot(path: string) {
    const value = this.records.get(path);
    return {exists: value !== undefined, ref: this.ref(path),
      data: () => value && {...value}};
  }
  async runTransaction<T>(work: (tx: {
    get: (ref: {path: string} | MemoryQuery) =>
      Promise<ReturnType<MemoryDb["snapshot"]> |
        Awaited<ReturnType<MemoryQuery["get"]>>>;
    create: (ref: {path: string}, data: Data) => void;
    update: (ref: {path: string}, data: Data) => void;
  }) => Promise<T>): Promise<T> {
    const run = this.tail.then(async () => {
      const writes: Array<() => void> = [];
      const result = await work({
        get: async (ref) => "filters" in ref ? ref.get() :
          this.snapshot(ref.path),
        create: (ref, data) => {
          if (this.records.has(ref.path)) throw new Error("Already exists");
          writes.push(() => this.records.set(ref.path, {...data}));
        },
        update: (ref, data) => {
          if (!this.records.has(ref.path)) throw new Error("Not found");
          writes.push(() => this.records.set(ref.path,
            {...this.records.get(ref.path), ...data}));
        },
      });
      for (const write of writes) write();
      return result;
    });
    this.tail = run.catch(() => undefined);
    return run;
  }
}

function harness() {
  const db = new MemoryDb();
  const state = "s".repeat(43);
  let now = 1000;
  let authorized = true;
  let exchanges = 0;
  const disabled: string[] = [];
  const credentials: unknown[] = [];
  const token = {accountId: "acc_merchant", accessToken: "privateAccess",
    refreshToken: "privateRefresh", publicToken: "rzp_test_oauth_public",
    expiresAt: 10_000_000};
  const provider = {
    authorizationUrl: (value: string) => `https://auth.razorpay.com/?state=${value}`,
    exchangeCode: async () => {
      exchanges++; return token;
    },
    createWebhook: async () => "webhook1",
    verifyWebhook: async () => undefined,
  };
  const service = new OrganizerRazorpayConnectionService({
    db: db as unknown as FirebaseFirestore.Firestore, provider,
    vault: {save: async (credential) => {
      credentials.push(credential);
      return "projects/catch-test/secrets/FORM_TOKENS/versions/1";
    }, disable: async (version) => {
      disabled.push(version);
    }},
    mode: "test", webhookBaseUrl: `https://api.${BRAND.web.domain}/formWebhook`,
    now: () => now, randomToken: () => state,
    requireManager: async ({organizerId, actorUid}) => {
      if (!authorized || organizerId !== "org" || actorUid !== "host") {
        throw new Error("Permission denied");
      }
    },
  });
  return {service, db, state, provider, disabled, credentials,
    exchanges: () => exchanges,
    setNow: (value: number) => {
      now = value;
    },
    revoke: () => {
      authorized = false;
    }};
}

test("connection hashes state and verifies the merchant webhook",
  async () => {
    const h = harness();
    const begin = await h.service.begin("org", "host");
    assert.match(begin.authorizationUrl, new RegExp(h.state));
    assert.equal(begin.expiresAtMillis, 601000);
    const ref = `organizerPaymentConnections/${begin.connectionId}`;
    assert.equal(h.db.records.get(ref)?.status, "connecting");
    let verified = false;
    h.provider.verifyWebhook = async () => {
      assert.equal(h.db.records.get(ref)?.status, "connecting");
      verified = true;
      return undefined;
    };
    assert.deepEqual(await h.service.complete(h.state, "code"), {
      connectionId: begin.connectionId, status: "ready"});
    assert.equal(verified, true);
    const stored = JSON.stringify([...h.db.records]);
    for (const privateValue of [h.state, "privateAccess", "privateRefresh"]) {
      assert.equal(stored.includes(privateValue), false);
    }
    const status = await h.service.status("org", "host", begin.connectionId);
    assert.deepEqual(status, {connectionId: begin.connectionId, status: "ready",
      mode: "test", accountId: "acc_merchant", webhookVerified: true,
      lastErrorCode: null});
    await h.service.complete(h.state, "duplicateCode");
    assert.equal(h.exchanges(), 1);
  });

test("invalid and simultaneous callbacks cannot repeat exchange", async () => {
  const h = harness();
  await assert.rejects(h.service.complete("x".repeat(43), "code"));
  await h.service.begin("org", "host");
  h.setNow(601000);
  await assert.rejects(h.service.complete(h.state, "code"), /expired/u);
  assert.equal(h.exchanges(), 0);
  h.setNow(1000);
  const original = h.provider.exchangeCode;
  let release!: () => void;
  let started!: () => void;
  const barrier = new Promise<void>((resolve) => {
    release = resolve;
  });
  const entered = new Promise<void>((resolve) => {
    started = resolve;
  });
  h.provider.exchangeCode = async () => {
    started();
    await barrier;
    return original();
  };
  const first = h.service.complete(h.state, "code");
  await entered;
  await assert.rejects(h.service.complete(h.state, "code"), /already used/u);
  release();
  await first;
  assert.equal(h.exchanges(), 1);
});

test("manager revocation before exchange and before finalization fail closed",
  async () => {
    for (const timing of ["before", "during"]) {
      const h = harness();
      const {connectionId} = await h.service.begin("org", "host");
      if (timing === "before") h.revoke();
      else {
        h.provider.verifyWebhook = async () => {
          h.revoke();
        };
      }
      await assert.rejects(h.service.complete(h.state, "code"),
        /could not be verified/u);
      assert.equal(h.exchanges(), timing === "before" ? 0 : 1);
      assert.equal(h.db.records.get(
        `organizerPaymentConnections/${connectionId}`)?.status,
      "needsAttention");
      await assert.rejects(h.service.complete(h.state, "code"));
    }
  });

test("webhook failure retains credentials but never enables checkout",
  async () => {
    const h = harness();
    const {connectionId} = await h.service.begin("org", "host");
    h.provider.verifyWebhook = async () => {
      throw new Error("Provider echoed privateAccess");
    };
    await assert.rejects(h.service.complete(h.state, "code"),
      (error: Error) => {
        assert.equal(error.message.includes("privateAccess"), false);
        return true;
      });
    const connection = h.db.records.get(
      `organizerPaymentConnections/${connectionId}`);
    assert.equal(connection?.status, "needsAttention");
    assert.equal(connection?.webhookVerifiedAt, null);
    assert.equal(typeof connection?.secretVersionResource, "string");
    assert.equal(h.disabled.length, 0);
  });

test("disconnect during provider setup cannot be overwritten by callback",
  async () => {
    const h = harness();
    const {connectionId} = await h.service.begin("org", "host");
    h.provider.verifyWebhook = async () => {
      await h.service.disconnect("org", "host", connectionId);
    };
    await assert.rejects(h.service.complete(h.state, "code"));
    assert.equal((await h.service.status("org", "host", connectionId)).status,
      "disconnected");
    await h.service.disconnect("org", "host", connectionId);
    await assert.rejects(h.service.status("other", "host", connectionId));
    await assert.rejects(h.service.disconnect("org", "other", connectionId));
  });

test("an organizer keeps one ready Razorpay account per mode", async () => {
  const h = harness();
  const first = await h.service.begin("org", "host");
  await h.service.complete(h.state, "code");
  await assert.rejects(h.service.begin("org", "host"),
    (error: {code?: string; details?: unknown}) => {
      assert.equal(error.code, "failed-precondition");
      assert.deepEqual(error.details, {reason: "razorpayAlreadyConnected"});
      return true;
    });
  // A disconnected account no longer counts as the organizer's connection.
  await h.service.disconnect("org", "host", first.connectionId);
  h.db.records.delete(`organizerPaymentConnections/${first.connectionId}`);
  h.db.records.set("organizerPaymentConnections/rpc_old", {
    organizerId: "org", provider: "razorpay", mode: "test",
    status: "disconnected", accountId: "acc_merchant"});
  for (const path of [...h.db.records.keys()]) {
    if (path.startsWith("organizerPaymentOauthStates/")) {
      h.db.records.delete(path);
    }
  }
  assert.ok((await h.service.begin("org", "host")).connectionId);
});

test("a second account that finishes authorizing is not made ready",
  async () => {
    const h = harness();
    const {connectionId} = await h.service.begin("org", "host");
    // Another connection became ready while this one was at Razorpay.
    h.db.records.set("organizerPaymentConnections/rpc_other", {
      organizerId: "org", provider: "razorpay", mode: "test",
      status: "ready", accountId: "acc_other"});
    await assert.rejects(h.service.complete(h.state, "code"),
      /could not be verified/u);
    assert.equal(h.db.records.get(
      `organizerPaymentConnections/${connectionId}`)?.status,
    "needsAttention");
    // A ready connection in the other mode does not block this one.
    const other = harness();
    other.db.records.set("organizerPaymentConnections/rpc_live", {
      organizerId: "org", provider: "razorpay", mode: "live",
      status: "ready", accountId: "acc_live"});
    await other.service.begin("org", "host");
    assert.equal((await other.service.complete(other.state, "code")).status,
      "ready");
  });
