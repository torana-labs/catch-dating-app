import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {
  DEFAULT_DISCOVERY_SETTINGS,
  DISCOVERY_SETTINGS_PATH,
  allowedOn,
  defaultDiscoveryRules,
  discoverySurfaces,
  organizerOnCatch,
  readDiscoverySettings,
} from "./discoveryPolicy";

const claimStates = ["unclaimed", "claimPending", "claimed", "verified"];

test("only claimed and verified organisers are on Catch", () => {
  assert.deepEqual(claimStates.map(organizerOnCatch),
    [false, false, true, true]);
  // Anything else fails closed.
  for (const other of ["suppressed", "", null, undefined, 1]) {
    assert.equal(organizerOnCatch(other), false, String(other));
  }
});

test("a surface rule allows each side on its own", () => {
  const allowed = (onCatch: boolean, notOnCatch: boolean) =>
    claimStates.map((state) => allowedOn({onCatch, notOnCatch}, state));
  assert.deepEqual(allowed(true, false), [false, false, true, true]);
  assert.deepEqual(allowed(false, true), [true, true, false, false]);
  assert.deepEqual(allowed(true, true), [true, true, true, true]);
  assert.deepEqual(allowed(false, false), [false, false, false, false]);
});

test("the defaults show only organisers on Catch, with no claim button",
  () => {
    const rules = defaultDiscoveryRules();
    for (const surface of discoverySurfaces) {
      assert.deepEqual(rules.surfaces[surface],
        {onCatch: true, notOnCatch: false}, surface);
    }
    assert.equal(rules.homeOrganizersMinimum, 1);
    assert.equal(rules.homeClaimAction, false);
    assert.equal(DEFAULT_DISCOVERY_SETTINGS.updatedAtMillis, null);
    assert.equal(DEFAULT_DISCOVERY_SETTINGS.updatedByUid, null);
    // Each call is a fresh copy, so a caller cannot change the defaults.
    rules.surfaces.plans.notOnCatch = true;
    assert.equal(defaultDiscoveryRules().surfaces.plans.notOnCatch, false);
    assert.ok(Object.isFrozen(DEFAULT_DISCOVERY_SETTINGS));
  });

test("nothing stored reads as the defaults", async () => {
  const db = new FakeFirestore({});
  assert.deepEqual(await readDiscoverySettings(db as never),
    {...defaultDiscoveryRules(), updatedAtMillis: null, updatedByUid: null});
});

test("stored settings are read back, in or out of a transaction",
  async () => {
    const updatedAt = Timestamp.fromMillis(Date.UTC(2026, 10, 19, 9));
    const stored = {
      schemaVersion: 1,
      surfaces: {
        homeOrganizers: {onCatch: true, notOnCatch: false},
        cityOrganizers: {onCatch: true, notOnCatch: true},
        plans: {onCatch: true, notOnCatch: false},
        totals: {onCatch: false, notOnCatch: false},
      },
      homeOrganizersMinimum: 4,
      homeClaimAction: true,
      updatedAt,
      updatedByUid: "owner-1",
    };
    const db = new FakeFirestore({[DISCOVERY_SETTINGS_PATH]: stored});
    const expected = {
      surfaces: stored.surfaces,
      homeOrganizersMinimum: 4,
      homeClaimAction: true,
      updatedAtMillis: updatedAt.toMillis(),
      updatedByUid: "owner-1",
    };
    assert.deepEqual(await readDiscoverySettings(db as never), expected);
    const inTransaction = await db.runTransaction((tx) =>
      readDiscoverySettings(db as never, tx as never));
    assert.deepEqual(inTransaction, expected);
  });

test("a malformed stored field falls back to its default", async () => {
  const db = new FakeFirestore({[DISCOVERY_SETTINGS_PATH]: {
    schemaVersion: 1,
    surfaces: {
      homeOrganizers: {onCatch: "yes", notOnCatch: true},
      plans: null,
    },
    homeOrganizersMinimum: 99,
    homeClaimAction: "on",
  }});
  const settings = await readDiscoverySettings(db as never);
  assert.deepEqual(settings.surfaces, {
    homeOrganizers: {onCatch: true, notOnCatch: true},
    cityOrganizers: {onCatch: true, notOnCatch: false},
    plans: {onCatch: true, notOnCatch: false},
    totals: {onCatch: true, notOnCatch: false},
  });
  assert.equal(settings.homeOrganizersMinimum, 1);
  assert.equal(settings.homeClaimAction, false);
  assert.equal(settings.updatedAtMillis, null);
  assert.equal(settings.updatedByUid, null);
});
