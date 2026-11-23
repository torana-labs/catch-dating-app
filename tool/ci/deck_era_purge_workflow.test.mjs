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
  assert.match(workflow, /mode:\n[\s\S]*?options: \[dry-run, apply, bigquery\]\n {8}default: dry-run\n/u);
  assert.match(workflow, /source_run_id:\n {8}description: [^\n]+\n {8}required: false\n {8}type: string\n {8}default: ""\n/u);
  // Exactly three inputs: prod approval comes from the GitHub environment.
  assert.deepEqual([...workflow.matchAll(/\n {6}([a-z_-]+):\n {8}description:/gu)].map((m) => m[1]),
    ["environment", "mode", "source_run_id"]);
});

test("runs in the target's GitHub environment with keyless Workload Identity and least permissions", () => {
  assert.match(workflow, /\npermissions:\n {2}contents: read\n\n/u);
  // actions: read lets bigquery mode download an earlier run's artifact.
  assert.match(workflow, /\n {4}permissions:\n {6}contents: read\n {6}id-token: write\n {6}actions: read\n {4}timeout/u);
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

test("bigquery mode skips the Firestore tool and runs after the input check, download and sign-in", () => {
  const byName = (name) => steps.find((candidate) => (candidate.name ?? candidate.uses) === name ||
    candidate.uses?.startsWith(name));
  for (const name of ["Install the Functions dependencies", "Build Functions", "Run the purge"]) {
    assert.equal(byName(name).if, "${{ inputs.mode != 'bigquery' }}", name);
  }
  const bigquerySteps = ["Download the apply run's manifest", "google-github-actions/setup-gcloud@",
    "Delete the purged documents from the BigQuery export", "Refresh the user analytics mart"];
  for (const name of bigquerySteps) assert.equal(byName(name).if, "${{ inputs.mode == 'bigquery' }}", name);
  const order = ["Run only from main", "Check the inputs", ...bigquerySteps.slice(0, 1),
    "Authenticate to Google Cloud", ...bigquerySteps.slice(1)].map((name) => steps.indexOf(byName(name)));
  assert.deepEqual(order, [...order].sort((a, b) => a - b), "bigquery steps run in order");
  // The manifest comes from the named run with the job token, pinned like every action.
  assert.match(workflow, /if: \$\{\{ inputs\.mode == 'bigquery' \}\}\n {8}uses: actions\/download-artifact@[0-9a-f]{40} # v\d[^\n]*\n {8}with:\n {10}name: deck-era-purge-manifest-\$\{\{ inputs\.environment \}\}\n {10}path: \$\{\{ runner\.temp \}\}\/deck-era-purge-source\n {10}run-id: \$\{\{ inputs\.source_run_id \}\}\n {10}github-token: \$\{\{ github\.token \}\}\n/u);
});

test("the delete is fixed SQL with the ids only as the @ids parameter", () => {
  const script = step("Delete the purged documents from the BigQuery export").run;
  const statements = [...script.matchAll(/^ *[a-z:_]+\) echo '([^']+)' ;;$/gmu)].map((m) => m[1]);
  assert.deepEqual(statements, [
    "SELECT COUNT(*) AS changelog_rows, COUNT(DISTINCT document_id) AS documents FROM `catch_marketplace_metrics.participant_signal_facts_raw_changelog` WHERE document_id IN UNNEST(@ids)",
    "DELETE FROM `catch_marketplace_metrics.participant_signal_facts_raw_changelog` WHERE document_id IN UNNEST(@ids)",
  ]);
  assert.equal(script.match(/DELETE FROM/gu).length, 1, "no other DELETE");
  assert.doesNotMatch(script, /matches_raw_changelog/u, "the dropped matches changelog is never touched");
  // Every query goes through bq_run, which pins the project and location.
  assert.match(script, /bq_run\(\) \{ bq --quiet --headless --project_id="\$project" --location=asia-south1 "\$@"; \}/u);
  assert.equal(script.match(/\bbq /gu).length, 1, "bq runs only through bq_run");
});

function fakeBin(directory, name, source) {
  fs.mkdirSync(path.join(directory, "bin"), {recursive: true});
  fs.writeFileSync(path.join(directory, "bin", name), `#!/usr/bin/env node\n${source}`, {mode: 0o755});
}

function withDirectory(callback) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "deck-era-bigquery-"));
  try {
    return callback(directory);
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
}

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString().replace(/\.\d+Z$/u, "Z");
const sourceRun = (overrides = {}) => JSON.stringify({path: ".github/workflows/deck-era-purge.yml",
  head_branch: "main", event: "workflow_dispatch", status: "completed", conclusion: "success",
  updated_at: minutesAgo(120), ...overrides});

