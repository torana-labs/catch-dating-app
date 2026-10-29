import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {
  buildHostAnalyticsFromRecords,
  getHostAnalyticsHandler,
  hostAnalyticsSnapshotId,
  hostAnalyticsSnapshotTtlMs,
  isHostAnalyticsSnapshotFresh,
  readHostAnalyticsSnapshot,
  resolveAnalyticsRange,
  writeHostAnalyticsSnapshot,
} from "./hostAnalytics";

import {validateHostAnalyticsCallableResponse} from
  "../shared/generated/validators/hostAnalyticsOutput";

type AnalyticsRecords = Parameters<typeof buildHostAnalyticsFromRecords>[0];

test("resolveAnalyticsRange supports custom weekly ranges", () => {
  const range = resolveAnalyticsRange({
    rangePreset: "custom",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    granularity: "week",
  }, new Date("2026-06-18T12:00:00.000Z"));

  assert.equal(range.start.toISOString(), "2026-06-01T00:00:00.000Z");
  assert.equal(range.endExclusive.toISOString(), "2026-07-01T00:00:00.000Z");
  assert.equal(range.granularity, "week");
  assert.equal(range.preset, "custom");
  assert.equal(range.timezone, "UTC");
});

test("resolveAnalyticsRange uses IANA-zone midnight and supports 12m", () => {
  const range = resolveAnalyticsRange({
    rangePreset: "12m",
    granularity: "month",
    timezone: "Asia/Kolkata",
  }, new Date("2026-06-17T20:00:00.000Z"));

  assert.equal(range.start.toISOString(), "2025-06-18T18:30:00.000Z");
  assert.equal(range.endExclusive.toISOString(), "2026-06-18T18:30:00.000Z");
  assert.equal(range.granularity, "month");
  assert.equal(range.timezone, "Asia/Kolkata");
});

test("resolveAnalyticsRange keeps 01:00 IST in the new local day", () => {
  const range = resolveAnalyticsRange({
    rangePreset: "30d",
    timezone: "Asia/Kolkata",
  }, new Date("2026-06-17T19:30:00.000Z"));

  assert.equal(range.start.toISOString(), "2026-05-19T18:30:00.000Z");
  assert.equal(range.endExclusive.toISOString(), "2026-06-18T18:30:00.000Z");
});

test("mart dates use local-day buckets", () => {
  const range = resolveAnalyticsRange({
    rangePreset: "custom",
    startDate: "2026-06-18",
    endDate: "2026-06-18",
    granularity: "day",
    timezone: "Asia/Kolkata",
  }, new Date("2026-06-18T12:00:00.000Z"));
  const input = records();
  input.martRows = [martRow({
    date: "2026-06-18",
    bookedCount: 5,
    checkedInCount: 4,
  })];

  const response = buildHostAnalyticsFromRecords(
    input,
    range,
    new Date("2026-06-18T12:00:00.000Z")
  );

  assert.equal(response.trend[0].periodStart, "2026-06-17T18:30:00.000Z");
  assert.equal(response.trend[0].periodEnd, "2026-06-18T18:29:59.999Z");
  assert.equal(response.trend[0].metrics.bookings, 5);
});

test("host snapshot identity pins authorized scope and local-day range", () => {
  const now = new Date("2026-06-17T20:00:00.000Z");
  const payload = {
    clubId: "club-1",
    rangePreset: "30d" as const,
    granularity: "week" as const,
    timezone: "Asia/Kolkata",
  };
  const range = resolveAnalyticsRange(payload, now);
  const clubs = records().clubs;
  const first = hostAnalyticsSnapshotId("host-1", payload, range, clubs);
  const reordered = hostAnalyticsSnapshotId(
    "host-1",
    payload,
    range,
    [...clubs].reverse()
  );
  const utc = hostAnalyticsSnapshotId(
    "host-1",
    {...payload, timezone: "UTC"},
    resolveAnalyticsRange({...payload, timezone: "UTC"}, now),
    clubs
  );

  const previousHash = createHash("sha256").update(JSON.stringify({
    registrationReadoutVersion: 1,
    organizerId: payload.clubId,
    eventId: null,
    clubIds: clubs.map((club) => club.id).sort(),
    start: range.start.toISOString(),
    endExclusive: range.endExclusive.toISOString(),
    granularity: range.granularity,
    preset: range.preset,
    timezone: range.timezone,
  })).digest("hex");
  assert.notEqual(first, `host-1_${previousHash}`);
  assert.match(first, /^host-1_[a-f0-9]{64}$/u);
  assert.equal(reordered, first);
  assert.notEqual(utc, first);
});

