import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {
  resolveEventSuccessLateArrivalDraft,
  resolveEventSuccessLateArrivalHandler,
} from "./lateArrivals";
import {isHttpsError} from "../shared/testUtils";

type FakeData = Record<string, unknown>;
type FakeFilter = {field: string; value: unknown};

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}

  get id(): string {
    return this.path.split("/").at(-1) ?? "";
  }

  get(): Promise<FakeDocSnapshot> {
    return Promise.resolve(new FakeDocSnapshot(this.firestore, this.path));
  }
}

class FakeDocSnapshot {
  constructor(
    private readonly firestore: FakeFirestore,
    readonly path: string
  ) {}

  get id(): string {
    return this.path.split("/").at(-1) ?? "";
  }

  get exists(): boolean {
    return this.firestore.docs.has(this.path);
  }

  data(): FakeData | undefined {
    const value = this.firestore.docs.get(this.path);
    return value === undefined ? undefined : {...value};
  }
}

class FakeQuery {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string,
    private readonly filters: FakeFilter[] = []
  ) {}

  doc(id: string): FakeDocRef {
    return new FakeDocRef(this.firestore, `${this.path}/${id}`);
  }

  where(field: string, operator: string, value: unknown): FakeQuery {
    assert.equal(operator, "==");
    return new FakeQuery(this.firestore, this.path, [
      ...this.filters,
      {field, value},
    ]);
  }

  limit(count: number): FakeQuery {
    void count;
    return this;
  }

  get(): Promise<{docs: FakeDocSnapshot[]}> {
    const prefix = `${this.path}/`;
    const docs = [...this.firestore.docs.keys()]
      .filter((path) => path.startsWith(prefix))
      .filter((path) => !path.slice(prefix.length).includes("/"))
      .map((path) => new FakeDocSnapshot(this.firestore, path))
      .filter((snapshot) => this.filters.every((filter) =>
        snapshot.data()?.[filter.field] === filter.value
      ));
    return Promise.resolve({docs});
  }
}

class FakeTransaction {
  constructor(private readonly firestore: FakeFirestore) {}

  get(reference: {get: () => Promise<unknown>}): Promise<unknown> {
    return reference.get();
  }

  set(ref: FakeDocRef, data: FakeData): void {
    this.firestore.docs.set(ref.path, {...data});
  }

  update(ref: FakeDocRef, data: FakeData): void {
    const current = this.firestore.docs.get(ref.path) ?? {};
    this.firestore.docs.set(ref.path, {
      ...current,
      ...data,
    });
  }

  delete(ref: FakeDocRef): void {
    this.firestore.docs.delete(ref.path);
  }
}

class FakeFirestore {
  readonly docs = new Map<string, FakeData>();

  collection(path: string): FakeQuery {
    return new FakeQuery(this, path);
  }

  runTransaction<T>(
    callback: (transaction: FakeTransaction) => Promise<T>
  ): Promise<T> {
    return callback(new FakeTransaction(this));
  }
}

test("late placement rejects a published target round", () => {
  assert.throws(() => resolveEventSuccessLateArrivalDraft({
    eventId: "event-1",
    lateUid: "late-1",
    targetRoundIndex: 2,
    publishedRoundIndex: 2,
    drafts: [],
    likelyDepartedUids: new Set(),
    maxUnitSize: 2,
    concurrentUnits: null,
    now: {} as FirebaseFirestore.FieldValue,
  }), (error) => {
    isHttpsError(error, "failed-precondition", "cannot be changed");
    return true;
  });
});

test("late insertion patches only an unpublished draft", async () => {
  const firestore = new FakeFirestore();
  const timestamp = {toMillis: () => 1_000};
  const publishedAssignment = {
    eventId: "event-1",
    uid: "guest-1",
    publishedRoundIndex: 0,
    peerUids: ["published-peer"],
  };
  for (const [path, data] of Object.entries({
    "events/event-1": {
      organizerId: "club-1",
      status: "active",
    },
    "organizers/club-1": {
      hostUserId: "host-1",
      hostUserIds: [],
      hostProfiles: [],
    },
    "eventParticipations/event-1_late-1": {
      eventId: "event-1",
      organizerId: "club-1",
      uid: "late-1",
      status: "attended",
      attendedAt: timestamp,
    },
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      liveControlRevision: 7,
      assignmentDraftRevision: 4,
      publishedRotationRoundIndex: 0,
      structureConfig: {unitKind: "pairs", unitSize: 2},
    },
    "eventSuccessAssignments/event-1_guided_rotations_guest-1":
      publishedAssignment,
    "eventSuccessAssignmentDrafts/event-1_guided_rotations_guest-1": {
      eventId: "event-1",
      organizerId: "club-1",
      moduleId: "guided_rotations",
      uid: "guest-1",
      roundIndex: 1,
      baseAssignmentRevision: 4,
      assignmentFeatureGuard: {revision: 1, configHash: "hash-1",
        snapshots: [{uid: "guest-1", featureId: "feature-1"}]},
      assignment: {
        eventId: "event-1",
        organizerId: "club-1",
        moduleId: "guided_rotations",
        uid: "guest-1",
        peerUids: [],
        rotationSlots: [],
        groupRotationSlots: [],
        sitOutSlots: [{
          roundIndex: 1,
          label: "Round 2",
          startsAt: timestamp,
          endsAt: timestamp,
          whyCodes: ["sit_out"],
        }],
      },
    },
  })) firestore.docs.set(path, data);

  const serverTimestamp = {server: true};
  const result = await resolveEventSuccessLateArrivalHandler({
    auth: {uid: "host-1"},
    data: {
      eventId: "event-1",
      uid: "late-1",
      expectedRevision: 7,
      confirmed: true,
    },
  } as CallableRequest<unknown>, {
    firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
    serverTimestamp: () => serverTimestamp as unknown as
      FirebaseFirestore.FieldValue,
    nowMillis: () => 10_000,
  });

  assert.equal(result.status, "insertedIntoOpenPair");
  assert.equal(result.targetRoundIndex, 1);
  assert.deepEqual(
    firestore.docs.get(
      "eventSuccessAssignments/event-1_guided_rotations_guest-1"
    ),
    publishedAssignment,
    "published assignment must remain byte-for-byte stable"
  );
  assert.ok(firestore.docs.has(
    "eventSuccessAssignmentDrafts/event-1_guided_rotations_late-1"
  ));
  assert.deepEqual(firestore.docs.get(
    "eventSuccessAssignmentDrafts/event-1_guided_rotations_late-1"
  )?.assignmentFeatureGuard, {revision: 1, configHash: "hash-1",
    snapshots: []});
  assert.equal(
    firestore.docs.get("eventSuccessLateArrivals/event-1_late-1")?.status,
    "insertedIntoOpenPair"
  );
});

test("a full unpublished unit holds the attendee with a stated reason", () => {
  const result = resolveEventSuccessLateArrivalDraft({
    eventId: "event-1",
    lateUid: "late-1",
    targetRoundIndex: 3,
    publishedRoundIndex: 2,
    drafts: [],
    likelyDepartedUids: new Set(),
    maxUnitSize: 2,
    concurrentUnits: 0,
    now: {} as FirebaseFirestore.FieldValue,
  });

  assert.equal(result.status, "heldForNextRound");
  assert.match(result.reason, /join the next round/i);
  assert.equal(result.changed, false);
});
