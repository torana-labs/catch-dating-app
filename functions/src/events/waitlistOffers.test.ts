import {communityMembershipRows} from
  "../memberships/communityMembershipFixture";
import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {
  acceptEventWaitlistOfferHandler,
  createEventWaitlistOffersHandler,
  declineEventWaitlistOfferHandler,
  expireEventWaitlistOffersHandler,
} from "./waitlistOffers";
import type {FcmParams} from "../shared/notifications";

type FakeData = Record<string, unknown>;

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}

  get id(): string {
    return this.path.split("/").at(-1) ?? "";
  }

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

  get id(): string {
    return this.path.split("/").at(-1) ?? "";
  }

  get ref(): FakeDocRef {
    return new FakeDocRef(this.firestore, this.path);
  }

  get exists(): boolean {
    return this.firestore.get(this.path) !== undefined;
  }

  data(): FakeData | undefined {
    return this.firestore.get(this.path);
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
    }> = [],
    private readonly limitCount?: number
  ) {}

  doc(docId?: string) {
    return new FakeDocRef(
      this.firestore,
      `${this.path}/${docId ?? this.firestore.nextId("doc")}`
    );
  }

  where(field: string, operator: string, value: unknown) {
    return new FakeCollectionRef(
      this.firestore,
      this.path,
      [...this.filters, {field, operator, value}],
      this.limitCount
    );
  }

  limit(count: number) {
    return new FakeCollectionRef(
      this.firestore,
      this.path,
      this.filters,
      count
    );
  }

  async get() {
    const docs = this.firestore.query(this.path, this.filters);
    const limited = this.limitCount === undefined ?
      docs :
      docs.slice(0, this.limitCount);
    return {docs: limited, empty: limited.length === 0};
  }
}

class FakeFirestore {
  private sequence = 0;

  constructor(readonly data: Record<string, FakeData | undefined>) {}

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

  nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}_${this.sequence}`;
  }

  get(path: string): FakeData | undefined {
    const value = this.data[path];
    return value === undefined ? undefined : {...value};
  }

  set(path: string, value: FakeData | undefined): void {
    this.data[path] = value === undefined ? undefined : {...value};
  }

  merge(path: string, patch: FakeData): void {
    this.data[path] = {...(this.data[path] ?? {}), ...patch};
  }

  query(
    collectionPath: string,
    filters: Array<{field: string; operator: string; value: unknown}>
  ): FakeSnapshot[] {
    const prefix = `${collectionPath}/`;
    return Object.entries(this.data)
      .filter(([path, value]) =>
        path.startsWith(prefix) &&
        value !== undefined &&
        !path.slice(prefix.length).includes("/")
      )
      .map(([path]) => new FakeSnapshot(this, path))
      .filter((snap) => {
        const data = snap.data() ?? {};
        return filters.every((filter) =>
          matchesFilter(data[filter.field], filter.operator, filter.value)
        );
      });
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];

  constructor(private readonly firestore: FakeFirestore) {}

  async get(
    ref: FakeDocRef | FakeCollectionRef
  ): Promise<FakeSnapshot | {docs: FakeSnapshot[]; empty: boolean}> {
    assert.equal(this.writes.length, 0,
      "no transaction read after first write");
    if (ref instanceof FakeCollectionRef) return ref.get();
    return new FakeSnapshot(this.firestore, ref.path);
  }

  set(ref: FakeDocRef, data: FakeData, options?: {merge: boolean}): void {
    this.writes.push(() => {
      if (options?.merge === true) {
        this.firestore.merge(ref.path, data);
      } else {
        this.firestore.set(ref.path, data);
      }
    });
  }

  update(ref: FakeDocRef, patch: FakeData): void {
    this.writes.push(() => this.firestore.merge(ref.path, patch));
  }

  commit(): void {
    for (const write of this.writes) write();
  }
}

test("createEventWaitlistOffersHandler creates balanced capacity offers",
  async () => {
    const h = harness({
      "events/event-1": event({capacityLimit: 2, bookedCount: 1}),
      "organizers/organizer-1": {
        hostUserId: "host-1",
        hostUserIds: ["host-1"],
        ownerUserId: "host-1",
        hostProfiles: [],
      },
      "users/runner-1": user(),
      "users/runner-2": user({
        gender: "woman",
        interestedInGenders: ["man"],
        fcmToken: "token-2",
      }),
      "users/runner-3": user({
        gender: "woman",
        interestedInGenders: ["man"],
      }),
      "eventParticipations/event-1_runner-1":
        participation("runner-1", "signedUp"),
      "eventParticipations/event-1_runner-2":
        participation("runner-2", "waitlisted", "womenInterestedInMen"),
      "eventParticipations/event-1_runner-3":
        participation("runner-3", "waitlisted", "womenInterestedInMen"),
    });

    const result = await createEventWaitlistOffersHandler(
      request({
        eventId: " event-1 ",
        userIds: [" runner-2 ", "runner-3"],
        expiresInMinutes: 60,
      }),
      h.deps
    );

    assert.equal(result.createdCount, 1);
    assert.equal(result.skippedCount, 1);
    assert.deepEqual(result.offers.map((row) => row.status), [
      "created",
      "skipped",
    ]);
    assert.equal(
      h.firestore.get("eventWaitlistOffers/event-1_runner-2")?.status,
      "active"
    );
    assert.equal(
      h.firestore.get("eventParticipations/event-1_runner-2")
        ?.waitlistOfferStatus,
      "active"
    );
    assert.equal(
      h.firestore.get(
        "notifications/runner-2/items/waitlistOffer_event-1_runner-2"
      )?.type,
      "waitlistOffer"
    );
    assert.deepEqual(h.pushes.map((push) => push.token), ["token-2"]);
  });

test("acceptEventWaitlistOfferHandler books free offers", async () => {
  const h = harness({
    "events/event-1": event({priceInPaise: 0, capacityLimit: 2}),
    "users/runner-2": user({gender: "woman", interestedInGenders: ["man"]}),
    "eventParticipations/event-1_runner-2":
      participation("runner-2", "waitlisted", "womenInterestedInMen"),
    "eventWaitlistOffers/event-1_runner-2": offer({
      uid: "runner-2",
      status: "active",
      cohortAtOffer: "womenInterestedInMen",
    }),
  });

  const result = await acceptEventWaitlistOfferHandler(
    request({eventId: "event-1"}, "runner-2"),
    h.deps
  );

  assert.deepEqual(result, {
    accepted: true,
    requiresPayment: false,
    booked: true,
  });
  assert.equal(
    h.firestore.get("eventWaitlistOffers/event-1_runner-2")?.status,
    "accepted"
  );
  assert.deepEqual(h.signUps, [{
    eventId: "event-1",
    uid: "runner-2",
    options: {hasValidInvite: true, hasHostApproval: true},
  }]);
});

test("acceptEventWaitlistOfferHandler unlocks paid checkout", async () => {
  const h = harness({
    "events/event-1": event({priceInPaise: 25000, capacityLimit: 2}),
    "users/runner-2": user({gender: "woman", interestedInGenders: ["man"]}),
    "eventParticipations/event-1_runner-2":
      participation("runner-2", "waitlisted", "womenInterestedInMen"),
    "eventWaitlistOffers/event-1_runner-2": offer({
      uid: "runner-2",
      status: "active",
      cohortAtOffer: "womenInterestedInMen",
    }),
  });

  const result = await acceptEventWaitlistOfferHandler(
    request({eventId: "event-1"}, "runner-2"),
    h.deps
  );

  assert.deepEqual(result, {
    accepted: true,
    requiresPayment: true,
    booked: false,
  });
  assert.equal(h.signUps.length, 0);
  assert.equal(
    h.firestore.get("eventParticipations/event-1_runner-2")
      ?.waitlistOfferStatus,
    "accepted"
  );
});

test("declineEventWaitlistOfferHandler releases an open offer", async () => {
  const h = harness({
    "eventParticipations/event-1_runner-2":
      participation("runner-2", "waitlisted"),
    "eventWaitlistOffers/event-1_runner-2": offer({
      uid: "runner-2",
      status: "accepted",
    }),
  });

  const result = await declineEventWaitlistOfferHandler(
    request({eventId: "event-1"}, "runner-2"),
    h.deps
  );

  assert.deepEqual(result, {declined: true});
  assert.equal(
    h.firestore.get("eventWaitlistOffers/event-1_runner-2")?.status,
    "declined"
  );
  assert.equal(
    h.firestore.get("eventParticipations/event-1_runner-2")
      ?.waitlistOfferStatus,
    "declined"
  );
});

test("expireEventWaitlistOffersHandler expires stale offers", async () => {
  const h = harness({
    "events/event-1": event(),
    "users/runner-2": user({fcmToken: "token-2"}),
    "eventParticipations/event-1_runner-2":
      participation("runner-2", "waitlisted"),
    "eventWaitlistOffers/event-1_runner-2": offer({
      uid: "runner-2",
      status: "active",
      expiresAt: timestamp(-1),
    }),
  });

  const result = await expireEventWaitlistOffersHandler(h.deps);

  assert.deepEqual(result, {expiredCount: 1, expiringNotifiedCount: 0});
  assert.equal(
    h.firestore.get("eventWaitlistOffers/event-1_runner-2")?.status,
    "expired"
  );
  assert.equal(
    h.firestore.get(
      "notifications/runner-2/items/waitlistOfferExpired_event-1_runner-2"
    )?.type,
    "waitlistOfferExpired"
  );
});

function harness(initialDocs: Record<string, FakeData | undefined> = {}) {
  const firestore = new FakeFirestore({
    "events/event-1": event(),
    "clubs/club-1": {hostUserId: "host-1"},
    "users/host-1": user(),
    ...initialDocs,
  });
  const signUps: Array<{
    eventId: string;
    uid: string;
    options?: {hasValidInvite?: boolean; hasHostApproval?: boolean};
  }> = [];
  const pushes: FcmParams[] = [];
  return {
    firestore,
    signUps,
    pushes,
    deps: {
      firestore: () =>
        firestore as unknown as FirebaseFirestore.Firestore,
      checkRateLimit: async () => undefined,
      nowMillis: () => 0,
      timestampFromMillis: timestamp,
      signUpForEvent: async (
        _db: FirebaseFirestore.Firestore,
        eventId: string,
        uid: string,
        _paymentId?: string,
        options?: {hasValidInvite?: boolean; hasHostApproval?: boolean}
      ) => {
        signUps.push({eventId, uid, options});
      },
      sendNotification: async (push: FcmParams) => {
        pushes.push(push);
      },
    },
  };
}

function request(data: FakeData, uid = "host-1"): CallableRequest<unknown> {
  return {
    auth: {uid, token: {}} as CallableRequest["auth"],
    data,
    rawRequest: {} as CallableRequest["rawRequest"],
    acceptsStreaming: false,
  } as CallableRequest<unknown>;
}

function event(overrides: FakeData = {}): FakeData {
  return {
    organizerId: "organizer-1",
    status: "active",
    startTime: timestamp(60 * 60 * 1000),
    endTime: timestamp(2 * 60 * 60 * 1000),
    meetingPoint: "Park",
    distanceKm: 5,
    capacityLimit: 10,
    bookedCount: 0,
    checkedInCount: 0,
    waitlistedCount: 1,
    priceInPaise: 0,
    currency: "INR",
    constraints: {minAge: 0, maxAge: 99},
    genderCounts: {},
    cohortCounts: {},
    waitlistedCohortCounts: {},
    ...overrides,
  };
}

function user(overrides: FakeData = {}): FakeData {
  return {
    gender: "man",
    interestedInGenders: ["woman"],
    dateOfBirth: timestamp(-30 * 365 * 24 * 60 * 60 * 1000),
    prefsRunStatusUpdates: true,
    ...overrides,
  };
}

function participation(
  uid: string,
  status: string,
  cohortAtSignup = "menInterestedInWomen"
): FakeData {
  return {
    eventId: "event-1",
    organizerId: "club-1",
    uid,
    status,
    cohortAtSignup,
    waitlistedAt: timestamp(-1000),
  };
}

function offer(overrides: FakeData = {}): FakeData {
  return {
    eventId: "event-1",
    organizerId: "club-1",
    uid: "runner-2",
    cohortAtOffer: "menInterestedInWomen",
    status: "active",
    source: "host",
    offeredBy: "host-1",
    offeredAt: timestamp(-1000),
    expiresAt: timestamp(60 * 60 * 1000),
    decidedAt: null,
    expiringNotifiedAt: null,
    createdAt: timestamp(-1000),
    updatedAt: timestamp(-1000),
    ...overrides,
  };
}

function timestamp(millis: number): FirebaseFirestore.Timestamp {
  return {toMillis: () => millis} as FirebaseFirestore.Timestamp;
}

function matchesFilter(
  actual: unknown,
  operator: string,
  expected: unknown
): boolean {
  if (operator === "==") return actual === expected;
  if (operator === "in" && Array.isArray(expected)) {
    return expected.includes(actual);
  }
  const actualValue = sortableValue(actual);
  const expectedValue = sortableValue(expected);
  if (operator === "<=") return actualValue <= expectedValue;
  if (operator === ">") return actualValue > expectedValue;
  throw new Error(`Unsupported fake query operator ${operator}`);
}

function sortableValue(value: unknown): number {
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as {toMillis?: unknown}).toMillis === "function"
  ) {
    return (value as {toMillis: () => number}).toMillis();
  }
  if (typeof value === "number") return value;
  return Number.NEGATIVE_INFINITY;
}

export function isHttpsError(expectedCode: string, expectedMessage: string) {
  return (error: unknown) =>
    error instanceof HttpsError &&
    error.code === expectedCode &&
    error.message === expectedMessage;
}


test("offer issue reads every candidate before writing", async () => {
  const h = harness({
    "events/event-1": event({
      eventPolicy: {
        version: 2,
        admission: {
          format: "membersOnly",
          membershipRequired: true,
          capacityLimit: 10,
        },
      },
    }),
    "organizers/organizer-1": {
      ownerUserId: "host-1",
      hostUserId: "host-1",
      hostUserIds: ["host-1"],
      hostProfiles: [],
    },
    "users/booked": user(),
    "users/runner-2": user(),
    "users/runner-3": user(),
    "eventParticipations/event-1_booked": participation("booked", "signedUp"),
    "eventParticipations/event-1_runner-2": participation(
      "runner-2",
      "waitlisted"
    ),
    "eventParticipations/event-1_runner-3": participation(
      "runner-3",
      "waitlisted"
    ),
    ...communityMembershipRows("organizer-1", "runner-2"),
    ...communityMembershipRows("organizer-1", "runner-3"),
  });
  h.deps.nowMillis = () => 2000;
  const result = await createEventWaitlistOffersHandler(
    request({eventId: "event-1", userIds: ["runner-2", "runner-3"]}),
    h.deps
  );
  assert.equal(result.createdCount, 2);
});

test("revoked members cannot accept paid or free waitlist offers", async () => {
  for (const basePriceInPaise of [0, 25000]) {
    const h = harness({
      "events/event-1": event({
        eventPolicy: {
          version: 2,
          admission: {
            format: "membersOnly",
            membershipRequired: true,
            capacityLimit: 10,
          },
          pricing: {basePriceInPaise},
        },
      }),
      "users/runner-2": user(),
      "eventParticipations/event-1_runner-2": participation(
        "runner-2",
        "waitlisted"
      ),
      "eventWaitlistOffers/event-1_runner-2": offer({
        expiresAt: timestamp(60000),
      }),
      ...communityMembershipRows("organizer-1", "runner-2", "revoked"),
    });
    h.deps.nowMillis = () => 2000;
    await assert.rejects(
      acceptEventWaitlistOfferHandler(
        request({eventId: "event-1"}, "runner-2"),
        h.deps
      ),
      /Approved community membership/
    );
    assert.equal(h.signUps.length, 0);
    assert.equal(
      h.firestore.get("eventWaitlistOffers/event-1_runner-2")?.status,
      "active"
    );
  }
});
