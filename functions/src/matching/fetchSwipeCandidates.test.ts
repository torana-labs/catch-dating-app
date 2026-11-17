import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {CallableRequest} from "firebase-functions/v2/https";
import {fetchSwipeCandidatesHandler} from "./fetchSwipeCandidates";

type FakeData = Record<string, unknown>;
type Filter = {field: string; op: string; value: unknown};

class FakeSnapshot {
  constructor(
    private readonly firestore: FakeFirestore,
    readonly path: string
  ) {}

  get id(): string {
    return this.path.split("/").at(-1) ?? "";
  }

  get exists(): boolean {
    return this.firestore.read(this.path) !== undefined;
  }

  data(): FakeData | undefined {
    return this.firestore.read(this.path);
  }
}

class FakeDocRef {
  constructor(
    private readonly firestore: FakeFirestore,
    readonly path: string
  ) {}

  async get(): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.firestore, this.path);
  }

  collection(name: string): FakeCollectionRef {
    return new FakeCollectionRef(this.firestore, `${this.path}/${name}`);
  }
}

class FakeCollectionRef {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string
  ) {}

  doc(id: string): FakeDocRef {
    return new FakeDocRef(this.firestore, `${this.path}/${id}`);
  }

  collection(name: string): FakeCollectionRef {
    return new FakeCollectionRef(this.firestore, `${this.path}/${name}`);
  }

  where(field: string, op: string, value: unknown): FakeQuery {
    return new FakeQuery(this.firestore, this.path, [{field, op, value}]);
  }

  limit(value: number): FakeQuery {
    return new FakeQuery(this.firestore, this.path, [], value);
  }

  async get(): Promise<{docs: FakeSnapshot[]}> {
    return {docs: this.firestore.query(this.path, [])};
  }
}

class FakeQuery {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string,
    private readonly filters: Filter[],
    private readonly maxResults?: number
  ) {}

  where(field: string, op: string, value: unknown): FakeQuery {
    return new FakeQuery(
      this.firestore,
      this.path,
      [...this.filters, {field, op, value}],
      this.maxResults
    );
  }

  limit(value: number): FakeQuery {
    return new FakeQuery(this.firestore, this.path, this.filters, value);
  }

  async get(): Promise<{docs: FakeSnapshot[]}> {
    return {
      docs: this.firestore.query(
        this.path,
        this.filters,
        this.maxResults
      ),
    };
  }
}

class FakeFirestore {
  constructor(private readonly docs: Record<string, FakeData | undefined>) {}

  collection(name: string): FakeCollectionRef {
    return new FakeCollectionRef(this, name);
  }

  read(path: string): FakeData | undefined {
    const value = this.docs[path];
    return value === undefined ? undefined : {...value};
  }

  query(
    collectionPath: string,
    filters: Filter[],
    maxResults?: number
  ): FakeSnapshot[] {
    const prefix = `${collectionPath}/`;
    const matches = Object.entries(this.docs)
      .filter(([path, data]) => {
        if (data === undefined || !path.startsWith(prefix)) return false;
        const docId = path.slice(prefix.length);
        if (docId.length === 0 || docId.includes("/")) return false;
        return filters.every((filter) =>
          filter.op === "==" && data[filter.field] === filter.value
        );
      })
      .map(([path]) => new FakeSnapshot(this, path));
    return maxResults === undefined ? matches : matches.slice(0, maxResults);
  }
}

