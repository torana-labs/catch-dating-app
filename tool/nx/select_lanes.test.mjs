import assert from "node:assert/strict";
import {execFileSync, spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

import {projectPlanOutputs} from "../harness.mjs";
import {planAffected, queueOnlyCiTargets} from "../harness/lib/component_graph.mjs";
import {planAffectedToolChecks, toolsOwnDesignChecks, toolsOwnUiLintSmoke} from "../lib/tool_impact.mjs";
import {comparedLanes} from "./shadow_plan.mjs";
import {appRolesOf, applyLanes, chooseLanes, everyLane, mainBuildLanes, nativeBuildInput, nativeBuildLanes, nxChooses,
  nxSelectsAlone, plannerShadow, selectAlone, unionLanes} from "./select_lanes.mjs";
import {loadToolsManifest, toolsManifestPath} from "../lib/tools_manifest.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(repoRoot, file), "utf8"));
const componentGraph = readJson("tool/harness/component_graph.json");
const manifest = loadToolsManifest();

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

test("nightly and full runs keep the planner's selection; main chooses through Nx unless the queue validated it", () => {
  assert.equal(nxChooses({mode: "pr"}), true);
  assert.equal(nxChooses({mode: "merge_group"}), true);
  // Every main push plans a commit window.
  assert.equal(nxChooses({mode: "main", commitWindow: true}), true);
  assert.equal(nxChooses({mode: "main", commitWindow: true}, {queueVerified: true}), false);
  assert.equal(nxChooses({mode: "main", full: true}), false);
  assert.equal(nxChooses({mode: "nightly", full: true}), false);
  assert.equal(nxChooses({mode: "nightly"}), false);
  assert.equal(nxChooses({mode: "pr", commitWindow: true}), false);
});

// Owner decision A2 (22 Nov 2026): on main the native app builds run only
// for a native build input; a Dart-only change relies on the queue's web
// smoke and the nightly full builds.
test("a Dart-only change builds no app on main", () => {
  const nx = ["flutter", "flutter_build_android", "flutter_build_web", "flutter_web_smoke", "tools"];
  for (const changedFiles of [["lib/main.dart"], ["packages/catch_ui/lib/src/a.dart", "apps/host/lib/main.dart"],
    ["apps/consumer/lib/app.dart", "test/a_test.dart"]]) {
    assert.deepEqual(mainBuildLanes({lanes: nx, changedFiles}), ["flutter", "tools"], changedFiles.join(" "));
  }
});

test("each native build input class builds every native app on main", () => {
  for (const file of ["apps/consumer/android/app/build.gradle.kts", "apps/host/ios/Runner/AppDelegate.swift",
    "apps/consumer/android/app/src/main/kotlin/com/example/MainActivity.kt", "apps/consumer/macos/Runner/Info.plist",
    "pubspec.yaml", "pubspec.lock", "packages/catch_ui/pubspec.yaml", "apps/host/pubspec.lock",
    "apps/consumer/android/gradle.properties", "apps/consumer/android/gradle/wrapper/gradle-wrapper.properties",
    "apps/consumer/ios/Podfile", "apps/host/ios/Podfile.lock",
    "apps/consumer/ios/Runner.xcodeproj/project.pbxproj", "apps/consumer/ios/Runner.xcworkspace/contents.xcworkspacedata",
    "packages/example_plugin/android/src/main/java/Plugin.java", "packages/example_plugin/ios/Classes/Plugin.m",
    "firebase/dev/ios/GoogleService-Info.plist"]) {
    assert.equal(nativeBuildInput(file), true, file);
    assert.deepEqual(mainBuildLanes({lanes: ["flutter"], changedFiles: ["lib/main.dart", file]}),
      ["flutter", ...nativeBuildLanes].sort(), file);
  }
  for (const file of ["lib/main.dart", "apps/host/ios/README.md", "packages/catch_ui/lib/a.dart", "assets/a.png"]) {
    assert.equal(nativeBuildInput(file), false, file);
  }
});

test("a build lane the CI caller graph selects still runs on main", () => {
  // app-build-matrix.yml, a script it runs, or a selector reaches the build lanes themselves.
  assert.deepEqual(mainBuildLanes({lanes: ["flutter_build_ios", "flutter_web_smoke", "tools"],
    changedFiles: [".github/workflows/app-build-matrix.yml"],
    workflowSelected: new Set(["flutter_build_ios", "flutter_web_smoke"])}),
  ["flutter_build_ios", "flutter_web_smoke", "tools"]);
});

test("nightly and full runs still build every app", () => {
  for (const plan of [{mode: "nightly", full: true}, {mode: "nightly"}, {mode: "main", full: true, commitWindow: true}]) {
    assert.equal(nxChooses(plan), false, JSON.stringify(plan));
  }
  const full = planAffected({changedPaths: [], graph: componentGraph, mode: "nightly", full: true});
  for (const lane of [...nativeBuildLanes, "flutter_web_smoke"]) assert.ok(full.operations.ciTargets.includes(lane), lane);
});

test("pull requests and queue groups run Nx's lanes alone; emptying nxSelectsAlone restores the union", () => {
  assert.deepEqual(nxSelectsAlone, ["pr", "merge_group", "main"]);
  const result = {nxLanes: ["docs", "tools"], unmappedTasks: []};
  assert.deepEqual(chooseLanes({mode: "pr", alone: true, plannerLanes: ["flutter", "tools"], result}),
    {lanes: ["docs", "tools"], selection: "nx", warning: null});
  // The kill switch: the planner's lanes come back.
  assert.deepEqual(chooseLanes({mode: "pr", alone: false, plannerLanes: ["flutter", "tools"], result}).lanes,
    ["docs", "flutter", "tools"]);
  assert.equal(chooseLanes({mode: "pr", alone: false, plannerLanes: ["flutter"], result: null, nxError: "boom"}).selection,
    "planner");
});

test("when Nx cannot answer completely, every lane runs", () => {
  const prEvery = comparedLanes.filter((lane) => !queueOnlyCiTargets.includes(lane));
  for (const failure of [{failure: "the history could not be read"}, {failure: "nx exited 1"},
    {unmappedTasks: ["new-project:test"]}, {unknownPaths: ["newdir/a.txt"]}]) {
    const pr = selectAlone({mode: "pr", nxSelected: ["docs"], ...failure});
    assert.deepEqual(pr.lanes, prEvery, JSON.stringify(failure));
    assert.ok(pr.reason, JSON.stringify(failure));
    assert.deepEqual(selectAlone({mode: "merge_group", nxSelected: ["docs"], ...failure}).lanes, [...comparedLanes]);
  }
  assert.deepEqual(everyLane("pr"), prEvery);
  const decided = chooseLanes({mode: "merge_group", alone: true, plannerLanes: [], result: null, nxError: "nx exited 1"});
  assert.equal(decided.selection, "every-lane");
  assert.match(decided.warning, /Every lane runs: Nx could not choose lanes: nx exited 1/u);
  // Pull requests still leave the queue-only lanes to the queue, even when Nx names one.
  assert.deepEqual(selectAlone({mode: "pr", nxSelected: ["docs", "flutter_build_ios"]}).lanes, ["docs"]);
});

test("the planner's extra lanes are a shadow line, counted when no rule explains them", () => {
  const shadow = plannerShadow({plannerOnly: ["contracts", "flutter"],
    explained: [{lane: "contracts", side: "planner", rule: "planner-functions-implies-contracts"},
      {lane: "docs", side: "nx", rule: "docs-reads-every-markdown"}]});
  assert.deepEqual(shadow, {lanes: [{lane: "contracts", rule: "planner-functions-implies-contracts"},
    {lane: "flutter", rule: "UNEXPLAINED"}], unexplained: 1});
});

// Every lane Nx selects gets complete inputs (release engineering, 15 Nov):
// under the union, a lane only Nx selected could get an output the planner
// narrowed for the lanes it chose. Each case is a lane Nx selects and the
// planner does not.
test("a build lane only Nx selects builds both apps, not nothing", () => {
  const nxOnlyWeb = applyLanes({mode: "pr", operations: {ciTargets: ["flutter"], buildTargets: []}}, ["flutter_build_web"]);
  assert.deepEqual(nxOnlyWeb.operations.buildTargets, ["consumer-web", "host-web"]);
  assert.deepEqual(appRolesOf(nxOnlyWeb), ["consumer", "host"]);
  // The planner's own narrower targets stand for the platforms it selected.
  const mixed = applyLanes({mode: "merge_group", operations: {ciTargets: ["flutter_build_android"],
    buildTargets: ["consumer-android"]}}, ["flutter_build_android", "flutter_build_ios"]);
  assert.deepEqual(mixed.operations.buildTargets, ["consumer-android", "consumer-ios", "host-ios"]);
  assert.deepEqual(appRolesOf(mixed), ["consumer", "host"]);
});

test("a Tools lane only Nx selects plans the checks that read the change", () => {
  // Documents and data nx.json gives lane-tools, which the planner keeps out
  // of Tools, with a check that reads each.
  const cases = {
    "docs/app_architecture.md": "audit:context-map",
    "docs/widget_catalog.md": "docs:metadata",
    "firestore.indexes.json": "contracts:firestore-query-indexes",
    // The generated Functions templates' freshness.
    "copy/notifications_en.json": "git:pre-commit-generated-artifacts",
  };
  for (const [file, reader] of Object.entries(cases)) {
    const plannerPlan = planAffected({changedPaths: [file], graph: componentGraph, mode: "pr"});
    assert.ok(!plannerPlan.operations.ciTargets.includes("tools"), `${file}: the planner gives it Tools`);
    const checks = planAffectedToolChecks({changedPaths: [file], manifest, componentGraph, mode: "pr"});
    assert.equal(checks.mode, "affected", file);
    assert.ok(checks.toolIds.includes(reader), `${file}: ${checks.toolIds.join(", ")}`);
    // The shared-check flags read the final lanes, which include Tools.
    const finalPlan = applyLanes(plannerPlan, [...plannerPlan.operations.ciTargets, "tools"]);
    assert.ok(finalPlan.operations.ciTargets.includes("tools"));
    assert.equal(typeof toolsOwnUiLintSmoke({plan: finalPlan, manifest, componentGraph}), "boolean");
    assert.equal(typeof toolsOwnDesignChecks({plan: finalPlan, manifest, componentGraph}).parity, "boolean");
  }
});

test("the docs checkout and generator preflight do not depend on the planner's lanes", () => {
  const plan = planAffected({changedPaths: ["functions/src/index.ts"], graph: componentGraph, mode: "pr"});
  const without = projectPlanOutputs({plan: {...plan, operations: {...plan.operations, ciTargets: []}}, graph: componentGraph});
  const withDocs = projectPlanOutputs({plan: {...plan, operations: {...plan.operations, ciTargets: ["docs", "functions"]}},
    graph: componentGraph});
  assert.equal(without.docs_checkout, withDocs.docs_checkout);
  assert.equal(without.preflight_functions_dependencies, withDocs.preflight_functions_dependencies);
});

// Every other lane receives the change range and mode and plans its own work
// (Flutter tests, Functions tests, rules shards, affected-tools), so it cannot
// inherit a planner narrowing. Planner-derived outputs a lane job may read
// are listed with the test that pins them above.
test("lane jobs read only the change range, the final lanes, and outputs pinned for Nx-only lanes", () => {
  // Every job but the plan job itself (top-level job keys sit at two spaces).
  const text = fs.readFileSync(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8");
  const jobs = text.slice(text.indexOf("\njobs:\n")).split(/\n(?=  [a-z][a-z0-9_-]*:\n)/u)
    .filter((block) => !block.startsWith("  plan:\n") && !block.startsWith("\njobs:"));
  assert.ok(jobs.length > 10, "the job split found the lane jobs");
  const pinned = new Set(["app_roles", "tools_owns_ui_lint_smoke", "tools_owns_design_parity", "docs_checkout",
    "preflight_functions_dependencies"]);
  // The change range, and what the merge queue proved for this exact source:
  // main_goldens and main_captures are read from the queue run's own Nx plan,
  // not the planner.
  const range = new Set(["base_sha", "source_sha", "producer_attempt", "mode", "full", "commit_window", "queue_verified_run",
    "main_goldens", "main_captures"]);
  const used = new Set();
  for (const job of jobs) {
    for (const match of job.matchAll(/needs\.plan\.outputs\.([a-z_]+)/gu)) used.add(match[1]);
  }
  assert.ok(used.has("app_roles") && used.has("flutter"), "the scan reads lane job conditions and inputs");
  const other = [...used].filter((output) => !pinned.has(output) && !range.has(output) && !comparedLanes.includes(output));
  assert.deepEqual(other, [], "a new planner-derived output needs a test that an Nx-only lane gets it complete");
});

// A main push the merge queue validated runs no lane: its plan job keeps the
// sparse planner checkout (no node_modules) and select_lanes returns before
// Nx. Run it from exactly that sparse checkout.
function sparsePlannerCheckout(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "select-lanes-main-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const entry of componentGraph.ciCheckout.planner.paths) {
    const file = entry.replace(/^\//u, "");
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.cpSync(path.join(repoRoot, file), path.join(root, file), {recursive: true});
  }
  execFileSync("git", ["init", "-q"], {cwd: root});
  execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "base"], {cwd: root});
  fs.appendFileSync(path.join(root, toolsManifestPath), "\n");
  execFileSync("git", ["add", "-A"], {cwd: root});
  execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "head"], {cwd: root});
  const plan = {mode: "main", full: false, commitWindow: true,
    operations: {ciTargets: ["flutter_build_ios", "tools"], buildTargets: ["consumer-ios", "host-ios"]}};
  fs.writeFileSync(path.join(root, "plan.json"), JSON.stringify(plan));
  fs.writeFileSync(path.join(root, "out"), "");
  const select = (flags) => spawnSync(process.execPath, ["tool/nx/select_lanes.mjs", "--plan", "plan.json", "--base", "HEAD~1",
    "--head", "HEAD", ...flags, "--github-output", "out"], {cwd: root, encoding: "utf8", env: {...process.env, NODE_PATH: ""}});
  return {root, plan, select};
}

