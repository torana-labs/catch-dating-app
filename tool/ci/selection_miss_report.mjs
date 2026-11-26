#!/usr/bin/env node
// Checks the pull request test selection against the nightly full run. Pull
// requests run only the Functions unit and emulator tests their change can
// reach (tool/lib/functions_test_selection.mjs); the nightly runs them all.
// When a nightly Functions test fails, this asks whether the narrow selection
// would have run that test for any commit since the last green nightly. A
// failing test that no commit selected is a possible selector gap: the pull
// request that broke it got no warning before the merge queue. Each such
// nightly opens, or comments on, one "Test selection missed a failing test"
// issue. Report-only: it runs after the nightly in the Main CI alert workflow
// and never changes the nightly's result.
//
// Usage (Main CI alert workflow, selection-miss job): GH_TOKEN, GITHUB_REPOSITORY,
// RUN_ID set; needs `npm ci --prefix tool/impact` and main's history.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import {createRequire} from "node:module";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {isNightlyRun, nightlyRuns} from "./ci_nightly.mjs";

export const ISSUE_TITLE = "Test selection missed a failing test";
// Nightlies are daily, so a day of merges fits well within this; older or
// unknown green nightlies check only the newest commits.
export const COMMIT_LIMIT = 150;
const FOOTER = "\n\n---\n_Posted by the Main CI alert workflow (tool/ci/selection_miss_report.mjs)._";
const LANES = {unit: "Functions unit", emulator: "emulator"};

/** A test file path from a CI report, named as the selector lists it (relative to functions/). */
export function testId(file) {
  const match = /^.*\/functions\/((?:lib|test|scripts)\/.+)$/u.exec(String(file).replaceAll("\\", "/"));
  return match ? match[1] : null;
}

const decode = (value) => value.replace(/&(quot|apos|lt|gt|amp);/gu,
  (_, name) => ({quot: "\"", apos: "'", lt: "<", gt: ">", amp: "&"})[name]);

/** The files of the failing testcases in a node --test JUnit report. */
export function failingUnitTests(junit) {
  const failing = new Set();
  for (const [, attributes] of String(junit).matchAll(/<testcase\b([^>]*)>/gu)) {
    const attrs = Object.fromEntries([...attributes.matchAll(/([\w:-]+)="([^"]*)"/gu)]
      .map(([, name, value]) => [name, decode(value)]));
    if (!Object.hasOwn(attrs, "failure")) continue;
    const id = attrs.file ? testId(attrs.file) : null;
    if (id) failing.add(id);
  }
  return [...failing].sort();
}

/** The files with failed tests in a backend-integration-execution evidence file. */
export function failingEmulatorTests(evidence) {
  return [...new Set((evidence?.executed ?? []).filter((entry) => entry.status === "fail")
    .map((entry) => testId(entry.file)).filter(Boolean))].sort();
}

const selects = (selection, test) => selection?.mode === "full" || (selection?.tests ?? []).includes(test);

/**
 * The tests any of several changes would select. The selector decides each
 * changed path on its own (a full-run reason, or tests to add) and adds the
 * import closure of all changed sources, so selecting the union of the paths
 * is the union of each change's selection, at one selector call instead of
 * one per commit (about 20 seconds each).
 */
export function unionSelection(select, changes) {
  return select([...new Set(changes.flat())].sort());
}

/**
 * What to report for a failed nightly. Pure, so every case is testable.
 *
 * @param {object} input
 * @param {{html_url:string, head_sha:string}} input.run The nightly CI run.
 * @param {Array<{lane:"unit"|"emulator", test:string}>} input.failures Its failing Functions test files.
 * @param {{base:string|null, truncated:boolean, commits:Array<{sha:string, subject:string}>,
 *   unit:{mode:string, tests:string[]}, emulator:{mode:string, tests:string[]}}} input.range
 *   main's commits since the last green nightly, newest first, and each lane's tests that the pull request
 *   selection of at least one of those commits would run.
 * @param {{number:number}|null} input.openIssue The open miss issue, if any.
 */
