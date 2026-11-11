import assert from "node:assert/strict";
import test from "node:test";
import type {sendFcmNotification} from "../shared/notifications";
import {onMatchCreatedHandler} from "./onMatchCreated";

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

  async set(data: FakeData): Promise<void> {
    this.firestore.set(this.path, data);
  }

  async create(data: FakeData): Promise<void> {
    if (this.firestore.get(this.path) !== undefined) {
      const error = new Error("ALREADY_EXISTS") as Error & {code: number};
      error.code = 6;
      throw error;
    }
    this.firestore.set(this.path, data);
  }
}

class FakeSnapshot {
  constructor(private readonly value: FakeData | undefined) {}

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

  get(path: string): FakeData | undefined {
    const data = this.docs[path];
    return data === undefined ? undefined : structuredClone(data);
  }

  set(path: string, data: FakeData) {
    this.docs[path] = structuredClone(data);
  }
}

function event() {
  return {
    params: {matchId: "match-1"},
    data: {
      data: () => ({
        user1Id: "runner-1",
        user2Id: "runner-2",
        participantIds: ["runner-1", "runner-2"],
        eventIds: ["event-1"],
        createdAt: {seconds: 0, nanoseconds: 0},
        unreadCounts: {"runner-1": 0, "runner-2": 0},
        status: "active",
      }),
    },
  };
}

function demoEvent() {
  const base = event();
  return {
    ...base,
    data: {
      data: () => ({
        ...base.data.data(),
        demoOps: true,
        demoOpsId: "demo_ops_match_1",
        demoOpsCommand: "match-phones",
        seedPrefix: "demo_ops_2026",
        synthetic: true,
      }),
    },
  };
}

function harness() {
  const firestore = new FakeFirestore({
    "users/runner-1": {},
    "users/runner-2": {},
    "publicProfiles/runner-1": {name: "Runner One"},
    "publicProfiles/runner-2": {name: "Runner Two"},
  });
  const notifications: Notification[] = [];

  return {
    firestore,
    notifications,
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
        assert.equal(role, "consumer");
        return [`token-${uid.slice(-1)}`];
      },
    },
  };
}

test(
  "onMatchCreatedHandler writes user-scoped activity notifications and pushes",
  async () => {
    const h = harness();

    await onMatchCreatedHandler(event(), h.deps);

    assert.deepEqual(
      h.firestore.get("notifications/runner-1/items/match_match-1"),
      {
        uid: "runner-1",
        type: "match",
        title: "It's a catch",
        body: "You and Runner Two matched. Say hi!",
        createdAt: {kind: "serverTimestamp"},
        matchId: "match-1",
        eventId: "event-1",
        actorUid: "runner-2",
        actorName: "Runner Two",
        readAt: null,
      }
    );
    assert.deepEqual(
      h.firestore.get("notifications/runner-2/items/match_match-1"),
      {
        uid: "runner-2",
        type: "match",
        title: "It's a catch",
        body: "You and Runner One matched. Say hi!",
        createdAt: {kind: "serverTimestamp"},
        matchId: "match-1",
        eventId: "event-1",
        actorUid: "runner-1",
        actorName: "Runner One",
        readAt: null,
      }
    );
    assert.deepEqual(h.notifications, [
      {
        token: "token-1",
        title: "It's a catch",
        body: "You and Runner Two matched. Say hi!",
        type: "match",
        matchId: "match-1",
        notificationId: "match_match-1",
        recipientUid: "runner-1",
        appRole: "consumer",
        actorName: "Runner Two",
        actorAvatarUrl: undefined,
      },
      {
        token: "token-2",
        title: "It's a catch",
        body: "You and Runner One matched. Say hi!",
        type: "match",
        matchId: "match-1",
        notificationId: "match_match-1",
        recipientUid: "runner-2",
        appRole: "consumer",
        actorName: "Runner One",
        actorAvatarUrl: undefined,
      },
    ]);
  }
);

test("onMatchCreatedHandler propagates demo metadata to notifications",
  async () => {
    const h = harness();

    await onMatchCreatedHandler(demoEvent(), h.deps);

    const notification = h.firestore.get(
      "notifications/runner-1/items/match_match-1"
    );
    assert.deepEqual(
      {
        demoOps: notification?.demoOps,
        demoOpsId: notification?.demoOpsId,
        demoOpsCommand: notification?.demoOpsCommand,
        seedPrefix: notification?.seedPrefix,
        synthetic: notification?.synthetic,
      },
      {
        demoOps: true,
        demoOpsId: "demo_ops_match_1",
        demoOpsCommand: "match-phones",
        seedPrefix: "demo_ops_2026",
        synthetic: true,
      }
    );
  }
);

test(
  "onMatchCreatedHandler sends the match push only once across redeliveries",
  async () => {
    const h = harness();

    await onMatchCreatedHandler(event(), h.deps);
    assert.equal(h.notifications.length, 2);

    // Simulate an at-least-once redelivery of the same match event: the
    // activity notifications re-set idempotently, but the push must not repeat.
    await onMatchCreatedHandler(event(), h.deps);
    assert.equal(h.notifications.length, 2);
  }
);
