import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import test from "node:test";

const run = (args, env = process.env) => spawnSync(process.execPath,
  ["tool/design/check_component_lexicon.mjs", ...args],
  {cwd: process.cwd(), encoding: "utf8", env});
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

test("component lexicon resolves Flutter, React and surface adapter records", () => {
  const result = run([]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Component lexicon check passed/u);
});

test("component lexicon rejects a React implementation symbol that does not exist", () => {
  const result = run(["--known-bad"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /react symbol '__KnownMissingReactSymbol__' was not found/u);
});

test("component lexicon rejects a declared surface symbol that does not exist", () => {
  const result = run(["--known-bad-website", "--surfaces-only"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr,
    /known_bad_website_adapter: __KnownMissingWebsiteSymbol__ was not found/u);
});

test("component lexicon rejects a surface adapter of a Flutter-only contract", () => {
  const result = run(["--known-bad-adapter", "--surfaces-only"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /known_bad_adapter: BadgeRow points at catch\.distance_ring, a T3 contract/u);
});

test("one registry assigns identity and the retired web-ui registry stays deleted", () => {
  assert.throws(() => readFileSync("design/web-ui/components.json"), {code: "ENOENT"});
  const registry = readJson("design/components/catch.components.json");
  assert.equal(registry.components.some((component) => "surfaces" in component), false);
  for (const path of ["design/website/components.json", "design/admin/components.json"]) {
    const entries = readJson(path).components;
    assert.equal(entries.some((entry) => "lexicon" in entry || "lexiconId" in entry), false, path);
  }
});

test("structural labels remain distinct from status badges on every stack", () => {
  const registry = readJson("design/components/catch.components.json");
  const byId = new Map(registry.components.map((component) => [component.id, component]));
  assert.equal(byId.get("catch.typography")?.react?.symbol, "UiLabel");
  assert.equal(byId.get("catch.badge")?.react?.symbol, "CatchBadge");
  const adapters = (path) => new Map(readJson(path).components
    .filter((entry) => entry.componentId).map((entry) => [entry.exportName, entry.componentId]));
  const website = adapters("design/website/components.json");
  const admin = adapters("design/admin/components.json");
  assert.equal(website.get("UiLabel"), "catch.typography");
  assert.equal(admin.get("AdminEyebrow"), "catch.typography");
  assert.equal([...website.values(), ...admin.values()].includes("catch.badge"), false);
});

test("component lexicon rejects a third boolean on a production constructor", () => {
  const result = run(["--known-bad-api"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /CatchField.input: exposes 3 booleans.*unreviewedFlag/u);
});

test("website surface checks work without Dart while full API checks fail closed", () => {
  const env = {...process.env, PATH: ""};
  const surfaces = run(["--surfaces-only"], env);
  assert.equal(surfaces.status, 0, surfaces.stderr);
  assert.match(surfaces.stdout, /surface symbols only/u);
  assert.doesNotMatch(surfaces.stdout, /0 shared API/u);
  const full = run([], env);
  assert.equal(full.status, 1);
  assert.match(full.stderr, /Component API collection failed/u);
  assert.equal(run(["--surfaces-only", "--known-bad-api"], env).status, 64);
  const manifest = readJson("tool/tools_manifest.json");
  const gate = manifest.tools.find(({id}) => id === "design:component-lexicon");
  assert.ok(gate.ciRequirements.setup.includes("flutter-pub"));
  assert.ok(gate.checks.includes("node tool/design/check_component_lexicon.mjs"));
});
