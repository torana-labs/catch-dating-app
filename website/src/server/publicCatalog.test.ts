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
import {eventPageFromListing} from "../features/events/eventPageFromListing";
import {eventMapImagePath} from "./eventMapLink";
import {
  assembleEventDetailCatalog,
  assembleEventDetailFromSources,
  assembleOrganizerDetailCatalog,
  assembleOrganizerDetailFromSources,
  assemblePublicCatalog,
  assembleRouteCatalog,
  publicReader,
} from "./publicCatalog";
import type {PublicCollection, PublicReader} from "./repositories/publicReader";
import {withPublicReviews} from "./repositories/reviewRepository";

type Row = Record<string, unknown>;
type World = Record<string, Record<string, Row>>;
interface Filter {field: string; operator: "==" | "array-contains"; value: unknown}
interface Read {collection: string; filters: Filter[]; doc?: string}

const readAt = Date.UTC(2026, 9, 22, 12);
const contractFixture = (name: string): Row => JSON.parse(fs.readFileSync(
  new URL(`../../../contracts/fixtures/valid/${name}`, import.meta.url), "utf8"));

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

function organizer(id: string, patch: (data: Row) => void = () => undefined): Row {
  const data = contractFixture("organizer_doc.json");
  delete data.memberCount;
  Object.assign(data, {name: `Organizer ${id}`, organizerType: "eventProducer", organizerPhotos: [], followerCount: 0,
    hostUserId: null, ownerUserId: null, hostName: null, hostAvatarUrl: null, hostUserIds: [], hostProfiles: [],
    ownership: {state: "programmatic", ownerUserId: null, primaryHostUserId: null, hostUserIds: [], claimedAt: null, claimedByUid: null},
    claim: {state: "unclaimed", claimHref: `/organizers/${id}/#claim`, lastClaimRequestId: null},
    publicPage: {slug: id, citySlug: "indore", canonicalPath: `/organizers/${id}/`, publishStatus: "published",
      indexStatus: "indexReady", robots: "index, follow", seoTitle: null, seoDescription: null, lastRenderedAt: null}});
  patch(data);
  return data;
}

const at = (ms: number) => ({toMillis: () => ms});
function catchEvent(organizerId: string, patch: Row = {}): Row {
  return {name: "Sunday social run", organizerId, publicationState: "published", status: "active",
    eventFormat: {activityKind: "socialRun"}, startTime: at(readAt + 86_400_000), endTime: at(readAt + 93_600_000),
    eventTimezone: "Asia/Kolkata", meetingLocation: {name: "Bandra"}, currency: "INR", priceInPaise: 0,
    capacityLimit: 30, bookedCount: 6, publicRegistrationEnabled: true, publicRegistrationMode: "free",
    ...patch};
}

function externalEvent(id: string, organizerId: string): Row {
  return {...contractFixture("external_event_doc.json"), eventId: id, canonicalHostId: organizerId};
}

/** Three organizers, events for two of them, a verified pair for recommendations, and noise. */
function catalogWorld(): World {
  return {
    organizers: {
      alpha: organizer("alpha"),
      beta: organizer("beta", (data) => {(data.publicPage as Row).legacyPaths = ["/organizers/indore/beta-run-club/"];}),
      gamma: organizer("gamma", (data) => {
        data.provenance = {origin: "import", sourceConfidence: "high", verificationStatus: "ownerVerified", lastVerifiedAt: null};
      }),
      delta: organizer("delta", (data) => {(data.claim as Row).state = "verified";}),
      drafted: organizer("drafted", (data) => {(data.publicPage as Row).publishStatus = "draft";}),
    },
    events: {
      "alpha-run": catchEvent("alpha"),
      "alpha-draft": catchEvent("alpha", {publicationState: "draft"}),
      "beta-dinner": catchEvent("beta", {eventFormat: {activityKind: "dinner"}}),
    },
    externalEvents: {
      "ext-alpha-takeoff": externalEvent("ext-alpha-takeoff", "alpha"),
    },
    reviews: {},
  };
}

