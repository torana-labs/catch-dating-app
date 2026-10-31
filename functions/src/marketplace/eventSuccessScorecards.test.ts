import assert from "node:assert/strict";
import test from "node:test";
import type {
  EventDocument,
  MatchDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  buildEventHostFunnelMetrics,
  buildEventSuccessConversationGraphAggregate,
  buildEventSuccessScorecard,
  onEventInviteLinkWrittenHandler,
  refreshEventSuccessScorecard,
  writeEventSafetyReportIfNeeded,
} from "./eventSuccessScorecards";

test("buildEventSuccessScorecard computes event aggregates", () => {
  const scorecard = buildEventSuccessScorecard({
    eventId: "event-1",
    event: {
      organizerId: "club-1",
      bookedCount: 10,
      checkedInCount: 8,
    } as EventDocument,
    feedback: [
      {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "user-1",
        welcomeRating: 5,
        structureRating: 4,
        metNewPeopleCount: 3,
        safetyConcern: false,
      },
      {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "user-2",
        welcomeRating: 3,
        structureRating: 2,
        metNewPeopleCount: 1,
        safetyConcern: true,
      },
    ],
    matches: [
      match("match-1", "LAST_MESSAGE_AT" as never),
      match("match-2", null),
      match("match-3", "LAST_MESSAGE_AT" as never, {status: "blocked"}),
      match("host-inquiry", "LAST_MESSAGE_AT" as never, {
        conversationType: "organizerHostInquiry",
        organizerId: "club-1",
      }),
    ],
    catchAggregates: {
      catchSentCount: 3,
      attendeesWhoCaughtSomeone: 2,
      catchRecipientCount: 3,
    },
    updatedAt: "SERVER_TIMESTAMP" as never,
  });

  assert.deepEqual(scorecard, {
    eventId: "event-1",
    organizerId: "club-1",
    bookedCount: 10,
    checkedInCount: 8,
    feedbackCount: 2,
    attendeesWhoMetTwoPlusPeople: 1,
    catchSentCount: 3,
    attendeesWhoCaughtSomeone: 2,
    catchRecipientCount: 3,
    catchRate: 0.25,
    mutualMatchCount: 2,
    chatStartedCount: 1,
    averageWelcomeRating: 4,
    averageStructureRating: 3,
    safetyIncidentCount: 0,
    conversationGraph: {
      responseCount: 0,
      skippedCount: 0,
      conversationCount: 0,
      attendeesWithTwoPlusConversations: 0,
      excludedAttendeeCount: 0,
      assignedConversationCount: 0,
      assignedOpportunityCount: 0,
    },
    funnel: {
      inviteLinkCount: 0,
      inviteOpenCount: 0,
      totalDemandCount: 0,
      requestCount: 0,
      pendingRequestCount: 0,
      approvedRequestCount: 0,
      declinedRequestCount: 0,
      directSignupCount: 0,
      waitlistJoinCount: 0,
      waitlistOfferCount: 0,
      waitlistOfferActiveCount: 0,
      waitlistOfferAcceptedCount: 0,
      waitlistOfferDeclinedCount: 0,
      waitlistOfferExpiredCount: 0,
      checkoutStartedCount: 0,
      paymentPendingCount: 0,
      paymentCompletedCount: 0,
      paymentFailedCount: 0,
      paymentRefundedCount: 0,
      bookedCount: 10,
      checkedInCount: 8,
      noShowCount: 0,
      catchSentCount: 3,
      attendeesWhoCaughtSomeone: 2,
      mutualMatchCount: 2,
      chatStartedCount: 1,
      repeatAttendeeCount: 0,
    },
    updatedAt: "SERVER_TIMESTAMP",
  });
});