function harness(overrides: Record<string, FakeData | undefined> = {}) {
  const firestore = new FakeFirestore({
    "events/event-1": {
      organizerId: "club-1",
      status: "active",
      endTime: ts("2026-05-02T02:30:00.000Z"),
    },
    "eventParticipations/event-1_runner-1": participation(
      "runner-1",
      "2026-05-02T02:30:00.000Z"
    ),
    "eventParticipations/event-1_runner-2": participation(
      "runner-2",
      "2026-05-02T02:40:00.000Z"
    ),
    "users/runner-1": profile({
      gender: "man",
      interestedInGenders: ["woman"],
      dateOfBirth: ts("1996-01-01T00:00:00.000Z"),
    }),
    "users/runner-2": profile({
      gender: "woman",
      interestedInGenders: ["man"],
      dateOfBirth: ts("1997-01-01T00:00:00.000Z"),
    }),
    "publicProfiles/runner-2": publicProfile("Rhea", 29),
    ...overrides,
  });
  const rateLimitCalls: string[] = [];
  return {
    firestore,
    rateLimitCalls,
    deps: {
      firestore: () =>
        firestore as unknown as FirebaseFirestore.Firestore,
      nowMillis: () => Date.parse("2026-05-02T03:30:00.000Z"),
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

test("returns only eligible candidates in attendance order", async () => {
  const {deps, rateLimitCalls} = harness({
    "eventParticipations/event-1_runner-7": participation(
      "runner-7",
      "2026-05-02T02:35:00.000Z"
    ),
    "users/runner-7": profile({
      gender: "woman",
      interestedInGenders: ["man"],
      dateOfBirth: ts("1998-01-01T00:00:00.000Z"),
    }),
    "publicProfiles/runner-7": publicProfile("Asha", 28),
    "eventParticipations/event-1_runner-3": participation(
      "runner-3",
      "2026-05-02T02:45:00.000Z"
    ),
    "users/runner-3": profile({gender: "woman"}),
    "publicProfiles/runner-3": publicProfile("Blocked", 29),
    "blocks/runner-3__runner-1": {
      blockerUserId: "runner-3",
      blockedUserId: "runner-1",
    },
    "eventParticipations/event-1_runner-4": participation(
      "runner-4",
      "2026-05-02T02:50:00.000Z"
    ),
    "users/runner-4": profile({gender: "woman"}),
    "publicProfiles/runner-4": publicProfile("Decided", 29),
    "profileDecisions/runner-1/outgoing/runner-4": {
      targetId: "runner-4",
    },
    "eventParticipations/event-1_runner-5": participation(
      "runner-5",
      "2026-05-02T02:55:00.000Z"
    ),
    "users/runner-5": profile({
      gender: "woman",
      interestedInGenders: ["woman"],
    }),
    "publicProfiles/runner-5": publicProfile("Not reciprocal", 29),
    "eventParticipations/event-1_runner-6": participation(
      "runner-6",
      "2026-05-02T03:00:00.000Z"
    ),
    "users/runner-6": profile({
      gender: "woman",
      dateOfBirth: ts("1980-01-01T00:00:00.000Z"),
    }),
    "publicProfiles/runner-6": publicProfile("Outside age range", 46),
  });

  const result = await fetchSwipeCandidatesHandler(
    request("runner-1", {eventId: " event-1 "}),
    deps
  );

  assert.deepEqual(rateLimitCalls, ["runner-1:fetchSwipeCandidates"]);
  assert.deepEqual(
    result.profiles.map((candidate) => candidate.uid),
    ["runner-7", "runner-2"]
  );
});

test("fails closed outside the window or without attendance", async () => {
  const beforeEvent = harness();
  const beforeResult = await fetchSwipeCandidatesHandler(
    request("runner-1", {eventId: "event-1"}),
    {...beforeEvent.deps, nowMillis: () =>
      Date.parse("2026-05-02T01:30:00.000Z")}
  );
  assert.deepEqual(beforeResult, {profiles: []});

  const expiredWindow = harness();
  const expiredResult = await fetchSwipeCandidatesHandler(
    request("runner-1", {eventId: "event-1"}),
    {...expiredWindow.deps, nowMillis: () =>
      Date.parse("2026-05-03T02:30:00.001Z")}
  );
  assert.deepEqual(expiredResult, {profiles: []});

  const notAttended = harness({
    "eventParticipations/event-1_runner-1": {
      ...participation("runner-1", "2026-05-02T02:30:00.000Z"),
      status: "signedUp",
    },
  });
  const notAttendedResult = await fetchSwipeCandidatesHandler(
    request("runner-1", {eventId: "event-1"}),
    notAttended.deps
  );
  assert.deepEqual(notAttendedResult, {profiles: []});
});

function participation(uid: string, attendedAt: string): FakeData {
  return {
    eventId: "event-1",
    organizerId: "club-1",
    uid,
    status: "attended",
    createdAt: ts(attendedAt),
    signedUpAt: ts(attendedAt),
    attendedAt: ts(attendedAt),
  };
}

function profile(overrides: FakeData = {}): FakeData {
  return {
    profileComplete: true,
    gender: "woman",
    interestedInGenders: ["man"],
    dateOfBirth: ts("1997-01-01T00:00:00.000Z"),
    minAgePreference: 24,
    maxAgePreference: 35,
    ...overrides,
  };
}

function publicProfile(name: string, age: number): FakeData {
  return {
    name,
    age,
    gender: "woman",
    profilePrompts: [],
    profilePhotos: [],
  };
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

function ts(iso: string): FirebaseFirestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(new Date(iso));
}
