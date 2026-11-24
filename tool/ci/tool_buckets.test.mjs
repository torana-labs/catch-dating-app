import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {spawnSync} from "node:child_process";
import {
  assignBuckets,
  BUCKET_COUNT,
  buildTimings,
  fullMatrixTools,
  readTimings,
  toolSecondsFromLog,
  validateTimings,
} from "./tool_buckets.mjs";
import {loadToolsManifest} from "../lib/tools_manifest.mjs";

const manifest = loadToolsManifest();
const timings = readTimings();
const buckets = assignBuckets({tools: fullMatrixTools(manifest), timings});

// The six category buckets the full matrix ran before balancing by time. The
// computed buckets must run exactly the same tools.
const LEGACY_BUCKET_CATEGORIES = ["meta", "audit", "remote-ops", "branding", "agent", "architecture", "ci", "git",
  "lint", "test", "contracts", "data", "demo", "firebase", "operations", "env", "platform", "generator",
  "cloudflare", "marketing", "ui-capture", "design", "analytics", "organizer-intake"];

const assignedIds = () => buckets.flatMap((bucket) => bucket.toolIds);

test("every full-matrix tool is assigned to exactly one bucket", () => {
  assert.equal(buckets.length, BUCKET_COUNT);
  const ids = assignedIds();
  assert.equal(new Set(ids).size, ids.length, "a tool is assigned twice");
  assert.deepEqual([...ids].sort(), fullMatrixTools(manifest).map((tool) => tool.id).sort());
  for (const bucket of buckets) assert.ok(bucket.toolIds.length > 0, `bucket ${bucket.bucket} is empty`);
});

test("every queue-gated check is in exactly one bucket", () => {
  const ids = assignedIds();
  const gated = manifest.tools.filter((tool) => tool.status === "active" && tool.queueGate).map((tool) => tool.id);
  assert.ok(gated.length > 0);
  for (const id of gated) {
    assert.equal(ids.filter((assigned) => assigned === id).length, 1, `${id} must be assigned exactly once`);
  }
});

test("the buckets run exactly the tools the legacy category buckets ran", () => {
  const legacy = manifest.tools
    .filter((tool) => tool.status === "active" && LEGACY_BUCKET_CATEGORIES.includes(tool.category))
    .map((tool) => tool.id).sort();
  assert.deepEqual([...assignedIds()].sort(), legacy);
  // A category outside the legacy list would have run nowhere before; flag it.
  const categories = new Set(manifest.tools.filter((tool) => tool.status === "active").map((tool) => tool.category));
  assert.deepEqual([...categories].filter((category) => !LEGACY_BUCKET_CATEGORIES.includes(category)), []);
});

test("assignment balances by measured seconds, deterministically", () => {
  const tools = ["a", "b", "c", "d", "e", "f"].map((id) => ({id, checks: ["true"]}));
  const fixture = {defaultSeconds: 1, seconds: {a: 10, b: 9, c: 6, d: 5, e: 4, f: 1}};
  const plan = assignBuckets({tools, timings: fixture, count: 2});
  assert.deepEqual(plan.map((bucket) => [bucket.toolIds, bucket.seconds]), [[["a", "d", "e"], 19], [["b", "c", "f"], 16]]);
  assert.deepEqual(assignBuckets({tools, timings: fixture, count: 2}), plan);
  // Unknown tools count as defaultSeconds; each bucket keeps manifest order.
  const withNew = assignBuckets({tools: [...tools, {id: "g", checks: ["true"]}], timings: fixture, count: 2});
  assert.deepEqual(withNew.map((bucket) => bucket.toolIds), [["a", "d", "e"], ["b", "c", "f", "g"]]);
});

