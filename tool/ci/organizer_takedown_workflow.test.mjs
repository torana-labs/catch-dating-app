import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {extractSteps} from "../harness/lib/workflow_steps.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/organizer-takedown.yml"), "utf8");
const steps = extractSteps(workflow);
const step = (name) => {
  const found = steps.find((candidate) => candidate.name === name);
  assert.ok(found?.run, `missing run step: ${name}`);
  return found;
};

function bash(script, {cwd, env = {}}) {
  // GitHub's bash shell adds pipefail; the weaker -e proves each run block
  // carries its own failure handling.
  return spawnSync("bash", ["--noprofile", "--norc", "-e", "-c", script], {
    cwd, encoding: "utf8", env: {...process.env, ...env},
  });
}

test("runs only when dispatched from main, with exactly environment, mode and case_id", () => {
  assert.match(workflow, /\non:\n {2}workflow_dispatch:\n/u);
  assert.doesNotMatch(workflow, /\n {2}(push|pull_request|pull_request_target|schedule|workflow_run|workflow_call):/u);
  assert.match(workflow, /\n {4}if: \$\{\{ github\.ref == 'refs\/heads\/main' \}\}\n/u);
  assert.match(workflow, /environment:\n[\s\S]*?options: \[dev, prod\]\n {8}default: dev\n/u);
  assert.match(workflow, /mode:\n[\s\S]*?options: \[plan, preserve, apply, suppress, verify, bigquery\]\n {8}default: plan\n/u);
  assert.match(workflow, /case_id:\n {8}description: [^\n]+\n {8}required: true\n {8}type: string\n/u);
  assert.deepEqual([...workflow.matchAll(/\n {6}([a-z_-]+):\n {8}description:/gu)].map((m) => m[1]),
    ["environment", "mode", "case_id"], "no organiser id, handle, slug or URL can be an input");
});

