import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";
import {extractSteps} from "../harness/lib/workflow_steps.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const ci = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
const required = ci.slice(ci.indexOf("\n  required:\n"));
assert.ok(required.startsWith("\n  required:\n"), "missing Required CI job");
const steps = extractSteps(`jobs:\n${required}`);
function command(name) {
  const step = steps.find((entry) => entry.name === name);
  assert.ok(step?.run, `missing Required CI command ${name}`);
  return step.run;
}
const selectedLanes = ["tools", "contracts", "functions", "firestore-rules", "flutter",
  "visual-integration", "admin", "marketing", "capture-freshness", "operations", "docs-policy", "app-builds",
  "workflow-lint"];
const dependencies = [...required.matchAll(/^      - ([a-z-]+)$/gmu)].map((match) => match[1]);
const graph = JSON.parse(fs.readFileSync(path.join(root, "tool/harness/component_graph.json"), "utf8"));
const successfulNeeds = () => {
  const needs = Object.fromEntries(dependencies.map((job) =>
    [job, {result: ["plan", "source-preflight", ...selectedLanes].includes(job) ? "success" : "skipped"}]));
  needs.plan.outputs = Object.fromEntries(graph.targets.map(target => [target, "false"]));
  return needs;
};
function run(name, env = {}, cwd = root) {
  return spawnSync("bash", ["-e", "-o", "pipefail", "-c", command(name)], {
    cwd, encoding: "utf8", timeout: 10000,
    env: {...process.env, NODE_OPTIONS: "", EVENT_NAME: "pull_request", GITHUB_REF: "refs/pull/42/merge",
      NEEDS_JSON: JSON.stringify(successfulNeeds()), ...env},
  });
}
function passed(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout || result.error?.message);
}
function failed(result) {
  assert.notEqual(result.status, 0, result.stdout);
  assert.equal(result.error, undefined);
}

test("Required CI retains every automated dependency without the human source gate", () => {
  assert.deepEqual(dependencies, ["plan", "source-preflight", ...selectedLanes]);
  assert.doesNotMatch(ci, /backend-review|Backend source review|BACKEND_REVIEW_REQUIRED/u);
  passed(run("Require every selected lane"));
  const needs = successfulNeeds();
  for (const lane of selectedLanes) needs[lane].result = "skipped";
  passed(run("Require every selected lane", {NEEDS_JSON: JSON.stringify(needs)}));
});

for (const lane of selectedLanes) {
  for (const result of ["failure", "cancelled"]) {
    test(`Required CI rejects ${lane}=${result}`, () => {
      const needs = successfulNeeds();
      needs[lane].result = result;
      const output = run("Require every selected lane", {NEEDS_JSON: JSON.stringify(needs)});
      failed(output);
      assert.match(output.stdout, new RegExp(`${lane}=${result}`, "u"));
    });
  }
}

for (const result of ["failure", "cancelled", "skipped", "", undefined]) {
  test(`Required CI rejects planning without success (${String(result)})`, () => {
    const needs = successfulNeeds();
    if (result === undefined) delete needs.plan;
    else needs.plan.result = result;
    failed(run("Require every selected lane", {NEEDS_JSON: JSON.stringify(needs)}));
  });
}

test("Every ready PR validates in parallel; drafts wait until marked ready", () => {
  // The merge queue validates the exact combined source before main moves, so
  // PR validation needs no exclusive admission label or live main recheck.
  assert.doesNotMatch(ci, /ci:admitted|pr_ci_admission|admission/iu);
  const plan = ci.slice(ci.indexOf("\n  plan:\n"), ci.indexOf("\n  source-preflight:\n"));
  assert.match(plan,
    /^    if: \$\{\{ !cancelled\(\) && \(github\.event_name != 'pull_request' \|\| !github\.event\.pull_request\.draft\) \}\}$/mu);
  assert.doesNotMatch(plan, /^    needs:/mu, "planning must not wait for any gate");
  assert.match(required, /^    name: Required CI$/mu);
  assert.match(required,
    /^    if: \$\{\{ !cancelled\(\) && !\(github\.event_name == 'pull_request' && github\.event\.pull_request\.draft\) \}\}$/mu);
  assert.match(ci, /^  group: ci-\$\{\{ github\.event_name \}\}-\$\{\{ github\.event_name == 'pull_request' && github\.event\.pull_request\.number \|\|/mu);
  // A newer merge to main also cancels the older main run; merge-queue groups never cancel.
  assert.match(ci, /^  cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \|\| github\.event_name == 'push' \}\}$/mu);
  assert.doesNotMatch(ci, /^  queue: max$/mu, "queue: max cannot combine with cancelling PR runs");
});