test("host snapshot freshness uses the ratified 15-minute TTL boundary", () => {
  const now = new Date("2026-06-18T12:00:00.000Z");
  assert.equal(hostAnalyticsSnapshotTtlMs, 15 * 60 * 1000);
  assert.equal(isHostAnalyticsSnapshotFresh({
    toMillis: () => now.getTime() + hostAnalyticsSnapshotTtlMs,
  }, now), true);
  assert.equal(isHostAnalyticsSnapshotFresh({
    toMillis: () => now.getTime(),
  }, now), false);
  assert.equal(isHostAnalyticsSnapshotFresh(undefined, now), false);
});

test("host snapshot store serves valid data until expiry", async () => {
  const now = new Date("2026-06-18T12:00:00.000Z");
  const range = resolveAnalyticsRange({rangePreset: "30d"}, now);
  const response = buildHostAnalyticsFromRecords(records(), range, now);
  const firestore = new FakeSnapshotFirestore();
  const db = firestore as unknown as FirebaseFirestore.Firestore;
  const snapshotId = `host-1_${"a".repeat(64)}`;

  await writeHostAnalyticsSnapshot(
    db,
    snapshotId,
    "host-1",
    response,
    now,
    {
      serverTimestamp: () => fakeTimestamp(now),
      timestampFromDate: (date) => fakeTimestamp(date),
    }
  );

  assert.deepEqual(
    await readHostAnalyticsSnapshot(
      db,
      snapshotId,
      new Date(now.getTime() + 60_000)
    ),
    response
  );
  assert.equal(
    await readHostAnalyticsSnapshot(
      db,
      snapshotId,
      new Date(now.getTime() + hostAnalyticsSnapshotTtlMs)
    ),
    null
  );
});

test("host snapshot store rejects malformed cached responses", async () => {
  const now = new Date("2026-06-18T12:00:00.000Z");
  const firestore = new FakeSnapshotFirestore();
  const snapshotId = `host-1_${"b".repeat(64)}`;
  firestore.documents.set(snapshotId, {
    expiresAt: fakeTimestamp(
      new Date(now.getTime() + hostAnalyticsSnapshotTtlMs)
    ),
    response: {},
  });

  assert.equal(
    await readHostAnalyticsSnapshot(
      firestore as unknown as FirebaseFirestore.Firestore,
      snapshotId,
      now
    ),
    null
  );
});

