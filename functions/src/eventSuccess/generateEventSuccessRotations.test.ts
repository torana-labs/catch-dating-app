import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest} from "firebase-functions/v2/https";
import {
  generateEventSuccessRotationsHandler,
  overrideEventSuccessRotationsHandler,
} from "./generateEventSuccessRotations";
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

class FakeTransaction {
  constructor(private readonly firestore: FakeFirestore) {}

  async get(reference: {get: () => Promise<unknown>}): Promise<unknown> {
    return reference.get();
  }

  set(ref: FakeDocRef, data: FakeData, options?: {merge: boolean}) {
    if (options?.merge) {
      this.firestore.merge(ref.path, data);
    } else {
      this.firestore.set(ref.path, data);
    }
  }

  update(ref: FakeDocRef, data: FakeData) {
    this.firestore.merge(ref.path, data);
  }

  delete(ref: FakeDocRef) {
    this.firestore.delete(ref.path);
  }
}

class FakeFirestore {
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
    return callback(new FakeTransaction(this));
  }

  get(path: string): FakeData | undefined {
    const data = this.docs[path];
    if (data !== undefined) {
      return path.startsWith("events/") ?
        {...configuredEventFields(), ...data} : {...data};
    }
    const draftPath = path.replace(
      "eventSuccessAssignments/",
      "eventSuccessAssignmentDrafts/"
    );
    const draft = this.docs[draftPath];
    const assignment = draft?.assignment;
    return assignment !== null && typeof assignment === "object" ?
      {...assignment as FakeData} : undefined;
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
        activityKind: "pickleball",
        interactionModel: "pairedRotations",
      },
      startTime: fakeTimestamp("2026-05-21T08:00:00.000Z"),
      endTime: fakeTimestamp("2026-05-21T09:00:00.000Z"),
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
      selectedModuleIds: ["guided_rotations"],
      liveControlRevision: 0,
      assignmentDraftRevision: 0,
      publishedRotationRoundIndex: -1,
      structureConfig: {
        unitKind: "pairs",
        unitSize: 2,
        rotationIntervalMinutes: 15,
        revealCountdownSeconds: 10,
      },
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
      nowMillis: () => Date.parse("2026-05-21T08:10:01.000Z"),
      environment: {},
    },
  };
}

test(
  "excludes a monitored likely-departed attendee from the next draft",
  async () => {
    const {firestore, deps} = harness({
      ...participation("present-1", "attended"),
      ...participation("present-2", "attended"),
      ...participation("present-3", "attended"),
      ...participation("departed-1", "attended"),
      "users/present-1": user("man", ["woman"]),
      "users/present-2": user("woman", ["man"]),
      "users/present-3": user("man", ["woman"]),
      "users/departed-1": user("woman", ["man"]),
      "eventSuccessPresence/event-1_departed-1": {
        eventId: "event-1",
        uid: "departed-1",
        heartbeatAt: fakeTimestamp("2026-05-21T08:00:00.000Z"),
      },
    });

    await generateEventSuccessRotationsHandler(
      callableRequest("host-1"),
      deps
    );

    assert.equal(
      firestore.get(
        "eventSuccessAssignmentDrafts/event-1_guided_rotations_departed-1"
      ),
      undefined
    );
    assert.ok(firestore.get(
      "eventSuccessAssignmentDrafts/event-1_guided_rotations_present-1"
    ));
  }
);

test("incomplete setup cannot generate a rotation draft", async () => {
  const {deps} = harness({"events/event-1": {
    publicationState: "private",
    setupRevision: 1,
    endTime: undefined,
  }});
  await assert.rejects(generateEventSuccessRotationsHandler(
    callableRequest("host-1"), deps
  ), (error) => {
    isHttpsError(error, "failed-precondition",
      "This event needs a valid schedule and format.");
    return true;
  });
});