describe("full public catalog", () => {
  it("attaches published events to their organizers and withholds drafts", async () => {
    const {reader} = fakeReader(catalogWorld());
    const catalog = await assemblePublicCatalog(reader, readAt);
    expect(catalog.listings.map((listing) => listing.id)).toEqual(["alpha", "beta", "delta", "gamma"]);
    const alpha = catalog.listings.find((listing) => listing.id === "alpha")!;
    expect(alpha.catchEvents?.map((event) => event.id)).toEqual(["alpha-run"]);
    expect(alpha.externalEvents?.map((event) => event.id)).toEqual(["ext-alpha-takeoff"]);
  });

  it("fails closed instead of truncating when a collection crosses its bound", async () => {
    const world = catalogWorld();
    for (let index = 0; index < 401; index += 1) world.events[`bulk-${index}`] = catchEvent("alpha");
    const {reader} = fakeReader(world);
    await expect(assemblePublicCatalog(reader, readAt)).rejects.toThrow("PUBLIC_CATALOG_READ_BOUND_EXCEEDED");
  });
});

describe("per-route reads", () => {
  it("return the same listing and events the full catalog does", async () => {
    const world = catalogWorld();
    const full = await assemblePublicCatalog(fakeReader(world).reader, readAt);
    for (const listing of full.listings) {
      const detail = await assembleOrganizerDetailCatalog(fakeReader(world).reader, listing.path, readAt);
      // The route layer adds reviews to the full-catalog listing; the detail read includes them.
      expect(detail?.route.listing).toEqual(await withPublicReviews(fakeReader(world).reader, listing));
    }
    const records = buildPublicEventDetailRecords(full.listings, readAt);
    expect(records.length).toBe(3);
    for (const record of records) {
      const detail = await assembleEventDetailCatalog(fakeReader(world).reader, record.eventId, readAt);
      const perRoute = getEventDetailForPath(record.path, buildPublicEventDetailRecords(detail!.listings, readAt));
      expect({...perRoute, listing: undefined}).toEqual({...record, listing: undefined});
    }
  });

  it("read one organizer's events, never a whole events collection", async () => {
    const {reader, reads} = fakeReader(catalogWorld());
    const detail = await assembleOrganizerDetailFromSources(reader, "/organizers/alpha/", readAt);
    expect(detail?.route).toMatchObject({isLegacyPath: false});
    expect(detail?.catalog.listings.map((listing) => listing.id)).toEqual(["alpha", "delta", "gamma"]);
    for (const read of reads.filter((entry) => entry.collection !== "organizers")) {
      expect(read.filters.some((filter) =>
        ["organizerId", "canonicalHostId"].includes(filter.field) && filter.value === "alpha")).toBe(true);
    }
    expect(reads.filter((entry) => entry.collection === "organizers")
      .every((entry) => entry.filters.length > 1)).toBe(true);
  });

  it("resolve a single legacy alias and withhold an ambiguous path", async () => {
    const world = catalogWorld();
    const legacy = await assembleOrganizerDetailCatalog(fakeReader(world).reader, "/organizers/indore/beta-run-club", readAt);
    expect(legacy?.route).toMatchObject({isLegacyPath: true, listing: {id: "beta"}});
    world.organizers.copy = organizer("copy", (data) => {(data.publicPage as Row).canonicalPath = "/organizers/alpha/";});
    expect(await assembleOrganizerDetailCatalog(fakeReader(world).reader, "/organizers/alpha/", readAt)).toBeNull();
    expect(await assembleEventDetailCatalog(fakeReader(world).reader, "alpha-run", readAt)).toBeNull();
  });

  it("read an event page with document gets, not catalog queries", async () => {
    const {reader, reads} = fakeReader(catalogWorld());
    const detail = await assembleEventDetailFromSources(reader, "beta-dinner", readAt);
    expect(detail?.listings.map((listing) => [listing.id, listing.catchEvents?.map((event) => event.id)]))
      .toEqual([["beta", ["beta-dinner"]]]);
    expect(reads.filter((entry) => entry.doc === undefined)).toEqual([
      {collection: "organizers", filters: [
        {field: "publicPage.publishStatus", operator: "==", value: "published"},
        {field: "publicPage.canonicalPath", operator: "==", value: "/organizers/beta/"},
      ]},
      {collection: "reviews", filters: [{field: "organizerId", operator: "==", value: "beta"}]},
      {collection: "reviews", filters: [{field: "eventId", operator: "==", value: "beta-dinner"}]},
    ]);
  });

  it("withhold drafts, unpublished organizers and ids published as both kinds", async () => {
    const world = catalogWorld();
    world.events["drafted-run"] = catchEvent("drafted");
    world.externalEvents["alpha-run"] = externalEvent("alpha-run", "alpha");
    for (const eventId of ["alpha-draft", "drafted-run", "alpha-run", "missing"]) {
      expect(await assembleEventDetailCatalog(fakeReader(world).reader, eventId, readAt)).toBeNull();
    }
    expect(await assembleOrganizerDetailCatalog(fakeReader(world).reader, "/organizers/drafted/", readAt)).toBeNull();
  });

  it("fail closed when one organizer crosses its event bound", async () => {
    const world = catalogWorld();
    for (let index = 0; index < 201; index += 1) world.events[`alpha-bulk-${index}`] = catchEvent("alpha");
    await expect(assembleOrganizerDetailCatalog(fakeReader(world).reader, "/organizers/alpha/", readAt))
      .rejects.toThrow("PUBLIC_CATALOG_READ_BOUND_EXCEEDED");
  });
});