test("conversation graph host aggregate contains no name-to-name edges", () => {
  const aggregate = buildEventSuccessConversationGraphAggregate([
    {
      status: "submitted",
      selectedUids: ["runner-2", "runner-3"],
      assignedSelectedCount: 1,
      assignedCandidateCount: 2,
    },
    {
      status: "submitted",
      selectedUids: [],
      assignedSelectedCount: 0,
      assignedCandidateCount: 1,
    },
    {
      status: "skipped",
      selectedUids: [],
      assignedSelectedCount: 0,
      assignedCandidateCount: 3,
    },
  ]);

  assert.deepEqual(aggregate, {
    responseCount: 3,
    skippedCount: 1,
    conversationCount: 2,
    attendeesWithTwoPlusConversations: 1,
    excludedAttendeeCount: 1,
    assignedConversationCount: 1,
    assignedOpportunityCount: 3,
  });
  assert.deepEqual(
    Object.keys(aggregate).filter((key) => /uid|name|edge/iu.test(key)),
    []
  );
  assert.equal(JSON.stringify(aggregate).includes("runner-"), false);
});

test("buildEventSuccessScorecard exposes safety count after sample", () => {
  const scorecard = buildEventSuccessScorecard({
    eventId: "event-1",
    event: {
      organizerId: "club-1",
      bookedCount: 10,
      checkedInCount: 8,
    } as EventDocument,
    feedback: Array.from({length: 5}, (_, index) => ({
      eventId: "event-1",
      organizerId: "club-1",
      uid: `user-${index}`,
      welcomeRating: 5,
      structureRating: 4,
      metNewPeopleCount: 3,
      safetyConcern: index === 0,
    })),
    matches: [],
    updatedAt: "SERVER_TIMESTAMP" as never,
  });

  assert.equal(scorecard.safetyIncidentCount, 1);
});

test("buildEventHostFunnelMetrics computes the operating funnel", () => {
  const funnel = buildEventHostFunnelMetrics({
    event: {
      organizerId: "club-1",
      bookedCount: 6,
      checkedInCount: 4,
    } as EventDocument,
    participations: [
      participation("runner-1", "attended", {signedUpAt: "SIGNED_AT"}),
      participation("runner-2", "signedUp", {
        hostApprovalStatus: "approved",
        signedUpAt: "SIGNED_AT",
        waitlistedAt: "WAITLISTED_AT",
      }),
      participation("runner-3", "waitlisted", {
        hostApprovalStatus: "pending",
        waitlistedAt: "WAITLISTED_AT",
      }),
      participation("runner-4", "cancelled", {
        hostApprovalStatus: "declined",
      }),
    ] as never,
    waitlistOffers: [
      {eventId: "event-1", organizerId: "club-1", uid: "runner-2", status: "active"},
      {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "runner-3",
        status: "accepted",
      },
      {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "runner-4",
        status: "declined",
      },
      {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "runner-5",
        status: "expired",
      },
    ] as never,
    payments: [
      {eventId: "event-1", status: "pending"},
      {eventId: "event-1", status: "completed"},
      {eventId: "event-1", status: "failed"},
      {eventId: "event-1", status: "refunded"},
    ] as never,
    inviteLinks: [
      {eventId: "event-1", openCount: 10},
      {eventId: "event-1", openCount: 4},
    ] as never,
    matches: [
      match("match-1", "LAST_MESSAGE_AT" as never),
      match("match-2", null),
      match("match-3", null, {status: "blocked"}),
      match("host-inquiry", "LAST_MESSAGE_AT" as never, {
        conversationType: "organizerHostInquiry",
        organizerId: "club-1",
      }),
    ],
    catchAggregates: {
      catchSentCount: 5,
      attendeesWhoCaughtSomeone: 3,
      catchRecipientCount: 4,
    },
    repeatAttendeeCount: 2,
  });

  assert.deepEqual(funnel, {
    inviteLinkCount: 2,
    inviteOpenCount: 14,
    totalDemandCount: 4,
    requestCount: 3,
    pendingRequestCount: 1,
    approvedRequestCount: 1,
    declinedRequestCount: 1,
    directSignupCount: 1,
    waitlistJoinCount: 2,
    waitlistOfferCount: 4,
    waitlistOfferActiveCount: 1,
    waitlistOfferAcceptedCount: 1,
    waitlistOfferDeclinedCount: 1,
    waitlistOfferExpiredCount: 1,
    checkoutStartedCount: 4,
    paymentPendingCount: 1,
    paymentCompletedCount: 1,
    paymentFailedCount: 1,
    paymentRefundedCount: 1,
    bookedCount: 6,
    checkedInCount: 4,
    noShowCount: 1,
    catchSentCount: 5,
    attendeesWhoCaughtSomeone: 3,
    mutualMatchCount: 2,
    chatStartedCount: 1,
    repeatAttendeeCount: 2,
  });
});

