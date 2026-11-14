import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {planAffected} from "../harness/lib/component_graph.mjs";
import {compare, comparedLanes, workflowLanes} from "./shadow_plan.mjs";
import {ALL, callerLanes, declaredTargets, isCiConfiguration, isSelector, selectorEntries, selectorFiles,
  workflowCallers} from "./workflow_callers.mjs";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const realGraph = workflowCallers({root: repoRoot, lanes: comparedLanes});
const plannerGraph = JSON.parse(fs.readFileSync(path.join(repoRoot, "tool/harness/component_graph.json"), "utf8"));

function fixtureRepo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-callers-"));
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), content);
  }
  execFileSync("git", ["init", "-q"], {cwd: root});
  execFileSync("git", ["add", "-A"], {cwd: root});
  return root;
}

const fixture = {
  ".github/workflows/ci.yml": `
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - run: node tool/harness.mjs plan
  build:
    if: \${{ needs.plan.outputs.build == 'true' }}
    uses: ./.github/workflows/build.yml
  web:
    if: \${{ needs.plan.outputs.web == 'true' && !needs.plan.outputs.queue_verified_run }}
    runs-on: ubuntu-latest
    steps:
      - uses: ./.github/actions/setup
      - run: npm --prefix site run check
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: bash tool/ci/lint.sh
`,
  ".github/workflows/build.yml": `
on: workflow_call
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: ./.github/actions/setup
      - run: bash "$ROOT/tool/ci/build.sh"
`,
  ".github/actions/setup/action.yml": `
runs:
  using: composite
  steps:
    - shell: bash
      run: node tool/ci/setup.mjs
`,
  "tool/ci/setup.mjs": `import {x} from "./lib.mjs";\nfs.readFileSync("tool/ci/config.json");\n`,
  "tool/ci/lib.mjs": "export const x = 1;\n",
  "tool/ci/config.json": "{}\n",
  "tool/ci/build.sh": "node tool/ci/only_build.mjs\n",
  "tool/ci/only_build.mjs": "\n",
  "tool/ci/lint.sh": "echo lint\n",
  "site/package.json": JSON.stringify({name: "site", scripts: {check: "node ../tool/ci/web_check.mjs"}}),
  "tool/ci/web_check.mjs": "\n",
  "tool/harness.mjs": `import {g} from "./harness/lib/graph.mjs";\n`,
  "tool/harness/lib/graph.mjs": `fs.readFileSync(new URL("../graph.json", import.meta.url));\n`,
  "tool/harness/graph.json": "{}\n",
  "tool/tools_manifest.json": JSON.stringify({tools: []}),
};
const lanesOf = (graph, file) => [...(graph.lanes.get(file) ?? [])].sort();

test("the closure follows reusable workflows, composite actions, run: scripts, npm scripts, imports and reads", () => {
  const graph = workflowCallers({root: fixtureRepo(fixture), lanes: ["build", "web"]});
  assert.deepEqual(graph.unresolved, []);
  for (const file of [".github/actions/setup/action.yml", "tool/ci/setup.mjs", "tool/ci/lib.mjs", "tool/ci/config.json"]) {
    assert.deepEqual(lanesOf(graph, file), ["build", "web"], file);
  }
  assert.deepEqual(lanesOf(graph, ".github/workflows/build.yml"), ["build"]);
  assert.deepEqual(lanesOf(graph, "tool/ci/build.sh"), ["build"], "a $ROOT-prefixed path resolves");
  assert.deepEqual(lanesOf(graph, "tool/ci/web_check.mjs"), ["web"], "npm --prefix run resolves the package script");
  assert.deepEqual(lanesOf(graph, "site/package.json"), ["web"]);
});