function checkInputs(env) {
  return withDirectory((directory) => {
    const log = path.join(directory, "gh.log");
    const output = path.join(directory, "output");
    fakeBin(directory, "gh", `require("node:fs").appendFileSync(process.env.GH_LOG, process.argv.slice(2).join(" ") + "\\n");
process.stdout.write(process.env.GH_RUN_JSON ?? "");\n`);
    const result = bash(step("Check the inputs").run, {cwd: directory, env: {
      PATH: `${path.join(directory, "bin")}${path.delimiter}${process.env.PATH}`, GH_LOG: log,
      GITHUB_OUTPUT: output, GITHUB_REPOSITORY: "owner/repo", MODE: "bigquery", SOURCE_RUN_ID: "",
      GH_RUN_JSON: sourceRun(), ...env}});
    return {
      result,
      calls: fs.existsSync(log) ? fs.readFileSync(log, "utf8").trim().split("\n") : [],
      output: fs.existsSync(output) ? fs.readFileSync(output, "utf8") : "",
    };
  });
}

test("the input check takes source_run_id only in bigquery mode, from a finished purge run on main", () => {
  for (const mode of ["dry-run", "apply"]) {
    assert.equal(checkInputs({MODE: mode}).result.status, 0);
    assert.notEqual(checkInputs({MODE: mode, SOURCE_RUN_ID: "44124903271"}).result.status, 0);
  }
  assert.notEqual(checkInputs({MODE: "delete-everything"}).result.status, 0);
  for (const id of ["", "abc", "0", "1 2", "1;rm -rf /", "../1"]) {
    const bad = checkInputs({SOURCE_RUN_ID: id});
    assert.notEqual(bad.result.status, 0, id);
    assert.deepEqual(bad.calls, [], `${id} never reaches the API`);
  }
  const good = checkInputs({SOURCE_RUN_ID: "44124903271"});
  assert.equal(good.result.status, 0, good.result.stdout + good.result.stderr);
  assert.deepEqual(good.calls, ["api repos/owner/repo/actions/runs/44124903271"]);
  assert.match(good.output, /^completed-epoch=\d+\n$/u);
  for (const overrides of [{path: ".github/workflows/other.yml"}, {head_branch: "feature"},
    {event: "push"}, {status: "in_progress"}, {conclusion: "failure"}]) {
    const refused = checkInputs({SOURCE_RUN_ID: "44124903271", GH_RUN_JSON: sourceRun(overrides)});
    assert.notEqual(refused.result.status, 0, JSON.stringify(overrides));
    assert.equal(refused.output, "");
  }
  const early = checkInputs({SOURCE_RUN_ID: "44124903271", GH_RUN_JSON: sourceRun({updated_at: minutesAgo(30)})});
  assert.notEqual(early.result.status, 0);
  assert.match(early.result.stdout, /streaming buffer[^\n]*Retry after \d{4}-\d\d-\d\dT\d\d:\d\dZ/u);
});

// A stand-in for bq: logs each call and its @ids file, answers show and the
// count, dry-run and delete queries, and remembers per table that a delete ran.
const fakeBq = `const fs = require("node:fs");
const args = process.argv.slice(2);
const env = process.env;
const parameter = args.find((arg) => arg.startsWith("--parameter="));
fs.appendFileSync(env.BQ_LOG, JSON.stringify({args, ids: parameter ?
  JSON.parse(fs.readFileSync(parameter.slice(12), "utf8"))[0].parameterValue.arrayValues.map((v) => v.value) : null}) + "\\n");
const sql = args.at(-1);
const table = sql.includes("matches_raw_changelog") ? "matches" : "facts";
const deleted = env.BQ_STATE + "/deleted-" + table;
if (args.includes("show")) process.stdout.write(env.BQ_SHOW ?? "{}");
else if (args.includes("--dry_run")) console.log("Query successfully validated.");
else if (sql.startsWith("DELETE")) {
  if (env.BQ_DELETE_ERROR) { console.log(env.BQ_DELETE_ERROR); process.exit(1); }
  fs.writeFileSync(deleted, "");
  console.log("Number of affected rows: 4");
} else if (sql.startsWith("SELECT")) {
  const gone = fs.existsSync(deleted) && !env.BQ_ROWS_REMAIN;
  console.log(JSON.stringify([gone ? {changelog_rows: "0", documents: "0"} :
    {changelog_rows: env.BQ_ROWS ?? "4", documents: env.BQ_DOCS ?? "2"}]));
} else process.exit(2);
`;

