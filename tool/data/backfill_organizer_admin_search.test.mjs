import assert from "node:assert/strict";
import test from "node:test";
import {
  applyOrganizerAdminSearchRepairPlan,
  buildOrganizerAdminSearchRepairPlan,
  pickOrganizerAdminSearchComparable,
} from "./backfill_organizer_admin_search.mjs";

test("buildOrganizerAdminSearchRepairPlan detects missing and stale search",
  async () => {
    const firestore = fakeFirestore({
      organizers: {
        "club-1": {
          name: "AFTER FLY",
          location: "in-mp-indore",
          locationMarketId: "in-mp-indore",
          publicPage: {citySlug: "indore"},
        },
        "club-2": {
          name: "Bandra Social Run",
          location: "in-mh-mumbai",
          locationMarketId: "in-mh-mumbai",
          publicPage: {citySlug: "mumbai"},
          adminSearch: {
            tokens: [
              "club",
              "2",
              "bandra",
              "social",
              "run",
              "mumbai",
              "mumbai",
            ],
            sortKey: "club",
            updatedAt: "OLDER_TIMESTAMP",
            updatedBySource: "adminUpdateOrganizerDetails",
          },
        },
        "club-3": {
          name: "Stale Club",
          location: "in-mh-mumbai",
          locationMarketId: "in-mh-mumbai",
          adminSearch: {
            tokens: ["stale"],
            sortKey: "stale",
          },
        },
      },
    });

    const plan = await buildOrganizerAdminSearchRepairPlan(
      firestore,
      fakeOrganizerAdminSearchProjection,
      {serverTimestamp: "SERVER_TIMESTAMP"}
    );

    assert.equal(plan.summary.organizersScanned, 3);
    assert.equal(plan.summary.repairsNeeded, 3);
    assert.equal(plan.summary.missingSearch, 1);
    assert.equal(plan.summary.staleSearch, 2);
    assert.deepEqual(plan.summary.repairs.map((repair) => repair.organizerId), [
      "club-1",
      "club-2",
      "club-3",
    ]);
    assert.equal(
      plan.repairs[0].patch.adminSearch.updatedAt,
      "SERVER_TIMESTAMP"
    );
  }
);

test("applyOrganizerAdminSearchRepairPlan writes planned adminSearch patches",
  async () => {
    const firestore = fakeFirestore({
      organizers: {
        "club-1": {name: "AFTER FLY", description: "Keep me"},
        "club-2": {name: "Bandra Social Run"},
      },
    });

    await applyOrganizerAdminSearchRepairPlan(firestore, {
      repairs: [
        {
          path: "clubs/club-1",
          patch: {
            adminSearch: {
              tokens: ["after", "fly"],
              sortKey: "after",
              updatedAt: "SERVER_TIMESTAMP",
              updatedBySource: "adminOrganizerSearchBackfill",
            },
          },
        },
      ],
    });

    assert.deepEqual(firestore.data.organizers["club-1"], {
      name: "AFTER FLY",
      description: "Keep me",
      adminSearch: {
        tokens: ["after", "fly"],
        sortKey: "after",
        updatedAt: "SERVER_TIMESTAMP",
        updatedBySource: "adminOrganizerSearchBackfill",
      },
    });
    assert.deepEqual(firestore.data.organizers["club-2"], {
      name: "Bandra Social Run",
    });
  }
);

test("pickOrganizerAdminSearchComparable ignores non-search metadata", () => {
  assert.deepEqual(
    pickOrganizerAdminSearchComparable({
      tokens: ["organizer", 12, "run"],
      sortKey: "organizer",
      updatedAt: "IGNORED",
      updatedBySource: "adminUpdateOrganizerDetails",
    }),
    {tokens: ["organizer", "run"], sortKey: "organizer"}
  );
});

function fakeOrganizerAdminSearchProjection(
  organizerId,
  organizer,
  updatedAt,
  updatedBySource
) {
  const tokens = [
    organizerId,
    organizer.name,
    organizer.location,
    organizer.publicPage?.citySlug,
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
