import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import record from "./brand.json" with {type: "json"};
import {applyBrand, applyBrandText, brand, brandConsistencyErrors, webUrl} from "./index.mjs";
import {compare, rules, scanText} from "./check_brand_literals.mjs";
import {outputs, renderDartModule, renderFunctionsModule, renderWebsiteModule} from "./generate.mjs";
import {rewriteSurface, surfacePaths} from "./managed.mjs";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(packageDir, "../..");

// The schema uses only object, string, null, required, pattern, length and
// local $ref, so a small walker validates it without a dependency.
function schemaErrors(root, node, value, at) {
  const rule = node.$ref ? root.$defs[node.$ref.replace("#/$defs/", "")] : node;
  const types = [rule.type].flat();
  if (value === null) return types.includes("null") ? [] : [`${at} must not be null`];
  if (types.includes("object")) {
    if (typeof value !== "object") return [`${at} must be an object`];
    const errors = (rule.required ?? []).filter((key) => !(key in value)).map((key) => `${at}.${key} is required`);
    for (const [key, child] of Object.entries(value)) {
      if (!rule.properties?.[key]) errors.push(`${at}.${key} is not allowed`);
      else errors.push(...schemaErrors(root, rule.properties[key], child, `${at}.${key}`));
    }
    return errors;
  }
  if (typeof value !== "string") return [`${at} must be a string`];
  const errors = [];
  if (rule.pattern && !new RegExp(rule.pattern, "u").test(value)) errors.push(`${at} does not match ${rule.pattern}`);
  if (rule.minLength && value.length < rule.minLength) errors.push(`${at} is too short`);
  if (rule.maxLength && value.length > rule.maxLength) errors.push(`${at} is too long`);
  return errors;
}

test("the record matches its schema and keeps every origin on the primary domain", () => {
  const schema = JSON.parse(fs.readFileSync(path.join(packageDir, "brand.schema.json"), "utf8"));
  assert.deepEqual(schemaErrors(schema, schema, record, "brand"), []);
  assert.deepEqual(brandConsistencyErrors(), []);
  assert.match(schemaErrors(schema, schema, {...record, web: {...record.web, origin: "http://x"}}, "brand").join(), /web\.origin/u);
  const moved = {...brand, web: {...brand.web, adminOrigin: "https://admin.example.org"}};
  assert.match(brandConsistencyErrors(moved).join("\n"), /web\.adminOrigin/u);
});

test("tokens resolve against the record and unknown tokens fail loudly", () => {
  assert.equal(applyBrandText("Use {{brand.name}} at {{ brand.web.domain }}."),
    `Use ${brand.name} at ${brand.web.domain}.`);
  assert.deepEqual(applyBrand({a: ["{{brand.operator.legalName}}"], b: 3, c: null}),
    {a: [brand.operator.legalName], b: 3, c: null});
  assert.throws(() => applyBrandText("{{brand.nope}}"), /Unknown brand token/u);
  assert.throws(() => applyBrandText("{{brand.web}}"), /Unknown brand token/u);
  assert.equal(webUrl("/privacy/"), `${brand.web.origin}/privacy/`);
  assert.throws(() => webUrl("privacy"), /start with/u);
});

test("the guard derives its patterns from the record", () => {
  const renamed = {...brand, name: "Lumen", web: {...brand.web, domain: "lumen.example"},
    social: {instagramHandle: "lumen_app"}, support: {...brand.support, email: "help@lumen.example"}};
  const counts = scanText("website/src/content/x.ts",
    "const a = 'https://lumen.example/x';\nconst b = 'Lumen is here';\nconst c = 'LumenButton';\n@lumen_app", rules(renamed));
  assert.deepEqual(counts, {"domain": 1, "instagram-handle": 1, "name-in-copy": 1});
  assert.deepEqual(scanText("functions/src/x.ts", "Lumen is here", rules(renamed)), {});
  assert.deepEqual(scanText("functions/src/x.ts",
    "to: 'help@lumen.example', // brand-literal-ok: owner inbox", rules(renamed)), {});
});

test("the allowlist may only shrink", () => {
  const allowlist = {domain: {"a.ts": 2}};
  assert.deepEqual(compare({domain: {"a.ts": 2}}, allowlist), {errors: [], stale: []});
  assert.equal(compare({domain: {"a.ts": 3}}, allowlist).errors.length, 1);
  assert.equal(compare({domain: {"b.ts": 1}}, allowlist).errors.length, 1);
  assert.deepEqual(compare({domain: {"a.ts": 1}}, allowlist).stale, [{id: "domain", file: "a.ts", count: 1}]);
});

test("generated outputs are current", () => {
  for (const output of outputs()) {
    assert.equal(fs.readFileSync(path.join(repoRoot, output.path), "utf8"), output.content,
      `${output.path} is stale; run node packages/brand/generate.mjs`);
  }
});

