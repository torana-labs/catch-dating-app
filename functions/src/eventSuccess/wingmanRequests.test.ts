import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  fetchEventSuccessWingmanCandidatesHandler,
  submitEventSuccessWingmanRequestHandler,
  withdrawEventSuccessWingmanRequestHandler,
} from "./wingmanRequests";
import {isHttpsError} from "../shared/testUtils";

type FakeData = Record<string, unknown>;

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}

  get id(): string {
    return this.path.split("/").at(-1) ?? "";
  }

  async get(): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.firestore, this.path);
  }
}

class FakeSnapshot {
  constructor(
    private readonly firestore: FakeFirestore,
    readonly path: string
  ) {}

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
    private readonly path: string
  ) {}

  doc(docId: string) {
    return new FakeDocRef(this.firestore, `${this.path}/${docId}`);
  }

  where(field: string, op: string, value: unknown) {
    return new FakeQuery(this.firestore, this.path, [
      {field, op, value},
    ]);
  }
}

class FakeQuery {
  constructor(
    private readonly firestore: FakeFirestore,
    private readonly path: string,
    private readonly filters: Array<{
      field: string;
      op: string;
      value: unknown;
    }>
  ) {}

  where(field: string, op: string, value: unknown) {
    return new FakeQuery(this.firestore, this.path, [
      ...this.filters,
      {field, op, value},
    ]);
  }

  async get(): Promise<{docs: FakeSnapshot[]}> {
    return {
      docs: this.firestore.query(this.path, this.filters),
    };
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];

  constructor(private readonly firestore: FakeFirestore) {}

  async get(ref: FakeDocRef): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.firestore, ref.path);
  }

  set(ref: FakeDocRef, data: FakeData) {
    this.writes.push(() => this.firestore.set(ref.path, data));
  }

  commit() {
    for (const write of this.writes) write();
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
    const data = this.docs[path];
    return data === undefined ? undefined : {...data};
  }

  set(path: string, data: FakeData) {
    this.docs[path] = {...data};
  }

  query(
    collectionPath: string,
    filters: Array<{field: string; op: string; value: unknown}>
  ): FakeSnapshot[] {
    const prefix = `${collectionPath}/`;
    return Object.entries(this.docs)
      .filter(([path, data]) => {
        if (data === undefined || !path.startsWith(prefix)) return false;
        const docId = path.slice(prefix.length);
        if (docId.length === 0 || docId.includes("/")) return false;
        return filters.every((filter) => {
          if (filter.op !== "==") return false;
          return data[filter.field] === filter.value;
        });
      })
      .map(([path]) => new FakeSnapshot(this, path));
  }
}

