import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {
  generateEventSuccessPodsHandler,
  overrideEventSuccessGroupsHandler,
} from "./generateEventSuccessPods";
import {isHttpsError} from "../shared/testUtils";
import {assignmentFeatureConsentId} from
  "./assignmentFeatureConsent";

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
    }> = [],
    private readonly cap = Infinity
  ) {}

  doc(docId: string) {
    return new FakeDocRef(this.firestore, `${this.path}/${docId}`);
  }

  where(field: string, operator: string, value: unknown) {
    return new FakeCollectionRef(this.firestore, this.path, [
      ...this.filters,
      {field, operator, value},
    ], this.cap);
  }

  limit(count: number) {
    return new FakeCollectionRef(this.firestore, this.path,
      this.filters, count);
  }

  async get() {
    const docs = this.firestore.query(this.path, this.filters)
      .slice(0, this.cap);
    return {docs, size: docs.length};
  }
}

class FakeTransaction {
  constructor(private readonly firestore: FakeFirestore) {}
  async get(ref: {get: () => Promise<unknown>}) {
    return ref.get();
  }
  set(ref: FakeDocRef, data: FakeData) {
    this.firestore.set(ref.path, data);
  }
  delete(ref: FakeDocRef) {
    this.firestore.delete(ref.path);
  }
}

class FakeBatch {
  private readonly writes: Array<() => void> = [];

  constructor(private readonly firestore: FakeFirestore) {}

  set(ref: FakeDocRef, data: FakeData, options?: {merge: boolean}) {
    this.writes.push(() => {
      if (options?.merge) {
        this.firestore.merge(ref.path, data);
      } else {
        this.firestore.set(ref.path, data);
      }
    });
  }

  delete(ref: FakeDocRef) {
    this.writes.push(() => {
      this.firestore.delete(ref.path);
    });
  }

  async commit() {
    for (const write of this.writes) write();
  }
}

class FakeFirestore {
  beforeTransaction?: () => void;
  constructor(private readonly docs: Record<string, FakeData | undefined>) {}

  collection(collectionPath: string) {
    return new FakeCollectionRef(this, collectionPath);
  }

  batch() {
    return new FakeBatch(this);
  }

  async getAll(...refs: FakeDocRef[]): Promise<FakeSnapshot[]> {
    return Promise.all(refs.map((ref) => ref.get()));
  }

  async runTransaction<T>(
    callback: (transaction: FakeTransaction) => Promise<T>
  ): Promise<T> {
    this.beforeTransaction?.();
    return callback(new FakeTransaction(this));
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

  delete(path: string) {
    delete this.docs[path];
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
          throw new Error(`Unsupported operator ${filter.operator}`);
        });
      });
  }
}

