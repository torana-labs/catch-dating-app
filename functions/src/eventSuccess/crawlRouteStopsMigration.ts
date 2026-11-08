/**
 * Moves future crawl events saved before `routeStops` existed onto it.
 *
 * Crawls used to save the `freeFormMixer` interaction model. The live
 * features follow the saved snapshot, so those events keep mixer behaviour
 * (partner rotations, no stops) until migrated. Only future events move;
 * past events and the Hyderabad demo crawl stay as they are. Only the
 * event's format changes: the host's saved plan is left alone, and a plan
 * that still selects guided rotations is reported so the host can review
 * it.
 */

/** Demo worlds deliberately kept on their saved model. */
const PRESERVED_ID_FRAGMENTS = ["pub-crawl-hyderabad"];

export interface CrawlMigrationEvent {
  id: string;
  organizerId?: unknown;
  startTimeMillis: number | null;
  activityKind?: unknown;
  interactionModel?: unknown;
  planSelectsGuidedRotations?: boolean;
}

export interface CrawlMigrationPlan {
  migrate: Array<{eventId: string; warnings: string[]}>;
  skipped: Array<{eventId: string; reason: string}>;
}

/** The field update for one migrated event. */
export const CRAWL_ROUTE_STOPS_PATCH = {
  "eventFormat.interactionModel": "routeStops",
} as const;

/**
 * Decides which crawl events move to `routeStops`.
 * @param {CrawlMigrationEvent[]} events Candidate events.
 * @param {number} nowMillis Clock.
 * @return {CrawlMigrationPlan} Events to migrate and why others are skipped.
 */
export function planCrawlRouteStopsMigration(
  events: CrawlMigrationEvent[],
  nowMillis: number
): CrawlMigrationPlan {
  const plan: CrawlMigrationPlan = {migrate: [], skipped: []};
  for (const event of [...events].sort((a, b) => a.id.localeCompare(b.id))) {
    if (event.activityKind !== "barCrawl") {
      plan.skipped.push({eventId: event.id, reason: "not a crawl"});
      continue;
    }
    if (event.interactionModel !== "freeFormMixer") {
      plan.skipped.push({eventId: event.id,
        reason: `already ${String(event.interactionModel ?? "unset")}`});
      continue;
    }
    if (PRESERVED_ID_FRAGMENTS.some((fragment) =>
      event.id.includes(fragment) ||
        (typeof event.organizerId === "string" &&
          event.organizerId.includes(fragment)))) {
      plan.skipped.push({eventId: event.id, reason: "demo crawl kept"});
      continue;
    }
    if (event.startTimeMillis === null || event.startTimeMillis <= nowMillis) {
      plan.skipped.push({eventId: event.id, reason: "past or started"});
      continue;
    }
    plan.migrate.push({
      eventId: event.id,
      warnings: event.planSelectsGuidedRotations === true ?
        ["The saved plan selects guided rotations, which crawls no longer " +
          "offer; the host should review it."] :
        [],
    });
  }
  return plan;
}
