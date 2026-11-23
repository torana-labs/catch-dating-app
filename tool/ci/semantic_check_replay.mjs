#!/usr/bin/env node
// Replays the whole-repo semantic tool checks against main's recent
// first-parent commits, so the owner can decide which may block in the merge
// queue (owner decision: only after a clean replay). Report-only: it changes
// no gating and writes only under --workdir and --out.
//
//   node tool/ci/semantic_check_replay.mjs inventory [--json]
//   node tool/ci/semantic_check_replay.mjs run --out <results.jsonl>
//     [--ref origin/main] [--commits 200] [--every 1] [--workers 3]
//     [--reruns 2] [--timeout 600] [--checks id,id] [--workdir <dir>]
//     [--commits-from <earlier.jsonl>]  (replay only the commits that file holds)
//   node tool/ci/semantic_check_replay.mjs report --results <a.jsonl[,b.jsonl]>
//     [--json <summary.json>] [--markdown <report.md>]
//
// `run` checks out each commit in its own shared clones under --workdir (never
// the caller's checkout or refs). In each clone origin/main points at the
// commit's first parent, the base a merge-queue run compares with, so a ratchet
// that reads origin/main sees what the queue saw. It installs the commit's locked dependencies when a lockfile
// changes, prepares what CI prepares (schema contracts, Admin build modules),
// records which checks the queue's affected-tools selection would have run on
// that commit, and runs each check's manifest command as of that commit. A
// failed check runs again up to --reruns times: a commit whose attempts
// disagree is a flake. Results append to --out one line per commit and check,
// so an interrupted run resumes where it stopped.
import {spawn, spawnSync} from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import YAML from "yaml";
import {loadToolsManifest, toolsManifestAt} from "../lib/tools_manifest.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// A check that reads the whole repository or a whole surface: an active,
// local, non-generator tool whose manifest command runs a repository script
// rather than a unit-test file, and needs neither Flutter nor a browser.
const LOCAL_SURFACES = new Set(["local-read", "local-writes-scratch", "local-writes-repo"]);
const NON_CHECK_ROLES = new Set(["finder", "generator", "operator"]);
const HEAVY_SETUP = new Set(["flutter", "flutter-pub", "playwright"]);

/** Tools the rule would admit that are not replayable whole-repo checks. */
export const EXCLUDED = Object.freeze({
  "agent:harness-v2": "runner: prints the harness usage, checks nothing on its own",
  "agent:selector-comparison": "diff-scoped: compares selectors over --base..--head",
  "agent:verify-local": "runner: derives and runs other gates",
  "ci:delivery-core": "needs a subcommand",
  "ci:flutter-package-scope": "needs exact --base/--head SHAs",
  "ci:flutter-workspace-analysis": "needs Flutter at run time",
  "contracts:generate-schemas": "generator: the replay runs it as preparation",
  "design:website-playbook-tokens": "generator: imports kit tokens",
  "design:widget-dedupe-probes": "needs Dart at run time",
  "docs:metadata": "diff-scoped: reads the docs changed since --base",
  "env:check-web-hosting": "needs a surface argument",
  "firebase:plan-function-deploy": "needs deploy manifests as arguments",
  "git:audit-merge-drops": "diff-scoped: needs --base and a receipt",
  "marketing:capture-drift": "needs --plan or --compare inputs",
  "platform:mobile-package-policy": "needs a built --artifact",
  "tool:runner": "runner: lists tools",
  "ui-capture:run": "renders captures, needs Flutter",
});

/** Whole-repo checks whose command is phrased as a test file. */
export const INCLUDED = Object.freeze({
  "firebase:function-binding-intent":
    "asserts every Functions export's binding intent across the whole Functions source",
});

const isUnitTestCommand = (command) => /(^|\s)--test(\s|$)/u.test(command);
const isProbeCommand = (command) => /(^|\s)(--help|help|--self-test)(\s|$)|<[^>]+>/u.test(command);

/** Splits active tools into whole-repo checks and the exclusions, with reasons. */
export function wholeRepoInventory(manifest) {
  const checks = [];
  const excluded = [];
  for (const tool of manifest.tools) {
    if (tool.status !== "active" || !tool.command) continue;
    if (INCLUDED[tool.id]) {
      checks.push(entry(tool, INCLUDED[tool.id]));
      continue;
    }
    const setup = tool.ciRequirements?.setup ?? [];
    const candidate = LOCAL_SURFACES.has(tool.surface) && !NON_CHECK_ROLES.has(tool.role) &&
      /^(node|bash) /u.test(tool.command) && !isUnitTestCommand(tool.command) &&
      !isProbeCommand(tool.command) && !setup.some((need) => HEAVY_SETUP.has(need));
    if (!candidate) continue;
    if (EXCLUDED[tool.id]) excluded.push({id: tool.id, reason: EXCLUDED[tool.id]});
    else checks.push(entry(tool));
  }
  const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return {checks: checks.sort(byId), excluded: excluded.sort(byId)};
}

