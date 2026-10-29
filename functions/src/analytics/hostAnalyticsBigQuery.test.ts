import assert from "node:assert/strict";
import test from "node:test";
import {
  BigQueryHostAnalyticsSource,
  hostAnalyticsLinkRowsSql,
  hostAnalyticsRowsSql,
} from "./hostAnalyticsBigQuery";
import {buildHostAnalyticsFromRecords, resolveAnalyticsRange} from
  "./hostAnalytics";
import type {BigQueryClient} from "../shared/bigQuery";

const range = {startDate: "2026-06-01", endDate: "2026-06-30"};
const scope = {clubIds: ["org"], eventId: null};
function clientFor(rows: Array<Record<string, unknown>>): BigQueryClient {
  return {
    async query<T>() {
      return rows as T[];
    },
    async insertRows() {},
  };
}

test("optional booking clicks remain unknown " +
  "for absent/null warehouse data", async () => {
  for (const value of [null, undefined]) {
    const source = new BigQueryHostAnalyticsSource(clientFor([{
      date: "2026-06-18", clubId: "org", eventId: null,
      outboundBookingClicks: value, bookedCount: null, listingViews: "12",
    }]), "project.dataset.mart");
    const rows = await source.loadRows(range, scope);
    assert.equal(rows[0].outboundBookingClicks, undefined);
    assert.equal(rows[0].bookedCount, 0);
    assert.equal(rows[0].listingViews, 12);
    const now = new Date("2026-06-18T12:00:00Z");
    const report = buildHostAnalyticsFromRecords(
      {clubs: [], events: [], martRows: rows},
      resolveAnalyticsRange({rangePreset: "30d"}, now), now);
    assert.equal(report.summaryCards.find((card) =>
      card.id === "outboundBookingClicks")?.status, "missing");
  }
});

test("known booking-click zero and positive " +
  "values remain measured", async () => {
  const source = new BigQueryHostAnalyticsSource(clientFor([
    {outboundBookingClicks: 0}, {outboundBookingClicks: "17"},
  ]), "project.dataset.mart");
  const rows = await source.loadRows(range, scope);
  assert.equal(rows[0].outboundBookingClicks, 0);
  assert.equal(rows[1].outboundBookingClicks, 17);
});

test("optional-column SQL serializes the row " +
  "and preserves unknown grouped values", () => {
  const sql = hostAnalyticsRowsSql("project.dataset.mart");
  const extraction = "SAFE_CAST(JSON_VALUE(TO_JSON_STRING(martRow), " +
    "'$.outbound_booking_clicks') AS INT64)";
  assert.ok(sql.includes("FROM `project.dataset.mart` AS martRow"));
  assert.ok(sql.includes(`CASE WHEN COUNT(*) = COUNT(${extraction})`));
  assert.ok(sql.includes(`THEN SUM(${extraction})`));
  assert.ok(sql.includes("ELSE NULL END AS outboundBookingClicks"));
  assert.doesNotMatch(sql, /SUM\(outbound_booking_clicks\)/);
  assert.ok(sql.includes("SUM(booked_count) AS bookedCount"));
  assert.ok(sql.includes("club_id IN UNNEST(@clubIds)"));
});

test("link clicks read the additive column as zero before it exists", () => {
  const sql = hostAnalyticsRowsSql("project.dataset.mart");
  assert.ok(sql.includes("COALESCE(SUM(SAFE_CAST(JSON_VALUE(" +
    "TO_JSON_STRING(martRow), '$.link_clicks') AS INT64)), 0) AS linkClicks"));
  assert.doesNotMatch(sql, /SUM\(link_clicks\)/);
});

test("owner link rows come from the link mart for the organizers in scope",
  async () => {
    const queries: Array<{sql: string; params: unknown}> = [];
    const source = new BigQueryHostAnalyticsSource({
      async query<T>(sql: string, params: unknown) {
        queries.push({sql, params});
        return [{clubId: "org", linkId: "tickets", trafficSource: "qr",
          linkClicks: "3"}] as T[];
      },
      async insertRows() {},
    }, "project.dataset.mart", "project.dataset.links");
    assert.deepEqual(await source.loadLinkRows(range, ["org"]), [
      {clubId: "org", linkId: "tickets", trafficSource: "qr", linkClicks: 3},
    ]);
    assert.ok(queries[0].sql.includes("FROM `project.dataset.links`"));
    assert.ok(queries[0].sql.includes("club_id IN UNNEST(@clubIds)"));
    assert.deepEqual(await source.loadLinkRows(range, []), []);
    assert.equal(queries.length, 1);
    assert.match(hostAnalyticsLinkRowsSql("t"),
      /GROUP BY club_id, link_id, traffic_source/u);
  });
