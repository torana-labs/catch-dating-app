import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {
  AD_CONVERSION_CONTEXT_TTL_MILLIS,
  adClientIdentity,
  adConversionContextRecord,
  recordPublicCheckoutAdContext,
} from "./adConversionContext";

const headers = (values: Record<string, string>, ip?: string) => ({
  rawRequest: {
    ip,
    get: (name: string) => values[name.toLowerCase()],
  },
}) as unknown as Pick<CallableRequest<unknown>, "rawRequest">;

test("client identity uses the first forwarded hop, drops bad values", () => {
  assert.deepEqual(
    adClientIdentity(headers({
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
      "user-agent": "Synthetic browser 1.0",
    }, "10.0.0.2")),
    {clientIpAddress: "203.0.113.7", clientUserAgent: "Synthetic browser 1.0"},
  );
  assert.deepEqual(
    adClientIdentity(headers({"user-agent": "bad\nagent"}, "2001:db8::1")),
    {clientIpAddress: "2001:db8::1", clientUserAgent: null},
  );
  assert.deepEqual(
    adClientIdentity(headers({"x-forwarded-for": "not an ip"})),
    {clientIpAddress: null, clientUserAgent: null},
  );
  assert.deepEqual(adClientIdentity({} as never),
    {clientIpAddress: null, clientUserAgent: null});
});

test("the record expires after the longest click window", () => {
  const record = adConversionContextRecord({
    paymentId: "pp_0123456789abcdef0123456789abcdef",
    uid: "guest-1",
    eventId: "event-1",
    organizerId: "org-1",
    click: {gclid: "Cj0KCQiA_synthetic", utmSource: "google"},
    client: {clientIpAddress: "203.0.113.7", clientUserAgent: null},
    nowMillis: 1_800_000_000_000,
  });
  assert.equal(record.subjectKind, "publicEventPayment");
  assert.equal(record.subjectId, "pp_0123456789abcdef0123456789abcdef");
  assert.deepEqual(record.click,
    {gclid: "Cj0KCQiA_synthetic", utmSource: "google"});
  assert.equal(record.expiresAt.toMillis() - record.createdAt.toMillis(),
    AD_CONVERSION_CONTEXT_TTL_MILLIS);
});

function fakeDb(createImpl: () => Promise<void>) {
  const created: unknown[] = [];
  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({
        create: async (data: unknown) => {
          await createImpl();
          created.push({name, id, data});
        },
      }),
    }),
  } as unknown as FirebaseFirestore.Firestore;
  return {db, created};
}

const base = {
  paymentId: "pp_0123456789abcdef0123456789abcdef",
  uid: "guest-1",
  eventId: "event-1",
  organizerId: "org-1",
  client: {clientIpAddress: null, clientUserAgent: null},
  nowMillis: 1_800_000_000_000,
};

test("saving keeps the first context and never throws", async () => {
  const empty = fakeDb(async () => undefined);
  assert.equal(await recordPublicCheckoutAdContext(
    {...base, db: empty.db, click: undefined}), "skipped");
  assert.equal(empty.created.length, 0);

  const ok = fakeDb(async () => undefined);
  assert.equal(await recordPublicCheckoutAdContext(
    {...base, db: ok.db, click: {fbclid: "IwAR_synthetic_click"}}), "created");
  assert.equal(ok.created.length, 1);

  const exists = fakeDb(async () => {
    throw Object.assign(new Error("exists"), {code: 6});
  });
  assert.equal(await recordPublicCheckoutAdContext(
    {...base, db: exists.db, click: {fbclid: "IwAR_synthetic_click"}}), "kept");

  const broken = fakeDb(async () => {
    throw new Error("unavailable");
  });
  assert.equal(await recordPublicCheckoutAdContext(
    {...base, db: broken.db, click: {fbclid: "IwAR_synthetic_click"}}),
  "failed");
});
