import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import {FakeFirestore} from "../../shared/testing/programFirestore";
import {hostDeliveryRecords} from "../adConversions/deliveries";
import {hashedEmail, hashedPhone} from "../adConversions/hostConversions";
import {
  type AdMatchingOptOutDeps,
  adminManageAdMatchingOptOutHandler,
} from "./adminOptOuts";
import {adMatchingOptOutId} from "./optOuts";

const T0 = Date.UTC(2026, 10, 19, 9);
const PHONE = "+919876543210";
const EMAIL = "host@example.com";
const phoneId = adMatchingOptOutId("phone", hashedPhone(PHONE)!);
const emailId = adMatchingOptOutId("email", hashedEmail(EMAIL)!);

function harness(seed: Record<string, Record<string, unknown>> = {}) {
  const db = new FakeFirestore(seed);
  const limits: string[] = [];
  const deps: AdMatchingOptOutDeps = {
    firestore: () => db as never,
    now: () => T0,
    serverTimestamp: () => "SERVER_TS" as never,
    checkRateLimit: async (_db, _uid, action) => {
      limits.push(action);
    },
  };
  return {db, deps, limits};
}

const call = (data: unknown, token: Record<string, unknown> =
{support: true}, uid = "ops-1") => ({
  auth: {uid, token},
  data,
  rawRequest: {headers: {}},
}) as never;

const payload = (overrides: Record<string, unknown> = {}) => ({
  action: "record", phone: "98765 43210", email: " Host@Example.com ",
  source: "support", note: "Support conversation from Tuesday",
  ...overrides,
});

async function rejects(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) =>
    error instanceof HttpsError && error.code === code);
}

test("only support, safety, ops and the owner may manage opt-outs",
  async () => {
    const h = harness();
    await rejects(adminManageAdMatchingOptOutHandler({data: payload(),
      rawRequest: {headers: {}}} as never, h.deps), "unauthenticated");
    await rejects(adminManageAdMatchingOptOutHandler(call(payload(),
      {salesStaff: true}), h.deps), "permission-denied");
    await rejects(adminManageAdMatchingOptOutHandler(call(payload(), {}),
      h.deps), "permission-denied");
    for (const role of ["admin", "adminOwner", "safetyReviewer", "support"]) {
      const result = await adminManageAdMatchingOptOutHandler(
        call(payload({action: "check"}), {[role]: true}), h.deps);
      assert.deepEqual(result.kinds, ["phone", "email"]);
    }
    assert.ok(h.limits.every((action) =>
      action === "adminManageAdMatchingOptOut"));
  });

test("bad input is refused before anything is written", async () => {
  const h = harness();
  for (const bad of [
    payload({action: "erase"}),
    payload({source: "website"}),
    payload({extra: true}),
    payload({phone: null, email: null}),
    payload({phone: "12345"}),
    payload({email: "not-an-email"}),
    payload({note: "Call them on +91 98765 43210"}),
    payload({note: "Wrote from host@example.com"}),
  ]) {
    await rejects(adminManageAdMatchingOptOutHandler(call(bad), h.deps),
      "invalid-argument");
  }
  assert.equal(h.db.docs.size, 0);
});

test("recording stores only hashed keys and never echoes the contact",
  async () => {
    const [pending] = hostDeliveryRecords({organizerId: "org-1",
      conversion: "organizer_signup",
      organizer: {ownership: {state: "claimed", ownerUserId: "host-1"}},
      owner: {phoneNumber: PHONE, email: ""}, nowMillis: T0});
    const h = harness({
      [`adConversionDeliveries/${pending.deliveryId}`]: {...pending},
    });
    const result = await adminManageAdMatchingOptOutHandler(call(payload()),
      h.deps);
    assert.deepEqual(result, {action: "record", kinds: ["phone", "email"],
      changed: ["phone", "email"], optedOut: ["phone", "email"]});
    const phone = h.db.getDoc(`adMatchingOptOuts/${phoneId}`)!;
    assert.equal(phone.status, "active");
    assert.equal(phone.kind, "phone");
    assert.equal(phone.source, "support");
    assert.equal(phone.createdByUid, "ops-1");
    assert.equal(phone.removedByUid, null);
    assert.equal(h.db.getDoc(`adMatchingOptOuts/${emailId}`)!.kind, "email");
    const everything = JSON.stringify([...h.db.docs.entries(), result]);
    for (const raw of [PHONE, "9876543210", "98765 43210", EMAIL,
      "Host@Example.com", hashedPhone(PHONE)!, hashedEmail(EMAIL)!]) {
      assert.equal(everything.includes(raw), false, raw);
    }
    // The pending conversion is cancelled at once.
    const cancelled = h.db.getDoc(
      `adConversionDeliveries/${pending.deliveryId}`)!;
    assert.equal(cancelled.status, "cancelled");
    assert.equal(cancelled.lastOutcome, "opted_out");
    // Recording again changes nothing.
    const again = await adminManageAdMatchingOptOutHandler(call(payload()),
      h.deps);
    assert.deepEqual(again.changed, []);
    const audits = [...h.db.docs.entries()]
      .filter(([path]) => path.startsWith("adminAuditLogs/"));
    assert.equal(audits.length, 2);
  });

test("check reports kinds; removal keeps who removed it", async () => {
  const h = harness();
  await adminManageAdMatchingOptOutHandler(call(payload({email: null})),
    h.deps);
  const checked = await adminManageAdMatchingOptOutHandler(
    call(payload({action: "check"})), h.deps);
  assert.deepEqual(checked, {action: "check", kinds: ["phone", "email"],
    changed: [], optedOut: ["phone"]});
  const removed = await adminManageAdMatchingOptOutHandler(
    call(payload({action: "remove", note: null}), {adminOwner: true},
      "owner-1"), h.deps);
  assert.deepEqual(removed, {action: "remove", kinds: ["phone", "email"],
    changed: ["phone"], optedOut: []});
  const record = h.db.getDoc(`adMatchingOptOuts/${phoneId}`)!;
  assert.equal(record.status, "removed");
  assert.equal(record.removedByUid, "owner-1");
  assert.equal(record.createdByUid, "ops-1");
  assert.equal(h.db.getDoc(`adMatchingOptOuts/${emailId}`), undefined);
});