describe("route catalog", () => {
  const ids = (listings: readonly {id: string}[]) => listings.map((listing) => listing.id);

  it.each(["/", "/explore/", "/organizers/", "/claim/", "/claim/alpha/"])("reads the full catalog for %s", async (path) => {
    const world = catalogWorld();
    const full = await assemblePublicCatalog(fakeReader(world).reader, readAt);
    expect(await assembleRouteCatalog(fakeReader(world).reader, path, readAt)).toEqual(full);
  });

  it("reads one organizer for its page and its legacy alias", async () => {
    const {reader, reads} = fakeReader(catalogWorld());
    expect(ids((await assembleRouteCatalog(reader, "/organizers/alpha", readAt)).listings)).toEqual(["alpha", "delta", "gamma"]);
    expect(reads.some((read) => read.collection === "events" && !read.filters.some((filter) => filter.value === "alpha"))).toBe(false);
    expect(ids((await assembleRouteCatalog(fakeReader(catalogWorld()).reader, "/organizers/indore/beta-run-club/", readAt)).listings)[0])
      .toBe("beta");
  });

  it("reads one event for its page", async () => {
    const {reader, reads} = fakeReader(catalogWorld());
    const catalog = await assembleRouteCatalog(reader, "/events/beta-dinner/", readAt);
    expect(catalog.listings.map((listing) => [listing.id, listing.catchEvents?.map((event) => event.id)]))
      .toEqual([["beta", ["beta-dinner"]]]);
    // Without a read model the page is assembled from its sources.
    expect(reads.filter((read) => read.doc !== undefined).map((read) => [read.collection, read.doc])).toEqual([
      ["eventPublicPage", "beta-dinner"],
      ["events", "beta-dinner"], ["externalEvents", "beta-dinner"], ["organizers", "beta"],
    ]);
  });

  it.each([
    "/events/", "/events/missing/", "/events/a/b/", "/events/%2Fusers%2Fx/", "/events/%E0%A4%A/",
    "/organizers/drafted/", "/organizers/a/b/c/", "/organizers/Not_A_Path/",
  ])("renders %s as not found from at most the detail reads", async (path) => {
    const {reader, reads} = fakeReader(catalogWorld());
    expect(await assembleRouteCatalog(reader, path, readAt)).toEqual({listings: [], readAt});
    // Read-model lookups are one equality on a page path; source reads stay narrow.
    expect(reads.some((read) => read.doc === undefined && read.filters.length < 2 &&
      read.collection !== "organizerPublicPage")).toBe(false);
  });
});

/** Admin SDK timestamps keep `_seconds` and `_nanoseconds` and add `toMillis`. */
class FixtureTimestamp {
  constructor(readonly _seconds: number, readonly _nanoseconds: number) {}
  toMillis() {return this._seconds * 1000 + Math.floor(this._nanoseconds / 1e6);}
}
function hydrate(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(hydrate);
  if (!value || typeof value !== "object") return value;
  const row = value as Row;
  const keys = Object.keys(row).sort();
  if (keys.length === 2 && keys[0] === "_nanoseconds" && keys[1] === "_seconds") {
    return new FixtureTimestamp(Number(row._seconds), Number(row._nanoseconds));
  }
  return Object.fromEntries(Object.entries(row).map(([key, item]) => [key, hydrate(item)]));
}

