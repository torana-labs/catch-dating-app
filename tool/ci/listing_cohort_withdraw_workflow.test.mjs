import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {extractSteps} from "../harness/lib/workflow_steps.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/listing-cohort-withdraw.yml"), "utf8");
const steps = extractSteps(workflow);
const step = (name) => {
  const found = steps.find((candidate) => candidate.name === name);
  assert.ok(found?.run, `missing run step: ${name}`);
  return found;
};
const HASH = "a".repeat(64);

function bash(script, {cwd, env = {}}) {
  // GitHub's bash shell adds pipefail; the weaker -e proves each run block
  // carries its own failure handling.
  return spawnSync("bash", ["--noprofile", "--norc", "-e", "-c", script], {
    cwd, encoding: "utf8", env: {...process.env, ...env},
  });
}

test("runs only when dispatched from main, with exactly environment, mode, cohort, city and hash inputs", () => {
  assert.match(workflow, /\non:\n {2}workflow_dispatch:\n/u);
  assert.doesNotMatch(workflow, /\n {2}(push|pull_request|pull_request_target|schedule|workflow_run|workflow_call):/u);
  assert.match(workflow, /\n {4}if: \$\{\{ github\.ref == 'refs\/heads\/main' \}\}\n/u);
  assert.match(workflow, /environment:\n[\s\S]*?options: \[dev, prod\]\n {8}default: dev\n/u);
  assert.match(workflow, /mode:\n[\s\S]*?options: \[plan, apply, verify\]\n {8}default: plan\n/u);
  assert.match(workflow, /cohort_id:\n {8}description: [^\n]+\n {8}required: true\n {8}type: string\n/u);
  assert.match(workflow, /city:\n {8}description: [^\n]+\n {8}required: false\n {8}type: string\n {8}default: ""\n/u);
  assert.match(workflow, /manifest_sha256:\n {8}description: [^\n]+\n {8}required: false\n {8}type: string\n {8}default: ""\n/u);
  assert.deepEqual([...workflow.matchAll(/\n {6}([a-z_0-9-]+):\n {8}description:/gu)].map((m) => m[1]),
    ["environment", "mode", "cohort_id", "city", "manifest_sha256"], "no organiser id, handle, slug or URL can be an input");
});

