import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {extractSteps} from "../harness/lib/workflow_steps.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/deck-era-purge.yml"), "utf8");
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

test("runs only when dispatched from main, never on a push or a pull request", () => {
  assert.match(workflow, /\non:\n {2}workflow_dispatch:\n/u);
  assert.doesNotMatch(workflow, /\n {2}(push|pull_request|pull_request_target|schedule|workflow_run):/u);
  assert.match(workflow, /\n {4}if: \$\{\{ github\.ref == 'refs\/heads\/main' \}\}\n/u);
  assert.match(workflow, /environment:\n[\s\S]*?options: \[dev, prod\]\n {8}default: dev\n/u);
  assert.match(workflow, /mode:\n[\s\S]*?options: \[dry-run, apply\]\n {8}default: dry-run\n/u);
  // Exactly two inputs: prod approval comes from the GitHub environment.
  assert.deepEqual([...workflow.matchAll(/\n {6}([a-z-]+):\n {8}description:/gu)].map((m) => m[1]),
    ["environment", "mode"]);
});

test("runs in the target's GitHub environment with keyless Workload Identity and least permissions", () => {
  assert.match(workflow, /\npermissions:\n {2}contents: read\n\n/u);
  assert.match(workflow, /\n {4}permissions:\n {6}contents: read\n {6}id-token: write\n/u);
  assert.doesNotMatch(workflow, /contents: write|credentials_json|FIREBASE_SERVICE_ACCOUNT|secrets\./u);
  assert.match(workflow, /\n {4}environment: \$\{\{ inputs\.environment \}\}\n/u);
  assert.match(workflow, /concurrency:\n {6}group: deck-era-purge-\$\{\{ inputs\.environment \}\}\n {6}cancel-in-progress: false\n/u);
  assert.match(workflow, /workload_identity_provider: \$\{\{ vars\.GCP_WORKLOAD_IDENTITY_PROVIDER \}\}\n {10}service_account: \$\{\{ vars\.GCP_SERVICE_ACCOUNT_EMAIL \}\}\n/u);
  for (const use of workflow.match(/uses: [^\n]+/gu)) {
    if (use.startsWith("uses: ./")) continue;
    assert.match(use, /@[0-9a-f]{40} # v\d/u, `${use} is pinned to a commit`);
  }
  assert.match(workflow, /persist-credentials: false/u);
  // Inputs reach the shell only through env, never interpolated into a script.
  for (const candidate of steps.filter((item) => item.run)) {
    assert.doesNotMatch(candidate.run, /\$\{\{/u, `${candidate.name} interpolates an expression into its script`);
  }
});

test("installs Functions with the repository bootstrap and builds before the purge", () => {
  const install = step("Install the Functions dependencies");
  assert.match(install.run, /^set -euo pipefail\n/u);
  assert.match(install.run, /\nbash tool\/git\/bootstrap_worktree\.sh --target functions$/u);
  const build = step("Build Functions");
  assert.match(build.run, /\nnpm --prefix functions run build\n/u);
  assert.match(build.run, /\ntest -f functions\/lib\/matching\/deckEraDecision\.js$/u);
  const names = steps.map((candidate) => candidate.name ?? candidate.uses ?? "");
  assert.ok(names.indexOf("Build Functions") < names.indexOf("Run the purge"));
  assert.ok(names.indexOf("Authenticate to Google Cloud") < names.indexOf("Run the purge"));
});

function run(name, env) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "deck-era-purge-"));
  fs.mkdirSync(path.join(directory, "bin"));
  const argsFile = path.join(directory, "args.txt");
  const summary = path.join(directory, "summary.md");
  fs.writeFileSync(path.join(directory, "bin", "node"),
    "#!/bin/sh\nprintf '%s\\n' \"$@\" >> \"$NODE_ARGS_FILE\"\necho 'Deck-era purge plan for test'\nexit \"${NODE_EXIT:-0}\"\n",
    {mode: 0o755});
  try {
    const result = bash(step(name).run, {cwd: directory, env: {
      PATH: `${path.join(directory, "bin")}${path.delimiter}${process.env.PATH}`, NODE_ARGS_FILE: argsFile,
      GITHUB_STEP_SUMMARY: summary, RUNNER_TEMP: "/runner-temp", ...env}});
    return {
      result,
      args: fs.existsSync(argsFile) ? fs.readFileSync(argsFile, "utf8").trim().split("\n") : [],
      summary: fs.existsSync(summary) ? fs.readFileSync(summary, "utf8") : "",
    };
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

const tool = "tool/data/purge_deck_era_records.mjs";
const manifest = "/runner-temp/deck-era-purge/manifest.ndjson";

test("a dry run writes only the counts-only summary, without --apply or a manifest", () => {
  for (const env of ["dev", "prod"]) {
    const dry = run("Run the purge", {TARGET_ENV: env, MODE: "dry-run"});
    assert.equal(dry.result.status, 0, dry.result.stderr);
    assert.deepEqual(dry.args, [tool, "--env", env, "--summary-only"]);
    assert.match(dry.summary, /## Deck-era purge: .+ \(dry-run\)\n\n```text\nDeck-era purge plan for test\n```\n/u);
  }
  assert.doesNotMatch(workflow, /--json/u, "the summary never carries the JSON plan's ids");
});

test("apply passes --apply and --manifest, adds --allow-prod only for prod, and a failed run fails the job", () => {
  assert.deepEqual(run("Run the purge", {TARGET_ENV: "dev", MODE: "apply"}).args,
    [tool, "--env", "dev", "--summary-only", "--apply", "--manifest", manifest]);
  assert.deepEqual(run("Run the purge", {TARGET_ENV: "prod", MODE: "apply"}).args,
    [tool, "--env", "prod", "--summary-only", "--apply", "--manifest", manifest, "--allow-prod"]);
  const failed = run("Run the purge", {TARGET_ENV: "dev", MODE: "apply", NODE_EXIT: "1"});
  assert.notEqual(failed.result.status, 0, "pipefail keeps the tool's exit through tee");
  const unknown = run("Run the purge", {TARGET_ENV: "dev", MODE: "delete-everything"});
  assert.notEqual(unknown.result.status, 0);
  assert.deepEqual(unknown.args, [], "an unknown mode never runs the tool");
});

test("only apply uploads the manifest, kept for one day", () => {
  const upload = steps.find((candidate) => candidate.name === "Keep the deleted ids for the BigQuery cleanup");
  assert.ok(upload, "missing manifest upload step");
  assert.match(workflow, /if: \$\{\{ inputs\.mode == 'apply' \}\}\n {8}uses: actions\/upload-artifact@[0-9a-f]{40} # v\d/u);
  assert.match(workflow, /path: \$\{\{ runner\.temp \}\}\/deck-era-purge\/manifest\.ndjson\n/u);
  assert.match(workflow, /\n {10}retention-days: 1\n/u);
});

test("a run from another branch fails before anything else", () => {
  const guard = step("Run only from main");
  assert.notEqual(bash(guard.run, {cwd: root, env: {GITHUB_REF: "refs/heads/feature"}}).status, 0);
  assert.equal(bash(guard.run, {cwd: root, env: {GITHUB_REF: "refs/heads/main"}}).status, 0);
  const names = steps.map((candidate) => candidate.name ?? candidate.uses ?? "");
  assert.ok(names.indexOf("Run only from main") < names.indexOf("Authenticate to Google Cloud"));
});
