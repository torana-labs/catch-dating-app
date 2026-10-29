import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import test from "node:test";
import {planCommittedWindow, projectPlanOutputs} from "../harness.mjs";
import {planAffected} from "../harness/lib/component_graph.mjs";
import {changedPathsSince} from "../harness/lib/git_changes.mjs";
import {finalizeCiPlan, queueReusableLanes, requireCoveredPlan, requireValidationLanes, verifyValidationPlan} from "./finalize_ci_plan.mjs";
import {resolveMainBaseline} from "./main_ci_baseline.mjs";

const read = (file) => JSON.parse(fs.readFileSync(new URL(file, import.meta.url), "utf8"));
const graph = read("../harness/component_graph.json");
const manifest = read("../tools_manifest.json");
const needs = Object.fromEntries(["plan", "tools", "contracts", "functions", "firestore-rules", "flutter",
  "visual-integration", "admin", "marketing", "capture-freshness", "operations", "docs-policy", "app-builds"]
  .map((name) => [name, {result: "success"}]));

function fixture(context) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "catch-ci-finalize-"));
  context.after(() => fs.rmSync(cwd, {recursive: true, force: true}));
  const git = (...args) => {
    const result = spawnSync("git", args, {cwd, encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  const write = (name, text) => {
    fs.mkdirSync(path.dirname(path.join(cwd, name)), {recursive: true});
    fs.writeFileSync(path.join(cwd, name), text);
  };
  const commit = () => {
    git("add", "."); git("commit", "--quiet", "--allow-empty", "-m", "fixture");
    return git("rev-parse", "HEAD");
  };
  git("init", "--quiet", "-b", "main");
  git("config", "user.name", "CI test"); git("config", "user.email", "ci@example.invalid");
  const options = (baseSha) => {
    const sourceSha = git("rev-parse", "HEAD");
    const diff = {cwd, base: baseSha, head: sourceSha};
    const plan = planCommittedWindow({graph,
      windowPaths: changedPathsSince({...diff, commitWindow: true}),
      endpointPaths: changedPathsSince({...diff, committedOnly: true})});
    return {cwd, graph, manifest, needs, sourceSha, runId: "123", runAttempt: "2", baseSha,
      validationPlan: {...plan, baseSha, sourceSha, sourceCiRunId: "123", sourceCiRunAttempt: "2"}};
  };
  return {cwd, git, write, commit, options};
}

test("reverted changes stay tested while final publication follows success or failure of the predecessor", (context) => {
  const f = fixture(context);
  f.write("functions/src/example.ts", "const value = 1;"); const a = f.commit();
  f.write("functions/src/example.ts", "const value = 2;"); const b = f.commit();
  f.write("functions/src/example.ts", "const value = 1;"); f.commit();
  const options = f.options(a);
  assert.ok(options.validationPlan.operations.ciTargets.includes("functions"));
  const outputs = projectPlanOutputs({plan: options.validationPlan, graph});
  assert.equal(outputs.deploy_required, false);
  assert.equal(outputs.deploy_groups, "[]");
  assert.equal(outputs.has_release_targets, false);
  const success = finalizeCiPlan({...options, baseSha: b});
  assert.equal(success.mode, "main");
  assert.deepEqual(success.operations.deployGroups, ["functions"]);
  assert.equal(success.baseSha, b);
  const failure = finalizeCiPlan(options);
  assert.deepEqual(failure.changedPaths, []);
  assert.deepEqual(failure.operations.deployGroups, []);
});

test("multi-commit pushes cover failed predecessor paths and the current change", (context) => {
  const f = fixture(context);
  f.write("functions/src/a.ts", "old"); const a = f.commit();
  f.write("functions/src/a.ts", "new"); f.commit();
  f.write("firestore.indexes.json", "{}"); f.commit();
  const finalPlan = finalizeCiPlan(f.options(a));
  assert.deepEqual(finalPlan.changedPaths, ["firestore.indexes.json", "functions/src/a.ts"]);
  assert.deepEqual(finalPlan.operations.deployGroups, ["firestore-indexes", "functions"]);
});

test("only unowned transient paths broaden validation; current unowned paths still fail", (context) => {
  const f = fixture(context);
  f.write("docs/feature.md", "before"); const a = f.commit();
  f.write("unowned/transient.bin", "temporary"); const b = f.commit();
  assert.equal(f.options(a).validationPlan.complete, false);
  assert.throws(() => finalizeCiPlan(f.options(a)), /incomplete/);
  f.git("rm", "unowned/transient.bin"); f.write("docs/feature.md", "after"); f.commit();
  const options = f.options(a);
  assert.equal(options.validationPlan.mode, "nightly");
  assert.equal(options.validationPlan.full, true);
  const finalPlan = finalizeCiPlan(options);
  assert.equal(finalPlan.mode, "main");
  assert.equal(finalPlan.full, false);
  assert.deepEqual(finalPlan.operations.deployGroups, []);
  // If that transient file became the successful predecessor, its removal
  // remains unowned in the final delta and cannot receive publication authority.
  assert.throws(() => finalizeCiPlan({...options, baseSha: b}), /unowned/);
});

test("missing, skipped, failed or cancelled selected lanes reject publication before waiting", () => {
  const plan = planAffected({graph, changedPaths: ["functions/src/a.ts"], mode: "main"});
  for (const result of [undefined, "skipped", "failure", "cancelled", "timed_out"]) {
    const missing = structuredClone(needs);
    missing.functions = {result};
    assert.throws(() => requireValidationLanes(plan, missing), /did not succeed/);
  }
  assert.throws(() => requireValidationLanes(plan, {...needs, plan: {result: "skipped"}}));
  assert.throws(() => requireValidationLanes({...plan, operations: {...plan.operations, ciTargets: ["new_lane"]}}, needs), /No validation job/);
});

test("exact source, attempt and complete artifact contents are independently recomputed", (context) => {
  const f = fixture(context);
  f.write("functions/src/a.ts", "before"); const a = f.commit();
  f.write("functions/src/a.ts", "after"); f.commit();
  const options = f.options(a);
  verifyValidationPlan(options);
  for (const patch of [{sourceSha: a}, {sourceCiRunId: "999"}, {sourceCiRunAttempt: "1"},
    {commitWindow: false}, {validationOnly: false}, {changedPaths: []}, {extra: "untrusted"}]) {
    assert.throws(() => verifyValidationPlan({...options, validationPlan: {...options.validationPlan, ...patch}}));
  }
  const altered = structuredClone(options);
  altered.validationPlan.operations.ciTargets = [];
  assert.throws(() => verifyValidationPlan(altered), /exact committed window/);
  f.write("functions/src/a.ts", "newer"); f.commit();
  assert.throws(() => verifyValidationPlan(options), /Checkout is not/);
});

test("rewritten or backwards final baselines cannot skip or replace the validated window", (context) => {
  const f = fixture(context);
  f.write("functions/src/a.ts", "zero"); const zero = f.commit();
  f.write("functions/src/a.ts", "one"); const a = f.commit();
  f.write("functions/src/a.ts", "two"); f.commit();
  const options = f.options(a);
  assert.throws(() => finalizeCiPlan({...options, baseSha: zero}), /Git ancestry/);
  f.git("checkout", "--quiet", "-b", "other", a);
  f.write("functions/src/other.ts", "branch"); const other = f.commit();
  f.git("checkout", "--quiet", "main");
  assert.throws(() => finalizeCiPlan({...options, baseSha: other}), /Git ancestry/);
});

test("predecessor reruns retain the exact validated window through final publication", async (context) => {
  const f = fixture(context);
  f.write("functions/src/a.ts", "zero"); const older = f.commit();
  f.write("firestore.indexes.json", "{}"); const floor = f.commit();
  f.write("functions/src/a.ts", "current"); f.commit();
  const options = f.options(floor);
  const immutable = structuredClone(options.validationPlan);
  verifyValidationPlan(options);
  const repository = "owner/catch";
  const current = {id: 123, run_number: 10, run_attempt: 2, workflow_id: 7,
    path: ".github/workflows/ci.yml", name: "CI", event: "push", head_branch: "main",
    head_sha: options.sourceSha, repository: {id: 1, full_name: repository},
    head_repository: {id: 1, full_name: repository}};
  const predecessor = {...current, id: 122, run_number: 9, run_attempt: 2, head_sha: floor};
  const success = {...predecessor, id: 121, run_number: 8, run_attempt: 1, head_sha: older,
    status: "completed", conclusion: "success"};
  let reads = 0;
  const snapshots = [[success, {...predecessor, status: "in_progress", conclusion: null}],
    [success, {...predecessor, status: "completed", conclusion: "failure"}]];
  const baseline = await resolveMainBaseline({repository, runId: options.runId, runAttempt: options.runAttempt,
    sourceSha: options.sourceSha, fallbackBase: floor, minimumBaseSha: options.validationPlan.baseSha, wait: true,
    request: async (_endpoint, requestOptions) => requestOptions ?
      [{workflow_runs: snapshots[Math.min(reads++, snapshots.length - 1)]}] : current,
    ensureAncestor: (base, head) => f.git("merge-base", "--is-ancestor", base, head),
    isAncestor: (base, head) => {
      const result = spawnSync("git", ["merge-base", "--is-ancestor", base, head], {cwd: f.cwd});
      assert.ok([0, 1].includes(result.status));
      return result.status === 0;
    }, sleep: async () => {}, onWait: () => {}});
  assert.equal(baseline.baseSha, floor);
  const final = finalizeCiPlan({...options, baseSha: baseline.baseSha});
  assert.deepEqual(final.changedPaths, ["functions/src/a.ts"]);
  assert.deepEqual(final.operations.deployGroups, ["functions"]);
  assert.equal(final.sourceSha, options.sourceSha);
  assert.equal(final.sourceCiRunId, "123");
  assert.equal(final.sourceCiRunAttempt, "2");
  assert.deepEqual(options.validationPlan, immutable, "the validation artifact must remain unchanged");
  // The resolver must retain the covered window, not permit the older candidate
  // to include the indexes that this attempt never validated.
  assert.throws(() => finalizeCiPlan({...options, baseSha: older}), /Git ancestry/);
});

test("final plans cannot add paths, lanes, generators or registered checks", () => {
  const finalPlan = planAffected({graph, changedPaths: ["functions/src/a.ts"], mode: "main"});
  for (const key of ["ciTargets", "checkIds", "codegenIds"]) {
    const changed = structuredClone(finalPlan);
    changed.operations[key].push("unvalidated");
    assert.throws(() => requireCoveredPlan({validation: finalPlan, finalPlan: changed, graph, manifest}), /not validated/);
  }
  assert.throws(() => requireCoveredPlan({validation: finalPlan,
    finalPlan: {...finalPlan, changedPaths: ["unvalidated/path"]}, graph, manifest}), /not validated/);
});

test("actual platform jobs must cover each final app role, including nightly fallback roles", () => {
  const validation = planAffected({graph, changedPaths: [], mode: "nightly", full: true});
  const finalPlan = planAffected({graph, changedPaths: ["apps/host/pubspec.yaml"], mode: "main"});
  requireCoveredPlan({validation: {...validation, changedPaths: finalPlan.changedPaths}, finalPlan, graph, manifest});
  const limited = structuredClone(finalPlan);
  limited.operations.buildTargets = ["consumer-ios"];
  limited.operations.releaseTargets = [];
  limited.operations.releaseRoles = [];
  assert.throws(() => requireCoveredPlan({validation: limited, finalPlan, graph, manifest}), /role\/platform builds/);
});

test("Tools check closure is recomputed instead of trusting top-level check IDs", () => {
  const custom = structuredClone(graph);
  custom.operationProfiles["repo-tooling"].direct.main.checkIds = ["ci:main-ci-baseline"];
  const finalPlan = planAffected({graph: custom, changedPaths: ["tool/docs/check_doc_metadata.mjs"], mode: "main"});
  const validation = {...structuredClone(finalPlan), mode: "pr"};
  assert.throws(() => requireCoveredPlan({validation, finalPlan, graph: custom, manifest}), /registered Tools checks/);
  const full = {...validation, mode: "nightly", full: true};
  requireCoveredPlan({validation: full, finalPlan, graph: custom, manifest});
});

test("finalizer CLI rejects incomplete options without creating output", () => {
  const run = (args) => spawnSync(process.execPath, ["tool/ci/finalize_ci_plan.mjs", ...args], {encoding: "utf8"});
  assert.equal(run(["--help"]).status, 0);
  for (const args of [[], ["unknown"], ["validate", "--unknown"], ["finalize", "--base-sha"],
    ["finalize", "--output", "unused", "--output", "duplicate"]]) {
    const result = run(args);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
  }
});

test("capture freshness must execute successfully when selected", () => {
  const plan = planAffected({graph, mode: "main", changedPaths: ["test/example_test.dart"]});
  assert.ok(plan.operations.ciTargets.includes("capture_freshness"));
  assert.ok(!plan.operations.ciTargets.includes("marketing"));
  for (const result of ["skipped", "failure", "cancelled", undefined]) {
    const incomplete = structuredClone(needs);
    incomplete["capture-freshness"] = {result};
    assert.throws(() => requireValidationLanes(plan, incomplete), /capture_freshness did not succeed/);
  }
});

test("merge-queue reuse accepts skipped lanes only with a cited queue run", () => {
  const plan = {operations: {ciTargets: ["flutter", "functions", "tools", "visual_integration"]}};
  const needs = {plan: {result: "success"}, flutter: {result: "skipped"}, functions: {result: "skipped"},
    tools: {result: "skipped"}, "visual-integration": {result: "skipped"}};
  assert.doesNotThrow(() => requireValidationLanes(plan, needs, {queueVerifiedRun: "39822205436"}));
  assert.throws(() => requireValidationLanes(plan, needs), /Selected lane flutter did not succeed/u);
  assert.throws(() => requireValidationLanes(plan, needs, {queueVerifiedRun: "abc"}), /Invalid merge-queue run/u);
  const failed = structuredClone(needs);
  failed.flutter.result = "failure";
  assert.throws(() => requireValidationLanes(plan, failed, {queueVerifiedRun: "39822205436"}));
  const cancelled = structuredClone(needs);
  cancelled.functions.result = "cancelled";
  assert.throws(() => requireValidationLanes(plan, cancelled, {queueVerifiedRun: "39822205436"}));
});

test("a successful queue run of the exact source proves every validation lane", () => {
  for (const lane of ["admin", "capture_freshness", "contracts", "docs", "firestore_rules", "flutter",
    "flutter_build_android", "flutter_build_ios", "flutter_build_web", "flutter_web_smoke",
    "functions", "marketing", "operations", "policy_docs", "tools", "visual_integration"]) {
    assert.ok(queueReusableLanes.includes(lane), `${lane} must not re-run on main after the queue proved it`);
  }
});