test("pickleball defaults to profile-free coverage schedules", async () => {
  const {firestore, deps, rateLimitCalls} = harness({
    ...participation("man-1"),
    ...participation("man-2"),
    ...participation("woman-1"),
    ...participation("woman-2"),
    "users/man-1": user("man", ["woman"]),
    "users/man-2": user("man", ["woman"]),
    "users/woman-1": user("woman", ["man"]),
    "users/woman-2": user("woman", ["man"]),
  });

  const result = await generateEventSuccessRotationsHandler(
    callableRequest("host-1"),
    deps
  );

  assert.deepEqual(result, {assignmentCount: 4, roundCount: 3});
  assert.deepEqual(rateLimitCalls, ["host-1:generateEventSuccessRotations"]);
  assert.equal(
    firestore.query("eventSuccessAssignments", []).length,
    0,
    "preparation must not write attendee-readable assignments"
  );
  const preparedDraft = firestore.get(
    "eventSuccessAssignmentDrafts/event-1_guided_rotations_man-1"
  );
  assert.equal(preparedDraft?.roundIndex, 0);
  assert.equal(preparedDraft?.baseAssignmentRevision, 1);
  assert.equal(
    (preparedDraft?.assignment as FakeData).moduleId,
    "guided_rotations"
  );
  assert.deepEqual(firestore.get("eventSuccessPlans/event-1"), {
    eventId: "event-1",
    organizerId: "club-1",
    selectedModuleIds: ["guided_rotations"],
    liveControlRevision: 1,
    assignmentDraftRevision: 1,
    publishedRotationRoundIndex: -1,
    affinityConstraints: [],
    spatialOverrides: [],
    structureConfig: {
      unitKind: "pairs",
      unitSize: 2,
      rotationIntervalMinutes: 15,
      revealCountdownSeconds: 10,
    },
    updatedAt: {__serverTimestamp: true},
  });
  const manOne = firestore.get(
    "eventSuccessAssignments/event-1_guided_rotations_man-1"
  );
  assert.equal(manOne?.displayTitle, "3 guided rotations");
  assert.deepEqual(manOne?.peerUids, ["man-2", "woman-1", "woman-2"]);
  const slots = manOne?.rotationSlots as Array<Record<string, unknown>>;
  assert.equal(slots.length, 3);
  assert.equal(slots[0].compatibility, "social");
  assert.equal(slots[0].label, "Round 1");
  assert.equal(slots[0].slotId, "round-0-pair-0");
  assert.equal(slots[0].unitKind, "pairs");
  assert.equal(slots[0].peerCount, 1);
  assert.ok((slots[0].whyCodes as string[]).includes("fresh_peer"));
  assert.deepEqual(manOne?.rotationFairness, {
    assignedRoundCount: 3,
    sitOutRoundCount: 0,
    uniquePeerCount: 3,
    repeatPeerCount: 0,
  });
});

