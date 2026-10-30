import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {BigQueryClient} from "../shared/bigQuery";
import {recordOrganizerAnalyticsEventHandler} from "./organizerAnalyticsEvents";

type FakeData = Record<string, unknown>;

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}

  async get(): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.firestore.get(this.path));
  }
}

class FakeSnapshot {
  constructor(private readonly value: FakeData | undefined) {}

  get exists(): boolean {
    return this.value !== undefined;
  }

  get(field: string): unknown {
    return this.value?.[field];
  }

  data(): FakeData | undefined {
    return this.value === undefined ? undefined : clone(this.value);
  }
}

class FakeCollectionRef {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string
  ) {}

  doc(docId: string): FakeDocRef {
    return new FakeDocRef(this.firestore, `${this.path}/${docId}`);
  }
}

class FakeFirestore {
  constructor(private readonly docs: Record<string, FakeData | undefined>) {}

  collection(collectionPath: string): FakeCollectionRef {
    return new FakeCollectionRef(this, collectionPath);
  }

  get(path: string): FakeData | undefined {
    const data = this.docs[path];
    return data === undefined ? undefined : clone(data);
  }
}

class FakeBigQuery implements BigQueryClient {
  readonly inserted: Array<{
    datasetId: string;
    tableId: string;
    rows: Array<{insertId: string; json: Record<string, unknown>}>;
  }> = [];

  async query<T>(): Promise<T[]> {
    return [];
  }

  async insertRows(
    datasetId: string,
    tableId: string,
    rows: Array<{insertId: string; json: Record<string, unknown>}>
  ): Promise<void> {
    this.inserted.push({datasetId, tableId, rows});
  }
}

test("recordOrganizerAnalyticsEvent writes a BigQuery row", async () => {
  const bigQuery = new FakeBigQuery();

  await recordOrganizerAnalyticsEventHandler(
    callableRequest({
      organizerId: "club-1",
      eventName: "eventView",
      eventId: "event-1",
      pagePath: "/organizers/saket-run-club/",
      source: "catch_event_card",
      sessionId: "browser-session-1",
      platform: "web",
    }),
    deps(new FakeFirestore(baseDocs()), bigQuery)
  );

  assert.equal(bigQuery.inserted.length, 1);
  assert.equal(bigQuery.inserted[0].datasetId, "catch_analytics");
  assert.equal(bigQuery.inserted[0].tableId, "host_analytics_events");
  assert.deepEqual(bigQuery.inserted[0].rows[0], {
    insertId:
      "26f055038bed355adaf5b3e100f9223bc8e7561a81a4f25b7ef7c6a4d52ceb8a",
    json: {
      analytics_event_id:
        "26f055038bed355adaf5b3e100f9223bc8e7561a81a4f25b7ef7c6a4d52ceb8a",
      occurred_at: "2026-06-18T10:00:00.000Z",
      event_date: "2026-06-18",
      event_name: "eventView",
      club_id: "club-1",
      target_event_id: "event-1",
      page_path: "/organizers/saket-run-club/",
      source: "catch_event_card",
      session_hash:
        "a72e68b65309f769c0fb5d5ddc58c7b8be63dde169a26211745881ec1710b3eb",
      platform: "web",
      link_id: null,
      traffic_source: null,
      ingested_at: "2026-06-18T10:00:00.000Z",
    },
  });
});

test("link clicks record the owner link and a bounded traffic source",
  async () => {
    const bigQuery = new FakeBigQuery();
    await recordOrganizerAnalyticsEventHandler(callableRequest({
      organizerId: "club-1", eventName: "linkClick", linkId: " tickets ",
      trafficSource: "instagram", pagePath: "/organizers/saket-run-club/",
      source: "organizer_page",
    }), deps(new FakeFirestore(linkDocs()), bigQuery));
    const row = bigQuery.inserted[0].rows[0].json;
    assert.equal(row.event_name, "linkClick");
    assert.equal(row.link_id, "tickets");
    assert.equal(row.traffic_source, "instagram");
    assert.equal(row.target_event_id, null);
  });

for (const [name, payload] of [
  ["an unknown link", {eventName: "linkClick", linkId: "gone"}],
  ["no link", {eventName: "linkClick"}],
  ["a campaign value", {eventName: "linkClick", linkId: "tickets",
    trafficSource: "utm_summer_sale"}],
  ["a link on another event", {eventName: "outboundClick",
    linkId: "tickets"}],
  ["a traffic source on another event", {eventName: "listingView",
    trafficSource: "qr"}],
] as const) {
  test(`link clicks refuse ${name}`, async () => {
    const bigQuery = new FakeBigQuery();
    await assert.rejects(() => recordOrganizerAnalyticsEventHandler(
      callableRequest({organizerId: "club-1",
        pagePath: "/organizers/saket-run-club/", ...payload}),
      deps(new FakeFirestore(linkDocs()), bigQuery)
    ), {code: "invalid-argument"});
    assert.equal(bigQuery.inserted.length, 0);
  });
}

