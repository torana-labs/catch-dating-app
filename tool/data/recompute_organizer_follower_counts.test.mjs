import assert from "node:assert/strict";
import test from "node:test";
import {verifyRecomputeCli} from "./lib/recompute_cli_test_support.mjs";
import {
  applyFollowerCountRepairPlan,
  buildFollowerCountRepairPlan,
} from "./recompute_organizer_follower_counts.mjs";

test("buildFollowerCountRepairPlan counts active follow edges", async () => {
  const firestore = fakeFirestore({
    organizers: {
      "club-1": {followerCount: 1},
      "club-2": {followerCount: 7},
      "club-3": {followerCount: 0},
    },
    organizerFollows: {
      "club-1_host-1": {organizerId: "club-1", status: "active"},
      "club-1_runner-1": {organizerId: "club-1", status: "active"},
      "club-1_runner-2": {organizerId: "club-1", status: "left"},
      "club-2_runner-1": {organizerId: "club-2", status: "deleted"},
      "missing_runner-1": {organizerId: "missing", status: "active"},
    },
  });

  const plan = await buildFollowerCountRepairPlan(firestore);

  assert.deepEqual(plan.summary.repairs, [
    {
      path: "organizers/club-1",
      organizerId: "club-1",
      currentFollowerCount: 1,
      expectedFollowerCount: 2,
    },
    {
      path: "organizers/club-2",
      organizerId: "club-2",
      currentFollowerCount: 7,
      expectedFollowerCount: 0,
    },
  ]);
  assert.deepEqual(plan.summary.warnings, [
    "organizerFollows/missing_runner-1 references missing organizers/missing.",
  ]);
});

test("applyFollowerCountRepairPlan writes only planned repairs", async () => {
  const firestore = fakeFirestore({
    organizers: {
      "club-1": {followerCount: 1, name: "Club 1"},
      "club-2": {followerCount: 7, name: "Club 2"},
    },
    organizerFollows: {},
  });

  await applyFollowerCountRepairPlan(firestore, {
    repairs: [
      {
        path: "organizers/club-1",
        expectedFollowerCount: 2,
      },
    ],
  });

  assert.equal(firestore.data.organizers["club-1"].followerCount, 2);
  assert.equal(firestore.data.organizers["club-2"].followerCount, 7);
});

function fakeFirestore(initialData) {
  const data = structuredClone(initialData);
  return {
    data,
    collection: (collectionName) => ({
      get: async () => ({
        size: Object.keys(data[collectionName] ?? {}).length,
        docs: Object.entries(data[collectionName] ?? {}).map(([id, value]) =>
          docSnapshot(collectionName, id, value)
        ),
      }),
    }),
    doc: (documentPath) => ({
      path: documentPath,
      update: (patch) => {
        const [collectionName, docId] = documentPath.split("/");
        data[collectionName][docId] = {
          ...data[collectionName][docId],
          ...patch,
        };
      },
    }),
    batch: () => {
      const writes = [];
      return {
        update: (ref, patch) => writes.push(() => ref.update(patch)),
        commit: async () => {
          for (const write of writes) write();
        },
      };
    },
  };
}

function docSnapshot(collectionName, id, value) {
  return {
    id,
    ref: {path: `${collectionName}/${id}`},
    data: () => ({...value}),
  };
}

test("CLI shared helpers preserve project precedence and dry-run policy", (t) => {
  verifyRecomputeCli(t, new URL("./recompute_organizer_follower_counts.mjs", import.meta.url), {organizers: {organizer: {followerCount: 7}}, organizerFollows: {}});
});
