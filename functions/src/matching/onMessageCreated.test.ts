import assert from "node:assert/strict";
import test from "node:test";
import type {sendFcmNotification} from "../shared/notifications";
import {onMessageCreatedHandler} from "./onMessageCreated";

type FakeData = Record<string, unknown>;
type Notification = Parameters<typeof sendFcmNotification>[0];

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}

  async get(): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.firestore.get(this.path));
  }

  collection(collectionPath: string) {
    return {
      doc: (docId: string) => new FakeDocRef(
        this.firestore,
        `${this.path}/${collectionPath}/${docId}`
      ),
    };
  }
}

class FakeSnapshot {
  constructor(private readonly value: FakeData | undefined) {}

  get exists(): boolean {
    return this.value !== undefined;
  }

  data(): FakeData | undefined {
    return this.value === undefined ? undefined : structuredClone(this.value);
  }
}

class FakeFirestore {
  constructor(private readonly docs: Record<string, FakeData | undefined>) {}

  collection(collectionPath: string) {
    return {
      doc: (docId: string) => new FakeDocRef(
        this,
        `${collectionPath}/${docId}`
      ),
    };
  }

  async runTransaction<T>(
    callback: (tx: FakeTransaction) => Promise<T>
  ): Promise<T> {
    const tx = new FakeTransaction(this);
    const result = await callback(tx);
    tx.commit();
    return result;
  }

  get(path: string): FakeData | undefined {
    const data = this.docs[path];
    return data === undefined ? undefined : structuredClone(data);
  }

  set(path: string, data: FakeData | undefined) {
    this.docs[path] = structuredClone(data);
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];

  constructor(private readonly firestore: FakeFirestore) {}

  async get(ref: FakeDocRef): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.firestore.get(ref.path));
  }

  update(ref: FakeDocRef, patch: FakeData) {
    this.writes.push(() => {
      const current = this.firestore.get(ref.path);
      assert(current, `Missing doc for update: ${ref.path}`);
      this.firestore.set(ref.path, applyPatch(current, patch));
    });
  }

  create(ref: FakeDocRef, data: FakeData) {
    this.writes.push(() => {
      assert.equal(this.firestore.get(ref.path), undefined);
      this.firestore.set(ref.path, applyPatch({}, data));
    });
  }

  set(ref: FakeDocRef, data: FakeData) {
    this.writes.push(() => {
      const current = this.firestore.get(ref.path) ?? {};
      this.firestore.set(ref.path, applyPatch(current, data));
    });
  }

  commit() {
    for (const write of this.writes) write();
  }
}

function applyPatch(current: FakeData, patch: FakeData): FakeData {
  const next = structuredClone(current);
  for (const [fieldPath, value] of Object.entries(patch)) {
    setField(next, fieldPath, value);
  }
  return next;
}

function setField(target: FakeData, fieldPath: string, value: unknown) {
  const parts = fieldPath.split(".");
  let cursor: FakeData = target;
  for (const part of parts.slice(0, -1)) {
    const existing = cursor[part];
    if (!isRecord(existing)) {
      cursor[part] = {};
    }
    cursor = cursor[part] as FakeData;
  }

  const finalPart = parts.at(-1) ?? fieldPath;
  cursor[finalPart] = value;
}

