import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {inMarket} from "../src/content/markets/in.ts";

test("India market pack has stable, internally consistent city contracts", () => {
  assert.equal(inMarket.countryCode, "IN");
  assert.equal(inMarket.locale, "en-IN");
  assert.equal(inMarket.currencyCode, "INR");
  assert.deepEqual(inMarket.appStoreCountryCodes, ["IN"]);

  const cityIds = new Set(inMarket.cities.map((city) => city.id));
  const citySlugs = new Set(inMarket.cities.map((city) => city.slug));
  assert.equal(cityIds.size, inMarket.cities.length, "city ids must be unique");
  assert.equal(citySlugs.size, inMarket.cities.length, "city slugs must be unique");

  for (const city of inMarket.cities) {
    assert.match(city.id, /^in-[a-z0-9]{1,3}-[a-z0-9-]+$/u);
    assert.match(city.slug, /^[a-z0-9-]+$/u);
    assert.doesNotThrow(() =>
      new Intl.DateTimeFormat(inMarket.locale, {timeZone: city.timezone})
    );
  }

  assert.equal(cityIds.has(inMarket.featuredCityId), true);
  assert.equal(cityIds.has(inMarket.exampleEvent.cityId), true);
  assert.equal(inMarket.exampleEvent.currencyCode, inMarket.currencyCode);
  assert.equal(
    inMarket.cities.find((city) => city.id === inMarket.exampleEvent.cityId)?.timezone,
    inMarket.exampleEvent.timezone
  );
  assert.doesNotThrow(() =>
    new Intl.NumberFormat(inMarket.locale, {
      style: "currency",
      currency: inMarket.currencyCode,
    }).format(1200)
  );

  // The pack lists exactly the catalog's website-listed Indian cities, in
  // catalog order, with each city's lifecycle as its status.
  const catalog = JSON.parse(fs.readFileSync(new URL("../../contracts/catalogs/markets.json", import.meta.url), "utf8"));
  const listed = catalog.cities.filter((city) => city.countryIsoCode === "IN" && city.surfaces.websiteListed);
  assert.deepEqual(inMarket.cities.map((city) => [city.id, city.slug, city.label, city.status]),
    listed.map((city) => [city.marketId, city.slug, city.label, city.lifecycle]));
  assert.equal(inMarket.cities.every((city) => city.slug === city.marketSlug), true);
  assert.deepEqual(
    [...inMarket.cities.map((city) => city.label), inMarket.otherCityOptionLabel].at(-1),
    "Other"
  );
});

test("retired website city slugs stay reachable through legacySlugs", () => {
  const legacy = Object.fromEntries(inMarket.cities.flatMap((city) => city.legacySlugs.map((slug) => [slug, city.slug])));
  assert.deepEqual(legacy, {delhi: "delhi-ncr", bangalore: "bengaluru"});
  const slugs = new Set(inMarket.cities.map((city) => city.slug));
  for (const slug of Object.keys(legacy)) assert.equal(slugs.has(slug), false, `${slug} must not also be a live slug`);
});