test("buildHostAnalyticsFromRecords aggregates host-safe metrics", () => {
  const range = resolveAnalyticsRange({
    rangePreset: "custom",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    granularity: "week",
  }, new Date("2026-06-18T12:00:00.000Z"));

  const input = records();
  input.martRows.push(martRow({
    date: "2026-05-20",
    bookedCount: 4,
    checkedInCount: 2,
    checkoutStartedCount: 5,
    paymentCompletedCount: 4,
    grossRevenueMinor: 200000,
    reviewCount: 2,
    ratingTotal: 8,
    listingViews: 5,
    eventViews: 4,
    mutualMatchCount: 1,
    chatStartedCount: 1,
  }));
  const response = buildHostAnalyticsFromRecords(input, range, new Date(
    "2026-06-18T12:00:00.000Z"
  ));

  assert.equal(response.scope.clubName, "Saket Run Club");
  assert.deepEqual(response.scope.clubIds, ["club-1"]);
  assert.deepEqual(response.scope.eventIds, ["event-1"]);
  assert.equal(metric(response, "listingViews").value, 12);
  assert.equal(metric(response, "eventViews").value, 9);
  assert.equal(metric(response, "bookings").value, 8);
  assert.equal(metric(response, "attendanceRate").value, 75);
  assert.equal(metric(response, "revenue").value, 400000);
  assert.equal(metric(response, "checkoutDropoff").value, 2);
  assert.equal(metric(response, "checkoutConversionRate").value, 66.67);
  assert.equal(metric(response, "connections").value, 3);
  assert.equal(metric(response, "chats").value, 2);
  assert.equal(metric(response, "bookings").previousValue, 4);
  assert.equal(metric(response, "attendanceRate").previousValue, 50);
  assert.equal(metric(response, "listingViews").previousValue, 5);
  assert.equal(metric(response, "revenue").previousValue, 200000);
  assert.equal(response.discoverySummary.organizerSaves, 4);
  assert.equal(response.discoverySummary.eventSaves, 7);
  assert.equal(response.reviewSummary.newReviews, 1);
  assert.equal(response.reviewSummary.ownerResponseCount, 1);

  assert.equal(response.topEvents.length, 1);
  assert.equal(response.topEvents[0].bookedCount, 8);
  assert.equal(response.topEvents[0].checkedInCount, 6);
  assert.equal(response.topEvents[0].fillRate, 80);
  assert.equal(response.topEvents[0].checkInRate, 75);
  assert.equal(response.topEvents[0].checkoutStartedCount, 3);
  assert.equal(response.topEvents[0].checkoutDropoffCount, 2);
  assert.equal(response.topEvents[0].paymentFailedCount, 1);
  assert.equal(response.topEvents[0].inviteOpenCount, 11);
  assert.equal(response.topEvents[0].mutualMatchCount, 3);
  assert.equal(response.topEvents[0].chatStartedCount, 2);
  assert.equal(response.dataQuality.find((row) =>
    row.id === "firestore-cache"
  )?.state, "ok");

  const eventBucket = response.trend.find((point) =>
    point.periodStart === "2026-06-08T00:00:00.000Z"
  );
  assert.ok(eventBucket);
  assert.equal(eventBucket.metrics.bookings, 8);
  assert.equal(eventBucket.metrics.checkedIn, 6);
  assert.equal(eventBucket.metrics.revenueMinor, 400000);
  assert.equal(eventBucket.metrics.checkoutStarted, 3);
  assert.equal(eventBucket.metrics.checkoutDropoff, 2);
  assert.equal(eventBucket.metrics.reviews, 1);
});

test("incomplete private event keeps name without fake capacity", () => {
  const range = resolveAnalyticsRange({
    rangePreset: "custom",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
  }, new Date("2026-06-18T12:00:00.000Z"));
  const input = records();
  input.events[0].data.name = "Private meetup";
  input.events[0].data.capacityLimit = undefined as never;
  input.events[0].data.eventFormat = undefined as never;
  input.martRows = [];
  input.operationalAttendees = [{
    id: "attendee-1",
    data: {eventId: "event-1", source: "hostImport",
      status: "registered"} as never,
  }];
  const response = buildHostAnalyticsFromRecords(input, range,
    new Date("2026-06-18T12:00:00.000Z"));
  assert.equal(response.scope.eventTitle, "Private meetup");
  assert.deepEqual(response.topEvents, []);
});