test("recordOrganizerAnalyticsEvent rejects mismatched scope", async () => {
  await assert.rejects(
    () => recordOrganizerAnalyticsEventHandler(
      callableRequest({
        organizerId: "club-1",
        eventId: "event-2",
        eventName: "eventView",
        pagePath: "/organizers/saket-run-club/",
      }),
      deps(new FakeFirestore({
        ...baseDocs(),
        "events/event-2": {organizerId: "club-2"},
      }), new FakeBigQuery())
    ),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "invalid-argument"
  );
});

test("recordOrganizerAnalyticsEvent rejects unpublished pages", async () => {
  await assert.rejects(
    () => recordOrganizerAnalyticsEventHandler(
      callableRequest({
        organizerId: "club-1",
        eventName: "listingView",
        pagePath: "/organizers/saket-run-club/",
      }),
      deps(new FakeFirestore({
        ...baseDocs(),
        "organizers/club-1": organizerDoc({
          publishStatus: "qa",
          robots: "noindex, follow",
        }),
      }), new FakeBigQuery())
    ),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "failed-precondition"
  );
});

test("recordOrganizerAnalyticsEvent rejects noncanonical paths", async () => {
  await assert.rejects(
    () => recordOrganizerAnalyticsEventHandler(
      callableRequest({
        organizerId: "club-1",
        eventName: "listingView",
        pagePath: "/organizers/other-club/",
      }),
      deps(new FakeFirestore(baseDocs()), new FakeBigQuery())
    ),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "invalid-argument"
  );
});

test("recordOrganizerAnalyticsEvent accepts search appearances", async () => {
  const bigQuery = new FakeBigQuery();

  await recordOrganizerAnalyticsEventHandler(
    callableRequest({
      organizerId: "club-1",
      eventName: "searchAppearance",
      pagePath: "/organizers/?q=saket",
    }),
    deps(new FakeFirestore(baseDocs()), bigQuery)
  );

  assert.equal(bigQuery.inserted.length, 1);
});

test("recordOrganizerAnalyticsEvent rejects rate-limited clients", async () => {
  await assert.rejects(
    () => recordOrganizerAnalyticsEventHandler(
      callableRequest({
        organizerId: "club-1",
        eventName: "listingView",
        pagePath: "/organizers/saket-run-club/",
      }),
      deps(new FakeFirestore(baseDocs()), new FakeBigQuery(), false)
    ),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "resource-exhausted"
  );
});

for (const overrides of [
  {publicationState: "private", status: "active"},
  {publicationState: "published", status: "cancelled"},
]) {
  test(`rejects unavailable event ${JSON.stringify(overrides)}`, async () => {
    const bigQuery = new FakeBigQuery();
    await assert.rejects(() => recordOrganizerAnalyticsEventHandler(
      callableRequest({organizerId: "club-1", eventId: "event-1",
        eventName: "eventView", pagePath: "/events/event-1/"}),
      deps(new FakeFirestore({...baseDocs(), "events/event-1": {
        organizerId: "club-1", ...overrides,
      }}), bigQuery)
    ), {code: "failed-precondition"});
    assert.equal(bigQuery.inserted.length, 0);
  });
}

test("external event scope excludes raw URLs", async () => {
  const bigQuery = new FakeBigQuery();
  await recordOrganizerAnalyticsEventHandler(callableRequest({
    organizerId: "club-1", eventId: "external-1", eventName: "outboundClick",
    pagePath: "/events/external-1/?token=secret#private", source: "https://private/",
    platform: "private-value",
  }), deps(new FakeFirestore({...baseDocs(), "externalEvents/external-1": {
    canonicalHostId: "club-1", publicationStatus: "public", status: "active",
  }}), bigQuery));
  const row = bigQuery.inserted[0].rows[0].json;
  assert.equal(row.page_path, "/events/external-1/");
  assert.equal(row.source, null);
  assert.equal(row.platform, "web");
  assert.equal(JSON.stringify(row).includes("secret"), false);
});

for (const external of [
  {canonicalHostId: "club-2", publicationStatus: "public"},
  {canonicalHostId: "club-1", publicationStatus: "draft"},
  {canonicalHostId: "club-1", publicationStatus: "removed"},
]) {
  test(`rejects external ${JSON.stringify(external)}`, async () => {
    const bigQuery = new FakeBigQuery();
    await assert.rejects(() => recordOrganizerAnalyticsEventHandler(
      callableRequest({organizerId: "club-1", eventId: "external-1",
        eventName: "eventView", pagePath: "/events/external-1/"}),
      deps(new FakeFirestore({...baseDocs(), "externalEvents/external-1": {
        status: "active", ...external,
      }}), bigQuery)
    ));
    assert.equal(bigQuery.inserted.length, 0);
  });
}

test("organizer preview excludes visitor metrics", async () => {
  const bigQuery = new FakeBigQuery();
  const request = callableRequest({organizerId: "club-1",
    eventName: "listingView", pagePath: "/organizers/saket-run-club/"});
  request.auth = {uid: "owner-1", token: {}} as CallableRequest["auth"];
  assert.deepEqual(await recordOrganizerAnalyticsEventHandler(request,
    deps(new FakeFirestore({...baseDocs(), "organizers/club-1": {
      ...organizerDoc(), ownerUserId: "owner-1",
    }}), bigQuery)), {accepted: true});
  assert.equal(bigQuery.inserted.length, 0);
});

