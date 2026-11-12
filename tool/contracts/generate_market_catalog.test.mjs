import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  canonicalMarketsFromCatalog,
  launchStatusForLifecycle,
  marketCatalogErrors,
  readMarketCatalog,
  repoRoot,
} from "../lib/market_catalog.mjs";
import {
  citiesNamed,
  cityTokens,
  compareHandLists,
  outputs,
  renderDartModule,
  renderRules,
  schemaErrors,
} from "./generate_market_catalog.mjs";

const catalog = readMarketCatalog();
const clone = () => structuredClone(catalog);
const city = (value, marketId) =>
  value.cities.find((entry) => entry.marketId === marketId);

test("the committed catalog passes its schema and cross-record rules", () => {
  assert.deepEqual(schemaErrors(catalog), []);
  assert.deepEqual(marketCatalogErrors(catalog), []);
});

test("every generated copy is current", () => {
  for (const output of outputs(catalog)) {
    const current = fs.readFileSync(path.join(repoRoot, output.path), "utf8");
    assert.equal(current, output.content, `${output.path} is stale`);
  }
});

test("lifecycles map onto the launch status apps already read", () => {
  assert.equal(launchStatusForLifecycle("live"), "launched");
  assert.equal(launchStatusForLifecycle("paused"), "paused");
  for (const lifecycle of ["hidden", "waitlist", "launching"]) {
    assert.equal(launchStatusForLifecycle(lifecycle), "planned");
  }
  const records = canonicalMarketsFromCatalog(catalog);
  assert.deepEqual(
    records.filter((record) => record.launchStatus === "launched")
      .map((record) => record.marketId),
    ["in-mh-mumbai", "in-mp-indore"]
  );
  for (const record of records) {
    const launched = record.launchStatus === "launched";
    assert.equal(record.profileSelectable, launched, record.marketId);
    assert.equal(record.exploreVisible, launched, record.marketId);
  }
});

test("the schema rejects an unknown lifecycle and a missing surface", () => {
  const value = clone();
  city(value, "in-mh-pune").lifecycle = "soon";
  delete city(value, "in-mh-mumbai").surfaces.websiteListed;
  const errors = schemaErrors(value).join("\n");
  assert.match(errors, /lifecycle/);
  assert.match(errors, /websiteListed/);
});

test("cross-record rules catch collisions and lifecycle misuse", () => {
  const value = clone();
  city(value, "in-mh-pune").aliases.push("bombay");
  city(value, "in-ka-bengaluru").surfaces.exploreVisible = true;
  city(value, "np-p3-kathmandu").surfaces.websiteListed = true;
  city(value, "in-tg-hyderabad").launchDate = "2026-12-01";
  value.countries[0].defaultMarketId = "np-p3-kathmandu";
  const errors = marketCatalogErrors(value).join("\n");
  assert.match(errors, /alias "bombay" of in-mh-pune already names in-mh-mumbai/);
  assert.match(errors, /in-ka-bengaluru: exploreVisible needs lifecycle live/);
  assert.match(errors, /np-p3-kathmandu: a hidden city cannot be websiteListed/);
  assert.match(errors, /in-tg-hyderabad: launchDate is only for a launching city/);
  assert.match(errors, /IN: defaultMarketId np-p3-kathmandu is in another country/);
});

test("a launching city may carry a real launch date", () => {
  const value = clone();
  const pune = city(value, "in-mh-pune");
  pune.lifecycle = "launching";
  pune.launchDate = "2027-01-15";
  assert.deepEqual(marketCatalogErrors(value), []);
  pune.launchDate = "2027-02-30";
  assert.match(marketCatalogErrors(value).join("\n"), /not a real date/);
});

test("rules keep the launch-market block in step with live cities", () => {
  const rules = fs.readFileSync(path.join(repoRoot, "firestore.rules"), "utf8");
  const value = clone();
  const pune = city(value, "in-mh-pune");
  pune.lifecycle = "live";
  Object.assign(pune.surfaces, {
    profileSelectable: true,
    hostCreatable: true,
    eventCreatable: true,
    exploreVisible: true,
  });
  const next = renderRules(value, rules);
  assert.match(next, /'in-mp-indore',\n {8}'in-mh-pune'\n {6}\];/);
  assert.equal(renderRules(catalog, next), rules);
  assert.throws(() => renderRules(catalog, "service cloud.firestore {}"),
    /markers/);
});

test("Dart output escapes dollar signs and keeps lines within 80 columns", () => {
  const dart = renderDartModule(catalog);
  assert.match(dart, /currencySymbol: 'A\\\$',/);
  for (const line of dart.split("\n")) {
    assert.ok(line.length <= 80, `over 80 columns: ${line}`);
  }
});

test("the scanner counts distinct catalog cities named in literals", () => {
  const tokens = cityTokens(catalog);
  assert.equal(citiesNamed(`["mumbai", "Bombay", "in-mh-mumbai"]`, tokens), 1);
  assert.equal(
    citiesNamed(`const c = ['Pune', "in-mp-indore", \`bangalore\`];`, tokens),
    3
  );
  assert.equal(citiesNamed("Mumbai and Pune in prose", tokens), 0);
});

test("the allowlist only shrinks and rejects new hand-maintained lists", () => {
  const entry = (cities) => ({cities, kind: "pending", reason: "Migrates in PR 3."});
  const allowlist = {"a.ts": entry(6), "b.ts": entry(4)};
  const result = compareHandLists({"a.ts": 6, "b.ts": 3, "c.ts": 3}, allowlist);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /^c\.ts: names 3 catalog cities \(0 allowed\)/);
  assert.deepEqual(result.stale, [{file: "b.ts", count: 3}]);
  assert.match(
    compareHandLists({}, {"d.ts": {cities: 3, kind: "other"}}).errors[0],
    /kind \(pending or fixture\)/
  );
});
