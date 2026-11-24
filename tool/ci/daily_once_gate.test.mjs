import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {decideDailyRun} from "./daily_once_gate.mjs";

const script = fileURLToPath(new URL("./daily_once_gate.mjs", import.meta.url));
const at = (iso) => Date.parse(iso);
const artifact = (name, expired = false) => ({name, expired});

test("the first wake of the day works; later wakes find the artifact and skip", () => {
  const now = at("2026-11-24T00:40:00Z");
  for (const event of ["workflow_run", "schedule"]) {
    assert.deepEqual(decideDailyRun({event, artifacts: [], now}), {run: true, reason: "no run has produced today's artifact yet"});
    assert.deepEqual(decideDailyRun({event, artifacts: [artifact("test-read-map-day-2026-11-24")], now}),
      {run: false, reason: "test-read-map-day-2026-11-24 already exists"});
  }
  // An expired artifact is gone: the day's work is owed again.
  assert.equal(decideDailyRun({event: "schedule", artifacts: [artifact("x", true)], now}).run, true);
});

test("a dispatch always works, whatever exists and whatever the hour", () => {
  assert.deepEqual(decideDailyRun({event: "workflow_dispatch", artifacts: [artifact("x")], now: at("2026-11-24T00:10:00Z"),
    notBeforeHour: 2}), {run: true, reason: "dispatched by hand"});
});

test("--not-before-hour holds early wakes back so the previous day can settle", () => {
  const early = decideDailyRun({event: "workflow_run", artifacts: [], now: at("2026-11-24T01:59:59Z"), notBeforeHour: 2});
  assert.deepEqual(early, {run: false, reason: "before 2:00 UTC"});
  assert.equal(decideDailyRun({event: "workflow_run", artifacts: [], now: at("2026-11-24T02:00:00Z"), notBeforeHour: 2}).run, true);
  assert.throws(() => decideDailyRun({event: "push", artifacts: [], now: 0}), /Unexpected event push/u);
});

test("the CLI asks the Actions API for the exact artifact name and writes its outputs", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "daily-gate-"));
  try {
    const bin = path.join(dir, "bin");
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, "gh"), `#!/usr/bin/env node
const endpoint = process.argv.at(-1);
require("node:fs").appendFileSync(${JSON.stringify(path.join(dir, "calls"))}, endpoint + "\\n");
const exists = endpoint.includes("name=proof-reuse-daily-2026-11-23&");
console.log(JSON.stringify({artifacts: exists ? [{name: "proof-reuse-daily-2026-11-23", expired: false},
  {name: "proof-reuse-daily-2026-11-23-other", expired: false}] : [{name: "near-miss", expired: false}]}));
`, {mode: 0o755});
    const run = (name, event) => {
      const output = path.join(dir, `out-${name}`);
      const result = spawnSync(process.execPath, [script, "--artifact", name], {encoding: "utf8",
        env: {...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, GITHUB_REPOSITORY: "example-org/example-repo",
          GITHUB_EVENT_NAME: event, GITHUB_OUTPUT: output}});
      assert.equal(result.status, 0, result.stderr);
      return fs.readFileSync(output, "utf8");
    };
    assert.match(run("proof-reuse-daily-2026-11-23", "schedule"), /^run=false\nreason=proof-reuse-daily-2026-11-23 already exists\n$/u);
    // Only an exact name counts.
    assert.match(run("test-read-map-day-2026-11-24", "workflow_run"), /^run=true\n/u);
    assert.deepEqual(fs.readFileSync(path.join(dir, "calls"), "utf8").trim().split("\n"), [
      "repos/example-org/example-repo/actions/artifacts?name=proof-reuse-daily-2026-11-23&per_page=100",
      "repos/example-org/example-repo/actions/artifacts?name=test-read-map-day-2026-11-24&per_page=100",
    ]);
    const bad = spawnSync(process.execPath, [script, "--artifact", "a b"], {encoding: "utf8"});
    assert.notEqual(bad.status, 0);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
