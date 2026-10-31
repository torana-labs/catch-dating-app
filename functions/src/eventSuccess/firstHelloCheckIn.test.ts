import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {
  completeEventSuccessFirstHelloMissionHandler,
  startEventSuccessFirstHelloMissionHandler,
} from "./firstHelloCheckIn";
import {isHttpsError} from "../shared/testUtils";
import {eventVenueSessionRedemptionId} from "../events/venueSessions";

const venueSessionId = "session_123456789012345678901234";
const venueSessionToken =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const venueRedemptionId = eventVenueSessionRedemptionId({
  eventId: "event-1",
  sessionId: venueSessionId,
  uid: "runner-1",
});

type FakeData = Record<string, unknown>;

class FakeDocRef {
  constructor(readonly firestore: FakeFirestore, readonly path: string) {}

  get id(): string {
    return this.path.split("/").at(-1) ?? "";
  }

  async get(): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.firestore, this.path);
  }

  async set(data: FakeData) {
    this.firestore.set(this.path, data);
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
    private readonly path: string,
    private readonly filters: Array<{
      field: string;
      op: string;
      value: unknown;
    }> = []
  ) {}

  doc(docId: string) {
    return new FakeDocRef(this.firestore, `${this.path}/${docId}`);
  }

  where(field: string, op: string, value: unknown) {
    return new FakeCollectionRef(this.firestore, this.path, [
      ...this.filters,
      {field, op, value},
    ]);
  }

  async get(): Promise<{docs: FakeSnapshot[]}> {
    return {docs: this.firestore.query(this.path, this.filters)};
  }
}

class FakeTransaction {
  private readonly writes: Array<() => void> = [];

  constructor(private readonly firestore: FakeFirestore) {}

  async get(ref: FakeDocRef): Promise<FakeSnapshot> {
    return new FakeSnapshot(this.firestore, ref.path);
  }

  set(ref: FakeDocRef, data: FakeData, options?: {merge: boolean}) {
    this.writes.push(() => {
      if (options?.merge) {
        this.firestore.merge(ref.path, data);
      } else {
        this.firestore.set(ref.path, data);
      }
    });
  }

  create(ref: FakeDocRef, data: FakeData) {
    this.writes.push(() => {
      if (this.firestore.get(ref.path) !== undefined) {
        throw new Error(`Document exists: ${ref.path}`);
      }
      this.firestore.set(ref.path, data);
    });
  }

  update(ref: FakeDocRef, data: FakeData) {
    this.writes.push(() => this.firestore.merge(ref.path, data));
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

  merge(path: string, data: FakeData) {
    this.docs[path] = {...(this.docs[path] ?? {}), ...data};
  }

  query(
    collectionPath: string,
    filters: Array<{field: string; op: string; value: unknown}>
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
          if (filter.op !== "==") return false;
          return data[filter.field] === filter.value;
        });
      });
  }
}