function harness(overrides: Record<string, FakeData | undefined> = {}) {
  const firestore = new FakeFirestore({
    "events/event-1": {
      organizerId: "club-1",
      status: "active",
      eventFormat: {
        version: 1,
        activityKind: "socialRun",
        interactionModel: "pacePods",
      },
    },
    "organizers/club-1": {
      hostUserId: "host-1",
      hostName: "Host",
      hostUserIds: [],
      hostProfiles: [],
    },
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["micro_pods"],
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

test("generates micro-pod assignments for active participants", async () => {
  const {firestore, deps, rateLimitCalls} = harness({
    "eventParticipations/event-1_runner-1": {
      eventId: "event-1",
      uid: "runner-1",
      status: "attended",
    },
    "eventParticipations/event-1_runner-2": {
      eventId: "event-1",
      uid: "runner-2",
      status: "signedUp",
    },
    "eventParticipations/event-1_runner-3": {
      eventId: "event-1",
      uid: "runner-3",
      status: "signedUp",
    },
    "eventParticipations/event-1_runner-4": {
      eventId: "event-1",
      uid: "runner-4",
      status: "waitlisted",
    },
    "eventSuccessAssignments/event-1_micro_pods_old-runner": {
      eventId: "event-1",
      moduleId: "micro_pods",
      uid: "old-runner",
    },
  });

  const result = await generateEventSuccessPodsHandler(
    callableRequest("host-1"),
    deps
  );

  assert.deepEqual(result, {assignmentCount: 3, podCount: 1});
  assert.deepEqual(rateLimitCalls, ["host-1:generateEventSuccessPods"]);
  const runnerOne = firestore.get(
    "eventSuccessAssignments/event-1_micro_pods_runner-1"
  );
  assert.equal(runnerOne?.displayTitle, "Pod A");
  assert.deepEqual(runnerOne?.peerUids, ["runner-2", "runner-3"]);
  assert.equal(runnerOne?.source, "server_v1");
  assert.equal(
    firestore.get("eventSuccessAssignments/event-1_micro_pods_old-runner"),
    undefined
  );
});

test("keeps blocked participant pairs out of the same pod", async () => {
  const {firestore, deps} = harness({
    "eventParticipations/event-1_runner-1": {
      eventId: "event-1",
      uid: "runner-1",
      status: "signedUp",
    },
    "eventParticipations/event-1_runner-2": {
      eventId: "event-1",
      uid: "runner-2",
      status: "signedUp",
    },
    "eventParticipations/event-1_runner-3": {
      eventId: "event-1",
      uid: "runner-3",
      status: "signedUp",
    },
    "eventParticipations/event-1_runner-4": {
      eventId: "event-1",
      uid: "runner-4",
      status: "signedUp",
    },
    "eventParticipations/event-1_runner-5": {
      eventId: "event-1",
      uid: "runner-5",
      status: "signedUp",
    },
    "eventParticipations/event-1_runner-6": {
      eventId: "event-1",
      uid: "runner-6",
      status: "signedUp",
    },
    "blocks/runner-3__runner-1": {
      blockerUserId: "runner-3",
      blockedUserId: "runner-1",
    },
  });

  const result = await generateEventSuccessPodsHandler(
    callableRequest("host-1"),
    deps
  );

  assert.deepEqual(result, {assignmentCount: 6, podCount: 2});
  const runnerOne = firestore.get(
    "eventSuccessAssignments/event-1_micro_pods_runner-1"
  );
  const runnerThree = firestore.get(
    "eventSuccessAssignments/event-1_micro_pods_runner-3"
  );
  assert.equal(runnerOne?.displayTitle, "Pod A");
  assert.equal(runnerThree?.displayTitle, "Pod B");
  assert.ok(!(runnerOne?.peerUids as string[]).includes("runner-3"));
  assert.ok(!(runnerThree?.peerUids as string[]).includes("runner-1"));
});

test("uses saved unit size for generated pod count", async () => {
  const {deps} = harness({
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["micro_pods"],
      structureConfig: {
        unitKind: "teams",
        unitSize: 3,
        unitCount: null,
      },
    },
    ...Object.fromEntries(
      Array.from({length: 7}, (_, index) => [
        `eventParticipations/event-1_runner-${index + 1}`,
        {
          eventId: "event-1",
          uid: `runner-${index + 1}`,
          status: "signedUp",
        },
      ])
    ),
  });

  const result = await generateEventSuccessPodsHandler(
    callableRequest("host-1"),
    deps
  );

  assert.deepEqual(result, {assignmentCount: 7, podCount: 3});
});

test("uses unit kind labels for table assignments", async () => {
  const {firestore, deps} = harness({
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["micro_pods"],
      structureConfig: {
        unitKind: "tables",
        unitSize: 4,
        unitCount: 2,
      },
    },
    ...Object.fromEntries(
      Array.from({length: 6}, (_, index) => [
        `eventParticipations/event-1_runner-${index + 1}`,
        {
          eventId: "event-1",
          uid: `runner-${index + 1}`,
          status: "signedUp",
        },
      ])
    ),
  });

  const result = await generateEventSuccessPodsHandler(
    callableRequest("host-1"),
    deps
  );

  assert.deepEqual(result, {assignmentCount: 6, podCount: 2});
  const runnerOne = firestore.get(
    "eventSuccessAssignments/event-1_micro_pods_runner-1"
  );
  assert.equal(runnerOne?.displayTitle, "Table A");
  assert.match(String(runnerOne?.displaySubtitle), /at this table/);
  assert.equal(runnerOne?.unitKind, "tables");
  assert.equal(runnerOne?.unitIndex, 0);
  assert.equal(runnerOne?.unitLabel, "Table A");
  assert.match(String(runnerOne?.whySummary), /Table A/);
  assert.ok((runnerOne?.whyCodes as string[]).includes("table_slot"));
});

test("uses saved fixed unit count when present", async () => {
  const {deps} = harness({
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["micro_pods"],
      structureConfig: {
        unitKind: "teams",
        unitSize: 5,
        unitCount: 4,
      },
    },
    ...Object.fromEntries(
      Array.from({length: 10}, (_, index) => [
        `eventParticipations/event-1_runner-${index + 1}`,
        {
          eventId: "event-1",
          uid: `runner-${index + 1}`,
          status: "signedUp",
        },
      ])
    ),
  });

  const result = await generateEventSuccessPodsHandler(
    callableRequest("host-1"),
    deps
  );

  assert.deepEqual(result, {assignmentCount: 10, podCount: 4});
});

