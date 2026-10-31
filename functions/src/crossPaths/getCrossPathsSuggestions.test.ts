import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {
  getCrossPathsSuggestionsHandler,
} from "./getCrossPathsSuggestions";
import {crossPathsProfileFingerprint} from "./showcaseEligibility";

type FakeData = Record<string, unknown>;

class FakeTimestamp {
  constructor(readonly millis: number) {}
  toMillis(): number {
    return this.millis;
  }
  toDate(): Date {
    return new Date(this.millis);
  }
}

class FakeSnapshot {
  constructor(
    readonly id: string,
    private readonly value: FakeData | undefined
  ) {}
  get exists(): boolean {
    return this.value !== undefined;
  }
  data(): FakeData | undefined {
    return this.value === undefined ? undefined : {...this.value};
  }
}

class FakeDocRef {
  constructor(
    private readonly firestore: FakeFirestore,
    readonly path: string
  ) {}
  get id(): string {
    return this.path.split("/").at(-1)!;
  }
  async get() {
    return new FakeSnapshot(this.id, this.firestore.read(this.path));
  }
}

type Filter = {field: string; op: string; value: unknown};

class FakeQuery {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly collectionPath: string,
    private readonly filters: Filter[] = [],
    private readonly rowLimit = Number.MAX_SAFE_INTEGER
  ) {}
  where(field: string, op: string, value: unknown) {
    return new FakeQuery(this.firestore, this.collectionPath, [
      ...this.filters,
      {field, op, value},
    ], this.rowLimit);
  }
  limit(value: number) {
    return new FakeQuery(
      this.firestore,
      this.collectionPath,
      this.filters,
      value
    );
  }
  async get() {
    const docs = this.firestore.collectionRows(this.collectionPath)
      .filter(({value}) => this.filters.every((filter) =>
        matches(value[filter.field], filter.op, filter.value)
      ))
      .slice(0, this.rowLimit)
      .map(({id, value}) => new FakeSnapshot(id, value));
    return {docs, empty: docs.length === 0};
  }
}

class FakeCollection extends FakeQuery {
  constructor(
    private readonly firestoreRef: FakeFirestore,
    readonly path: string
  ) {
    super(firestoreRef, path);
  }
  doc(id: string) {
    return new FakeDocRef(this.firestoreRef, `${this.path}/${id}`);
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];
  constructor(private readonly firestore: FakeFirestore) {}
  async get(ref: FakeDocRef) {
    if (this.writes.length > 0) {
      throw new Error(
        "Firestore transactions require all reads before all writes"
      );
    }
    return ref.get();
  }
  create(ref: FakeDocRef, value: FakeData) {
    this.writes.push(() => {
      if (this.firestore.read(ref.path) !== undefined) {
        throw new Error("already exists");
      }
      this.firestore.write(ref.path, value);
    });
  }
  commit() {
    for (const write of this.writes) write();
  }
}

class FakeFirestore {
  constructor(private readonly docs: Record<string, FakeData | undefined>) {}
  collection(path: string) {
    return new FakeCollection(this, path);
  }
  async runTransaction<T>(callback: (tx: FakeTransaction) => Promise<T>) {
    const tx = new FakeTransaction(this);
    const result = await callback(tx);
    tx.commit();
    return result;
  }
  read(path: string): FakeData | undefined {
    const value = this.docs[path];
    return value === undefined ? undefined : {...value};
  }
  write(path: string, value: FakeData) {
    this.docs[path] = {...value};
  }
  collectionRows(path: string): Array<{id: string; value: FakeData}> {
    const prefix = `${path}/`;
    return Object.entries(this.docs).flatMap(([key, value]) => {
      if (!key.startsWith(prefix) || value === undefined) return [];
      const suffix = key.slice(prefix.length);
      if (suffix.includes("/")) return [];
      return [{id: suffix, value}];
    });
  }
}

function matches(actual: unknown, op: string, expected: unknown): boolean {
  if (op === "==") return actual === expected;
  if (op === "in") return Array.isArray(expected) && expected.includes(actual);
  if (op === "array-contains") {
    return Array.isArray(actual) && actual.includes(expected);
  }
  throw new Error(`Unsupported fake query operator: ${op}`);
}

const nowMillis = Date.UTC(2026, 7, 5, 12);
const eventStartMillis = nowMillis + 24 * 60 * 60 * 1000;

