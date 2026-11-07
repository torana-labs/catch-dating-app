const assert = require("node:assert/strict");
const {spawnSync} = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {deployPlan, istLabel, planMarkdown, recordedHashes, recordedState} = require("./deploy-size.cjs");

const current = {version: 1, codebases: {
  admin: {hash: "a2", functions: ["x", "y", "z"]},
  events: {hash: "e1", functions: ["p", "q"]},
  sales: {hash: "s1", functions: ["r"]},
}};
const record = (codebases, extra = {}) => JSON.stringify({version: 1, codebases, ...extra});
const state = (hashes, largeDeployAt = null) => ({hashes, largeDeployAt});
const same = state({admin: "a2", events: "e1", sales: "s1"});
const lastLarge = "2026-11-07T13:15:00.000Z";
const sevenDaysOn = "2026-11-14T13:15:00.000Z";
const day = (iso, days) => new Date(Date.parse(iso) + days * 86400000).toISOString();

test("only codebases whose hash changed count, with every Function they hold", () => {
  const plan = deployPlan({current, previous: state({admin: "a1", events: "e1"}), limit: 10, now: lastLarge});
  assert.deepEqual(plan, {
    changed: [{codebase: "admin", functions: 3, reason: "content changed"},
      {codebase: "sales", functions: 1, reason: "new codebase"}],
    unchanged: [{codebase: "events", functions: 2}],
    total: 4, limit: 10, large: false, blocked: false, reason: null, skip: false,
    windowOpensAt: null, eligible: true, largeDeployAt: null,
  });
  assert.equal(deployPlan({current, previous: same, limit: 0, now: lastLarge}).blocked, false);
});

test("an unknown scope counts every codebase and is refused above the limit", () => {
  const plan = deployPlan({current, previous: state(null), limit: 5, now: lastLarge});
  assert.equal(plan.total, 6);
  assert.ok(plan.changed.every(({reason}) => reason === "no recorded hashes"));
  assert.equal(plan.blocked, true);
  assert.equal(deployPlan({current, previous: null, limit: 5, now: lastLarge}).total, 6);
  assert.equal(deployPlan({current, previous: state(null), limit: 6, now: lastLarge}).blocked, false,
    "the limit itself is allowed");
});

test("no record and no creation time: the window is open but a large deploy still needs allowing", () => {
  const plan = deployPlan({current, previous: state(null), limit: 5, now: lastLarge});
  assert.equal(plan.eligible, true);
  assert.equal(plan.windowOpensAt, null);
  assert.equal(plan.reason, "needs-allow-large");
  const allowed = deployPlan({current, previous: state(null), limit: 5, allowLarge: true, now: lastLarge});
  assert.equal(allowed.blocked, false);
  assert.equal(allowed.largeDeployAt, lastLarge);
});

test("a large deploy inside 7 days of the last one is refused whatever allowed it", () => {
  const previous = state({admin: "a1", events: "e1", sales: "s1"}, lastLarge);
  for (const now of [day(lastLarge, 1), day(sevenDaysOn, -1 / 86400)]) {
    const plan = deployPlan({current, previous, limit: 2, allowLarge: true, now});
    assert.equal(plan.blocked, true, now);
    assert.equal(plan.reason, "window-closed");
    assert.equal(plan.windowOpensAt, sevenDaysOn);
  }
  const full = deployPlan({current, previous: {...same, largeDeployAt: lastLarge}, limit: 1, full: true,
    now: day(lastLarge, 3)});
  assert.equal(full.total, 6);
  assert.equal(full.blocked, true, "full does not beat the window");
  assert.equal(full.reason, "window-closed");
  const pushed = deployPlan({current, previous, limit: 2, now: day(lastLarge, 3)});
  assert.equal(pushed.reason, "window-closed", "a closed window is the reason even when nothing allowed it");
});

test("at exactly 7 days a large deploy is permitted and becomes the new last large deploy", () => {
  const previous = state({admin: "a1", events: "e1", sales: "s1"}, lastLarge);
  const plan = deployPlan({current, previous, limit: 2, allowLarge: true, now: sevenDaysOn});
  assert.equal(plan.blocked, false);
  assert.equal(plan.eligible, true);
  assert.equal(plan.largeDeployAt, sevenDaysOn);
  const full = deployPlan({current, previous: same, limit: 1, full: true, now: sevenDaysOn});
  assert.equal(full.blocked, false);
  assert.equal(full.largeDeployAt, sevenDaysOn);
  const notAllowed = deployPlan({current, previous, limit: 2, now: sevenDaysOn});
  assert.equal(notAllowed.reason, "needs-allow-large");
});

test("a small deploy carries the last large deploy forward", () => {
  const previous = state({admin: "a1", events: "e1", sales: "s1"}, lastLarge);
  const plan = deployPlan({current, previous, limit: 10, now: day(lastLarge, 2)});
  assert.equal(plan.large, false);
  assert.equal(plan.blocked, false);
  assert.equal(plan.largeDeployAt, lastLarge);
});

test("a record without a large deploy counts from its own creation, and carries that forward", () => {
  const previous = state({admin: "a1", events: "e1", sales: "s1"});
  const closed = deployPlan({current, previous, limit: 2, allowLarge: true, now: day(lastLarge, 6),
    previousCreatedAt: lastLarge});
  assert.equal(closed.reason, "window-closed");
  assert.equal(closed.windowOpensAt, sevenDaysOn);
  const small = deployPlan({current, previous, limit: 10, now: day(lastLarge, 1), previousCreatedAt: lastLarge});
  assert.equal(small.largeDeployAt, lastLarge, "a later small deploy does not slide the window");
  assert.throws(() => deployPlan({current, previous, limit: 2, now: lastLarge, previousCreatedAt: "soon"}),
    /not a time/u);
});

