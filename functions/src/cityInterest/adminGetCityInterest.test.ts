import assert from "node:assert/strict";
import test from "node:test";
import {buildCityInterest, interestWindow} from "./adminGetCityInterest";
import {cityInterestKey, cityInterestMarkerId} from "./cityInterest";
import {validateAdminGetCityInterestCallableResponse} from
  "../shared/generated/validators/adminGetCityInterestOutput";

const now = Date.parse("2026-11-12T10:00:00Z");
const stamp = {seconds: 0, nanoseconds: 0} as never;

test("windows end today (UTC) and compare with the days before", () => {
  const window = interestWindow({"2026-11-12": 2, "2026-11-06": 1,
    "2026-11-05": 4, "2026-10-14": 3, "2026-10-13": 5}, 20, now);
  assert.deepEqual(window, {total: 20, last7: 3, previous7: 4,
    last30: 10, previous30: 5});
});

test("catalog cities read by label and the rest as their country's Other",
  () => {
    const result = buildCityInterest([
      {schemaVersion: 1, cityKey: "other-in", cityId: null,
        countryIsoCode: "IN", total: 2, daily: {"2026-11-12": 2},
        updatedAt: stamp},
      {schemaVersion: 1, cityKey: "in-mh-pune", cityId: "in-mh-pune",
        countryIsoCode: "IN", total: 5, daily: {"2026-11-11": 5},
        updatedAt: stamp},
    ], now);
    assert.deepEqual(result.cities.map((city) =>
      [city.cityKey, city.label, city.lifecycle]),
    [["in-mh-pune", "Pune", "waitlist"], ["other-in", "Other (India)", null]]);
    assert.deepEqual(result.totals, {total: 7, last7: 7, previous7: 0,
      last30: 7, previous30: 0});
    assert.equal(result.today, "2026-11-12");
    assert.equal(validateAdminGetCityInterestCallableResponse(result), true);
  });

test("keys and marker ids keep the contact out and match the backfill", () => {
  assert.equal(cityInterestKey("in-mh-pune", "IN"), "in-mh-pune");
  assert.equal(cityInterestKey(null, "IN"), "other-in");
  assert.equal(cityInterestKey(null, null), "other-xx");
  const marker = cityInterestMarkerId("+919812345678", "in-mh-pune");
  assert.match(marker, /^[0-9a-f]{64}$/u);
  assert.equal(marker.includes("9812345678"), false);
  // tool/data/backfill_city_interest.test.mjs pins the same value.
  assert.equal(marker,
    "5d81404e28394b8451e0782a3a91844097a55ade4e04ed8d14e5f90bd2814b00");
});