test(
  "invite link scorecard trigger ignores connection-counter writes",
  async () => {
    await onEventInviteLinkWrittenHandler(
      {
        eventId: "event-1",
        openCount: 2,
        requestCount: 1,
        confirmedCount: 1,
        paidCount: 1,
        checkedInCount: 1,
        catcherCount: 0,
        matchCount: 0,
        chatStartedCount: 0,
      } as never,
      {
        eventId: "event-1",
        openCount: 2,
        requestCount: 1,
        confirmedCount: 1,
        paidCount: 1,
        checkedInCount: 1,
        catcherCount: 1,
        matchCount: 1,
        chatStartedCount: 1,
      } as never,
      {
        firestore: () => {
          throw new Error("Scorecard refresh should not run.");
        },
        serverTimestamp: () => "SERVER_TIMESTAMP" as never,
      }
    );
  }
);

test(
  "refreshEventSuccessScorecard rebuilds privacy-safe catch aggregates",
  async () => {
    const writes: Record<string, unknown> = {};
    await refreshEventSuccessScorecard("event-1", {
      firestore: () => fakeFirestore({
        "events/event-1": {
          organizerId: "club-1",
          bookedCount: 4,
          checkedInCount: 3,
        },
        "eventParticipations/event-1_user-1": participation(
          "user-1",
          "attended"
        ),
        "eventParticipations/event-1_user-2": participation(
          "user-2",
          "attended"
        ),
        "eventParticipations/event-1_user-3": participation(
          "user-3",
          "attended"
        ),
        "eventParticipations/event-1_user-4": participation(
          "user-4",
          "signedUp"
        ),
        "profileDecisions/user-1/outgoing/user-2": swipe(
          "user-1",
          "user-2",
          "like"
        ),
        "profileDecisions/user-1/outgoing/user-3": swipe(
          "user-1",
          "user-3",
          "like"
        ),
        "profileDecisions/user-2/outgoing/user-4": swipe(
          "user-2",
          "user-4",
          "like"
        ),
        "profileDecisions/user-3/outgoing/user-1": swipe(
          "user-3",
          "user-1",
          "pass"
        ),
        "blocks/block-1": {
          blockerUserId: "user-3",
          blockedUserId: "user-1",
          createdAt: "CREATED_AT",
          source: "profile",
        },
      }, writes),
      serverTimestamp: () => "SERVER_TIMESTAMP" as never,
    });

    assert.deepEqual(writes["eventSuccessScorecards/event-1"], {
      eventId: "event-1",
      organizerId: "club-1",
      bookedCount: 4,
      checkedInCount: 3,
      feedbackCount: 0,
      attendeesWhoMetTwoPlusPeople: 0,
      catchSentCount: 1,
      attendeesWhoCaughtSomeone: 1,
      catchRecipientCount: 1,
      catchRate: 1 / 3,
      mutualMatchCount: 0,
      chatStartedCount: 0,
      averageWelcomeRating: 0,
      averageStructureRating: 0,
      safetyIncidentCount: 0,
      conversationGraph: {
        responseCount: 0,
        skippedCount: 0,
        conversationCount: 0,
        attendeesWithTwoPlusConversations: 0,
        excludedAttendeeCount: 0,
        assignedConversationCount: 0,
        assignedOpportunityCount: 0,
      },
      funnel: {
        inviteLinkCount: 0,
        inviteOpenCount: 0,
        totalDemandCount: 4,
        requestCount: 0,
        pendingRequestCount: 0,
        approvedRequestCount: 0,
        declinedRequestCount: 0,
        directSignupCount: 0,
        waitlistJoinCount: 0,
        waitlistOfferCount: 0,
        waitlistOfferActiveCount: 0,
        waitlistOfferAcceptedCount: 0,
        waitlistOfferDeclinedCount: 0,
        waitlistOfferExpiredCount: 0,
        checkoutStartedCount: 0,
        paymentPendingCount: 0,
        paymentCompletedCount: 0,
        paymentFailedCount: 0,
        paymentRefundedCount: 0,
        bookedCount: 4,
        checkedInCount: 3,
        noShowCount: 1,
        catchSentCount: 1,
        attendeesWhoCaughtSomeone: 1,
        mutualMatchCount: 0,
        chatStartedCount: 0,
        repeatAttendeeCount: 0,
      },
      updatedAt: "SERVER_TIMESTAMP",
    });
  }
);