test("event activity needs event identity", async () => {
  await assert.rejects(() => recordOrganizerAnalyticsEventHandler(
    callableRequest({organizerId: "club-1", eventName: "eventView",
      pagePath: "/organizers/saket-run-club/"}),
    deps(new FakeFirestore(baseDocs()), new FakeBigQuery())
  ), {code: "invalid-argument"});
});

test("presence retry identity excludes raw session", async () => {
  const bigQuery = new FakeBigQuery();
  const payload = {organizerId: "club-1", eventId: "event-1",
    eventName: "eventView", pagePath: "/events/event-1/",
    sessionId: "opaque-random-tab-session"};
  for (let index = 0; index < 2; index++) {
    await recordOrganizerAnalyticsEventHandler(callableRequest(payload),
      deps(new FakeFirestore(baseDocs()), bigQuery));
  }
  assert.equal(bigQuery.inserted[0].rows[0].insertId,
    bigQuery.inserted[1].rows[0].insertId);
  assert.equal(
    JSON.stringify(bigQuery.inserted).includes(payload.sessionId), false
  );
});

for (const status of ["active", "removed"]) {
  test(`team member preview respects ${status} membership`, async () => {
    const bigQuery = new FakeBigQuery();
    const request = callableRequest({organizerId: "club-1",
      eventName: "listingView",
      pagePath: "/organizers/saket-run-club/"});
    request.auth = {uid: "manager-1", token: {}} as CallableRequest["auth"];
    await recordOrganizerAnalyticsEventHandler(request,
      deps(new FakeFirestore({...baseDocs(),
        "organizerTeamMemberships/club-1_manager-1": {
          organizerId: "club-1", uid: "manager-1", role: "manager", status,
        },
      }), bigQuery));
    assert.equal(bigQuery.inserted.length, status === "active" ? 0 : 1);
  });
}

for (const payload of [
  {organizerId: "club-1/private"},
  {organizerId: "club-1", eventId: "event-1/private"},
]) {
  test(`rejects invalid scope ${JSON.stringify(payload)}`, async () => {
    await assert.rejects(() => recordOrganizerAnalyticsEventHandler(
      callableRequest({...payload, eventName: "listingView",
        pagePath: "/organizers/saket-run-club/"}),
      deps(new FakeFirestore(baseDocs()), new FakeBigQuery())
    ), {code: "invalid-argument"});
  });
}

for (const source of ["listing_page", "external_event_source"]) {
  test(`preserves bounded first-party source ${source}`, async () => {
    const bigQuery = new FakeBigQuery();
    await recordOrganizerAnalyticsEventHandler(callableRequest({
      organizerId: "club-1", eventName: "listingView", source,
      pagePath: "/organizers/saket-run-club/",
    }), deps(new FakeFirestore(baseDocs()), bigQuery));
    assert.equal(bigQuery.inserted[0].rows[0].json.source, source);
  });
}

function deps(
  firestore: FakeFirestore,
  bigQuery: FakeBigQuery,
  allow = true
) {
  return {
    firestore: () =>
      firestore as unknown as FirebaseFirestore.Firestore,
    bigQuery,
    now: () => new Date("2026-06-18T10:00:00.000Z"),
    randomId: () => "event-id-1",
    checkIpRateLimit: () => allow,
  };
}

function baseDocs(): Record<string, FakeData> {
  return {
    "organizers/club-1": organizerDoc(),
    "events/event-1": {
      organizerId: "club-1", publicationState: "published", status: "active",
    },
  };
}

function linkDocs(): Record<string, FakeData> {
  return {...baseDocs(), "organizers/club-1": {...organizerDoc(), ownerLinks: [
    {id: "tickets", label: "Tickets", subtitle: null,
      url: "https://www.district.in/saket", icon: "tickets", pinned: false,
      showUntil: null},
  ]}};
}

function organizerDoc(publicPageOverrides: FakeData = {}): FakeData {
  return {
    name: "Saket Run Club",
    status: "active",
    archived: false,
    claim: {
      state: "unclaimed",
      claimHref: "/host/#founding-hosts",
      lastClaimRequestId: null,
    },
    publicPage: {
      slug: "saket-run-club",
      citySlug: "delhi",
      canonicalPath: "/organizers/saket-run-club/",
      publishStatus: "published",
      indexStatus: "indexReady",
      robots: "index, follow",
      seoTitle: null,
      seoDescription: null,
      lastRenderedAt: null,
      ...publicPageOverrides,
    },
  };
}

function callableRequest(data: unknown): CallableRequest<unknown> {
  return {
    data,
    rawRequest: {
      get: (header: string) =>
        header === "x-forwarded-for" ? "203.0.113.10" : undefined,
      ip: "203.0.113.11",
      socket: {},
    },
  } as unknown as CallableRequest<unknown>;
}

function clone(data: FakeData): FakeData {
  return JSON.parse(JSON.stringify(data)) as FakeData;
}
