import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOrganizerSearchRecord,
  buildEventSearchRecord,
  organizerSearchIndexSettings,
  eventSearchIndexSettings,
  syncAlgoliaEventIndexHandler,
} from "./algoliaExploreIndex.js";
import type {
  OrganizerDocument,
  EventDocument,
} from "../shared/generated/firestoreAdminTypes.js";

/**
 * Builds a minimal Firestore timestamp double for pure record tests.
 * @param {string} iso ISO-8601 timestamp.
 * @return {FirebaseFirestore.Timestamp} Timestamp-like test value.
 */
function timestamp(iso: string) {
  const millis = Date.parse(iso);
  return {
    toMillis: () => millis,
  } as FirebaseFirestore.Timestamp;
}

/**
 * Builds a complete club document for search indexing tests.
 * @param {Partial<OrganizerDocument>} overrides Field overrides.
 * @return {OrganizerDocument} Club document.
 */
function organizer(overrides: Partial<OrganizerDocument> = {}): OrganizerDocument {
  return {
    name: "Saket Social Runners",
    description: "Run and coffee",
    location: "in-mp-indore",
    locationCityId: "in-mp-indore",
    locationMarketId: "in-mp-indore",
    cityName: "Indore",
    regionName: "Madhya Pradesh",
    countryCode: "IN",
    countryName: "India",
    area: "Saket",
    hostUserId: "host-1",
    hostName: "Suvrat",
    hostAvatarUrl: null,
    ownerUserId: "host-1",
    hostUserIds: ["host-1"],
    hostProfiles: [],
    createdAt: timestamp("2026-05-01T00:00:00.000Z"),
    imageUrl: null,
    profileImageUrl: null,
    tags: ["running"],
    memberCount: 12,
    rating: 4.8,
    reviewCount: 5,
    nextEventAt: timestamp("2026-05-30T01:30:00.000Z"),
    nextEventLabel: "Saket Square",
    instagramHandle: null,
    phoneNumber: null,
    email: null,
    status: "active" as const,
    archived: false,
    archivedAt: null,
    archiveReason: null,
    organizerType: "club",
    organizerPhotos: [],
    followerCount: 12,
    ...overrides,
  };
}

/**
 * Builds a complete event document for search indexing tests.
 * @param {Partial<EventDocument>} overrides Field overrides.
 * @return {EventDocument} Event document.
 */
function event(overrides: Partial<EventDocument> = {}): EventDocument {
  return {
    organizerId: "club-1",
    startTime: timestamp("2026-05-30T01:30:00.000Z"),
    endTime: timestamp("2026-05-30T02:30:00.000Z"),
    meetingPoint: "Saket Square",
    meetingLocation: {
      name: "Saket Square",
      address: null,
      placeId: null,
      latitude: 22.7196,
      longitude: 75.8577,
      notes: null,
    },
    startingPointLat: 22.7196,
    startingPointLng: 75.8577,
    locationDetails: null,
    distanceKm: 5,
    eventFormat: {
      version: 1,
      activityKind: "running" as const,
      interactionModel: "pacePods" as const,
    },
    pace: "easy" as const,
    capacityLimit: 20,
    description: "Easy community run",
    priceInPaise: 0,
    currency: "INR",
    bookedCount: 0,
    checkedInCount: 0,
    waitlistedCount: 0,
    genderCounts: {},
    cohortCounts: {},
    waitlistedCohortCounts: {},
    constraints: {minAge: 18, maxAge: 99},
    status: "active" as const,
    discoveryCityName: "indore",
    discoveryMarketId: "in-mp-indore",
    discoveryActivityKind: "running" as const,
    discoveryGeoCell: "283:948",
    discoveryHasOpenSpots: true,
    discoveryAvailability: "open" as const,
    discoveryOpenCohorts: [],
    discoveryWaitlistCohorts: [],
    discoveryInviteRequired: false,
    discoveryMembershipRequired: false,
    discoveryManualApprovalRequired: false,
    discoveryMinAge: 18,
    discoveryMaxAge: 99,
    ...overrides,
  };
}

