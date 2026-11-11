import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {decideEventJoinRequestHandler} from "./decideEventJoinRequest";
import type {FcmParams} from "../shared/notifications";

type FakeData = Record<string, unknown>;

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}

  collection(collectionPath: string) {
    return new FakeCollectionRef(
      this.firestore,
      `${this.path}/${collectionPath}`
    );
  }
}

class FakeSnapshot {
  constructor(
    private readonly firestore: FakeFirestore,
    readonly path: string
  ) {}

  get ref(): FakeDocRef {
    return new FakeDocRef(this.firestore, this.path);
  }

  get exists(): boolean {
    return this.firestore.get(this.path) !== undefined;
  }

  data(): FakeData | undefined {
    const value = this.firestore.get(this.path);
    return value === undefined ? undefined : {...value};
  }
}

class FakeCollectionRef {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string,
    private readonly filters: Array<{
      field: string;
      operator: string;
      value: unknown;
    }> = []
  ) {}

  doc(docId: string) {
    return new FakeDocRef(this.firestore, `${this.path}/${docId}`);
  }

  where(field: string, operator: string, value: unknown) {
    return new FakeCollectionRef(
      this.firestore,
      this.path,
      [...this.filters, {field, operator, value}]
    );
  }

  limit(count: number) {
    void count;
    return this;
  }

  async get() {
    return {
      docs: this.firestore.query(this.path, this.filters),
    };
  }
}

class FakeFirestore {
  constructor(private readonly docs: Record<string, FakeData | undefined>) {}

  collection(collectionPath: string) {
    return new FakeCollectionRef(this, collectionPath);
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
    const value = this.docs[path];
    return value === undefined ? undefined : {...value};
  }

  merge(path: string, patch: FakeData): void {
    this.docs[path] = {...(this.docs[path] ?? {}), ...patch};
  }

  set(path: string, data: FakeData | undefined): void {
    this.docs[path] = data;
  }

  query(
    collectionPath: string,
    filters: Array<{field: string; operator: string; value: unknown}>
  ): FakeSnapshot[] {
    const prefix = `${collectionPath}/`;
    return Object.entries(this.docs)
      .filter(([path, value]) =>
        path.startsWith(prefix) &&
        value !== undefined &&
        !path.slice(prefix.length).includes("/")
      )
      .map(([path]) => new FakeSnapshot(this, path))
      .filter((snap) => {
        const data = snap.data() ?? {};
        return filters.every((filter) => {
          if (filter.operator === "==") {
            return data[filter.field] === filter.value;
          }
          if (filter.operator === "in" && Array.isArray(filter.value)) {
            return filter.value.includes(data[filter.field]);
          }
          throw new Error(`Unsupported fake query operator ${filter.operator}`);
        });
      });
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];

  constructor(private readonly firestore: FakeFirestore) {}

  async get(
    ref: FakeDocRef | FakeCollectionRef
  ): Promise<FakeSnapshot | {docs: FakeSnapshot[]}> {
    if (ref instanceof FakeCollectionRef) return ref.get();
    return new FakeSnapshot(this.firestore, ref.path);
  }

  update(ref: FakeDocRef, patch: FakeData): void {
    this.writes.push(() => this.firestore.merge(ref.path, patch));
  }

  set(ref: FakeDocRef, data: FakeData, _options?: {merge: boolean}): void {
    void _options;
    this.writes.push(() => this.firestore.merge(ref.path, data));
  }

  delete(ref: FakeDocRef): void {
    this.writes.push(() => this.firestore.set(ref.path, undefined));
  }

  commit(): void {
    for (const write of this.writes) write();
  }
}

test(
  "decideEventJoinRequestHandler approves paid requests without booking",
  async () => {
    const h = harness({
      "events/event-1": event({priceInPaise: 25000, waitlistedCount: 1}),
      "eventParticipations/event-1_runner-2": participation("runner-2"),
    });

    const result = await decideEventJoinRequestHandler(
      request({eventId: "event-1", userId: "runner-2", decision: "approve"}),
      h.deps
    );

    assert.deepEqual(result, {decision: "approved", booked: false});
    assert.deepEqual(h.signUpCalls, []);
    assert.equal(
      h.firestore.get("eventParticipations/event-1_runner-2")
        ?.hostApprovalStatus,
      "approved"
    );
    assert.equal(
      h.firestore.get(
        "notifications/runner-2/items/" +
          "eventUpdated_approvedRequest_event-1_runner-2"
      )?.type,
      "eventUpdated"
    );
  }
);

test("decideEventJoinRequestHandler books approved free requests", async () => {
  const h = harness({
    "events/event-1": event({priceInPaise: 0, waitlistedCount: 1}),
    "eventParticipations/event-1_runner-2": participation("runner-2"),
  });

  const result = await decideEventJoinRequestHandler(
    request({eventId: "event-1", userId: "runner-2", decision: "approve"}),
    h.deps
  );

  assert.deepEqual(result, {decision: "approved", booked: true});
  assert.deepEqual(h.signUpCalls, [{
    eventId: "event-1",
    userId: "runner-2",
    options: {hasHostApproval: true},
  }]);
});