/**
 * The read-model fixtures are built by Functions (functions/src/publicPages)
 * from the first parity case, so a world holding both the read models and
 * their sources can compare the two routes.
 */
function readModelWorld(): {world: World; now: number} {
  const fixtures = new URL("../../../contracts/fixtures/", import.meta.url);
  const read = (name: string) => JSON.parse(fs.readFileSync(new URL(name, fixtures), "utf8"));
  const inputs = read("public_pages/parity_inputs.json");
  const parity = inputs.cases[0];
  const rows = (docs: Array<{id: string; data: Row}>) =>
    Object.fromEntries(docs.map((doc) => [doc.id, hydrate(doc.data) as Row]));
  const eventPage = read("valid/event_public_page_doc.json");
  return {now: inputs.now, world: {
    organizers: {[parity.organizer.id]: hydrate(parity.organizer.data) as Row},
    events: rows(parity.catchEvents),
    externalEvents: rows(parity.externalEvents),
    reviews: rows(parity.reviews),
    organizerPublicPage: {[parity.organizer.id]: read("valid/organizer_public_page_doc.json")},
    eventPublicPage: {[eventPage.eventId]: eventPage},
  }};
}

/** The read models show a mixer as an open activity (CAT-247); the source route still shows it. */
function withoutDatingFraming(listing: Row): Row {
  const events = (listing.catchEvents as Row[]).map((event) => {
    const next: Row = {...event};
    if (next.activityKind === "singlesMixer") {
      next.activityKind = "openActivity";
      if (next.title === "Singles mixer") next.title = "Hosted event";
    }
    return next;
  });
  return {...listing, catchEvents: events};
}