function harness(overrides: Record<string, FakeData | undefined> = {}) {
  const firestore = new FakeFirestore({
    "events/event-1": {
      organizerId: "club-1",
      status: "active",
      startTime: ts("2026-05-02T01:40:00.000Z"),
      endTime: ts("2026-05-02T02:40:00.000Z"),
      checkedInCount: 1,
      startingPointLat: 19.076,
      startingPointLng: 72.8777,
    },
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["first_hello_check_in"],
    },
    [`eventVenueSessions/${venueSessionId}`]: {
      eventId: "event-1",
      organizerId: "club-1",
      createdBy: "host-1",
      issuedAt: ts("2026-05-02T01:34:00.000Z"),
      expiresAt: ts("2026-05-02T01:36:00.000Z"),
    },
    "eventParticipations/event-1_runner-1": {
      eventId: "event-1",
      organizerId: "club-1",
      uid: "runner-1",
      status: "signedUp",
      genderAtSignup: "man",
      cohortAtSignup: "menInterestedInWomen",
      paymentId: "payment-1",
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
  const recordedSignals: unknown[] = [];
  return {
    firestore,
    rateLimitCalls,
    recordedSignals,
    deps: {
      firestore: () =>
        firestore as unknown as FirebaseFirestore.Firestore,
      serverTimestamp: () =>
        ({__serverTimestamp: true} as unknown as
          FirebaseFirestore.FieldValue),
      nowMillis: () => Date.parse("2026-05-02T01:35:00.000Z"),
      verifyVenueSessionToken: () => ({
        version: 1 as const,
        eventId: "event-1",
        organizerId: "club-1",
        sessionId: venueSessionId,
        issuedAtMillis: Date.parse("2026-05-02T01:34:00.000Z"),
        expiresAtMillis: Date.parse("2026-05-02T01:36:00.000Z"),
      }),
      checkRateLimit: async (
        _db: FirebaseFirestore.Firestore,
        uid: string,
        action: string
      ) => {
        rateLimitCalls.push(`${uid}:${action}`);
      },
      recordSignalFacts: async (
        _db: FirebaseFirestore.Firestore,
        facts: unknown[]
      ) => {
        recordedSignals.push(...facts);
      },
    },
  };
}

test("start First Hello writes a private arrival mission", async () => {
  const {firestore, deps, rateLimitCalls} = harness();

  const result = await startEventSuccessFirstHelloMissionHandler(
    request("runner-1", {
      eventId: " event-1 ",
      venueSessionToken,
    }),
    deps
  );

  const mission = firestore.get("eventSuccessArrivalMissions/event-1_runner-1");
  assert.deepEqual(result, {missionId: "event-1_runner-1"});
  assert.deepEqual(rateLimitCalls, [
    "runner-1:startEventSuccessFirstHelloMission",
  ]);
  assert.equal(mission?.eventId, "event-1");
  assert.equal(mission?.organizerId, "club-1");
  assert.equal(mission?.observerUid, "runner-1");
  assert.equal(mission?.targetUid, "runner-2");
  assert.equal(mission?.targetDisplayName, "Rhea");
  assert.equal(mission?.venueSessionId, venueSessionId);
  assert.equal(mission?.venueSessionRedemptionId, venueRedemptionId);
  assert.equal(mission?.status, "active");
  assert.equal(Array.isArray(mission?.answerOptions), true);
  assert.equal(
    firestore.get(
      `eventVenueSessionRedemptions/${venueRedemptionId}`
    )?.purpose,
    "firstHello"
  );
});

test(
  "start First Hello works for event-scoped external attendees",
  async () => {
    const {firestore, deps} = harness({
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
        status: "registered",
      },
      "eventAttendees/attendee-2": {
        eventId: "event-1",
        linkedUid: "runner-2",
        status: "checkedIn",
      },
    });

    const result = await startEventSuccessFirstHelloMissionHandler(
      request("runner-1", {
        eventId: "event-1",
        venueSessionToken,
      }),
      deps
    );

    assert.deepEqual(result, {missionId: "event-1_runner-1"});
    const mission = firestore.get(
      "eventSuccessArrivalMissions/event-1_runner-1"
    );
    assert.equal(mission?.targetUid, "runner-2");
    assert.equal(mission?.targetDisplayName, "Rhea");
  }
);

test("First Hello uses neutral fallback without profile answers", async () => {
  const {firestore, deps} = harness({
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
      status: "registered",
    },
    "eventAttendees/attendee-2": {
      eventId: "event-1",
      linkedUid: "runner-2",
      status: "checkedIn",
    },
  });

  await startEventSuccessFirstHelloMissionHandler(request("runner-1", {
    eventId: "event-1",
    venueSessionToken,
  }), deps);

  assert.equal(firestore.get(
    "eventSuccessArrivalMissions/event-1_runner-1"
  )?.targetUid, "runner-2");
});

