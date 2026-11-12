// The supply-intake crawl targets select catalog cities by slug. They are
// listed as "reference" files in tool/contracts/market_list_allowlist.json,
// which names this test as their validator: every slug, name and country
// here must match contracts/catalogs/markets.json.
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const readJson = (relative) =>
  JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), "utf8"));
const catalog = readJson("../../contracts/catalogs/markets.json");
const config = "../src/workflows/supply-intake/config/";
const targets = readJson(`${config}target_categories.json`);
const matrix = readJson(`${config}search_matrix.json`);
const citiesBySlug = new Map(catalog.cities.map((city) => [city.slug, city]));

test("crawl targets name catalog cities with catalog labels and countries", () => {
  assert.ok(targets.cities.length > 0);
  for (const target of targets.cities) {
    const city = citiesBySlug.get(target.slug);
    assert.ok(city, `${target.slug} is not a catalog city slug`);
    assert.equal(target.name, city.label, `${target.slug} name`);
    assert.equal(target.countryCode, city.countryIsoCode, `${target.slug} country`);
  }
});

test("search matrix cities are crawl targets", () => {
  const targetSlugs = new Set(targets.cities.map((city) => city.slug));
  for (const search of matrix.genericSearches) {
    for (const slug of search.citySlugs) {
      assert.ok(targetSlugs.has(slug),
        `${search.queryTemplateId} searches ${slug}, which is not a crawl target`);
    }
  }
});