function harness(overrides: Record<string, FakeData | undefined> = {}) {
  const docs: Record<string, FakeData | undefined> = {
    "users/viewer": user({gender: "man", interestedInGenders: ["woman"]}),
    "events/event-1": event(),
    "eventParticipations/event-1_candidate-a": participation("candidate-a"),
    "eventParticipations/event-1_candidate-b": participation("candidate-b"),
    "eventParticipations/event-1_candidate-c": participation("candidate-c"),
  };
  for (const uid of ["candidate-a", "candidate-b", "candidate-c"]) {
    const publicProfile = profile(uid);
    docs[`users/${uid}`] = user({
      gender: "woman",
      interestedInGenders: ["man"],
      prefsShowInCrossPaths: true,
    });
    docs[`publicProfiles/${uid}`] = publicProfile;
    docs[`crossPathsShowcaseEligibility/${uid}`] = showcase(publicProfile);
    docs[`eventCrossPathsConsents/event-1_${uid}`] = {
      eventId: "event-1",
      uid,
      enabled: true,
      termsVersion: 1,
    };
  }
  Object.assign(docs, overrides);
  const firestore = new FakeFirestore(docs);
  const rateLimitCalls: string[] = [];
  return {
    firestore,
    rateLimitCalls,
    deps: {
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      now: () => timestamp(nowMillis),
      signToken: (payload: unknown) =>
        `test.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`,
      checkRateLimit: async (
        _db: FirebaseFirestore.Firestore,
        uid: string,
        action: string
      ) => {
        rateLimitCalls.push(`${uid}:${action}`);
      },
    },
  };
}

test("returns at most two sanitized, deterministic suggestions", async () => {
  const h = harness();
  const response = await getCrossPathsSuggestionsHandler(
    request("viewer", {
      eventIds: [" event-1 "],
      sessionId: "explore-session-0001",
    }),
    h.deps
  );

  assert.equal(response.suggestions.length, 2);
  assert.equal(response.rankingVersion, 1);
  assert.deepEqual(h.rateLimitCalls, ["viewer:getCrossPathsSuggestions"]);
  const suggestion = response.suggestions[0];
  assert.deepEqual(Object.keys(suggestion.person).sort(), [
    "age",
    "city",
    "gender",
    "name",
    "photoUrls",
    "promptAnswers",
    "relationshipGoal",
    "uid",
  ]);
  assert.equal(suggestion.event.viewerBookingStatus, "canBookNow");
  assert.ok(suggestion.reasonCodes.includes("booking_available"));
  assert.equal("roster" in suggestion, false);
  assert.equal("interestedInGenders" in suggestion.person, false);
  assert.equal(
    h.firestore.collectionRows("crossPathsSuggestionExposures").length,
    2
  );

  const repeated = await getCrossPathsSuggestionsHandler(
    request("viewer", {
      eventIds: ["event-1"],
      sessionId: "explore-session-0001",
    }),
    h.deps
  );
  assert.deepEqual(
    repeated.suggestions.map((row) => row.person.uid),
    response.suggestions.map((row) => row.person.uid)
  );
  assert.equal(
    h.firestore.collectionRows("crossPathsSuggestionExposures").length,
    2
  );
});

test("private events never enter public Cross Paths suggestions", async () => {
  const h = harness({"events/event-1": event({
    publicationState: "private",
    setupRevision: 1,
  })});
  const response = await getCrossPathsSuggestionsHandler(
    request("viewer", {eventIds: ["event-1"],
      sessionId: "explore-session-0001"}), h.deps
  );
  assert.deepEqual(response.suggestions, []);
  assert.equal(h.firestore.collectionRows(
    "crossPathsSuggestionExposures").length, 0);
});

test(
  "returns no suggestions for unselected or non-Mumbai real events",
  async () => {
    for (const eventOverride of [
      {crossPathsDiscoveryEnabled: false},
      {discoveryMarketId: "in-dl-delhi-ncr"},
    ]) {
      const h = harness({"events/event-1": event(eventOverride)});
      const response = await getCrossPathsSuggestionsHandler(
        request("viewer", {
          eventIds: ["event-1"],
          sessionId: "explore-session-gated",
        }),
        h.deps
      );
      assert.deepEqual(response.suggestions, []);
    }
  }
);

