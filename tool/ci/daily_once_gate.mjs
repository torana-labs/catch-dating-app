#!/usr/bin/env node
// Once-a-day gate for report-only daily workflows (RE decision, 24 Nov 2026).
// GitHub starts this repository's scheduled runs 7.5-10.6 hours late, so the
// Test read map and Proof reuse daily also wake after each push CI run on
// main. This decides whether a wake does the day's work: a manual dispatch
// always does; a schedule or workflow_run wake does only when the day's
// artifact does not exist yet (and, with --not-before-hour, only from that UTC
// hour, so a roll-up of the previous day waits for its last queue runs).
//
//   node tool/ci/daily_once_gate.mjs --artifact <name> [--not-before-hour <0-23>]
//
// Needs GH_TOKEN, GITHUB_REPOSITORY and GITHUB_EVENT_NAME; writes run=true|false
// and reason=<text> to GITHUB_OUTPUT. Reads the Actions API, writes nothing.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import {fileURLToPath} from "node:url";

/**
 * Whether this wake does the day's work. Pure, so every case is testable.
 *
 * @param {object} input
 * @param {string} input.event GITHUB_EVENT_NAME.
 * @param {Array<{name:string, expired:boolean}>} input.artifacts Artifacts named as the day's output.
 * @param {number} input.now Milliseconds since the epoch.
 * @param {number} [input.notBeforeHour] The first UTC hour a scheduled or workflow_run wake may work.
 * @returns {{run:boolean, reason:string}}
 */
export function decideDailyRun({event, artifacts, now, notBeforeHour = 0}) {
  if (event === "workflow_dispatch") return {run: true, reason: "dispatched by hand"};
  assert.ok(["schedule", "workflow_run"].includes(event), `Unexpected event ${event}`);
  const hour = new Date(now).getUTCHours();
  if (hour < notBeforeHour) return {run: false, reason: `before ${notBeforeHour}:00 UTC`};
  const done = artifacts.filter((artifact) => !artifact.expired);
  if (done.length) return {run: false, reason: `${done[0].name} already exists`};
  return {run: true, reason: "no run has produced today's artifact yet"};
}

function parseArgs(argv) {
  const args = {notBeforeHour: 0};
  for (let index = 0; index < argv.length; index += 2) {
    const [flag, value] = [argv[index], argv[index + 1]];
    assert.ok(value, `${flag} needs a value`);
    if (flag === "--artifact") args.artifact = value;
    else if (flag === "--not-before-hour") args.notBeforeHour = Number(value);
    else throw new Error(`Unknown argument: ${flag}`);
  }
  assert.match(args.artifact ?? "", /^[\w.-]+$/u, "--artifact needs an artifact name");
  assert.ok(Number.isInteger(args.notBeforeHour) && args.notBeforeHour >= 0 && args.notBeforeHour < 24,
    "--not-before-hour must be 0-23");
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = process.env.GITHUB_REPOSITORY;
  assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/u, "GITHUB_REPOSITORY is required");
  const listed = spawnSync("gh", ["api", `repos/${repository}/actions/artifacts?name=${args.artifact}&per_page=100`],
    {encoding: "utf8", maxBuffer: 16 * 1024 * 1024});
  assert.equal(listed.status, 0, listed.stderr);
  const artifacts = (JSON.parse(listed.stdout).artifacts ?? []).filter((artifact) => artifact.name === args.artifact);
  const decision = decideDailyRun({event: process.env.GITHUB_EVENT_NAME, artifacts, now: Date.now(),
    notBeforeHour: args.notBeforeHour});
  console.log(`${decision.run ? "Run" : "Skip"}: ${decision.reason}`);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `run=${decision.run}\nreason=${decision.reason}\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
