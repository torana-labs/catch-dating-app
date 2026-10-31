import assert from "node:assert/strict";
import test from "node:test";
import {
  applyLocationMarketBackfillPlan,
  buildLocationMarketBackfillPlan,
} from "./backfill_location_market_fields.mjs";

test("buildLocationMarketBackfillPlan repairs canonical market fields", async () => {
  const firestore = fakeFirestore({
    config: {
      cities: {version: 1, cityNames: ["mumbai"]},
    },
    organizers: {
      "club-1": {
        location: "mumbai",
        publicPage: {citySlug: "mumbai"},
      },
      "club-2": {
        location: "nowhere",
      },
    },
    users: {
      "user-1": {city: "indore"},
      "user-2": {city: "in-mh-mumbai"},
    },
    publicProfiles: {
      "user-1": {city: "indore"},
      "user-3": {city: "unknown"},
    },
  });

  const plan = await buildLocationMarketBackfillPlan(firestore);

  const organizerRepair = plan.repairs.find((repair) =>
    repair.path === "clubs/club-1"
  );
  assert.deepEqual(organizerRepair.data, {
    location: "in-mh-mumbai",
    locationCityId: "in-mh-mumbai",
    locationMarketId: "in-mh-mumbai",
    cityName: "Mumbai",
    regionName: "Maharashtra",
    countryCode: "IN",
    countryName: "India",
  });
  assert(plan.repairs.some((repair) => repair.path === "config/cities"));
  assert(plan.repairs.some((repair) =>
    repair.path === "users/user-1" &&
    repair.data.city === "in-mp-indore"
  ));
  assert(plan.repairs.some((repair) =>
    repair.path === "publicProfiles/user-1" &&
    repair.data.city === "in-mp-indore"
  ));
  assert.deepEqual(plan.summary.warnings, [
    "clubs/club-2 has no resolvable location market.",
    "publicProfiles/user-3: unresolvable city \"unknown\"",
  ]);
});

test("applyLocationMarketBackfillPlan writes set and update repairs", async () => {
  const firestore = fakeFirestore({
    config: {},
    organizers: {"club-1": {location: "mumbai"}},
    users: {},
    publicProfiles: {},
  });

  await applyLocationMarketBackfillPlan(firestore, {
    repairs: [
      {path: "config/cities", op: "set", data: {version: 2}},
      {
        path: "clubs/club-1",
        op: "update",
        data: {
          location: "in-mh-mumbai",
          "publicPage.citySlug": "mumbai",
        },
      },
    ],
  });

  assert.deepEqual(firestore.data.config.cities, {version: 2});
  assert.deepEqual(firestore.data.organizers["club-1"], {
    location: "in-mh-mumbai",
    publicPage: {citySlug: "mumbai"},
  });
});

test("buildLocationMarketBackfillPlan can scope repairs to clubs", async () => {
  const firestore = fakeFirestore({
    config: {cities: {version: 1}},
    organizers: {"club-1": {location: "indore"}},
    users: {"user-1": {city: "indore"}},
    publicProfiles: {"user-1": {city: "indore"}},
  });

  const plan = await buildLocationMarketBackfillPlan(firestore, {
    includeConfig: false,
    includeProfiles: false,
  });

  assert.deepEqual(plan.repairs.map((repair) => repair.path), ["clubs/club-1"]);
  assert.equal(plan.summary.configChecked, false);
  assert.equal(plan.summary.organizersScanned, 1);
  assert.equal(plan.summary.usersScanned, 0);
  assert.equal(plan.summary.publicProfilesScanned, 0);
});

function fakeFirestore(initialData) {
  const data = structuredClone(initialData);
  return {
    data,
    collection: (collectionName) => ({
      doc: (id) => ({
        path: `${collectionName}/${id}`,
        get: async () => {
          const value = data[collectionName]?.[id];
          return {
            exists: value !== undefined,
            data: () => value,
            ref: {path: `${collectionName}/${id}`},
          };
        },
      }),
      get: async () => ({
        size: Object.keys(data[collectionName] ?? {}).length,
        docs: Object.entries(data[collectionName] ?? {}).map(([id, value]) =>
          docSnapshot(collectionName, id, value)
        ),
      }),
    }),
    doc: (path) => ({path}),
    batch: () => {
      const ops = [];
      return {
        set: (ref, value) => ops.push({kind: "set", path: ref.path, value}),
        update: (ref, value) => ops.push({kind: "update", path: ref.path, value}),
        commit: async () => {
          for (const op of ops) {
            const [collectionName, id] = op.path.split("/");
            data[collectionName] ??= {};
            if (op.kind === "set") {
              data[collectionName][id] = structuredClone(op.value);
            } else {
              data[collectionName][id] ??= {};
              applyPatch(data[collectionName][id], op.value);
            }
          }
        },
      };
    },
  };
}

function docSnapshot(collectionName, id, value) {
  return {
    id,
    ref: {path: `${collectionName}/${id}`},
    data: () => value,
  };
}

function applyPatch(target, patch) {
  for (const [key, value] of Object.entries(patch)) {
    const segments = key.split(".");
    let cursor = target;
    for (const segment of segments.slice(0, -1)) {
      cursor[segment] ??= {};
      cursor = cursor[segment];
    }
    cursor[segments.at(-1)] = value;
  }
}