test("fails closed across consent, review, safety, and match boundaries",
  async () => {
    const publicB = profile("candidate-b");
    const h = harness({
      "eventCrossPathsConsents/event-1_candidate-a": {
        eventId: "event-1",
        uid: "candidate-a",
        enabled: false,
        termsVersion: 1,
      },
      "crossPathsShowcaseEligibility/candidate-b": {
        ...showcase(publicB),
        status: "paused",
      },
      "blocks/viewer_candidate-c": {
        blockerUserId: "viewer",
        blockedUserId: "candidate-c",
      },
    });
    const response = await getCrossPathsSuggestionsHandler(
      request("viewer", {
        eventIds: ["event-1"],
        sessionId: "explore-session-0002",
      }),
      h.deps
    );
    assert.deepEqual(response.suggestions, []);
  });

test("requires a current booking or immediately bookable event", async () => {
  const full = harness({
    "events/event-1": event({
      bookedCount: 20,
      discoveryAvailability: "full",
    }),
  });
  assert.deepEqual((await getCrossPathsSuggestionsHandler(
    request("viewer", {
      eventIds: ["event-1"],
      sessionId: "explore-session-0003",
    }),
    full.deps
  )).suggestions, []);

  const booked = harness({
    "events/event-1": event({
      bookedCount: 20,
      discoveryAvailability: "full",
    }),
    "eventParticipations/event-1_viewer": participation("viewer"),
  });
  const response = await getCrossPathsSuggestionsHandler(
    request("viewer", {
      eventIds: ["event-1"],
      sessionId: "explore-session-0004",
    }),
    booked.deps
  );
  assert.equal(response.suggestions.length, 2);
  assert.equal(response.suggestions[0].event.viewerBookingStatus, "signedUp");
  assert.ok(response.suggestions[0].reasonCodes.includes("viewer_attending"));
});

test("contains synthetic suggestions to synthetic viewers and events",
  async () => {
    const syntheticPublic = profile("candidate-a", {
      synthetic: true,
      seedPrefix: "candidate-world",
    });
    const realViewer = harness({
      "users/candidate-a": {
        ...user({
          gender: "woman",
          interestedInGenders: ["man"],
          prefsShowInCrossPaths: true,
        }),
        synthetic: true,
        seedPrefix: "candidate-world",
      },
      "publicProfiles/candidate-a": syntheticPublic,
      "crossPathsShowcaseEligibility/candidate-a": showcase(syntheticPublic),
      "eventParticipations/event-1_candidate-b": undefined,
      "eventParticipations/event-1_candidate-c": undefined,
    });
    assert.deepEqual((await getCrossPathsSuggestionsHandler(
      request("viewer", {
        eventIds: ["event-1"],
        sessionId: "explore-session-0005",
      }),
      realViewer.deps
    )).suggestions, []);
  });

test("contains synthetic suggestions within one exact seed world", async () => {
  const seedPrefix = "cross_paths_mumbai_qa";
  const syntheticPublic = profile("candidate-a", {synthetic: true, seedPrefix});
  const h = harness({
    "users/viewer": {
      ...user({
        gender: "man",
        interestedInGenders: ["woman"],
        prefsShowInCrossPaths: true,
      }),
      synthetic: true,
      seedPrefix,
    },
    "users/candidate-a": {
      ...user({
        gender: "woman",
        interestedInGenders: ["man"],
        prefsShowInCrossPaths: true,
      }),
      synthetic: true,
      seedPrefix,
    },
    "publicProfiles/candidate-a": syntheticPublic,
    "crossPathsShowcaseEligibility/candidate-a": showcase(syntheticPublic),
    "events/event-1": event({synthetic: true, seedPrefix}),
    "eventParticipations/event-1_candidate-b": undefined,
    "eventParticipations/event-1_candidate-c": undefined,
  });

  const response = await getCrossPathsSuggestionsHandler(
    request("viewer", {
      eventIds: ["event-1"],
      sessionId: "explore-session-0005a",
    }),
    h.deps
  );

  assert.deepEqual(
    response.suggestions.map((suggestion) => suggestion.person.uid),
    ["candidate-a"]
  );
});

test("never exceeds two people exposed in one Explore session", async () => {
  const sessionId = "explore-session-0006";
  const sessionIdHash = createHash("sha256").update(sessionId).digest("hex");
  const h = harness({
    "crossPathsSuggestionExposures/old-a": {
      viewerUid: "viewer",
      candidateUid: "candidate-a",
      eventId: "event-old",
      sessionIdHash,
      shownAt: timestamp(nowMillis),
    },
    "crossPathsSuggestionExposures/old-b": {
      viewerUid: "viewer",
      candidateUid: "candidate-b",
      eventId: "event-old",
      sessionIdHash,
      shownAt: timestamp(nowMillis),
    },
    "eventParticipations/event-1_candidate-a": undefined,
    "eventParticipations/event-1_candidate-b": undefined,
  });
  const response = await getCrossPathsSuggestionsHandler(
    request("viewer", {eventIds: ["event-1"], sessionId}),
    h.deps
  );
  assert.deepEqual(response.suggestions, []);
  assert.equal(
    h.firestore.collectionRows("crossPathsSuggestionExposures").length,
    2
  );
});

