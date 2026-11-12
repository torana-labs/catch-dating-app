const assert = require("node:assert/strict");
const {spawnSync} = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {deployPlan, planMarkdown, recordedHashes} = require("./deploy-size.cjs");

const current = {version: 1, codebases: {
  admin: {hash: "a2", functions: ["x", "y", "z"]},
  events: {hash: "e1", functions: ["p", "q"]},
  sales: {hash: "s1", functions: ["r"]},
}};
const record = (codebases) => JSON.stringify({version: 1, codebases});

test("only codebases whose hash changed count, each one build with every Function it holds", () => {
  const plan = deployPlan({current, previous: {admin: "a1", events: "e1"}});
  assert.deepEqual(plan, {
    changed: [{codebase: "admin", functions: 3, reason: "content changed"},
      {codebase: "sales", functions: 1, reason: "new codebase"}],
    unchanged: [{codebase: "events", functions: 2}],
    builds: 2, total: 4,
  });
  assert.equal(deployPlan({current, previous: {admin: "a2", events: "e1", sales: "s1"}}).builds, 0);
});

test("an unknown scope counts every codebase", () => {
  const plan = deployPlan({current, previous: null});
  assert.equal(plan.total, 6);
  assert.equal(plan.builds, 3);
  assert.ok(plan.changed.every(({reason}) => reason === "no recorded hashes"));
});

test("a full deploy counts everything", () => {
  const plan = deployPlan({current, previous: {admin: "a2", events: "e1", sales: "s1"}, full: true});
  assert.equal(plan.total, 6);
  assert.ok(plan.changed.every(({reason}) => reason === "full deploy"));
});

test("a record is read only when it is this version's hashes", () => {
  assert.deepEqual(recordedHashes(record({admin: {hash: "a1"}})), {admin: "a1"});
  // GitHub may hand the payload back as a JSON string.
  assert.deepEqual(recordedHashes(JSON.stringify(record({admin: {hash: "a1"}}))), {admin: "a1"});
  for (const text of ["", "{}", "null", "not json", "\"\"", JSON.stringify({version: 2, codebases: {}}),
    record({admin: {}}), record(null)]) {
    assert.equal(recordedHashes(text), null, text);
  }
});

test("the summary names the builds, each changed codebase and why", () => {
  const markdown = planMarkdown(deployPlan({current, previous: {admin: "a1", events: "e1"}}), "dev");
  assert.match(markdown, /This dev deploy: 2 codebase build\(s\), 4 Function update\(s\)/u);
  assert.match(markdown, /\| admin \| 3 \| content changed \|/u);
  assert.match(markdown, /Unchanged: events\./u);
  assert.match(planMarkdown(deployPlan({current, previous: {admin: "a2", events: "e1", sales: "s1"}}),
    "dev"), /No codebase changed\./u);
});

test("the command reports any size and never refuses", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deploy-size-"));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  fs.writeFileSync(path.join(dir, "current.json"), JSON.stringify(current));
  fs.writeFileSync(path.join(dir, "previous.json"), "");
  const run = (...args) => spawnSync(process.execPath, [path.join(__dirname, "deploy-size.cjs"),
    "--current", path.join(dir, "current.json"), "--previous", path.join(dir, "previous.json"),
    "--environment", "dev", "--summary", path.join(dir, "summary.md"), ...args], {encoding: "utf8"});
  const unknown = run();
  assert.equal(unknown.status, 0, unknown.stderr);
  assert.match(fs.readFileSync(path.join(dir, "summary.md"), "utf8"), /no recorded hashes/u);
  fs.writeFileSync(path.join(dir, "previous.json"), record({admin: {hash: "a1"}, events: {hash: "e1"},
    sales: {hash: "s1"}}));
  const small = run();
  assert.equal(small.status, 0, small.stderr);
  assert.match(small.stdout, /1 codebase build\(s\), 3 Function update\(s\)/u);
  assert.equal(spawnSync(process.execPath, [path.join(__dirname, "deploy-size.cjs")], {encoding: "utf8"}).status, 1,
    "the current codebases are required");
});
