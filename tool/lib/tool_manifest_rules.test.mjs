import assert from "node:assert/strict";
import test from "node:test";
import {spawnSync} from "node:child_process";
import {
  buildOutputRoots,
  checkPathArguments,
  markdownAnchors,
  sourceRulesFromManifest,
  validateToolLifecycle,
  validateToolOrder,
  validateToolPaths,
  validateToolRoles,
  validateToolRules,
} from "./tool_manifest_rules.mjs";
import {sortToolsManifestText} from "./sort_tools_manifest.mjs";

const rule = (id, extra = {}) => ({id, title: `Title ${id}`, appliesTo: ["tool/**"], instruction: `Do ${id}.`, ...extra});
const gate = (extra = {}) => ({
  id: "fixture:gate",
  status: "active",
  path: "tool/check_fixture.mjs",
  command: "node tool/check_fixture.mjs",
  role: "gate",
  checks: ["node --test tool/check_fixture.test.mjs", "node tool/check_fixture.mjs"],
  ...extra,
});

test("a rule reads its text from its holder and its tools from alsoEnforces", () => {
  const rules = sourceRulesFromManifest({tools: [
    {id: "holder", status: "active", rules: [rule("R-1")]},
    {id: "helper", status: "active", alsoEnforces: ["R-1"]},
    {id: "stale", status: "internal", alsoEnforces: ["R-1"]},
  ]});
  assert.deepEqual(rules, {"R-1": {...rule("R-1"), tools: ["holder", "helper"]}});
});

test("a rule on a tool CI does not run is not an active rule", () => {
  const tools = [{id: "stale", status: "internal", rules: [rule("R-1")]}];
  assert.deepEqual(sourceRulesFromManifest({tools}), {});
  assert.match(validateToolRules(tools).join("\n"), /only an active tool can hold rule text/u);
});

test("rule entries must be complete, unique and resolvable", () => {
  const errors = validateToolRules([
    {id: "a", status: "active", rules: [rule("R-1"), rule("R-2", {title: " "}), rule("R-3", {appliesTo: []})]},
    {id: "b", status: "active", rules: [rule("R-1")], alsoEnforces: ["R-1", "R-404"]},
    {id: "c", status: "active", rules: []},
  ]).join("\n");
  assert.match(errors, /a: rule R-2 needs a non-empty title/u);
  assert.match(errors, /a: rule R-3 needs appliesTo paths/u);
  assert.match(errors, /b: rule R-1 is already held by a/u);
  assert.match(errors, /b: alsoEnforces names unknown rule R-404/u);
  assert.match(errors, /c: rules must be a non-empty array/u);
  assert.deepEqual(validateToolRules([
    {id: "a", status: "active", rules: [rule("R-1")]},
    {id: "b", status: "active", alsoEnforces: ["R-1"]},
  ]), []);
});

test("tools are sorted by id, and the sorter keeps every entry's text", () => {
  assert.deepEqual(validateToolOrder([{id: "a:one"}, {id: "b:two"}]), []);
  assert.match(validateToolOrder([{id: "b:two"}, {id: "a:one"}]).join("\n"),
    /a:one: tools must be sorted by id, but it follows b:two/u);
  assert.match(validateToolOrder([{id: "a:one"}, {id: "a:one"}]).join("\n"), /sorted by id/u);
  const text = '{\n  "version": 1,\n  "tools": [\n    {\n      "id": "b:two",\n      "checks": ["x"]\n    },\n' +
    '    {\n      "id": "a:one", "path": "tool/a.mjs"\n    }\n  ]\n}\n';
  const sorted = sortToolsManifestText(text);
  assert.equal(sorted, '{\n  "version": 1,\n  "tools": [\n    {\n      "id": "a:one", "path": "tool/a.mjs"\n    },\n' +
    '    {\n      "id": "b:two",\n      "checks": ["x"]\n    }\n  ]\n}\n');
  assert.equal(sortToolsManifestText(sorted), sorted);
});

test("tools held to a role must declare a valid one", () => {
  assert.deepEqual(validateToolRoles([gate()]), []);
  assert.match(validateToolRoles([gate({role: undefined})]).join("\n"), /must declare role/u);
  assert.match(validateToolRoles([gate({role: "guess"})]).join("\n"), /invalid role guess/u);
  assert.deepEqual(validateToolRoles([
    gate({role: undefined, path: "tool/web/check_fixture.mjs", checks: ["node --check tool/web/check_fixture.mjs"]}),
  ]), []);
});

test("a gate or ratchet needs a check that executes it", () => {
  for (const role of ["gate", "ratchet"]) {
    const errors = validateToolRoles([
      gate({role, command: "node tool/check_fixture.mjs --real", checks: ["node --check tool/check_fixture.mjs"]}),
    ]);
    assert.match(errors.join("\n"), /needs a manifest check that can execute the guard/u);
  }
});

