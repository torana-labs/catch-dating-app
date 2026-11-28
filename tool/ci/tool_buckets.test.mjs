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
  DART_ANALYZE_WARMUP_SECONDS,
  FLUTTER_TEST_WARMUP_SECONDS,
  fullMatrixTools,
  parseBucketLog,
  readTimings,
  SETUP_SECONDS,
  sharedCommandGroups,
  toolSecondsFromLog,
  validateTimings,
} from "./tool_buckets.mjs";
import {loadToolsManifest} from "../lib/tools_manifest.mjs";
import {splitSharedPrerequisite} from "../lib/tool_impact.mjs";

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
  const tools = ["a", "b", "c", "d", "e", "f"].map((id) => ({id, checks: [`node ${id}.mjs`]}));
  const fixture = {defaultSeconds: 1, seconds: {a: 10, b: 9, c: 6, d: 5, e: 4, f: 1}};
  const plan = assignBuckets({tools, timings: fixture, count: 2});
  assert.deepEqual(plan.map((bucket) => [bucket.toolIds, bucket.seconds]), [[["a", "d", "e"], 19], [["b", "c", "f"], 16]]);
  assert.deepEqual(assignBuckets({tools, timings: fixture, count: 2}), plan);
  // Unknown tools count as defaultSeconds; each bucket keeps manifest order.
  const withNew = assignBuckets({tools: [...tools, {id: "g", checks: ["node g.mjs"]}], timings: fixture, count: 2});
  assert.deepEqual(withNew.map((bucket) => bucket.toolIds), [["a", "d", "e"], ["b", "c", "f", "g"]]);
});

test("a bucket's setup is the affected job's projection of its tools' CI requirements", () => {
  const node = {id: "x:node", checks: ["node n.mjs"], ciRequirements: {repositoryView: "index", setup: ["node"]}};
  const browser = {id: "x:browser", checks: ["node b.mjs"], ciRequirements: {repositoryView: "full", setup: ["node", "root-npm", "playwright"]}};
  const undeclared = {id: "x:undeclared", checks: ["node u.mjs"]};
  const fixture = {defaultSeconds: 1, seconds: {"x:node": 5, "x:browser": 4, "x:undeclared": 3}};
  const [first, second, third] = assignBuckets({tools: [node, browser, undeclared], timings: fixture, count: 3});
  assert.deepEqual(first.setup, ["node"]);
  assert.ok(second.setup.includes("playwright"));
  // A tool with no declared requirements needs the full setup, browser included.
  assert.ok(third.setup.includes("playwright") && third.setup.includes("flutter"));
});

