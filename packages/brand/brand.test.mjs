import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import record from "./brand.json" with {type: "json"};
import {applyBrand, applyBrandText, brand, brandConsistencyErrors, webUrl} from "./index.mjs";
import {compare, rules, scanText} from "./check_brand_literals.mjs";
import {outputs} from "./generate.mjs";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(packageDir, "../..");

test("the record matches its schema and keeps every origin on the primary domain", () => {
  const schema = JSON.parse(fs.readFileSync(path.join(packageDir, "brand.schema.json"), "utf8"));
  const validate = new Ajv2020({allErrors: true}).compile(schema);
  assert.ok(validate(record), JSON.stringify(validate.errors));
  assert.deepEqual(brandConsistencyErrors(), []);
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
});

test("ARB metadata does not count as copy", () => {
  const arb = JSON.stringify({greeting: `Welcome to ${brand.name}`, "@greeting": {description: `${brand.name} greeting`}});
  assert.deepEqual(scanText("lib/l10n/app_en.arb", arb), {"name-in-copy": 1});
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