test("configured consented answers affect generated rotation drafts",
  async () => {
    const ids = ["man-1", "man-2", "woman-1", "woman-2"];
    const stamp = {_seconds: 1, _nanoseconds: 0};
    const rule = {featureId: "pace", formId: "form-1",
      versionId: "version-1", questionId: "question-1",
      transformVersion: 1, kind: "category", mode: "preferSimilar",
      weight: 100, optionIds: ["option-a", "option-b"]};
    const answers = Object.fromEntries(ids.flatMap((uid) => {
      const choice = uid.endsWith("1") ? "a" : "b";
      return [
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
      ...Object.fromEntries(ids.flatMap((uid) => [
        ...Object.entries(participation(uid)),
        [`users/${uid}`, user(uid.startsWith("man") ? "man" :
          "woman", [uid.startsWith("man") ? "woman" : "man"])],
      ])),
      ...answers,
      "organizerFormVersions/version-1": {organizerId: "club-1",
        formId: "form-1", definition: {sections: [{questions: [{
          questionId: "question-1", privacyClass: "organizerCustom",
          kind: "singleChoice", options: [
            {optionId: "option-a", value: "a"},
            {optionId: "option-b", value: "b"},
          ],
        }]}]}},
      "eventSuccessPlans/event-1": {eventId: "event-1",
        organizerId: "club-1", selectedModuleIds: ["guided_rotations"],
        liveControlRevision: 0, assignmentDraftRevision: 0,
        publishedRotationRoundIndex: -1,
        assignmentFeatureRules: [rule], assignmentFeatureRevision: 1,
        assignmentFeatureConfigHash: "hash-1",
        structureConfig: {unitKind: "pairs", unitSize: 2,
          rotationIntervalMinutes: 15, revealCountdownSeconds: 10}},
    });
    await generateEventSuccessRotationsHandler(
      callableRequest("host-1"), deps);
    const manOne = firestore.get(
      "eventSuccessAssignmentDrafts/event-1_guided_rotations_man-1");
    const assignment = manOne?.assignment as FakeData;
    const slots = assignment.rotationSlots as Array<FakeData>;
    assert.equal(slots[0].peerUid, "woman-1");
    const guard = manOne?.assignmentFeatureGuard as FakeData;
    assert.equal(guard.configHash, "hash-1");
    assert.equal((guard.snapshots as unknown[]).length, 1);
    const audit = assignment.assignmentFeatureAudit as FakeData;
    assert.equal(audit.algorithmVersion, "typed-soft-features-v1");
    assert.equal(audit.configHash, "hash-1");
    assert.match(audit.inputSnapshotId as string, /^[a-f0-9]{64}$/u);
    assert.equal(JSON.stringify(assignment).includes("response-man"), false);
    assert.equal(JSON.stringify(assignment).includes("answer"), false);

    for (let index = 0; index < 401; index++) {
      firestore.set(`eventSuccessAssignmentDrafts/old-${index}`, {
        eventId: "event-1", moduleId: "guided_rotations",
        roundIndex: 0, uid: `old-${index}`});
    }
    await assert.rejects(() => generateEventSuccessRotationsHandler(
      callableRequest("host-1", {expectedRevision: 1}), deps), (error) => {
      isHttpsError(error, "failed-precondition", "supported draft size");
      return true;
    });
  });

test("sequence topology uses configured court capacity", async () => {
  const {firestore, deps} = harness({
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["guided_rotations"],
      liveControlRevision: 0,
      assignmentDraftRevision: 0,
      publishedRotationRoundIndex: -1,
      layoutId: "courts",
      structureConfig: {
        unitKind: "pairs",
        unitSize: 2,
        rotationIntervalMinutes: 15,
        topology: "sequence",
        resourceCapacity: {
          concurrentUnits: 1,
          resourceLabelId: "court",
          seatsPerUnit: null,
        },
        revealCountdownSeconds: 10,
      },
    },
    "organizerEventSuccessLayouts/club-1_courts": {
      organizerId: "club-1",
      layoutId: "courts",
      label: "One court",
      units: [{
        id: "court-a",
        label: "A",
        shape: "court",
        capacity: 2,
        gridX: 0,
        gridY: 0,
        order: 1,
      }],
    },
    ...participation("man-1"),
    ...participation("man-2"),
    ...participation("woman-1"),
    ...participation("woman-2"),
    "users/man-1": user("man", ["woman"]),
    "users/man-2": user("man", ["woman"]),
    "users/woman-1": user("woman", ["man"]),
    "users/woman-2": user("woman", ["man"]),
  });

  const result = await generateEventSuccessRotationsHandler(
    callableRequest("host-1"),
    deps
  );

  assert.deepEqual(result, {assignmentCount: 4, roundCount: 4});
  const assignments = ["man-1", "man-2", "woman-1", "woman-2"].map(
    (uid) => firestore.get(
      `eventSuccessAssignments/event-1_guided_rotations_${uid}`
    ) as FakeData
  );
  const sitOutCounts = assignments.map((assignment) =>
    (assignment.sitOutSlots as unknown[] | undefined)?.length ?? 0
  );
  assert.ok(Math.max(...sitOutCounts) - Math.min(...sitOutCounts) <= 1);
  for (const assignment of assignments) {
    const slots = assignment.rotationSlots as Array<Record<string, unknown>>;
    assert.ok(slots.every((slot) => slot.resourceUnitId === "court-a"));
    assert.ok(slots.every((slot) =>
      (slot.label as string).includes("Court 1")
    ));
  }
});

test("adjacency topology fails instead of using pair rotations", async () => {
  const {deps} = harness({
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["guided_rotations"],
      structureConfig: {
        unitKind: "tables",
        unitSize: 4,
        topology: "adjacency",
        revealCountdownSeconds: 10,
      },
    },
  });

  await assert.rejects(
    () => generateEventSuccessRotationsHandler(callableRequest("host-1"), deps),
    (error) => {
      isHttpsError(error, "failed-precondition", "not implemented");
      return true;
    }
  );
});

test("does not prepare a phantom round after the schedule ends", async () => {
  const {firestore, deps} = harness({
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["guided_rotations"],
      liveControlRevision: 4,
      assignmentDraftRevision: 3,
      publishedRotationRoundIndex: 2,
      structureConfig: {
        unitKind: "pairs",
        unitSize: 2,
        rotationIntervalMinutes: 15,
        revealCountdownSeconds: 10,
      },
    },
    "eventSuccessAssignmentDrafts/event-1_guided_rotations_stale": {
      eventId: "event-1",
      moduleId: "guided_rotations",
      roundIndex: 2,
      baseAssignmentRevision: 3,
      assignment: {},
    },
    ...participation("man-1"),
    ...participation("man-2"),
    ...participation("woman-1"),
    ...participation("woman-2"),
    "users/man-1": user("man", ["woman"]),
    "users/man-2": user("man", ["woman"]),
    "users/woman-1": user("woman", ["man"]),
    "users/woman-2": user("woman", ["man"]),
  });

  const result = await generateEventSuccessRotationsHandler(
    callableRequest("host-1", {expectedRevision: 4}),
    deps
  );

  assert.deepEqual(result, {assignmentCount: 0, roundCount: 3});
  assert.equal(
    firestore.query("eventSuccessAssignmentDrafts", []).length,
    0
  );
});

