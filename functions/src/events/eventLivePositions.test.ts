import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {
  eventLivePositionId,
  publishEventLivePositionHandler,
} from "./eventLivePositions";

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
    return this.docs.get(this.path);
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
  delete(): Promise<void> {
    this.docs.delete(this.path);
    return Promise.resolve();
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

const now = admin.firestore.Timestamp.fromDate(
  new Date("2026-08-11T12:30:00.000Z")
);

function event(): FakeData {
  return {
    organizerId: "organizer-1",
    status: "active",
    startTime: admin.firestore.Timestamp.fromDate(
      new Date("2026-08-11T12:00:00.000Z")
    ),
    endTime: admin.firestore.Timestamp.fromDate(
      new Date("2026-08-11T15:00:00.000Z")
    ),
    eventFormat: {
      version: 1,
      activityKind: "socialRun",
      interactionModel: "pacePods",
      activityDetails: {
        routePlan: {
          version: 2,
          movementMode: "run",
          routeShape: "loop",
          groupStrategy: "paceGroups",
          stopCadence: "hostedStops",
          stopKinds: ["water"],
          roleKinds: ["routeLead", "sweep"],
          liveTrackingPolicy: {
            mode: "authorizedOperators",
            staleAfterSeconds: 120,
            retentionMinutes: 15,
          },
        },
      },
    },
  };
}

function organizer(): FakeData {
  return {
    ownerUserId: "host-1",
    hostUserId: "host-1",
    hostUserIds: ["host-1"],
    hostProfiles: [],
  };
}

function dependencies(firestore: FakeFirestore) {
  return {
    firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
    now: () => now,
    checkRateLimit: async () => undefined,
  };
}

function publishRequest(
  uid = "host-1",
  overrides: FakeData = {}
): CallableRequest<unknown> {
  return {
    auth: {uid},
    data: {
      eventId: "event-1",
      sharing: true,
      latitude: 19.1,
      longitude: 72.8,
      accuracyMeters: 7.5,
      headingDegrees: 91,
      ...overrides,
    },
  } as CallableRequest<unknown>;
}

function hasCode(expected: string) {
  return (error: unknown) =>
    error instanceof HttpsError && error.code === expected;
}

test("manager can publish and explicitly clear a live position", async () => {
  const firestore = new FakeFirestore();
  firestore.docs.set("events/event-1", {
    ...event(),
    publicationState: "private",
    setupRevision: 1,
  });
  firestore.docs.set("organizers/organizer-1", organizer());
  const limits: string[] = [];
  const deps = {
    firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
    now: () => now,
    checkRateLimit: async (
      _db: FirebaseFirestore.Firestore,
      uid: string,
      action: string
    ) => {
      limits.push(`${uid}:${action}`);
    },
  };
  const shared = await publishEventLivePositionHandler({
    auth: {uid: "host-1"},
    data: {
      eventId: "event-1",
      sharing: true,
      latitude: 19.1,
      longitude: 72.8,
      accuracyMeters: 7.5,
      headingDegrees: 91,
    },
  } as CallableRequest<unknown>, deps);

  assert.deepEqual(shared, {
    sharing: true,
    role: "host",
    serverTimeMillis: now.toMillis(),
    staleAfterSeconds: 120,
    expiresAtMillis: now.toMillis() + 15 * 60 * 1000,
  });
  const path = `eventLivePositions/${eventLivePositionId(
    "event-1", "host-1"
  )}`;
  assert.equal(firestore.docs.get(path)?.uid, "host-1");
  assert.equal(firestore.docs.get(path)?.latitude, 19.1);

  const stopped = await publishEventLivePositionHandler({
    auth: {uid: "host-1"},
    data: {
      eventId: "event-1",
      sharing: false,
      latitude: null,
      longitude: null,
      accuracyMeters: null,
      headingDegrees: null,
    },
  } as CallableRequest<unknown>, deps);

  assert.equal(stopped.sharing, false);
  assert.equal(stopped.expiresAtMillis, null);
  assert.equal(firestore.docs.has(path), false);
  assert.deepEqual(limits, [
    "host-1:publishEventLivePosition",
    "host-1:publishEventLivePosition",
  ]);
});

test("private setup without an end time cannot publish a live position",
  async () => {
    const firestore = new FakeFirestore();
    const incomplete = event();
    delete incomplete.endTime;
    firestore.docs.set("events/event-1", {
      ...incomplete,
      publicationState: "private",
      setupRevision: 1,
    });
    firestore.docs.set("organizers/organizer-1", organizer());
    await assert.rejects(
      publishEventLivePositionHandler(
        publishRequest(), dependencies(firestore)
      ),
      hasCode("failed-precondition")
    );
    assert.equal(firestore.docs.has(
      `eventLivePositions/${eventLivePositionId("event-1", "host-1")}`
    ), false);
  });

test("operator sharing requires the explicit live-location grant", async () => {
  const firestore = new FakeFirestore();
  firestore.docs.set("events/event-1", event());
  firestore.docs.set("organizers/organizer-1", organizer());
  firestore.docs.set("eventStaffGrants/event-1__operator-1", {
    organizerId: "organizer-1",
    eventId: "event-1",
    uid: "operator-1",
    role: "checkInOperator",
    permissions: ["viewRoster", "setAttendance", "reviewRuntimeClaims"],
    status: "active",
    expiresAt: admin.firestore.Timestamp.fromDate(
      new Date("2026-08-11T16:00:00.000Z")
    ),
  });

  await assert.rejects(
    publishEventLivePositionHandler(
      publishRequest("operator-1"),
      dependencies(firestore)
    ),
    hasCode("permission-denied")
  );

  firestore.docs.set("eventStaffGrants/event-1__operator-1", {
    ...firestore.docs.get("eventStaffGrants/event-1__operator-1"),
    permissions: [
      "viewRoster",
      "setAttendance",
      "reviewRuntimeClaims",
      "publishLiveLocation",
    ],
  });
  const result = await publishEventLivePositionHandler(
    publishRequest("operator-1"),
    dependencies(firestore)
  );
  assert.equal(result.role, "operator");
});

test("disabled, out-of-window, and malformed sharing fail closed", async () => {
  const disabled = new FakeFirestore();
  const baseEvent = event();
  const eventFormat = baseEvent.eventFormat as FakeData;
  const activityDetails = eventFormat.activityDetails as FakeData;
  const routePlan = activityDetails.routePlan as FakeData;
  disabled.docs.set("events/event-1", {
    ...baseEvent,
    eventFormat: {
      ...eventFormat,
      activityDetails: {
        ...activityDetails,
        routePlan: {
          ...routePlan,
          liveTrackingPolicy: {
            mode: "disabled",
            staleAfterSeconds: 120,
            retentionMinutes: 15,
          },
        },
      },
    },
  });
  disabled.docs.set("organizers/organizer-1", organizer());
  await assert.rejects(
    publishEventLivePositionHandler(
      publishRequest(),
      dependencies(disabled)
    ),
    hasCode("failed-precondition")
  );

  const outside = new FakeFirestore();
  outside.docs.set("events/event-1", {
    ...event(),
    startTime: admin.firestore.Timestamp.fromDate(
      new Date("2026-08-12T12:00:00.000Z")
    ),
    endTime: admin.firestore.Timestamp.fromDate(
      new Date("2026-08-12T15:00:00.000Z")
    ),
  });
  outside.docs.set("organizers/organizer-1", organizer());
  await assert.rejects(
    publishEventLivePositionHandler(
      publishRequest(),
      dependencies(outside)
    ),
    hasCode("failed-precondition")
  );

  const malformed = new FakeFirestore();
  await assert.rejects(
    publishEventLivePositionHandler(
      publishRequest("host-1", {latitude: 200}),
      dependencies(malformed)
    ),
    hasCode("invalid-argument")
  );
});
