#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {repoRoot} from "../lib/repo_paths.mjs";
import {planCommittedWindow, projectPlanOutputs, writeGithubOutputs} from "../harness.mjs";
import {changedPathsSince} from "../harness/lib/git_changes.mjs";
import {deriveAppRoles, planAffected} from "../harness/lib/component_graph.mjs";
import {planAffectedToolChecks} from "../lib/tool_impact.mjs";

const laneJobs = {
  admin: "admin", contracts: "contracts", docs: "docs-policy", policy_docs: "docs-policy",
  firestore_rules: "firestore-rules", flutter: "flutter", functions: "functions",
  capture_freshness: "capture-freshness", marketing: "marketing", operations: "operations", tools: "tools",
  visual_integration: "visual-integration", flutter_build_android: "app-builds",
  flutter_build_ios: "app-builds", flutter_build_web: "app-builds", flutter_web_smoke: "app-builds",
};
const shaPattern = /^[0-9a-f]{40}$/;
// A successful merge-queue run of the exact same source already proved every
// validation lane, so main re-runs none of them. Delivery reads its evidence
// from that queue run (or builds what it ships), not from a second execution.
export const queueReusableLanes = Object.freeze(Object.keys(laneJobs));

export function requireValidationLanes(plan, needs, {queueVerifiedRun = ""} = {}) {
  assert.equal(needs?.plan?.result, "success", "The initial planner must succeed.");
  assert.match(String(queueVerifiedRun), /^(?:[1-9][0-9]*)?$/, "Invalid merge-queue run identity.");
  for (const lane of plan.operations.ciTargets) {
    assert.ok(laneJobs[lane], `No validation job owns ${lane}.`);
    const result = needs[laneJobs[lane]]?.result;
    if (queueVerifiedRun && queueReusableLanes.includes(lane) && result === "skipped") continue;
    assert.equal(result, "success", `Selected lane ${lane} did not succeed.`);
  }
  for (const [job, value] of Object.entries(needs)) {
    assert.ok(["success", "skipped"].includes(value.result), `${job} did not pass.`);
  }
}

function buildExecutions(plan) {
  return plan.operations.ciTargets.filter((lane) => laneJobs[lane] === "app-builds")
    .flatMap((lane) => deriveAppRoles(plan).map((role) => `${role}:${lane}`));
}

export function requireCoveredPlan({validation, finalPlan, graph, manifest}) {
  assert.equal(validation.complete, true, "Validation plan is incomplete.");
  assert.equal(finalPlan.complete, true, "Final plan has unowned or ambiguous paths.");
  const subset = (actual, covered, label) => {
    const missing = actual.filter((entry) => !covered.includes(entry));
    assert.deepEqual(missing, [], `Final ${label} were not validated: ${missing.join(", ")}`);
  };
  subset(finalPlan.changedPaths, validation.changedPaths, "paths");
  for (const key of ["ciTargets", "checkIds", "codegenIds"]) {
    subset(finalPlan.operations[key], validation.operations[key], key);
  }
  subset(buildExecutions(finalPlan), buildExecutions(validation), "role/platform builds");
  if (finalPlan.operations.ciTargets.includes("tools")) {
    const tools = (plan) => planAffectedToolChecks({
      changedPaths: plan.changedPaths, componentGraph: graph, manifest, mode: plan.mode, full: plan.full,
    });
    const before = tools(validation);
    const after = tools(finalPlan);
    if (before.mode !== "full") {
      assert.equal(after.mode, "affected", "Final Tools plan requires unvalidated full coverage.");
      subset(after.toolIds, before.toolIds, "registered Tools checks");
    }
  }
}

