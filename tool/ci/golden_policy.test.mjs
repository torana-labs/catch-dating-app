import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import {BASELINE_WORKFLOWS, CAPTURE_JOB, DRIFT_REPORTS, DRIFT_TITLE, FAILURE_TITLE, GOLDENS_JOB, MOBILE_BLOCK_JOBS,
  RELEASE_BLOCK_LABEL, decideDrift, decideFailure, owedFromFailureIssue, parseDrift, post, settleDecisions, suitesFromDriftIssue}
  from "./golden_policy.mjs";
import {fakeIssueApi, oldestOpen} from "../lib/github_issues.mjs";

const sha = "a".repeat(40);
const run = (extra = {}) => ({id: 7, html_url: "https://example.test/run/7", head_sha: sha, event: "push",
  head_branch: "main", ...extra});
const job = (name, conclusion) => ({name, conclusion, html_url: `https://example.test/job/${encodeURIComponent(name)}`});
const REUSE = "capture-freshness / Reuse validated canonical iPhone captures";
const workflow = (file) => fs.readFileSync(new URL(`../../.github/workflows/${file}`, import.meta.url), "utf8");

test("the blocking jobs are the real macOS goldens and capture render jobs", () => {
  const visual = YAML.parse(workflow("visual-integration-ci.yml")).jobs;
  const captures = YAML.parse(workflow("marketing-captures.yml")).jobs;
  const ci = YAML.parse(workflow("ci.yml")).jobs;
  assert.ok(ci["visual-integration"] && ci["capture-freshness"]);
  assert.equal(GOLDENS_JOB, `visual-integration / ${visual.goldens.name}`);
  assert.equal(CAPTURE_JOB, `capture-freshness / ${captures.export.name}`);
  assert.equal(REUSE, `capture-freshness / ${captures.reuse.name}`);
  assert.deepEqual(MOBILE_BLOCK_JOBS, [GOLDENS_JOB, CAPTURE_JOB]);
});