function entry(tool, note = null) {
  return {id: tool.id, category: tool.category, role: tool.role ?? null, surface: tool.surface,
    command: tool.command, ...(note ? {note} : {})};
}

/** The script path a command runs, e.g. tool/contracts/check_x.mjs. */
export function commandScript(command) {
  return command.split(/\s+/u).find((word, index) => index > 0 && /\.(mjs|cjs|js|sh)$/u.test(word)) ?? null;
}

/**
 * Where each check runs in a merge-queue CI run today and whether that step
 * gates. Every check runs in the tools lane when affected-tools selects it; a
 * lane workflow step that runs its script (or `run.mjs check <id>`) also runs
 * it. A step gates when its lane is in Required CI's needs and neither the step
 * nor its job continues on error.
 */
export function queueRunMap(checks, {readWorkflow}) {
  const ci = YAML.parse(readWorkflow("ci.yml"));
  const required = new Set(ci.jobs.required?.needs ?? []);
  const lanes = Object.entries(ci.jobs).filter(([, job]) => typeof job.uses === "string" &&
    job.uses.startsWith("./.github/workflows/")).map(([lane, job]) =>
    ({lane, file: job.uses.slice("./.github/workflows/".length)}));
  const sites = new Map(checks.map((check) => [check.id, []]));
  for (const {lane, file} of lanes) {
    if (file === "tools-ci.yml") continue;
    const workflow = YAML.parse(readWorkflow(file));
    for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
      for (const step of job.steps ?? []) {
        if (typeof step.run !== "string") continue;
        for (const check of checks) {
          const script = commandScript(check.command);
          const named = new RegExp(`run\\.mjs check [^\\n]*\\b${check.id.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\b`, "u");
          // The runner itself is shared: only its exact command, or a
          // `run.mjs check <id>` naming the check, runs this check.
          const runsScript = script && step.run.includes(script) &&
            (script !== "tool/run.mjs" || step.run.includes(check.command));
          if (!runsScript && !named.test(step.run)) continue;
          if (sites.get(check.id).some((site) => site.lane === lane && site.job === jobName &&
            site.step === (step.name ?? null))) continue;
          sites.get(check.id).push({lane, workflow: file, job: jobName, step: step.name ?? null,
            gates: required.has(lane) && step["continue-on-error"] !== true && job["continue-on-error"] !== true});
        }
      }
    }
  }
  const toolsGates = required.has("tools");
  return Object.fromEntries(checks.map((check) => {
    const all = [{lane: "tools", workflow: "tools-ci.yml", job: "affected-tools / tool-buckets",
      step: "run.mjs affected-tools", gates: toolsGates}, ...sites.get(check.id)];
    return [check.id, {gates: all.some((site) => site.gates), sites: all}];
  }));
}

// ---------------------------------------------------------------- analysis

const percentile = (values, p) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
};

/** One record's outcome: pass, fail, flaky (attempts disagree) or setup. */
export function outcomeOf(record) {
  if (record.setupError) return "setup";
  const passes = record.attempts.filter((attempt) => attempt.status === 0).length;
  if (passes === record.attempts.length) return "pass";
  return passes === 0 ? "fail" : "flaky";
}

/**
 * Summarises results (oldest commit first) per check: pass rate, flakes,
 * runtime, and failure incidents. An incident is a run of consecutive commits
 * on which the check failed; it was introduced by its first commit, and the
 * queue would have blocked that merge if affected-tools selected the check
 * there. Each failing commit where it was selected is a blocked merge.
 */