test("an internal gate's node tests must be run by an active tool", () => {
  const internal = gate({
    id: "fixture:internal",
    status: "internal",
    path: "tool/x/internal.mjs",
    checks: ["node --test tool/x/internal.test.mjs"],
  });
  assert.match(validateToolRoles([internal]).join("\n"),
    /fixture:internal: no active tool runs tool\/x\/internal\.test\.mjs/u);
  const filtered = gate({checks: ["node --test --test-name-pattern=x tool/x/internal.test.mjs", "node tool/check_fixture.mjs"]});
  assert.match(validateToolRoles([internal, filtered]).join("\n"), /no active tool runs/u);
  const owner = gate({checks: ["node --test tool/x/internal.test.mjs tool/check_fixture.test.mjs"]});
  assert.deepEqual(validateToolRoles([internal, owner]), []);
});

const files = new Map([
  ["tool/check_fixture.mjs", ""],
  ["tool/kept_codemod.mjs", ""],
  ["docs/runbook.md", "# Runbook\n\n## Deploy Backend\n\n## Cloudflare edge for example.com\n\n## Deploy Backend\n"],
]);
const lifecycle = (tools) => validateToolLifecycle(tools, {exists: (file) => files.has(file), read: (file) => files.get(file)});
const sha = "0123456789abcdef0123456789abcdef01234567";
const retired = (extra = {}) => ({id: "fixture:retired", status: "retired", path: "tool/deleted_codemod.mjs",
  retiredOn: "2026-11-18", reason: "The rename landed; fixture:guard now fails on any leftover name.", lastCommit: sha, ...extra});

test("status is one of the five lifecycle statuses", () => {
  assert.deepEqual(lifecycle([gate()]), []);
  assert.deepEqual(lifecycle([gate({status: "deprecated"})]),
    ['fixture:gate: status must be one of active, internal, support, completed, retired, found "deprecated".']);
});

test("a retired tool records when, why and its last commit, and its file is gone", () => {
  assert.deepEqual(lifecycle([retired()]), []);
  assert.deepEqual(lifecycle([retired({retiredOn: "18 Nov 2026", reason: "done", lastCommit: "abc123"})]), [
    "fixture:retired: a retired tool needs retiredOn as YYYY-MM-DD.",
    "fixture:retired: a retired tool needs a reason that says why it closed and what covers it now.",
    "fixture:retired: a retired tool needs lastCommit, the full SHA of the last commit that contained tool/deleted_codemod.mjs.",
  ]);
  assert.deepEqual(lifecycle([retired({retiredOn: "2026-02-30"})]),
    ["fixture:retired: a retired tool needs retiredOn as YYYY-MM-DD."]);
  assert.deepEqual(lifecycle([retired({path: "tool/kept_codemod.mjs"})]), [
    "fixture:retired: a retired tool's file is deleted, but tool/kept_codemod.mjs still exists; delete it or mark it completed.",
  ]);
});

test("a closed tool never runs, so it keeps no run fields", () => {
  assert.deepEqual(lifecycle([retired({checks: ["node tool/deleted_codemod.mjs"], impactPaths: ["lib/**"]})]), [
    "fixture:retired: a retired tool never runs, so drop checks.",
    "fixture:retired: a retired tool never runs, so drop impactPaths.",
  ]);
});

test("a completed tool keeps its file and has no lastCommit", () => {
  const completed = retired({id: "fixture:completed", status: "completed", path: "tool/kept_codemod.mjs", lastCommit: undefined});
  assert.deepEqual(lifecycle([completed]), []);
  assert.deepEqual(lifecycle([{...completed, path: "tool/deleted_codemod.mjs", lastCommit: sha}]), [
    "fixture:completed: lastCommit is only for retired tools.",
    "fixture:completed: a completed tool keeps its file, but tool/deleted_codemod.mjs is missing; retire it with lastCommit.",
  ]);
});

test("closing fields belong only to closed tools", () => {
  assert.deepEqual(lifecycle([gate({retiredOn: "2026-11-18", reason: "x".repeat(30)})]), [
    "fixture:gate: retiredOn is only for completed or retired tools.",
    "fixture:gate: reason is only for completed or retired tools.",
  ]);
});

test("an active operator names a runbook that exists, and its anchor must be a heading", () => {
  const operator = gate({id: "fixture:operator", role: "operator"});
  assert.deepEqual(lifecycle([operator]),
    ["fixture:operator: an active operator must name its runbook (a document path, optionally with a #anchor)."]);
  assert.deepEqual(lifecycle([{...operator, runbook: "docs/runbook.md#deploy-backend"}]), []);
  assert.deepEqual(lifecycle([{...operator, runbook: "docs/runbook.md#cloudflare-edge-for-examplecom"}]), []);
  assert.deepEqual(lifecycle([{...operator, runbook: "docs/runbook.md#deploy-backend-1"}]), []);
  assert.deepEqual(lifecycle([{...operator, runbook: "docs/missing.md"}]),
    ["fixture:operator: runbook docs/missing.md does not exist."]);
  assert.deepEqual(lifecycle([{...operator, runbook: "docs/runbook.md#deploy"}]),
    ["fixture:operator: runbook docs/runbook.md has no heading #deploy."]);
  assert.deepEqual(lifecycle([{...operator, status: "internal"}]), []);
});

