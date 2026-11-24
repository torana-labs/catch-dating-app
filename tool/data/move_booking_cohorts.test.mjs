import assert from "node:assert/strict";
import test from "node:test";
import {main} from "./move_booking_cohorts.mjs";

const DELETE = Symbol("delete");
const NOW = Symbol("now");

// In-memory Firestore with only what the tool calls: paged reads ordered by
// path, document gets, and batched merge-sets and updates.
function fakeAdmin(initial) {
  const docs = new Map(Object.entries(initial).map(([path, data]) => [path, {...data}]));
  const snapshot = (path) => ({
    id: path.split("/").at(-1),
    ref: {path},
    updateTime: `t:${path}`,
    exists: docs.has(path),
    data: () => (docs.has(path) ? {...docs.get(path)} : undefined),
  });
  const collection = (id) => {
    const make = ({after = null, max = Infinity} = {}) => ({
      orderBy: () => make({after, max}),
      limit: (value) => make({after, max: value}),
      startAfter: (snap) => make({after: snap.ref.path, max}),
      get: async () => {
        const found = [...docs.keys()]
          .filter((path) => path.startsWith(`${id}/`) && path.split("/").length === 2)
          .sort()
          .filter((path) => after === null || path > after)
          .slice(0, max)
          .map(snapshot);
        return {docs: found};
      },
    });
    return make();
  };
  const apply = (current, patch) => {
    const next = {...current};
    for (const [key, value] of Object.entries(patch)) {
      if (value === DELETE) delete next[key];
      else next[key] = value === NOW ? "server-time" : value;
    }
    return next;
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
          assert.deepEqual(options, {merge: true});
          docs.set(ref.path, apply(docs.get(ref.path) ?? {}, data));
        }),
        update: (ref, patch, precondition) => writes.push(() => {
          assert.equal(precondition?.lastUpdateTime, `t:${ref.path}`);
          docs.set(ref.path, apply(docs.get(ref.path), patch));
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
  "eventBookings/e1_u1": {eventId: "e1", uid: "u1", status: "signedUp",
    cohortAtSignup: "queerOrOpen"},
  "eventBookings/e1_u2": {eventId: "e1", uid: "u2", status: "waitlisted",
    cohortAtSignup: "womenInterestedInMen"},
  "eventBookings/e1_u3": {eventId: "e1", uid: "u3", status: "signedUp"},
  "eventBookingPrivateFacts/e1_u2": {eventId: "e1", uid: "u2",
    cohortAtSignup: "menInterestedInWomen"},
  "eventParticipations/e1_u1": {eventId: "e1", uid: "u1",
    cohortAtSignup: "queerOrOpen"},
  "eventWaitlistOffers/e1_u2": {eventId: "e1", uid: "u2", status: "active",
    cohortAtOffer: "womenInterestedInMen"},
});

test("moves every cohort out of the documents organisers read", async () => {
  const admin = fakeAdmin(world());
  const plan = await main(["--emulator", "--json", "--apply"], {admin,
    now: () => 1_790_000_000_000, commit: {sha: null, dirty: null}});
  assert.deepEqual(plan.summary, {bookings: 2, offers: 1, legacyMirrors: 1,
    copies: 2, keptNewerPrivateCopy: 1, invalid: 0});
  const {docs} = admin.db;
  // The applied run is recorded (FIX-7).
  const runs = [...docs].filter(([path]) => path.startsWith("dataToolRuns/"));
  assert.equal(runs.length, 1);
  assert.equal(runs[0][1].status, "succeeded");
  assert.equal(runs[0][1].tool, "tool/data/move_booking_cohorts.mjs");
  for (const path of ["eventBookings/e1_u1", "eventBookings/e1_u2",
    "eventParticipations/e1_u1"]) {
    assert.equal(Object.hasOwn(docs.get(path), "cohortAtSignup"), false, path);
  }
  assert.equal(Object.hasOwn(docs.get("eventWaitlistOffers/e1_u2"),
    "cohortAtOffer"), false);
  assert.equal(docs.get("eventBookingPrivateFacts/e1_u1").cohortAtSignup,
    "queerOrOpen");
  // A cohort a newer write recorded privately is kept, never overwritten.
  assert.equal(docs.get("eventBookingPrivateFacts/e1_u2").cohortAtSignup,
    "menInterestedInWomen");
  assert.equal(docs.get("eventBookingPrivateFacts/e1_u2").cohortAtOffer,
    "womenInterestedInMen");
  assert.equal(docs.get("eventBookings/e1_u3").status, "signedUp");
  assert.equal(docs.has("eventBookingPrivateFacts/e1_u3"), false);
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
    /Refusing to move booking cohorts in prod/u);
});