test("excludes opted-out attendees from generated pods", async () => {
  const {firestore, deps} = harness({
    "eventParticipations/event-1_runner-1": {
      eventId: "event-1",
      uid: "runner-1",
      status: "signedUp",
    },
    "eventParticipations/event-1_runner-2": {
      eventId: "event-1",
      uid: "runner-2",
      status: "signedUp",
    },
    "eventParticipations/event-1_runner-3": {
      eventId: "event-1",
      uid: "runner-3",
      status: "signedUp",
    },
    "eventSuccessPreferences/event-1_runner-2": {
      eventId: "event-1",
      uid: "runner-2",
      microPodsOptedOut: true,
    },
    "eventSuccessAssignments/event-1_micro_pods_runner-2": {
      eventId: "event-1",
      moduleId: "micro_pods",
      uid: "runner-2",
    },
  });

  const result = await generateEventSuccessPodsHandler(
    callableRequest("host-1"),
    deps
  );

  assert.deepEqual(result, {assignmentCount: 2, podCount: 1});
  assert.deepEqual(
    firestore.get("eventSuccessAssignments/event-1_micro_pods_runner-1")
      ?.peerUids,
    ["runner-3"]
  );
  assert.equal(
    firestore.get("eventSuccessAssignments/event-1_micro_pods_runner-2"),
    undefined
  );
});

test("prefers checked-in attendees once a live pod can be formed", async () => {
  const {firestore, deps} = harness({
    "eventParticipations/event-1_runner-1": {
      eventId: "event-1",
      uid: "runner-1",
      status: "attended",
    },
    "eventParticipations/event-1_runner-2": {
      eventId: "event-1",
      uid: "runner-2",
      status: "attended",
    },
    "eventParticipations/event-1_runner-3": {
      eventId: "event-1",
      uid: "runner-3",
      status: "signedUp",
    },
    "eventParticipations/event-1_runner-4": {
      eventId: "event-1",
      uid: "runner-4",
      status: "signedUp",
    },
    "eventSuccessAssignments/event-1_micro_pods_runner-3": {
      eventId: "event-1",
      moduleId: "micro_pods",
      uid: "runner-3",
    },
  });

  const result = await generateEventSuccessPodsHandler(
    callableRequest("host-1"),
    deps
  );

  assert.deepEqual(result, {assignmentCount: 2, podCount: 1});
  assert.deepEqual(
    firestore.get("eventSuccessAssignments/event-1_micro_pods_runner-1")
      ?.peerUids,
    ["runner-2"]
  );
  assert.deepEqual(
    firestore.get("eventSuccessAssignments/event-1_micro_pods_runner-2")
      ?.peerUids,
    ["runner-1"]
  );
  assert.equal(
    firestore.get("eventSuccessAssignments/event-1_micro_pods_runner-3"),
    undefined
  );
  assert.equal(
    firestore.get("eventSuccessAssignments/event-1_micro_pods_runner-4"),
    undefined
  );
});