const factLine = (id) => JSON.stringify({collection: "participantSignalFacts", document_id: id});
const matchLine = (id) => JSON.stringify({collection: "matches", document_id: id});

function cleanBigQuery({manifest, env = {}, targetEnv = "prod"}) {
  return withDirectory((directory) => {
    fs.copyFileSync(path.join(root, ".firebaserc"), path.join(directory, ".firebaserc"));
    const manifestPath = path.join(directory, "deck-era-purge-source", "manifest.ndjson");
    if (manifest !== undefined) {
      fs.mkdirSync(path.dirname(manifestPath));
      fs.writeFileSync(manifestPath, manifest);
    }
    fs.mkdirSync(path.join(directory, "state"));
    const log = path.join(directory, "bq.log");
    const summary = path.join(directory, "summary.md");
    fakeBin(directory, "bq", fakeBq);
    const result = bash(step("Delete the purged documents from the BigQuery export").run, {cwd: directory, env: {
      PATH: `${path.join(directory, "bin")}${path.delimiter}${process.env.PATH}`, BQ_LOG: log,
      BQ_STATE: path.join(directory, "state"), GITHUB_STEP_SUMMARY: summary, RUNNER_TEMP: directory,
      TARGET_ENV: targetEnv, MANIFEST: manifestPath,
      SOURCE_COMPLETED_EPOCH: String(Math.floor(Date.now() / 1000) - 3 * 3600), ...env}});
    const calls = fs.existsSync(log) ? fs.readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line)) : [];
    return {result, calls, summary: fs.existsSync(summary) ? fs.readFileSync(summary, "utf8") : ""};
  });
}

const kind = (call) => call.args.includes("show") ? `show ${call.args.at(-1)}` :
  call.args.includes("--dry_run") ? `dry-run ${call.args.at(-1).split(" ")[0]}` : call.args.at(-1).split(" ")[0];

test("a missing, empty or foreign manifest fails before any BigQuery call", () => {
  for (const manifest of [undefined, "", "not json\n", `${JSON.stringify({collection: "profileDecisions", document_id: "a"})}\n`,
    `${JSON.stringify({collection: "matches", document_id: "matches/a"})}\n`,
    `${JSON.stringify({collection: "matches", document_id: "a", path: "matches/a"})}\n`]) {
    const refused = cleanBigQuery({manifest});
    assert.notEqual(refused.result.status, 0, String(manifest));
    assert.deepEqual(refused.calls, [], `${manifest} never reaches bq`);
  }
  assert.notEqual(cleanBigQuery({manifest: `${factLine("a")}\n`, env: {SOURCE_COMPLETED_EPOCH: ""}}).result.status, 0);
  assert.notEqual(cleanBigQuery({manifest: `${factLine("a")}\n`, targetEnv: "qa"}).result.status, 0);
});

test("bigquery mode counts, dry-runs, deletes and recounts only the manifest's signal facts", () => {
  const ids = ["fact-b", "fact-a", "fact-b"];
  const run = cleanBigQuery({manifest: `${ids.map(factLine).join("\n")}\n`});
  assert.equal(run.result.status, 0, run.result.stdout + run.result.stderr);
  const facts = "catch_marketplace_metrics.participant_signal_facts_raw_changelog";
  assert.deepEqual(run.calls.map(kind), [`show ${facts}`, "SELECT", "dry-run DELETE", "DELETE", "SELECT"]);
  for (const call of run.calls) {
    assert.deepEqual(call.args.slice(0, 4), ["--quiet", "--headless", "--project_id=catch-dating-app-64e51", "--location=asia-south1"]);
    if (!call.args.includes("show")) assert.deepEqual(call.ids, ["fact-a", "fact-b"], "unique ids, only as the parameter");
    assert.ok(!call.args.some((arg) => arg.includes("fact-")), "no id on the command line");
  }
  assert.equal(run.summary, [
    "## Deck-era purge: prod (bigquery)", "",
    "| Export changelog | Manifest ids | Before | After |", "|---|---|---|---|",
    "| participant_signal_facts | 2 | 4 rows, 2 documents | 0 rows, 0 documents |", ""].join("\n"));
  assert.equal(cleanBigQuery({manifest: `${factLine("a")}\n`, targetEnv: "dev"}).calls[0].args[2], "--project_id=catchdates-dev");
});