describe("public page read models", () => {
  it("serve an organizer page from one document", async () => {
    const {world, now} = readModelWorld();
    const {reader, reads} = fakeReader(world);
    const catalog = await assembleRouteCatalog(reader, "/organizers/next-proof/", now);
    expect(reads).toEqual([{collection: "organizerPublicPage",
      filters: [{field: "path", operator: "==", value: "/organizers/next-proof/"}]}]);
    expect(catalog.listings.map((listing) => listing.id)).toEqual(["next-proof"]);
    const [listing] = catalog.listings;
    expect(listing.catchEvents?.map((event) => event.id)).toEqual(
      ["legacy-club-only", "mixer-restricted", "open-upcoming", "paid-past"]);
    expect(listing.externalEvents?.map((event) => event.id)).toEqual(["ext-public"]);
    expect(listing.reviews.map((review) => review.id)).toEqual(
      ["review-verified", "review-public", "review-anonymous"]);
  });

  it("render the organizer page today's source route renders, without dating framing", async () => {
    const {world, now} = readModelWorld();
    const fromPage = await assembleOrganizerDetailCatalog(fakeReader(world).reader, "/organizers/next-proof/", now);
    const fromSources = await assembleOrganizerDetailFromSources(fakeReader(world).reader, "/organizers/next-proof/", now);
    expect(fromPage?.route.isLegacyPath).toBe(false);
    expect(fromPage?.catalog.listings).toEqual(fromSources?.catalog.listings.map((listing) =>
      withoutDatingFraming(listing as unknown as Row)));
  });

  it("serve an event page from one document and match the source route", async () => {
    const {world, now} = readModelWorld();
    const {reader, reads} = fakeReader(world);
    const catalog = await assembleRouteCatalog(reader, "/events/open-upcoming/", now);
    expect(reads).toEqual([{collection: "eventPublicPage", filters: [], doc: "open-upcoming"}]);
    const fromSources = await assembleEventDetailFromSources(fakeReader(world).reader, "open-upcoming", now);
    expect(catalog.listings).toEqual(fromSources?.listings.map((listing) =>
      withoutDatingFraming(listing as unknown as Row)));
    const {builtAt: _builtAt, contentHash: _contentHash, listing: _listing, ...page} = world.eventPublicPage["open-upcoming"];
    expect(catalog.eventPage).toEqual(page);
    const record = getEventDetailForPath("/events/open-upcoming/", buildPublicEventDetailRecords(catalog.listings, now));
    expect(record?.capacityLimit).toBe(12);
    expect(record?.eventReviews.map((review) => review.id)).toEqual(["review-verified"]);
  });

  it("read an event that ended after its page was built as past", async () => {
    const {world} = readModelWorld();
    const later = Date.parse("2026-06-01T00:00:00Z");
    const catalog = await assembleRouteCatalog(fakeReader(world).reader, "/events/open-upcoming/", later);
    expect(catalog.listings[0].catchEvents?.[0].timeline).toBe("past");
  });

  it("assemble pages from sources while a read model is missing or invalid", async () => {
    const {world, now} = readModelWorld();
    world.organizerPublicPage["next-proof"].schemaVersion = 2;
    delete world.eventPublicPage["open-upcoming"];
    const organizer = await assembleOrganizerDetailCatalog(fakeReader(world).reader, "/organizers/next-proof/", now);
    expect(organizer).toEqual(await assembleOrganizerDetailFromSources(fakeReader(world).reader, "/organizers/next-proof/", now));
    const event = await assembleEventDetailCatalog(fakeReader(world).reader, "open-upcoming", now);
    const fromSources = await assembleEventDetailFromSources(fakeReader(world).reader, "open-upcoming", now);
    expect(event).toEqual({...fromSources, eventPage: eventPageFromListing(fromSources!.listings[0], "open-upcoming")});
  });

  it("link the meeting point's map only while maps are on (CAT-272)", async () => {
    const {world, now} = readModelWorld();
    const off = await assembleEventDetailCatalog(fakeReader(world).reader, "open-upcoming", now);
    expect(off?.eventMap).toBeUndefined();
    const on = await assembleEventDetailCatalog(fakeReader(world).reader, "open-upcoming", now, async () => true);
    expect(on?.eventMap).toBe(eventMapImagePath("open-upcoming", {latitude: 22.7196, longitude: 75.8577}));
    delete world.eventPublicPage["open-upcoming"];
    const fromSources = await assembleEventDetailCatalog(fakeReader(world).reader, "open-upcoming", now, async () => true);
    expect(fromSources?.eventMap).toBe(on?.eventMap);
  });

  it("arrange an event without a read model as its read model does", async () => {
    const {world, now} = readModelWorld();
    const fromPage = (await assembleRouteCatalog(fakeReader(world).reader, "/events/open-upcoming/", now)).eventPage;
    delete world.eventPublicPage["open-upcoming"];
    const fallback = (await assembleRouteCatalog(fakeReader(world).reader, "/events/open-upcoming/", now)).eventPage;
    expect(fallback?.item).toEqual(fromPage?.item);
    expect(fallback?.capacity).toEqual(fromPage?.capacity);
    const card = ({name, path, category, city, logo, verified, followerCount}: NonNullable<typeof fromPage>["organizer"]) =>
      ({name, path, category, city, logo, verified, followerCount});
    expect(card(fallback!.organizer)).toEqual(card(fromPage!.organizer));
  });

  it("withhold a withdrawn organizer whether or not its read model is gone yet", async () => {
    const {world, now} = readModelWorld();
    delete world.organizerPublicPage["next-proof"];
    delete world.eventPublicPage["open-upcoming"];
    (world.organizers["next-proof"].claim as Row).state = "suppressed";
    expect(await assembleRouteCatalog(fakeReader(world).reader, "/organizers/next-proof/", now))
      .toEqual({listings: [], readAt: now});
    expect(await assembleRouteCatalog(fakeReader(world).reader, "/events/open-upcoming/", now))
      .toEqual({listings: [], readAt: now});
  });

  it("resolve a legacy alias and withhold an ambiguous read-model path", async () => {
    const {world, now} = readModelWorld();
    const page = world.organizerPublicPage["next-proof"];
    page.legacyPaths = ["/organizers/indore/next-proof/"];
    const legacy = await assembleOrganizerDetailCatalog(fakeReader(world).reader, "/organizers/indore/next-proof/", now);
    expect(legacy?.route).toMatchObject({isLegacyPath: true, listing: {id: "next-proof"}});
    world.organizerPublicPage.copy = {...page, organizerId: "copy"};
    delete world.organizers["next-proof"];
    expect(await assembleOrganizerDetailCatalog(fakeReader(world).reader, "/organizers/next-proof/", now)).toBeNull();
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