export function summarize(records, {order, timeOf = () => null}) {
  const position = new Map(order.map((sha, index) => [sha, index]));
  const byCheck = new Map();
  for (const record of records) {
    if (!byCheck.has(record.id)) byCheck.set(record.id, []);
    byCheck.get(record.id).push(record);
  }
  const summaries = [];
  for (const [id, list] of byCheck) {
    list.sort((a, b) => position.get(a.sha) - position.get(b.sha));
    const counted = list.filter((record) => record.present !== false);
    const outcomes = counted.map((record) => ({record, outcome: outcomeOf(record)}));
    const tally = {pass: 0, fail: 0, flaky: 0, setup: 0};
    for (const {outcome} of outcomes) tally[outcome] += 1;
    const firstAttempts = counted.filter((record) => !record.setupError)
      .map((record) => record.attempts[0].ms);
    const incidents = [];
    let open = null;
    for (const {record, outcome} of outcomes) {
      if (outcome === "fail") {
        if (!open) {
          open = {introducedAt: record.sha, subject: record.subject, commits: 0, blockedMerges: 0,
            selectedAtIntroduction: record.selected === true, signature: record.attempts[0].tail,
            fixedAt: null, redHours: null};
          incidents.push(open);
        }
        open.commits += 1;
        if (record.selected === true) open.blockedMerges += 1;
      } else if (outcome === "pass" && open) {
        open.fixedAt = record.sha;
        const [from, to] = [timeOf(open.introducedAt), timeOf(record.sha)];
        open.redHours = from === null || to === null ? null : Math.round(((to - from) / 3600) * 10) / 10;
        open = null;
      }
    }
    const judged = tally.pass + tally.fail + tally.flaky;
    summaries.push({
      id,
      commits: counted.length,
      absent: list.length - counted.length,
      ...tally,
      passRate: judged === 0 ? null : tally.pass / judged,
      flakeRate: judged === 0 ? null : tally.flaky / judged,
      selected: counted.filter((record) => record.selected === true).length,
      blockedMerges: incidents.reduce((sum, incident) => sum + incident.blockedMerges, 0),
      runtimeMs: {p50: percentile(firstAttempts, 50), p95: percentile(firstAttempts, 95),
        max: firstAttempts.length ? Math.max(...firstAttempts) : null},
      flakes: outcomes.filter(({outcome}) => outcome === "flaky").map(({record}) =>
        ({sha: record.sha, statuses: record.attempts.map((attempt) => attempt.status)})),
      incidents,
    });
  }
  return summaries.sort((a, b) => (a.id < b.id ? -1 : 1));
}

/**
 * The replay verdict per check. `clean`: every replayed commit passed, no
 * flake. `flaky`: some commit's attempts disagreed. `failing`: stable failures
 * whose cause needs a human verdict (a real break the gate would rightly have
 * blocked, or a false failure). `slow`: clean but its p95 exceeds the budget.
 * `insufficient`: fewer judged commits than minCommits.
 */
export function verdictOf(summary, {minCommits = 50, budgetMs = 120000} = {}) {
  const judged = summary.pass + summary.fail + summary.flaky;
  if (judged < minCommits) return "insufficient";
  if (summary.flaky > 0) return "flaky";
  if (summary.fail > 0) return "failing";
  if (summary.runtimeMs.p95 !== null && summary.runtimeMs.p95 > budgetMs) return "slow";
  return "clean";
}

const percent = (value) => (value === null ? "n/a" : `${(value * 100).toFixed(1)}%`);
const seconds = (ms) => (ms === null ? "n/a" : `${(ms / 1000).toFixed(1)}`);

