import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {PIPELINE_FILES, decide, heldFiles, istLabel, lastLargeDeploy, message} from "./deploy_window.mjs";

const lastLarge = "2026-11-07T13:15:00Z";
const pipelineChange = ["docs/release_operations.md", "functions/package.json", ".github/workflows/backend-deploy.yml"];

test("only deploy pipeline files are held", () => {
  assert.deepEqual(heldFiles(pipelineChange), [".github/workflows/backend-deploy.yml", "functions/package.json"]);
  assert.deepEqual(heldFiles(["functions/src/index.ts", "functions/package.json.bak", ".github/workflows/ci.yml"]), []);
  assert.deepEqual(heldFiles(PIPELINE_FILES), PIPELINE_FILES);
});

test("pipeline files merge from 24 hours before the window opens, and not a second earlier", () => {
  const before = decide({files: pipelineChange, lastLarge, now: "2026-11-13T13:14:59Z"});
  assert.equal(before.pass, false);
  assert.equal(before.windowOpensAt, "2026-11-14T13:15:00.000Z");
  assert.equal(before.mergeFrom, "2026-11-13T13:15:00.000Z");
  assert.match(message(before), /may merge from 13 Nov 2026 18:45 IST \(2026-11-13T13:15:00\.000Z\)/u);
  assert.match(message(before), /window opens at 14 Nov 2026 18:45 IST/u);
  assert.match(message(before), /- functions\/package\.json/u);
  assert.equal(decide({files: pipelineChange, lastLarge, now: "2026-11-13T13:15:00Z"}).pass, true);
  assert.equal(decide({files: pipelineChange, lastLarge, now: "2026-11-20T00:00:00Z"}).pass, true);
});

test("other changes always pass, and with no recorded deploy the window is open", () => {
  assert.equal(decide({files: ["functions/src/index.ts"], lastLarge, now: "2026-11-08T00:00:00Z"}).pass, true);
  assert.equal(decide({files: pipelineChange, lastLarge: null, now: "2026-11-08T00:00:00Z"}).pass, true);
  assert.throws(() => decide({files: pipelineChange, lastLarge, now: "soon"}), /not a time/u);
});

test("the last large deploy is the recorded one, else the deployment's creation time", () => {
  const created = {created_at: lastLarge};
  assert.equal(lastLargeDeploy({...created, payload: {version: 1, largeDeployAt: "2026-11-10T00:00:00Z"}}),
    "2026-11-10T00:00:00Z");
  assert.equal(lastLargeDeploy({...created, payload: JSON.stringify({largeDeployAt: "2026-11-10T00:00:00Z"})}),
    "2026-11-10T00:00:00Z", "GitHub may hand the payload back as a JSON string");
  for (const payload of [{version: 1}, "", "not json", {largeDeployAt: "soon"}, null]) {
    assert.equal(lastLargeDeploy({...created, payload}), lastLarge, JSON.stringify(payload));
  }
  assert.throws(() => lastLargeDeploy({payload: {}}), /neither largeDeployAt nor a creation time/u);
  assert.equal(istLabel("2026-11-30T20:00:00Z"), "1 Dec 2026 01:30 IST");
});

test("the command has nothing to hold outside pull requests and merge groups", () => {
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "deploy_window.mjs");
  for (const event of ["push", "schedule", "workflow_dispatch"]) {
    const run = spawnSync(process.execPath, [script, "--event", event], {encoding: "utf8"});
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, new RegExp(`No hold for a ${event} run`, "u"));
  }
  const missing = spawnSync(process.execPath, [script, "--event", "pull_request"], {encoding: "utf8"});
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /needs --pr/u);
});
