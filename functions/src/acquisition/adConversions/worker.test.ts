import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {
  enqueueHostConversions,
  hostDeliveryRecords,
  type Delivery,
} from "./deliveries";
import {hashedEmail, hashedPhone} from "./hostConversions";
import {adMatchingOptOutId} from "../adMatching/optOuts";
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
    create: async (data: Record<string, unknown>) => {
      if (docs.has(path)) throw Object.assign(new Error("exists"), {code: 6});
      docs.set(path, data);
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

const optOut = (kind: "phone" | "email", digest: string,
  status = "active") => ({
  [`adMatchingOptOuts/${adMatchingOptOutId(kind, digest)}`]: {status},
});

test("an opted-out phone or email cancels the record before any send",
  async () => {
    for (const marker of [
      optOut("phone", hashedPhone("+919876543210")!),
      optOut("email", hashedEmail("host@example.com")!),
    ]) {
      const withEmail = hostDeliveryRecords({organizerId: "org-1",
        conversion: "organizer_qualified",
        organizer: {ownership: {state: "claimed", ownerUserId: "host-1"}},
        owner: {phoneNumber: "+919876543210", email: "host@example.com"},
        nowMillis: now});
      const {db, docs} = fakeDb({
        "users/host-1": {phoneNumber: "+919876543210"},
        ...Object.fromEntries(withEmail.map((r) =>
          [`adConversionDeliveries/${r.deliveryId}`, {...r}])),
        ...marker,
      });
      for (const mode of ["validate", "live"] as const) {
        const calls: string[] = [];
        await runAdConversionWorker(deps(db, mode, calls));
        assert.deepEqual(calls, []);
      }
      for (const r of withEmail) {
        const record = status(docs, r.deliveryId);
        assert.equal(record.status, "cancelled");
        assert.equal(record.lastOutcome, "opted_out");
        // Dropped whole: no digest is kept to send later.
        assert.equal(record.matching.phoneSha256, null);
        assert.equal(record.matching.emailSha256, null);
        assert.equal(record.matching.metaPhoneSha256, null);
      }
    }
  });

test("an opt-out by the organizer email cancels a record carrying the " +
  "account email", async () => {
  const {db, docs} = fakeDb({...seed(),
    "organizers/org-1": {ownership: {state: "claimed", ownerUserId: "host-1"},
      email: "club@example.com"},
    ...optOut("email", hashedEmail("club@example.com")!)});
  const calls: string[] = [];
  await runAdConversionWorker(deps(db, "live", calls));
  assert.deepEqual(calls, []);
  for (const r of records) {
    assert.equal(status(docs, r.deliveryId).lastOutcome, "opted_out");
  }
});

test("a removed opt-out no longer stops a send", async () => {
  const {db} = fakeDb({...seed(),
    ...optOut("phone", hashedPhone("+919876543210")!, "removed")});
  const calls: string[] = [];
  await runAdConversionWorker(deps(db, "live", calls));
  assert.deepEqual(calls.sort(), ["google:live", "meta:live"]);
});

test("an opted-out identifier on the attached Meta lead cancels the record",
  async () => {
    const leadEmail = hashedEmail("lead@example.com")!;
    const withLead = records.map((r) => ({...r, metaLeadId: "1234567890123"}));
    const {db, docs} = fakeDb({
      "users/host-1": {phoneNumber: "+919876543210"},
      "metaLeadgenEvents/1234567890123": {status: "processed",
        leadgenId: "1234567890123",
        phoneSha256: hashedPhone("+919876543210"), emailSha256: leadEmail},
      ...Object.fromEntries(withLead.map((r) =>
        [`adConversionDeliveries/${r.deliveryId}`, {...r}])),
      ...optOut("email", leadEmail),
    });
    const calls: string[] = [];
    await runAdConversionWorker(deps(db, "live", calls));
    assert.deepEqual(calls, []);
    assert.equal(status(docs, withLead[0].deliveryId).lastOutcome,
      "opted_out");
    assert.equal(status(docs, withLead[0].deliveryId).metaLeadId, null);
  });

test("enqueue records an opted-out owner's conversion as cancelled",
  async () => {
    const {db, docs} = fakeDb({
      "organizers/org-1": {ownership: {state: "claimed",
        ownerUserId: "host-1"}},
      "users/host-1": {phoneNumber: "+919876543210",
        email: "host@example.com"},
      ...optOut("email", hashedEmail("host@example.com")!),
    });
    assert.equal(await enqueueHostConversions({db, organizerId: "org-1",
      conversions: ["organizer_signup"], nowMillis: now}), 2);
    const queued = [...docs.entries()]
      .filter(([path]) => path.startsWith("adConversionDeliveries/"))
      .map(([, data]) => data as unknown as Delivery);
    assert.equal(queued.length, 2);
    for (const record of queued) {
      assert.equal(record.status, "cancelled");
      assert.equal(record.lastOutcome, "opted_out");
      assert.equal(record.matching.phoneSha256, null);
      assert.equal(record.matching.emailSha256, null);
    }
    // The worker never picks a cancelled record up.
    const calls: string[] = [];
    await runAdConversionWorker(deps(db, "live", calls));
    assert.deepEqual(calls, []);
  });

test("enqueue never attaches a lead that carries an opted-out identifier",
  async () => {
    const leadEmail = hashedEmail("lead@example.com")!;
    const {db, docs} = fakeDb({
      "organizers/org-1": {ownership: {state: "claimed",
        ownerUserId: "host-1"}},
      "users/host-1": {phoneNumber: "+919876543210", email: ""},
      "metaLeadgenEvents/1234567890123": {status: "processed",
        leadgenId: "1234567890123",
        phoneSha256: hashedPhone("+919876543210"), emailSha256: leadEmail},
      ...optOut("email", leadEmail),
    });
    await enqueueHostConversions({db, organizerId: "org-1",
      conversions: ["organizer_signup"], nowMillis: now});
    const queued = [...docs.entries()]
      .filter(([path]) => path.startsWith("adConversionDeliveries/"))
      .map(([, data]) => data as unknown as Delivery);
    assert.equal(queued.length, 2);
    assert.ok(queued.every((r) => r.status === "pending" &&
      r.metaLeadId === null));
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