export function decideSelectionMiss({run, failures, range, openIssue}) {
  assert.match(String(run?.head_sha ?? ""), /^[0-9a-f]{40}$/u, "A nightly run names its commit");
  if (failures.length === 0) return {action: "none", reason: "no Functions test failed"};
  // With no commit since the last green nightly the repository did not
  // change, so no selection could have helped: it is drift or a flake.
  if (range.commits.length === 0) return {action: "none", reason: "no commit since the last green nightly"};
  const missed = failures.filter(({lane, test}) => !selects(range[lane], test));
  if (missed.length === 0) {
    return {action: "none", reason: `every failing test was selected by a commit since the last green nightly (${failures.length})`};
  }
  const short = (sha) => sha.slice(0, 8);
  const span = range.base ? `${short(range.base)}..${short(run.head_sha)}` : `the newest ${range.commits.length} up to ${short(run.head_sha)}`;
  const body = [
    `The nightly CI at ${short(run.head_sha)} failed ${failures.length} Functions test file(s): ${run.html_url}`,
    "",
    `The pull request selection would not have run ${missed.length} of them for any of the ${range.commits.length} ` +
      `commit(s) since the last green nightly (${span}):`,
    "",
    ...missed.map(({lane, test}) => `- \`${test}\` (${LANES[lane]})`),
    ...(failures.length > missed.length ?
      ["", `${failures.length - missed.length} other failing test file(s) were selected by at least one of those commits.`] : []),
    ...(range.truncated ? ["", `The last green nightly is older than ${COMMIT_LIMIT} commits or unknown, so only the newest ${range.commits.length} were checked.`] : []),
    "",
    "The merge queue runs every test, so a failure here is either a pull request that got no warning before it queued, " +
      "or a flake or drift outside the repository (dates, dependencies, the emulator). Rerun the test before treating it as a selector gap.",
    "",
    "To see what a commit selected, and why: `node tool/impact/functions_unit_test_selection.mjs --base <sha>^ --head <sha> --explain` " +
      "(unit) or `node tool/impact/emulator_test_selection.mjs --base <sha>^ --head <sha>` (emulator).",
  ].join("\n") + FOOTER;
  return openIssue ? {action: "comment", issue: openIssue.number, body, missed} : {action: "open", title: ISSUE_TITLE, body, missed};
}

function sh(command, args, options = {}) {
  const result = spawnSync(command, args, {encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...options});
  assert.equal(result.status, 0, result.stderr || `${command} ${args.join(" ")} failed`);
  return result.stdout;
}
const gh = (args, input) => sh("gh", args, {input});

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.RUN_ID;
  assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/u, "GITHUB_REPOSITORY is required");
  assert.match(runId ?? "", /^[1-9][0-9]*$/u, "RUN_ID is required");
  const nightly = JSON.parse(gh(["api", `repos/${repository}/actions/runs/${runId}`]));
  assert.ok(isNightlyRun(nightly), "Only the nightly run is checked");

  // The reports of the run's latest attempt.
  const attempt = nightly.run_attempt;
  const artifacts = JSON.parse(gh(["api", "--paginate", "--slurp", `repos/${repository}/actions/runs/${runId}/artifacts?per_page=100`]))
    .flatMap((page) => page.artifacts ?? []).filter((artifact) => !artifact.expired)
    .map((artifact) => artifact.name)
    .filter((name) => name === `functions-unit-junit-${runId}-${attempt}` ||
      name.startsWith(`backend-integration-execution-${runId}-${attempt}-`));
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "selection-miss-"));
  const failures = [];
  for (const name of artifacts) {
    const target = path.join(directory, name);
    gh(["run", "download", runId, "--repo", repository, "--name", name, "--dir", target]);
    for (const file of fs.readdirSync(target)) {
      const text = fs.readFileSync(path.join(target, file), "utf8");
      if (name.startsWith("functions-unit-junit-")) {
        failures.push(...failingUnitTests(text).map((test) => ({lane: "unit", test})));
      } else {
        failures.push(...failingEmulatorTests(JSON.parse(text)).map((test) => ({lane: "emulator", test})));
      }
    }
  }
  const unique = [...new Map(failures.map((failure) => [`${failure.lane}:${failure.test}`, failure])).values()];
  console.log(`Nightly ${runId} (attempt ${attempt}): ${artifacts.length} report(s), ${unique.length} failing Functions test file(s).`);

  let range = {base: null, truncated: false, commits: []};
  if (unique.length > 0) range = await commitSelections(repository, nightly);
  const issues = JSON.parse(gh(["api", `repos/${repository}/issues?state=open&creator=github-actions%5Bbot%5D&per_page=100`]));
  const openIssue = issues.find((issue) => issue.title === ISSUE_TITLE && !issue.pull_request) ?? null;
  const decision = decideSelectionMiss({run: nightly, failures: unique, range, openIssue});
  if (decision.action === "open") {
    gh(["api", "-X", "POST", `repos/${repository}/issues`, "-f", `title=${decision.title}`, "-F", "body=@-"], decision.body);
  } else if (decision.action === "comment") {
    gh(["api", "-X", "POST", `repos/${repository}/issues/${decision.issue}/comments`, "-F", "body=@-"], decision.body);
  }
  console.log(`Selection miss report: ${decision.action}${decision.reason ? ` (${decision.reason})` : ""}` +
    `${decision.missed ? `: ${decision.missed.map(({test}) => test).join(", ")}` : ""}`);
}

