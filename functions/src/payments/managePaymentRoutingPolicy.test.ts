import {strict as assert} from "node:assert";
import {test} from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FormPaymentTestStore} from "./formPayments/formPaymentTestStore";
import {managePaymentRoutingPolicyHandler as manage} from
  "./managePaymentRoutingPolicy";
import {readPaymentRoute} from "./paymentRouting";

const route = {route: "razorpayRoute", mode: "test", currency: "INR",
  merchantCountry: "IN"};
const change = {action: "replace", organizerId: null,
  expectedRevision: 0, formFee: route, eventAdmission: null};
const read = {...change, action: "read", expectedRevision: null, formFee: null};
function request(data: unknown, role = "adminOwner"): CallableRequest<unknown> {
  return {data, auth: {uid: "operator", token: {[role]: true}}} as
    unknown as CallableRequest<unknown>;
}
function fixture() {
  const store = new FormPaymentTestStore();
  const db = store as unknown as FirebaseFirestore.Firestore;
  return {store, db, deps: {db: () => db, now: () => 1000,
    rateLimit: async () => undefined}};
}

test("routing settings require Finance or Admin Owner", async () => {
  const deps = {...fixture().deps, db: () => {
    throw new Error("DB accessed");
  }};
  for (const role of ["admin", "support", "finance",
    "organizerManager"]) {
    await assert.rejects(manage(request(read, role), deps), /not authorized/);
  }
});

test("app configuration revisions, retry and audit", async () => {
  const {store, db, deps} = fixture();
  assert.equal((await manage(request(read), deps)).revision, 0);
  const saved = await manage(request(change), deps);
  assert.equal(saved.revision, 1);
  assert.equal(saved.updatedAtMillis, 1000);
  const count = store.records.size;
  assert.deepEqual(await manage(request(change), deps), saved);
  assert.equal(store.records.size, count);
  assert.ok([...store.records.keys()].some((path) =>
    path.startsWith("adminAuditLogs/")));
  await assert.rejects(manage(request({...change,
    formFee: {route: "disabled"}}),
  deps), /settings changed/);
  const selected = await readPaymentRoute({db, organizerId: "org",
    purpose: "formFee"});
  assert.equal(selected.selection.route, "razorpayRoute");
  assert.equal(selected.appRevision, 1);
  await assert.rejects(readPaymentRoute({db, organizerId: "org",
    purpose: "eventAdmission"}), /disabled/);
});

test("organizer existence and purpose isolation", async () => {
  const {store, db, deps} = fixture();
  await manage(request(change), deps);
  const override = {...change, organizerId: "org", formFee: null,
    eventAdmission: {...route, route: "razorpayOAuth"}};
  await assert.rejects(manage(request(override), deps), /Organizer not found/);
  store.records.set("organizers/org", {});
  const saved = await manage(request(override), deps);
  assert.match(saved.policyId, /^org_[a-f0-9]{64}$/u);
  assert.equal((await readPaymentRoute({db, organizerId: "org",
    purpose: "formFee"})).policySource, "app");
  assert.equal((await readPaymentRoute({db, organizerId: "org",
    purpose: "eventAdmission"})).selection.route, "razorpayOAuth");
  await assert.rejects(readPaymentRoute({db, organizerId: "other",
    purpose: "eventAdmission"}), /disabled/);
});

test("invalid settings and injected secrets never write", async () => {
  const {store, deps} = fixture();
  for (const invalid of [{...change, secret: "never-store"},
    {...read, formFee: route}, {...change, expectedRevision: null},
    {...change, formFee: {...route, accountId: "acc_other"}},
    {...change, formFee: {...route, currency: "inr"}}]) {
    await assert.rejects(manage(request(invalid), deps));
  }
  assert.equal(store.records.size, 0);
});

test("membership money flow is routed like tickets and forms", async () => {
  const {db, deps} = fixture();
  const oauth = {...route, route: "razorpayOAuth"};
  const saved = await manage(request({...change, hostMembership: oauth}),
    deps);
  assert.deepEqual(saved.hostMembership, oauth);
  assert.equal((await readPaymentRoute({db, organizerId: "org",
    purpose: "hostMembership"})).selection.route, "razorpayOAuth");
  // An operator client that predates memberships keeps the stored route.
  const older = await manage(request({...change, expectedRevision: 1,
    formFee: {route: "disabled"}}), deps);
  assert.deepEqual(older.hostMembership, oauth);
  // An explicit null clears it, which turns memberships off.
  const cleared = await manage(request({...change, expectedRevision: 2,
    hostMembership: null}), deps);
  assert.equal(cleared.hostMembership, null);
  await assert.rejects(readPaymentRoute({db, organizerId: "org",
    purpose: "hostMembership"}), /disabled/);
});

test("policies stored before memberships read as membership-off",
  async () => {
    const {store, db, deps} = fixture();
    await manage(request(change), deps);
    const stored = store.records.get("paymentRoutingPolicies/app")!;
    assert.equal("hostMembership" in stored, false);
    assert.equal((await manage(request(read), deps)).hostMembership, null);
    await assert.rejects(readPaymentRoute({db, organizerId: "org",
      purpose: "hostMembership"}), /disabled/);
  });