test("runs in the target's GitHub environment with keyless Workload Identity and least permissions", () => {
  assert.match(workflow, /\npermissions:\n {2}contents: read\n\n/u);
  assert.match(workflow, /\n {4}permissions:\n {6}contents: read\n {6}id-token: write\n {4}timeout/u);
  assert.doesNotMatch(workflow, /contents: write|actions: (read|write)|credentials_json|FIREBASE_SERVICE_ACCOUNT|secrets\./u);
  assert.match(workflow, /\n {4}environment: \$\{\{ inputs\.environment \}\}\n/u);
  assert.match(workflow, /concurrency:\n {6}group: listing-cohort-withdraw-\$\{\{ inputs\.environment \}\}\n {6}cancel-in-progress: false\n/u);
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

test("a prod apply waits for the owner in prod-takedown, a credential-free gate, so prod stays approval-free", () => {
  const approve = workflow.match(/\n {2}approve:\n([\s\S]*?)\n\n {2}withdraw:\n/u);
  assert.ok(approve, "an approve job runs before the withdraw job");
  assert.match(approve[1], /\n {4}if: \$\{\{ github\.ref == 'refs\/heads\/main' \}\}\n/u);
  assert.match(approve[1], /\n {4}permissions: \{\}\n/u, "the gate gets no token permissions");
  assert.match(approve[1],
    /\n {4}environment: \$\{\{ inputs\.environment == 'prod' && inputs\.mode == 'apply' && 'prod-takedown' \|\| 'dev' \}\}\n/u);
  assert.doesNotMatch(approve[1], /id-token|google-github-actions|vars\.|secrets\./u, "the gate never signs in");
  assert.match(workflow, /\n {2}withdraw:\n {4}name: [^\n]+\n {4}needs: approve\n/u);
});

test("uploads no artifact and never runs the tool with full errors or a local manifest", () => {
  assert.doesNotMatch(workflow, /upload-artifact|download-artifact|cache@/u);
  assert.doesNotMatch(workflow, /--json|--debug|--manifest-out/u);
});

test("installs the Functions dependencies and signs in before the tool runs", () => {
  const install = step("Install the Functions dependencies");
  assert.match(install.run, /\nbash tool\/git\/bootstrap_worktree\.sh --target functions$/u);
  const names = steps.map((candidate) => candidate.name ?? candidate.uses ?? "");
  for (const before of ["Run only from main", "Check the inputs", "Install the Functions dependencies",
    "Authenticate to Google Cloud"]) {
    assert.ok(names.indexOf(before) >= 0 && names.indexOf(before) < names.indexOf("Run the cohort withdraw"), before);
  }
});

function checkInputs(env) {
  return bash(step("Check the inputs").run, {cwd: root, env: {TARGET_ENV: "dev", MODE: "plan", COHORT_ID: "pilot-indore-1",
    CITY: "", MANIFEST_SHA256: "", ...env}});
}

test("the input check accepts only a cohort id, a city slug and, for apply only, a SHA-256", () => {
  assert.equal(checkInputs({}).status, 0);
  for (const mode of ["plan", "verify"]) assert.equal(checkInputs({MODE: mode}).status, 0, mode);
  assert.equal(checkInputs({MODE: "apply", MANIFEST_SHA256: HASH}).status, 0);
  assert.equal(checkInputs({CITY: "indore"}).status, 0);
  for (const cohortId of ["", "a", "PILOT-1", "pilot-", "-pilot", "pilot indore", "pilot-indore-1 ", "pilot\nx",
    "Brindle Run Club", "brindle-run-club/../x", "$(id)", "pilot;rm -rf /"]) {
    const refused = checkInputs({COHORT_ID: cohortId});
    assert.notEqual(refused.status, 0, JSON.stringify(cohortId));
    assert.equal(refused.stdout, "::error::cohort_id must be a listing cohort id: lowercase letters, digits and hyphens, " +
      "such as pilot-indore-1.\n", "a refused cohort id is never echoed");
  }
  for (const city of ["Indore", "indore city", "indore/x", "$(id)"]) {
    const refused = checkInputs({CITY: city});
    assert.notEqual(refused.status, 0, JSON.stringify(city));
    assert.equal(refused.stdout, "::error::city must be empty or a city slug such as indore.\n",
      "a refused city is never echoed");
  }
  for (const hash of ["", "A".repeat(64), "a".repeat(63), `${HASH}\n`, "brindle-run-club"]) {
    assert.notEqual(checkInputs({MODE: "apply", MANIFEST_SHA256: hash}).status, 0, JSON.stringify(hash));
  }
  assert.notEqual(checkInputs({MODE: "plan", MANIFEST_SHA256: HASH}).status, 0, "a hash is for apply only");
  assert.notEqual(checkInputs({MODE: "delete"}).status, 0);
  assert.notEqual(checkInputs({TARGET_ENV: "qa"}).status, 0);
});

function run(env) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "listing-cohort-withdraw-"));
  fs.mkdirSync(path.join(directory, "bin"));
  const argsFile = path.join(directory, "args.txt");
  const summary = path.join(directory, "summary.md");
  fs.writeFileSync(path.join(directory, "bin", "node"),
    "#!/bin/sh\nprintf '%s\\n' \"$@\" >> \"$NODE_ARGS_FILE\"\necho 'Listing cohort withdraw pilot-indore-1: counts'\nexit \"${NODE_EXIT:-0}\"\n",
    {mode: 0o755});
  try {
    const result = bash(step("Run the cohort withdraw").run, {cwd: directory, env: {
      PATH: `${path.join(directory, "bin")}${path.delimiter}${process.env.PATH}`, NODE_ARGS_FILE: argsFile,
      GITHUB_STEP_SUMMARY: summary, GITHUB_RUN_ID: "4242", TARGET_ENV: "dev", MODE: "plan", COHORT_ID: "pilot-indore-1",
      CITY: "", MANIFEST_SHA256: "", ...env}});
    return {
      result,
      args: fs.existsSync(argsFile) ? fs.readFileSync(argsFile, "utf8").trim().split("\n") : [],
      summary: fs.existsSync(summary) ? fs.readFileSync(summary, "utf8") : "",
    };
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

const tool = "tool/data/listing_cohort_withdraw.mjs";
const base = (env, mode) => [tool, "--env", env, "--cohort-id", "pilot-indore-1", "--mode", mode];

test("each mode runs the tool with the cohort id; apply adds the hash and run id, and --allow-prod only in prod", () => {
  for (const mode of ["plan", "verify"]) {
    for (const env of ["dev", "prod"]) assert.deepEqual(run({TARGET_ENV: env, MODE: mode}).args, base(env, mode));
  }
  assert.deepEqual(run({MODE: "plan", CITY: "indore"}).args, [...base("dev", "plan"), "--city", "indore"]);
  assert.deepEqual(run({TARGET_ENV: "dev", MODE: "apply", MANIFEST_SHA256: HASH}).args,
    [...base("dev", "apply"), "--manifest-sha256", HASH, "--request-id", "actions-run-4242"]);
  assert.deepEqual(run({TARGET_ENV: "prod", MODE: "apply", MANIFEST_SHA256: HASH, CITY: "indore"}).args,
    [...base("prod", "apply"), "--city", "indore", "--manifest-sha256", HASH, "--request-id", "actions-run-4242",
      "--allow-prod"]);
  for (const refused of [{MODE: "delete-everything"}, {MODE: "apply", MANIFEST_SHA256: ""},
    {COHORT_ID: "Brindle Run Club"}, {CITY: "Indore"}]) {
    const outcome = run(refused);
    assert.notEqual(outcome.result.status, 0, JSON.stringify(refused));
    assert.deepEqual(outcome.args, [], `${JSON.stringify(refused)} never runs the tool`);
  }
});

test("the summary holds the tool's counts-only report, and a failed run fails the job after writing it", () => {
  const ok = run({MODE: "plan"});
  assert.equal(ok.result.status, 0, ok.result.stderr);
  assert.equal(ok.summary,
    "## Listing cohort withdraw pilot-indore-1: dev (plan)\n\n```text\nListing cohort withdraw pilot-indore-1: counts\n```\n");
  const failed = run({MODE: "verify", NODE_EXIT: "1"});
  assert.notEqual(failed.result.status, 0);
  assert.match(failed.summary, /Listing cohort withdraw pilot-indore-1: counts/u);
});

test("a run from another branch fails before anything else", () => {
  const guard = step("Run only from main");
  assert.notEqual(bash(guard.run, {cwd: root, env: {GITHUB_REF: "refs/heads/feature"}}).status, 0);
  assert.equal(bash(guard.run, {cwd: root, env: {GITHUB_REF: "refs/heads/main"}}).status, 0);
});
