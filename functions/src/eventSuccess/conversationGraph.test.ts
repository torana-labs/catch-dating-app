import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {
  conversationGraphPrompt,
  getEventSuccessConversationGraphHandler,
  submitEventSuccessConversationGraphHandler,
} from "./conversationGraph";

type FakeData = Record<string, unknown>;

class FakeSnapshot {
  constructor(
    private readonly firestore: FakeFirestore,
    readonly path: string
  ) {}

  get exists(): boolean {
    return this.firestore.get(this.path) !== undefined;
  }

  data(): FakeData | undefined {
    return this.firestore.get(this.path);
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

  async set(data: FakeData): Promise<void> {
    this.firestore.set(this.path, data);
  }
}

class FakeQuery {
  constructor(
    protected readonly firestore: FakeFirestore,
    protected readonly path: string,
    private readonly filters: Array<{field: string; value: unknown}>
  ) {}

  where(field: string, operator: string, value: unknown): FakeQuery {
    assert.equal(operator, "==");
    return new FakeQuery(this.firestore, this.path, [
      ...this.filters,
      {field, value},
    ]);
  }

  async get(): Promise<{docs: FakeSnapshot[]}> {
    return {docs: this.firestore.query(this.path, this.filters)};
  }
}

class FakeCollectionRef extends FakeQuery {
  constructor(
    firestore: FakeFirestore,
    private readonly collectionPath: string
  ) {
    super(firestore, collectionPath, []);
  }

  doc(id: string): FakeDocRef {
    return new FakeDocRef(this.firestore, `${this.collectionPath}/${id}`);
  }
}

class FakeFirestore {
  constructor(private readonly docs: Record<string, FakeData | undefined>) {}

  collection(path: string): FakeCollectionRef {
    return new FakeCollectionRef(this, path);
  }

  get(path: string): FakeData | undefined {
    const data = this.docs[path];
    return data === undefined ? undefined : {...data};
  }

  set(path: string, data: FakeData): void {
    this.docs[path] = {...data};
  }

  query(
    collectionPath: string,
    filters: Array<{field: string; value: unknown}>
  ): FakeSnapshot[] {
    const prefix = `${collectionPath}/`;
    return Object.entries(this.docs)
      .filter(([path, data]) =>
        data !== undefined &&
        path.startsWith(prefix) &&
        !path.slice(prefix.length).includes("/"))
      .filter(([, data]) => filters.every(({field, value}) =>
        data?.[field] === value))
      .map(([path]) => new FakeSnapshot(this, path));
  }
}

function timestamp(iso: string) {
  return admin.firestore.Timestamp.fromDate(new Date(iso));
}

function event(overrides: FakeData = {}): FakeData {
  return {
    organizerId: "organizer-1",
    status: "active",
    startTime: timestamp("2026-08-11T12:00:00.000Z"),
    endTime: timestamp("2026-08-11T15:00:00.000Z"),
    meetingPoint: "Quiz hall",
    meetingLocation: {name: "Quiz hall", latitude: 19, longitude: 72},
    capacityLimit: 20,
    priceInPaise: 0,
    eventFormat: {
      version: 1,
      activityKind: "pubQuiz",
      interactionModel: "teamRotations",
    },
    ...overrides,
  };
}

function participation(uid: string, status = "attended"): FakeData {
  return {eventId: "event-1", organizerId: "club-1", uid, status};
}

function request(data: FakeData): CallableRequest<unknown> {
  return {
    auth: {uid: "runner-1", token: {}} as CallableRequest["auth"],
    data,
    rawRequest: {} as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}

function harness(overrides: Record<string, FakeData | undefined> = {}) {
  const firestore = new FakeFirestore({
    "events/event-1": event(),
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      conversationGraphConsentMode: "optIn",
    },
    "eventParticipations/event-1_runner-1": participation("runner-1"),
    "eventParticipations/event-1_runner-2": participation("runner-2"),
    "eventParticipations/event-1_runner-3": participation("runner-3"),
    "users/runner-1": {displayName: "Ari"},
    "users/runner-2": {displayName: "Rhea"},
    "users/runner-3": {displayName: "Mina"},
    "eventSuccessAssignments/event-1_micro_pods_runner-1": {
      eventId: "event-1",
      uid: "runner-1",
      moduleId: "micro_pods",
      peerUids: ["runner-2"],
    },
    ...overrides,
  });
  const rateLimits: string[] = [];
  return {
    firestore,
    rateLimits,
    deps: {
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      serverTimestamp: () => "SERVER_TIMESTAMP" as unknown as
        FirebaseFirestore.FieldValue,
      nowMillis: () => Date.parse("2026-08-11T15:01:00.000Z"),
      checkRateLimit: async (
        _db: FirebaseFirestore.Firestore,
        uid: string,
        action: string
      ) => {
        rateLimits.push(`${uid}:${action}`);
      },
    },
  };
}

function hasCode(error: unknown, expected: string): boolean {
  return error instanceof HttpsError && error.code === expected;
}

test(
  "opt-in suggests assigned attendees without preselecting them",
  async () => {
    const h = harness();
    const response = await getEventSuccessConversationGraphHandler(
      request({eventId: " event-1 "}),
      h.deps
    );

    assert.equal(response.consentMode, "optIn");
    assert.equal(response.prompt, "Who were your teammates?");
    assert.deepEqual(response.selectedUids, []);
    assert.deepEqual(response.candidates, [
      {uid: "runner-2", displayName: "Rhea", assigned: true},
      {uid: "runner-3", displayName: "Mina", assigned: false},
    ]);
    assert.deepEqual(h.rateLimits, [
      "runner-1:getEventSuccessConversationGraph",
    ]);
  }
);

test("incomplete setup cannot expose conversation graph", async () => {
  const h = harness({"events/event-1": event({
    endTime: undefined,
  })});
  await assert.rejects(getEventSuccessConversationGraphHandler(
    request({eventId: "event-1"}), h.deps
  ), (error) => hasCode(error, "failed-precondition"));
});

test("configured opt-out preselects only assigned attendees", async () => {
  const h = harness({
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      conversationGraphConsentMode: "optOut",
    },
  });
  const response = await getEventSuccessConversationGraphHandler(
    request({eventId: "event-1"}),
    h.deps
  );

  assert.equal(response.consentMode, "optOut");
  assert.deepEqual(response.selectedUids, ["runner-2"]);
});

