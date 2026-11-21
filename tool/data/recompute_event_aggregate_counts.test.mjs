import assert from "node:assert/strict";
import test from "node:test";
import {verifyRecomputeCli} from "./lib/recompute_cli_test_support.mjs";
import {
  applyEventAggregateRepairPlan,
  buildEventAggregateRepairPlan,
} from "./recompute_event_aggregate_counts.mjs";

test("buildEventAggregateRepairPlan counts active event participation edges", async () => {
  const firestore = fakeFirestore({
    events: {
      "event-1": {bookedCount: 0, checkedInCount: 0, waitlistedCount: 0},
      "event-2": {bookedCount: 9, checkedInCount: 9, waitlistedCount: 9},
    },
    eventBookings: {
      "event-1_a": {
        eventId: "event-1",
        status: "signedUp",
        genderAtSignup: "man",
      },
      "event-1_b": {
        eventId: "event-1",
        status: "attended",
        genderAtSignup: "woman",
      },
      "event-1_c": {eventId: "event-1", status: "waitlisted"},
      "event-1_d": {eventId: "event-1", status: "cancelled"},
      "missing_a": {eventId: "missing", status: "signedUp"},
    },
  });

  const plan = await buildEventAggregateRepairPlan(firestore);

  assert.deepEqual(plan.summary.repairs, [
    {
      path: "events/event-1",
      eventId: "event-1",
      current: {
        bookedCount: 0,
        checkedInCount: 0,
        waitlistedCount: 0,
        genderCounts: {},
      },
      expected: {
        bookedCount: 2,
        checkedInCount: 1,
        waitlistedCount: 1,
        genderCounts: {man: 1, woman: 1},
      },
    },
    {
      path: "events/event-2",
      eventId: "event-2",
      current: {
        bookedCount: 9,
        checkedInCount: 9,
        waitlistedCount: 9,
        genderCounts: {},
      },
      expected: {
        bookedCount: 0,
        checkedInCount: 0,
        waitlistedCount: 0,
        genderCounts: {},
      },
    },
  ]);
  assert.deepEqual(plan.summary.warnings, [
    "eventBookings/missing_a references missing events/missing.",
  ]);
});

test("applyEventAggregateRepairPlan writes planned event aggregate repairs", async () => {
  const firestore = fakeFirestore({
    events: {
      "event-1": {bookedCount: 0, meetingPoint: "Park"},
      "event-2": {bookedCount: 7},
    },
    eventBookings: {},
  });

  await applyEventAggregateRepairPlan(firestore, {
    repairs: [
      {
        path: "events/event-1",
        expected: {
          bookedCount: 2,
          checkedInCount: 1,
          waitlistedCount: 0,
          genderCounts: {man: 2},
        },
      },
    ],
  });

  assert.deepEqual(firestore.data.events["event-1"], {
    bookedCount: 2,
    checkedInCount: 1,
    waitlistedCount: 0,
    genderCounts: {man: 2},
    meetingPoint: "Park",
  });
  assert.equal(firestore.data.events["event-2"].bookedCount, 7);
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
  verifyRecomputeCli(t, new URL("./recompute_event_aggregate_counts.mjs", import.meta.url), {events: {event: {bookedCount: 7, checkedInCount: 0, waitlistedCount: 0}}, eventBookings: {}});
});
