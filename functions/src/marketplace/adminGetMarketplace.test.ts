import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMarketplace,
  citiesSql,
  goingQuietSql,
  guestCohortsSql,
  weeksSql,
} from "./adminGetMarketplace";

test("queries read the raw export views and bind their parameters", () => {
  for (const sql of [citiesSql("p.d"), guestCohortsSql("p.d"),
    weeksSql("p.d"), goingQuietSql("p.d")]) {
    assert.match(sql, /`p\.d\.events_raw_latest`/u);
    assert.match(sql, /`p\.d\.event_participations_raw_latest`/u);
    assert.match(sql, /@market_id IS NULL/u);
    assert.doesNotMatch(sql, /\$\{/u);
  }
  assert.match(citiesSql("p.d"), /INTERVAL @range_days DAY/u);
  assert.match(goingQuietSql("p.d"), /LIMIT @limit/u);
});

test("rows become cities, guest cohorts, weeks and quiet organizers", () => {
  const result = buildMarketplace({rangeDays: 30, marketId: null,
    nowMillis: 5,
    cities: [{marketId: "mumbai", organizersLive: "51", events: "176",
      bookedWithCapacity: "810", capacity: "1000", bookedCheckedEvents: "500",
      attended: "460", waitlisted: "212"},
    {marketId: "pune", organizersLive: "0", events: "0",
      bookedWithCapacity: null, capacity: null, bookedCheckedEvents: null,
      attended: null, waitlisted: null}],
    cohorts: [{month: "2026-08", guests: "520", again30: "213",
      again60: "260", again90: "286", newestDays: "62"},
    {month: "2026-10", guests: "100", again30: "20", again60: "20",
      again90: "20", newestDays: "3"}],
    weeks: [{weekStart: "2026-10-27", bookings: "312", partial: false,
      eventsThisWeek: "48", eventsLastWeek: "39"},
    {weekStart: "2026-11-03", bookings: "96", partial: true,
      eventsThisWeek: "48", eventsLastWeek: "39"}],
    quiet: [{organizerId: "harbor", name: "Harbor Social Club",
      marketId: "mumbai", daysSinceLastEvent: "36",
      eventsPerMonthBefore: "4"}],
    owners: new Map([["harbor", {uid: "riya", name: "Riya Sharma"}]])});
  assert.deepEqual(result.cities[0], {marketId: "mumbai", organizersLive: 51,
    eventsPerWeek: 41.1, filledPercent: 81, noShowPercent: 8, waitlisted: 212});
  assert.deepEqual(result.cities[1], {marketId: "pune", organizersLive: 0,
    eventsPerWeek: 0, filledPercent: null, noShowPercent: null,
    waitlisted: 0});
  assert.deepEqual(result.guestCohorts[0], {month: "2026-08", guests: 520,
    again30Percent: 41, again60Percent: 50, again90Percent: null});
  assert.equal(result.guestCohorts[1].again30Percent, null);
  assert.deepEqual(result.stats, {eventsThisWeek: 48, eventsLastWeek: 39,
    filledPercent: 81, noShowPercent: 8, cameBackPercent: 41});
  assert.equal(result.bookingsByWeek[1].partial, true);
  assert.equal(result.goingQuiet[0].salesOwnerName, "Riya Sharma");
});
