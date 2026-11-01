import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {
  adminGetUserAnalyticsHandler,
  buildUserAnalyticsFromRecords,
  resolveUserAnalyticsRange,
} from "./userAnalytics";

type AnalyticsRecords = Parameters<typeof buildUserAnalyticsFromRecords>[0];

test("resolveUserAnalyticsRange supports custom weekly ranges", () => {
  const range = resolveUserAnalyticsRange({
    rangePreset: "custom",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    granularity: "week",
  }, new Date("2026-06-18T12:00:00.000Z"));

  assert.equal(range.start.toISOString(), "2026-06-01T00:00:00.000Z");
  assert.equal(range.endExclusive.toISOString(), "2026-07-01T00:00:00.000Z");
  assert.equal(range.granularity, "week");
  assert.equal(range.preset, "custom");
});

test("buildUserAnalyticsFromRecords exposes only user-safe aggregates", () => {
  const range = resolveUserAnalyticsRange({
    rangePreset: "custom",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    granularity: "week",
  }, new Date("2026-06-18T12:00:00.000Z"));

  const response = buildUserAnalyticsFromRecords(
    records(),
    range,
    new Date("2026-06-18T12:00:00.000Z")
  );

  assert.equal(response.scope.userId, "user-1");
  assert.equal(metric(response, "profileViews").value, 5);
  assert.equal(metric(response, "caughtYou").value, 5);
  assert.equal(metric(response, "mutualCatches").value, 2);
  assert.equal(metric(response, "chatsStarted").value, 2);
  assert.equal(metric(response, "eventsAttended").value, 1);
  assert.equal(metric(response, "followThroughRate").value, 100);
  assert.equal(response.connectionSummary.outgoingLikes, 6);
  assert.equal(response.connectionSummary.incomingLikes, 4);
  assert.equal(response.connectionSummary.privateInterestReceived, 1);
  assert.equal(response.connectionSummary.mutualCatches, 2);
  assert.equal(response.connectionSummary.chatMessagesSent, 7);
  assert.equal(response.profileSummary.profileDwellSeconds, 90);
  assert.equal(response.profileSummary.photoImpressions, 8);
  assert.equal(response.profileSummary.topPhotoId, "photo-2");
  assert.equal(response.profileSummary.activeMinutes, 12);
  assert.ok(response.coachingTipRefs.some((tip) =>
    tip.copyKey === "keepShowingUp"
  ));
  assert.equal(
    response.dataQuality.find((row) => row.id === "profile-exposure")?.state,
    "ok"
  );

  const serialized = JSON.stringify(response);
  assert.equal(serialized.includes("percentile"), false);
  assert.equal(serialized.includes("desirability"), false);
});

test(
  "buildUserAnalyticsFromRecords returns missing state for empty ranges",
  () => {
    const range = resolveUserAnalyticsRange({
      rangePreset: "7d",
    }, new Date("2026-06-18T12:00:00.000Z"));

    const response = buildUserAnalyticsFromRecords(
      {uid: "user-1", martRows: []},
      range,
      new Date("2026-06-18T12:00:00.000Z")
    );

    assert.equal(metric(response, "profileViews").status, "missing");
    assert.equal(metric(response, "caughtYou").status, "missing");
    assert.equal(response.dataQuality[0].id, "user-analytics-mart");
    assert.equal(response.dataQuality[0].state, "missing");
    assert.ok(response.coachingTipRefs.some((tip) =>
      tip.copyKey === "profileAnalyticsGrowing"
    ));
  }
);

test("adminGetUserAnalyticsHandler scopes by selected user id", async () => {
  const auditLogs: Record<string, unknown>[] = [];
  const rateLimitCalls: Array<{uid: string; action: string}> = [];
  const response = await adminGetUserAnalyticsHandler(
    callableRequest("admin-1", {
      userId: "user-1",
      rangePreset: "7d",
    }, {adminOwner: true}),
    {
      firestore: () => fakeAuditFirestore(auditLogs),
      now: () => new Date("2026-06-18T12:00:00.000Z"),
      serverTimestamp: () => "SERVER_TIMESTAMP" as never,
      bigQuerySource: {
        async loadRows(_range, scope) {
          assert.deepEqual(scope, {uid: "user-1"});
          return [martRow({
            date: "2026-06-18",
            profileViewCount: 3,
            incomingLikeCount: 2,
          })] as never;
        },
      },
      async checkRateLimit(_db, uid, action) {
        rateLimitCalls.push({uid, action});
      },
    }
  );

  assert.equal(response.scope.userId, "user-1");
  assert.deepEqual(rateLimitCalls, [{
    uid: "admin-1",
    action: "adminGetUserAnalytics",
  }]);
  assert.equal(auditLogs.length, 1);
  assert.equal(auditLogs[0].action, "adminGetUserAnalytics");
  assert.equal(auditLogs[0].targetPath, "users/user-1/analytics");
});