test("uses profile cohorts as pod balancing tie-breakers", async () => {
  const {firestore, deps} = harness({
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["micro_pods"],
      structureConfig: {
        unitKind: "pods",
        unitSize: 2,
        unitCount: 2,
      },
    },
    "eventParticipations/event-1_runner-1": participation("runner-1"),
    "eventParticipations/event-1_runner-2": participation("runner-2"),
    "eventParticipations/event-1_runner-3": participation("runner-3"),
    "eventParticipations/event-1_runner-4": participation("runner-4"),
    "users/runner-1": user("man", ["woman"]),
    "users/runner-2": user("man", ["woman"]),
    "users/runner-3": user("woman", ["man"]),
    "users/runner-4": user("woman", ["man"]),
  });

  const result = await generateEventSuccessPodsHandler(
    callableRequest("host-1"),
    deps
  );

  assert.deepEqual(result, {assignmentCount: 4, podCount: 2});
  assert.deepEqual(
    firestore.get("eventSuccessAssignments/event-1_micro_pods_runner-1")
      ?.peerUids,
    ["runner-3"]
  );
  assert.deepEqual(
    firestore.get("eventSuccessAssignments/event-1_micro_pods_runner-2")
      ?.peerUids,
    ["runner-4"]
  );
});

test("configured consented answers influence published pod groups",
  async () => {
    const ids = ["runner-1", "runner-2", "runner-3", "runner-4"];
    const stamp = {_seconds: 1, _nanoseconds: 0};
    const rule = {featureId: "pace", formId: "form-1",
      versionId: "version-1", questionId: "question-1",
      transformVersion: 1, kind: "category", mode: "preferSimilar",
      weight: 100, optionIds: ["option-a", "option-b"]};
    const source = Object.fromEntries(ids.flatMap((uid) => {
      const choice = ["runner-1", "runner-3"].includes(uid) ? "a" : "b";
      return [
        [`eventParticipations/event-1_${uid}`, participation(uid)],
        [`organizerFormResponses/response-${uid}`, {
          organizerId: "club-1", formId: "form-1",
          versionId: "version-1", status: "submitted",
          respondentUid: uid, identityKind: "phoneVerified",
          withdrawnAt: null, answers: {"question-1": choice},
        }],
        [`eventAssignmentFeatureConsents/${assignmentFeatureConsentId(
          "event-1", uid, "pace")}`, {
          eventId: "event-1", organizerId: "club-1", uid,
          responseId: `response-${uid}`, featureId: "pace",
          formId: "form-1", versionId: "version-1",
          questionId: "question-1", transformVersion: 1,
          purpose: "eventAssignmentMatching", status: "granted",
          receiptId: `receipt-${uid}`, revision: 1,
          lastRequestId: `grant-${uid}`, createdAt: stamp,
          updatedAt: stamp,
        }],
      ];
    }));
    const {firestore, deps} = harness({
      ...source,
      "organizerFormVersions/version-1": {organizerId: "club-1",
        formId: "form-1", definition: {sections: [{questions: [{
          questionId: "question-1", privacyClass: "organizerCustom",
          kind: "singleChoice", options: [
            {optionId: "option-a", value: "a"},
            {optionId: "option-b", value: "b"},
          ],
        }]}]}},
      "eventSuccessPlans/event-1": {eventId: "event-1",
        organizerId: "club-1", selectedModuleIds: ["micro_pods"],
        assignmentFeatureRules: [rule], assignmentFeatureRevision: 1,
        assignmentFeatureConfigHash: "hash-1",
        structureConfig: {unitKind: "pods", unitSize: 2, unitCount: 2}},
    });
    await generateEventSuccessPodsHandler(callableRequest("host-1"), deps);
    const runnerOne = firestore.get(
      "eventSuccessAssignments/event-1_micro_pods_runner-1");
    assert.deepEqual(runnerOne?.peerUids, ["runner-3"]);
    const audit = runnerOne?.assignmentFeatureAudit as FakeData;
    assert.equal(audit.algorithmVersion, "typed-soft-features-v1");
    assert.equal(audit.configHash, "hash-1");
    assert.match(audit.inputSnapshotId as string, /^[a-f0-9]{64}$/u);
    assert.equal(JSON.stringify(runnerOne).includes("response-runner"), false);
    assert.equal(JSON.stringify(runnerOne).includes("answer"), false);

    firestore.beforeTransaction = () => firestore.merge(
      `eventAssignmentFeatureConsents/${assignmentFeatureConsentId(
        "event-1", "runner-1", "pace")}`,
      {status: "withdrawn", receiptId: "withdrawn-2"});
    await assert.rejects(() => generateEventSuccessPodsHandler(
      callableRequest("host-1"), deps), (error) => {
      isHttpsError(error, "aborted", "consent or source changed");
      return true;
    });
    firestore.beforeTransaction = () => firestore.merge(
      "eventSuccessPlans/event-1", {assignmentFeatureConfigHash: "new-hash"});
    firestore.merge(`eventAssignmentFeatureConsents/${
      assignmentFeatureConsentId("event-1", "runner-1", "pace")}`,
    {status: "granted", receiptId: "receipt-runner-1"});
    await assert.rejects(() => generateEventSuccessPodsHandler(
      callableRequest("host-1"), deps), (error) => {
      isHttpsError(error, "aborted", "setup changed");
      return true;
    });
  });

