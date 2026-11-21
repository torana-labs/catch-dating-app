// @vitest-environment node
import fs from "node:fs";
import {describe, expect, it, vi} from "vitest";
vi.mock("server-only", () => ({}));
import {assemblePublicCatalog} from "./publicCatalog";
import type {PublicCollection, PublicReader} from "./repositories/publicReader";
import {findEventPage, findOrganizerPage} from "./repositories/publicPageRepository";

/**
 * CAT-247: Catch is not a dating product, so no public organiser, event or
 * city read lets the dating framing leave the server. Functions build the
 * page read models without it (functions/src/publicPages/projections.test.ts);
 * the reader also refuses a read model that carries it.
 */
type Row = Record<string, unknown>;
type World = Record<string, Record<string, Row>>;

const readAt = Date.UTC(2026, 9, 22, 12);
const fixture = (name: string): Row => JSON.parse(fs.readFileSync(
  new URL(`../../../contracts/fixtures/valid/${name}`, import.meta.url), "utf8"));

function valueAt(data: Row, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) =>
    value && typeof value === "object" ? (value as Row)[key] : undefined, data);
}

function fakeReader(world: World): PublicReader {
  const query = (collection: string, filters: [string, string, unknown][], max?: number): PublicCollection => ({
    where: (field, operator, value) => query(collection, [...filters, [field, operator, value]], max),
    orderBy: () => query(collection, filters, max),
    limit: (count) => query(collection, filters, count),
    get: async () => {
      const rows = Object.entries(world[collection] ?? {})
        .filter(([, data]) => filters.every(([field, operator, value]) => {
          const actual = valueAt(data, field);
          return operator === "==" ? actual === value : Array.isArray(actual) && actual.includes(value);
        }))
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .slice(0, max);
      return {size: rows.length, docs: rows.map(([id, data]) => ({id, data: () => data}))};
    },
    doc: (id) => ({get: async () => ({id, exists: world[collection]?.[id] !== undefined, data: () => world[collection]?.[id]})}),
  });
  return {collection: (name) => query(name, [])};
}

describe("public dating framing (CAT-247)", () => {
  it("refuses a page read model that carries it", async () => {
    const eventPage = fixture("event_public_page_doc.json");
    const organizerPage = fixture("organizer_public_page_doc.json");
    const clean = fakeReader({eventPublicPage: {[String(eventPage.eventId)]: eventPage},
      organizerPublicPage: {[String(organizerPage.organizerId)]: organizerPage}});
    expect(await findEventPage(clean, String(eventPage.eventId))).not.toBeNull();
    expect(await findOrganizerPage(clean, String(organizerPage.path))).not.toBeNull();
    for (const field of ["activityKind", "admissionLabels", "catchExperienceActivities", "scorecard"] as const) {
      const framed = structuredClone(eventPage) as {item: {event: Row}};
      framed.item.event[field] = {activityKind: "singlesMixer", admissionLabels: ["balanced"],
        catchExperienceActivities: ["rotations"], scorecard: {mutualMatchCount: 9}}[field];
      const page = structuredClone(organizerPage) as {upcomingEvents: {event: Row}[]};
      page.upcomingEvents[0].event[field] = framed.item.event[field];
      const reader = fakeReader({eventPublicPage: {[String(eventPage.eventId)]: framed as unknown as Row},
        organizerPublicPage: {[String(organizerPage.organizerId)]: page as unknown as Row}});
      expect(await findEventPage(reader, String(eventPage.eventId)), field).toBeNull();
      expect(await findOrganizerPage(reader, String(organizerPage.path)), field).toBeNull();
      expect((await assemblePublicCatalog(reader, readAt)).listings, field).toEqual([]);
    }
  });
});
