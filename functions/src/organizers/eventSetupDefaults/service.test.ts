import assert from "node:assert/strict";
import {test} from "node:test";
import {eventSetupDefaultsDependencies} from "./dependencies";
import {
  EventSetupDefaultsDependencies, getManagerEventSetupDefaults,
  updateManagerEventSetupDefaults,
} from "./service";

type Row = Record<string, unknown>;

function harness() {
  const rows = new Map<string, Row>([["organizers/org1", {
    hostUserId: "host1", ownerUserId: "host1", hostUserIds: [],
    hostProfiles: [], status: "active", archived: false,
    locationCityId: "city1", locationMarketId: "market1",
    hostDefaults: {timezone: "Asia/Kolkata", revision: 2},
  }], ["organizerEventOffers/historical", {status: "offered"}]]);
  let writes = 0;
  const db = {
    collection(name: string) {
      return {doc(id: string) {
        return {path: `${name}/${id}`};
      }};
    },
    async runTransaction<T>(callback: (tx: unknown) => Promise<T>) {
      const pending = new Map<string, Row>();
      const tx = {
        async get(ref: {path: string}) {
          const data = pending.get(ref.path) ?? rows.get(ref.path);
          return {exists: data !== undefined, data: () => data};
        },
        set(ref: {path: string}, data: Row) {
          pending.set(ref.path, data);
        },
        create(ref: {path: string}, data: Row) {
          if (rows.has(ref.path) || pending.has(ref.path)) {
            throw new Error("already exists");
          }
          pending.set(ref.path, data);
        },
      };
      const result = await callback(tx);
      for (const [path, data] of pending) {
        rows.set(path, data);
        writes++;
      }
      return result;
    },
  };
  const deps: EventSetupDefaultsDependencies = {
    db: db as unknown as FirebaseFirestore.Firestore,
    serverTimestamp: () => "server-time" as unknown as
      FirebaseFirestore.FieldValue,
    validateAndHashPreferences: eventSetupDefaultsDependencies(
      db as unknown as FirebaseFirestore.Firestore
    ).validateAndHashPreferences,
  };
  return {rows, deps, get writes() {
    return writes;
  }};
}

const read = (deps: EventSetupDefaultsDependencies) =>
  getManagerEventSetupDefaults({actorUid: "host1", organizerId: "org1",
    deps});
const update = async (deps: EventSetupDefaultsDependencies,
  overrides: Record<string, unknown> = {}) => {
  const current = await read(deps);
  return updateManagerEventSetupDefaults({actorUid: "host1", deps,
    command: {organizerId: "org1", requestId: "request_001",
      expectedRevision: 0,
      reviewedDefaultsHash: current.reviewedDefaultsHash,
      changes: {offerValidityMinutes: {mode: "set", value: 30}},
      ...overrides}});
};

test("manager reads coherent public and private defaults", async () => {
  const h = harness();
  const before = await read(h.deps);
  assert.equal(before.city?.cityId, "city1");
  assert.equal(before.timezone, "Asia/Kolkata");
  assert.equal(before.organizerDefaultsRevision, 2);
  assert.equal(before.preferencesRevision, 0);
  assert.deepEqual(before.preferences, {timezone: "Asia/Kolkata"});
  const result = await update(h.deps);
  assert.equal(result.appliedRevision, 1);
  assert.equal(result.current.preferences.offerValidityMinutes, 30);
  assert.notEqual(result.current.reviewedDefaultsHash,
    before.reviewedDefaultsHash);
  assert.equal(h.rows.get("organizers/org1")?.hostDefaults !== undefined,
    true);
  assert.equal(h.rows.get("organizers/org1")?.eventSetup, undefined);
  assert.deepEqual(h.rows.get("organizerEventOffers/historical"),
    {status: "offered"});
  assert.equal(h.writes, 2);
});

test("CAS, replay and mismatched reuse preserve later choices", async () => {
  const h = harness();
  const initial = await read(h.deps);
  const first = await update(h.deps, {
    reviewedDefaultsHash: initial.reviewedDefaultsHash,
  });
  assert.equal(first.replayed, false);
  await assert.rejects(update(h.deps, {requestId: "request_002"}),
    {code: "aborted"});
  const later = await update(h.deps, {requestId: "request_003",
    expectedRevision: 1,
    changes: {currency: {mode: "set", value: "INR"}}});
  assert.equal(later.appliedRevision, 2);
  const replay = await update(h.deps, {
    reviewedDefaultsHash: initial.reviewedDefaultsHash,
  });
  assert.equal(replay.replayed, true);
  assert.equal(replay.appliedRevision, 1);
  assert.equal(replay.current.preferencesRevision, 2);
  assert.equal(replay.current.preferences.currency, "INR");
  assert.equal(h.writes, 4);
  await assert.rejects(update(h.deps, {changes: {
    offerValidityMinutes: {mode: "clear"},
  }}), {code: "already-exists"});
  assert.equal(h.writes, 4);
});

test("revoked or deleted manager cannot read or replay", async () => {
  const h = harness();
  await update(h.deps);
  h.rows.set("organizers/org1", {...h.rows.get("organizers/org1")!,
    hostUserId: "other", ownerUserId: "other"});
  await assert.rejects(read(h.deps), {code: "permission-denied"});
  await assert.rejects(update(h.deps), {code: "permission-denied"});
  h.rows.set("organizers/org1", {...h.rows.get("organizers/org1")!,
    hostUserId: "host1", ownerUserId: "host1"});
  h.rows.set("deletedUsers/host1", {uid: "host1"});
  await assert.rejects(read(h.deps), {code: "permission-denied"});
  await assert.rejects(update(h.deps), {code: "permission-denied"});
  assert.equal(h.writes, 2);
});