test("runs in the target's GitHub environment with keyless Workload Identity and least permissions", () => {
  assert.match(workflow, /\npermissions:\n {2}contents: read\n\n/u);
  assert.match(workflow, /\n {4}permissions:\n {6}contents: read\n {6}id-token: write\n {4}timeout/u);
  assert.doesNotMatch(workflow, /contents: write|actions: (read|write)|credentials_json|FIREBASE_SERVICE_ACCOUNT|secrets\./u);
  assert.match(workflow, /\n {4}environment: \$\{\{ inputs\.environment \}\}\n/u);
  assert.match(workflow, /concurrency:\n {6}group: organizer-takedown-\$\{\{ inputs\.environment \}\}\n {6}cancel-in-progress: false\n/u);
  assert.match(workflow, /workload_identity_provider: \$\{\{ vars\.GCP_WORKLOAD_IDENTITY_PROVIDER \}\}\n {10}service_account: \$\{\{ vars\.GCP_SERVICE_ACCOUNT_EMAIL \}\}\n/u);
  for (const use of workflow.match(/uses: [^\n]+/gu)) {
    if (use.startsWith("uses: ./")) continue;
    assert.match(use, /@[0-9a-f]{40} # v\d/u, `${use} is pinned to a commit`);
  }
  assert.match(workflow, /persist-credentials: false/u);
  for (const candidate of steps.filter((item) => item.run)) {
    assert.doesNotMatch(candidate.run, /\$\{\{/u, `${candidate.name} interpolates an expression into its script`);
  }
});

test("every prod mode waits for the owner in prod-takedown, a credential-free gate, so prod stays approval-free", () => {
  const approve = workflow.match(/\n {2}approve:\n([\s\S]*?)\n\n {2}takedown:\n/u);
  assert.ok(approve, "an approve job runs before the takedown job");
  assert.match(approve[1], /\n {4}if: \$\{\{ github\.ref == 'refs\/heads\/main' \}\}\n/u);
  assert.match(approve[1], /\n {4}permissions: \{\}\n/u, "the gate gets no token permissions");
  assert.match(approve[1], /\n {4}environment: \$\{\{ inputs\.environment == 'prod' && 'prod-takedown' \|\| 'dev' \}\}\n/u);
  assert.doesNotMatch(approve[1], /id-token|google-github-actions|vars\.|secrets\./u, "the gate never signs in");
  assert.match(workflow, /\n {2}takedown:\n {4}name: [^\n]+\n {4}needs: approve\n/u);
});

test("uploads no artifact: manifests and snapshots stay in the preservation bucket", () => {
  assert.doesNotMatch(workflow, /upload-artifact|download-artifact/u);
  assert.doesNotMatch(workflow, /--json|--debug/u, "the tool runs counts-only, never with full errors");
});

test("installs and builds Functions and signs in before the tool runs", () => {
  const install = step("Install the Functions dependencies");
  assert.match(install.run, /\nbash tool\/git\/bootstrap_worktree\.sh --target functions$/u);
  const build = step("Build Functions");
  assert.match(build.run, /\nnpm --prefix functions run build\n/u);
  assert.match(build.run, /\ntest -f functions\/lib\/listingSuppressions\/registry\.js$/u);
  const names = steps.map((candidate) => candidate.name ?? candidate.uses ?? "");
  for (const before of ["Run only from main", "Check the inputs", "Install the Functions dependencies",
    "Build Functions", "Authenticate to Google Cloud"]) {
    assert.ok(names.indexOf(before) < names.indexOf("Run the takedown"), before);
  }
  const gcloud = steps.find((candidate) => candidate.uses?.startsWith("google-github-actions/setup-gcloud@"));
  assert.equal(gcloud.if, "${{ inputs.mode == 'bigquery' }}");
  assert.equal(step("Refresh the host analytics marts").if, "${{ inputs.mode == 'bigquery' }}");
});

function checkInputs(env) {
  return bash(step("Check the inputs").run, {cwd: root, env: {TARGET_ENV: "dev", MODE: "plan", CASE_ID: "TD-0001", ...env}});
}

test("the input check accepts only the opaque case id form and known modes", () => {
  assert.equal(checkInputs({}).status, 0);
  for (const mode of ["plan", "preserve", "apply", "suppress", "verify", "bigquery"]) {
    assert.equal(checkInputs({MODE: mode}).status, 0, mode);
  }
  for (const caseId of ["", "TD-1", "TD-00001", "td-0001", "TD-0001 ", "TD-0001\nx", "lantern-trail-runners",
    "TD-0001;rm -rf /", "$(id)"]) {
    const refused = checkInputs({CASE_ID: caseId});
    assert.notEqual(refused.status, 0, JSON.stringify(caseId));
    assert.ok(!refused.stdout.includes(caseId) || caseId === "", "a refused case id is never echoed");
  }
  assert.notEqual(checkInputs({MODE: "delete"}).status, 0);
  assert.notEqual(checkInputs({TARGET_ENV: "qa"}).status, 0);
});

function run(env) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "organizer-takedown-"));
  fs.mkdirSync(path.join(directory, "bin"));
  const argsFile = path.join(directory, "args.txt");
  const summary = path.join(directory, "summary.md");
  fs.writeFileSync(path.join(directory, "bin", "node"),
    "#!/bin/sh\nprintf '%s\\n' \"$@\" >> \"$NODE_ARGS_FILE\"\necho 'Organiser takedown TD-0001: counts'\nexit \"${NODE_EXIT:-0}\"\n",
    {mode: 0o755});
  try {
    const result = bash(step("Run the takedown").run, {cwd: directory, env: {
      PATH: `${path.join(directory, "bin")}${path.delimiter}${process.env.PATH}`, NODE_ARGS_FILE: argsFile,
      GITHUB_STEP_SUMMARY: summary, TARGET_ENV: "dev", MODE: "plan", CASE_ID: "TD-0001", ...env}});
    return {
      result,
      args: fs.existsSync(argsFile) ? fs.readFileSync(argsFile, "utf8").trim().split("\n") : [],
      summary: fs.existsSync(summary) ? fs.readFileSync(summary, "utf8") : "",
    };
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

const tool = "tool/data/organizer_takedown.mjs";

test("each mode runs the tool with the case id, adding --allow-prod only for prod writes", () => {
  for (const mode of ["plan", "preserve", "verify"]) {
    for (const env of ["dev", "prod"]) {
      assert.deepEqual(run({TARGET_ENV: env, MODE: mode}).args, [tool, "--env", env, "--case-id", "TD-0001", "--mode", mode]);
    }
  }
  for (const mode of ["apply", "suppress", "bigquery"]) {
    assert.deepEqual(run({TARGET_ENV: "dev", MODE: mode}).args, [tool, "--env", "dev", "--case-id", "TD-0001", "--mode", mode]);
    assert.deepEqual(run({TARGET_ENV: "prod", MODE: mode}).args,
      [tool, "--env", "prod", "--case-id", "TD-0001", "--mode", mode, "--allow-prod"]);
  }
  const unknown = run({MODE: "delete-everything"});
  assert.notEqual(unknown.result.status, 0);
  assert.deepEqual(unknown.args, [], "an unknown mode never runs the tool");
  const badCase = run({CASE_ID: "lantern-trail-runners"});
  assert.notEqual(badCase.result.status, 0);
  assert.deepEqual(badCase.args, [], "the run step rechecks the case id");
});

test("the summary holds the tool's counts-only report, and a failed run fails the job after writing it", () => {
  const ok = run({MODE: "plan"});
  assert.equal(ok.result.status, 0, ok.result.stderr);
  assert.equal(ok.summary, "## Organiser takedown TD-0001: dev (plan)\n\n```text\nOrganiser takedown TD-0001: counts\n```\n");
  const failed = run({MODE: "verify", NODE_EXIT: "1"});
  assert.notEqual(failed.result.status, 0);
  assert.match(failed.summary, /Organiser takedown TD-0001: counts/u);
});

test("the mart refresh runs the host analytics refresh for the chosen environment", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "organizer-takedown-mart-"));
  try {
    const script = path.join(directory, "tool", "analytics", "deploy_host_analytics_bigquery.sh");
    fs.mkdirSync(path.dirname(script), {recursive: true});
    fs.writeFileSync(script, "printf '%s\\n' \"$@\" > \"$REFRESH_ARGS\"\n");
    const args = path.join(directory, "args.txt");
    const summary = path.join(directory, "summary.md");
    const result = bash(step("Refresh the host analytics marts").run, {cwd: directory,
      env: {TARGET_ENV: "prod", REFRESH_ARGS: args, GITHUB_STEP_SUMMARY: summary}});
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(fs.readFileSync(args, "utf8").trim().split("\n"), ["prod", "--refresh-only"]);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
});

test("a run from another branch fails before anything else", () => {
  const guard = step("Run only from main");
  assert.notEqual(bash(guard.run, {cwd: root, env: {GITHUB_REF: "refs/heads/feature"}}).status, 0);
  assert.equal(bash(guard.run, {cwd: root, env: {GITHUB_REF: "refs/heads/main"}}).status, 0);
});
