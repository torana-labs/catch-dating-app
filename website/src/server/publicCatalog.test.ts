// @vitest-environment node
import fs from "node:fs";
import {afterEach, describe, expect, it, vi} from "vitest";
vi.mock("server-only", () => ({}));
// The reader's credential check, without a Google credential lookup.
const admin = vi.hoisted(() => ({getAccessToken: vi.fn(), apps: [] as {name: string; options: unknown}[], db: {name: "reader"}}));
vi.mock("firebase-admin/app", () => ({
  getApps: () => admin.apps,
  applicationDefault: () => ({getAccessToken: admin.getAccessToken}),
  initializeApp: (options: unknown, name: string) => {
    const app = {name, options};
    admin.apps.push(app);
    return app;
  },
}));
vi.mock("firebase-admin/firestore", () => ({getFirestore: () => admin.db}));
// Maps stay off unless a test turns them on: no Secret Manager call from tests.
vi.mock("./websiteSecrets", () => ({readWebsiteSecret: async () => null}));
import {buildPublicEventDetailRecords, getEventDetailForPath} from "../features/events/eventDetailModel";
import {eventMapImagePath} from "./eventMapLink";
import {
  assembleEventDetailCatalog,
  assembleOrganizerDetailCatalog,
  assemblePublicCatalog,
  assembleRouteCatalog,
  memoizeFor,
  publicReader,
} from "./publicCatalog";
import type {PublicCollection, PublicReader} from "./repositories/publicReader";

type Row = Record<string, unknown>;
type World = Record<string, Record<string, Row>>;
interface Filter {field: string; operator: "==" | "array-contains"; value: unknown}
interface Read {collection: string; filters: Filter[]; doc?: string}

const fixtures = new URL("../../../contracts/fixtures/", import.meta.url);
const fixture = (name: string): Row => JSON.parse(fs.readFileSync(new URL(name, fixtures), "utf8"));
/** When the read-model fixtures were built (contracts/fixtures/public_pages/parity_inputs.json). */
const builtAt = (fixture("public_pages/parity_inputs.json") as {now: number}).now;

function valueAt(data: Row, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) =>
    value && typeof value === "object" ? (value as Row)[key] : undefined, data);
}

/** An in-memory reader that records every query, so tests can bound the reads. */
function fakeReader(world: World) {
  const reads: Read[] = [];
  const query = (collection: string, filters: Filter[], max?: number): PublicCollection => ({
    where: (field, operator, value) => query(collection, [...filters, {field, operator, value}], max),
    orderBy: () => query(collection, filters, max),
    limit: (count) => query(collection, filters, count),
    get: async () => {
      reads.push({collection, filters});
      const rows = Object.entries(world[collection] ?? {})
        .filter(([, data]) => filters.every(({field, operator, value}) => {
          const actual = valueAt(data, field);
          return operator === "==" ? actual === value : Array.isArray(actual) && actual.includes(value);
        }))
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .slice(0, max);
      return {size: rows.length, docs: rows.map(([id, data]) => ({id, data: () => data}))};
    },
    doc: (id) => ({get: async () => {
      reads.push({collection, filters: [], doc: id});
      const data = world[collection]?.[id];
      return {id, exists: data !== undefined, data: () => data};
    }}),
  });
  const reader: PublicReader = {collection: (name) => query(name, [])};
  return {reader, reads};
}

/** The organizer page fixture, moved to another organizer id and path. */
function organizerPage(id: string, patch: (page: Row) => void = () => undefined): Row {
  const page = fixture("valid/organizer_public_page_doc.json");
  const path = `/organizers/${id}/`;
  Object.assign(page, {organizerId: id, path, legacyPaths: []});
  Object.assign(page.listing as Row, {id, path});
  patch(page);
  return page;
}

/** Only the public read models: the website reads no source collection. */
function readModelWorld(): World {
  const eventPage = fixture("valid/event_public_page_doc.json");
  return {
    organizerPublicPage: {"next-proof": fixture("valid/organizer_public_page_doc.json")},
    eventPublicPage: {[eventPage.eventId as string]: eventPage},
  };
}

const ids = (listings: readonly {id: string}[]) => listings.map((listing) => listing.id);

