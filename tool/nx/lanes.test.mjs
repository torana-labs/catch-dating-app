import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {laneForTask, queueOnlyLanes, selectNxLanes} from "./lanes.mjs";
import {compare} from "./shadow_plan.mjs";

const select = (input) => {
  const {lanes, unmappedTasks} = selectNxLanes(input);
  return {lanes: [...lanes].sort(), unmappedTasks};
};

test("Nx is asked for the affected tasks without their dependencies", () => {
  // A website-only change must not run Admin because the website build needs @catch/web-ui:build.
  assert.match(fs.readFileSync(new URL("./lanes.mjs", import.meta.url), "utf8"),
    /"nx", "affected", "-t", \.\.\.targets, [^\n]*"--excludeTaskDependencies"/u);
});

test("each Nx task selects its lane, and a task with no lane is reported", () => {
  assert.deepEqual(select({nxTasks: ["@catch/catch-admin:test", "lane-docs:lane", "mystery:build", "catch_kernel:test"],
    tagsByProject: {catch_kernel: ["lang:dart"]}, mode: "merge_group", changedFiles: ["lib/main.dart"]}),
  {lanes: ["admin", "capture_freshness", "docs", "flutter"], unmappedTasks: ["mystery:build"]});
  assert.equal(laneForTask("lane-build-ios:lane"), "flutter_build_ios");
  assert.equal(laneForTask("mystery:build"), null);
});

test("app render inputs select capture freshness in the merge queue only", () => {
  for (const mode of ["pr", "main"]) {
    assert.deepEqual(select({nxTasks: [], mode, changedFiles: ["lib/main.dart"]}).lanes, [], mode);
  }
  assert.deepEqual(select({nxTasks: [], mode: "merge_group", changedFiles: ["lib/main.dart"]}).lanes, ["capture_freshness"]);
  assert.deepEqual(select({nxTasks: [], mode: "merge_group", changedFiles: ["lib/README.md"]}).lanes, []);
});

test("the queue builds iOS only for a native or build input, and pull requests leave the slow lanes to the queue", () => {
  const ios = ["lane-build-ios:lane"];
  assert.deepEqual(select({nxTasks: ios, mode: "merge_group", changedFiles: ["functions/src/index.ts"]}).lanes, []);
  assert.deepEqual(select({nxTasks: ios, mode: "merge_group", changedFiles: ["apps/consumer/ios/Podfile"]}).lanes,
    ["flutter_build_ios"]);
  // An unknown file list keeps it.
  assert.deepEqual(select({nxTasks: ios, mode: "merge_group", changedFiles: []}).lanes, ["flutter_build_ios"]);
  const slow = ["lane-build-android:lane", "lane-build-ios:lane", "lane-build-web:lane", "lane-web-smoke:lane", "lane-visual:lane"];
  assert.deepEqual(select({nxTasks: slow, mode: "pr", changedFiles: ["functions/src/index.ts"]}).lanes, []);
  assert.deepEqual(select({nxTasks: slow, mode: "main", changedFiles: ["functions/src/index.ts"]}).lanes, [...queueOnlyLanes].sort());
});

test("the planner comparison reports exactly the lanes selectNxLanes chose", () => {
  const input = {nxTasks: ["@catch/catch-admin:test", "lane-build-ios:lane", "mystery:build"], mode: "merge_group",
    changedFiles: ["lib/main.dart", "admin/src/App.tsx"]};
  const chosen = select(input);
  const result = compare({...input, plannerLanes: ["admin", "flutter"]});
  assert.deepEqual(result.nxLanes, chosen.lanes);
  assert.deepEqual(result.unmappedTasks, chosen.unmappedTasks);
});
