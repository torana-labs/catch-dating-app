import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPairRotationTopology,
  resolveAssignmentTopology,
  resolveSequenceConcurrentUnits,
  unitLabel,
  unitSubtitle,
} from "./assignmentTopology";
import {isHttpsError} from "../shared/testUtils";

test("resolves group topology from unit size and clamps group count", () => {
  const topology = resolveAssignmentTopology(
    {
      structureConfig: {
        unitKind: "tables",
        unitSize: 4,
        unitCount: 20,
        rotationIntervalMinutes: 30,
      },
    },
    8,
    {defaultUnitKind: "pods", defaultUnitSize: 5}
  );

  assert.equal(topology.unitKind, "tables");
  assert.equal(topology.unitSize, 4);
  assert.equal(topology.groupCount, 4);
  assert.equal(topology.maxGroupSize, 2);
  assert.equal(topology.rotationsEnabled, true);
  assert.equal(topology.rotationIntervalMinutes, 30);
  assert.equal(topology.topology, "set");
  assert.equal(topology.resourceCapacity, null);
});

test("uses one whole-group unit when requested", () => {
  const topology = resolveAssignmentTopology(
    {structureConfig: {unitKind: "wholeGroup", unitSize: 999}},
    12,
    {defaultUnitKind: "pods", defaultUnitSize: 5}
  );

  assert.equal(topology.unitKind, "wholeGroup");
  assert.equal(topology.unitSize, 12);
  assert.equal(topology.groupCount, 1);
  assert.equal(topology.maxGroupSize, 12);
  assert.equal(topology.rotationsEnabled, false);
});

test("derives unit labels and copy from unit kind", () => {
  assert.equal(unitLabel("teams", 1), "Team B");
  assert.equal(unitLabel("tables", 27), "Table B2");
  assert.equal(unitSubtitle("teams", 5), "5 people on this team.");
  assert.equal(unitSubtitle("tables", 4), "4 people at this table.");
});

test("pair rotation wrapper accepts doubles courts and refuses odd seats",
  () => {
    const courts = (seatsPerUnit: number) => ({
      structureConfig: {
        unitKind: "pairs" as const,
        unitSize: 2,
        resourceCapacity: {concurrentUnits: 3, resourceLabelId: "court" as const,
          seatsPerUnit},
      },
    });
    assert.doesNotThrow(() => assertPairRotationTopology(courts(4)));
    assert.doesNotThrow(() => assertPairRotationTopology(courts(2)));
    assert.throws(
      () => assertPairRotationTopology(courts(6)),
      (error) => {
        isHttpsError(error, "failed-precondition", "four (doubles)");
        return true;
      }
    );
  });

test("pair rotation wrapper accepts only two-person units", () => {
  assert.doesNotThrow(() =>
    assertPairRotationTopology({
      structureConfig: {unitKind: "pairs", unitSize: 2},
    })
  );
  assert.doesNotThrow(() =>
    assertPairRotationTopology({structureConfig: {unitKind: "pairs"}})
  );
  assert.throws(
    () =>
      assertPairRotationTopology({
        structureConfig: {unitKind: "tables", unitSize: 4},
      }),
    (error) => {
      isHttpsError(error, "failed-precondition", "two-person units");
      return true;
    }
  );
  assert.throws(
    () =>
      assertPairRotationTopology({
        structureConfig: {unitKind: "pairs", unitSize: 4},
      }),
    (error) => {
      isHttpsError(error, "failed-precondition", "two-person units");
      return true;
    }
  );
  assert.throws(
    () =>
      assertPairRotationTopology({
        structureConfig: {
          unitKind: "tables",
          unitSize: 4,
          topology: "adjacency",
        },
      }),
    (error) => {
      isHttpsError(error, "failed-precondition", "table seating");
      return true;
    }
  );
});

test("resolves configurable sequence capacity", () => {
  assert.equal(resolveSequenceConcurrentUnits({structureConfig: {}}, 12), 6);

  const topology = resolveAssignmentTopology(
    {
      structureConfig: {
        unitKind: "pairs",
        unitSize: 2,
        topology: "sequence",
        resourceCapacity: {
          concurrentUnits: 3,
          resourceLabelId: "court",
          seatsPerUnit: null,
        },
      },
    },
    12,
    {defaultUnitKind: "pairs", defaultUnitSize: 2}
  );

  assert.equal(topology.topology, "sequence");
  assert.deepEqual(topology.resourceCapacity, {
    concurrentUnits: 3,
    resourceLabelId: "court",
    seatsPerUnit: null,
  });
  assert.equal(resolveSequenceConcurrentUnits({
    structureConfig: {
      resourceCapacity: topology.resourceCapacity,
    },
  }, 12), 3);
  assert.equal(resolveSequenceConcurrentUnits({
    structureConfig: {
      resourceCapacity: topology.resourceCapacity,
    },
  }, 12, 2), 2);
});