test("clear, validation and changed public defaults are fenced", async () => {
  const h = harness();
  await update(h.deps);
  const cleared = await update(h.deps, {requestId: "request_004",
    expectedRevision: 1,
    changes: {offerValidityMinutes: {mode: "clear"}}});
  assert.deepEqual(cleared.current.preferences, {timezone: "Asia/Kolkata"});
  const writes = h.writes;
  await assert.rejects(update(h.deps, {requestId: "request_005",
    expectedRevision: 2,
    changes: {usualDurationMinutes: {mode: "set", value: 1}}}),
  {code: "invalid-argument"});
  await assert.rejects(update(h.deps, {requestId: "request_006",
    expectedRevision: 2,
    changes: {unknown: {mode: "set", value: true}}}),
  {code: "invalid-argument"});
  assert.equal(h.writes, writes);
  const prior = await read(h.deps);
  h.rows.set("organizers/org1", {...h.rows.get("organizers/org1")!,
    locationCityId: "city2"});
  const after = await read(h.deps);
  assert.notEqual(after.basicsReviewedHash, prior.basicsReviewedHash);
  assert.notEqual(after.reviewedDefaultsHash, prior.reviewedDefaultsHash);
  await assert.rejects(update(h.deps, {requestId: "request_007",
    expectedRevision: 2,
    reviewedDefaultsHash: prior.reviewedDefaultsHash,
    changes: {currency: {mode: "set", value: "INR"}}}),
  {code: "aborted"});
  assert.equal(h.writes, writes);
});

test("malformed private source fails closed", async () => {
  const h = harness();
  h.rows.set("organizerEventSetupDefaults/org1", {
    organizerId: "another", revision: 8, eventSetup: {},
  });
  await assert.rejects(read(h.deps), {code: "failed-precondition"});
  await assert.rejects(update(h.deps), {code: "failed-precondition"});
  assert.equal(h.writes, 0);
});


test("real payment-page validation rejects unsafe storage without writes",
  async () => {
    const h = harness();
    for (const page of [
      {url: "https://payments.example/offer", reusableForEvents: false},
      {url: "http://payments.example/offer", reusableForEvents: true},
      {url: "https://secret@payments.example/offer", reusableForEvents: true},
    ]) {
      await assert.rejects(update(h.deps, {changes: {
        reusablePaymentPage: {mode: "set", value: page},
      }}), {code: "invalid-argument"});
    }
    assert.equal(h.writes, 0);
    const saved = await update(h.deps, {changes: {
      reusablePaymentPage: {mode: "set", value: {
        url: "https://payments.example/offer", reusableForEvents: true,
      }},
    }});
    assert.equal(saved.current.preferences.reusablePaymentPage?.url,
      "https://payments.example/offer");
    assert.equal(h.rows.get("organizers/org1")?.reusablePaymentPage, undefined);
  });


test("private timezone overrides and clear never revives legacy timezone",
  async () => {
    const h = harness();
    const publicBefore = structuredClone(h.rows.get("organizers/org1"));
    const initial = await read(h.deps);
    await assert.rejects(update(h.deps, {changes: {
      timezone: {mode: "set", value: "Not/A_Timezone"},
    }}), {code: "invalid-argument"});
    assert.equal(h.writes, 0);
    const saved = await update(h.deps, {changes: {
      timezone: {mode: "set", value: "Asia/Dubai"},
    }});
    assert.equal(saved.current.timezone, "Asia/Dubai");
    assert.equal(saved.current.organizerDefaultsRevision, 1);
    assert.notEqual(saved.current.basicsReviewedHash,
      initial.basicsReviewedHash);
    const cleared = await update(h.deps, {requestId: "request-clear-tz",
      expectedRevision: 1, changes: {timezone: {mode: "clear"}}});
    assert.equal(cleared.current.timezone, null);
    assert.equal(cleared.current.preferences.timezone, undefined);
    assert.equal((await read(h.deps)).timezone, null);
    assert.deepEqual(h.rows.get("organizers/org1"), publicBefore);
  });

test("the board defaults save, clear and validate", async () => {
  const h = harness();
  const before = await read(h.deps);
  const result = await update(h.deps, {changes: {
    startingPriceMinor: {mode: "set", value: 49900},
    places: {mode: "set", value: 32},
    waitlistEnabled: {mode: "set", value: true},
    bookingMode: {mode: "set", value: "askFirst"},
    refundPolicy: {mode: "set", value: "flexible"},
    askedAtBooking: {mode: "set", value: ["food", "heard"]},
    autoMessages: {mode: "set", value: {thankYou: true, arrival: false}},
  }});
  assert.deepEqual(result.current.preferences, {timezone: "Asia/Kolkata",
    startingPriceMinor: 49900, places: 32, waitlistEnabled: true,
    bookingMode: "askFirst", refundPolicy: "flexible",
    askedAtBooking: ["food", "heard"],
    autoMessages: {thankYou: true, arrival: false}});
  assert.notEqual(result.current.preferencesHash, before.preferencesHash);
  const cleared = await updateManagerEventSetupDefaults({actorUid: "host1",
    deps: h.deps, command: {organizerId: "org1", requestId: "request_002",
      expectedRevision: 1,
      reviewedDefaultsHash: result.current.reviewedDefaultsHash,
      changes: {places: {mode: "clear"}}}});
  assert.equal(cleared.current.preferences.places, undefined);
  await assert.rejects(updateManagerEventSetupDefaults({actorUid: "host1",
    deps: h.deps, command: {organizerId: "org1", requestId: "request_003",
      expectedRevision: 2,
      reviewedDefaultsHash: cleared.current.reviewedDefaultsHash,
      changes: {places: {mode: "set", value: 0}}}}), /Invalid Places/);
});