test("uses the saved event-structure rotation cadence", async () => {
  const {firestore, deps} = harness({
    "events/event-1": {
      organizerId: "club-1",
      status: "active",
      eventFormat: {
        version: 1,
        activityKind: "pickleball",
        interactionModel: "pairedRotations",
      },
      startTime: fakeTimestamp("2026-05-21T08:00:00.000Z"),
      endTime: fakeTimestamp("2026-05-21T08:45:00.000Z"),
    },
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["guided_rotations"],
      structureConfig: {
        unitKind: "pairs",
        unitSize: 2,
        rotationIntervalMinutes: 20,
        revealCountdownSeconds: 10,
      },
    },
    ...participation("man-1"),
    ...participation("man-2"),
    ...participation("man-3"),
    ...participation("woman-1"),
    ...participation("woman-2"),
    ...participation("woman-3"),
    "users/man-1": user("man", ["woman"]),
    "users/man-2": user("man", ["woman"]),
    "users/man-3": user("man", ["woman"]),
    "users/woman-1": user("woman", ["man"]),
    "users/woman-2": user("woman", ["man"]),
    "users/woman-3": user("woman", ["man"]),
  });

  const result = await generateEventSuccessRotationsHandler(
    callableRequest("host-1"),
    deps
  );

  assert.deepEqual(result, {assignmentCount: 6, roundCount: 2});
  const assignment = firestore.get(
    "eventSuccessAssignments/event-1_guided_rotations_man-1"
  );
  assert.match(String(assignment?.displaySubtitle), /20 min each/);
});

test("honors saved allow-exhausted rotation repeat policy", async () => {
  const {firestore, deps} = harness({
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["guided_rotations"],
      structureConfig: {
        unitKind: "pairs",
        unitSize: 2,
        rotationIntervalMinutes: 15,
        revealCountdownSeconds: 10,
        rotationRepeatStrategy: "allowWhenExhausted",
        maxPairMeetings: 2,
      },
    },
    ...participation("man-1"),
    ...participation("woman-1"),
    "users/man-1": user("man", ["woman"]),
    "users/woman-1": user("woman", ["man"]),
  });

  const result = await generateEventSuccessRotationsHandler(
    callableRequest("host-1"),
    deps
  );

  assert.deepEqual(result, {assignmentCount: 2, roundCount: 2});
  const assignment = firestore.get(
    "eventSuccessAssignments/event-1_guided_rotations_man-1"
  );
  assert.equal(assignment?.displayTitle, "2 guided rotations");
  assert.deepEqual(assignment?.rotationFairness, {
    assignedRoundCount: 2,
    sitOutRoundCount: 0,
    uniquePeerCount: 1,
    repeatPeerCount: 1,
  });
  const slots = assignment?.rotationSlots as Array<Record<string, unknown>>;
  assert.equal(slots[1].peerUid, "woman-1");
  assert.ok((slots[1].whyCodes as string[]).includes("repeat_peer"));
});

test(
  "uses questionnaire answers as an opt-in rotation ranking boost",
  async () => {
    const {firestore, deps} = harness({
      "events/event-1": rotationEvent({
        assignmentAlgorithm: "pairRotations",
        compatibilityPolicy: "questionnaireClueOnly",
        matchingObjective: "affinity",
      }),
      "eventSuccessPlans/event-1": {
        eventId: "event-1",
        organizerId: "club-1",
        selectedModuleIds: [
          "guided_rotations",
          "compatibility_questionnaire",
        ],
        compatibilityAffectsRanking: true,
      },
      ...participation("man-1"),
      ...participation("woman-1"),
      ...participation("woman-2"),
      "users/man-1": user("man", ["woman"]),
      "users/woman-1": user("woman", ["man"]),
      "users/woman-2": user("woman", ["man"]),
      ...compatibilityResponse("man-1", [
        "event_energy_new_people",
        "first_conversation_activity",
      ]),
      ...compatibilityResponse("woman-1", [
        "event_energy_quiet_chemistry",
        "first_conversation_joke",
      ]),
      ...compatibilityResponse("woman-2", [
        "event_energy_new_people",
        "first_conversation_activity",
      ]),
    });

    await generateEventSuccessRotationsHandler(callableRequest("host-1"), deps);

    const manOne = firestore.get(
      "eventSuccessAssignments/event-1_guided_rotations_man-1"
    );
    const slots = manOne?.rotationSlots as Array<Record<string, unknown>>;
    assert.equal(slots[0].peerUid, "woman-2");
    assert.equal(slots[0].compatibility, "questionnaire_match");
  }
);

