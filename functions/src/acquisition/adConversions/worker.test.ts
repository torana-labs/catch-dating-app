import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {hostDeliveryRecords, type Delivery} from "./deliveries";
import {deliveryMode, runAdConversionWorker, type WorkerDeps} from "./worker";

const now = Date.parse("2026-11-17T12:00:00Z");

/** In-memory Firestore covering the calls the worker makes. */
function fakeDb(seed: Record<string, Record<string, unknown>>) {
  const docs = new Map(Object.entries(seed));
  const ref = (path: string) => ({
    path,
    get: async () => ({exists: docs.has(path), data: () => docs.get(path)}),
    update: async (patch: Record<string, unknown>) => {
      docs.set(path, {...docs.get(path), ...patch});
    },
  });
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ref(`${name}/${id}`),
      where: (field: string, _op: string, value: unknown) => ({
        limit: () => ({
          get: async () => ({docs: [...docs.entries()]
            .filter(([path, data]) => path.startsWith(`${name}/`) &&
              data[field] === value)
            .map(([path, data]) => ({ref: ref(path), data: () => data}))}),
        }),
      }),
    }),
    runTransaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn({
      get: async (r: {get: () => Promise<unknown>}) => r.get(),
      update: (r: {path: string}, patch: Record<string, unknown>) => {
        docs.set(r.path, {...docs.get(r.path), ...patch});
      },
    }),
  } as unknown as FirebaseFirestore.Firestore;
  return {db, docs};
}

const records = hostDeliveryRecords({organizerId: "org-1",
  conversion: "organizer_qualified",
  organizer: {ownership: {state: "claimed", ownerUserId: "host-1"}},
  owner: {phoneNumber: "+919876543210", email: ""}, nowMillis: now});
const seed = () => ({
  "users/host-1": {phoneNumber: "+919876543210"},
  ...Object.fromEntries(records.map((r) =>
    [`adConversionDeliveries/${r.deliveryId}`, {...r}])),
});

function deps(db: FirebaseFirestore.Firestore, mode: WorkerDeps["mode"],
  calls: string[], extra: Partial<WorkerDeps> = {}): WorkerDeps {
  return {
    db, mode, now: () => now + 1000,
    metaToken: async () => "synthetic-meta-token",
    metaTestEventCode: "TEST12345",
    googleToken: async () => "synthetic-google-token",
    quotaProject: "demo-project",
    send: {
      meta: async (input) => {
        calls.push(`meta:${input.testEventCode ?? "live"}`);
        return {kind: "accepted"};
      },
      google: async (input) => {
        calls.push(`google:${input.validateOnly ? "validate" : "live"}`);
        return {kind: "retry", code: "google_uncertain"};
      },
    },
    ...extra,
  };
}

const status = (docs: Map<string, Record<string, unknown>>, id: string) =>
  docs.get(`adConversionDeliveries/${id}`) as unknown as Delivery;

test("mode defaults to off and off sends nothing", async () => {
  assert.equal(deliveryMode(""), "off");
  assert.equal(deliveryMode("LIVE"), "off");
  const {db} = fakeDb(seed());
  const calls: string[] = [];
  assert.equal(await runAdConversionWorker(deps(db, "off", calls)), 0);
  assert.deepEqual(calls, []);
});

test("validate uses test and validate-only requests and keeps records pending",
  async () => {
    const {db, docs} = fakeDb(seed());
    const calls: string[] = [];
    await runAdConversionWorker(deps(db, "validate", calls));
    assert.deepEqual(calls.sort(), ["google:validate", "meta:TEST12345"]);
    for (const r of records) {
      assert.equal(status(docs, r.deliveryId).status, "pending");
    }
    assert.equal(status(docs, records[0].deliveryId).lastOutcome, "validated");
  });

test("validate never sends a real Meta event without a test code",
  async () => {
    const {db, docs} = fakeDb(seed());
    const calls: string[] = [];
    await runAdConversionWorker(deps(db, "validate", calls,
      {metaTestEventCode: ""}));
    assert.deepEqual(calls, ["google:validate"]);
    assert.equal(status(docs, records[0].deliveryId).lastOutcome,
      "meta_test_code_missing");
  });

test("live records outcomes and schedules retries", async () => {
  const {db, docs} = fakeDb(seed());
  const calls: string[] = [];
  await runAdConversionWorker(deps(db, "live", calls));
  assert.deepEqual(calls.sort(), ["google:live", "meta:live"]);
  assert.equal(status(docs, records[0].deliveryId).status, "accepted");
  const google = status(docs, records[1].deliveryId);
  assert.equal(google.status, "pending");
  assert.equal(google.attempts, 1);
  // Not due again yet.
  await runAdConversionWorker(deps(db, "live", calls));
  assert.equal(calls.length, 2);
});

test("deleted accounts and expired records are cancelled, not sent",
  async () => {
    const deleted = fakeDb({...seed(),
      "users/host-1": {deletedAt: Timestamp.fromMillis(now)}});
    const calls: string[] = [];
    await runAdConversionWorker(deps(deleted.db, "live", calls));
    assert.deepEqual(calls, []);
    assert.equal(status(deleted.docs, records[0].deliveryId).lastOutcome,
      "account_deleted");
    const expired = fakeDb(seed());
    await runAdConversionWorker(deps(expired.db, "live", calls,
      {now: () => now + 8 * 24 * 60 * 60 * 1000}));
    assert.deepEqual(calls, []);
    assert.equal(status(expired.docs, records[1].deliveryId).status,
      "cancelled");
  });

test("an interrupted send is picked up again", async () => {
  const stuck = {...records[0], status: "sending",
    updatedAt: Timestamp.fromMillis(now - 20 * 60_000)};
  const {db, docs} = fakeDb({"users/host-1": {phoneNumber: "+919876543210"},
    [`adConversionDeliveries/${stuck.deliveryId}`]: stuck});
  const calls: string[] = [];
  await runAdConversionWorker(deps(db, "live", calls,
    {now: () => now + 60 * 60_000}));
  // Returned to the queue with a short backoff, then sent on a later pass.
  assert.equal(status(docs, stuck.deliveryId).status, "pending");
  assert.equal(status(docs, stuck.deliveryId).lastOutcome, "interrupted");
  assert.deepEqual(calls, []);
  await runAdConversionWorker(deps(db, "live", calls,
    {now: () => now + 70 * 60_000}));
  assert.equal(status(docs, stuck.deliveryId).status, "accepted");
  assert.deepEqual(calls, ["meta:live"]);
});
