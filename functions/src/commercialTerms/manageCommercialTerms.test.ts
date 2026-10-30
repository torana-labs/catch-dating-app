import assert from "node:assert/strict";
import test from "node:test";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FormPaymentTestStore} from
  "../payments/formPayments/formPaymentTestStore";
import {manageCommercialTermsHandler as manage} from "./manageCommercialTerms";
import {resolveCommercialTerms} from "./resolver";
import {organizerCommercialTermsId} from "./terms";
import {testCommercialTerms} from "./testFixture";

const platformWrite = {action: "replace", organizerId: null,
  expectedRevision: 0, terms: testCommercialTerms(),
  reason: "Owner decision 30 Oct"};
const read = (organizerId: string | null = null) => ({action: "read",
  organizerId, expectedRevision: null, terms: null, reason: null});

function request(data: unknown, role = "finance"): CallableRequest<unknown> {
  return {data, auth: {uid: "operator", token: {[role]: true}}} as
    unknown as CallableRequest<unknown>;
}

function fixture() {
  const store = new FormPaymentTestStore();
  const db = store as unknown as FirebaseFirestore.Firestore;
  let clock = 1000;
  return {store, db, deps: {db: () => db, now: () => clock++,
    rateLimit: async () => undefined}};
}

const paths = (store: FormPaymentTestStore, prefix: string) =>
  [...store.records.keys()].filter((path) => path.startsWith(prefix));

test("terms are readable and writable by Finance and Admin Owner only",
  async () => {
    const deps = {...fixture().deps, db: () => {
      throw new Error("DB accessed");
    }};
    for (const role of ["admin", "support", "analyticsViewer", "salesStaff",
      "organizerManager"]) {
      await assert.rejects(manage(request(read(), role), deps),
        /not authorized/);
    }
  });

test("platform writes are versioned, audited and replay-safe", async () => {
  const {store, db, deps} = fixture();
  const empty = await manage(request(read()), deps);
  assert.deepEqual([empty.revision, empty.terms, empty.effectiveTerms],
    [0, null, null]);
  const saved = await manage(request(platformWrite), deps);
  assert.deepEqual([saved.termsId, saved.revision, saved.platformRevision],
    ["platform", 1, 1]);
  assert.deepEqual(saved.effectiveTerms, testCommercialTerms());
  assert.deepEqual(paths(store, "commercialTermsRevisions/"),
    ["commercialTermsRevisions/platform_r1"]);
  assert.equal(paths(store, "adminAuditLogs/").length, 1);
  const audit = store.records.get(paths(store, "adminAuditLogs/")[0])!;
  assert.deepEqual([audit.action, audit.note],
    ["manageCommercialTerms", "Owner decision 30 Oct"]);

  // The exact same command replays without a second revision or audit.
  const count = store.records.size;
  assert.deepEqual(await manage(request(platformWrite), deps), saved);
  assert.equal(store.records.size, count);
  // A stale revision must be reviewed again.
  await assert.rejects(manage(request({...platformWrite,
    reason: "Second look"}), deps), /changed/);

  const raised = await manage(request({...platformWrite, expectedRevision: 1,
    reason: "Cap raised", terms: {...testCommercialTerms(), commission: {
      ...testCommercialTerms().commission, capMinor: 2_000_000}}}), deps);
  assert.equal(raised.revision, 2);
  // History keeps both revisions; payments resolve the latest.
  assert.deepEqual(paths(store, "commercialTermsRevisions/").sort(),
    ["commercialTermsRevisions/platform_r1",
      "commercialTermsRevisions/platform_r2"]);
  assert.equal((store.records.get("commercialTermsRevisions/platform_r1")!
    .terms as {commission: {capMinor: number}}).commission.capMinor,
  1_000_000);
  const snapshot = await resolveCommercialTerms({db, organizerId: "org",
    purpose: "eventAdmission", moneyFlow: "hostCollected", nowMillis: 1});
  assert.deepEqual([snapshot.platformRevision, snapshot.commission.capMinor],
    [2, 2_000_000]);
});

test("organizer overrides are sparse and need a known organizer",
  async () => {
    const {store, db, deps} = fixture();
    const override = {action: "replace", organizerId: "org",
      expectedRevision: 0, reason: "Pilot rate",
      terms: {commission: {rateBasisPoints: 250}}};
    await assert.rejects(manage(request(override), deps),
      /Organizer not found/);
    store.records.set("organizers/org", {});
    const saved = await manage(request(override), deps);
    assert.equal(saved.termsId, organizerCommercialTermsId("org"));
    // No platform defaults yet: the override is stored, nothing resolves.
    assert.equal(saved.effectiveTerms, null);
    await assert.rejects(resolveCommercialTerms({db, organizerId: "org",
      purpose: "formFee", moneyFlow: "hostCollected", nowMillis: 1}),
    /not configured/);
    await manage(request(platformWrite), deps);
    const effective = await manage(request(read("org")), deps);
    assert.deepEqual([effective.revision, effective.platformRevision,
      effective.effectiveTerms?.commission.rateBasisPoints,
      effective.effectiveTerms?.commission.capMinor],
    [1, 1, 250, 1_000_000]);
    assert.deepEqual(paths(store, "commercialTermsRevisions/"), [
      `commercialTermsRevisions/${organizerCommercialTermsId("org")}_r1`,
      "commercialTermsRevisions/platform_r1"]);
  });

test("incomplete, unknown or reason-less writes never store", async () => {
  const {store, deps} = fixture();
  store.records.set("organizers/org", {});
  const incomplete: Record<string, unknown> = {...testCommercialTerms()};
  delete incomplete.gatewayFeeBearer;
  for (const invalid of [
    {...platformWrite, terms: incomplete},
    {...platformWrite, reason: null},
    {...platformWrite, reason: "  "},
    {...platformWrite, expectedRevision: null},
    {...platformWrite, terms: {...testCommercialTerms(), secret: "x"}},
    {...platformWrite, terms: {...testCommercialTerms(),
      commission: {...testCommercialTerms().commission,
        rateBasisPoints: 10_001}}},
    {...platformWrite, organizerId: "org", terms: {moneyFlow: "split"}},
    {...read(), terms: testCommercialTerms()},
  ]) {
    await assert.rejects(manage(request(invalid), deps));
  }
  assert.deepEqual(paths(store, "commercialTerms"), []);
  assert.deepEqual(paths(store, "adminAuditLogs/"), []);
});