test("bigquery mode accepts and ignores the manifest's chats: the matches changelog is dropped (#2463)", () => {
  const run = cleanBigQuery({manifest: `${factLine("fact-a")}\n${matchLine("match-a")}\n`});
  assert.equal(run.result.status, 0, run.result.stdout + run.result.stderr);
  assert.ok(run.calls.every((call) => !call.args.at(-1).includes("matches_raw_changelog")), "no call reaches the matches changelog");
  for (const call of run.calls.filter((item) => item.ids)) assert.deepEqual(call.ids, ["fact-a"]);
  assert.doesNotMatch(run.summary, /\| matches \|/u);
  assert.doesNotMatch(run.summary, /fact-a|match-a/u, "the summary holds counts only");
});

test("bigquery mode refuses while the purge's changes can still be in the streaming buffer", () => {
  const manifest = `${factLine("fact-a")}\n`;
  const completed = Math.floor(Date.now() / 1000) - 3 * 3600;
  const buffered = cleanBigQuery({manifest, env: {BQ_SHOW: JSON.stringify({streamingBuffer: {oldestEntryTime: String((completed + 600) * 1000)}})}});
  assert.notEqual(buffered.result.status, 0);
  assert.match(buffered.result.stdout, /streaming buffer still holds rows[^\n]*Retry later/u);
  assert.deepEqual(buffered.calls.map(kind), ["show catch_marketplace_metrics.participant_signal_facts_raw_changelog"]);
  // A buffer that only holds rows written well after the purge does not block it.
  const later = cleanBigQuery({manifest, env: {BQ_SHOW: JSON.stringify({streamingBuffer: {oldestEntryTime: String((completed + 3600) * 1000)}})}});
  assert.equal(later.result.status, 0, later.result.stdout + later.result.stderr);
  // BigQuery's own refusal is reported as retry-later, and nothing is recounted.
  const refused = cleanBigQuery({manifest, env: {BQ_DELETE_ERROR: "BigQuery error in query operation: UPDATE or DELETE statement over table x would affect rows in the streaming buffer, which is not supported"}});
  assert.notEqual(refused.result.status, 0);
  assert.match(refused.result.stdout, /still in its streaming buffer\. Nothing was deleted from it\. Retry later\./u);
  assert.deepEqual(refused.calls.map(kind).slice(-2), ["dry-run DELETE", "DELETE"]);
  const failed = cleanBigQuery({manifest, env: {BQ_DELETE_ERROR: "Access Denied"}});
  assert.notEqual(failed.result.status, 0);
  assert.match(failed.result.stdout, /The delete from .+ failed\./u);
});

test("a rerun with nothing left succeeds, and rows left after the delete fail the job", () => {
  const manifest = `${factLine("fact-a")}\n`;
  const rerun = cleanBigQuery({manifest, env: {BQ_ROWS: "0", BQ_DOCS: "0"}});
  assert.equal(rerun.result.status, 0, rerun.result.stdout + rerun.result.stderr);
  assert.match(rerun.summary, /\| participant_signal_facts \| 1 \| 0 rows, 0 documents \| 0 rows, 0 documents \|/u);
  const remaining = cleanBigQuery({manifest, env: {BQ_ROWS_REMAIN: "1"}});
  assert.notEqual(remaining.result.status, 0);
  assert.match(remaining.result.stdout, /4 rows for the manifest ids remain/u);
});

test("the mart refresh runs the user analytics refresh for the chosen environment", () => {
  withDirectory((directory) => {
    const script = path.join(directory, "tool", "analytics", "deploy_user_analytics_bigquery.sh");
    fs.mkdirSync(path.dirname(script), {recursive: true});
    fs.writeFileSync(script, "printf '%s\\n' \"$@\" > \"$REFRESH_ARGS\"\n");
    const args = path.join(directory, "args.txt");
    const summary = path.join(directory, "summary.md");
    const result = bash(step("Refresh the user analytics mart").run, {cwd: directory,
      env: {TARGET_ENV: "prod", REFRESH_ARGS: args, GITHUB_STEP_SUMMARY: summary}});
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(fs.readFileSync(args, "utf8").trim().split("\n"), ["prod", "--refresh-only"]);
    assert.equal(fs.readFileSync(summary, "utf8"), "\nRefreshed mart_user_analytics_daily.\n");
  });
});

test("a run from another branch fails before anything else", () => {
  const guard = step("Run only from main");
  assert.notEqual(bash(guard.run, {cwd: root, env: {GITHUB_REF: "refs/heads/feature"}}).status, 0);
  assert.equal(bash(guard.run, {cwd: root, env: {GITHUB_REF: "refs/heads/main"}}).status, 0);
  const names = steps.map((candidate) => candidate.name ?? candidate.uses ?? "");
  assert.ok(names.indexOf("Run only from main") < names.indexOf("Authenticate to Google Cloud"));
});