test("blocked assignments are neither preselected nor aggregated", async () => {
  const h = harness({
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      conversationGraphConsentMode: "optOut",
    },
    "blocks/runner-1_runner-2": {
      blockerUserId: "runner-1",
      blockedUserId: "runner-2",
    },
  });
  const response = await getEventSuccessConversationGraphHandler(
    request({eventId: "event-1"}),
    h.deps
  );

  assert.deepEqual(response.selectedUids, []);
  assert.deepEqual(response.candidates, [
    {uid: "runner-3", displayName: "Mina", assigned: false},
  ]);

  await submitEventSuccessConversationGraphHandler(request({
    eventId: "event-1",
    selectedUids: [],
    skipped: false,
  }), h.deps);
  assert.equal(h.firestore.get(
    "eventSuccessConversationGraphs/event-1_runner-1"
  )?.assignedCandidateCount, 0);
});

test(
  "submission is limited to checked-in candidates and idempotent",
  async () => {
    const h = harness();
    const first = await submitEventSuccessConversationGraphHandler(request({
      eventId: "event-1",
      selectedUids: ["runner-3", "runner-2"],
      skipped: false,
    }), h.deps);

    assert.deepEqual(first, {
      saved: true,
      status: "submitted",
      conversationCount: 2,
    });
    assert.deepEqual(h.firestore.get(
      "eventSuccessConversationGraphs/event-1_runner-1"
    ), {
      eventId: "event-1",
      organizerId: "organizer-1",
      uid: "runner-1",
      status: "submitted",
      selectedUids: ["runner-2", "runner-3"],
      assignedSelectedCount: 1,
      assignedCandidateCount: 1,
      consentMode: "optIn",
      createdAt: "SERVER_TIMESTAMP",
      updatedAt: "SERVER_TIMESTAMP",
    });

    await submitEventSuccessConversationGraphHandler(request({
      eventId: "event-1",
      selectedUids: ["runner-2"],
      skipped: false,
    }), h.deps);
    assert.equal(h.firestore.get(
      "eventSuccessConversationGraphs/event-1_runner-1"
    )?.createdAt, "SERVER_TIMESTAMP");

    await assert.rejects(
      () => submitEventSuccessConversationGraphHandler(request({
        eventId: "event-1",
        selectedUids: ["not-at-this-event"],
        skipped: false,
      }), h.deps),
      (error) => hasCode(error, "failed-precondition")
    );
  }
);

test("a skipped response cannot smuggle conversation edges", async () => {
  const h = harness();
  await assert.rejects(
    () => submitEventSuccessConversationGraphHandler(request({
      eventId: "event-1",
      selectedUids: ["runner-2"],
      skipped: true,
    }), h.deps),
    (error) => hasCode(error, "invalid-argument")
  );
});

test("conversation graph is unavailable before event end", async () => {
  const h = harness({
    "events/event-1": event({
      endTime: timestamp("2026-08-11T16:00:00.000Z"),
    }),
  });
  await assert.rejects(
    () => getEventSuccessConversationGraphHandler(
      request({eventId: "event-1"}),
      h.deps
    ),
    (error) => hasCode(error, "failed-precondition")
  );
});

test("format labels use interaction primitives without screen forks", () => {
  const prompts = [
    ["pacePods", "Who did you run or ride with?"],
    ["teamRotations", "Who were your teammates?"],
    ["seatedTable", "Who were your tablemates?"],
    ["pairedRotations", "Who were your opponents or partners?"],
    ["openFormat", "Who did you actually talk to?"],
  ] as const;
  for (const [interactionModel, expected] of prompts) {
    assert.equal(conversationGraphPrompt(event({
      eventFormat: {
        version: 1,
        activityKind: "openActivity",
        interactionModel,
      },
    }) as never), expected);
  }
});
