import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {planAffected} from "../harness/lib/component_graph.mjs";
import {canonical, manifestChange, manifestFile} from "./manifest_diff.mjs";
import {callerGraph, compare, comparedLanes, plannerManifestLanes} from "./shadow_plan.mjs";
import {mainShadowReport} from "./select_lanes.mjs";
import {manifestLanes, workflowCallers} from "./workflow_callers.mjs";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const baseText = fs.readFileSync(path.join(repoRoot, manifestFile), "utf8");
const graph = callerGraph();
const allLanes = comparedLanes;
const edit = (mutate) => {
  const manifest = JSON.parse(baseText);
  mutate(manifest);
  return JSON.stringify(manifest, null, 2);
};
const tool = (manifest, id) => manifest.tools.find((entry) => entry.id === id);
const lanesFor = (headText) => [...manifestLanes(manifestChange(baseText, headText), {graph, allLanes})].sort();
const everyLane = [...allLanes].sort();
const queueOnly = ["flutter_build_android", "flutter_build_ios", "flutter_build_web", "flutter_web_smoke", "visual_integration"];

test("reordering keys, entries and whitespace is no change: Tools and policy only", () => {
  const head = edit((manifest) => {
    manifest.tools.reverse();
    manifest.tools = manifest.tools.map((entry) => Object.fromEntries(Object.entries(entry).reverse()));
  });
  assert.deepEqual(manifestChange(baseText, head), {all: false, reason: null, ids: [], removed: []});
  assert.deepEqual(lanesFor(`${head}\n\n`), ["policy_docs", "tools"]);
  assert.equal(canonical({b: 1, a: [2, {d: 3, c: 4}]}), canonical({a: [2, {c: 4, d: 3}], b: 1}));
  // Bookkeeping fields are not a change either.
  assert.deepEqual(manifestChange(baseText, edit((manifest) => { manifest.updated = "2099-01-01"; })).ids, []);
});

test("a description edit to a check no lane names selects Tools and policy", () => {
  const head = edit((manifest) => { tool(manifest, "meta:nx-shadow-plan").description += " Edited."; });
  assert.deepEqual(manifestChange(baseText, head).ids, ["meta:nx-shadow-plan"]);
  assert.deepEqual(lanesFor(head), ["policy_docs", "tools"]);
});

test("every entry field marks the entry changed", () => {
  for (const [field, value] of [["command", "node --test x.test.mjs"], ["checks", []], ["path", "tool/x.mjs"],
    ["status", "inactive"], ["role", "other"], ["safety", "mutating"]]) {
    const head = edit((manifest) => { tool(manifest, "meta:nx-shadow-plan")[field] = value; });
    assert.deepEqual(manifestChange(baseText, head).ids, ["meta:nx-shadow-plan"], field);
  }
});

test("a check Functions runs by name selects Functions", () => {
  const head = edit((manifest) => { tool(manifest, "audit:fn-rate-limits").description += " Edited."; });
  assert.deepEqual(lanesFor(head), ["functions", "policy_docs", "tools"]);
});

test("a check the app builds run by name selects the four app-build lanes, iOS included", () => {
  const head = edit((manifest) => { tool(manifest, "platform:app-targets").description += " Edited."; });
  assert.deepEqual(lanesFor(head),
    ["flutter_build_android", "flutter_build_ios", "flutter_build_web", "flutter_web_smoke", "policy_docs", "tools"]);
});

test("removing an entry a job names selects that job's lanes", () => {
  const head = edit((manifest) => { manifest.tools = manifest.tools.filter((entry) => entry.id !== "audit:fn-readme-inventory"); });
  assert.deepEqual(manifestChange(baseText, head).removed, ["audit:fn-readme-inventory"]);
  assert.ok(lanesFor(head).includes("functions"));
});

test("an entry that runs a changed entry through alsoCheckIds changes too", () => {
  const owner = JSON.parse(baseText).tools.find((entry) => (entry.alsoCheckIds ?? []).length > 0);
  assert.ok(owner, "the manifest has an alsoCheckIds entry");
  const head = edit((manifest) => { tool(manifest, owner.alsoCheckIds[0]).description += " Edited."; });
  assert.ok(manifestChange(baseText, head).ids.includes(owner.id));
});