/** A Markdown table of every check plus each failure incident. */
export function renderMarkdown(summaries, {queueMap = {}, thresholds = {}, window = null} = {}) {
  const lines = [];
  if (window) lines.push(`Replayed ${window.commits} first-parent commits of ${window.ref}, ` +
    `${window.oldest.slice(0, 8)} to ${window.newest.slice(0, 8)}.`, "");
  lines.push("| Check | Gates in queue today | Commits | Pass | Fail | Flaky | Setup | Pass rate | Selected | Blocked merges | p50 s | p95 s | Verdict |",
    "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|");
  for (const summary of summaries) {
    const where = queueMap[summary.id];
    const gates = where ? (where.gates ? `yes (${where.sites.filter((site) => site.gates)
      .map((site) => site.lane).join(", ")})` : "no") : "?";
    lines.push(`| \`${summary.id}\` | ${gates} | ${summary.commits} | ${summary.pass} | ${summary.fail} | ` +
      `${summary.flaky} | ${summary.setup} | ${percent(summary.passRate)} | ${summary.selected} | ` +
      `${summary.blockedMerges} | ${seconds(summary.runtimeMs.p50)} | ${seconds(summary.runtimeMs.p95)} | ` +
      `${verdictOf(summary, thresholds)} |`);
  }
  const failing = summaries.filter((summary) => summary.incidents.length || summary.flakes.length);
  if (failing.length) lines.push("", "### Failures and flakes", "");
  for (const summary of failing) {
    for (const incident of summary.incidents) {
      lines.push(`- \`${summary.id}\`: failed on ${incident.commits} commit(s) from ` +
        `${incident.introducedAt.slice(0, 8)} (${incident.subject})` +
        `${incident.fixedAt ? `, passing again at ${incident.fixedAt.slice(0, 8)}` : ", still failing at the newest"}` +
        `${incident.redHours === null ? "" : ` (red on main for ${incident.redHours} h)`}` +
        `; selected at introduction: ${incident.selectedAtIntroduction ? "yes" : "no"}; ` +
        `blocked merges: ${incident.blockedMerges}.`,
        `  \`${(incident.signature.split("\n").filter(Boolean).at(-1) ?? "").slice(0, 200).replace(/`/gu, "'")}\``);
    }
    for (const flake of summary.flakes) {
      lines.push(`- \`${summary.id}\`: flaky at ${flake.sha.slice(0, 8)}, attempt exits ${flake.statuses.join(", ")}.`);
    }
  }
  return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------- replay

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!["inventory", "run", "report"].includes(command)) {
    throw new Error("Usage: semantic_check_replay.mjs inventory|run|report [options]; see the file header.");
  }
  const options = {command, ref: "origin/main", commits: 200, every: 1, workers: 3, reruns: 2,
    timeout: 600, checks: null, workdir: null, "commits-from": null, out: null, results: null, json: null, markdown: null};
  const numeric = new Set(["commits", "every", "workers", "reruns", "timeout"]);
  for (let index = 0; index < rest.length; index += 1) {
    const flag = rest[index];
    if (!flag.startsWith("--")) throw new Error(`Unexpected argument ${flag}.`);
    const key = flag.slice(2);
    if (command === "inventory" && key === "json") { options.json = true; continue; }
    if (!(key in options) || key === "command") throw new Error(`Unknown option ${flag}.`);
    const value = rest[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`${flag} needs a value.`);
    index += 1;
    if (numeric.has(key)) {
      const number = Number(value);
      if (!Number.isInteger(number) || number < (key === "reruns" ? 0 : 1)) throw new Error(`${flag} must be a positive integer.`);
      options[key] = number;
    } else if (key === "checks") options.checks = value.split(",").map((id) => id.trim()).filter(Boolean);
    else options[key] = value;
  }
  if (command === "run" && !options.out) throw new Error("run needs --out <results.jsonl>.");
  if (command === "report" && !options.results) throw new Error("report needs --results <results.jsonl>.");
  return options;
}

/** The newest `commits` first-parent commits of ref, oldest first, every nth. */
export function replayWindow(git, {ref, commits, every}) {
  const shas = git(["rev-list", "--first-parent", `--max-count=${commits}`, ref]).trim().split("\n")
    .filter(Boolean).reverse();
  return shas.filter((_, index) => (shas.length - 1 - index) % every === 0);
}

