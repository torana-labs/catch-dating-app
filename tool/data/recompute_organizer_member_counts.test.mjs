import assert from "node:assert/strict";
import test from "node:test";
import {verifyRecomputeCli} from "./lib/recompute_cli_test_support.mjs";
import {
  applyMemberCountRepairPlan,
  buildMemberCountRepairPlan,
} from "./recompute_organizer_member_counts.mjs";

test("buildMemberCountRepairPlan counts active membership edges", async () => {
  const firestore = fakeFirestore({
    organizers: {
      "club-1": {memberCount: 1},
      "club-2": {memberCount: 7},
      "club-3": {memberCount: 0},
    },
    organizerMemberships: {
      "club-1_host-1": {organizerId: "club-1", status: "active"},
      "club-1_runner-1": {organizerId: "club-1", status: "active"},
      "club-1_runner-2": {organizerId: "club-1", status: "left"},
      "club-2_runner-1": {organizerId: "club-2", status: "deleted"},
      "missing_runner-1": {organizerId: "missing", status: "active"},
    },
  });

  const plan = await buildMemberCountRepairPlan(firestore);

  assert.deepEqual(plan.summary.repairs, [
    {
      path: "clubs/club-1",
      organizerId: "club-1",
      currentMemberCount: 1,
      expectedMemberCount: 2,
    },
    {
      path: "clubs/club-2",
      organizerId: "club-2",
      currentMemberCount: 7,
      expectedMemberCount: 0,
    },
  ]);
  assert.deepEqual(plan.summary.warnings, [
    "organizerMemberships/missing_runner-1 references missing clubs/missing.",
  ]);
});

test("applyMemberCountRepairPlan writes only planned repairs", async () => {
  const firestore = fakeFirestore({
    organizers: {
      "club-1": {memberCount: 1, name: "Club 1"},
      "club-2": {memberCount: 7, name: "Club 2"},
    },
    organizerMemberships: {},
  });

  await applyMemberCountRepairPlan(firestore, {
    repairs: [
      {
        path: "clubs/club-1",
        expectedMemberCount: 2,
      },
    ],
  });

  assert.equal(firestore.data.organizers["club-1"].memberCount, 2);
  assert.equal(firestore.data.organizers["club-2"].memberCount, 7);
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
  verifyRecomputeCli(t, new URL("./recompute_organizer_member_counts.mjs", import.meta.url), {organizers: {organizer: {memberCount: 7}}, organizerMemberships: {}});
});