test("custom team formats generate balanced teams", async () => {
  const {firestore, deps} = harness({
    "events/event-1": {
      organizerId: "club-1",
      status: "active",
      eventFormat: {
        version: 1,
        activityKind: "openActivity",
        interactionModel: "openFormat",
        customActivityLabel: "Trivia night",
        eventSuccessPrimitives: {
          assignmentAlgorithm: "teamBalancer",
          compatibilityPolicy: "mutualInterestOnly",
        },
      },
    },
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["micro_pods"],
      structureConfig: {
        unitKind: "teams",
        unitSize: 3,
        unitCount: 2,
      },
    },
    "eventParticipations/event-1_gay-man-1": participation("gay-man-1"),
    "eventParticipations/event-1_gay-man-2": participation("gay-man-2"),
    "eventParticipations/event-1_straight-man-1":
      participation("straight-man-1"),
    "eventParticipations/event-1_straight-man-2":
      participation("straight-man-2"),
    "eventParticipations/event-1_straight-woman-1":
      participation("straight-woman-1"),
    "eventParticipations/event-1_straight-woman-2":
      participation("straight-woman-2"),
    "users/gay-man-1": user("man", ["man"]),
    "users/gay-man-2": user("man", ["man"]),
    "users/straight-man-1": user("man", ["woman"]),
    "users/straight-man-2": user("man", ["woman"]),
    "users/straight-woman-1": user("woman", ["man"]),
    "users/straight-woman-2": user("woman", ["man"]),
  });

  const result = await generateEventSuccessPodsHandler(
    callableRequest("host-1"),
    deps
  );

  assert.deepEqual(result, {assignmentCount: 6, podCount: 2});
  const assignment = firestore.get(
    "eventSuccessAssignments/event-1_micro_pods_gay-man-1"
  ) as {unitKind?: string; peerUids?: string[]} | undefined;
  assert.equal(assignment?.unitKind, "teams");
  assert.equal(assignment?.peerUids?.length, 2);
});