export function verifyValidationPlan(options) {
  const {validationPlan, sourceSha, runId, runAttempt, graph, cwd = repoRoot} = options;
  for (const sha of [sourceSha, validationPlan.baseSha]) assert.match(sha ?? "", shaPattern);
  for (const id of [runId, runAttempt]) assert.match(String(id), /^[1-9][0-9]*$/);
  assert.equal(git(cwd, ["rev-parse", "HEAD"]), sourceSha, "Checkout is not the validated source.");
  assert.equal(validationPlan.sourceSha, sourceSha, "Validation source mismatch.");
  assert.equal(validationPlan.sourceCiRunId, String(runId), "Validation run mismatch.");
  assert.equal(validationPlan.sourceCiRunAttempt, String(runAttempt), "Validation attempt mismatch; rerun all jobs.");
  const window = {base: validationPlan.baseSha, head: sourceSha, cwd};
  const expected = planCommittedWindow({
    graph, windowPaths: changedPathsSince({...window, commitWindow: true}),
    endpointPaths: changedPathsSince({...window, committedOnly: true}),
  });
  assert.deepEqual(validationPlan, {...expected, baseSha: validationPlan.baseSha,
    sourceSha, sourceCiRunId: String(runId), sourceCiRunAttempt: String(runAttempt)},
  "Validation artifact differs from the exact committed window.");
  assert.equal(validationPlan.complete, true, "Validation plan is incomplete.");
  requireValidationLanes(validationPlan, options.needs, {queueVerifiedRun: options.queueVerifiedRun});
}

export function finalizeCiPlan(options) {
  const {validationPlan, baseSha, sourceSha, graph, manifest, cwd = repoRoot} = options;
  verifyValidationPlan(options);
  assert.match(baseSha ?? "", shaPattern);
  git(cwd, ["merge-base", "--is-ancestor", validationPlan.baseSha, baseSha]);
  git(cwd, ["merge-base", "--is-ancestor", baseSha, sourceSha]);
  const finalPlan = planAffected({
    changedPaths: changedPathsSince({base: baseSha, head: sourceSha, cwd, committedOnly: true}),
    graph, mode: "main",
  });
  requireCoveredPlan({validation: validationPlan, finalPlan, graph, manifest});
  return {...finalPlan, baseSha, sourceSha,
    sourceCiRunId: String(options.runId), sourceCiRunAttempt: String(options.runAttempt),
    ...(options.queueVerifiedRun ? {queueVerifiedRun: String(options.queueVerifiedRun)} : {})};
}

function git(cwd, args) {
  const result = spawnSync("git", args, {cwd, encoding: "utf8"});
  assert.equal(result.status, 0, result.stderr || `Cannot prove Git ancestry: ${args.join(" ")}`);
  return result.stdout.trim();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const [command, ...args] = process.argv.slice(2);
    if (command === "--help") {
      console.log("Usage: finalize_ci_plan.mjs validate|finalize --validation-plan file --needs-json file --source-sha sha --run-id id --run-attempt attempt [--base-sha sha --output file --github-output file --queue-verified-run id]");
    } else {
      assert.ok(["validate", "finalize"].includes(command), "Expected validate or finalize.");
      const values = {};
      const allowed = ["--validation-plan", "--needs-json", "--source-sha", "--run-id", "--run-attempt", "--base-sha", "--output", "--github-output", "--queue-verified-run"];
      for (let index = 0; index < args.length; index += 2) {
        const flag = args[index];
        assert.ok(allowed.includes(flag) && !Object.hasOwn(values, flag) && args[index + 1] &&
          !args[index + 1].startsWith("--"), `Unknown, duplicate or incomplete option: ${flag}`);
        values[flag] = args[index + 1];
      }
      const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
      const graph = read(path.join(repoRoot, "tool/harness/component_graph.json"));
      const options = {validationPlan: read(values["--validation-plan"]), needs: read(values["--needs-json"]),
        sourceSha: values["--source-sha"], runId: values["--run-id"], runAttempt: values["--run-attempt"],
        baseSha: values["--base-sha"], graph, manifest: read(path.join(repoRoot, "tool/tools_manifest.json")),
        queueVerifiedRun: values["--queue-verified-run"] ?? ""};
      if (command === "validate") {
        verifyValidationPlan(options);
        console.log("Every selected lane passed for this exact committed validation window.");
      } else {
        const plan = finalizeCiPlan(options);
        assert.ok(values["--output"] && values["--github-output"], "Final output and GitHub output paths required.");
        fs.writeFileSync(values["--output"], `${JSON.stringify(plan, null, 2)}\n`);
        writeGithubOutputs(values["--github-output"], {...projectPlanOutputs({plan, graph}), base_sha: plan.baseSha});
      }
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