test("buildHostAnalyticsFromRecords totals beyond the top event slice", () => {
  const range = resolveAnalyticsRange({
    rangePreset: "custom",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    granularity: "month",
  }, new Date("2026-06-18T12:00:00.000Z"));
  const events = Array.from({length: 30}, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    const id = `event-${index + 1}`;
    return {
      id,
      data: {
        clubId: "club-1",
        status: "completed",
        startTime: `2026-06-${day}T01:30:00.000Z`,
        capacityLimit: 10,
        bookedCount: 1,
        checkedInCount: 1,
        waitlistedCount: 0,
        currency: "INR",
        eventFormat: {
          activityKind: "socialRun",
          customActivityLabel: "Social run",
        },
      },
    };
  });
  const eventRows = events.map((event) => martRow({
    date: event.data.startTime.slice(0, 10),
    eventId: event.id,
    eventTitle: `Social run · ${event.data.startTime.slice(0, 10)}`,
    eventStartTime: event.data.startTime,
    bookedCount: 1,
    checkedInCount: 1,
    checkoutStartedCount: 1,
    paymentCompletedCount: 1,
    grossRevenueMinor: 1000,
    mutualMatchCount: 1,
    chatStartedCount: 1,
  }));
  const clubReviewRow = martRow({
    date: "2026-06-15",
    eventId: null,
    eventTitle: null,
    eventStartTime: null,
    eventStatus: null,
    reviewCount: 2,
    ratingTotal: 8,
    verifiedReviewCount: 1,
    publicReviewCount: 2,
    ownerResponseCount: 1,
  });

  const response = buildHostAnalyticsFromRecords({
    clubs: [{
      id: "club-1",
      data: {name: "Saket Run Club"},
    }],
    events,
    martRows: [...eventRows, clubReviewRow],
  } as unknown as AnalyticsRecords, range, new Date(
    "2026-06-18T12:00:00.000Z"
  ));

  assert.equal(response.topEvents.length, 25);
  assert.equal(metric(response, "bookings").value, 30);
  assert.equal(metric(response, "revenue").value, 30000);
  assert.equal(metric(response, "checkoutConversionRate").value, 100);
  assert.equal(metric(response, "connections").value, 30);
  assert.equal(metric(response, "chats").value, 30);
  assert.equal(metric(response, "newReviews").value, 2);
  assert.equal(response.reviewSummary.newReviews, 2);
  assert.equal(response.reviewSummary.averageRating, 4);
  assert.equal(response.reviewSummary.ownerResponseCount, 1);
});

test("mixed currencies never produce a combined revenue value or delta", () => {
  const range = resolveAnalyticsRange({
    rangePreset: "custom",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
  }, new Date("2026-06-18T12:00:00.000Z"));
  const input = records();
  input.martRows.push(martRow({
    eventId: "event-2",
    currency: "USD",
    grossRevenueMinor: 5000,
  }));

  const response = buildHostAnalyticsFromRecords(
    input,
    range,
    new Date("2026-06-18T12:00:00.000Z")
  );
  const revenue = metric(response, "revenue");

  assert.equal(revenue.value, 0);
  assert.equal(revenue.previousValue, null);
  assert.equal(revenue.status, "partial");
});

function metric(
  response: ReturnType<typeof buildHostAnalyticsFromRecords>,
  id: string
) {
  const item = response.summaryCards.find((card) => card.id === id);
  assert.ok(item, `Missing metric ${id}`);
  return item;
}