test("the committed buckets finish within a minute of each other, setup included", () => {
  const loads = buckets.map((bucket) => bucket.seconds + bucket.setupSeconds);
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

test("regenerate keeps a fallback value only for tools the logs do not cover", () => {
  const fallback = {defaultSeconds: 3, seconds: {"a:one": 99, "c:three": 7}};
  const built = buildTimings([{"a:one": 10, "b:two": 2}], {runIds: ["5"], fallback});
  assert.deepEqual(built.seconds, {"a:one": 10, "b:two": 2, "c:three": 7});
  assert.deepEqual(built.source.keptFromFallback, ["c:three"]);
  const stale = buildTimings([{"a:one": 1}], {fallback: {defaultSeconds: 1, seconds: {"analyze .": 9, "c:three": 7}}});
  assert.deepEqual(Object.keys(stale.seconds), ["a:one", "c:three"], "a non-tool key is not carried over");
});

test("a tool handed to another lane gets no sample, never about zero seconds", () => {
  const handedOverLog = [
    "2026-11-24T08:00:00.0000000Z ==> a:one: node a.mjs",
    "2026-11-24T08:00:10.0000000Z ==> m:a11y: provided by the required same-run React marketing lane.",
    "2026-11-24T08:00:10.1000000Z ==> w:visuals: nightly-only visual report (see #2426).",
    "2026-11-24T08:00:10.2000000Z ==> b:two: node b.mjs",
    "2026-11-24T08:00:13.2000000Z Tool checks passed.",
  ].join("\n");
  const parsed = parseBucketLog(handedOverLog);
  assert.deepEqual(parsed.seconds, {"a:one": 10, "b:two": 3});
  assert.deepEqual([...parsed.handedOver].sort(), ["m:a11y", "w:visuals"]);
  const ranLog = [
    "2026-11-24T09:00:00.0000000Z ==> m:a11y: npm --workspace catch-marketing run test:storybook:a11y",
    "2026-11-24T09:02:22.0000000Z ==> a:one: node a.mjs",
    "2026-11-24T09:02:30.0000000Z Tool checks passed.",
  ].join("\n");
  const slowerRun = {seconds: {"m:a11y": 120, "a:one": 12}, handedOver: new Set()};
  const built = buildTimings([parsed, parseBucketLog(ranLog), slowerRun], {runIds: ["1", "2", "3"]});
  // Known from the runs where Tools ran it: its longest run, not ~0 or an average with the handed-over run.
  assert.equal(built.seconds["m:a11y"], 142);
  assert.equal(built.seconds["a:one"], 10);
  assert.deepEqual(built.source.longestRunForHandedOverTools, ["m:a11y"]);
  assert.deepEqual(built.source.handedOverWithoutMeasuredRun, ["w:visuals"]);
  assert.ok(!("w:visuals" in built.seconds), "a tool never measured is not invented");
  // Without any run that executed it, a fallback value stays as it was.
  assert.equal(buildTimings([parsed], {fallback: {defaultSeconds: 1, seconds: {"w:visuals": 400}}}).seconds["w:visuals"], 400);
});

test("the first dart analyze and flutter test lose the warm-up the bucket setup pays", () => {
  const log = () => [
    "2026-11-24T08:00:00.0000000Z ==> d:one: dart analyze tool/x.dart",
    "2026-11-24T08:01:00.0000000Z ==> d:two: dart analyze tool/y.dart",
    "2026-11-24T08:01:30.0000000Z ==> f:one: flutter test test/a_test.dart",
    "2026-11-24T08:02:00.0000000Z ==> f:two: flutter test test/b_test.dart",
    "2026-11-24T08:02:20.0000000Z Tool checks passed.",
  ].join("\n");
  assert.deepEqual(toolSecondsFromLog(log()), {
    "d:one": 60 - DART_ANALYZE_WARMUP_SECONDS, "d:two": 30, "f:one": 30 - FLUTTER_TEST_WARMUP_SECONDS, "f:two": 20,
  });
  // A job that ran dart analyze and flutter test before its first tool paid the startup there.
  const warmed = ["2026-11-24T07:59:00.0000000Z dart analyze tool/ci/x.dart", "2026-11-24T07:59:20.0000000Z flutter test tool/ci/x_test.dart", log()].join("\n");
  assert.deepEqual(toolSecondsFromLog(warmed), {"d:one": 60, "d:two": 30, "f:one": 30, "f:two": 20});
  assert.equal(SETUP_SECONDS["flutter-pub"] >= DART_ANALYZE_WARMUP_SECONDS + FLUTTER_TEST_WARMUP_SECONDS, true);
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

test("every shared command and shared prerequisite runs in exactly one bucket", () => {
  const bucketOf = new Map(buckets.flatMap((bucket) => bucket.toolIds.map((id) => [id, bucket.bucket])));
  const bucketsOfKey = new Map();
  for (const tool of fullMatrixTools(manifest)) {
    for (const command of tool.checks ?? []) {
      const {prerequisite} = splitSharedPrerequisite(command);
      for (const key of prerequisite ? [command, prerequisite.command] : [command]) {
        if (!bucketsOfKey.has(key)) bucketsOfKey.set(key, new Set());
        bucketsOfKey.get(key).add(bucketOf.get(tool.id));
      }
    }
  }
  const split = [...bucketsOfKey].filter(([, set]) => set.size > 1).map(([key]) => key);
  assert.deepEqual(split, [], "a shared command would run in more than one bucket");
});

test("tools sharing a command or prerequisite form one group, deterministically", () => {
  const tools = [
    {id: "a:one", checks: ["node shared.mjs", "node a.mjs"]},
    {id: "b:two", checks: ["node b.mjs", "node shared.mjs"]},
    {id: "c:three", checks: ["npm --prefix functions run build && node --test c.test.mjs"]},
    {id: "d:four", checks: ["npm --prefix functions run build && node --test d.test.mjs"]},
    {id: "e:five", checks: ["node e.mjs"]},
  ];
  assert.deepEqual(sharedCommandGroups(tools).map((group) => group.map((tool) => tool.id)),
    [["a:one", "b:two"], ["c:three", "d:four"], ["e:five"]]);
  const timings = {defaultSeconds: 1, seconds: {"a:one": 5, "b:two": 5, "c:three": 4, "d:four": 4, "e:five": 9}};
  const plan = assignBuckets({tools, timings, count: 2});
  assert.deepEqual(plan.map((bucket) => bucket.toolIds), [["a:one", "b:two"], ["c:three", "d:four", "e:five"]]);
});

test("tools that need the same setup gather, so a bucket can skip Flutter and root npm", () => {
  const flutter = (id, seconds) => ({id, checks: [`dart ${id}`], ciRequirements: {repositoryView: "full", setup: ["node", "flutter", "flutter-pub"]}, seconds});
  const plain = (id, seconds) => ({id, checks: [`node ${id}`], ciRequirements: {repositoryView: "full", setup: ["node"]}, seconds});
  const tools = [flutter("f:a", 60), plain("n:a", 60), flutter("f:b", 55), plain("n:b", 55), flutter("f:c", 5), plain("n:c", 5)];
  const timings = {defaultSeconds: 1, seconds: Object.fromEntries(tools.map((tool) => [tool.id, tool.seconds]))};
  const plan = assignBuckets({tools, timings, count: 2});
  const flutterBucket = plan.find((bucket) => bucket.toolIds.includes("f:a"));
  const nodeBucket = plan.find((bucket) => bucket !== flutterBucket);
  assert.deepEqual(flutterBucket.toolIds.filter((id) => id.startsWith("f:")).sort(), ["f:a", "f:b", "f:c"]);
  assert.deepEqual(nodeBucket.setup, ["node"]);
  assert.equal(nodeBucket.setupSeconds, 0);
  assert.equal(flutterBucket.setupSeconds, SETUP_SECONDS.flutter + SETUP_SECONDS["flutter-pub"]);
});