test("buildOrganizerSearchRecord normalizes city facets", () => {
  const record = buildOrganizerSearchRecord("club-1", organizer());

  assert.equal(record?.objectID, "club-1");
  assert.equal(record?.location, "Indore");
  assert.equal(record?.locationMarketId, "in-mp-indore");
  assert.equal(record?.nextEventAtEpoch, 1780104600);
  assert.equal(record?.memberCount, 12);
});

test("buildOrganizerSearchRecord omits archived clubs", () => {
  assert.equal(
    buildOrganizerSearchRecord("club-1", organizer({archived: true})),
    null
  );
});

test("buildEventSearchRecord uses the organizer city and event time", () => {
  const record = buildEventSearchRecord("event-1", event(), organizer());

  assert.equal(record?.objectID, "event-1");
  assert.equal(record?.organizerName, "Saket Social Runners");
  assert.equal(record?.discoveryCityName, "indore");
  assert.equal(record?.discoveryMarketId, "in-mp-indore");
  assert.equal(record?.startTimeEpoch, 1780104600);
});

test("buildEventSearchRecord omits cancelled events", () => {
  assert.equal(
    buildEventSearchRecord(
      "event-1", event({status: "cancelled"}), organizer()
    ),
    null
  );
});

test("private and malformed setup events never enter a visible organizer index",
  () => {
    for (const state of [{publicationState: "private"},
      {publicationState: null}, {setupRevision: 1}]) {
      assert.equal(buildEventSearchRecord("private-event", {
        ...event(), ...state,
      } as EventDocument, organizer()), null);
    }
    assert.ok(buildEventSearchRecord("published-event", {
      ...event(), ...{publicationState: "published" as const, setupRevision: 2},
    }, organizer()));
  });

test("index settings expose required filters", () => {
  assert.deepEqual(organizerSearchIndexSettings().attributesForFaceting, [
    "filterOnly(locationMarketId)",
    "filterOnly(status)",
    "filterOnly(archived)",
  ]);
  assert.deepEqual(eventSearchIndexSettings().attributesForFaceting, [
    "filterOnly(discoveryMarketId)",
    "filterOnly(status)",
    "filterOnly(organizerId)",
  ]);
});

test("late published trigger cannot reindex the current private event",
  async () => {
    const current: EventDocument = {
      ...event(), publicationState: "private", setupRevision: 2};
    const methods: string[] = [];
    const deps = searchDeps(() => current, async (init) => {
      methods.push(init.method!);
    });
    await syncAlgoliaEventIndexHandler("event-1", event(), deps);
    assert.deepEqual(methods, ["DELETE"]);
  });

test("publication change during index write deletes the stale projection",
  async () => {
    let current: EventDocument = {
      ...event(), publicationState: "published", setupRevision: 1};
    const methods: string[] = [];
    const deps = searchDeps(() => current, async (init) => {
      methods.push(init.method!);
      if (init.method === "PUT") {
        current = {...current, publicationState: "private", setupRevision: 2};
      }
    });
    await syncAlgoliaEventIndexHandler("event-1", event(), deps);
    assert.deepEqual(methods, ["PUT", "DELETE"]);
  });

function searchDeps(currentEvent: () => EventDocument,
  onFetch: (init: RequestInit) => Promise<void>) {
  return {
    firestore: () => ({collection: (path: string) => ({
      doc: () => ({get: async () => ({exists: true,
        data: () => path === "events" ? currentEvent() : organizer()})}),
    })}) as unknown as FirebaseFirestore.Firestore,
    writeApiKey: () => "test-key",
    fetchImpl: (async (_url: unknown, init: RequestInit) => {
      await onFetch(init);
      return {ok: true} as Response;
    }) as typeof fetch,
  };
}