function records(): AnalyticsRecords {
  return {
    clubs: [{
      id: "club-1",
      data: {
        name: "Saket Run Club",
      },
    }],
    events: [{
      id: "event-1",
      data: {
        clubId: "club-1",
        status: "completed",
        startTime: "2026-06-12T01:30:00.000Z",
        capacityLimit: 10,
        bookedCount: 5,
        checkedInCount: 4,
        waitlistedCount: 2,
        currency: "INR",
        eventFormat: {
          activityKind: "socialRun",
          customActivityLabel: "Social run",
        },
      },
    }],
    martRows: [{
      date: "2026-06-12",
      clubId: "club-1",
      clubName: "Saket Run Club",
      eventId: "event-1",
      eventTitle: "Social run · 2026-06-12",
      eventStartTime: "2026-06-12T01:30:00.000Z",
      eventStatus: "completed",
      capacityLimit: 10,
      bookedCount: 8,
      checkedInCount: 6,
      waitlistedCount: 2,
      grossRevenueMinor: 400000,
      currency: "INR",
      checkoutStartedCount: 3,
      checkoutDropoffCount: 2,
      paymentCompletedCount: 2,
      paymentFailedCount: 1,
      paymentRefundedCount: 0,
      reviewCount: 1,
      ratingTotal: 5,
      verifiedReviewCount: 1,
      publicReviewCount: 1,
      ownerResponseCount: 1,
      demandCount: 13,
      inviteOpenCount: 11,
      mutualMatchCount: 3,
      chatStartedCount: 2,
      repeatAttendeeCount: 2,
      listingViews: 12,
      searchAppearances: 18,
      eventViews: 9,
      organizerSaves: 4,
      eventSaves: 7,
      contactClicks: 2,
      claimClicks: 1,
      outboundClicks: 3,
    }],
  } as unknown as AnalyticsRecords;
}

class FakeSnapshotFirestore {
  readonly documents = new Map<string, Record<string, unknown>>();

  collection(name: string) {
    assert.equal(name, "hostAnalyticsSnapshots");
    return {
      doc: (id: string) => ({
        get: async () => {
          const value = this.documents.get(id);
          return {
            exists: value !== undefined,
            data: () => value,
          };
        },
        set: async (value: Record<string, unknown>) => {
          this.documents.set(id, value);
        },
      }),
    };
  }
}

function fakeTimestamp(date: Date): FirebaseFirestore.Timestamp {
  return {
    toMillis: () => date.getTime(),
    _seconds: Math.floor(date.getTime() / 1000),
    _nanoseconds: 0,
  } as unknown as FirebaseFirestore.Timestamp;
}

function martRow(overrides: Record<string, unknown> = {}) {
  return {
    date: "2026-06-12",
    clubId: "club-1",
    clubName: "Saket Run Club",
    eventId: "event-1",
    eventTitle: "Social run · 2026-06-12",
    eventStartTime: "2026-06-12T01:30:00.000Z",
    eventStatus: "completed",
    capacityLimit: 10,
    bookedCount: 0,
    checkedInCount: 0,
    waitlistedCount: 0,
    grossRevenueMinor: 0,
    currency: "INR",
    checkoutStartedCount: 0,
    checkoutDropoffCount: 0,
    paymentCompletedCount: 0,
    paymentFailedCount: 0,
    paymentRefundedCount: 0,
    reviewCount: 0,
    ratingTotal: 0,
    verifiedReviewCount: 0,
    publicReviewCount: 0,
    ownerResponseCount: 0,
    demandCount: 0,
    inviteOpenCount: 0,
    mutualMatchCount: 0,
    chatStartedCount: 0,
    repeatAttendeeCount: 0,
    listingViews: 0,
    searchAppearances: 0,
    eventViews: 0,
    organizerSaves: 0,
    eventSaves: 0,
    contactClicks: 0,
    claimClicks: 0,
    outboundClicks: 0,
    linkClicks: 0,
    ...overrides,
  };
}


test("getHostAnalytics verifies fresh manager " +
  "authority before any cached aggregate read", async () => {
  const fixture = hostCallableFixture();
  fixture.organizer.hostProfiles = [{uid: "manager", role: "host"}];
  fixture.organizer.hostUserIds = ["manager"];
  const result = await getHostAnalyticsHandler(
    fixture.request("manager", {organizerId: "org"}),
    fixture.deps
  );
  assert.deepEqual(result.scope.organizerIds, ["org"]);
  assert.equal(
    result.summaryCards.find(
      (card) => card.id === "internalDirectPaidAdmissions"
    )?.status,
    "ready"
  );
  assert.equal(validateHostAnalyticsCallableResponse(result), true,
    JSON.stringify(validateHostAnalyticsCallableResponse.errors));
  const firstReads = fixture.factReads();
  await getHostAnalyticsHandler(
    fixture.request("manager", {organizerId: "org"}), fixture.deps
  );
  assert.equal(fixture.factReads(), firstReads);
  // A stale display profile must not revive authority or serve cached data.
  fixture.organizer.hostUserIds = [];
  await assert.rejects(
    getHostAnalyticsHandler(
      fixture.request("manager", {organizerId: "org"}),
      fixture.deps
    ),
    (error: unknown) =>
      (error as { code: string }).code === "permission-denied"
  );
});

