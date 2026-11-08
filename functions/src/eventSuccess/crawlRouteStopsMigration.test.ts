import assert from "node:assert/strict";
import test from "node:test";
import {planCrawlRouteStopsMigration} from "./crawlRouteStopsMigration";

const now = Date.parse("2026-11-08T12:00:00.000Z");
const later = now + 7 * 24 * 60 * 60 * 1000;

test("only future crawls still on freeFormMixer move to routeStops", () => {
  const plan = planCrawlRouteStopsMigration([
    {id: "friday-crawl", organizerId: "club-1", startTimeMillis: later,
      activityKind: "barCrawl", interactionModel: "freeFormMixer",
      planSelectsGuidedRotations: true},
    {id: "past-crawl", organizerId: "club-1", startTimeMillis: now - 1,
      activityKind: "barCrawl", interactionModel: "freeFormMixer"},
    {id: "started-crawl", organizerId: "club-1", startTimeMillis: now,
      activityKind: "barCrawl", interactionModel: "freeFormMixer"},
    {id: "event-friday-pub-crawl-hyderabad",
      organizerId: "club-pub-crawl-hyderabad", startTimeMillis: later,
      activityKind: "barCrawl", interactionModel: "freeFormMixer"},
    {id: "new-crawl", organizerId: "club-1", startTimeMillis: later,
      activityKind: "barCrawl", interactionModel: "routeStops"},
    {id: "mixer", organizerId: "club-1", startTimeMillis: later,
      activityKind: "singlesMixer", interactionModel: "freeFormMixer"},
  ], now);

  assert.deepEqual(plan.migrate.map((entry) => entry.eventId),
    ["friday-crawl"]);
  assert.equal(plan.migrate[0].warnings.length, 1);
  assert.deepEqual(
    Object.fromEntries(plan.skipped.map((entry) =>
      [entry.eventId, entry.reason])),
    {
      "past-crawl": "past or started",
      "started-crawl": "past or started",
      "event-friday-pub-crawl-hyderabad": "demo crawl kept",
      "new-crawl": "already routeStops",
      "mixer": "not a crawl",
    }
  );
});
