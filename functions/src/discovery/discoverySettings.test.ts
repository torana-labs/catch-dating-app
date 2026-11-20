import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {contractValidator} from "../shared/contractTestValidators";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {DISCOVERY_SETTINGS_PATH, defaultDiscoveryRules} from
  "./discoveryPolicy";
import {
  DiscoverySettingsDeps,
  adminGetDiscoverySettingsHandler,
  adminUpdateDiscoverySettingsHandler,
} from "./discoverySettings";

const T0 = Date.UTC(2026, 10, 19, 9);
const OWNER = {adminOwner: true};
const OPS = {support: true};
const responseValid = contractValidator(
  "AdminGetDiscoverySettingsCallableResponse");
const documentValid = contractValidator("DiscoverySettingsDocument");

function harness(seed: Record<string, Record<string, unknown>> = {}) {
  const db = new FakeFirestore(seed);
  const limited: string[] = [];
  const deps: DiscoverySettingsDeps = {
    firestore: () => db as never,
    now: () => Timestamp.fromMillis(T0),
    serverTimestamp: () => "SERVER_TS" as never,
    checkRateLimit: async (_db, uid, name) => {
      limited.push(`${uid}:${name}`);
    },
  };
  return {db, deps, limited};
}

function adminRequest(uid: string, claims: Record<string, boolean>,
  data: unknown) {
  return {auth: {uid, token: claims}, data, rawRequest: {headers: {}}} as
    never;
}

function payload(overrides: Record<string, unknown> = {}) {
  const rules = defaultDiscoveryRules();
  return {
    surfaces: {...rules.surfaces,
      cityOrganizers: {onCatch: true, notOnCatch: true}},
    homeOrganizersMinimum: 3,
    homeClaimAction: true,
    ...overrides,
  };
}

async function rejects(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) =>
    error instanceof HttpsError && error.code === code);
}

test("ops read the defaults when nothing is stored", async () => {
  const h = harness();
  const response = await adminGetDiscoverySettingsHandler(
    adminRequest("ops-1", OPS, {}), h.deps);
  assert.deepEqual(response, {
    settings: {...defaultDiscoveryRules(), updatedAtMillis: null,
      updatedByUid: null},
    defaults: defaultDiscoveryRules(),
  });
  assert.ok(responseValid(response), JSON.stringify(responseValid.errors));
});

test("reading needs an ops role and an empty payload", async () => {
  const h = harness();
  await rejects(adminGetDiscoverySettingsHandler(
    adminRequest("guest-1", {}, {}), h.deps), "permission-denied");
  await rejects(adminGetDiscoverySettingsHandler(
    adminRequest("ops-1", OPS, {extra: true}), h.deps), "invalid-argument");
});

test("only the owner may update the discovery rules", async () => {
  const h = harness();
  await rejects(adminUpdateDiscoverySettingsHandler(
    adminRequest("ops-1", OPS, payload()), h.deps), "permission-denied");
  await rejects(adminUpdateDiscoverySettingsHandler(
    adminRequest("ops-1", {admin: true}, payload()), h.deps),
  "permission-denied");
  assert.equal(h.db.getDoc(DISCOVERY_SETTINGS_PATH), undefined);
});

test("an update is validated against the payload contract", async () => {
  const h = harness();
  const owner = (data: unknown) => adminUpdateDiscoverySettingsHandler(
    adminRequest("owner-1", OWNER, data), h.deps);
  await rejects(owner(payload({homeOrganizersMinimum: 0})),
    "invalid-argument");
  await rejects(owner(payload({homeOrganizersMinimum: 25})),
    "invalid-argument");
  await rejects(owner(payload({homeOrganizersMinimum: 2.5})),
    "invalid-argument");
  const partial: Record<string, unknown> = defaultDiscoveryRules().surfaces;
  delete partial.totals;
  await rejects(owner(payload({surfaces: partial})), "invalid-argument");
  await rejects(owner(payload({surfaces: {...defaultDiscoveryRules()
    .surfaces, plans: {onCatch: true, notOnCatch: true, extra: 1}}})),
  "invalid-argument");
  await rejects(owner({...payload(), updatedByUid: "someone"}),
    "invalid-argument");
  assert.equal(h.db.getDoc(DISCOVERY_SETTINGS_PATH), undefined);
});

test("the owner's update is stored with an audit entry", async () => {
  const h = harness();
  const response = await adminUpdateDiscoverySettingsHandler(
    adminRequest("owner-1", OWNER, payload()), h.deps);
  const expectedRules = {
    surfaces: payload().surfaces,
    homeOrganizersMinimum: 3,
    homeClaimAction: true,
  };
  assert.deepEqual(response, {
    settings: {...expectedRules, updatedAtMillis: T0,
      updatedByUid: "owner-1"},
    defaults: defaultDiscoveryRules(),
  });
  assert.ok(responseValid(response), JSON.stringify(responseValid.errors));
  assert.deepEqual(h.limited, ["owner-1:adminUpdateDiscoverySettings"]);

  const stored = h.db.getDoc(DISCOVERY_SETTINGS_PATH)!;
  assert.equal(stored.schemaVersion, 1);
  assert.deepEqual(stored.surfaces, expectedRules.surfaces);
  assert.equal(stored.homeOrganizersMinimum, 3);
  assert.equal(stored.homeClaimAction, true);
  assert.equal(stored.updatedByUid, "owner-1");
  assert.equal((stored.updatedAt as Timestamp).toMillis(), T0);
  assert.ok(documentValid(stored), JSON.stringify(documentValid.errors));

  const audits = [...h.db.docs.entries()]
    .filter(([path]) => path.startsWith("adminAuditLogs/"))
    .map(([, data]) => data);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].action, "adminUpdateDiscoverySettings");
  assert.equal(audits[0].targetPath, DISCOVERY_SETTINGS_PATH);
  assert.equal(audits[0].actorUid, "owner-1");
  assert.deepEqual(audits[0].before, defaultDiscoveryRules());
  assert.deepEqual(audits[0].after, expectedRules);

  // A later read returns what was stored.
  const read = await adminGetDiscoverySettingsHandler(
    adminRequest("ops-1", OPS, {}), h.deps);
  assert.deepEqual(read.settings, response.settings);
});

test("a second update audits the rules it replaced", async () => {
  const h = harness();
  const owner = (data: unknown) => adminUpdateDiscoverySettingsHandler(
    adminRequest("owner-1", OWNER, data), h.deps);
  await owner(payload());
  await owner({...defaultDiscoveryRules()});
  const audits = [...h.db.docs.entries()]
    .filter(([path]) => path.startsWith("adminAuditLogs/"))
    .map(([, data]) => data);
  assert.equal(audits.length, 2);
  assert.deepEqual(audits[1].before, {surfaces: payload().surfaces,
    homeOrganizersMinimum: 3, homeClaimAction: true});
  assert.deepEqual(audits[1].after, defaultDiscoveryRules());
});