test("a bucket's setup is the affected job's projection of its tools' CI requirements", () => {
  const node = {id: "x:node", checks: ["true"], ciRequirements: {repositoryView: "index", setup: ["node"]}};
  const browser = {id: "x:browser", checks: ["true"], ciRequirements: {repositoryView: "full", setup: ["node", "root-npm", "playwright"]}};
  const undeclared = {id: "x:undeclared", checks: ["true"]};
  const fixture = {defaultSeconds: 1, seconds: {"x:node": 5, "x:browser": 4, "x:undeclared": 3}};
  const [first, second, third] = assignBuckets({tools: [node, browser, undeclared], timings: fixture, count: 3});
  assert.deepEqual(first.setup, ["node"]);
  assert.ok(second.setup.includes("playwright"));
  // A tool with no declared requirements needs the full setup, browser included.
  assert.ok(third.setup.includes("playwright") && third.setup.includes("flutter"));
});

test("the committed buckets stay within a minute of each other", () => {
  const loads = buckets.map((bucket) => bucket.seconds);
  assert.ok(Math.max(...loads) - Math.min(...loads) <= 60, `bucket loads ${loads.join(", ")}`);
});

test("job logs give each tool's seconds, shared prerequisite time included", () => {
  const log = [
    "2026-11-24T08:00:00.0000000Z ##[group]Run node tool/run.mjs check a:one b:two",
    "2026-11-24T08:00:01.0000000Z ==> a:one: node --check a.mjs",
    "2026-11-24T08:00:02.0000000Z ==> a:one: npm --prefix functions run build && node --test a.test.mjs",
    "2026-11-24T08:00:03.0000000Z ==> shared prerequisite: npm --prefix functions run build",
    "2026-11-24T08:00:40.0000000Z     shared prerequisite passed; running: node --test a.test.mjs",
    "2026-11-24T08:00:45.0000000Z ==> b:two: node b.mjs",
    "2026-11-24T08:00:50.5000000Z Tool checks passed.",
    "2026-11-24T08:00:51.0000000Z ##[endgroup]",
  ].join("\n");
  assert.deepEqual(toolSecondsFromLog(log), {"a:one": 44, "b:two": 5.5});
});

test("timings average over runs and validate", () => {
  const built = buildTimings([{"a:one": 10, "b:two": 2}, {"a:one": 20}], {runIds: ["1", "2"]});
  assert.deepEqual(built.seconds, {"a:one": 15, "b:two": 2});
  assert.deepEqual(built.source.runs, ["1", "2"]);
  assert.deepEqual(validateTimings(built), []);
  assert.deepEqual(validateTimings(timings), []);
  assert.ok(validateTimings({defaultSeconds: 0, seconds: {b: 1, a: 2}}).length >= 2);
});

test("ids, setup and regenerate work from the command line", () => {
  const script = path.join(import.meta.dirname, "tool_buckets.mjs");
  const ids = spawnSync(process.execPath, [script, "ids", "--bucket", "1"], {encoding: "utf8"});
  assert.equal(ids.status, 0, ids.stderr);
  assert.deepEqual(ids.stdout.trim().split("\n"), buckets[0].toolIds);
  const setup = spawnSync(process.execPath, [script, "setup", "--bucket", String(BUCKET_COUNT)], {encoding: "utf8"});
  assert.deepEqual(JSON.parse(setup.stdout), buckets[BUCKET_COUNT - 1].setup);
  assert.notEqual(spawnSync(process.execPath, [script, "ids", "--bucket", "0"]).status, 0);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tool-buckets-"));
  try {
    fs.writeFileSync(path.join(dir, "77-bucket-1.log"), "2026-11-24T08:00:00Z ==> a:one: x\n2026-11-24T08:00:04Z Tool checks passed.\n");
    fs.writeFileSync(path.join(dir, "77-bucket-2.log"), "2026-11-24T08:00:00Z ==> b:two: y\n2026-11-24T08:00:02Z Tool checks passed.\n");
    const out = path.join(dir, "timings.json");
    const result = spawnSync(process.execPath, [script, "regenerate", "--out", out,
      path.join(dir, "77-bucket-1.log"), path.join(dir, "77-bucket-2.log")], {encoding: "utf8"});
    assert.equal(result.status, 0, result.stderr);
    const written = JSON.parse(fs.readFileSync(out, "utf8"));
    assert.deepEqual(written.seconds, {"a:one": 4, "b:two": 2});
    assert.deepEqual(written.source.runs, ["77"]);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
