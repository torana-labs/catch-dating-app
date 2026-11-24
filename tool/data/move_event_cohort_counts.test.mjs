import assert from "node:assert/strict";
import test from "node:test";
import {main} from "./move_event_cohort_counts.mjs";

const DELETE = Symbol("delete");
const NOW = Symbol("now");

// In-memory Firestore with only what the tool calls.
function fakeAdmin(initial) {
  const docs = new Map(Object.entries(initial).map(([path, data]) => [path, {...data}]));
  const snapshot = (path) => ({
    id: path.split("/").at(-1),
    ref: {path},
    updateTime: `t:${path}`,
    data: () => (docs.has(path) ? structuredClone(docs.get(path)) : undefined),
  });
  const collection = (id) => {
    const make = ({after = null, max = Infinity} = {}) => ({
      orderBy: () => make({after, max}),
      limit: (value) => make({after, max: value}),
      startAfter: (snap) => make({after: snap.ref.path, max}),
      get: async () => ({docs: [...docs.keys()]
        .filter((path) => path.startsWith(`${id}/`) && path.split("/").length === 2)
        .sort()
        .filter((path) => after === null || path > after)
        .slice(0, max)
        .map(snapshot)}),
    });
    return make();
  };
  const db = {
    docs,
    collection: (id) => Object.assign(collection(id), {
      doc: (docId) => ({
        set: async (data) => docs.set(`${id}/${docId}`, {...data}),
        update: async (data) => docs.set(`${id}/${docId}`,
          {...docs.get(`${id}/${docId}`), ...data}),
      }),
    }),
    doc: (path) => ({path, get: async () => snapshot(path)}),
    batch: () => {
      const writes = [];
      return {
        set: (ref, data, options) => writes.push(() => {
          const next = {...(docs.get(ref.path) ?? {})};
          for (const field of options.mergeFields) {
            next[field] = data[field] === NOW ? "server-time" : data[field];
          }
          docs.set(ref.path, next);
        }),
        update: (ref, patch, precondition) => writes.push(() => {
          assert.equal(precondition?.lastUpdateTime, `t:${ref.path}`);
          const next = {...docs.get(ref.path)};
          for (const [key, value] of Object.entries(patch)) {
            if (value === DELETE) delete next[key];
            else next[key] = value;
          }
          docs.set(ref.path, next);
        }),
        commit: async () => writes.forEach((write) => write()),
      };
    },
  };
  const firestore = () => db;
  firestore.FieldValue = {delete: () => DELETE, serverTimestamp: () => NOW};
  return {db, firestore, initializeApp: () => undefined};
}

const world = () => ({
  "events/e1": {name: "Run", genderCounts: {woman: 2},
    cohortCounts: {womenInterestedInMen: 1, queerOrOpen: 1},
    waitlistedCohortCounts: {}, crossPathsPairHeldCohortCounts: {}},
  "events/e2": {name: "Walk", cohortCounts: {menInterestedInWomen: 3},
    waitlistedCohortCounts: {queerOrOpen: 1}},
  "eventCohortCounts/e2": {eventId: "e2",
    cohortCounts: {menInterestedInWomen: 4}},
  "events/e3": {name: "Swim", genderCounts: {}},
});

test("moves every cohort total off the organiser-readable event", async () => {
  const admin = fakeAdmin(world());
  const plan = await main(["--emulator", "--json", "--apply"], {admin,
    now: () => 1_790_000_000_000, commit: {sha: null, dirty: null}});
  assert.deepEqual(plan.summary, {events: 2, mapsRemoved: 5, mapsCopied: 4,
    keptNewerPrivateCopy: 1});
  const {docs} = admin.db;
  // The applied run is recorded (FIX-7).
  const runs = [...docs].filter(([path]) => path.startsWith("dataToolRuns/"));
  assert.equal(runs.length, 1);
  assert.equal(runs[0][1].status, "succeeded");
  for (const id of ["e1", "e2"]) {
    for (const field of ["cohortCounts", "waitlistedCohortCounts",
      "crossPathsPairHeldCohortCounts"]) {
      assert.equal(Object.hasOwn(docs.get(`events/${id}`), field), false);
    }
  }
  // Gender totals stay for the organiser.
  assert.deepEqual(docs.get("events/e1").genderCounts, {woman: 2});
  assert.deepEqual(docs.get("eventCohortCounts/e1").cohortCounts,
    {womenInterestedInMen: 1, queerOrOpen: 1});
  // A map a newer write recorded privately is kept, never overwritten.
  assert.deepEqual(docs.get("eventCohortCounts/e2").cohortCounts,
    {menInterestedInWomen: 4});
  assert.deepEqual(docs.get("eventCohortCounts/e2").waitlistedCohortCounts,
    {queerOrOpen: 1});
  assert.equal(docs.has("eventCohortCounts/e3"), false);
});

test("a dry run writes nothing", async () => {
  const admin = fakeAdmin(world());
  const before = JSON.stringify([...admin.db.docs]);
  await main(["--emulator", "--json"], {admin});
  assert.equal(JSON.stringify([...admin.db.docs]), before);
});

test("needs an explicit target and prod approval to apply", async () => {
  const admin = fakeAdmin(world());
  await assert.rejects(main([], {admin}), /Name the target explicitly/u);
  await assert.rejects(main(["--env", "prod", "--apply"], {admin}),
    /Refusing to move event cohort counts in prod/u);
});