test("a file one reusable workflow calls selects that lane and no unrelated one", () => {
  const graph = workflowCallers({root: fixtureRepo(fixture), lanes: ["build", "web"]});
  assert.deepEqual([...callerLanes(["tool/ci/only_build.mjs"], {graph, allLanes: ["build", "web"]})], ["build"]);
  // Real repo: an app-build-matrix.yml-only change runs the app builds and no other lane.
  assert.deepEqual([...workflowLanes([".github/workflows/app-build-matrix.yml"], realGraph)].sort(),
    ["flutter_build_android", "flutter_build_ios", "flutter_build_web", "flutter_web_smoke"]);
  assert.deepEqual([...workflowLanes([".github/actions/cache-cocoapods/action.yml"], realGraph)].sort(),
    ["flutter_build_android", "flutter_build_ios", "flutter_build_web", "flutter_web_smoke", "visual_integration"]);
  assert.deepEqual([...workflowLanes([".github/workflows/flutter-ci.yml"], realGraph)], ["flutter"]);
});

test("what only an ungated job runs needs no lane, and files outside CI configuration keep their Nx inputs", () => {
  const graph = workflowCallers({root: fixtureRepo(fixture), lanes: ["build", "web"]});
  assert.equal(graph.lanes.has("tool/ci/lint.sh"), false);
  assert.deepEqual([...callerLanes(["tool/ci/lint.sh", "site/package.json"], {graph, allLanes: ["build", "web"]})], []);
  assert.equal(isCiConfiguration("site/package.json"), false);
});

test("a reference that cannot be resolved selects every lane, never none", () => {
  const graph = workflowCallers({root: fixtureRepo({...fixture,
    "tool/ci/build.sh": "node tool/ci/only_build.mjs\nnode \"$GENERATED_SCRIPT\"\n"}), lanes: ["build", "web"]});
  assert.equal(graph.unresolved.length, 1);
  assert.equal(graph.unresolved[0].from, "tool/ci/build.sh");
  assert.ok(graph.lanes.get("tool/ci/only_build.mjs").has(ALL));
  assert.deepEqual([...callerLanes(["tool/ci/only_build.mjs"], {graph, allLanes: ["build", "web"]})], ["build", "web"]);
});

test("the planner's entry points, and every file they import or load, are selectors", () => {
  const graph = workflowCallers({root: fixtureRepo(fixture), lanes: ["build", "web"]});
  for (const file of ["tool/harness.mjs", "tool/harness/lib/graph.mjs", "tool/harness/graph.json", "tool/tools_manifest.json"]) {
    assert.ok(isSelector(file, graph), file);
    assert.deepEqual([...callerLanes([file], {graph, allLanes: ["build", "web"]})], ["build", "web"], file);
  }
});