test("changes the diff does not recognise select every lane", () => {
  const cases = {
    "ciImpact": edit((manifest) => { manifest.ciImpact.mandatoryCheckIds.push("meta:nx-shadow-plan"); }),
    "new top-level key": edit((manifest) => { manifest.extra = true; }),
    "malformed JSON": `${baseText.slice(0, -10)}`,
    "no tools list": JSON.stringify({version: 1}),
    "duplicate id": edit((manifest) => { manifest.tools.push({...tool(manifest, "meta:nx-shadow-plan")}); }),
    "unknown entry field": edit((manifest) => { tool(manifest, "meta:nx-shadow-plan").owner = "someone"; }),
  };
  for (const [name, head] of Object.entries(cases)) {
    const change = manifestChange(baseText, head);
    assert.equal(change.all, true, name);
    assert.ok(change.reason, name);
    assert.deepEqual(lanesFor(head), everyLane, name);
  }
  // Unreadable history (no diff) selects every lane too.
  assert.deepEqual([...manifestLanes(null, {graph, allLanes})].sort(), everyLane);
});

test("negative controls: dropping the id mapping, or ignoring ciImpact, loses lanes the rule needs", () => {
  const head = edit((manifest) => { tool(manifest, "audit:fn-rate-limits").description += " Edited."; });
  const noMapping = {...graph, idLanes: new Map()};
  assert.ok(!manifestLanes(manifestChange(baseText, head), {graph: noMapping, allLanes}).has("functions"));
  // Treated as bookkeeping, a ciImpact edit would narrow to Tools and policy: the top-level check is what selects everything.
  const policy = edit((manifest) => { manifest.ciImpact.mandatoryCheckIds.push("meta:nx-shadow-plan"); });
  const narrowed = manifestChange(baseText, policy, {bookkeeping: new Set(["version", "updated", "ciImpact"])});
  assert.equal(narrowed.all, false);
  assert.deepEqual([...manifestLanes(narrowed, {graph, allLanes})].sort(), ["policy_docs", "tools"]);
});

function fixtureRepo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-ids-"));
  for (const [file, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), {recursive: true});
    fs.writeFileSync(path.join(root, file), content);
  }
  execFileSync("git", ["init", "-q"], {cwd: root});
  execFileSync("git", ["add", "-A"], {cwd: root});
  return root;
}

test("a lane names an id from a reusable workflow, a composite action or an npm script", () => {
  const tools = ["a:workflow", "b:action", "c:npm", "d:other"].map((id) => ({id, path: "tool/run.mjs", command: "true", checks: []}));
  const root = fixtureRepo({
    ".github/workflows/ci.yml": `
jobs:
  plan:
    runs-on: ubuntu-latest
    steps: [{run: echo plan}]
  build:
    if: \${{ needs.plan.outputs.build == 'true' }}
    needs: plan
    uses: ./.github/workflows/build.yml
  web:
    if: \${{ needs.plan.outputs.web == 'true' }}
    needs: plan
    runs-on: ubuntu-latest
    steps:
      - uses: ./.github/actions/setup
      - run: npm run check
  any:
    if: \${{ needs.plan.outputs.tools == 'true' }}
    needs: plan
    runs-on: ubuntu-latest
    steps:
      - run: node tool/run.mjs affected-tools --base x
`,
    ".github/workflows/build.yml": "on: workflow_call\njobs:\n  b:\n    runs-on: x\n    steps:\n      - run: node tool/run.mjs check a:workflow\n",
    ".github/actions/setup/action.yml": "runs:\n  using: composite\n  steps:\n    - shell: bash\n      run: node tool/run.mjs check b:action\n",
    "package.json": JSON.stringify({name: "root", scripts: {check: "node tool/run.mjs check c:npm"}}),
    "tool/run.mjs": "\n",
    "tool/tools_manifest.json": JSON.stringify({tools}),
  });
  const fixture = workflowCallers({root, lanes: ["build", "web", "tools", "policy_docs"]});
  assert.deepEqual([...fixture.idLanes.get("a:workflow")], ["build"]);
  assert.deepEqual([...fixture.idLanes.get("b:action")], ["web"]);
  assert.deepEqual([...fixture.idLanes.get("c:npm")], ["web"]);
  assert.equal(fixture.idLanes.has("d:other"), false);
  assert.deepEqual([...fixture.anyIdLanes], ["tools"], "affected-tools names every id");
  const change = {all: false, ids: ["a:workflow"], removed: []};
  assert.deepEqual([...manifestLanes(change, {graph: fixture, allLanes: ["build", "web", "tools", "policy_docs"]})].sort(),
    ["build", "policy_docs", "tools"]);
});