describe("full public catalog", () => {
  it("lists every organizer page's listing with its listed events, without reviews", async () => {
    const {reader, reads} = fakeReader({organizerPublicPage: {beta: organizerPage("beta"), alpha: organizerPage("alpha")}});
    const catalog = await assemblePublicCatalog(reader, builtAt);
    expect(reads).toEqual([{collection: "organizerPublicPage", filters: []}]);
    expect(ids(catalog.listings)).toEqual(["alpha", "beta"]);
    const [alpha] = catalog.listings;
    expect(alpha.catchEvents?.map((event) => event.id)).toEqual(
      ["legacy-club-only", "mixer-restricted", "open-upcoming", "paid-past"]);
    expect(alpha.externalEvents?.map((event) => event.id)).toEqual(["ext-public"]);
    expect(alpha.reviews).toEqual([]);
    expect(alpha.reviewReadState).toBeUndefined();
  });

  it("withholds invalid pages and every page that claims a shared path", async () => {
    const {reader} = fakeReader({organizerPublicPage: {
      alpha: organizerPage("alpha"),
      beta: organizerPage("beta", (page) => {page.path = "/organizers/gamma/";}),
      gamma: organizerPage("gamma"),
      invalid: organizerPage("invalid", (page) => {page.schemaVersion = 2;}),
      moved: organizerPage("moved", (page) => {page.organizerId = "elsewhere";}),
    }});
    expect(ids((await assemblePublicCatalog(reader, builtAt)).listings)).toEqual(["alpha"]);
  });

  it("reads an event that ended after its page was built as past", async () => {
    const {reader} = fakeReader({organizerPublicPage: {alpha: organizerPage("alpha")}});
    const later = Date.parse("2090-01-01T00:00:00Z");
    const [alpha] = (await assemblePublicCatalog(reader, later)).listings;
    expect(new Set(alpha.catchEvents?.map((event) => event.timeline))).toEqual(new Set(["past"]));
  });

  it("fails closed instead of truncating past 400 pages", async () => {
    const pages: Record<string, Row> = {};
    for (let index = 0; index < 401; index += 1) pages[`bulk-${index}`] = {};
    await expect(assemblePublicCatalog(fakeReader({organizerPublicPage: pages}).reader, builtAt))
      .rejects.toThrow("PUBLIC_CATALOG_READ_BOUND_EXCEEDED");
  });
});

describe("probe memo", () => {
  it("reads once a minute, shares an in-flight read and forgets failures", async () => {
    let clock = 0;
    const read = vi.fn(async () => ({reads: read.mock.calls.length}));
    const memo = memoizeFor(60_000, read, () => clock);
    const [first, concurrent] = await Promise.all([memo(), memo()]);
    expect(first).toBe(concurrent);
    clock = 59_999;
    await memo();
    expect(read).toHaveBeenCalledTimes(1);
    clock = 60_000;
    expect((await memo()).reads).toBe(2);
    const failing = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValue("up");
    const retried = memoizeFor(60_000, failing, () => clock);
    await expect(retried()).rejects.toThrow("down");
    await expect(retried()).resolves.toBe("up");
    expect(failing).toHaveBeenCalledTimes(2);
  });
});

describe("route catalog", () => {
  it.each(["/", "/explore/", "/organizers/", "/claim/", "/claim/alpha/"])("reads the full catalog for %s", async (path) => {
    const world = {organizerPublicPage: {alpha: organizerPage("alpha")}};
    const full = await assemblePublicCatalog(fakeReader(world).reader, builtAt);
    expect(await assembleRouteCatalog(fakeReader(world).reader, path, builtAt)).toEqual(full);
  });

  it.each([
    "/events/", "/events/missing/", "/events/a/b/", "/events/%2Fusers%2Fx/", "/events/%E0%A4%A/",
    "/organizers/drafted/", "/organizers/a/b/c/", "/organizers/Not_A_Path/",
  ])("renders %s as not found from at most the read-model lookups", async (path) => {
    const {reader, reads} = fakeReader(readModelWorld());
    expect(await assembleRouteCatalog(reader, path, builtAt)).toEqual({listings: [], readAt: builtAt});
    expect(reads.every((read) => ["organizerPublicPage", "eventPublicPage"].includes(read.collection))).toBe(true);
  });
});

