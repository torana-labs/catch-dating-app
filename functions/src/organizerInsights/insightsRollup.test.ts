import test from "node:test";
import assert from "node:assert/strict";
import * as admin from "firebase-admin";
import type {
  HostAnalyticsBigQuerySource,
  HostAnalyticsMartRow,
} from "../analytics/hostAnalyticsBigQuery";
import {
  backfillOrganizerInsights,
  buildOrganizerInsights,
  organizerInsightsId,
  rollupOrganizerInsightsDay,
  utcDayKey,
} from "./insightsRollup";
import {ownerViewTestStore} from "./ownerViewTestStore";

const date = "2026-11-07";

function mart(organizerId: string, listingViews: number,
  outboundBookingClicks?: number): HostAnalyticsMartRow {
  return {date, organizerId, listingViews, outboundBookingClicks,
    linkClicks: 0} as unknown as HostAnalyticsMartRow;
}

test("folds visits, link clicks by link and source, bookings, followers",
  () => {
    const documents = buildOrganizerInsights({
      date,
      martRows: [mart("org-1", 40, 3), mart("org-1", 2), mart("org-2", 0),
        {...mart("org-1", 99), date: "2026-11-06"}],
      linkRows: [
        {organizerId: "org-1", linkId: "tickets", trafficSource: "instagram",
          linkClicks: 7},
        {organizerId: "org-1", linkId: "tickets", trafficSource: null,
          linkClicks: 2},
        {organizerId: "org-1", linkId: "community", trafficSource: "qr",
          linkClicks: 1},
      ],
      newFollowers: new Map([["org-1", 4], ["org-3", 1]]),
      computedAtMillis: 5,
    });
    assert.deepEqual(documents.map((doc) => doc.organizerId),
      ["org-1", "org-3"]);
    const [first, second] = documents;
    assert.equal(first.visits, 42);
    assert.equal(first.bookingClicks, 3);
    assert.equal(first.linkClicks, 10);
    assert.equal(first.newFollowers, 4);
    assert.deepEqual(first.links, [{linkId: "tickets", clicks: 9},
      {linkId: "community", clicks: 1}]);
    assert.deepEqual(first.sources, [{source: "instagram", clicks: 7},
      {source: "other", clicks: 2}, {source: "qr", clicks: 1}]);
    assert.equal(second.visits, 0);
    assert.equal(second.newFollowers, 1);
  });

test("writes one document per active owned organiser for the day",
  async () => {
    const at = (iso: string) => admin.firestore.Timestamp.fromDate(
      new Date(iso));
    const {db, docs} = ownerViewTestStore({
      "organizers/org-1": {ownerUserId: "owner"},
      "organizers/org-2": {ownerUserId: "owner-2"},
      "organizers/unclaimed": {ownerUserId: null},
      "organizerFollows/a": {organizerId: "org-2",
        followedAt: at("2026-11-07T10:00:00Z")},
      "organizerFollows/b": {organizerId: "org-2",
        followedAt: at("2026-11-08T00:00:00Z")},
      "organizerFollows/c": {organizerId: "unclaimed",
        followedAt: at("2026-11-07T12:00:00Z")},
    });
    const asked: string[][] = [];
    const analytics = {
      loadRows: async (_range: unknown, scope: {organizerIds: string[]}) => {
        asked.push(scope.organizerIds);
        return [mart("org-1", 5)];
      },
      loadLinkRows: async () => [],
    } as unknown as HostAnalyticsBigQuerySource;
    const summary = await rollupOrganizerInsightsDay(date, {
      firestore: () => db, analytics, now: () => new Date(9)});
    assert.deepEqual(summary, {date, organizers: 2, written: 2});
    assert.deepEqual(asked, [["org-1", "org-2"]]);
    assert.equal(docs[`organizerInsights/${organizerInsightsId("org-1",
      date)}`].visits, 5);
    assert.equal(docs["organizerInsights/org-2_20261107"].newFollowers, 1);
    assert.equal(docs["organizerInsights/unclaimed_20261107"], undefined);
  });

test("backfill is a dry run unless applied and covers whole days",
  async () => {
    const {db, docs} = ownerViewTestStore({
      "organizers/org-1": {ownerUserId: "owner"}});
    const analytics = {
      loadRows: async (range: {startDate: string}) =>
        [{...mart("org-1", 1), date: range.startDate}],
      loadLinkRows: async () => [],
    } as unknown as HostAnalyticsBigQuerySource;
    const now = new Date("2026-11-08T01:00:00Z");
    const deps = {firestore: () => db, analytics, now: () => now};
    const dry = await backfillOrganizerInsights(3, deps);
    assert.deepEqual(dry.map((day) => day.date),
      ["2026-11-05", "2026-11-06", "2026-11-07"]);
    assert.equal(Object.keys(docs).length, 1);
    await backfillOrganizerInsights(3, deps, true);
    assert.ok(docs["organizerInsights/org-1_20261105"]);
    await assert.rejects(backfillOrganizerInsights(31, deps));
    assert.equal(utcDayKey(now, 1), "2026-11-07");
  });
