import assert from "node:assert/strict";
import test from "node:test";
import {
  datingMatchIdForPair,
  onSwipeCreatedHandler,
} from "./onSwipeCreated";
import type {
  SwipeDocument,
} from "../shared/generated/firestoreAdminTypes";

test(
  "onSwipeCreatedHandler creates a deterministic reciprocal match",
  async () => {
    const created: Record<string, unknown> = {};
    const refreshed: string[] = [];

    await onSwipeCreatedHandler(
      {
        swiperId: "user-b",
        targetId: "user-a",
        swipeData: swipe("user-b", "user-a", "event-2", "like"),
      },
      deps({
        docs: {
          "profileDecisions/user-a/outgoing/user-b": swipe(
            "user-a",
            "user-b",
            "event-1",
            "like"
          ),
        },
        created,
        refreshed,
      })
    );

    assert.deepEqual(created["matches/user-a_user-b"], {
      user1Id: "user-a",
      user2Id: "user-b",
      participantIds: ["user-a", "user-b"],
      eventIds: ["event-1", "event-2"],
      createdAt: "SERVER_TIMESTAMP",
      lastMessageAt: null,
      lastMessagePreview: null,
      lastMessageSenderId: null,
      unreadCounts: {"user-a": 0, "user-b": 0},
      status: "active",
      blockedBy: null,
      blockedAt: null,
      conversationType: "match",
    });
    assert.deepEqual(refreshed, ["event-2", "event-1"]);
  }
);

test("onSwipeCreatedHandler writes reaction comments to chat", async () => {
  const created: Record<string, unknown> = {};

  await onSwipeCreatedHandler(
    {
      swiperId: "user-b",
      targetId: "user-a",
      swipeData: swipe("user-b", "user-a", "event-2", "like", {
        reactionTargetLabel: "Bio",
        reactionTargetPreview: "Always up for a sunrise event.",
        comment: "This sounds like my kind of morning.",
      }),
    },
    deps({
      docs: {
        "profileDecisions/user-a/outgoing/user-b": swipe(
          "user-a",
          "user-b",
          "event-1",
          "like",
          {
            reactionTargetLabel: "Main photo",
            comment: "Great finish-line photo.",
          }
        ),
      },
      created,
    })
  );

  const firstMessagePath =
    "matches/user-a_user-b/messages/profileReaction_user-a_user-b";
  const secondMessagePath =
    "matches/user-a_user-b/messages/profileReaction_user-b_user-a";
  assert.deepEqual(created[firstMessagePath], {
    senderId: "user-a",
    text: "Great finish-line photo.\n\nAbout Main photo",
    sentAt: "SERVER_TIMESTAMP",
  });
  assert.deepEqual(created[secondMessagePath], {
    senderId: "user-b",
    text:
      "This sounds like my kind of morning.\n\n" +
      "About Bio: Always up for a sunrise event.",
    sentAt: "SERVER_TIMESTAMP",
  });
});

test("onSwipeCreatedHandler appends event ids to an existing match", async (
) => {
  const created: Record<string, unknown> = {};
  const updated: Record<string, unknown> = {};
  const refreshed: string[] = [];

  await onSwipeCreatedHandler(
    {
      swiperId: "user-b",
      targetId: "user-a",
      swipeData: swipe("user-b", "user-a", "event-3", "like"),
    },
    deps({
      docs: {
        "profileDecisions/user-a/outgoing/user-b": swipe(
          "user-a",
          "user-b",
          "event-2",
          "like"
        ),
        "matches/user-a_user-b": {eventIds: ["event-1"]},
      },
      created,
      updated,
      refreshed,
    })
  );

  assert.deepEqual(created, {});
  const matchPatch = updated["matches/user-a_user-b"] as Record<
    string,
    unknown
  >;
  assert.deepEqual(matchPatch, {
    eventIds: {arrayUnion: ["event-2", "event-3"]},
    conversationType: "match",
    organizerId: matchPatch.organizerId,
  });
  assert.deepEqual(refreshed, ["event-3", "event-2"]);
});

