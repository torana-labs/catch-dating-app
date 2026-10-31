import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {
  deriveEventSuccessPresenceState,
  eventSuccessPresencePolicy,
  heartbeatEventSuccessPresenceHandler,
} from "./presence";

type FakeData = Record<string, unknown>;

class FakeSnapshot {
  constructor(
    private readonly docs: Map<string, FakeData>,
    readonly path: string
  ) {}

  get exists(): boolean {
    return this.docs.has(this.path);
  }

  data(): FakeData | undefined {
    const value = this.docs.get(this.path);
    return value === undefined ? undefined : {...value};
  }
}

class FakeDocRef {
  constructor(
    private readonly docs: Map<string, FakeData>,
    readonly path: string
  ) {}

  get(): Promise<FakeSnapshot> {
    return Promise.resolve(new FakeSnapshot(this.docs, this.path));
  }
}

class FakeCollectionRef {
  constructor(
    private readonly docs: Map<string, FakeData>,
    private readonly path: string
  ) {}

  doc(id: string): FakeDocRef {
    return new FakeDocRef(this.docs, `${this.path}/${id}`);
  }
}

class FakeTransaction {
  constructor(private readonly docs: Map<string, FakeData>) {}

  get(ref: FakeDocRef): Promise<FakeSnapshot> {
    return ref.get();
  }

  set(ref: FakeDocRef, data: FakeData): void {
    this.docs.set(ref.path, {...data});
  }
}

class FakeFirestore {
  readonly docs = new Map<string, FakeData>();

  collection(path: string): FakeCollectionRef {
    return new FakeCollectionRef(this.docs, path);
  }

  runTransaction<T>(
    callback: (transaction: FakeTransaction) => Promise<T>
  ): Promise<T> {
    return callback(new FakeTransaction(this.docs));
  }
}

test("presence policy uses defaults and valid deployment overrides", () => {
  assert.deepEqual(eventSuccessPresencePolicy({}), {
    heartbeatIntervalSeconds: 30,
    presentWindowSeconds: 90,
    likelyDepartedAfterSeconds: 300,
  });
  assert.deepEqual(eventSuccessPresencePolicy({
    EVENT_SUCCESS_HEARTBEAT_INTERVAL_SECONDS: "45",
    EVENT_SUCCESS_PRESENCE_PRESENT_SECONDS: "120",
    EVENT_SUCCESS_PRESENCE_LIKELY_DEPARTED_SECONDS: "420",
  }), {
    heartbeatIntervalSeconds: 45,
    presentWindowSeconds: 120,
    likelyDepartedAfterSeconds: 420,
  });
  assert.deepEqual(eventSuccessPresencePolicy({
    EVENT_SUCCESS_HEARTBEAT_INTERVAL_SECONDS: "120",
    EVENT_SUCCESS_PRESENCE_PRESENT_SECONDS: "90",
  }), eventSuccessPresencePolicy({}));
});

test("presence state observes the exact liveness boundaries", () => {
  const policy = eventSuccessPresencePolicy({});
  assert.equal(deriveEventSuccessPresenceState({
    heartbeatAtMillis: 0,
    nowMillis: 90_000,
    policy,
  }), "present");
  assert.equal(deriveEventSuccessPresenceState({
    heartbeatAtMillis: 0,
    nowMillis: 90_001,
    policy,
  }), "idle");
  assert.equal(deriveEventSuccessPresenceState({
    heartbeatAtMillis: 0,
    nowMillis: 300_000,
    policy,
  }), "idle");
  assert.equal(deriveEventSuccessPresenceState({
    heartbeatAtMillis: 0,
    nowMillis: 300_001,
    policy,
  }), "likelyDeparted");
});

test("checked-in heartbeat is server-owned and returns policy", async () => {
  const firestore = new FakeFirestore();
  const attendedAt = {toMillis: () => 1_000};
  firestore.docs.set("events/event-1", {
    organizerId: "club-1",
    status: "active",
  });
  firestore.docs.set("eventParticipations/event-1_guest-1", {
    eventId: "event-1",
    organizerId: "club-1",
    uid: "guest-1",
    status: "attended",
    attendedAt,
  });
  const serverTimestamp = {server: true};
  const result = await heartbeatEventSuccessPresenceHandler({
    auth: {uid: "guest-1"},
    data: {eventId: "event-1", surface: "flutter"},
  } as CallableRequest<unknown>, {
    firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
    serverTimestamp: () => serverTimestamp as unknown as
      FirebaseFirestore.FieldValue,
    nowMillis: () => 10_000,
    environment: {},
  });

  assert.deepEqual(result, {
    presenceState: "present",
    serverTimeMillis: 10_000,
    heartbeatIntervalSeconds: 30,
    presentWindowSeconds: 90,
    likelyDepartedAfterSeconds: 300,
  });
  assert.deepEqual(
    firestore.docs.get("eventSuccessPresence/event-1_guest-1"),
    {
      eventId: "event-1",
      organizerId: "club-1",
      uid: "guest-1",
      surface: "flutter",
      heartbeatAt: serverTimestamp,
      createdAt: serverTimestamp,
      updatedAt: serverTimestamp,
    }
  );
});