test(
  "refreshEventSuccessScorecard counts repeat attendees from prior events",
  async () => {
    const writes: Record<string, unknown> = {};
    await refreshEventSuccessScorecard("event-2", {
      firestore: () => fakeFirestore({
        "events/event-2": {
          organizerId: "club-1",
          bookedCount: 2,
          checkedInCount: 2,
        },
        // Current event roster.
        "eventParticipations/event-2_user-1": {
          eventId: "event-2",
          organizerId: "club-1",
          uid: "user-1",
          status: "attended",
        },
        "eventParticipations/event-2_user-2": {
          eventId: "event-2",
          organizerId: "club-1",
          uid: "user-2",
          status: "attended",
        },
        // user-1 also attended a different event at the same club -> repeat.
        "eventParticipations/event-1_user-1": {
          eventId: "event-1",
          organizerId: "club-1",
          uid: "user-1",
          status: "attended",
        },
        // user-2's only other participation is at a different club -> not a
        // repeat for club-1.
        "eventParticipations/event-9_user-2": {
          eventId: "event-9",
          organizerId: "club-2",
          uid: "user-2",
          status: "attended",
        },
      }, writes),
      serverTimestamp: () => "SERVER_TIMESTAMP" as never,
    });

    const scorecard = writes["eventSuccessScorecards/event-2"] as {
      funnel: {repeatAttendeeCount: number};
    };
    assert.equal(scorecard.funnel.repeatAttendeeCount, 1);
  }
);

test(
  "refreshEventSuccessScorecard excludes Host inquiries from " +
    "connection metrics",
  async () => {
    const writes: Record<string, unknown> = {};
    await refreshEventSuccessScorecard("event-1", {
      firestore: () => fakeFirestore({
        "events/event-1": {
          organizerId: "club-1",
          bookedCount: 2,
          checkedInCount: 2,
        },
        "eventParticipations/event-1_user-1": participation(
          "user-1",
          "attended",
          {inviteLinkId: "link-1"}
        ),
        "eventParticipations/event-1_user-2": participation(
          "user-2",
          "attended"
        ),
        "eventInviteLinks/link-1": {
          eventId: "event-1",
          organizerId: "club-1",
        },
        "matches/dating": match("dating", "LAST_MESSAGE_AT" as never, {
          user1Id: "user-1",
          user2Id: "user-2",
          participantIds: ["user-1", "user-2"],
        }),
        "matches/host-inquiry": match(
          "host-inquiry",
          "LAST_MESSAGE_AT" as never,
          {
            user1Id: "user-1",
            user2Id: "host-1",
            participantIds: ["user-1", "host-1"],
            conversationType: "organizerHostInquiry",
            organizerId: "club-1",
          }
        ),
      }, writes),
      serverTimestamp: () => "SERVER_TIMESTAMP" as never,
    });

    const scorecard = writes["eventSuccessScorecards/event-1"] as Record<
      string,
      unknown
    >;
    assert.equal(scorecard.mutualMatchCount, 1);
    assert.equal(scorecard.chatStartedCount, 1);
    assert.deepEqual(writes["eventInviteLinks/link-1"], {
      catcherCount: 0,
      matchCount: 1,
      chatStartedCount: 1,
      updatedAt: "SERVER_TIMESTAMP",
    });
  }
);

test("writeEventSafetyReportIfNeeded stores safety review", async () => {
  const writes: Record<string, unknown> = {};
  await writeEventSafetyReportIfNeeded(
    "event-1_user-1",
    {
      eventId: "event-1",
      organizerId: "club-1",
      uid: "user-1",
      welcomeRating: 3,
      structureRating: 2,
      metNewPeopleCount: 1,
      safetyConcern: true,
      privateNote: "  Needs review.  ",
    },
    {
      firestore: () => ({
        collection: (collectionId: string) => ({
          doc: (docId: string) => ({
            set: async (data: unknown) => {
              writes[`${collectionId}/${docId}`] = data;
            },
          }),
        }),
      } as unknown as FirebaseFirestore.Firestore),
      serverTimestamp: () => "SERVER_TIMESTAMP" as never,
    }
  );

  assert.deepEqual(writes["eventSafetyReports/event-1_user-1"], {
    eventId: "event-1",
    organizerId: "club-1",
    reporterUserId: "user-1",
    feedbackId: "event-1_user-1",
    source: "event_success_feedback",
    status: "open",
    createdAt: "SERVER_TIMESTAMP",
    updatedAt: "SERVER_TIMESTAMP",
    note: "Needs review.",
  });
});

