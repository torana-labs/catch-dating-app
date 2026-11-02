import assert from "node:assert/strict";
import test from "node:test";
import {
  sourceRulesFromManifest,
  validateToolRoles,
  validateToolRules,
} from "./tool_manifest_rules.mjs";

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