test("a rebrand rewrites every managed surface and leaves the noun exceptions alone", () => {
  const managed = JSON.parse(fs.readFileSync(path.join(packageDir, "managed_surfaces.json"), "utf8"));
  const applied = JSON.parse(fs.readFileSync(path.join(packageDir, "applied.json"), "utf8"));
  const renamed = JSON.parse(JSON.stringify(applied).replaceAll(applied.web.domain, "lumen.example")
    .replaceAll(`"${applied.name}`, "\"Lumen").replaceAll(applied.social.instagramHandle, "lumen_app"));
  let rewritten = 0;
  for (const surface of managed.surfaces) {
    for (const file of surfacePaths(repoRoot, surface)) {
      const before = fs.readFileSync(path.join(repoRoot, file), "utf8");
      const after = rewriteSurface(before, surface, applied, renamed);
      assert.ok(!after.includes(applied.web.domain), `${file} still names ${applied.web.domain} after a rebrand`);
      if (after !== before) rewritten += 1;
    }
  }
  assert.ok(rewritten >= managed.surfaces.length);
  const arb = managed.surfaces.find((surface) => surface.path.endsWith(".arb"));
  const messages = JSON.parse(fs.readFileSync(path.join(repoRoot, arb.path), "utf8"));
  const after = JSON.parse(rewriteSurface(JSON.stringify(messages, null, 2), arb, applied, renamed));
  for (const key of arb.exceptKeys) assert.equal(after[key], messages[key], `${key} must keep its noun`);
  assert.equal(after.appTitleHost, renamed.stores.hostAppName);
});

test("the applied record matches brand.json", () => {
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(packageDir, "applied.json"), "utf8")),
    JSON.parse(JSON.stringify(brand)));
});

const withStores = (consumer, host = {ios: null, android: null}) =>
  ({...record, stores: {...record.stores, consumer, host}});

test("store links are a validated URL or null", () => {
  const schema = JSON.parse(fs.readFileSync(path.join(packageDir, "brand.schema.json"), "utf8"));
  const valid = withStores(
    {ios: "https://apps.apple.com/in/app/catch-run-clubs/id6739000001",
      android: "https://play.google.com/store/apps/details?id=com.catchdates.app"},
    {ios: "https://apps.apple.com/app/id6739000002", android: null});
  assert.deepEqual(schemaErrors(schema, schema, withStores({ios: null, android: null},
    {ios: "https://apps.apple.com/app/catch-host/id6778927317", android: null}), "brand"), [],
  "the storefront-neutral form (slug, no country) is accepted");
  assert.deepEqual(schemaErrors(schema, schema, valid, "brand"), []);
  for (const [platform, url] of [
    ["ios", "https://apps.apple.com/in/app/catch"],
    ["ios", "http://apps.apple.com/app/id1"],
    ["ios", "https://apps.apple.com.evil.example/app/id1"],
    ["ios", "https://play.google.com/store/apps/details?id=com.catchdates.app"],
    ["android", "https://play.google.com/store/apps/details?id=Catch"],
    ["android", "https://play.google.com/store/apps/details?id=com.catchdates.app&hl=en"],
    ["android", "https://apps.apple.com/app/id1"],
    ["android", ""],
  ]) {
    const candidate = withStores({ios: null, android: null, [platform]: url});
    assert.match(schemaErrors(schema, schema, candidate, "brand").join(),
      new RegExp(`stores\\.consumer\\.${platform}`, "u"), url);
  }
  assert.match(schemaErrors(schema, schema, withStores({ios: null}), "brand").join(), /android is required/u);
});

test("a Google Play link names the role's production package", () => {
  const targets = JSON.parse(fs.readFileSync(path.join(repoRoot, "tool/app_targets.json"), "utf8"));
  const productionIds = JSON.stringify(targets).match(/"applicationId":\s*"com\.catchdates\.(?:app|host)"/gu) ?? [];
  assert.equal(productionIds.length, 2, "tool/app_targets.json lists both production applicationIds");
  for (const role of ["consumer", "host"]) {
    const link = brand.stores[role].android;
    if (link === null) continue;
    const expected = role === "consumer" ? "com.catchdates.app" : "com.catchdates.host";
    assert.equal(new URL(link).searchParams.get("id"), expected, `stores.${role}.android`);
  }
});

test("store links reach every runtime copy, null or set", () => {
  const empty = withStores({ios: null, android: null});
  const dartEmpty = renderDartModule(empty);
  assert.match(dartEmpty, /static const String\? storesConsumerIos = null;/u);
  assert.match(dartEmpty, /static const String\? storesHostAndroid = null;/u);
  const ios = "https://apps.apple.com/app/id6739000001";
  const set = withStores({ios, android: null});
  const dartSet = renderDartModule(set);
  assert.ok(dartSet.includes(`static const String? storesConsumerIos =\n      '${ios}';`) ||
    dartSet.includes(`static const String? storesConsumerIos = '${ios}';`), dartSet);
  assert.ok(dartSet.includes("  // ignore: unnecessary_nullable_for_final_variable_declarations\n  static const String? storesConsumerIos"),
    "a set link keeps String? without tripping --fatal-infos");
  assert.ok(!dartEmpty.includes("// ignore:"), "null slots need no ignore");
  for (const render of [renderFunctionsModule, renderWebsiteModule]) {
    assert.match(render(empty), /"consumer": \{\n\s+"ios": null,/u);
    assert.ok(render(set).includes(`"ios": "${ios}"`));
    assert.match(render(set), /export type StoreLink = string \| null;/u);
  }
});