test("adminGetUserAnalyticsHandler requires selected user id", async () => {
  await assert.rejects(
    () => adminGetUserAnalyticsHandler(
      callableRequest("admin-1", {rangePreset: "7d"}, {adminOwner: true}),
      {
        firestore: () => fakeAuditFirestore([]),
        now: () => new Date("2026-06-18T12:00:00.000Z"),
        serverTimestamp: () => "SERVER_TIMESTAMP" as never,
        bigQuerySource: {
          async loadRows() {
            return [];
          },
        },
      }
    ),
    (error) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "invalid-argument"
  );
});

function metric(
  response: ReturnType<typeof buildUserAnalyticsFromRecords>,
  id: string
) {
  const item = response.summaryCards.find((card) => card.id === id);
  assert.ok(item, `Missing metric ${id}`);
  return item;
}

function records(): AnalyticsRecords {
  return {
    uid: "user-1",
    martRows: [
      martRow({
        date: "2026-06-12",
        topPhotoId: "photo-1",
        topPhotoScore: 3,
        eventsBookedCount: 1,
        eventsAttendedCount: 1,
        outgoingLikeCount: 4,
        incomingLikeCount: 3,
        privateInterestReceivedCount: 1,
        matchCount: 1,
        chatStartedSentCount: 1,
        chatMessageSentCount: 5,
        profileViewCount: 2,
        uniqueProfileViewerCount: 2,
        profileDwellMs: 60000,
        photoImpressionCount: 3,
        photoDwellMs: 30000,
        appActiveMinutes: 4,
        appEventCount: 21,
      }),
      martRow({
        date: "2026-06-13",
        topPhotoId: "photo-2",
        topPhotoScore: 9,
        outgoingLikeCount: 2,
        incomingLikeCount: 1,
        matchCount: 1,
        chatStartedReceivedCount: 1,
        chatMessageSentCount: 2,
        profileViewCount: 3,
        uniqueProfileViewerCount: 3,
        profileDwellMs: 30000,
        photoImpressionCount: 5,
        photoDwellMs: 60000,
        appActiveMinutes: 8,
        appEventCount: 40,
      }),
    ],
  } as AnalyticsRecords;
}

function martRow(overrides: Record<string, unknown> = {}) {
  return {
    date: "2026-06-12",
    uid: "user-1",
    eventsBookedCount: 0,
    eventsAttendedCount: 0,
    outgoingLikeCount: 0,
    incomingLikeCount: 0,
    privateInterestSentCount: 0,
    privateInterestReceivedCount: 0,
    matchCount: 0,
    chatStartedSentCount: 0,
    chatStartedReceivedCount: 0,
    chatMessageSentCount: 0,
    chatMessageReceivedCount: 0,
    feedbackSubmittedCount: 0,
    profileViewCount: 0,
    uniqueProfileViewerCount: 0,
    profileDwellMs: 0,
    photoImpressionCount: 0,
    photoDwellMs: 0,
    topPhotoId: null,
    topPhotoScore: 0,
    appActiveMinutes: 0,
    appEventCount: 0,
    dataCompletenessScore: 1,
    ...overrides,
  };
}

function callableRequest(
  uid: string | null,
  data: unknown,
  token: Record<string, unknown> = {}
): CallableRequest<unknown> {
  return {
    auth: uid ? {uid, token} as CallableRequest["auth"] : undefined,
    data,
  } as CallableRequest<unknown>;
}

function fakeAuditFirestore(auditLogs: Record<string, unknown>[]) {
  return {
    collection(path: string) {
      assert.equal(path, "adminAuditLogs");
      return {
        async add(data: Record<string, unknown>) {
          auditLogs.push(data);
        },
      };
    },
  } as never;
}