test("getHostAnalytics denies cross-tenant, " +
  "unknown and contradictory event scopes", async () => {
  const fixture = hostCallableFixture();
  for (const [uid, payload, code] of [
    ["foreign", {organizerId: "org"}, "permission-denied"],
    ["owner", {organizerId: "unknown"}, "not-found"],
    ["owner", {eventId: "unknown"}, "not-found"],
    ["owner", {eventId: "e", organizerId: "other"}, "permission-denied"],
  ] as const) {
    await assert.rejects(
      getHostAnalyticsHandler(fixture.request(uid, payload), fixture.deps),
      (error: unknown) => (error as { code: string }).code === code
    );
  }
  assert.equal(fixture.factReads(), 0);
});

function hostCallableFixture(moveEvent = false) {
  let facts = 0;
  let eventReads = 0;
  const cached = new Map<string, unknown>();
  const organizer: {
    name: string;
    ownerUserId: string;
    hostUserId: null;
    hostUserIds: string[];
    hostProfiles: Array<{ uid: string; role: string }>;
  } = {
    name: "Organizer",
    ownerUserId: "owner",
    hostUserId: null,
    hostUserIds: [],
    hostProfiles: [],
  };
  const db = {
    collection(name: string) {
      const query = {
        where() {
          return query;
        },
        select() {
          return query;
        },
        limit() {
          return query;
        },
        async get() {
          if (name !== "events") facts++;
          return {docs: []};
        },
        doc(id: string) {
          return {
            async get() {
              const data =
                name === "organizers" && id === "org" ?
                  organizer :
                  name === "events" && id === "e" ?
                    {organizerId: moveEvent && ++eventReads > 1 ?
                      "other" : "org"} :
                    cached.get(`${name}/${id}`);
              return {exists: data !== undefined, id, data: () => data};
            },
            async set(data: unknown) {
              cached.set(`${name}/${id}`, data);
            },
          };
        },
      };
      return query;
    },
  } as unknown as FirebaseFirestore.Firestore;
  const now = new Date("2026-06-18T12:00:00Z");
  const deps = {
    firestore: () => db,
    now: () => now,
    serverTimestamp: () => ({}) as FirebaseFirestore.FieldValue,
    timestampFromDate: fakeTimestamp,
    bigQuerySource: {loadRows: async () => [], loadLinkRows: async () => []},
    checkRateLimit: async () => {},
  };
  const request = (uid: string, data: Record<string, unknown>) =>
    ({auth: {uid}, data}) as unknown as Parameters<
      typeof getHostAnalyticsHandler
    >[0];
  return {organizer, deps, request, factReads: () => facts};
}

test("provider booking clicks disclose missing " +
  "mart coverage and never imply purchases", () => {
  const input = records();
  const range = resolveAnalyticsRange(
    {rangePreset: "30d"},
    new Date("2026-06-18T12:00:00Z")
  );
  const missing = buildHostAnalyticsFromRecords(input, range, new Date());
  assert.equal(metric(missing, "outboundBookingClicks").status, "missing");
  input.martRows = [martRow({outboundBookingClicks: 8})];
  const observed = buildHostAnalyticsFromRecords(input, range, new Date());
  assert.equal(metric(observed, "outboundBookingClicks").value, 8);
  assert.equal(metric(observed, "outboundBookingClicks").status, "ready");
  assert.match(
    metric(observed, "outboundBookingClicks").caption ?? "",
    /does not observe external purchases/
  );
});


