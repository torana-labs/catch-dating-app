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

test("only codebases whose hash changed count, with every Function they hold", () => {
  const plan = deployPlan({current, previous: {admin: "a1", events: "e1"}, limit: 10});
  assert.deepEqual(plan, {
    changed: [{codebase: "admin", functions: 3, reason: "content changed"},
      {codebase: "sales", functions: 1, reason: "new codebase"}],
    unchanged: [{codebase: "events", functions: 2}],
    total: 4, limit: 10, blocked: false,
  });
  assert.equal(deployPlan({current, previous: {admin: "a2", events: "e1", sales: "s1"}, limit: 0}).blocked, false);
});

test("an unknown scope counts every codebase and is refused above the limit", () => {
  const plan = deployPlan({current, previous: null, limit: 5});
  assert.equal(plan.total, 6);
  assert.ok(plan.changed.every(({reason}) => reason === "no recorded hashes"));
  assert.equal(plan.blocked, true);
  assert.equal(deployPlan({current, previous: null, limit: 5, allowLarge: true}).blocked, false);
  assert.equal(deployPlan({current, previous: null, limit: 6}).blocked, false, "the limit itself is allowed");
});

test("a full deploy counts everything and is its own permission", () => {
  const plan = deployPlan({current, previous: {admin: "a2", events: "e1", sales: "s1"}, limit: 1, full: true});
  assert.equal(plan.total, 6);
  assert.equal(plan.blocked, false);
  assert.throws(() => deployPlan({current, previous: null, limit: Number("x")}), /whole number/u);
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

test("the summary names each changed codebase and why", () => {
  const markdown = planMarkdown(deployPlan({current, previous: {admin: "a1", events: "e1"}, limit: 10}), "dev");
  assert.match(markdown, /Functions this dev deploy changes: 4 \(limit 10\)/u);
  assert.match(markdown, /\| admin \| 3 \| content changed \|/u);
  assert.match(markdown, /Unchanged: events\./u);
  assert.match(planMarkdown(deployPlan({current, previous: {admin: "a2", events: "e1", sales: "s1"}, limit: 10}),
    "dev"), /No codebase changed\./u);
});

test("the command refuses a large deploy before anything changes and allows it when asked", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deploy-size-"));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  fs.writeFileSync(path.join(dir, "current.json"), JSON.stringify(current));
  fs.writeFileSync(path.join(dir, "previous.json"), "");
  const run = (...args) => spawnSync(process.execPath, [path.join(__dirname, "deploy-size.cjs"),
    "--current", path.join(dir, "current.json"), "--previous", path.join(dir, "previous.json"),
    "--environment", "dev", "--summary", path.join(dir, "summary.md"), ...args], {encoding: "utf8"});
  const blocked = run("--limit", "5");
  assert.equal(blocked.status, 3, blocked.stderr);
  assert.match(blocked.stderr, /would update 6 Functions in dev, over the limit of 5\. Nothing was changed/u);
  assert.match(fs.readFileSync(path.join(dir, "summary.md"), "utf8"), /no recorded hashes/u);
  assert.equal(run("--limit", "5", "--allow-large", "true").status, 0);
  fs.writeFileSync(path.join(dir, "previous.json"), record({admin: {hash: "a1"}, events: {hash: "e1"},
    sales: {hash: "s1"}}));
  const small = run("--limit", "5");
  assert.equal(small.status, 0, small.stderr);
  assert.match(small.stdout, /changes: 3 \(limit 5\)/u);
  assert.equal(run().status, 1, "the limit is required");
});