test("the nightly window run skips an empty plan and a closed window, and deploys in an open one", () => {
  const previous = state({admin: "a1", events: "e1", sales: "s1"}, lastLarge);
  const empty = deployPlan({current, previous: same, limit: 2, mode: "window", now: day(lastLarge, 1)});
  assert.equal(empty.skip, true);
  assert.equal(empty.blocked, false);
  const closed = deployPlan({current, previous, limit: 2, mode: "window", now: day(lastLarge, 1)});
  assert.equal(closed.skip, true);
  assert.equal(closed.blocked, false, "the nightly run stays quiet rather than fail");
  const open = deployPlan({current, previous, limit: 2, mode: "window", now: sevenDaysOn});
  assert.equal(open.skip, false);
  assert.equal(open.blocked, false, "the window run is its own permission");
  assert.equal(open.largeDeployAt, sevenDaysOn);
  const small = deployPlan({current, previous, limit: 10, mode: "window", now: day(lastLarge, 1)});
  assert.equal(small.skip, false, "a small pending deploy goes out whatever the window");
  assert.throws(() => deployPlan({current, previous, limit: 2, mode: "later", now: lastLarge}), /mode/u);
  assert.throws(() => deployPlan({current, previous: null, limit: Number("x"), now: lastLarge}), /whole number/u);
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

test("a record's last large deploy reads as null when it is older than this field or not a time", () => {
  assert.deepEqual(recordedState(record({admin: {hash: "a1"}})), {hashes: {admin: "a1"}, largeDeployAt: null});
  assert.deepEqual(recordedState(JSON.stringify(record({admin: {hash: "a1"}}, {largeDeployAt: lastLarge}))),
    {hashes: {admin: "a1"}, largeDeployAt: lastLarge});
  assert.equal(recordedState(record({admin: {hash: "a1"}}, {largeDeployAt: "soon"})).largeDeployAt, null);
  assert.deepEqual(recordedState(""), {hashes: null, largeDeployAt: null});
});

test("the summary names each changed codebase, why, and the window", () => {
  const plan = deployPlan({current, previous: state({admin: "a1", events: "e1"}, lastLarge), limit: 10,
    now: day(lastLarge, 1)});
  const markdown = planMarkdown(plan, "dev");
  assert.match(markdown, /Functions this dev deploy changes: 4 \(limit 10\)/u);
  assert.match(markdown, /\| admin \| 3 \| content changed \|/u);
  assert.match(markdown, /Unchanged: events\./u);
  assert.match(markdown, /Full-deploy window: opens 14 Nov 2026 18:45 IST \(2026-11-14T13:15:00\.000Z\)/u);
  assert.match(planMarkdown(deployPlan({current, previous: same, limit: 10, now: lastLarge}), "dev"),
    /No codebase changed\.[\s\S]*Full-deploy window: open \(no earlier deploy recorded\)/u);
  assert.equal(istLabel("2026-11-30T20:00:00Z"), "1 Dec 2026 01:30 IST");
});

test("the command refuses a large deploy before anything changes and names when the window opens", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deploy-size-"));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  fs.writeFileSync(path.join(dir, "current.json"), JSON.stringify(current));
  fs.writeFileSync(path.join(dir, "previous.json"), "");
  const output = path.join(dir, "output.txt");
  const run = (...args) => {
    fs.writeFileSync(output, "");
    return spawnSync(process.execPath, [path.join(__dirname, "deploy-size.cjs"),
      "--current", path.join(dir, "current.json"), "--previous", path.join(dir, "previous.json"),
      "--environment", "dev", "--summary", path.join(dir, "summary.md"), "--output", output,
      "--now", sevenDaysOn, ...args], {encoding: "utf8"});
  };
  const blocked = run("--limit", "5");
  assert.equal(blocked.status, 3, blocked.stderr);
  assert.match(blocked.stderr, /would update 6 Functions in dev, over the limit of 5\. Nothing was changed/u);
  assert.match(blocked.stderr, /nightly window run deploys this by itself/u);
  assert.match(fs.readFileSync(path.join(dir, "summary.md"), "utf8"), /no recorded hashes/u);
  const allowed = run("--limit", "5", "--allow-large", "true");
  assert.equal(allowed.status, 0, allowed.stderr);
  assert.equal(fs.readFileSync(output, "utf8"),
    `skip=false\nlarge=true\nlarge_deploy_at=${sevenDaysOn}\nwindow_opens_at=\n`);

  fs.writeFileSync(path.join(dir, "previous.json"), record({admin: {hash: "a1"}, events: {hash: "e1"},
    sales: {hash: "s1"}}));
  const closed = run("--limit", "2", "--allow-large", "true", "--previous-created-at", day(lastLarge, 1));
  assert.equal(closed.status, 3, closed.stderr);
  assert.match(closed.stderr, /The window opens 15 Nov 2026 18:45 IST \(2026-11-15T13:15:00\.000Z\)/u);
  const quiet = run("--limit", "2", "--mode", "window", "--previous-created-at", day(lastLarge, 1));
  assert.equal(quiet.status, 0, quiet.stderr);
  assert.match(quiet.stdout, /Nightly window run: 3 Functions wait for the window, which opens 15 Nov 2026/u);
  assert.equal(fs.readFileSync(output, "utf8"),
    `skip=true\nlarge=true\nlarge_deploy_at=${day(lastLarge, 1)}\nwindow_opens_at=2026-11-15T13:15:00.000Z\n`);
  const small = run("--limit", "5");
  assert.equal(small.status, 0, small.stderr);
  assert.match(small.stdout, /changes: 3 \(limit 5\)/u);
  assert.equal(run().status, 1, "the limit is required");
});