test("decideEventJoinRequestHandler declines active requests", async () => {
  const h = harness({
    "events/event-1": event({
      waitlistedCount: 1,
      waitlistedCohortCounts: {menInterestedInWomen: 1},
    }),
    "eventParticipations/event-1_runner-2": participation("runner-2"),
    "scheduleLocks/user_runner-2_494184": {
      uid: "runner-2",
      eventId: "event-1",
    },
  });

  const result = await decideEventJoinRequestHandler(
    request({eventId: "event-1", userId: "runner-2", decision: "decline"}),
    h.deps
  );

  assert.deepEqual(result, {decision: "declined", booked: false});
  assert.equal(h.firestore.get("events/event-1")?.waitlistedCount, 0);
  assert.deepEqual(
    h.firestore.get("events/event-1")?.waitlistedCohortCounts,
    {menInterestedInWomen: 0}
  );
  assert.equal(
    h.firestore.get("eventParticipations/event-1_runner-2")?.status,
    "cancelled"
  );
  assert.equal(
    h.firestore.get("eventParticipations/event-1_runner-2")
      ?.hostApprovalStatus,
    "declined"
  );
});

test("decideEventJoinRequestHandler rejects non-hosts", async () => {
  const h = harness({
    "eventParticipations/event-1_runner-2": participation("runner-2"),
  });

  await assert.rejects(
    () => decideEventJoinRequestHandler(
      request({
        eventId: "event-1",
        userId: "runner-2",
        decision: "approve",
      }, "runner-1"),
      h.deps
    ),
    (error: unknown) =>
      error instanceof HttpsError && error.code === "permission-denied"
  );
});

function harness(overrides: Record<string, FakeData | undefined> = {}) {
  const firestore = new FakeFirestore({
    "events/event-1": event(),
    "organizers/club-1": {
      hostUserId: "host-1",
      hostUserIds: ["host-1"],
      hostProfiles: [],
    },
    "users/runner-2": {
      gender: "man",
      interestedInGenders: ["woman"],
      prefsRunStatusUpdates: true,
    },
    ...overrides,
  });
  const signUpCalls: Array<{
    eventId: string;
    userId: string;
    options?: {hasHostApproval?: boolean};
  }> = [];
  const notifications: FcmParams[] = [];
  return {
    firestore,
    signUpCalls,
    notifications,
    deps: {
      firestore: () =>
        firestore as unknown as FirebaseFirestore.Firestore,
      checkRateLimit: async () => undefined,
      serverTimestamp: () =>
        ({__op: "serverTimestamp"} as unknown as
          FirebaseFirestore.FieldValue),
      signUpForEvent: async (
        _db: FirebaseFirestore.Firestore,
        eventId: string,
        userId: string,
        _paymentId?: string,
        options?: {hasHostApproval?: boolean}
      ) => {
        signUpCalls.push({eventId, userId, options});
      },
      sendNotification: async (push: FcmParams) => {
        notifications.push(push);
      },
    },
  };
}

function request(
  data: FakeData,
  uid = "host-1"
): CallableRequest<unknown> {
  return {
    auth: {uid, token: {}} as CallableRequest["auth"],
    data,
  } as CallableRequest<unknown>;
}

function event(overrides: FakeData = {}): FakeData {
  return {
    organizerId: "club-1",
    status: "active",
    startTime: timestamp("2026-05-02T06:00:00.000Z"),
    endTime: timestamp("2026-05-02T07:00:00.000Z"),
    meetingPoint: "Carter Road",
    distanceKm: 5,
    capacityLimit: 12,
    priceInPaise: 0,
    currency: "INR",
    bookedCount: 0,
    waitlistedCount: 1,
    genderCounts: {},
    cohortCounts: {},
    waitlistedCohortCounts: {menInterestedInWomen: 1},
    constraints: {minAge: 0, maxAge: 99},
    eventPolicy: manualApprovalPolicy(overrides.priceInPaise as number ?? 0),
    ...overrides,
  };
}

function participation(uid: string): FakeData {
  return {
    eventId: "event-1",
    organizerId: "club-1",
    uid,
    status: "waitlisted",
    cohortAtSignup: "menInterestedInWomen",
    hostApprovalStatus: "pending",
  };
}

function manualApprovalPolicy(basePriceInPaise: number): FakeData {
  return {
    version: 1,
    admission: {
      format: "manualApproval",
      capacityLimit: 12,
      waitlistPolicy: {mode: "rankedOffer", offerWindowMinutes: 20},
      inviteRequired: false,
      membershipRequired: false,
      manualApprovalRequired: true,
      privateAccessPolicy: {
        mode: "none",
        inviteCodeHint: null,
        privateLinkEnabled: false,
      },
      cohortCapacityLimits: {},
      balancedRatioPolicy: null,
    },
    pricing: {
      basePriceInPaise,
      cohortAdjustmentsInPaise: {},
      demandPricingRules: [],
    },
    cancellation: {policyId: "standard"},
    settlement: {hostPayoutTiming: "afterEventCompletion"},
  };
}

function timestamp(isoString: string): FirebaseFirestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(new Date(isoString));
}
