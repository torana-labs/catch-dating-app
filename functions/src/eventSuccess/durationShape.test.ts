import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultDurationShapeFor,
  eventSuccessPrimitivesFor,
} from "./formatPrimitives";

test("duration shape defaults cover the reviewed format vocabulary", () => {
  assert.equal(defaultDurationShapeFor("pacePods"), "segments");
  assert.equal(defaultDurationShapeFor("pairedRotations"), "rounds");
  assert.equal(defaultDurationShapeFor("teamRotations"), "rounds");
  assert.equal(defaultDurationShapeFor("seatedTable"), "courses");
  assert.equal(defaultDurationShapeFor("freeFormMixer"), "rounds");
  assert.equal(defaultDurationShapeFor("routeStops"), "stops");
  assert.equal(defaultDurationShapeFor("hostLedProgram"), "continuous");
  assert.equal(defaultDurationShapeFor("openFormat"), "continuous");
});

test("saved duration shape overrides the interaction default", () => {
  const resolved = eventSuccessPrimitivesFor({
    version: 1,
    activityKind: "openActivity",
    interactionModel: "openFormat",
    eventSuccessPrimitives: {durationShape: "courses"},
  });

  assert.equal(resolved.durationShape, "courses");
});