test("a queue-verified main push plans from the sparse planner checkout without Nx or node_modules", (t) => {
  const {root, plan, select} = sparsePlannerCheckout(t);
  const result = select(["--queue-verified", "44947336445"]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "plan.json"), "utf8")), plan, "the planner's plan stands");
  assert.equal(fs.readFileSync(path.join(root, "out"), "utf8"), "", "it writes no lane outputs");
  assert.equal(fs.existsSync(path.join(root, "node_modules")), false);
});

// A main push the queue did not validate has the whole tree and node_modules.
// When Nx itself fails there (an npx that exits 1), every lane runs.
test("a main push Nx cannot answer for runs every lane", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "select-lanes-main-nx-"));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  fs.mkdirSync(path.join(dir, "bin"));
  fs.writeFileSync(path.join(dir, "bin", "npx"), "#!/bin/sh\nexit 1\n", {mode: 0o755});
  const planFile = path.join(dir, "plan.json");
  const out = path.join(dir, "out");
  fs.writeFileSync(planFile, JSON.stringify({mode: "main", full: false, commitWindow: true,
    operations: {ciTargets: ["tools"], buildTargets: []}}));
  fs.writeFileSync(out, "");
  const result = spawnSync(process.execPath, ["tool/nx/select_lanes.mjs", "--plan", planFile, "--base", "HEAD~1",
    "--head", "HEAD", "--github-output", out], {cwd: repoRoot, encoding: "utf8",
    env: {...process.env, PATH: `${path.join(dir, "bin")}${path.delimiter}${process.env.PATH}`}});
  assert.equal(result.status, 0, result.stderr);
  const outputs = Object.fromEntries(fs.readFileSync(out, "utf8").trim().split("\n")
    .map((line) => line.split(/=(.*)/u).slice(0, 2)));
  assert.equal(outputs.lane_selection, "every-lane");
  for (const lane of comparedLanes) assert.equal(outputs[lane], "true", lane);
  assert.match(result.stdout, /Every lane runs: Nx could not choose lanes/u);
});

// Run 43244338235 (12 Nov 2026): Nx missed nine lanes the planner selected,
// and the PR never ran them. The union still applies behind the kill switch.
test("Nx can add lanes but never drop one the planner selected", () => {
  assert.deepEqual(unionLanes(plan, ["tools"]),
    {selected: ["flutter", "flutter_build_ios", "tools"], restored: ["flutter", "flutter_build_ios"]});
  assert.deepEqual(unionLanes(plan, ["admin", "flutter", "flutter_build_ios", "tools"]),
    {selected: ["admin", "flutter", "flutter_build_ios", "tools"], restored: []});
  assert.deepEqual(unionLanes({operations: {ciTargets: ["not_a_lane"]}}, ["unknown", "docs"]),
    {selected: ["docs"], restored: []}, "only CI lanes count");
  assert.deepEqual(unionLanes({operations: {}}, []), {selected: [], restored: []});
});