test(
  "onSwipeCreatedHandler keeps a legacy Host inquiry separate from dating",
  async () => {
    const created: Record<string, unknown> = {};
    const updated: Record<string, unknown> = {};
    const legacyInquiry = {
      user1Id: "user-a",
      user2Id: "user-b",
      participantIds: ["user-a", "user-b"],
      eventIds: [],
      conversationType: "organizerHostInquiry",
      organizerId: "club-1",
      status: "active",
    };

    await onSwipeCreatedHandler(
      {
        swiperId: "user-b",
        targetId: "user-a",
        swipeData: swipe("user-b", "user-a", "event-2", "like"),
      },
      deps({
        docs: {
          "profileDecisions/user-a/outgoing/user-b": swipe(
            "user-a",
            "user-b",
            "event-1",
            "like"
          ),
          "matches/user-a_user-b": legacyInquiry,
        },
        created,
        updated,
      })
    );

    const opaqueId = datingMatchIdForPair("user-a", "user-b");
    const datingMatch = created[`matches/${opaqueId}`] as Record<
      string,
      unknown
    >;
    assert.equal(datingMatch.conversationType, "match");
    assert.deepEqual(datingMatch.eventIds, ["event-1", "event-2"]);
    assert.equal(updated["matches/user-a_user-b"], undefined);
    assert.equal(legacyInquiry.conversationType, "organizerHostInquiry");
    assert.equal(legacyInquiry.organizerId, "club-1");
  }
);

test(
  "onSwipeCreatedHandler ignores non-reciprocal and blocked likes",
  async () => {
    const nonReciprocal: Record<string, unknown> = {};
    const refreshed: string[] = [];
    await onSwipeCreatedHandler(
      {
        swiperId: "user-a",
        targetId: "user-b",
        swipeData: swipe("user-a", "user-b", "event-1", "like"),
      },
      deps({created: nonReciprocal, refreshed})
    );
    assert.deepEqual(nonReciprocal, {});
    assert.deepEqual(refreshed, ["event-1"]);

    const blocked: Record<string, unknown> = {};
    const blockedRefreshed: string[] = [];
    await onSwipeCreatedHandler(
      {
        swiperId: "user-a",
        targetId: "user-b",
        swipeData: swipe("user-a", "user-b", "event-1", "like"),
      },
      deps({
        docs: {
          "profileDecisions/user-b/outgoing/user-a": swipe(
            "user-b",
            "user-a",
            "event-1",
            "like"
          ),
        },
        created: blocked,
        refreshed: blockedRefreshed,
        blocked: true,
      })
    );
    assert.deepEqual(blocked, {});
    assert.deepEqual(blockedRefreshed, []);
  }
);

function swipe(
  swiperId: string,
  targetId: string,
  eventId: string,
  direction: "like" | "pass",
  overrides: Partial<SwipeDocument> = {}
): SwipeDocument {
  return {
    swiperId,
    targetId,
    eventId,
    direction,
    createdAt: "created-at" as unknown as FirebaseFirestore.Timestamp,
    ...overrides,
  };
}

function deps({
  docs = {},
  created = {},
  updated = {},
  refreshed = [],
  blocked = false,
}: {
  docs?: Record<string, unknown>;
  created?: Record<string, unknown>;
  updated?: Record<string, unknown>;
  refreshed?: string[];
  blocked?: boolean;
}) {
  return {
    firestore: () => firestore(docs, created, updated),
    hasBlockingRelationship: async () => blocked,
    arrayUnion: (...elements: string[]) => ({arrayUnion: elements}),
    serverTimestamp: () => "SERVER_TIMESTAMP",
    refreshScorecard: async (eventId: string) => {
      refreshed.push(eventId);
    },
  } as never;
}

function firestore(
  docs: Record<string, unknown>,
  created: Record<string, unknown>,
  updated: Record<string, unknown>
) {
  return {
    collection: (collectionPath: string) => ({
      doc: (docId: string) => docRef(`${collectionPath}/${docId}`),
    }),
  };

  function docRef(path: string): unknown {
    return {
      collection: (collectionPath: string) => ({
        doc: (docId: string) => docRef(`${path}/${collectionPath}/${docId}`),
      }),
      get: async () => {
        const data = docs[path];
        return {
          exists: data !== undefined,
          data: () => data,
        };
      },
      create: async (data: unknown) => {
        if (docs[path] !== undefined || created[path] !== undefined) {
          const error = new Error("Already exists") as Error & {code: number};
          error.code = 6;
          throw error;
        }
        created[path] = data;
      },
      set: async (data: unknown) => {
        created[path] = data;
      },
      update: async (data: Record<string, unknown>) => {
        const existing = (updated[path] ?? {}) as Record<string, unknown>;
        updated[path] = {...existing, ...data};
      },
    };
  }
}