test("rejects a format with no assignment algorithm", async () => {
  const {firestore, deps} = harness({
    "events/event-1": {
      organizerId: "club-1",
      status: "active",
      startTime: fakeTimestamp("2026-05-21T08:00:00.000Z"),
      endTime: fakeTimestamp("2026-05-21T08:40:00.000Z"),
      eventFormat: {
        version: 1,
        activityKind: "openActivity",
        interactionModel: "openFormat",
      },
    },
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["micro_pods"],
      structureConfig: {
        unitKind: "tables",
        unitSize: 3,
        unitCount: 2,
        rotationIntervalMinutes: 20,
      },
    },
    "eventParticipations/event-1_runner-1": participation("runner-1"),
    "eventParticipations/event-1_runner-2": participation("runner-2"),
    "eventParticipations/event-1_runner-3": participation("runner-3"),
    "eventParticipations/event-1_runner-4": participation("runner-4"),
    "eventParticipations/event-1_runner-5": participation("runner-5"),
    "eventParticipations/event-1_runner-6": participation("runner-6"),
  });

  await assert.rejects(
    generateEventSuccessPodsHandler(callableRequest("host-1"), deps),
    (error: unknown) => {
      isHttpsError(error, "failed-precondition", "does not select");
      return true;
    }
  );

  assert.equal(
    firestore.get("eventSuccessAssignments/event-1_micro_pods_runner-1"),
    undefined
  );
});

test("lets hosts override rotating table groups", async () => {
  const {firestore, deps, rateLimitCalls} = harness({
    "events/event-1": {
      organizerId: "club-1",
      status: "active",
      startTime: fakeTimestamp("2026-05-21T08:00:00.000Z"),
      endTime: fakeTimestamp("2026-05-21T08:40:00.000Z"),
      eventFormat: {
        version: 1,
        activityKind: "openActivity",
        interactionModel: "openFormat",
      },
    },
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["micro_pods"],
      structureConfig: {
        unitKind: "tables",
        unitSize: 2,
        unitCount: 2,
        rotationIntervalMinutes: 20,
      },
    },
    "eventParticipations/event-1_runner-1": participation("runner-1"),
    "eventParticipations/event-1_runner-2": participation("runner-2"),
    "eventParticipations/event-1_runner-3": participation("runner-3"),
    "eventParticipations/event-1_runner-4": participation("runner-4"),
  });

  const result = await overrideEventSuccessGroupsHandler(
    callableRequestWithData("host-1", {
      eventId: "event-1",
      rounds: [
        {
          roundIndex: 0,
          groups: [
            {label: "Table Red", participantUids: ["runner-1", "runner-2"]},
            {label: "Table Blue", participantUids: ["runner-3", "runner-4"]},
          ],
        },
        {
          roundIndex: 1,
          groups: [
            {label: "Table Red", participantUids: ["runner-1", "runner-3"]},
            {label: "Table Blue", participantUids: ["runner-2", "runner-4"]},
          ],
        },
      ],
    }),
    deps
  );

  assert.deepEqual(result, {assignmentCount: 4, roundCount: 2, groupCount: 4});
  assert.deepEqual(rateLimitCalls, ["host-1:overrideEventSuccessGroups"]);
  const runnerOne = firestore.get(
    "eventSuccessAssignments/event-1_micro_pods_runner-1"
  );
  const slots = runnerOne?.groupRotationSlots as FakeData[];
  assert.equal(runnerOne?.source, "host_override_v1");
  assert.equal(runnerOne?.displayTitle, "2 table rotations");
  assert.deepEqual(runnerOne?.peerUids, ["runner-2", "runner-3"]);
  assert.equal(slots[0].unitLabel, "Table Red");
  assert.equal(slots[0].compatibility, "host_override");
  assert.deepEqual(slots[1].peerUids, ["runner-3"]);
});