/** main's commits since the last green nightly, each with both lanes' pull request selection. */
async function commitSelections(repository, nightly) {
  const {repoRoot} = await import("../lib/repo_paths.mjs");
  const greens = nightlyRuns((endpoint) => JSON.parse(gh(["api", endpoint])), repository, "status=success&per_page=30");
  const green = greens.find((candidate) => candidate.created_at < nightly.created_at &&
    spawnSync("git", ["merge-base", "--is-ancestor", candidate.head_sha, nightly.head_sha], {cwd: repoRoot}).status === 0);
  return selectionsSince({base: green?.head_sha ?? null, head: nightly.head_sha});
}

/**
 * The first-parent commits in base..head (the newest COMMIT_LIMIT of head's
 * history when base is null), newest first, and the tests each lane's pull
 * request selection would run for at least one of them.
 */
export async function selectionsSince({base, head}) {
  const {selectEmulatorTests} = await import("../lib/functions_test_selection.mjs");
  const {discoverableFunctionsTests, functionsModules, functionsRoot, readFunctionsSource} =
    await import("../lib/functions_module_graph.mjs");
  const {repoRoot} = await import("../lib/repo_paths.mjs");
  const git = (...args) => sh("git", args, {cwd: repoRoot});
  const listed = git("rev-list", "--first-parent", `--max-count=${COMMIT_LIMIT + 1}`, base ? `${base}..${head}` : head)
    .split("\n").filter(Boolean);
  const truncated = !base || listed.length > COMMIT_LIMIT;

  // Today's graph and sources for every commit, as the replay
  // (tool/impact/selection_replay.mjs) does; the emulator lane's own graph
  // leaves out scripts/, which emulator tests do not import.
  const {modules} = await functionsModules();
  const lists = {
    unit: discoverableFunctionsTests(),
    emulator: createRequire(import.meta.url)(path.join(functionsRoot, "scripts/run-tests.cjs")).listedStrictTests(functionsRoot),
  };
  const sources = new Map();
  const readSource = (file) => {
    if (!sources.has(file)) sources.set(file, readFunctionsSource(file));
    return sources.get(file);
  };
  const changes = [];
  const commits = listed.slice(0, COMMIT_LIMIT).map((sha) => {
    const [, parent] = git("rev-list", "--parents", "-n", "1", sha).trim().split(" ");
    // A root commit has no parent to compare with: it changes package.json,
    // which selects every test.
    changes.push(parent ? git("diff", "--name-only", parent, sha).split("\n").filter(Boolean) : ["functions/package.json"]);
    return {sha, subject: git("log", "-1", "--format=%s", sha).trim()};
  });
  const selectFor = (listedTests) => unionSelection((changedPaths) =>
    selectEmulatorTests({changedPaths, listed: listedTests, modules, readSource}), changes);
  console.log(`Checked ${commits.length} commit(s) since ${base ? base.slice(0, 8) : "an unknown green nightly"}.`);
  return {base, truncated, commits, unit: selectFor(lists.unit), emulator: selectFor(lists.emulator)};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
