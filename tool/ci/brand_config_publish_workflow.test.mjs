import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {extractSteps} from "../harness/lib/workflow_steps.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const caller = read(".github/workflows/brand-config-publish.yml");
const reusable = read(".github/workflows/_brand-config-publish.yml");
const steps = extractSteps(reusable);
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

test("publishes on main only: push of the brand inputs or dispatch, never a pull request", () => {
  assert.doesNotMatch(caller, /pull_request/u);
  assert.match(caller, /on:\n {2}push:\n {4}branches: \[main\]\n {4}paths:\n/u);
  for (const input of ["packages/brand/brand.json", "packages/brand/brand.schema.json", "packages/brand/index.mjs",
    "tool/firebase/create_config_brand.mjs", "contracts/firestore/config_brand.schema.json"]) {
    assert.ok(caller.includes(`      - ${input}\n`), `push paths include ${input}`);
  }
  // A change to the workflows alone must not write to production on merge.
  const paths = caller.split("    paths:\n")[1].split("  workflow_dispatch:")[0];
  assert.doesNotMatch(paths, /\.github/u);
  assert.match(caller, /workflow_dispatch:\n {4}inputs:\n {6}environment:[\s\S]*options: \[dev-then-prod, dev, staging, prod\]/u);
  for (const job of ["dev", "prod", "staging"]) {
    const block = caller.split(`\n  ${job}:\n`)[1].split(/\n {2}[a-z]+:\n/u)[0];
    assert.match(block, /github\.ref == 'refs\/heads\/main'/u, `${job} runs only from main`);
    assert.match(block, /uses: \.\/\.github\/workflows\/_brand-config-publish\.yml/u);
    assert.match(block, new RegExp(`environment: ${job}\\n`, "u"));
  }
});

test("prod follows a successful dev publish, as the backend deploy does", () => {
  const prod = caller.split("\n  prod:\n")[1].split("\n  staging:\n")[0];
  assert.match(prod, /needs: dev\n/u);
  assert.match(prod, /needs\.dev\.result == 'success'/u);
  assert.match(prod, /!cancelled\(\)/u);
  assert.match(caller.split("\n  staging:\n")[1], /github\.event_name == 'workflow_dispatch' && inputs\.environment == 'staging'/u);
});

test("runs in the environment with keyless Workload Identity and least permissions", () => {
  for (const source of [caller, reusable]) {
    // The workflow reads; only a publishing job may mint an OIDC token.
    assert.match(source, /\npermissions:\n {2}contents: read\n\n/u);
    assert.doesNotMatch(source, /contents: write|credentials_json|FIREBASE_SERVICE_ACCOUNT|secrets\./u);
  }
  assert.equal(caller.match(/\n {4}permissions:\n {6}contents: read\n {6}id-token: write\n {4}uses: /gu)?.length, 3,
    "each of dev, prod and staging grants id-token at job level");
  assert.match(reusable, /\n {4}permissions:\n {6}contents: read\n {6}id-token: write\n/u);
  assert.match(reusable, /environment: \$\{\{ inputs\.environment \}\}\n/u);
  assert.match(reusable, /concurrency:\n {6}group: brand-config-\$\{\{ inputs\.environment \}\}\n {6}cancel-in-progress: false\n/u);
  assert.match(reusable, /workload_identity_provider: \$\{\{ vars\.GCP_WORKLOAD_IDENTITY_PROVIDER \}\}\n {10}service_account: \$\{\{ vars\.GCP_SERVICE_ACCOUNT_EMAIL \}\}\n/u);
  for (const use of reusable.match(/uses: [^\n]+/gu)) {
    if (use.startsWith("uses: ./")) continue;
    assert.match(use, /@[0-9a-f]{40} # v\d/u, `${use} is pinned to a commit`);
  }
  assert.match(reusable, /persist-credentials: false/u);
});

test("installs the two dependency families with the repository bootstrap", () => {
  const install = step("Install the root and Functions dependencies");
  assert.match(install.run, /^set -euo pipefail\n/u);
  assert.match(install.run, /\nbash tool\/git\/bootstrap_worktree\.sh --target root\n/u);
  assert.match(install.run, /\nbash tool\/git\/bootstrap_worktree\.sh --target functions$/u);
});

function fakeNode() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "brand-config-publish-"));
  fs.mkdirSync(path.join(directory, "bin"));
  fs.writeFileSync(path.join(directory, "bin", "node"),
    "#!/bin/sh\nprintf '%s\\n' \"$@\" >> \"$NODE_ARGS_FILE\"\nexit \"${NODE_EXIT:-0}\"\n", {mode: 0o755});
  return directory;
}