test(
  "prioritizes mutual interest before fallback rotation pairings",
  async () => {
    const {firestore, deps} = harness({
      "events/event-1": rotationEvent({
        assignmentAlgorithm: "pairRotations",
        compatibilityPolicy: "mutualInterestOnly",
        matchingObjective: "romantic",
      }),
      "eventSuccessPlans/event-1": {
        eventId: "event-1",
        organizerId: "club-1",
        selectedModuleIds: [
          "guided_rotations",
          "compatibility_questionnaire",
        ],
        compatibilityAffectsRanking: true,
        structureConfig: {
          unitKind: "pairs",
          unitSize: 2,
          rotationIntervalMinutes: 15,
          revealCountdownSeconds: 10,
        },
      },
      ...participation("man-1"),
      ...participation("woman-1"),
      ...participation("nb-1"),
      "users/man-1": user("man", ["woman"]),
      "users/woman-1": user("woman", ["man"]),
      "users/nb-1": user("nonbinary", ["woman"]),
    });

    const result = await generateEventSuccessRotationsHandler(
      callableRequest("host-1"),
      deps
    );

    assert.deepEqual(result, {assignmentCount: 3, roundCount: 2});
    const manOne = firestore.get(
      "eventSuccessAssignments/event-1_guided_rotations_man-1"
    );
    const nonbinaryAttendee = firestore.get(
      "eventSuccessAssignments/event-1_guided_rotations_nb-1"
    );
    assert.deepEqual(manOne?.peerUids, ["woman-1"]);
    assert.deepEqual(nonbinaryAttendee?.peerUids, ["woman-1"]);
  }
);

test(
  "falls back to coverage when affinity ranking is disabled",
  async () => {
    const {firestore, deps} = harness({
      "events/event-1": rotationEvent({
        assignmentAlgorithm: "pairRotations",
        compatibilityPolicy: "questionnaireClueOnly",
        matchingObjective: "affinity",
      }),
      "eventSuccessPlans/event-1": {
        eventId: "event-1",
        organizerId: "club-1",
        selectedModuleIds: [
          "guided_rotations",
          "compatibility_questionnaire",
        ],
        compatibilityAffectsRanking: false,
      },
      ...participation("man-1"),
      ...participation("woman-1"),
      ...participation("woman-2"),
      "users/man-1": user("man", ["woman"]),
      "users/woman-1": user("woman", ["man"]),
      "users/woman-2": user("woman", ["man"]),
      ...compatibilityResponse("man-1", [
        "event_energy_new_people",
        "first_conversation_activity",
      ]),
      ...compatibilityResponse("woman-2", [
        "event_energy_new_people",
        "first_conversation_activity",
      ]),
    });

    await generateEventSuccessRotationsHandler(callableRequest("host-1"), deps);

    const manOne = firestore.get(
      "eventSuccessAssignments/event-1_guided_rotations_man-1"
    );
    const slots = manOne?.rotationSlots as Array<Record<string, unknown>>;
    assert.equal(slots[0].peerUid, "woman-1");
    assert.equal(slots[0].compatibility, "social");
  }
);

test(
  "falls back to coverage when the questionnaire module is absent",
  async () => {
    const {firestore, deps} = harness({
      "events/event-1": rotationEvent({
        assignmentAlgorithm: "pairRotations",
        compatibilityPolicy: "questionnaireClueOnly",
        matchingObjective: "affinity",
      }),
      "eventSuccessPlans/event-1": {
        eventId: "event-1",
        organizerId: "club-1",
        selectedModuleIds: ["guided_rotations"],
        compatibilityAffectsRanking: true,
      },
      ...participation("man-1"),
      ...participation("woman-1"),
      ...participation("woman-2"),
      "users/man-1": user("man", ["woman"]),
      "users/woman-1": user("woman", ["man"]),
      "users/woman-2": user("woman", ["man"]),
      ...compatibilityResponse("man-1", [
        "event_energy_new_people",
        "first_conversation_activity",
      ]),
      ...compatibilityResponse("woman-2", [
        "event_energy_new_people",
        "first_conversation_activity",
      ]),
    });

    await generateEventSuccessRotationsHandler(callableRequest("host-1"), deps);

    const manOne = firestore.get(
      "eventSuccessAssignments/event-1_guided_rotations_man-1"
    );
    const slots = manOne?.rotationSlots as Array<Record<string, unknown>>;
    assert.equal(slots[0].peerUid, "woman-1");
    assert.equal(slots[0].compatibility, "social");
  }
);

