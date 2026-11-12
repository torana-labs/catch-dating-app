import assert from "node:assert/strict";
import test from "node:test";
import {applyLanes, nxChooses, unionLanes} from "./select_lanes.mjs";

const plan = {mode: "merge_group", full: false,
  operations: {ciTargets: ["flutter", "flutter_build_ios", "tools"],
    buildTargets: ["consumer-ios", "host-ios", "consumer-web-smoke"]}};

test("the plan runs the lanes Nx selected and remembers the planner's", () => {
  const next = applyLanes(plan, ["tools"]);
  assert.deepEqual(next.operations.ciTargets, ["tools"]);
  assert.deepEqual(next.plannerCiTargets, ["flutter", "flutter_build_ios", "tools"]);
});

test("app builds keep only the platforms still selected", () => {
  assert.deepEqual(applyLanes(plan, ["flutter_build_ios"]).operations.buildTargets, ["consumer-ios", "host-ios"]);
  assert.deepEqual(applyLanes(plan, ["flutter_web_smoke"]).operations.buildTargets, ["consumer-web-smoke"]);
  assert.deepEqual(applyLanes(plan, ["flutter"]).operations.buildTargets, []);
});

test("nightly, full and main runs keep the planner's selection", () => {
  assert.equal(nxChooses({mode: "pr"}), true);
  assert.equal(nxChooses({mode: "merge_group"}), true);
  assert.equal(nxChooses({mode: "main"}), false);
  assert.equal(nxChooses({mode: "nightly", full: true}), false);
  assert.equal(nxChooses({mode: "pr", commitWindow: true}), false);
});

// Run 43244338235 (12 Nov 2026): Nx missed nine lanes the planner selected,
// and the PR never ran them.
test("Nx can add lanes but never drop one the planner selected", () => {
  assert.deepEqual(unionLanes(plan, ["tools"]),
    {selected: ["flutter", "flutter_build_ios", "tools"], restored: ["flutter", "flutter_build_ios"]});
  assert.deepEqual(unionLanes(plan, ["admin", "flutter", "flutter_build_ios", "tools"]),
    {selected: ["admin", "flutter", "flutter_build_ios", "tools"], restored: []});
  assert.deepEqual(unionLanes({operations: {ciTargets: ["not_a_lane"]}}, ["unknown", "docs"]),
    {selected: ["docs"], restored: []}, "only CI lanes count");
  assert.deepEqual(unionLanes({operations: {}}, []), {selected: [], restored: []});
});