test("a runbook whose content the checkout cannot supply is checked for existence only", () => {
  const operator = gate({id: "fixture:operator", role: "operator", runbook: "docs/runbook.md#not-a-heading"});
  const sparse = (tools) => validateToolLifecycle(tools, {exists: (file) => files.has(file), read: () => null});
  assert.deepEqual(sparse([operator]), []);
  assert.deepEqual(sparse([{...operator, runbook: "docs/missing.md#x"}]),
    ["fixture:operator: runbook docs/missing.md does not exist."]);
});

test("markdown anchors follow GitHub's heading slugs", () => {
  assert.deepEqual([...markdownAnchors("# A `code` Title!\n## Same\n## Same\ntext # not a heading")],
    ["a-code-title", "same", "same-1"]);
});

test("a retired gate's deleted tests need no active runner", () => {
  assert.deepEqual(validateToolRoles([retired({role: "gate", checks: undefined})]), []);
});

const tree = new Set(["tool/check_fixture.mjs", "tool/check_fixture.test.mjs", "functions/test/a.test.cjs",
  "functions/src/index.ts"]);
const paths = (tools) => validateToolPaths(tools, {
  exists: (file) => tree.has(file),
  isTrackedFolder: (directory) => [...tree].some((file) => file.startsWith(`${directory}/`)),
});

test("check arguments resolve node --test and node --check paths, following cd", () => {
  assert.deepEqual(checkPathArguments([
    "node --check tool/a.mjs",
    "node --test tool/a.test.mjs tool/b.test.mjs",
    "node --test --test-concurrency=1 tool/c.test.mjs",
    "(cd functions && node --test lib/x.test.js)",
    "npm --prefix functions run build && node --test functions/test/a.test.cjs",
    "node tool/a.mjs --check",
    "node --test tool/**/*.test.mjs",
  ]), ["tool/a.mjs", "tool/a.test.mjs", "tool/b.test.mjs", "tool/c.test.mjs", "functions/lib/x.test.js",
    "functions/test/a.test.cjs"]);
});

test("a check or impactPath that names a missing file fails; build outputs and globs do not", () => {
  assert.deepEqual(paths([gate({impactPaths: ["tool/check_fixture.test.mjs", "lib/**/*.dart", "functions/src"]})]), []);
  // functions/lib is a listed build output that an earlier check creates.
  assert.deepEqual(paths([gate({checks: ["npm --prefix functions run build", "node --test functions/lib/x.test.js",
    "node tool/check_fixture.mjs"]})]), []);
  assert.deepEqual(paths([gate({
    checks: ["node --test tool/renamed.test.mjs", "node tool/check_fixture.mjs"],
    impactPaths: ["tool/gone.mjs", "functions/test/missing.test.cjs"],
  })]), [
    "fixture:gate: check names tool/renamed.test.mjs, which does not exist.",
    "fixture:gate: impactPath tool/gone.mjs does not exist.",
    "fixture:gate: impactPath functions/test/missing.test.cjs does not exist.",
  ]);
  assert.deepEqual(paths([retired({checks: undefined})]), []);
});

test("a path in a renamed or deleted folder fails; only listed build outputs are exempt", () => {
  assert.deepEqual(paths([gate({
    checks: ["node --test tool/moved_away/x.test.mjs", "node tool/check_fixture.mjs"],
    impactPaths: ["tool/moved_away/helper.mjs", "packages/gone/lib/a.dart"],
  })]), [
    "fixture:gate: check names tool/moved_away/x.test.mjs, which does not exist.",
    "fixture:gate: impactPath tool/moved_away/helper.mjs does not exist.",
    "fixture:gate: impactPath packages/gone/lib/a.dart does not exist.",
  ]);
  assert.deepEqual(paths([gate({checks: ["node --test functions/lib/a/b.test.js", "node tool/check_fixture.mjs"],
    impactPaths: ["functions/lib/a/b.js"]})]), []);
});

test("every exempt build-output root is ignored by Git, so it cannot hide source", () => {
  assert.ok(buildOutputRoots.length > 0);
  for (const root of buildOutputRoots) {
    const probe = `${root}build-output-probe.js`;
    const result = spawnSync("git", ["check-ignore", "-q", "--no-index", probe], {encoding: "utf8"});
    assert.equal(result.status, 0, `${root} is not ignored by Git; only build outputs may be exempt`);
    const tracked = spawnSync("git", ["ls-files", "--", root], {encoding: "utf8"});
    assert.equal(tracked.stdout.trim(), "", `${root} holds tracked files`);
  }
});