test(
  "uses event duration and removes opted-out stale drafts",
  async () => {
    const {firestore, deps} = harness({
      "events/event-1": {
        organizerId: "club-1",
        status: "active",
        eventFormat: {
          version: 1,
          activityKind: "pickleball",
          interactionModel: "pairedRotations",
          eventSuccessPrimitives: {
            assignmentAlgorithm: "pairRotations",
            compatibilityPolicy: "mutualInterestOnly",
            matchingObjective: "romantic",
          },
        },
        startTime: fakeTimestamp("2026-05-21T08:00:00.000Z"),
        endTime: fakeTimestamp("2026-05-21T08:30:00.000Z"),
      },
      ...participation("man-1"),
      ...participation("woman-1"),
      ...participation("woman-2"),
      "users/man-1": user("man", ["woman"]),
      "users/woman-1": user("woman", ["man"]),
      "users/woman-2": user("woman", ["man"]),
      "eventSuccessPreferences/event-1_woman-2": {
        eventId: "event-1",
        uid: "woman-2",
        guidedRotationsOptedOut: true,
      },
      "eventSuccessAssignmentDrafts/event-1_guided_rotations_woman-2": {
        eventId: "event-1",
        organizerId: "club-1",
        moduleId: "guided_rotations",
        uid: "woman-2",
        roundIndex: 0,
        baseAssignmentRevision: 1,
        assignment: {
          eventId: "event-1",
          moduleId: "guided_rotations",
          uid: "woman-2",
        },
      },
    });

    const result = await generateEventSuccessRotationsHandler(
      callableRequest("host-1"),
      deps
    );

    assert.deepEqual(result, {assignmentCount: 2, roundCount: 1});
    assert.equal(
      firestore.get("eventSuccessAssignments/event-1_guided_rotations_woman-2"),
      undefined
    );
  }
);

test("keeps blocked participant pairs out of rotations", async () => {
  const {firestore, deps} = harness({
    ...participation("man-1"),
    ...participation("man-2"),
    ...participation("woman-1"),
    ...participation("woman-2"),
    "users/man-1": user("man", ["woman"]),
    "users/man-2": user("man", ["woman"]),
    "users/woman-1": user("woman", ["man"]),
    "users/woman-2": user("woman", ["man"]),
    "blocks/woman-1__man-1": {
      blockerUserId: "woman-1",
      blockedUserId: "man-1",
    },
  });

  await generateEventSuccessRotationsHandler(callableRequest("host-1"), deps);

  const manOne = firestore.get(
    "eventSuccessAssignments/event-1_guided_rotations_man-1"
  );
  assert.ok(!(manOne?.peerUids as string[]).includes("woman-1"));
});

test(
  "exhausts mutual-interest rotations before fallback pairings",
  async () => {
    const {firestore, deps} = harness({
      "events/event-1": rotationEvent({
        assignmentAlgorithm: "pairRotations",
        compatibilityPolicy: "mutualInterestOnly",
        matchingObjective: "romantic",
      }, "2026-05-21T08:45:00.000Z"),
      ...participation("man-1"),
      ...participation("man-2"),
      ...participation("woman-1"),
      ...participation("woman-2"),
      ...participation("nb-1"),
      "users/man-1": user("man", ["woman"]),
      "users/man-2": user("man", ["woman"]),
      "users/woman-1": user("woman", ["man"]),
      "users/woman-2": user("woman", ["man"]),
      "users/nb-1": user("nonbinary", ["woman"]),
    });

    const result = await generateEventSuccessRotationsHandler(
      callableRequest("host-1"),
      deps
    );

    assert.deepEqual(result, {assignmentCount: 5, roundCount: 3});
    const nonbinaryAttendee = firestore.get(
      "eventSuccessAssignments/event-1_guided_rotations_nb-1"
    );
    const slots = nonbinaryAttendee?.rotationSlots as
      Array<Record<string, unknown>>;
    const sitOutSlots = nonbinaryAttendee?.sitOutSlots as
      Array<Record<string, unknown>>;
    assert.equal(slots.length, 1);
    assert.equal(slots[0].compatibility, "one_way_interest");
    assert.equal(sitOutSlots.length, 2);
    assert.equal((sitOutSlots[0].whyCodes as string[])[0], "sit_out");
    assert.deepEqual(nonbinaryAttendee?.rotationFairness, {
      assignedRoundCount: 1,
      sitOutRoundCount: 2,
      uniquePeerCount: 1,
      repeatPeerCount: 0,
    });
  }
);

