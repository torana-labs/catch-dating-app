import assert from "node:assert/strict";
import test from "node:test";
import {
  countAuthUsersCreatedSince,
  loadRestrictedEventAssistanceOverview,
  normalizeQueueItem,
  startOfSevenDayWindow,
  startOfUtcDay,
} from "./overview";

test("restricted event requests stay hidden from non-safety overview roles",
  async () => {
    const firestore = {
      collection() {
        assert.fail("restricted collection must not be queried");
      },
    } as unknown as FirebaseFirestore.Firestore;

    assert.deepEqual(
      await loadRestrictedEventAssistanceOverview(
        firestore,
        ["finance", "analyticsViewer"]
      ),
      {count: 0, items: []}
    );
  });

test("restricted event requests load for safety-readable overview roles",
  async () => {
    let collectionReads = 0;
    const query = {
      where() {
        return query;
      },
      orderBy() {
        return query;
      },
      limit() {
        return query;
      },
      count() {
        return {
          async get() {
            return {data: () => ({count: 2})};
          },
        };
      },
      async get() {
        return {docs: []};
      },
    };
    const firestore = {
      collection(name: string) {
        assert.equal(name, "eventAssistanceCases");
        collectionReads += 1;
        return query;
      },
    } as unknown as FirebaseFirestore.Firestore;

    assert.deepEqual(
      await loadRestrictedEventAssistanceOverview(firestore, ["support"]),
      {count: 2, items: []}
    );
    assert.equal(collectionReads, 2);
  });

test("startOfUtcDay returns midnight UTC", () => {
  assert.equal(
    startOfUtcDay(new Date("2026-06-01T18:30:00.000Z")).toISOString(),
    "2026-06-01T00:00:00.000Z"
  );
});

test("startOfSevenDayWindow includes today and six prior days", () => {
  assert.equal(
    startOfSevenDayWindow(new Date("2026-06-01T18:30:00.000Z"))
      .toISOString(),
    "2026-05-26T00:00:00.000Z"
  );
});

test("countAuthUsersCreatedSince scans paged Auth users", async () => {
  const pages = [
    {
      users: [
        {metadata: {creationTime: "2026-06-01T01:00:00.000Z"}},
        {metadata: {creationTime: "2026-05-30T01:00:00.000Z"}},
      ],
      pageToken: "next",
    },
    {
      users: [
        {metadata: {creationTime: "2026-06-01T12:00:00.000Z"}},
        {metadata: {creationTime: "not-a-date"}},
      ],
    },
  ];
  let callIndex = 0;

  const result = await countAuthUsersCreatedSince({
    async listUsers() {
      return pages[callIndex++];
    },
  }, new Date("2026-06-01T00:00:00.000Z"));

  assert.deepEqual(result, {count: 2, scanned: 4});
});

test("normalizeQueueItem builds readable safety report rows", () => {
  assert.deepEqual(
    normalizeQueueItem("safetyReport", "reports/report-1", {
      targetUserId: "user-2",
      reasonCode: "harassment",
      source: "chat",
      status: "open",
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
    }),
    {
      id: "reports/report-1",
      title: "harassment",
      detail: "target user-2 - chat",
      status: "open",
      createdAt: "2026-06-01T10:00:00.000Z",
      targetPath: "reports/report-1",
    }
  );
});

test("normalizeQueueItem builds live restricted event request rows", () => {
  assert.deepEqual(
    normalizeQueueItem(
      "eventAssistanceCase",
      "eventAssistanceCases/case:restricted-1",
      {
        context: {
          mode: "live",
          eventId: "event-1",
          organizerId: "organizer-1",
        },
        attendeeId: "attendee-1",
        status: "open",
        receivedAt: 1_780_000_000_000,
      }
    ),
    {
      id: "eventAssistanceCases/case:restricted-1",
      title: "Live event safety request",
      detail: "event event-1 - attendee attendee-1",
      status: "open",
      createdAt: "2026-05-28T20:26:40.000Z",
      targetPath: "eventAssistanceCases/case:restricted-1",
    }
  );
});

test("normalizeQueueItem builds readable club claim request rows", () => {
  assert.deepEqual(
    normalizeQueueItem("organizerClaimRequest", "organizerClaimRequests/request-1", {
      organizerId: "afterfly-run-club-indore",
      requesterUid: "user-1",
      requesterName: "Afterfly Ops",
      requesterRole: "founder",
      businessEmail: "hello@afterfly.example",
      proofUrls: [
        "https://example.com/afterfly",
        "https://instagram.com/afterfly",
      ],
      status: "pending",
      createdAt: new Date("2026-06-01T11:30:00.000Z"),
    }),
    {
      id: "organizerClaimRequests/request-1",
      title: "Afterfly Ops",
      detail:
        "club afterfly-run-club-indore - founder - " +
        "hello@afterfly.example - 2 proof links",
      status: "pending",
      createdAt: "2026-06-01T11:30:00.000Z",
      targetPath: "organizerClaimRequests/request-1",
    }
  );
});

test("normalizeQueueItem builds readable club index review rows", () => {
  assert.deepEqual(
    normalizeQueueItem("organizerIndexReview", "clubs/afterfly-run-club-indore", {
      name: "AFTER FLY",
      publicPage: {
        canonicalPath: "/organizers/indore/afterfly-run-club/",
        indexStatus: "noindex",
      },
      provenance: {
        sourceConfidence: "high",
        verificationStatus: "sourceBacked",
        lastVerifiedAt: new Date("2026-06-01T12:00:00.000Z"),
      },
    }),
    {
      id: "clubs/afterfly-run-club-indore",
      title: "AFTER FLY",
      detail:
        "/organizers/indore/afterfly-run-club/ - high - sourceBacked",
      status: "noindex",
      createdAt: "2026-06-01T12:00:00.000Z",
      targetPath: "clubs/afterfly-run-club-indore",
    }
  );
});