test("selected event moved to another organizer " +
  "is denied on scope reload", async () => {
  const fixture = hostCallableFixture(true);
  await assert.rejects(getHostAnalyticsHandler(
    fixture.request("owner", {eventId: "e"}), fixture.deps),
  (error: unknown) => (error as {code: string}).code === "permission-denied");
  assert.equal(fixture.factReads(), 0);
});


test("external-only organizer retains presence without native report links",
  async () => {
    const fixture = hostCallableFixture();
    const response = await getHostAnalyticsHandler(
      fixture.request("owner", {organizerId: "org"}),
      {...fixture.deps, bigQuerySource: {
        loadRows: async () => [martRow({
          clubId: "org", eventId: "external-only", listingViews: 12,
          eventViews: 9, outboundBookingClicks: 4, bookedCount: 0,
          paymentCompletedCount: 0, grossRevenueMinor: 0,
        })],
        loadLinkRows: async () => [],
      }},
    );
    assert.equal(response.discoverySummary.listingViews, 12);
    assert.equal(response.discoverySummary.eventViews, 9);
    assert.equal(metric(response, "outboundBookingClicks").value, 4);
    assert.deepEqual(response.topEvents, []);
    assert.match(metric(response, "outboundBookingClicks").caption ?? "",
      /does not observe external purchases/);
  });

test("owner link clicks roll up by link, with labels and traffic sources",
  () => {
    const input = records();
    input.clubs[0].data = {...input.clubs[0].data, ownerLinks: [
      {id: "tickets", label: "Tickets", subtitle: null,
        url: "https://www.district.in/saket", icon: "tickets", pinned: false,
        showUntil: null},
    ]} as AnalyticsRecords["clubs"][number]["data"];
    input.martRows = [martRow({linkClicks: 7})];
    input.linkRows = [
      {clubId: "club-1", linkId: "tickets", trafficSource: "instagram",
        linkClicks: 4},
      {clubId: "club-1", linkId: "tickets", trafficSource: "qr",
        linkClicks: 1},
      {clubId: "club-1", linkId: "removed", trafficSource: "made_up",
        linkClicks: 2},
      {clubId: "club-1", linkId: "silent", trafficSource: "direct",
        linkClicks: 0},
    ];
    const range = resolveAnalyticsRange(
      {rangePreset: "30d"}, new Date("2026-06-18T12:00:00Z"));
    const response = buildHostAnalyticsFromRecords(input, range, new Date());
    assert.equal(response.discoverySummary.linkClicks, 7);
    assert.deepEqual(response.linkSummary, {
      links: [
        {organizerId: "club-1", linkId: "tickets", label: "Tickets",
          clicks: 5},
        {organizerId: "club-1", linkId: "removed", label: null, clicks: 2},
      ],
      trafficSources: [
        {source: "instagram", clicks: 4},
        {source: "other", clicks: 2},
        {source: "qr", clicks: 1},
      ],
    });
    assert.equal(validateHostAnalyticsCallableResponse(response), true,
      JSON.stringify(validateHostAnalyticsCallableResponse.errors));
    assert.equal(response.dataQuality.some((row) =>
      row.id === "owner-link-clicks"), false);
  });

test("an unreadable link mart leaves the roll-up empty and says so", () => {
  const input = records();
  input.linkRows = null;
  const range = resolveAnalyticsRange(
    {rangePreset: "30d"}, new Date("2026-06-18T12:00:00Z"));
  const response = buildHostAnalyticsFromRecords(input, range, new Date());
  assert.deepEqual(response.linkSummary, {links: [], trafficSources: []});
  assert.equal(response.dataQuality.find((row) =>
    row.id === "owner-link-clicks")?.state, "missing");
});
