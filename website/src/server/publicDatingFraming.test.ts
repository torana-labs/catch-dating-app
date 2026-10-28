// @vitest-environment node
import fs from "node:fs";
import {describe, expect, it, vi} from "vitest";
vi.mock("server-only", () => ({}));
import {assembleRouteCatalog} from "./publicCatalog";
import type {PublicCollection, PublicReader} from "./repositories/publicReader";
import {findEventPage, findOrganizerPage} from "./repositories/publicPageRepository";

/**
 * CAT-247: Catch is not a dating product, so no public organiser, event or
 * city read lets the dating framing leave the server, whether a route reads
 * its page read model or assembles the page from its sources.
 */
type Row = Record<string, unknown>;
type World = Record<string, Record<string, Row>>;

const readAt = Date.UTC(2026, 9, 22, 12);
// With context, so a failure shows where the field surfaced.
const datingFraming = /.{0,60}(?:singlesMixer|Singles mixer|balanced|rotations|mutualMatchCount|eventSuccessSummary|scorecard).{0,20}/u;
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

const at = (ms: number) => ({toMillis: () => ms});

/** A published organiser whose sources carry every dating field CAT-247 names. */
function datingWorld(): World {
  const organizer = fixture("club_doc.json");
  delete organizer.memberCount;
  Object.assign(organizer, {name: "Harbour Lights Social", organizerType: "eventProducer", organizerPhotos: [], followerCount: 0,
    hostUserId: null, ownerUserId: null, hostName: null, hostAvatarUrl: null, hostUserIds: [], hostProfiles: [],
    ownership: {state: "programmatic", ownerUserId: null, primaryHostUserId: null, hostUserIds: [], claimedAt: null, claimedByUid: null},
    claim: {state: "unclaimed", claimHref: "/organizers/harbour/#claim", lastClaimRequestId: null},
    publicPage: {slug: "harbour", citySlug: "indore", canonicalPath: "/organizers/harbour/", publishStatus: "published",
      indexStatus: "indexReady", robots: "index, follow", seoTitle: null, seoDescription: null, lastRenderedAt: null}});
  const mixer = (patch: Row): Row => ({name: "", organizerId: "harbour", clubId: "harbour", publicationState: "published",
    status: "active", eventFormat: {activityKind: "singlesMixer"}, startTime: at(readAt + 86_400_000),
    endTime: at(readAt + 93_600_000), eventTimezone: "Asia/Kolkata", meetingLocation: {name: "Harbour Steps"}, currency: "INR",
    priceInPaise: 0, capacityLimit: 30, bookedCount: 6, publicRegistrationEnabled: true, publicRegistrationMode: "free",
    scorecard: {mutualMatchCount: 9}, ...patch});
  const external = fixture("external_event_doc.json");
  Object.assign(external, {eventId: "ext-harbour-mixer", canonicalHostId: "harbour",
    activity: {...external.activity as Row, activityKind: "singlesMixer"}});
  return {
    organizers: {harbour: organizer},
    events: {
      "harbour-mixer": mixer({catchExperienceActivities: ["introductions", "rotations"], constraints: {maxMen: 15, maxWomen: 15}}),
      "harbour-walk": mixer({name: "Lantern walk", eventFormat: {activityKind: "walking"}, catchExperienceActivities: ["rotations"]}),
    },
    externalEvents: {"ext-harbour-mixer": external},
    reviews: {},
  };
}

const publicPaths = ["/", "/explore/", "/organizers/", "/organizers/harbour/", "/events/harbour-mixer/",
  "/events/harbour-walk/", "/events/ext-harbour-mixer/"];

describe("public dating framing (CAT-247)", () => {
  it("never leaves the server on a page assembled from its sources", async () => {
    const reader = fakeReader(datingWorld());
    for (const path of publicPaths) {
      const catalog = await assembleRouteCatalog(reader, path, readAt);
      expect(catalog.listings.length, path).toBeGreaterThan(0);
      expect(datingFraming.exec(JSON.stringify(catalog))?.[0], path).toBeUndefined();
    }
  });

  it("keeps the events, with their other labels, as hosted events", async () => {
    const {listings: [listing]} = await assembleRouteCatalog(fakeReader(datingWorld()), "/organizers/harbour/", readAt);
    const [mixer, walk] = listing.catchEvents ?? [];
    expect(mixer).toMatchObject({id: "harbour-mixer", activityKind: "openActivity", title: "Hosted event",
      catchExperienceActivities: ["introductions"]});
    expect(mixer).not.toHaveProperty("admissionLabels");
    expect(walk).toMatchObject({id: "harbour-walk", activityKind: "walking", title: "Lantern walk"});
    expect(walk).not.toHaveProperty("catchExperienceActivities");
    expect(listing.externalEvents?.[0]).toMatchObject({id: "ext-harbour-mixer", activityKind: "openActivity"});
  });

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
    }
  });
});