test(
  "start First Hello rejects when no compatible attendee is checked in",
  async () => {
    const {deps} = harness({
      "eventParticipations/event-1_runner-2": {
        eventId: "event-1",
        organizerId: "club-1",
        uid: "runner-2",
        status: "signedUp",
        genderAtSignup: "woman",
        cohortAtSignup: "womenInterestedInMen",
      },
    });

    await assert.rejects(
      () => startEventSuccessFirstHelloMissionHandler(
        request("runner-1", {
          eventId: "event-1",
          venueSessionToken,
        }),
        deps
      ),
      (error) => {
        isHttpsError(error, "failed-precondition", "partner is ready");
        return true;
      }
    );
  }
);

test("complete First Hello marks attendance", async () => {
  const {firestore, deps, rateLimitCalls, recordedSignals} = harness({
    "eventSuccessArrivalMissions/event-1_runner-1": {
      eventId: "event-1",
      organizerId: "club-1",
      observerUid: "runner-1",
      targetUid: "runner-2",
      targetDisplayName: "Rhea",
      targetContext: "They are checked in and ready for the same room.",
      question: "Ask them: what made this event sound fun?",
      answerOptions: [
        {id: "people", label: "The people"},
        {id: "activity", label: "The activity"},
      ],
      venueSessionId,
      venueSessionRedemptionId: venueRedemptionId,
      status: "active",
      createdAt: "created",
      updatedAt: "created",
    },
    [`eventVenueSessionRedemptions/${venueRedemptionId}`]: {
      eventId: "event-1",
      sessionId: venueSessionId,
      uid: "runner-1",
      purpose: "firstHello",
      redeemedAt: "created",
      consumedAt: null,
      expiresAt: ts("2026-05-03T01:35:00.000Z"),
    },
  });

  const result = await completeEventSuccessFirstHelloMissionHandler(
    request("runner-1", {
      eventId: "event-1",
      answerId: "people",
    }),
    deps
  );

  const mission = firestore.get("eventSuccessArrivalMissions/event-1_runner-1");
  const participation = firestore.get("eventParticipations/event-1_runner-1");
  assert.deepEqual(result, {attended: true});
  assert.deepEqual(rateLimitCalls, [
    "runner-1:completeEventSuccessFirstHelloMission",
  ]);
  assert.equal(mission?.status, "completed");
  assert.equal(mission?.selectedAnswerId, "people");
  assert.notEqual(
    firestore.get(
      `eventVenueSessionRedemptions/${venueRedemptionId}`
    )?.consumedAt,
    null
  );
  assert.equal(participation?.status, "attended");
  assert.equal(participation?.paymentId, "payment-1");
  assert.equal(recordedSignals.length, 1);
});

test("complete First Hello rejects invalid answers", async () => {
  const {deps} = harness({
    "eventSuccessArrivalMissions/event-1_runner-1": {
      eventId: "event-1",
      organizerId: "club-1",
      observerUid: "runner-1",
      targetUid: "runner-2",
      targetDisplayName: "Rhea",
      targetContext: "They are checked in and ready for the same room.",
      question: "Ask them: what made this event sound fun?",
      answerOptions: [{id: "people", label: "The people"}],
      venueSessionId,
      venueSessionRedemptionId: venueRedemptionId,
      status: "active",
      createdAt: "created",
      updatedAt: "created",
    },
    [`eventVenueSessionRedemptions/${venueRedemptionId}`]: {
      eventId: "event-1",
      sessionId: venueSessionId,
      uid: "runner-1",
      purpose: "firstHello",
      redeemedAt: "created",
      consumedAt: null,
      expiresAt: ts("2026-05-03T01:35:00.000Z"),
    },
  });

  await assert.rejects(
    () => completeEventSuccessFirstHelloMissionHandler(
      request("runner-1", {
        eventId: "event-1",
        answerId: "venue",
      }),
      deps
    ),
    (error) => {
      isHttpsError(error, "invalid-argument", "answer options");
      return true;
    }
  );
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
