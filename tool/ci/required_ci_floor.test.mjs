import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {REPORTING_LANES, REQUIRED_CI_JOB, laneOfJob, sourceCiPasses} from "./required_ci_floor.mjs";

const run = {id: 5, run_attempt: 2, status: "completed", conclusion: "failure"};
const job = (name, conclusion = "success", extra = {}) => ({name, conclusion, status: "completed",
  run_id: run.id, run_attempt: run.run_attempt, ...extra});
const green = [job("plan / Plan affected targets"), job("marketing / Validate marketing website"),
  job("flutter / Unit & widget tests shard 1/4"), job(REQUIRED_CI_JOB), job("app-builds / Web build", "skipped")];

test("a whole-run success passes without reading jobs", () => {
  assert.equal(sourceCiPasses({run: {...run, conclusion: "success"}}), true);
});

test("Required CI success with failures only in reporting lanes passes (sprint floor)", () => {
  const jobs = [...green, job("tools / Tool checks (marketing-design)", "failure"),
    job("tools / Validate tool manifest and fast checks", "failure"), job("app-builds / iOS host simulator build", "failure"),
    job("operations / Operations checks", "cancelled"), job("docs-policy", "failure")];
  assert.equal(sourceCiPasses({run, jobs}), true);
});

test("Required CI failure, absence or ambiguity is refused", () => {
  const failed = green.map((entry) => entry.name === REQUIRED_CI_JOB ? {...entry, conclusion: "failure"} : entry);
  assert.equal(sourceCiPasses({run, jobs: failed}), false);
  assert.equal(sourceCiPasses({run, jobs: green.filter((entry) => entry.name !== REQUIRED_CI_JOB)}), false);
  assert.equal(sourceCiPasses({run, jobs: [...green, job(REQUIRED_CI_JOB)]}), false);
  const pending = green.map((entry) => entry.name === REQUIRED_CI_JOB ? {...entry, status: "in_progress", conclusion: null} : entry);
  assert.equal(sourceCiPasses({run, jobs: pending}), false);
});

test("a failure outside the reporting lanes is refused even when Required CI says success", () => {
  for (const name of ["flutter / Unit & widget tests shard 2/4", "marketing / Validate marketing website",
    "capture-freshness / Render and validate canonical iPhone captures", "Lint workflows", "toolsmith / x"]) {
    assert.equal(sourceCiPasses({run, jobs: [...green, job(name, "failure")]}), false, name);
  }
  assert.equal(sourceCiPasses({run, jobs: [...green, job("tools / Tool checks (core-audit)", null, {status: "in_progress"})]}), false);
});

test("other conclusions, unfinished runs, missing jobs and jobs from another attempt are refused", () => {
  for (const conclusion of ["cancelled", "timed_out", "startup_failure", "action_required", null]) {
    assert.equal(sourceCiPasses({run: {...run, conclusion}, jobs: green}), false, String(conclusion));
  }
  assert.equal(sourceCiPasses({run: {...run, status: "in_progress"}, jobs: green}), false);
  assert.throws(() => sourceCiPasses({run}), /Required CI result/u);
  assert.throws(() => sourceCiPasses({run, jobs: [...green, {...job(REQUIRED_CI_JOB), run_attempt: 1}]}), /own attempt/u);
});

test("lanes come from the reusable-workflow prefix of a job name", () => {
  assert.equal(laneOfJob("tools / Tool checks (affected)"), "tools");
  assert.equal(laneOfJob("docs-policy"), "docs-policy");
  assert.equal(laneOfJob(undefined), "");
});

test("the reporting lanes are exactly the lanes ci.yml's Required CI leaves out of its needs", () => {
  const ci = fs.readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8");
  const required = ci.slice(ci.indexOf("\n  required:\n"));
  assert.match(required, new RegExp(`name: ${REQUIRED_CI_JOB}\\n`, "u"));
  const reporting = required.match(/\[([^\]]*)\] as \$reporting/u)?.[1];
  assert.deepEqual(JSON.parse(`[${reporting}]`), [...REPORTING_LANES]);
  const needs = required.split(/^ {4}needs:\n/mu)[1].split(/^ {4}\S/mu)[0].match(/^ {6}- (\S+)$/gmu).map((line) => line.trim().slice(2));
  for (const lane of REPORTING_LANES) assert.ok(!needs.includes(lane), `${lane} must not gate Required CI`);
});
