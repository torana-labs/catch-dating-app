import assert from "node:assert/strict";
import test from "node:test";
import {readMarketCatalog} from "../lib/market_catalog.mjs";
import {buildCityInterestBackfillPlan, cityInterestMarkerId, cityNameIndex, matchCity} from "./backfill_city_interest.mjs";

const catalog = readMarketCatalog();
const at = (iso) => ({toDate: () => new Date(iso)});

test("free-text cities map to one catalog city by label, alias or legacy id", () => {
  const index = cityNameIndex(catalog);
  assert.equal(matchCity("Bangalore", index)?.marketId, "in-ka-bengaluru");
  assert.equal(matchCity(" new delhi ", index)?.marketId, "in-dl-delhi-ncr");
  assert.equal(matchCity("Bombay", index)?.marketId, "in-mh-mumbai");
  assert.equal(matchCity("Atlantis", index), null);
  assert.equal(matchCity("", index), null);
});

test("a spelling two cities share is ambiguous and left alone", () => {
  const index = cityNameIndex({cities: [
    {marketId: "aa-xx-one", cityId: "aa-xx-one", slug: "one", label: "One", cityLabel: "One", aliases: ["twin"]},
    {marketId: "aa-xx-two", cityId: "aa-xx-two", slug: "two", label: "Two", cityLabel: "Two", aliases: ["twin"]},
  ]});
  assert.equal(matchCity("Twin", index), null);
});

test("the plan counts each person once per city and reports what did not match", () => {
  const rows = [
    {id: "a", data: {role: "member", phone: "+919812345678", city: "Pune", createdAt: at("2026-11-01T05:00:00Z")}},
    {id: "b", data: {role: "member", phone: "+919812345678", city: "pune", createdAt: at("2026-11-02T05:00:00Z")}},
    {id: "c", data: {role: "member", email: "Guest@Example.test", city: "Bangalore", createdAt: at("2026-11-03T05:00:00Z")}},
    {id: "d", data: {role: "member", phone: "+919800000000", city: "Jaipur"}},
    {id: "e", data: {role: "host", email: "host@example.test", city: "Pune"}},
    {id: "f", data: {role: "member", phone: "+919811111111", city: "Pune", cityId: "in-mh-pune", countryIsoCode: "IN",
      createdAt: at("2026-11-04T05:00:00Z")}},
  ];
  const plan = buildCityInterestBackfillPlan({rows, existingMarkerIds: [], catalog});
  assert.deepEqual(plan.updates.map((update) => [update.id, update.cityId]),
    [["a", "in-mh-pune"], ["b", "in-mh-pune"], ["c", "in-ka-bengaluru"]]);
  assert.deepEqual(plan.counters.map((entry) => [entry.cityKey, entry.markers.map((marker) => marker.day)]),
    [["in-mh-pune", ["2026-11-01", "2026-11-04"]], ["in-ka-bengaluru", ["2026-11-03"]]]);
  assert.deepEqual(plan.unmatched, [{city: "Jaipur", rows: 1}]);
  assert.equal(JSON.stringify(plan.counters).includes("9812345678"), false);

  // A rerun after the markers exist counts nothing again.
  const markers = plan.counters.flatMap((entry) => entry.markers.map((marker) => marker.markerId));
  assert.equal(buildCityInterestBackfillPlan({rows, existingMarkerIds: markers, catalog}).summary.peopleCounted, 0);
});

test("marker ids match the ones joinWaitlist writes", () => {
  // functions/src/cityInterest/adminGetCityInterest.test.ts pins the same value.
  assert.equal(cityInterestMarkerId("+919812345678", "in-mh-pune"),
    "5d81404e28394b8451e0782a3a91844097a55ade4e04ed8d14e5f90bd2814b00");
});