test("a golden or capture failure opens one release-blocking issue and dispatches nothing", () => {
  const decision = decideFailure({run: run(), jobs: [job(GOLDENS_JOB, "failure"), job("Required CI", "failure"),
    job(CAPTURE_JOB, "skipped")], openIssue: null});
  assert.equal(decision.action, "open");
  assert.equal(decision.title, FAILURE_TITLE);
  assert.equal(decision.label, RELEASE_BLOCK_LABEL);
  assert.equal(decision.dispatch, undefined, "a refresh is the wrong fix for a failure");
  assert.match(decision.body, /\[visual-integration \/ macOS goldens & Widgetbook determinism\]\(https:\/\/example\.test\/job\//u);
  assert.match(decision.body, /Release Readiness fails/u);
  assert.match(decision.body, /No commit is reverted automatically/u);
  assert.doesNotMatch(decision.body, /Required CI\]/u, "only the macOS jobs are listed");
  assert.deepEqual(owedFromFailureIssue([decision.body]), [GOLDENS_JOB]);
  // A further failure comments on the open issue and re-applies the label.
  const again = decideFailure({run: run({event: "schedule"}), jobs: [job(CAPTURE_JOB, "timed_out"), job(GOLDENS_JOB, "success")],
    openIssue: {number: 5}, owed: [GOLDENS_JOB]});
  assert.equal(again.action, "comment");
  assert.equal(again.issue, 5);
  assert.equal(again.label, RELEASE_BLOCK_LABEL);
  assert.deepEqual(owedFromFailureIssue([decision.body, again.body]), [CAPTURE_JOB], "the goldens passed again");
});

test("the failure issue closes only once every owed job passes again; a skipped job settles nothing", () => {
  const open = {number: 5};
  assert.deepEqual(decideFailure({run: run(), jobs: [job(GOLDENS_JOB, "skipped")], openIssue: open, owed: [GOLDENS_JOB]}),
    {action: "none", reason: "still_owed"});
  assert.deepEqual(decideFailure({run: run(), jobs: [job(GOLDENS_JOB, "success")], openIssue: open,
    owed: [GOLDENS_JOB, CAPTURE_JOB]}), {action: "none", reason: "still_owed"});
  const closed = decideFailure({run: run(), jobs: [job(GOLDENS_JOB, "success")], openIssue: open, owed: [GOLDENS_JOB]});
  assert.equal(closed.action, "close");
  assert.equal(closed.issue, 5);
  // A capture failure is settled by a later render, or a reuse of a validated render of the same inputs.
  assert.equal(decideFailure({run: run(), jobs: [job(CAPTURE_JOB, "skipped"), job(REUSE, "success")], openIssue: open,
    owed: [CAPTURE_JOB]}).action, "close");
  // An issue with no record owes both jobs.
  assert.deepEqual(decideFailure({run: run(), jobs: [job(GOLDENS_JOB, "success")], openIssue: open, owed: null}),
    {action: "none", reason: "still_owed"});
  assert.deepEqual(decideFailure({run: run(), jobs: [job(GOLDENS_JOB, "success")], openIssue: null}), {action: "none"});
});

test("only main's push and nightly runs count; other failures are not this issue's", () => {
  for (const extra of [{event: "pull_request"}, {event: "merge_group"}, {head_branch: "feature"}, {head_sha: "main"}]) {
    assert.deepEqual(decideFailure({run: run(extra), jobs: [job(GOLDENS_JOB, "failure")], openIssue: null}),
      {action: "none", reason: "not_main"}, JSON.stringify(extra));
  }
  assert.deepEqual(decideFailure({run: run(), jobs: [job("tools / Tool checks (lint-scanners)", "failure")], openIssue: null}),
    {action: "none"});
});

test("the drift reports parse per suite, deduplicated and sorted", () => {
  const drift = parseDrift({
    [DRIFT_REPORTS.app]: "baseline/b.png\t1.2000%\t0.30%\nbaseline/a.png\tno baseline\t0.30%\nbaseline/b.png\t1.2000%\t0.30%\n",
    [DRIFT_REPORTS.package]: "",
    [DRIFT_REPORTS.widgetbook]: "baseline/widgetbook/card.png\t0.9000%\t0.60%\n\n",
  });
  assert.deepEqual(drift, {
    app: [{golden: "baseline/a.png", change: "no baseline"}, {golden: "baseline/b.png", change: "1.2000%"}],
    widgetbook: [{golden: "baseline/widgetbook/card.png", change: "0.9000%"}],
  });
  assert.deepEqual(parseDrift({}), {});
});

test("drift opens the report-only issue and dispatches each drifted suite's baseline workflow at the commit", () => {
  const drift = parseDrift({[DRIFT_REPORTS.package]: "baseline/chip.png\t2.0000%\t0.30%\n",
    [DRIFT_REPORTS.app]: "baseline/a.png\t1.0000%\t0.30%\n"});
  const decision = decideDrift({run: run(), jobs: [job(GOLDENS_JOB, "success")], drift, openIssue: null});
  assert.equal(decision.action, "open");
  assert.equal(decision.title, DRIFT_TITLE);
  assert.equal(decision.label, undefined, "drift never blocks a release");
  assert.deepEqual(decision.dispatch, [{suite: "package", workflow: BASELINE_WORKFLOWS.package,
    inputs: {ref: sha, name_pattern: "."}}]);
  assert.match(decision.body, /Report only/u);
  assert.match(decision.body, /`baseline\/chip\.png` \(2\.0000%\)/u);
  assert.match(decision.body, /app goldens .* have no baseline workflow/u);
  assert.deepEqual(suitesFromDriftIssue([decision.body]), ["app", "package"]);
});

test("drift dispatches again only for a newly drifted suite, and closes when the goldens match", () => {
  const open = {number: 8};
  const both = parseDrift({[DRIFT_REPORTS.package]: "x.png\t1%\t0.30%\n", [DRIFT_REPORTS.widgetbook]: "y.png\t1%\t0.60%\n"});
  assert.deepEqual(decideDrift({run: run(), jobs: [job(GOLDENS_JOB, "success")], drift: {package: both.package},
    openIssue: open, reported: ["package"]}), {action: "none", reason: "already_reported"});
  const grown = decideDrift({run: run(), jobs: [job(GOLDENS_JOB, "success")], drift: both, openIssue: open, reported: ["package"]});
  assert.equal(grown.action, "comment");
  assert.deepEqual(grown.dispatch.map((entry) => entry.workflow), [BASELINE_WORKFLOWS.widgetbook]);
  assert.equal(decideDrift({run: run(), jobs: [job(GOLDENS_JOB, "success")], drift: {}, openIssue: open}).action, "close");
  assert.deepEqual(decideDrift({run: run(), jobs: [job(GOLDENS_JOB, "success")], drift: {}, openIssue: null}), {action: "none"});
  // A failed or skipped goldens job says nothing about drift.
  for (const conclusion of ["failure", "skipped"]) {
    assert.deepEqual(decideDrift({run: run(), jobs: [job(GOLDENS_JOB, conclusion)], drift: both, openIssue: open}),
      {action: "none", reason: "goldens_not_passed"});
  }
  assert.deepEqual(decideDrift({run: run({event: "pull_request"}), jobs: [job(GOLDENS_JOB, "success")], drift: both,
    openIssue: null}), {action: "none", reason: "not_main"});
});

test("the issue records ignore malformed posts and keep the latest valid one", () => {
  const owed = (jobs) => `<!-- golden-failure-owed ${JSON.stringify({jobs})} -->`;
  assert.deepEqual(owedFromFailureIssue([owed([GOLDENS_JOB]), "<!-- golden-failure-owed {oops} -->", owed([CAPTURE_JOB])]),
    [CAPTURE_JOB]);
  assert.deepEqual(owedFromFailureIssue([owed([GOLDENS_JOB]), "<!-- golden-failure-owed {\"jobs\":[1]} -->"]), [GOLDENS_JOB]);
  assert.equal(owedFromFailureIssue(["no record"]), null);
  assert.equal(suitesFromDriftIssue([null, ""]), null);
});

test("the main entry labels the failure issue and dispatches main's baseline workflow with the drifted commit", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "golden-policy-"));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const reports = path.join(root, "reports");
  fs.mkdirSync(reports);
  fs.writeFileSync(path.join(reports, DRIFT_REPORTS.widgetbook), "baseline/widgetbook/card.png\t0.9000%\t0.60%\n");
  const zip = path.join(root, "drift.zip");
  assert.equal(spawnSync("zip", ["-q", "-j", zip, path.join(reports, DRIFT_REPORTS.widgetbook)]).status, 0);
  const log = path.join(root, "calls.jsonl");
  const bin = path.join(root, "bin");
  fs.mkdirSync(bin);
  // The goldens passed with drift; the capture render failed.
  const state = {
    run: run(),
    jobs: [job(GOLDENS_JOB, "success"), job(CAPTURE_JOB, "failure"), job("Required CI", "failure")],
    artifacts: [{id: 3, name: "flutter-golden-failures-7", expired: false}, {id: 4, name: "golden-drift-7-1", expired: false}],
  };
  fs.writeFileSync(path.join(bin, "gh"), `#!/usr/bin/env node
const fs = require("fs");
const args = process.argv.slice(2);
let input = "";
try { input = fs.readFileSync(0, "utf8"); } catch {}
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({args, input}) + "\\n");
const state = ${JSON.stringify(state)};
const endpoint = args.find((arg) => arg.startsWith("repos/"));
const method = args.includes("-X") ? args[args.indexOf("-X") + 1] : "GET";
if (method === "GET" && endpoint === "repos/owner/repo/actions/runs/7") console.log(JSON.stringify(state.run));
else if (method === "GET" && endpoint.startsWith("repos/owner/repo/actions/runs/7/jobs")) console.log(JSON.stringify([{jobs: state.jobs}]));
else if (method === "GET" && endpoint.startsWith("repos/owner/repo/issues?")) console.log("[]");
else if (method === "GET" && endpoint.startsWith("repos/owner/repo/actions/runs/7/artifacts")) console.log(JSON.stringify([{artifacts: state.artifacts}]));
else if (method === "GET" && endpoint === "repos/owner/repo/actions/artifacts/4/zip") process.stdout.write(fs.readFileSync(${JSON.stringify(zip)}));
else if (method === "GET" && endpoint.startsWith("repos/owner/repo/labels/")) process.exit(1);
// No newer head run: nothing to settle.
else if (method === "GET" && endpoint.startsWith("repos/owner/repo/actions/workflows/")) console.log(JSON.stringify({workflow_runs: []}));
else if (method === "POST" && endpoint.endsWith("/dispatches")) {
  if (args.includes("return_run_details=true")) process.exit(1); // An API that refuses the field.
}
else if (method === "POST") console.log("{}");
else process.exit(2);
`, {mode: 0o755});
  const result = spawnSync(process.execPath, [new URL("./golden_policy.mjs", import.meta.url).pathname], {encoding: "utf8",
    env: {...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, GITHUB_REPOSITORY: "owner/repo", RUN_ID: "7"}});
  assert.equal(result.status, 0, result.stderr);
  const calls = fs.readFileSync(log, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  const posts = calls.filter((call) => call.args.includes("POST"));
  const label = posts.find((call) => call.args.includes("repos/owner/repo/labels"));
  assert.ok(label?.args.includes(`name=${RELEASE_BLOCK_LABEL}`), "the missing label is created");
  const issues = posts.filter((call) => call.args.includes("repos/owner/repo/issues"));
  assert.equal(issues.length, 2);
  const failure = issues.find((call) => call.args.includes(`title=${FAILURE_TITLE}`));
  assert.ok(failure.args.includes(`labels[]=${RELEASE_BLOCK_LABEL}`));
  const drift = issues.find((call) => call.args.includes(`title=${DRIFT_TITLE}`));
  assert.ok(!drift.args.some((arg) => arg.startsWith("labels[]")), "drift is not release-blocking");
  const dispatches = posts.filter((call) => call.args.some((arg) => arg.endsWith("/dispatches")));
  assert.equal(dispatches.length, 2, "one refused attempt with run details, then the plain dispatch");
  const plain = dispatches[1].args;
  assert.ok(plain.includes(`repos/owner/repo/actions/workflows/${BASELINE_WORKFLOWS.widgetbook}/dispatches`));
  assert.ok(plain.includes("ref=main") && plain.includes(`inputs[ref]=${sha}`) && plain.includes("inputs[name_pattern]=."));
  assert.match(drift.input, /widgetbook: `widgetbook-golden-baselines\.yml`: https:\/\/github\.com\/owner\/repo\/actions\/workflows\/widgetbook-golden-baselines\.yml/u);
  assert.doesNotMatch(drift.input, /\{\{/u, "every dispatch placeholder is filled");
});

test("the baseline workflows stay dispatch-only and take the commit and pattern the policy sends", () => {
  for (const file of Object.values(BASELINE_WORKFLOWS)) {
    const parsed = YAML.parse(workflow(file));
    assert.deepEqual(Object.keys(parsed.on), ["workflow_dispatch"], file);
    assert.deepEqual(Object.keys(parsed.on.workflow_dispatch.inputs).sort(), ["name_pattern", "ref"], file);
    assert.deepEqual(parsed.permissions, {contents: "read"}, file);
  }
});

test("the dispatched nightly is treated exactly as the scheduled nightly was; a plain full dispatch is not main's", () => {
  const scheduled = run({event: "schedule", display_title: "CI"});
  const nightly = run({event: "workflow_dispatch", display_title: "CI nightly"});
  const full = run({event: "workflow_dispatch", display_title: "CI"});
  const failing = [job(GOLDENS_JOB, "failure"), job(CAPTURE_JOB, "success")];
  const passing = [job(GOLDENS_JOB, "success"), job(CAPTURE_JOB, "success")];
  const drift = {package: [{file: "baseline/button_family.dark.png", diff: "0.5000%"}]};
  for (const [label, decide] of [
    ["failure opens", (subject) => decideFailure({run: subject, jobs: failing, openIssue: null})],
    ["failure closes", (subject) => decideFailure({run: subject, jobs: passing, openIssue: {number: 3}, owed: [GOLDENS_JOB]})],
    ["drift opens", (subject) => decideDrift({run: subject, jobs: passing, drift, openIssue: null})],
    ["no drift closes", (subject) => decideDrift({run: subject, jobs: passing, drift: {}, openIssue: {number: 4}})],
  ]) {
    const before = decide(scheduled);
    assert.notEqual(before.action, "none", label);
    assert.deepEqual(decide(nightly), before, label);
    assert.deepEqual(decide(full), {action: "none", reason: "not_main"}, label);
  }
});

test("two runs racing to open the golden failure issue leave one labelled issue, and a close racing it settles to the head", () => {
  const failing = [job(GOLDENS_JOB, "failure"), job(CAPTURE_JOB, "success")];
  let race = null;
  const fake = fakeIssueApi({between: (name) => {
    if (name === "create" && race) {
      const write = race;
      race = null;
      write();
    }
  }});
  const first = decideFailure({run: run({id: 1}), jobs: failing, openIssue: null});
  const second = decideFailure({run: run({id: 2}), jobs: failing, openIssue: null});
  race = () => post(fake.api, second);
  post(fake.api, first);
  const open = fake.state.issues.filter((issue) => issue.state === "open");
  assert.deepEqual(open.map((issue) => [issue.number, issue.labels]), [[1, [RELEASE_BLOCK_LABEL]]]);
  // A green head whose own alert read before the open: the older run settles to it and closes the issue.
  const passing = [job(GOLDENS_JOB, "success"), job(CAPTURE_JOB, "success")];
  const openIssue = oldestOpen(fake.api.listOpen(), FAILURE_TITLE);
  const head = run({id: 3, html_url: "https://example.test/run/3"});
  const settled = settleDecisions({
    failure: decideFailure({run: head, jobs: passing, openIssue, owed: owedFromFailureIssue(fake.api.texts(openIssue))}),
    drift: decideDrift({run: head, jobs: passing, drift: {}, openIssue: null})}, head);
  assert.deepEqual([settled.failure.action, settled.drift.action], ["close", "none"]);
  post(fake.api, settled.failure);
  assert.equal(fake.state.issues.filter((issue) => issue.state === "open").length, 0);
  assert.match(fake.state.issues[0].comments.at(-1), /^Settled to the latest main run \(https:\/\/example\.test\/run\/3\)/u);
  // A failing head that only comments is the head's own post, never repeated; a drift open is never settled.
  const comment = settleDecisions({failure: {action: "comment", issue: 1, body: "x"}, drift: {action: "open", body: "y"}}, head);
  assert.deepEqual([comment.failure.action, comment.drift.action], ["none", "none"]);
});