function runWithFakeNode(name, env) {
  const directory = fakeNode();
  const argsFile = path.join(directory, "args.txt");
  try {
    const result = bash(step(name).run, {
      cwd: directory,
      env: {PATH: `${path.join(directory, "bin")}${path.delimiter}${process.env.PATH}`, NODE_ARGS_FILE: argsFile,
        GITHUB_STEP_SUMMARY: path.join(directory, "summary.md"), ...env},
    });
    const args = fs.existsSync(argsFile) ? fs.readFileSync(argsFile, "utf8").trim().split("\n") : [];
    return {result, args};
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

test("publishes with --apply, adding --allow-prod only for prod, and fails when the writer fails", () => {
  const dev = runWithFakeNode("Publish config/brand", {TARGET_ENV: "dev"});
  assert.equal(dev.result.status, 0, dev.result.stderr);
  assert.deepEqual(dev.args, ["tool/firebase/create_config_brand.mjs", "--env", "dev", "--apply"]);
  const prod = runWithFakeNode("Publish config/brand", {TARGET_ENV: "prod"});
  assert.deepEqual(prod.args, ["tool/firebase/create_config_brand.mjs", "--env", "prod", "--apply", "--allow-prod"]);
  const failed = runWithFakeNode("Publish config/brand", {TARGET_ENV: "dev", NODE_EXIT: "1"});
  assert.notEqual(failed.result.status, 0);
});

test("a verify that finds drift fails the run", () => {
  const ok = runWithFakeNode("Verify config/brand matches brand.json", {TARGET_ENV: "staging"});
  assert.equal(ok.result.status, 0, ok.result.stderr);
  assert.deepEqual(ok.args, ["tool/firebase/create_config_brand.mjs", "--env", "staging", "--verify"]);
  const drift = runWithFakeNode("Verify config/brand matches brand.json", {TARGET_ENV: "prod", NODE_EXIT: "1"});
  assert.notEqual(drift.result.status, 0, "pipefail keeps the writer's exit through tee");
});

function freshnessRepo() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "brand-config-freshness-"));
  const git = (...args) => {
    const result = spawnSync("git", args, {cwd: directory, encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git("init", "-q");
  git("config", "user.email", "test@example.invalid");
  git("config", "user.name", "test");
  fs.mkdirSync(path.join(directory, "packages/brand"), {recursive: true});
  const commit = (brand, other = "") => {
    fs.writeFileSync(path.join(directory, "packages/brand/brand.json"), brand);
    fs.writeFileSync(path.join(directory, "other.txt"), other);
    git("add", "-A");
    git("commit", "-qm", "c");
    return git("rev-parse", "HEAD");
  };
  return {directory, git, commit};
}

function runFreshness({directory}, env) {
  const output = path.join(directory, "output.txt");
  fs.writeFileSync(output, "");
  const result = bash(step("Publish only the brand record that is current on main").run,
    {cwd: directory, env: {GITHUB_OUTPUT: output, ...env}});
  return {result, output: fs.readFileSync(output, "utf8")};
}

test("publishes only the brand.json that is current on main, and only from main", () => {
  const repo = freshnessRepo();
  try {
    const older = repo.commit('{"v":1}');
    const sameBrand = repo.commit('{"v":1}', "unrelated change");
    repo.git("update-ref", "refs/remotes/origin/main", sameBrand);
    assert.match(runFreshness(repo, {GITHUB_REF: "refs/heads/main", GITHUB_SHA: older}).output, /publish=true/u,
      "an older commit with the same brand.json still publishes");
    const newer = repo.commit('{"v":2}');
    repo.git("update-ref", "refs/remotes/origin/main", newer);
    const stale = runFreshness(repo, {GITHUB_REF: "refs/heads/main", GITHUB_SHA: older});
    assert.equal(stale.result.status, 0, stale.result.stderr);
    assert.match(stale.output, /publish=false/u, "a stale run never writes older values");
    assert.match(stale.result.stdout, /::notice::/u);
    assert.match(runFreshness(repo, {GITHUB_REF: "refs/heads/main", GITHUB_SHA: newer}).output, /publish=true/u);
    const branch = runFreshness(repo, {GITHUB_REF: "refs/heads/feature", GITHUB_SHA: newer});
    assert.notEqual(branch.result.status, 0, "a run from another branch fails before any write");
    assert.doesNotMatch(branch.output, /publish=/u);
  } finally {
    fs.rmSync(repo.directory, {recursive: true, force: true});
  }
});

test("every step after the freshness check is skipped when the record is stale", () => {
  const after = steps.slice(steps.findIndex((candidate) => candidate.name.startsWith("Publish only")) + 1);
  assert.ok(after.length >= 6);
  for (const candidate of after) {
    assert.equal(candidate.if, "${{ steps.current.outputs.publish == 'true' }}", candidate.name);
  }
});
