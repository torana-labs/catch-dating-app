import assert from "node:assert/strict";
import test from "node:test";
import {
  applyEventAdminSearchRepairPlan,
  buildEventAdminSearchRepairPlan,
  pickEventAdminSearchComparable,
} from "./backfill_event_admin_search.mjs";

test("buildEventAdminSearchRepairPlan detects missing and stale search", async () => {
  const firestore = fakeFirestore({
    organizers: {
      "club-1": {
        name: "AFTER FLY",
        location: "in-mp-indore",
        locationMarketId: "in-mp-indore",
      },
    },
    events: {
      "event-1": {
        organizerId: "club-1",
        eventFormat: {activityKind: "socialRun"},
      },
      "event-2": {
        organizerId: "club-1",
        eventFormat: {activityKind: "socialRun"},
        adminSearch: {
          tokens: ["event", "2", "after", "fly", "indore", "socialrun"],
          sortKey: "event",
          updatedAt: "OLDER_TIMESTAMP",
          updatedBySource: "adminUpdateEventDetails",
        },
      },
      "event-3": {
        organizerId: "club-1",
        eventFormat: {activityKind: "yoga"},
        adminSearch: {
          tokens: ["stale"],
          sortKey: "stale",
        },
      },
    },
  });

  const plan = await buildEventAdminSearchRepairPlan(
    firestore,
    fakeEventAdminSearchProjection,
    {serverTimestamp: "SERVER_TIMESTAMP"}
  );

  assert.equal(plan.summary.eventsScanned, 3);
  assert.equal(plan.summary.organizersScanned, 1);
  assert.equal(plan.summary.repairsNeeded, 3);
  assert.equal(plan.summary.missingSearch, 1);
  assert.equal(plan.summary.staleSearch, 2);
  assert.deepEqual(plan.summary.warnings, []);
  assert.deepEqual(plan.summary.repairs.map((repair) => repair.eventId), [
    "event-1",
    "event-2",
    "event-3",
  ]);
  assert.equal(plan.repairs[0].patch.adminSearch.updatedAt, "SERVER_TIMESTAMP");
});

test("buildEventAdminSearchRepairPlan warns when event club is missing", async () => {
  const firestore = fakeFirestore({
    organizers: {},
    events: {
      "event-1": {
        organizerId: "missing",
        eventFormat: {activityKind: "socialRun"},
      },
    },
  });

  const plan = await buildEventAdminSearchRepairPlan(
    firestore,
    fakeEventAdminSearchProjection
  );

  assert.deepEqual(plan.summary.warnings, [
    "events/event-1 references missing clubs/missing.",
  ]);
  assert.equal(plan.summary.repairsNeeded, 1);
});

test("applyEventAdminSearchRepairPlan writes planned adminSearch patches", async () => {
  const firestore = fakeFirestore({
    organizers: {},
    events: {
      "event-1": {organizerId: "club-1", description: "Keep me"},
      "event-2": {organizerId: "club-2"},
    },
  });

  await applyEventAdminSearchRepairPlan(firestore, {
    repairs: [
      {
        path: "events/event-1",
        patch: {
          adminSearch: {
            tokens: ["event-1", "run"],
            sortKey: "event",
            updatedAt: "SERVER_TIMESTAMP",
            updatedBySource: "adminEventSearchBackfill",
          },
        },
      },
    ],
  });

  assert.deepEqual(firestore.data.events["event-1"], {
    organizerId: "club-1",
    description: "Keep me",
    adminSearch: {
      tokens: ["event-1", "run"],
      sortKey: "event",
      updatedAt: "SERVER_TIMESTAMP",
      updatedBySource: "adminEventSearchBackfill",
    },
  });
  assert.deepEqual(firestore.data.events["event-2"], {organizerId: "club-2"});
});

test("pickEventAdminSearchComparable ignores non-search metadata", () => {
  assert.deepEqual(
    pickEventAdminSearchComparable({
      tokens: ["event", 12, "run"],
      sortKey: "event",
      updatedAt: "IGNORED",
      updatedBySource: "adminUpdateEventDetails",
    }),
    {tokens: ["event", "run"], sortKey: "event"}
  );
});

function fakeEventAdminSearchProjection(
  eventId,
  event,
  organizer,
  updatedAt,
  updatedBySource
) {
  const tokens = [
    eventId,
    organizer?.name,
    organizer?.location,
    event.eventFormat?.activityKind,
  ]
    .filter((value) => typeof value === "string" && value.trim())
    .flatMap((value) => value.toLowerCase().split(/[^a-z0-9]+/u))
    .filter(Boolean);
  return {
    tokens,
    sortKey: tokens[0] ?? null,
    updatedAt,
    updatedBySource,
  };
}

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