test("every selector file selects every lane in the real repository", () => {
  const named = [".github/workflows/ci.yml", "tool/harness.mjs", "tool/harness/component_graph.json",
    "tool/harness/lib/component_graph.mjs", "tool/harness/verify_local.mjs", "tool/nx/select_lanes.mjs",
    "tool/nx/shadow_plan.mjs", "tool/nx/workflow_callers.mjs", "tool/ci/main_push_base.mjs",
    "tool/ci/required_ci_floor.mjs", "tool/tools_manifest.json", "tool/ci/toolchain.env", "nx.json"];
  for (const file of [...named, ...realGraph.selectors]) {
    assert.ok(fs.existsSync(path.join(repoRoot, file)), `${file} exists`);
    assert.deepEqual([...workflowLanes([file], realGraph)].sort(), [...comparedLanes].sort(), file);
  }
  for (const file of [...selectorFiles, ...selectorEntries]) assert.ok(realGraph.selectors.has(file), file);
  // The Required CI job lives in ci.yml, which is a selector.
  assert.match(fs.readFileSync(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8"), /^ {2}required:\n {4}name: Required CI$/mu);
});

test("every unresolvable command in PR CI is declared", () => {
  assert.deepEqual(realGraph.unresolved, [], "declare the files a variable command runs in declaredTargets");
  for (const entry of declaredTargets) {
    assert.match(fs.readFileSync(path.join(repoRoot, entry.file), "utf8"), entry.command, entry.file);
    for (const target of entry.targets) assert.ok(fs.existsSync(path.join(repoRoot, target)), target);
  }
});

/** CI configuration files whose reaching jobs a selector leaves without a lane. */
function closureViolations(graph, {planner = plannerGraph} = {}) {
  const violations = [];
  for (const [file, jobs] of graph.jobsOf) {
    if (!isCiConfiguration(file) || isSelector(file, graph)) continue;
    const nx = workflowLanes([file], graph);
    const plan = planAffected({changedPaths: [file], graph: planner, mode: "merge_group"});
    const plannerLanes = new Set(plan.operations?.ciTargets ?? []);
    for (const job of jobs) {
      // A job lanes need, or one with an unresolved command, needs every lane.
      const every = graph.jobLanes.get(job).has(ALL);
      const lanes = every ? comparedLanes : [...graph.jobLanes.get(job)];
      if (!lanes.every((lane) => nx.has(lane))) violations.push({selector: "nx", file, job});
      const planned = every ? lanes.every((lane) => plannerLanes.has(lane)) : lanes.some((lane) => plannerLanes.has(lane));
      if (!planned) violations.push({selector: "planner", file, job});
    }
  }
  return violations;
}

test("every CI configuration file PR CI executes or reads selects every lane that executes or reads it", () => {
  const reached = [...realGraph.jobsOf.keys()].filter(isCiConfiguration);
  assert.ok(reached.filter((file) => file.startsWith(".github/actions/")).length >= 5, "every composite action is reached");
  assert.ok(reached.filter((file) => file.startsWith(".github/workflows/")).length >= 10, "every reusable workflow is reached");
  assert.ok(reached.filter((file) => file.startsWith("tool/ci/")).length >= 10, "tool/ci scripts are reached");
  assert.deepEqual(closureViolations(realGraph), []);
});

test("negative controls: narrowing a lane away from its caller is caught for both selectors", () => {
  // Nx: drop the flutter lane from flutter-ci.yml.
  const narrowed = {...realGraph, lanes: new Map(realGraph.lanes)};
  narrowed.lanes.set(".github/workflows/flutter-ci.yml", new Set());
  assert.deepEqual(closureViolations(narrowed).filter((entry) => entry.selector === "nx"),
    [{selector: "nx", file: ".github/workflows/flutter-ci.yml", job: "flutter"}]);
  // Planner: a dedicated workflow profile that forgets its own lane.
  const planner = structuredClone(plannerGraph);
  for (const mode of Object.values(planner.operationProfiles["ci-workflow-flutter"].direct)) {
    mode.ciTargets = mode.ciTargets.filter((lane) => lane !== "flutter");
  }
  assert.deepEqual(closureViolations(realGraph, {planner}).filter((entry) => entry.selector === "planner"),
    [{selector: "planner", file: ".github/workflows/flutter-ci.yml", job: "flutter"}]);
});

test("pull requests and the merge queue narrow CI configuration edits the same way", () => {
  // The only mode difference is the existing one: pull requests leave the
  // queue-only lanes (app builds, visual integration) to the merge queue.
  const queueOnly = ["flutter_build_android", "flutter_build_ios", "flutter_build_web", "flutter_web_smoke",
    "visual_integration"];
  const edits = [".github/workflows/flutter-ci.yml", ".github/workflows/app-build-matrix.yml",
    ".github/actions/cache-cocoapods/action.yml", ".github/actions/install-ripgrep/action.yml",
    ".github/workflows/react-surface-validation.yml", "tool/ci/generated_inventories.mjs", "tool/nx/select_lanes.mjs"];
  for (const file of edits) {
    const select = (mode) => compare({plannerLanes: [], nxTasks: [], changedFiles: [file], mode, graph: realGraph}).nxLanes;
    const queue = select("merge_group");
    assert.deepEqual(select("pr"), queue.filter((lane) => !queueOnly.includes(lane)), file);
  }
  // The narrowing never drops the iOS queue lanes from an edit that runs them.
  const ios = compare({plannerLanes: [], nxTasks: [], changedFiles: [".github/workflows/app-build-matrix.yml"],
    mode: "merge_group", graph: realGraph}).nxLanes;
  assert.ok(ios.includes("flutter_build_ios"));
});
