import assert from "node:assert/strict";
import test from "node:test";
import {
  applyEventDiscoveryProjectionRepairPlan,
  buildEventDiscoveryProjectionRepairPlan,
} from "./backfill_event_discovery_fields.mjs";

test("buildEventDiscoveryProjectionRepairPlan projects event discovery fields", async () => {
  const firestore = fakeFirestore({
    organizers: {
      "club-1": {location: "Mumbai", locationMarketId: "in-mh-mumbai"},
    },
    events: {
      "event-1": {
        organizerId: "club-1",
        capacityLimit: 2,
        bookedCount: 1,
        eventFormat: {activityKind: "tempoRun"},
        discoveryCityName: "old-city",
        discoveryMarketId: "old-market",
        discoveryAvailability: "full",
      },
      "event-2": {
        organizerId: "club-1",
        capacityLimit: 4,
        bookedCount: 0,
        eventFormat: {activityKind: "socialRun"},
        discoveryCityName: "mumbai",
        discoveryMarketId: "in-mh-mumbai",
        discoveryActivityKind: "socialRun",
        discoveryGeoCell: null,
        discoveryHasOpenSpots: true,
        discoveryAvailability: "open",
        discoveryOpenCohorts: ["menInterestedInWomen"],
        discoveryWaitlistCohorts: [],
        discoveryInviteRequired: false,
        discoveryMembershipRequired: false,
        discoveryManualApprovalRequired: false,
        discoveryMinAge: 0,
        discoveryMaxAge: 99,
      },
    },
  });

  const plan = await buildEventDiscoveryProjectionRepairPlan(
    firestore,
    fakeProjection
  );

  assert.deepEqual(plan.summary.repairs, [
    {
      path: "events/event-1",
      eventId: "event-1",
      organizerId: "club-1",
      current: {
        discoveryCityName: "old-city",
        discoveryMarketId: "old-market",
        discoveryActivityKind: undefined,
        discoveryGeoCell: undefined,
        discoveryHasOpenSpots: undefined,
        discoveryAvailability: "full",
        discoveryOpenCohorts: undefined,
        discoveryWaitlistCohorts: undefined,
        discoveryInviteRequired: undefined,
        discoveryMembershipRequired: undefined,
        discoveryManualApprovalRequired: undefined,
        discoveryMinAge: undefined,
        discoveryMaxAge: undefined,
      },
      expected: {
        discoveryCityName: "mumbai",
        discoveryMarketId: "in-mh-mumbai",
        discoveryActivityKind: "tempoRun",
        discoveryGeoCell: null,
        discoveryHasOpenSpots: true,
        discoveryAvailability: "open",
        discoveryOpenCohorts: ["menInterestedInWomen"],
        discoveryWaitlistCohorts: [],
        discoveryInviteRequired: false,
        discoveryMembershipRequired: false,
        discoveryManualApprovalRequired: false,
        discoveryMinAge: 0,
        discoveryMaxAge: 99,
      },
    },
  ]);
  assert.deepEqual(plan.summary.warnings, []);
});

test("buildEventDiscoveryProjectionRepairPlan falls back to current city when club is missing", async () => {
  const firestore = fakeFirestore({
    organizers: {},
    events: {
      "event-1": {
        organizerId: "missing",
        capacityLimit: 1,
        bookedCount: 1,
        discoveryCityName: "mumbai",
        discoveryMarketId: "in-mh-mumbai",
      },
    },
  });

  const plan = await buildEventDiscoveryProjectionRepairPlan(
    firestore,
    fakeProjection
  );

  assert.equal(plan.summary.repairs[0].expected.discoveryCityName, "mumbai");
  assert.equal(plan.summary.repairs[0].expected.discoveryMarketId, "in-mh-mumbai");
  assert.deepEqual(plan.summary.warnings, [
    "events/event-1 references missing clubs/missing; " +
      "using existing discovery market fallback.",
  ]);
});

test("applyEventDiscoveryProjectionRepairPlan writes planned projection patches", async () => {
  const firestore = fakeFirestore({
    organizers: {},
    events: {
      "event-1": {organizerId: "club-1", discoveryAvailability: "full"},
      "event-2": {organizerId: "club-2", discoveryAvailability: "open"},
    },
  });

  await applyEventDiscoveryProjectionRepairPlan(firestore, {
    repairs: [
      {
        path: "events/event-1",
        expected: {
          discoveryCityName: "mumbai",
          discoveryMarketId: "in-mh-mumbai",
          discoveryAvailability: "open",
        },
      },
    ],
  });

  assert.deepEqual(firestore.data.events["event-1"], {
    organizerId: "club-1",
    discoveryCityName: "mumbai",
    discoveryMarketId: "in-mh-mumbai",
    discoveryAvailability: "open",
  });
  assert.deepEqual(firestore.data.events["event-2"], {
    organizerId: "club-2",
    discoveryAvailability: "open",
  });
});

function fakeProjection({event, organizerLocation, organizerLocationMarketId}) {
  const bookedCount = event.bookedCount ?? 0;
  const capacityLimit = event.capacityLimit ?? 0;
  return {
    discoveryCityName: organizerLocation?.trim().toLowerCase() ?? null,
    discoveryMarketId: organizerLocationMarketId ?? null,
    discoveryActivityKind: event.eventFormat?.activityKind ?? "socialRun",
    discoveryGeoCell: null,
    discoveryHasOpenSpots: event.status !== "cancelled" &&
      bookedCount < capacityLimit,
    discoveryAvailability: event.status === "cancelled" ?
      "cancelled" :
      bookedCount < capacityLimit ?
        "open" :
        "full",
    discoveryOpenCohorts: bookedCount < capacityLimit ?
      ["menInterestedInWomen"] :
      [],
    discoveryWaitlistCohorts: [],
    discoveryInviteRequired: false,
    discoveryMembershipRequired: false,
    discoveryManualApprovalRequired: false,
    discoveryMinAge: event.constraints?.minAge ?? 0,
    discoveryMaxAge: event.constraints?.maxAge ?? 99,
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