test("lets hosts override static team groups", async () => {
  const {firestore, deps} = harness({
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["micro_pods"],
      structureConfig: {
        unitKind: "teams",
        unitSize: 2,
        unitCount: 2,
      },
    },
    "eventParticipations/event-1_runner-1": participation("runner-1"),
    "eventParticipations/event-1_runner-2": participation("runner-2"),
    "eventParticipations/event-1_runner-3": participation("runner-3"),
    "eventParticipations/event-1_runner-4": participation("runner-4"),
  });

  const result = await overrideEventSuccessGroupsHandler(
    callableRequestWithData("host-1", {
      eventId: "event-1",
      rounds: [
        {
          roundIndex: 0,
          groups: [
            {label: "Quiz Team 1", participantUids: ["runner-1", "runner-3"]},
            {label: "Quiz Team 2", participantUids: ["runner-2", "runner-4"]},
          ],
        },
      ],
    }),
    deps
  );

  assert.deepEqual(result, {assignmentCount: 4, roundCount: 1, groupCount: 2});
  const runnerOne = firestore.get(
    "eventSuccessAssignments/event-1_micro_pods_runner-1"
  );
  assert.equal(runnerOne?.displayTitle, "Quiz Team 1");
  assert.equal(runnerOne?.source, "host_override_v1");
  assert.deepEqual(runnerOne?.peerUids, ["runner-3"]);
  assert.equal(runnerOne?.groupRotationSlots, undefined);
});

test("rejects blocked attendees in host group overrides", async () => {
  const {deps} = harness({
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["micro_pods"],
      structureConfig: {
        unitKind: "teams",
        unitSize: 2,
        unitCount: 1,
      },
    },
    "eventParticipations/event-1_runner-1": participation("runner-1"),
    "eventParticipations/event-1_runner-2": participation("runner-2"),
    "blocks/block-1": {
      blockerUserId: "runner-1",
      blockedUserId: "runner-2",
    },
  });

  await assert.rejects(
    () => overrideEventSuccessGroupsHandler(
      callableRequestWithData("host-1", {
        eventId: "event-1",
        rounds: [
          {
            roundIndex: 0,
            groups: [
              {label: "Team A", participantUids: ["runner-1", "runner-2"]},
            ],
          },
        ],
      }),
      deps
    ),
    (error) => {
      isHttpsError(error, "failed-precondition", "Blocked attendees");
      return true;
    }
  );
});

test("rejects non-host pod generation", async () => {
  const {deps} = harness();

  await assert.rejects(
    () => generateEventSuccessPodsHandler(callableRequest("runner-1"), deps),
    (error) => {
      isHttpsError(error, "permission-denied", "Only an organizer manager");
      return true;
    }
  );
});

test("rejects pod generation when the module is disabled", async () => {
  const {deps} = harness({
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["host_script"],
    },
  });

  await assert.rejects(
    () => generateEventSuccessPodsHandler(callableRequest("host-1"), deps),
    (error) => {
      isHttpsError(error, "failed-precondition", "Micro-pods are not enabled");
      return true;
    }
  );
});

test("uses the same group engine for pair-sized units", async () => {
  const {firestore, deps} = harness({
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["micro_pods"],
      structureConfig: {
        unitKind: "pairs",
        unitSize: 2,
      },
    },
    "eventParticipations/event-1_runner-1": participation("runner-1"),
    "eventParticipations/event-1_runner-2": participation("runner-2"),
  });

  const result = await generateEventSuccessPodsHandler(
    callableRequest("host-1"),
    deps
  );

  assert.deepEqual(result, {assignmentCount: 2, podCount: 1});
  const assignment = firestore.get(
    "eventSuccessAssignments/event-1_micro_pods_runner-1"
  );
  assert.equal(assignment?.displayTitle, "Pair A");
  assert.match(String(assignment?.displaySubtitle), /in this pair/);
});

function callableRequest(uid: string): CallableRequest<unknown> {
  return {
    auth: {uid},
    data: {eventId: "event-1"},
  } as CallableRequest<unknown>;
}

function callableRequestWithData(
  uid: string,
  data: unknown
): CallableRequest<unknown> {
  return {
    auth: {uid},
    data,
  } as CallableRequest<unknown>;
}

function participation(uid: string): FakeData {
  return {
    eventId: "event-1",
    uid,
    status: "signedUp",
  };
}

function user(gender: string, interestedInGenders: string[]): FakeData {
  return {gender, interestedInGenders};
}

function fakeTimestamp(isoString: string): {toMillis: () => number} {
  const millis = Date.parse(isoString);
  return {toMillis: () => millis};
}