test("fails closed when a bounded safety query saturates", async () => {
  const saturatedMatches = Object.fromEntries(Array.from(
    {length: 500},
    (_, index) => [`matches/match-${index}`, {
      participantIds: ["viewer", `other-${index}`],
      status: "active",
    }]
  ));
  const h = harness(saturatedMatches);
  const response = await getCrossPathsSuggestionsHandler(
    request("viewer", {
      eventIds: ["event-1"],
      sessionId: "explore-session-0007",
    }),
    h.deps
  );
  assert.deepEqual(response.suggestions, []);
});

test("rejects invalid batches before any reads", async () => {
  const h = harness();
  await assert.rejects(
    getCrossPathsSuggestionsHandler(
      request("viewer", {eventIds: [], sessionId: "short"}),
      h.deps
    ),
    (error: unknown) =>
      error instanceof HttpsError && error.code === "invalid-argument"
  );
  assert.deepEqual(h.rateLimitCalls, []);
});

function event(overrides: FakeData = {}): FakeData {
  return {
    organizerId: "organizer-1",
    startTime: timestamp(eventStartMillis),
    endTime: timestamp(eventStartMillis + 2 * 60 * 60 * 1000),
    meetingPoint: "Marine Drive",
    meetingLocation: {
      name: "Marine Drive",
      latitude: 18.94,
      longitude: 72.82,
    },
    eventFormat: {
      version: 1,
      activityKind: "socialRun",
      interactionModel: "pacePods",
    },
    capacityLimit: 20,
    bookedCount: 3,
    waitlistedCount: 0,
    priceInPaise: 0,
    status: "active",
    constraints: {minAge: 21, maxAge: 40},
    cohortCounts: {womenInterestedInMen: 3},
    waitlistedCohortCounts: {},
    crossPathsDiscoveryEnabled: true,
    discoveryMarketId: "in-mh-mumbai",
    discoveryAvailability: "open",
    photoUrl: "https://example.com/event.jpg",
    ...overrides,
  };
}

function user(overrides: FakeData): FakeData {
  return {
    profileComplete: true,
    dateOfBirth: timestamp(Date.UTC(1996, 0, 1)),
    minAgePreference: 21,
    maxAgePreference: 40,
    deleted: false,
    ...overrides,
  };
}

function profile(uid: string, overrides: FakeData = {}): FakeData {
  const photos = [0, 1, 2].map((position) => ({
    id: `${uid}-photo-${position}`,
    url: `https://example.com/${uid}-${position}.jpg`,
    thumbnailUrl: `https://example.com/${uid}-${position}-thumb.jpg`,
    storagePath: `profiles/${uid}/${position}.jpg`,
    thumbnailStoragePath: `profiles/${uid}/${position}-thumb.jpg`,
    position,
    moderation: {status: "approved"},
  }));
  return {
    name: uid,
    age: 30,
    gender: "woman",
    city: "in-mumbai",
    profilePhotos: photos,
    profilePrompts: [0, 1, 2].map((index) => ({
      promptId: `prompt-${index}`,
      prompt: `Prompt ${index}`,
      answer: `Answer ${index}`,
    })),
    relationshipGoal: "relationship",
    activityPreferences: {running: {
      paceMinSecsPerKm: 300,
      paceMaxSecsPerKm: 420,
      preferredDistances: ["fiveK"],
    }},
    ...overrides,
  };
}

function showcase(publicProfile: FakeData): FakeData {
  return {
    status: "eligible",
    reasonCodes: [],
    ruleVersion: 1,
    reviewVersion: 1,
    profileFingerprint: crossPathsProfileFingerprint(publicProfile),
  };
}

function participation(uid: string): FakeData {
  return {eventId: "event-1", uid, status: "signedUp"};
}

function timestamp(millis: number): FirebaseFirestore.Timestamp {
  return new FakeTimestamp(millis) as unknown as FirebaseFirestore.Timestamp;
}

function request(
  uid: string | null,
  data: Record<string, unknown>
): CallableRequest<unknown> {
  return {
    auth: uid ? {uid, token: {}} as CallableRequest["auth"] : undefined,
    data,
    rawRequest: {} as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}