function isRecord(value: unknown): value is FakeData {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function event(eventId: string) {
  return {
    id: eventId,
    params: {matchId: "match-1", messageId: "message-1"},
    data: {
      data: () => ({
        senderId: "runner-1",
        text: "Hello there",
        sentAt: {seconds: 1, nanoseconds: 0},
      }),
    },
  };
}

function harness({
  eventIds = ["event-1"],
  conversationType,
}: {
  eventIds?: string[];
  conversationType?: "match" | "organizerHostInquiry";
} = {}) {
  const firestore = new FakeFirestore({
    "matches/match-1": {
      user1Id: "runner-1",
      user2Id: "runner-2",
      participantIds: ["runner-1", "runner-2"],
      eventIds,
      createdAt: {seconds: 0, nanoseconds: 0},
      lastMessageAt: null,
      lastMessagePreview: null,
      lastMessageSenderId: null,
      unreadCounts: {"runner-1": 0, "runner-2": 1},
      status: "active",
      ...(conversationType == null ? {} : {conversationType}),
      ...(conversationType === "organizerHostInquiry" ? {
        organizerId: "org-1"} : {}),
    },
    "publicProfiles/runner-1": {name: "Runner One"},
    "users/runner-2": {fcmToken: "token-2"},
    "organizers/org-1": {
      ownerUserId: "runner-2", hostUserIds: [], hostProfiles: [],
    },
    "hostProfiles/runner-2": {
      displayName: "Professional Host",
      avatarUrl: "https://example.com/host.png",
    },
  });
  const notifications: Notification[] = [];
  const scorecardRefreshes: string[] = [];
  const signalFactBatches: unknown[] = [];
  const pushRequests: Array<{uid: string; role: string}> = [];

  return {
    firestore,
    notifications,
    scorecardRefreshes,
    signalFactBatches,
    pushRequests,
    deps: {
      firestore: () =>
        firestore as unknown as FirebaseFirestore.Firestore,
      serverTimestamp: () =>
        ({kind: "serverTimestamp"}) as unknown as FirebaseFirestore.FieldValue,
      sendNotification: async (notification: Notification) => {
        notifications.push(notification);
      },
      resolvePushTokens: async (
        _db: FirebaseFirestore.Firestore, uid: string, role: string
      ) => {
        pushRequests.push({uid, role});
        return [`${role}-token`];
      },
      refreshScorecard: async (eventId: string) => {
        scorecardRefreshes.push(eventId);
      },
      recordSignalFacts: async (
        _db: FirebaseFirestore.Firestore,
        facts: unknown
      ) => {
        signalFactBatches.push(facts);
      },
    },
  };
}

test("onMessageCreatedHandler updates match metadata and notifies recipient",
  async () => {
    const h = harness();

    await onMessageCreatedHandler(event("event-1"), h.deps);

    assert.deepEqual(h.firestore.get("matches/match-1"), {
      user1Id: "runner-1",
      user2Id: "runner-2",
      participantIds: ["runner-1", "runner-2"],
      eventIds: ["event-1"],
      createdAt: {seconds: 0, nanoseconds: 0},
      lastMessageAt: {seconds: 1, nanoseconds: 0},
      lastMessagePreview: "Hello there",
      lastMessageSenderId: "runner-1",
      unreadCounts: {"runner-1": 0, "runner-2": 1},
      status: "active",
    });
    assert.deepEqual(
      h.firestore.get("functionEventReceipts/onMessageCreated_event-1"),
      {
        handler: "onMessageCreated",
        eventId: "event-1",
        matchId: "match-1",
        messageId: "message-1",
        createdAt: {kind: "serverTimestamp"},
      }
    );
    assert.equal(
      h.firestore.get("notifications/runner-2/items/message_match-1_message-1"),
      undefined
    );
    assert.equal(h.notifications.length, 1);
    assert.deepEqual(h.scorecardRefreshes, ["event-1"]);
  }
);

test("onMessageCreatedHandler applies a retried event once", async () => {
  const h = harness();

  await onMessageCreatedHandler(event("event-1"), h.deps);
  await onMessageCreatedHandler(event("event-1"), h.deps);

  assert.deepEqual(
    h.firestore.get("matches/match-1")?.unreadCounts,
    {"runner-1": 0, "runner-2": 1}
  );
  assert.equal(h.notifications.length, 1);
  assert.deepEqual(h.scorecardRefreshes, ["event-1"]);
});

test("onMessageCreatedHandler refreshes every event attached to the match",
  async () => {
    const h = harness({eventIds: ["event-1", "event-2"]});

    await onMessageCreatedHandler(event("event-1"), h.deps);

    assert.deepEqual(h.scorecardRefreshes, ["event-1", "event-2"]);
  }
);

test("onMessageCreatedHandler redacts blocked content in push and preview",
  async () => {
    const h = harness();

    await onMessageCreatedHandler(
      {
        id: "event-1",
        params: {matchId: "match-1", messageId: "message-1"},
        data: {
          data: () => ({
            senderId: "runner-1",
            // Block-list term — the push and the denormalized preview must not
            // carry it (the stored doc is redacted by a separate trigger).
            text: "you stupid kafir",
            sentAt: {seconds: 1, nanoseconds: 0},
          }),
        },
      },
      h.deps
    );

    assert.equal(
      h.firestore.get("matches/match-1")?.lastMessagePreview,
      "[message removed for review]"
    );
    assert.equal(h.notifications.length, 1);
    assert.equal(h.notifications[0]?.body, "[message removed for review]");
  }
);

test(
  "onMessageCreatedHandler keeps Host inquiries out of dating analytics",
  async () => {
    const h = harness({conversationType: "organizerHostInquiry"});

    await onMessageCreatedHandler(event("event-1"), h.deps);

    assert.equal(h.notifications.length, 1);
    assert.deepEqual(h.pushRequests, [{uid: "runner-2", role: "host"}]);
    assert.equal(h.notifications[0]?.appRole, "host");
    assert.equal(h.notifications[0]?.recipientUid, "runner-2");
    assert.equal(h.notifications[0]?.messageId, "message-1");
    assert.deepEqual(h.scorecardRefreshes, []);
    assert.deepEqual(h.signalFactBatches, []);
    assert.equal(
      h.firestore.get("matches/match-1")?.lastMessagePreview,
      "Hello there"
    );
  }
);

test("Host-only recipients need no Consumer profile", async () => {
  const h = harness({conversationType: "organizerHostInquiry"});
  h.firestore.set("users/runner-2", undefined);
  await onMessageCreatedHandler(event("host-only"), h.deps);
  assert.equal(h.notifications[0]?.token, "host-token");
});

test("Host replies target Consumer and use professional identity", async () => {
  const h = harness({conversationType: "organizerHostInquiry"});
  h.firestore.set("users/runner-1", {});
  h.firestore.set("publicProfiles/runner-2", {name: "Private Dating Name"});
  const reply = event("reply");
  reply.data.data = () => ({
    ...event("reply").data.data(), senderId: "runner-2",
  });
  await onMessageCreatedHandler(reply, h.deps);
  assert.deepEqual(h.pushRequests, [{uid: "runner-1", role: "consumer"}]);
  assert.equal(h.notifications[0]?.title, "Professional Host");
  assert.equal(
    h.notifications[0]?.actorAvatarUrl, "https://example.com/host.png"
  );
});

for (const conversationType of ["match", "organizerHostInquiry"] as const) {
  test(`message preference is respected for ${conversationType}`, async () => {
    const h = harness({conversationType});
    h.firestore.set("users/runner-2", {prefsMessages: false});
    await onMessageCreatedHandler(event("disabled"), h.deps);
    assert.equal(h.notifications.length, 0);
    assert.equal(h.pushRequests.length, 0);
  });
}

test("one failed installation does not block another", async () => {
  const h = harness();
  await onMessageCreatedHandler(event("multi"), {
    ...h.deps,
    resolvePushTokens: async () => ["expired", "valid"],
    sendNotification: async (notification) => {
      if (notification.token === "expired") throw new Error("expired token");
      h.notifications.push(notification);
    },
  });
  assert.equal(h.notifications.length, 1);
  assert.equal(h.notifications[0]?.token, "valid");
});

test("closed or deleted-recipient conversations do not notify", async () => {
  for (const reason of ["closed", "deleted"]) {
    const h = harness();
    if (reason === "closed") {
      h.firestore.set("matches/match-1", {
        ...h.firestore.get("matches/match-1"), status: "closed",
      });
    } else {
      h.firestore.set("deletedUsers/runner-2", {deleted: true});
    }
    await onMessageCreatedHandler(event(reason), h.deps);
    assert.equal(h.notifications.length, 0);
  }
});

test("missing organizer suppresses push, not chat metadata", async () => {
  const h = harness({conversationType: "organizerHostInquiry"});
  h.firestore.set("organizers/org-1", undefined);
  await onMessageCreatedHandler(event("missing-organizer"), h.deps);
  assert.equal(h.notifications.length, 0);
  assert.equal(h.firestore.get("matches/match-1")?.lastMessagePreview,
    "Hello there");
});