function match(
  id: string,
  lastMessageAt: FirebaseFirestore.Timestamp | null,
  overrides: Partial<MatchDocument> = {}
): MatchDocument {
  return {
    user1Id: `${id}-a`,
    user2Id: `${id}-b`,
    participantIds: [`${id}-a`, `${id}-b`],
    eventIds: ["event-1"],
    createdAt: "CREATED_AT" as never,
    lastMessageAt,
    unreadCounts: {},
    status: "active",
    conversationType: "match",
    ...overrides,
  };
}

function participation(
  uid: string,
  status: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    eventId: "event-1",
    organizerId: "club-1",
    uid,
    status,
    ...overrides,
  };
}

function swipe(
  swiperId: string,
  targetId: string,
  direction: "like" | "pass"
): Record<string, unknown> {
  return {
    swiperId,
    targetId,
    eventId: "event-1",
    direction,
    createdAt: "CREATED_AT",
  };
}

function fakeFirestore(
  docs: Record<string, unknown>,
  writes: Record<string, unknown>
): FirebaseFirestore.Firestore {
  return {
    collection: (collectionPath: string) =>
      collectionRef(collectionPath, docs, writes),
    batch: () => ({
      set: async (
        ref: {path: string; set: (data: unknown) => Promise<void>},
        data: unknown
      ) => {
        writes[ref.path] = data;
      },
      commit: async () => undefined,
    }),
  } as unknown as FirebaseFirestore.Firestore;
}

function collectionRef(
  collectionPath: string,
  docs: Record<string, unknown>,
  writes: Record<string, unknown>,
  filters: Array<{field: string; operator: string; value: unknown}> = []
) {
  return {
    doc: (docId: string) => docRef(`${collectionPath}/${docId}`, docs, writes),
    where: (field: string, operator: string, value: unknown) =>
      collectionRef(collectionPath, docs, writes, [
        ...filters,
        {field, operator, value},
      ]),
    get: async () => {
      const resultDocs = queryDocs(collectionPath, docs, filters, writes);
      return {
        docs: resultDocs,
        empty: resultDocs.length === 0,
      };
    },
  };
}

function docRef(
  path: string,
  docs: Record<string, unknown>,
  writes: Record<string, unknown>
) {
  return {
    path,
    collection: (collectionPath: string) =>
      collectionRef(`${path}/${collectionPath}`, docs, writes),
    get: async () => ({
      exists: docs[path] !== undefined,
      data: () => docs[path],
    }),
    set: async (data: unknown) => {
      writes[path] = data;
    },
  };
}

function queryDocs(
  collectionPath: string,
  docs: Record<string, unknown>,
  filters: Array<{field: string; operator: string; value: unknown}>,
  writes: Record<string, unknown>
) {
  const prefix = `${collectionPath}/`;
  return Object.entries(docs)
    .filter(([path]) =>
      path.startsWith(prefix) &&
      !path.slice(prefix.length).includes("/")
    )
    .map(([path, data]) => ({path, data}))
    .filter(({data}) => {
      const row = data as Record<string, unknown>;
      return filters.every((filter) => {
        if (filter.operator === "==") {
          return row[filter.field] === filter.value;
        }
        if (filter.operator === "in" && Array.isArray(filter.value)) {
          return filter.value.includes(row[filter.field]);
        }
        if (filter.operator === "array-contains") {
          const values = row[filter.field];
          return Array.isArray(values) && values.includes(filter.value);
        }
        throw new Error(`Unsupported operator ${filter.operator}`);
      });
    })
    .map(({path, data}) => ({
      id: path.split("/").at(-1) ?? "",
      ref: docRef(path, docs, writes),
      data: () => data,
    }));
}