function harness(overrides: Record<string, FakeData | undefined> = {}) {
  const firestore = new FakeFirestore({
    "events/event-1": {
      organizerId: "club-1",
      status: "active",
      endTime: ts("2026-05-02T02:30:00.000Z"),
    },
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["wingman_requests"],
      wingmanRequestsEnabled: true,
    },
    "eventParticipations/event-1_runner-1": {
      eventId: "event-1",
      organizerId: "club-1",
      uid: "runner-1",
      status: "attended",
    },
    "eventParticipations/event-1_runner-2": {
      eventId: "event-1",
      organizerId: "club-1",
      uid: "runner-2",
      status: "attended",
      genderAtSignup: "woman",
      cohortAtSignup: "womenInterestedInMen",
    },
    "users/runner-1": {
      gender: "man",
      interestedInGenders: ["woman"],
    },
    "publicProfiles/runner-2": {
      name: "Rhea",
      age: 29,
      gender: "woman",
    },
    ...overrides,
  });
  const rateLimitCalls: string[] = [];
  return {
    firestore,
    rateLimitCalls,
    deps: {
      firestore: () =>
        firestore as unknown as FirebaseFirestore.Firestore,
      serverTimestamp: () =>
        ({__serverTimestamp: true} as unknown as
          FirebaseFirestore.FieldValue),
      nowMillis: () => Date.parse("2026-05-02T01:30:00.000Z"),
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

test("fetch wingman candidates filters eligibility and blocks", async () => {
  const {deps, rateLimitCalls} = harness({
    "eventParticipations/event-1_runner-3": {
      eventId: "event-1",
      organizerId: "club-1",
      uid: "runner-3",
      status: "attended",
      genderAtSignup: "woman",
      cohortAtSignup: "womenInterestedInMen",
    },
    "eventParticipations/event-1_runner-4": {
      eventId: "event-1",
      organizerId: "club-1",
      uid: "runner-4",
      status: "signedUp",
      genderAtSignup: "woman",
      cohortAtSignup: "womenInterestedInMen",
    },
    "publicProfiles/runner-3": {
      name: "Blocked",
      age: 30,
      gender: "woman",
    },
    "publicProfiles/runner-4": {
      name: "Not checked in",
      age: 31,
      gender: "woman",
    },
    "blocks/runner-3__runner-1": {
      blockerUserId: "runner-3",
      blockedUserId: "runner-1",
    },
  });

  const result = await fetchEventSuccessWingmanCandidatesHandler(
    request("runner-1", {eventId: " event-1 "}),
    deps
  );

  assert.deepEqual(rateLimitCalls, [
    "runner-1:fetchEventSuccessWingmanCandidates",
  ]);
  assert.deepEqual(result.profiles.map((profile) => profile.uid), [
    "runner-2",
  ]);
  assert.equal(result.profiles[0]?.name, "Rhea");
});

test(
  "fetch wingman candidates includes external runtime attendees",
  async () => {
    const {deps} = harness({
      "eventParticipations/event-1_runner-1": undefined,
      "eventParticipations/event-1_runner-2": undefined,
      "users/runner-1": undefined,
      "publicProfiles/runner-2": undefined,
      "eventRuntimeParticipants/event-1_runner-1": runtimeParticipant({
        uid: "runner-1",
        attendeeId: "attendee-1",
        displayName: "Dev",
        gender: "man",
        interestedInGenders: ["woman"],
      }),
      "eventRuntimeParticipants/event-1_runner-2": runtimeParticipant({
        uid: "runner-2",
        attendeeId: "attendee-2",
        displayName: "Rhea",
        gender: "woman",
        interestedInGenders: ["man"],
      }),
      "eventAttendees/attendee-1": {
        eventId: "event-1",
        linkedUid: "runner-1",
        status: "checkedIn",
      },
      "eventAttendees/attendee-2": {
        eventId: "event-1",
        linkedUid: "runner-2",
        status: "checkedIn",
      },
    });

    const result = await fetchEventSuccessWingmanCandidatesHandler(
      request("runner-1", {eventId: "event-1"}),
      deps
    );

    assert.deepEqual(result.profiles, []);
    assert.deepEqual(result.candidates, [{
      uid: "runner-2",
      displayName: "Rhea",
      gender: "woman",
      source: "externalRuntime",
    }]);
  }
);

test("wingman candidates work without dating-profile answers", async () => {
  const {deps} = harness({
    "eventParticipations/event-1_runner-1": undefined,
    "eventParticipations/event-1_runner-2": undefined,
    "users/runner-1": undefined,
    "publicProfiles/runner-2": undefined,
    "eventRuntimeParticipants/event-1_runner-1": runtimeParticipant({
      uid: "runner-1",
      attendeeId: "attendee-1",
      displayName: "Dev",
      gender: null,
      interestedInGenders: [],
    }),
    "eventRuntimeParticipants/event-1_runner-2": runtimeParticipant({
      uid: "runner-2",
      attendeeId: "attendee-2",
      displayName: "Rhea",
      gender: null,
      interestedInGenders: [],
    }),
    "eventAttendees/attendee-1": {
      eventId: "event-1",
      linkedUid: "runner-1",
      status: "checkedIn",
    },
    "eventAttendees/attendee-2": {
      eventId: "event-1",
      linkedUid: "runner-2",
      status: "checkedIn",
    },
  });

  const result = await fetchEventSuccessWingmanCandidatesHandler(
    request("runner-1", {eventId: "event-1"}),
    deps
  );

  assert.deepEqual(result.candidates, [{
    uid: "runner-2",
    displayName: "Rhea",
    gender: null,
    source: "externalRuntime",
  }]);
});

test("submit wingman request writes server-owned request", async () => {
  const {firestore, deps, rateLimitCalls} = harness();

  const result = await submitEventSuccessWingmanRequestHandler(
    request("runner-1", {
      eventId: " event-1 ",
      targetUid: " runner-2 ",
      note: "  Please introduce us.  ",
    }),
    deps
  );

  const saved = firestore.get("eventSuccessWingmanRequests/event-1_runner-1");
  assert.deepEqual(result, {saved: true});
  assert.deepEqual(rateLimitCalls, [
    "runner-1:submitEventSuccessWingmanRequest",
  ]);
  assert.equal(saved?.eventId, "event-1");
  assert.equal(saved?.organizerId, "club-1");
  assert.equal(saved?.requesterUid, "runner-1");
  assert.equal(saved?.targetUid, "runner-2");
  assert.equal(saved?.status, "active");
  assert.equal(saved?.hostVisibleConsent, true);
  assert.equal(saved?.note, "Please introduce us.");
});

test("submitEventSuccessWingmanRequest rejects unsafe targets", async () => {
  const {deps} = harness({
    "blocks/runner-2__runner-1": {
      blockerUserId: "runner-2",
      blockedUserId: "runner-1",
    },
  });

  await assert.rejects(
    () => submitEventSuccessWingmanRequestHandler(
      request("runner-1", {eventId: "event-1", targetUid: "runner-2"}),
      deps
    ),
    (error) => {
      isHttpsError(error, "failed-precondition", "not available");
      return true;
    }
  );
});

test("withdraw wingman request withdraws caller request", async () => {
  const {firestore, deps, rateLimitCalls} = harness({
    "eventSuccessWingmanRequests/event-1_runner-1": {
      eventId: "event-1",
      organizerId: "club-1",
      requesterUid: "runner-1",
      targetUid: "runner-2",
      status: "active",
      hostVisibleConsent: true,
      note: "Please introduce us.",
      createdAt: "created",
      updatedAt: "old",
    },
  });

  const result = await withdrawEventSuccessWingmanRequestHandler(
    request("runner-1", {eventId: "event-1"}),
    deps
  );

  const saved = firestore.get("eventSuccessWingmanRequests/event-1_runner-1");
  assert.deepEqual(result, {withdrawn: true});
  assert.deepEqual(rateLimitCalls, [
    "runner-1:withdrawEventSuccessWingmanRequest",
  ]);
  assert.equal(saved?.status, "withdrawn");
  assert.equal(saved?.targetUid, "runner-2");
  assert.equal(saved?.createdAt, "created");
});

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

function runtimeParticipant(params: {
  uid: string;
  attendeeId: string;
  displayName: string;
  gender: "man" | "woman" | null;
  interestedInGenders: Array<"man" | "woman">;
}): FakeData {
  return {
    eventId: "event-1",
    uid: params.uid,
    eventAttendeeId: params.attendeeId,
    accessStatus: "ready",
    runtimeProfile: {
      displayName: params.displayName,
      gender: params.gender,
      interestedInGenders: params.interestedInGenders,
      relationshipGoal: null,
      dateOfBirth: null,
    },
  };
}