test("rejects rotation generation when the module is disabled", async () => {
  const {deps} = harness({
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["micro_pods"],
    },
  });

  await assert.rejects(
    () => generateEventSuccessRotationsHandler(callableRequest("host-1"), deps),
    (error) => {
      isHttpsError(error, "failed-precondition", "Guided rotations");
      return true;
    }
  );
});

test("rejects pair rotations for larger unit sizes", async () => {
  const {deps} = harness({
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["guided_rotations"],
      structureConfig: {
        unitKind: "teams",
        unitSize: 5,
        revealCountdownSeconds: 10,
      },
    },
  });

  await assert.rejects(
    () => generateEventSuccessRotationsHandler(callableRequest("host-1"), deps),
    (error) => {
      isHttpsError(error, "failed-precondition", "two-person units");
      return true;
    }
  );
});

test("lets hosts override rotation pairings", async () => {
  const {firestore, deps, rateLimitCalls} = harness({
    ...participation("man-1"),
    ...participation("man-2"),
    ...participation("woman-1"),
    "users/man-1": user("man", ["woman"]),
    "users/man-2": user("man", ["woman"]),
    "users/woman-1": user("woman", ["man"]),
  });

  const result = await overrideEventSuccessRotationsHandler(
    callableRequest("host-1", {
      eventId: "event-1",
      rounds: [
        {
          roundIndex: 0,
          pairings: [{uidA: "man-1", uidB: "man-2"}],
        },
        {
          roundIndex: 1,
          pairings: [{uidA: "man-1", uidB: "woman-1"}],
        },
      ],
    }),
    deps
  );

  assert.deepEqual(result, {assignmentCount: 3, roundCount: 2});
  assert.deepEqual(rateLimitCalls, ["host-1:overrideEventSuccessRotations"]);
  const manOne = firestore.get(
    "eventSuccessAssignments/event-1_guided_rotations_man-1"
  );
  assert.equal(manOne?.source, "host_override_v1");
  assert.deepEqual(manOne?.peerUids, ["man-2", "woman-1"]);
  const slots = manOne?.rotationSlots as Array<Record<string, unknown>>;
  assert.equal(slots[0].compatibility, "host_override");
  assert.equal(slots[1].label, "Round 2");
});

test("host override cannot exceed sequence resource capacity", async () => {
  const {deps} = harness({
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["guided_rotations"],
      liveControlRevision: 0,
      assignmentDraftRevision: 0,
      publishedRotationRoundIndex: -1,
      structureConfig: {
        unitKind: "pairs",
        unitSize: 2,
        rotationIntervalMinutes: 15,
        topology: "sequence",
        resourceCapacity: {
          concurrentUnits: 1,
          resourceLabelId: "court",
          seatsPerUnit: null,
        },
        revealCountdownSeconds: 10,
      },
    },
    ...participation("man-1"),
    ...participation("man-2"),
    ...participation("woman-1"),
    ...participation("woman-2"),
    "users/man-1": user("man", ["woman"]),
    "users/man-2": user("man", ["woman"]),
    "users/woman-1": user("woman", ["man"]),
    "users/woman-2": user("woman", ["man"]),
  });

  await assert.rejects(
    () => overrideEventSuccessRotationsHandler(
      callableRequest("host-1", {
        rounds: [{
          roundIndex: 0,
          pairings: [
            {uidA: "man-1", uidB: "woman-1"},
            {uidA: "man-2", uidB: "woman-2"},
          ],
        }],
      }),
      deps
    ),
    (error) => {
      isHttpsError(error, "failed-precondition", "resource capacity");
      return true;
    }
  );
});

test("rejects override pairings that repeat an attendee", async () => {
  const {deps} = harness({
    ...participation("man-1"),
    ...participation("man-2"),
    ...participation("woman-1"),
    "users/man-1": user("man", ["woman"]),
    "users/man-2": user("man", ["woman"]),
    "users/woman-1": user("woman", ["man"]),
  });

  await assert.rejects(
    () => overrideEventSuccessRotationsHandler(
      callableRequest("host-1", {
        eventId: "event-1",
        rounds: [
          {
            roundIndex: 0,
            pairings: [
              {uidA: "man-1", uidB: "woman-1"},
              {uidA: "man-1", uidB: "man-2"},
            ],
          },
        ],
      }),
      deps
    ),
    (error) => {
      isHttpsError(error, "invalid-argument", "only one partner");
      return true;
    }
  );
});

