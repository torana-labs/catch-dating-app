import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {compareDrift, driftSummary} from "./compare_capture_drift.mjs";
import {fromRepo} from "../lib/repo_paths.mjs";

// The smallest PNG-shaped bytes readProvenance accepts: one caPt record.
function png(record) {
  const data = Buffer.from(JSON.stringify(record));
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length);
  chunk.write("caPt", 4, "ascii");
  data.copy(chunk, 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk]);
}
const record = (image, extra = {}) => ({nativeFontSha256: "f".repeat(64), imageSha256: image,
  inputSha256: "i".repeat(64), sourceRevision: "a".repeat(40), ...extra});
const captures = [{id: "same"}, {id: "drifted"}, {id: "unseeded"}, {id: "font"}, {id: "story", kind: "web-capture"}];

test("drift lists only captures whose fresh image bytes differ from the reused render", () => {
  const reused = new Map([["same", png(record("1"))], ["drifted", png(record("2"))],
    ["font", png(record("3", {nativeFontSha256: "e".repeat(64)}))]]);
  const fresh = new Map([["same", png(record("1"))], ["drifted", png(record("9"))], ["font", png(record("3"))]]);
  const report = compareDrift({captures, reused, fresh});
  assert.deepEqual(report.compared, ["same", "drifted"]);
  assert.deepEqual(report.differences, [{id: "drifted", reason: "image bytes differ", renderedFrom: "a".repeat(40), sameInputs: true}]);
  assert.deepEqual(report.notCompared.map(n => n.id), ["unseeded", "font"]);
  const summary = driftSummary(report);
  assert.match(summary, /Compared 2 app captures; 1 differ\./u);
  assert.match(summary, /\| drifted \| image bytes differ \|/u);
  assert.match(summary, /Nothing was republished/u);
});

test("a missing fresh render is drift, never a silent pass", () => {
  const report = compareDrift({captures: [{id: "same"}], reused: new Map([["same", png(record("1"))]]), fresh: new Map()});
  assert.deepEqual(report.differences.map(d => d.id), ["same"]);
});

test("the weekly workflow compares on macOS, never publishes, and fails on drift", () => {
  const source = fs.readFileSync(fromRepo(".github/workflows/marketing-captures-drift.yml"), "utf8");
  assert.match(source, /^  schedule:\n    - cron: "[^"]+"$/mu);
  assert.match(source, /^  workflow_dispatch:$/mu);
  assert.match(source, /runs-on: macos-26/u);
  assert.match(source, /node tool\/marketing\/compare_capture_drift\.mjs --plan\n/u);
  assert.match(source, /node tool\/marketing\/compare_capture_drift\.mjs --compare\n/u);
  // Compare-only: no bundle upload under the canonical name, no write access, no deploy.
  assert.doesNotMatch(source, /canonical-marketing-|contents: write|issues: write|secrets\.|id-token|firebase deploy|git push/u);
  assert.doesNotMatch(source, /continue-on-error/u, "drift must fail the run");
});