describe("public page read models", () => {
  it("serve an organizer page from one document", async () => {
    const {reader, reads} = fakeReader(readModelWorld());
    const catalog = await assembleRouteCatalog(reader, "/organizers/next-proof/", builtAt);
    expect(reads).toEqual([{collection: "organizerPublicPage",
      filters: [{field: "path", operator: "==", value: "/organizers/next-proof/"}]}]);
    expect(ids(catalog.listings)).toEqual(["next-proof"]);
    const [listing] = catalog.listings;
    expect(listing.catchEvents?.map((event) => event.id)).toEqual(
      ["legacy-club-only", "mixer-restricted", "open-upcoming", "paid-past"]);
    expect(listing.externalEvents?.map((event) => event.id)).toEqual(["ext-public"]);
    expect(listing.reviews.map((review) => review.id)).toEqual(
      ["review-verified", "review-public", "review-anonymous"]);
    expect(catalog.organizerPage).toBeDefined();
  });

  it("serve an event page from one document", async () => {
    const world = readModelWorld();
    const {reader, reads} = fakeReader(world);
    const catalog = await assembleRouteCatalog(reader, "/events/open-upcoming/", builtAt);
    expect(reads).toEqual([{collection: "eventPublicPage", filters: [], doc: "open-upcoming"}]);
    const {builtAt: _builtAt, contentHash: _contentHash, listing: _listing, ...page} = world.eventPublicPage["open-upcoming"];
    expect(catalog.eventPage).toEqual(page);
    expect(ids(catalog.listings)).toEqual(["next-proof"]);
    const record = getEventDetailForPath("/events/open-upcoming/", buildPublicEventDetailRecords(catalog.listings, builtAt));
    expect(record?.capacityLimit).toBe(12);
    expect(record?.eventReviews.map((review) => review.id)).toEqual(["review-verified"]);
  });

  it("read an event that ended after its page was built as past", async () => {
    const later = Date.parse("2026-06-01T00:00:00Z");
    const catalog = await assembleRouteCatalog(fakeReader(readModelWorld()).reader, "/events/open-upcoming/", later);
    expect(catalog.listings[0].catchEvents?.[0].timeline).toBe("past");
  });

  it("render a page without a valid read model as not found, reading nothing else", async () => {
    const world = readModelWorld();
    world.organizerPublicPage["next-proof"].schemaVersion = 2;
    delete world.eventPublicPage["open-upcoming"];
    const {reader, reads} = fakeReader(world);
    expect(await assembleOrganizerDetailCatalog(reader, "/organizers/next-proof/", builtAt)).toBeNull();
    expect(await assembleEventDetailCatalog(reader, "open-upcoming", builtAt)).toBeNull();
    expect(reads.map((read) => read.collection)).toEqual(["organizerPublicPage", "eventPublicPage"]);
  });

  it("link the meeting point's map only while maps are on (CAT-272)", async () => {
    const world = readModelWorld();
    const off = await assembleEventDetailCatalog(fakeReader(world).reader, "open-upcoming", builtAt);
    expect(off?.eventMap).toBeUndefined();
    const on = await assembleEventDetailCatalog(fakeReader(world).reader, "open-upcoming", builtAt, async () => true);
    expect(on?.eventMap).toBe(eventMapImagePath("open-upcoming", {latitude: 22.7196, longitude: 75.8577}));
  });

  it("resolve a legacy alias and withhold an ambiguous read-model path", async () => {
    const world = readModelWorld();
    const page = world.organizerPublicPage["next-proof"];
    page.legacyPaths = ["/organizers/indore/next-proof/"];
    const legacy = await assembleOrganizerDetailCatalog(fakeReader(world).reader, "/organizers/indore/next-proof/", builtAt);
    expect(legacy?.route).toMatchObject({isLegacyPath: true, listing: {id: "next-proof"}});
    world.organizerPublicPage.copy = {...page, organizerId: "copy"};
    expect(await assembleOrganizerDetailCatalog(fakeReader(world).reader, "/organizers/next-proof/", builtAt)).toBeNull();
  });
});

describe("public reader", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });
  const configured = (emulator?: string) => {
    vi.stubEnv("CATCH_WEBSITE_STAGE", "preview");
    vi.stubEnv("CATCH_PUBLIC_FIRESTORE_PROJECT", "demo-catch-nextjs");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", emulator ?? "");
  };

  it("is ready once its credentials answer", async () => {
    configured();
    admin.getAccessToken.mockResolvedValue({access_token: "token", expires_in: 3600});
    expect(await publicReader()).toBe(admin.db);
  });

  it("fails at once without credentials instead of letting each read retry", async () => {
    configured();
    admin.getAccessToken.mockRejectedValue(new Error("Could not load the default credentials."));
    await expect(publicReader()).rejects.toThrow("Could not load the default credentials.");
  });

  it("gives up on a credential lookup that does not answer within three seconds", async () => {
    configured();
    vi.useFakeTimers();
    admin.getAccessToken.mockReturnValue(new Promise(() => undefined));
    const pending = expect(publicReader()).rejects.toThrow("PUBLIC_READER_CREDENTIALS_UNAVAILABLE");
    await vi.advanceTimersByTimeAsync(3_000);
    await pending;
  });

  it("needs no credentials for the emulator", async () => {
    configured("127.0.0.1:8765");
    expect(await publicReader()).toBe(admin.db);
    expect(admin.getAccessToken).not.toHaveBeenCalled();
  });

  it("fails before any read without a configured project", async () => {
    configured();
    vi.stubEnv("CATCH_PUBLIC_FIRESTORE_PROJECT", "");
    admin.apps.length = 0;
    await expect(publicReader()).rejects.toThrow("CATCH_PUBLIC_FIRESTORE_PROJECT is required");
  });
});