test("Required CI on main needs no delivery artifacts or release authority", () => {
  // Main delivery planning, the Firebase package and the v3 authority existed
  // only for the retired mobile release workflow.
  for (const retired of [/finalize-plan/u, /package-firebase/u, /harness-success/u,
    /ci-delivery-authority/u, /firebase-delivery-/u, /deploy_required|DEPLOY_REQUIRED/u]) {
    assert.doesNotMatch(ci, retired);
  }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "catch-required-main-"));
  try {
    // A gh call would fail; Required CI on main reads only this run's needs.
    const gh = path.join(directory, "gh");
    fs.writeFileSync(gh, "#!/bin/sh\nexit 99\n", {mode: 0o755});
    passed(run("Require every selected lane", {PATH: `${directory}:${process.env.PATH}`,
      EVENT_NAME: "push", GITHUB_REF: "refs/heads/main"}));
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

for (const target of graph.targets) {
  test(`Required CI rejects selected but skipped ${target} on PR and nightly`, () => {
    const needs = successfulNeeds();
    for (const lane of selectedLanes) needs[lane].result = "skipped";
    needs.plan.outputs[target] = "true";
    for (const EVENT_NAME of ["pull_request", "schedule"]) {
      const output = run("Require every selected lane", {NEEDS_JSON: JSON.stringify(needs), EVENT_NAME});
      failed(output);
      assert.match(output.stderr, new RegExp(`Selected lane ${target} lacks successful execution`));
    }
    // Positive controls ensure each declared target is understood by the gate.
    const passedNeeds = successfulNeeds();
    passedNeeds.plan.outputs[target] = "true";
    passed(run("Require every selected lane", {NEEDS_JSON: JSON.stringify(passedNeeds)}));
    delete passedNeeds.plan.outputs[target];
    failed(run("Require every selected lane", {NEEDS_JSON: JSON.stringify(passedNeeds)}));
  });
}


for (const result of ["failure", "cancelled", "skipped", undefined]) {
  test(`Required CI rejects incomplete source preflight (${result})`, () => {
    const needs = successfulNeeds();
    if (result === undefined) delete needs["source-preflight"];
    else needs["source-preflight"].result = result;
    failed(run("Require every selected lane", {NEEDS_JSON: JSON.stringify(needs)}));
  });
}

test("Required CI accepts merge-queue-proven lanes only when this source's queue run is cited", () => {
  // A successful queue run of the exact source proves every lane and the
  // source preflight, so main re-runs none of them.
  const needs = successfulNeeds();
  for (const lane of ["source-preflight", ...selectedLanes]) needs[lane].result = "skipped";
  for (const target of graph.targets) needs.plan.outputs[target] = "true";
  passed(run("Require every selected lane", {NEEDS_JSON: JSON.stringify(needs), QUEUE_RUN: "39822205436"}));
  failed(run("Require every selected lane", {NEEDS_JSON: JSON.stringify(needs), QUEUE_RUN: ""}));
  // Without the queue proof, a skipped selected lane or preflight still fails.
  const lane = successfulNeeds();
  lane.functions.result = "skipped";
  lane.plan.outputs.functions = "true";
  failed(run("Require every selected lane", {NEEDS_JSON: JSON.stringify(lane)}));
  const preflight = successfulNeeds();
  preflight["source-preflight"].result = "skipped";
  failed(run("Require every selected lane", {NEEDS_JSON: JSON.stringify(preflight)}));
  // A queue run never excuses a failed or cancelled job.
  for (const result of ["failure", "cancelled"]) {
    const broken = structuredClone(needs);
    broken["source-preflight"].result = result;
    failed(run("Require every selected lane", {NEEDS_JSON: JSON.stringify(broken), QUEUE_RUN: "39822205436"}));
  }
});
