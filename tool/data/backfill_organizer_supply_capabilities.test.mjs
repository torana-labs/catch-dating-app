import assert from "node:assert/strict";
import test from "node:test";
import {
  applyOrganizerSupplyCapabilityRepairPlan,
  buildOrganizerSupplyCapabilityRepairPlan,
  organizerSupplyCapabilitiesForEntity,
  supplyCapabilityPatchForEntity,
} from "./backfill_organizer_supply_capabilities.mjs";

test("capability policy derives unclaimed and managed ceilings", () => {
  assert.deepEqual(organizerSupplyCapabilitiesForEntity({
    ownership: {state: "programmatic"},
    claim: {state: "unclaimed"},
  }), {
    mode: "unclaimed_read_only",
    bookable: false,
    paymentsEnabled: false,
    waitlistEnabled: false,
    hostContactEnabled: false,
    claimable: true,
    reviewPolicy: "after_event_end",
  });
  assert.equal(organizerSupplyCapabilitiesForEntity({
    ownership: {state: "userCreated"},
    claim: {state: "claimed"},
  }).bookable, true);
});

test("missing capabilities repair while stale broadening is invalid", () => {
  const entity = {
    ownership: {state: "programmatic"},
    claim: {state: "unclaimed"},
  };
  assert.equal(supplyCapabilityPatchForEntity(entity).status, "repair");
  assert.equal(supplyCapabilityPatchForEntity({
    ...entity,
    supplyCapabilities: {
      ...organizerSupplyCapabilitiesForEntity(entity),
      bookable: true,
    },
  }).status, "invalid");
});

test("repair plan covers both projections and audits external events",
  async () => {
    const firestore = fakeFirestore({
      organizers: {
        afterfly: {
          ownership: {state: "programmatic"},
          claim: {state: "unclaimed"},
        },
      },
      organizers: {
        managed: {
          ownership: {state: "userCreated"},
          claim: {state: "claimed"},
        },
      },
      externalEvents: {},
    });
    const plan = await buildOrganizerSupplyCapabilityRepairPlan(firestore);

    assert.deepEqual(plan.summary, {
      scannedByCollection: {organizers: 1},
      externalEventsScanned: 0,
      repairsNeeded: 2,
      alreadyCurrent: 0,
      invalid: 0,
      invalidDocuments: [],
    });
    await applyOrganizerSupplyCapabilityRepairPlan(firestore, plan);
    assert.equal(
      firestore.data.organizers.afterfly.supplyCapabilities.bookable,
      false
    );
    assert.equal(
      firestore.data.organizers.managed.supplyCapabilities.bookable,
      true
    );
  });

function fakeFirestore(initial) {
  const data = structuredClone(initial);
  return {
    data,
    collection: (collectionName) => ({
      get: async () => ({
        size: Object.keys(data[collectionName]).length,
        docs: Object.entries(data[collectionName]).map(([id, value]) => ({
          id,
          ref: {path: `${collectionName}/${id}`},
          data: () => structuredClone(value),
        })),
      }),
    }),
    doc: (documentPath) => ({
      path: documentPath,
      update: (patch) => {
        const [collectionName, id] = documentPath.split("/");
        data[collectionName][id] = {
          ...data[collectionName][id],
          ...structuredClone(patch),
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