test("rejects override schedules without any pairs", async () => {
  const {deps} = harness({
    ...participation("man-1"),
    ...participation("woman-1"),
    "users/man-1": user("man", ["woman"]),
    "users/woman-1": user("woman", ["man"]),
  });

  await assert.rejects(
    () => overrideEventSuccessRotationsHandler(
      callableRequest("host-1", {
        eventId: "event-1",
        rounds: [
          {
            roundIndex: 0,
            pairings: [],
          },
        ],
      }),
      deps
    ),
    (error) => {
      isHttpsError(error, "invalid-argument", "at least one rotation pair");
      return true;
    }
  );
});

test("rejects override pairings for blocked attendees", async () => {
  const {deps} = harness({
    ...participation("man-1"),
    ...participation("woman-1"),
    "users/man-1": user("man", ["woman"]),
    "users/woman-1": user("woman", ["man"]),
    "blocks/woman-1__man-1": {
      blockerUserId: "woman-1",
      blockedUserId: "man-1",
    },
  });

  await assert.rejects(
    () => overrideEventSuccessRotationsHandler(
      callableRequest("host-1", {
        eventId: "event-1",
        rounds: [
          {
            roundIndex: 0,
            pairings: [{uidA: "man-1", uidB: "woman-1"}],
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

test(
  "allows safe host override pairings without mutual interest",
  async () => {
    const {deps} = harness({
      "eventSuccessPlans/event-1": {
        eventId: "event-1",
        organizerId: "club-1",
        selectedModuleIds: [
          "guided_rotations",
          "compatibility_questionnaire",
        ],
        compatibilityAffectsRanking: true,
        structureConfig: {
          unitKind: "pairs",
          unitSize: 2,
          rotationIntervalMinutes: 15,
          revealCountdownSeconds: 10,
        },
      },
      ...participation("woman-1"),
      ...participation("nb-1"),
      "users/woman-1": user("woman", ["man"]),
      "users/nb-1": user("nonbinary", ["woman"]),
    });

    const result = await overrideEventSuccessRotationsHandler(
      callableRequest("host-1", {
        eventId: "event-1",
        rounds: [
          {
            roundIndex: 0,
            pairings: [{uidA: "woman-1", uidB: "nb-1"}],
          },
        ],
      }),
      deps
    );

    assert.deepEqual(result, {assignmentCount: 2, roundCount: 1});
  }
);

function participation(
  uid: string,
  status: "signedUp" | "attended" = "signedUp"
): Record<string, FakeData> {
  return {
    [`eventParticipations/event-1_${uid}`]: {
      eventId: "event-1",
      uid,
      status,
      attendedAt: status === "attended" ?
        fakeTimestamp("2026-05-21T08:01:00.000Z") : null,
    },
  };
}

function compatibilityResponse(
  uid: string,
  answerIds: string[]
): Record<string, FakeData> {
  return {
    [`eventSuccessCompatibilityResponses/event-1_${uid}`]: {
      eventId: "event-1",
      uid,
      answerIds,
    },
  };
}

function user(gender: string, interestedInGenders: string[]): FakeData {
  return {
    gender,
    interestedInGenders,
  };
}

function rotationEvent(
  eventSuccessPrimitives: FakeData,
  endTime = "2026-05-21T09:00:00.000Z"
): FakeData {
  return {
    organizerId: "club-1",
    status: "active",
    eventFormat: {
      version: 1,
      activityKind: "pickleball",
      interactionModel: "pairedRotations",
      eventSuccessPrimitives,
    },
    startTime: fakeTimestamp("2026-05-21T08:00:00.000Z"),
    endTime: fakeTimestamp(endTime),
  };
}

function configuredEventFields(): FakeData {
  return {
    organizerId: "club-1",
    startTime: fakeTimestamp("2026-05-21T08:00:00.000Z"),
    endTime: fakeTimestamp("2026-05-21T09:00:00.000Z"),
    meetingPoint: "Court entrance",
    meetingLocation: {name: "Court", latitude: 19, longitude: 72},
    eventFormat: {
      version: 1,
      activityKind: "pickleball",
      interactionModel: "pairedRotations",
    },
    capacityLimit: 20,
    priceInPaise: 0,
  };
}

function callableRequest(
  uid: string,
  data: Record<string, unknown> = {}
): CallableRequest<unknown> {
  return {
    auth: {uid},
    data: {eventId: "event-1", expectedRevision: 0, ...data},
  } as CallableRequest<unknown>;
}

function fakeTimestamp(isoString: string) {
  const millis = Date.parse(isoString);
  return {
    toMillis: () => millis,
  };
}