test("pull requests and the queue narrow a manifest-only edit; main still runs every lane", () => {
  const description = manifestChange(baseText, edit((manifest) => { tool(manifest, "meta:nx-shadow-plan").description += "."; }));
  const appTargets = manifestChange(baseText, edit((manifest) => { tool(manifest, "platform:app-targets").description += "."; }));
  const files = [manifestFile];
  assert.deepEqual(plannerManifestLanes({mode: "pr", changedFiles: files, change: description}), ["policy_docs", "tools"]);
  const queue = plannerManifestLanes({mode: "merge_group", changedFiles: files, change: appTargets});
  // The queue keeps the app builds an app-build check needs; their app-targets
  // job runs it. iOS itself builds only for a native or build input, which the
  // manifest is not (tool/ci/ios_build_inputs.mjs).
  assert.ok(queue.includes("flutter_build_android") && queue.includes("flutter_build_web"));
  assert.ok(!queue.includes("flutter_build_ios"), "the queue builds iOS only for a native or build input");
  assert.ok(!plannerManifestLanes({mode: "pr", changedFiles: files, change: appTargets}).some((lane) => queueOnly.includes(lane)),
    "pull requests leave the queue-only lanes to the queue");
  // Nx applies the same rule.
  assert.deepEqual(compare({plannerLanes: [], nxTasks: [], changedFiles: files, mode: "merge_group", manifestChange: appTargets})
    .nxLanes, queue);
  // Main: the planner keeps the manifest harness-full; the diff is report-only.
  const componentGraph = JSON.parse(fs.readFileSync(path.join(repoRoot, "tool/harness/component_graph.json"), "utf8"));
  const mainPlan = planAffected({changedPaths: files, graph: componentGraph, mode: "main"});
  assert.deepEqual([...mainPlan.operations.ciTargets].sort(), everyLane);
  const shadow = mainShadowReport({plan: mainPlan, changedFiles: files, change: description});
  assert.deepEqual(shadow.actual, everyLane);
  assert.deepEqual(shadow.wouldSelect, ["policy_docs", "tools"]);
  assert.match(shadow.reason, /meta:nx-shadow-plan/u);
});

test("a manifest edit with a selector file, or with files that do not plan, keeps every lane", () => {
  const description = manifestChange(baseText, edit((manifest) => { tool(manifest, "meta:nx-shadow-plan").description += "."; }));
  assert.equal(plannerManifestLanes({mode: "pr", changedFiles: [manifestFile, "tool/harness.mjs"], change: description}), null);
  assert.deepEqual(compare({plannerLanes: [], nxTasks: [], changedFiles: [manifestFile, "tool/harness.mjs"],
    manifestChange: description}).nxLanes, everyLane.filter((lane) => lane !== "flutter_build_ios"));
  assert.deepEqual(compare({plannerLanes: [], nxTasks: [], changedFiles: [manifestFile, "tool/harness.mjs"],
    manifestChange: description, mode: "main"}).nxLanes, everyLane);
  assert.equal(plannerManifestLanes({mode: "pr", changedFiles: [manifestFile], change: null}), null);
  // Other files plan with the planner as usual.
  const withDocs = plannerManifestLanes({mode: "pr", changedFiles: [manifestFile, "docs/README.md"], change: description});
  assert.ok(withDocs.includes("tools") && withDocs.includes("policy_docs"));
});