const gitSync = (args, cwd = repoRoot) => {
  const result = spawnSync("git", args, {cwd, encoding: "utf8", maxBuffer: 256 << 20});
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr.trim()}`);
  return result.stdout;
};

function run(command, {cwd, timeoutMs, shell = true, args = []}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, args, {cwd, shell, detached: true,
      env: {...process.env, CI: "true", FORCE_COLOR: "0"}});
    let output = "";
    const keep = (chunk) => { output = (output + chunk).slice(-64 * 1024); };
    child.stdout.on("data", keep);
    child.stderr.on("data", keep);
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { process.kill(-child.pid, "SIGKILL"); } catch { /* already gone */ }
    }, timeoutMs);
    child.on("close", (status, signal) => {
      clearTimeout(timer);
      resolve({status: timedOut ? 124 : status ?? 1, signal: signal ?? null, timedOut,
        ms: Date.now() - started, tail: output.split("\n").filter(Boolean).slice(-15).join("\n")});
    });
  });
}

const LOCKFILES = ["package-lock.json", "functions/package-lock.json", "tool/impact/package-lock.json"];

function lockHash(dir) {
  const hash = crypto.createHash("sha256");
  for (const file of LOCKFILES) {
    const full = path.join(dir, file);
    hash.update(`${file}\0${fs.existsSync(full) ? fs.readFileSync(full) : ""}\0`);
  }
  return hash.digest("hex");
}

// What CI prepares before the tools lane: locked dependencies, the schema
// contract outputs (generate-contracts) and the Admin build modules
// (run.mjs generateBuildModules).
async function prepare(dir, sha, timeoutMs) {
  gitSync(["checkout", "--quiet", "--force", "--detach", sha], dir);
  // Ratchets compare with origin/main; in the queue that is the base, sha^.
  gitSync(["update-ref", "refs/remotes/origin/main", `${sha}^`], dir);
  gitSync(["clean", "-ffdxq", "-e", "node_modules"], dir);
  const marker = path.join(dir, "node_modules", ".replay-lock-hash");
  const hash = lockHash(dir);
  if (!fs.existsSync(marker) || fs.readFileSync(marker, "utf8") !== hash) {
    for (const install of ["npm ci --no-audit --no-fund",
      "npm --prefix functions ci --ignore-scripts --no-audit --no-fund",
      "npm ci --prefix tool/impact --no-audit --no-fund"]) {
      const result = await run(install, {cwd: dir, timeoutMs});
      if (result.status !== 0) return `${install} exited ${result.status}: ${result.tail}`;
    }
    fs.writeFileSync(marker, hash);
  }
  for (const step of ["node tool/contracts/generate_schema_contracts.mjs",
    "node tool/admin/generate_admin_action_catalog.mjs", "node admin/scripts/generateCallableValidators.mjs"]) {
    if (!fs.existsSync(path.join(dir, step.split(" ")[1]))) continue;
    const result = await run(step, {cwd: dir, timeoutMs});
    if (result.status !== 0) return `${step} exited ${result.status}: ${result.tail}`;
  }
  return null;
}

// The checks the queue's own runner, as of that commit, selects for it.
function selectionFor(dir, sha, timeoutMs) {
  const result = spawnSync("node", ["tool/run.mjs", "affected-tools", "--base", `${sha}^`, "--head", sha,
    "--mode", "merge_group", "--json"], {cwd: dir, encoding: "utf8", maxBuffer: 64 << 20, timeout: timeoutMs});
  if (result.status !== 0) return null;
  try {
    const plan = JSON.parse(result.stdout);
    return {full: plan.full === true, toolIds: new Set(plan.toolIds ?? [])};
  } catch {
    return null;
  }
}

async function replay(options) {
  const manifest = loadToolsManifest({root: repoRoot});
  const inventory = wholeRepoInventory(manifest).checks.filter((check) =>
    !options.checks || options.checks.includes(check.id));
  if (inventory.length === 0) throw new Error("No checks selected.");
  let window = replayWindow((args) => gitSync(args), options);
  if (options["commits-from"]) {
    const wanted = new Set(mergeRecords([fs.readFileSync(options["commits-from"], "utf8")]).map((record) => record.sha));
    window = window.filter((sha) => wanted.has(sha));
  }
  const done = new Set();
  if (fs.existsSync(options.out)) {
    for (const line of fs.readFileSync(options.out, "utf8").split("\n").filter(Boolean)) {
      const record = JSON.parse(line);
      done.add(`${record.sha} ${record.id}`);
    }
  }
  const pending = window.filter((sha) => inventory.some((check) => !done.has(`${sha} ${check.id}`)));
  const workdir = path.resolve(options.workdir ?? path.join(repoRoot, "build", "semantic-check-replay"));
  fs.mkdirSync(workdir, {recursive: true});
  const timeoutMs = options.timeout * 1000;
  const append = (record) => fs.appendFileSync(options.out, `${JSON.stringify(record)}\n`);
  console.error(`Replaying ${inventory.length} checks over ${pending.length} of ${window.length} commits ` +
    `with ${options.workers} workers.`);
  let next = 0;
  const worker = async (slot) => {
    const dir = path.join(workdir, `worker-${slot}`);
    if (!fs.existsSync(path.join(dir, ".git"))) {
      gitSync(["clone", "--quiet", "--shared", "--no-checkout", repoRoot, dir]);
    }
    while (next < pending.length) {
      const sha = pending[next++];
      const subject = gitSync(["log", "-1", "--format=%s", sha]).trim();
      const started = Date.now();
      const setupError = await prepare(dir, sha, timeoutMs);
      const selection = setupError ? null : selectionFor(dir, sha, timeoutMs);
      const commandsAt = toolsManifestAt(sha, {cwd: repoRoot});
      const toolsAt = new Map((commandsAt?.tools ?? []).map((tool) => [tool.id, tool]));
      for (const check of inventory) {
        if (done.has(`${sha} ${check.id}`)) continue;
        const tool = toolsAt.get(check.id);
        const base = {sha, subject, id: check.id};
        if (!tool || tool.status !== "active" || !tool.command) {
          append({...base, present: false});
          continue;
        }
        const selected = selection ? selection.full || selection.toolIds.has(check.id) : null;
        if (setupError) {
          append({...base, command: tool.command, selected, setupError, attempts: []});
          continue;
        }
        const attempts = [await run(tool.command, {cwd: dir, timeoutMs})];
        while (attempts.at(-1).status !== 0 && attempts.length <= options.reruns) {
          attempts.push(await run(tool.command, {cwd: dir, timeoutMs}));
        }
        append({...base, command: tool.command, selected, attempts});
      }
      console.error(`[worker ${slot}] ${sha.slice(0, 8)} ${((Date.now() - started) / 1000).toFixed(0)}s ` +
        `${setupError ? "setup failed" : "done"} (${next}/${pending.length})`);
    }
  };
  await Promise.all(Array.from({length: Math.min(options.workers, pending.length)}, (_, slot) => worker(slot)));
}

/** Records from each file; a later file's record for a commit and check replaces an earlier one. */
export function mergeRecords(texts) {
  const merged = new Map();
  for (const text of texts) {
    for (const line of text.split("\n").filter(Boolean)) {
      const record = JSON.parse(line);
      merged.set(`${record.sha} ${record.id}`, record);
    }
  }
  return [...merged.values()];
}

const loadRecords = (files) => mergeRecords(files.split(",").map((file) => fs.readFileSync(file, "utf8")));

function report(options) {
  const records = loadRecords(options.results);
  const shas = [...new Set(records.map((record) => record.sha))];
  // Oldest first, by first-parent order on the ref when the commits are known.
  let order = shas;
  try {
    const listed = gitSync(["rev-list", "--first-parent", "--max-count=2000", options.ref]).trim().split("\n").reverse();
    const known = listed.filter((sha) => shas.includes(sha));
    if (known.length === shas.length) order = known;
  } catch { /* keep file order */ }
  const times = new Map();
  try {
    for (const line of gitSync(["log", "--no-walk=unsorted", "--format=%H %ct", ...order]).trim().split("\n")) {
      const [sha, seconds] = line.split(" ");
      times.set(sha, Number(seconds));
    }
  } catch { /* durations stay unknown */ }
  const summaries = summarize(records, {order, timeOf: (sha) => times.get(sha) ?? null});
  const manifest = loadToolsManifest({root: repoRoot});
  const {checks} = wholeRepoInventory(manifest);
  const queueMap = queueRunMap(checks, {readWorkflow: (file) =>
    fs.readFileSync(path.join(repoRoot, ".github/workflows", file), "utf8")});
  const window = {ref: options.ref, commits: order.length, oldest: order[0], newest: order.at(-1)};
  const summary = {window, checks: summaries.map((entry) => ({...entry, verdict: verdictOf(entry),
    queue: queueMap[entry.id] ?? null}))};
  if (options.json) fs.writeFileSync(options.json, `${JSON.stringify(summary, null, 2)}\n`);
  const markdown = renderMarkdown(summaries, {queueMap, window});
  if (options.markdown) fs.writeFileSync(options.markdown, markdown);
  else process.stdout.write(markdown);
}

function inventoryCommand(options) {
  const manifest = loadToolsManifest({root: repoRoot});
  const inventory = wholeRepoInventory(manifest);
  const queueMap = queueRunMap(inventory.checks, {readWorkflow: (file) =>
    fs.readFileSync(path.join(repoRoot, ".github/workflows", file), "utf8")});
  if (options.json) {
    process.stdout.write(`${JSON.stringify({...inventory, checks: inventory.checks.map((check) =>
      ({...check, queue: queueMap[check.id]}))}, null, 2)}\n`);
    return;
  }
  for (const check of inventory.checks) {
    const where = queueMap[check.id];
    const gating = where.sites.filter((site) => site.gates).map((site) => site.lane);
    console.log(`${check.id.padEnd(46)} ${gating.length ? `gates: ${gating.join(", ")}` : "reports only"}`);
  }
  console.log(`\n${inventory.checks.length} whole-repo checks; ${inventory.excluded.length} excluded:`);
  for (const {id, reason} of inventory.excluded) console.log(`  ${id.padEnd(44)} ${reason}`);
}

async function main(argv) {
  const options = parseArgs(argv);
  if (options.command === "inventory") inventoryCommand(options);
  else if (options.command === "report") report(options);
  else await replay(options);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 64;
  });
}
