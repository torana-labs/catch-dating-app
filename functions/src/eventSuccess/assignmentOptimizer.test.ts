import assert from "node:assert/strict";
import test from "node:test";
import {
  AssignmentParticipant,
  buildOptimizedGroups,
  buildOptimizedRotationRounds,
  optimizeEventSuccessAssignments,
  runAssignmentEngine,
} from "./assignmentOptimizer";
import {
  EVENT_SUCCESS_ASSIGNMENT_ALGORITHMS,
  EVENT_SUCCESS_COMPATIBILITY_POLICIES,
  EVENT_SUCCESS_MATCHING_OBJECTIVES,
  EVENT_SUCCESS_TOPOLOGIES,
  EVENT_SUCCESS_UNIT_OUTCOMES,
  EVENT_SUCCESS_VARIABLE_RESOLUTION_TABLE,
  EventSuccessMatchingObjective,
} from "./formatPrimitives";
import {
  DEFAULT_EVENT_SUCCESS_EXCLUSION_ALERT_THRESHOLD_MINUTES,
  affinityConstraintScopeForPair,
  affinityRepeatPairScoreAdjustment,
  normalizeAssignmentConstraints,
} from "./assignmentConstraints";
import type {AssignmentFeatureRule,
  EventAssignmentFeatureSnapshot} from "./assignmentFeatureScoring";

test("typed answer feature changes pair order without relaxing blocked pairs",
  () => {
    const rule: AssignmentFeatureRule = {
      featureId: "pace", formId: "form", versionId: "version-1",
      questionId: "question", transformVersion: 1, kind: "category",
      mode: "preferSimilar", weight: 20, optionIds: ["easy", "fast"],
    };
    const snapshots: EventAssignmentFeatureSnapshot[] = [
      ["a", "easy"], ["b", "easy"], ["c", "fast"],
    ].map(([uid, optionId]) => ({
      eventId: "event", organizerId: "org", uid, featureId: "pace",
      formId: "form", versionId: "version-1", questionId: "question",
      transformVersion: 1, responseId: `response-${uid}`,
      consentReceiptId: `${uid}-grant`,
      value: {kind: "category", optionId},
    }));
    const params = {
      participants: ["a", "b", "c"].map(profileFreeParticipant),
      topology: pairTopology(1), assignmentAlgorithm: "pairRotations" as const,
      compatibilityPolicy: "none" as const,
      matchingObjective: "coverage" as const, rotationRoundCount: 1,
      softFeatures: {eventId: "event", organizerId: "org",
        rules: [rule], snapshots},
    };
    const selected = runAssignmentEngine({...params, blockedPairs: new Set()});
    assert.deepEqual(pairUids(selected.rotationRounds[0].pairs[0]), ["a", "b"]);
    const blocked = runAssignmentEngine({...params,
      blockedPairs: new Set(["a__b"])});
    assert.notDeepEqual(pairUids(blocked.rotationRounds[0].pairs[0]),
      ["a", "b"]);
    const withoutConfig = runAssignmentEngine({...params,
      softFeatures: undefined, blockedPairs: new Set()});
    assert.deepEqual(pairUids(withoutConfig.rotationRounds[0].pairs[0]),
      ["a", "b"]);
    const empty = runAssignmentEngine({...params,
      softFeatures: {...params.softFeatures, rules: [], snapshots: []},
      blockedPairs: new Set()});
    assert.deepEqual(empty.rotationRounds, withoutConfig.rotationRounds);
    const allMissing = runAssignmentEngine({...params,
      softFeatures: {...params.softFeatures, snapshots: []},
      blockedPairs: new Set()});
    assert.deepEqual(allMissing.rotationRounds, withoutConfig.rotationRounds);
  });

test("typed group balance distributes present categories across pods", () => {
  const rule: AssignmentFeatureRule = {
    featureId: "experience", formId: "form", versionId: "version-1",
    questionId: "question", transformVersion: 1, kind: "category",
    mode: "balanceAcrossGroups", weight: 100, optionIds: ["new", "old"],
  };
  const snapshots: EventAssignmentFeatureSnapshot[] = [
    ["a", "new"], ["b", "new"], ["c", "old"], ["d", "old"],
  ].map(([uid, optionId]) => ({eventId: "event", organizerId: "org",
    uid, featureId: "experience", formId: "form",
    versionId: "version-1", questionId: "question", transformVersion: 1,
    responseId: `response-${uid}`, consentReceiptId: `${uid}-grant`,
    value: {kind: "category", optionId}}));
  const plan = runAssignmentEngine({
    participants: ["a", "b", "c", "d"].map(profileFreeParticipant),
    blockedPairs: new Set(),
    topology: {unitKind: "pods", unitSize: 2, groupCount: 2,
      maxGroupSize: 2, rotationIntervalMinutes: null,
      rotationsEnabled: false},
    assignmentAlgorithm: "socialPods", compatibilityPolicy: "none",
    matchingObjective: "coverage",
    softFeatures: {eventId: "event", organizerId: "org",
      rules: [rule], snapshots},
  });
  assert.equal(plan.groups.length, 2);
  for (const group of plan.groups) {
    const uids = group.participants.map((person) => person.uid);
    assert.equal(uids.filter((uid) => ["a", "b"].includes(uid)).length, 1);
    assert.equal(uids.filter((uid) => ["c", "d"].includes(uid)).length, 1);
  }
});

test("weak group balance does not undo stronger similar-pair choices", () => {
  const rules: AssignmentFeatureRule[] = [
    {featureId: "cohort", formId: "form", versionId: "v1",
      questionId: "cohort", transformVersion: 1, kind: "category",
      mode: "preferSimilar", weight: 100, optionIds: ["x", "y"]},
    {featureId: "experience", formId: "form", versionId: "v1",
      questionId: "experience", transformVersion: 1, kind: "category",
      mode: "balanceAcrossGroups", weight: 1, optionIds: ["new", "old"]},
  ];
  const snapshots: EventAssignmentFeatureSnapshot[] = [];
  for (const [uid, cohort, experience] of [
    ["a", "x", "new"], ["b", "x", "new"],
    ["c", "y", "old"], ["d", "y", "old"],
  ]) {
    for (const [featureId, optionId] of [
      ["cohort", cohort], ["experience", experience],
    ]) {
      snapshots.push({eventId: "event", organizerId: "org", uid,
        featureId, formId: "form", versionId: "v1", questionId: featureId,
        transformVersion: 1, responseId: `response-${uid}`,
        consentReceiptId: `${uid}-grant`,
        value: {kind: "category", optionId}});
    }
  }
  const plan = runAssignmentEngine({
    participants: ["a", "b", "c", "d"].map(profileFreeParticipant),
    blockedPairs: new Set(),
    topology: {unitKind: "pods", unitSize: 2, groupCount: 2,
      maxGroupSize: 2, rotationIntervalMinutes: null,
      rotationsEnabled: false},
    assignmentAlgorithm: "socialPods", compatibilityPolicy: "none",
    matchingObjective: "coverage",
    softFeatures: {eventId: "event", organizerId: "org", rules, snapshots},
  });
  const pairs = plan.groups.map((group) =>
    group.participants.map((person) => person.uid).sort().join(""));
  assert.deepEqual(pairs.sort(), ["ab", "cd"]);
});

test("bounded typed matching cohort replays deterministically", () => {
  const participants = Array.from({length: 80}, (_, index) =>
    profileFreeParticipant(`runner-${index.toString().padStart(3, "0")}`));
  const rule: AssignmentFeatureRule = {featureId: "pace", formId: "form",
    versionId: "version-1", questionId: "pace", transformVersion: 1,
    kind: "ordinal", mode: "balanceAcrossGroups", weight: 12,
    optionIds: ["easy", "steady", "fast"],
    scoreByOptionId: {easy: 0, steady: 1, fast: 2}};
  const snapshots: EventAssignmentFeatureSnapshot[] = participants
    .filter((_, index) => index % 5 !== 0)
    .map((participant, index) => ({eventId: "event", organizerId: "org",
      uid: participant.uid, featureId: "pace", formId: "form",
      versionId: "version-1", questionId: "pace", transformVersion: 1,
      responseId: `response-${participant.uid}`,
      consentReceiptId: `receipt-${participant.uid}`,
      value: {kind: "ordinal", optionId:
        ["easy", "steady", "fast"][index % 3]}}));
  const params = {participants, blockedPairs: new Set<string>(),
    topology: {unitKind: "pods" as const, unitSize: 8, groupCount: 10,
      maxGroupSize: 8, rotationIntervalMinutes: null,
      rotationsEnabled: false},
    assignmentAlgorithm: "socialPods" as const,
    compatibilityPolicy: "none" as const,
    matchingObjective: "coverage" as const,
    softFeatures: {eventId: "event", organizerId: "org",
      rules: [rule], snapshots}};
  const start = Date.now();
  const first = runAssignmentEngine(params);
  const elapsed = Date.now() - start;
  const second = runAssignmentEngine(params);
  const memberIds = (result: typeof first) => result.groups.map((group) =>
    group.participants.map((person) => person.uid));
  assert.equal(first.groups.length, 10);
  assert.deepEqual(memberIds(first), memberIds(second));
  assert.ok(elapsed < 15_000, `80-person solve took ${elapsed} ms`);
});

test("minimizes maximum exclusion time ahead of assignment score", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("excluded", "person", [], ["common"]),
      participant("high-score-a", "person", [], ["common", "extra"]),
      participant("high-score-b", "person", [], ["common", "extra"]),
    ],
    blockedPairs: new Set(),
    topology: pairTopology(1),
    assignmentAlgorithm: "pairRotations",
    compatibilityPolicy: "questionnaireClueOnly",
    matchingObjective: "affinity",
    rotationRoundCount: 1,
    constraints: {
      exclusionLedger: {
        cumulativeMinutesByUid: {excluded: 35},
        intervalMinutes: 10,
      },
    },
  });

  const selectedUids = pairUids(plan.rotationRounds[0].pairs[0]);
  assert.ok(selectedUids.includes("excluded"));
  assert.notDeepEqual(selectedUids, ["high-score-a", "high-score-b"]);
  assert.equal(plan.exclusionLedger.maximumMinutes, 35);
  assert.equal(plan.explainability.maximumExclusionMinutes, 35);
});

test("exclusion ledger accrues only for attendees omitted from a round", () => {
  const plan = runAssignmentEngine({
    participants: ["a", "b", "c"].map(profileFreeParticipant),
    blockedPairs: new Set(),
    topology: pairTopology(1),
    assignmentAlgorithm: "pairRotations",
    compatibilityPolicy: "none",
    matchingObjective: "coverage",
    rotationRoundCount: 2,
    constraints: {
      exclusionLedger: {intervalMinutes: 15},
    },
  });

  assert.equal(plan.rotationRounds.length, 2);
  assert.deepEqual(
    Object.values(plan.exclusionLedger.cumulativeMinutesByUid).sort(
      (a, b) => a - b
    ),
    [0, 15, 15]
  );
  assert.equal(plan.exclusionLedger.maximumMinutes, 15);
});

test("exclusion configuration uses safe defaults", () => {
  const defaults = normalizeAssignmentConstraints();
  assert.equal(
    defaults.exclusionAlertThresholdMinutes,
    DEFAULT_EVENT_SUCCESS_EXCLUSION_ALERT_THRESHOLD_MINUTES
  );

  const configured = normalizeAssignmentConstraints({
    exclusionLedger: {
      alertThresholdMinutes: 12.5,
      intervalMinutes: 7.5,
      cumulativeMinutesByUid: {
        valid: 9,
        negative: -4,
        invalid: Number.NaN,
      },
    },
  }, 15);
  assert.equal(configured.exclusionAlertThresholdMinutes, 12.5);
  assert.equal(configured.exclusionIntervalMinutes, 7.5);
  assert.deepEqual(
    Object.fromEntries(configured.exclusionMinutesByUid),
    {valid: 9, negative: 0}
  );

  const invalid = normalizeAssignmentConstraints({
    exclusionLedger: {
      alertThresholdMinutes: 0,
      intervalMinutes: Number.NaN,
    },
  }, 15);
  assert.equal(
    invalid.exclusionAlertThresholdMinutes,
    DEFAULT_EVENT_SUCCESS_EXCLUSION_ALERT_THRESHOLD_MINUTES
  );
  assert.equal(invalid.exclusionIntervalMinutes, 15);
});

test("groups sparse mutual-orientation attendees together", () => {
  const groups = buildOptimizedGroups({
    participants: [
      participant("gay-man-1", "man", ["man"]),
      participant("gay-man-2", "man", ["man"]),
      participant("straight-man-1", "man", ["woman"]),
      participant("straight-man-2", "man", ["woman"]),
      participant("straight-woman-1", "woman", ["man"]),
      participant("straight-woman-2", "woman", ["man"]),
    ],
    blockedPairs: new Set(),
    groupCount: 2,
    maxGroupSize: 3,
  });

  assert.equal(groups.length, 2);
  assert.ok(
    groups.some((group) =>
      group.map((item) => item.uid).includes("gay-man-1") &&
      group.map((item) => item.uid).includes("gay-man-2")
    )
  );
});

test("rotation rounds use mutual pairs before fallback pairings", () => {
  const rounds = buildOptimizedRotationRounds({
    participants: [
      participant("man-1", "man", ["woman"]),
      participant("woman-1", "woman", ["man"]),
      participant("nb-1", "nonbinary", ["woman"]),
      participant("woman-2", "woman", ["man"]),
    ],
    blockedPairs: new Set(),
    roundCount: 1,
    allowOrientationFallback: true,
  });

  assert.equal(rounds.length, 1);
  assert.equal(rounds[0].pairs.length, 2);
  assert.equal(rounds[0].pairs[0].mutualInterest, true);
  assert.equal(rounds[0].pairs[0].compatibility, "mutual_interest");
  assert.equal(rounds[0].pairs[1].mutualInterest, false);
});

test("affinity and novelty optimize opposite questionnaire signals", () => {
  const participants = [
    participant("anchor", "person", [], ["shared"]),
    participant("different", "person", [], ["different"]),
    participant("shared", "person", [], ["shared"]),
  ];
  const affinityPlan = runAssignmentEngine({
    participants,
    blockedPairs: new Set(),
    topology: pairTopology(1),
    assignmentAlgorithm: "pairRotations",
    compatibilityPolicy: "questionnaireClueOnly",
    matchingObjective: "affinity",
    rotationRoundCount: 1,
  });
  const noveltyPlan = runAssignmentEngine({
    participants,
    blockedPairs: new Set(),
    topology: pairTopology(1),
    assignmentAlgorithm: "pairRotations",
    compatibilityPolicy: "questionnaireClueOnly",
    matchingObjective: "novelty",
    rotationRoundCount: 1,
  });

  assert.deepEqual(pairUids(affinityPlan.rotationRounds[0].pairs[0]),
    ["anchor", "shared"]);
  assert.deepEqual(pairUids(noveltyPlan.rotationRounds[0].pairs[0]),
    ["anchor", "different"]);
  assert.equal(affinityPlan.effectiveMatchingObjective, "affinity");
  assert.equal(noveltyPlan.effectiveMatchingObjective, "novelty");
});

test("unified optimizer uses topology primitives for pair rotations", () => {
  const plan = optimizeEventSuccessAssignments({
    participants: [
      participant("man-1", "man", ["woman"]),
      participant("woman-1", "woman", ["man"]),
      participant("man-2", "man", ["woman"]),
      participant("woman-2", "woman", ["man"]),
    ],
    blockedPairs: new Set(),
    topology: {
      unitKind: "pairs",
      unitSize: 2,
      groupCount: 2,
      maxGroupSize: 2,
      rotationIntervalMinutes: 15,
      rotationsEnabled: true,
    },
    assignmentAlgorithm: "pairRotations",
    compatibilityPolicy: "mutualInterestOnly",
    matchingObjective: "romantic",
    rotationRoundCount: 2,
  });

  assert.equal(plan.groups.length, 0);
  assert.equal(plan.rotationRounds.length, 2);
  assert.equal(plan.rotationRounds[0].pairs[0].mutualInterest, true);
});

for (const matchingObjective of EVENT_SUCCESS_MATCHING_OBJECTIVES) {
  const title =
    `profile-free ${matchingObjective} corpus falls back to coverage`;
  test(title, () => {
    const plan = runAssignmentEngine({
      participants: ["a", "b", "c", "d"].map(profileFreeParticipant),
      blockedPairs: new Set(),
      topology: pairTopology(2),
      assignmentAlgorithm: "pairRotations",
      compatibilityPolicy: policyForObjective(matchingObjective),
      matchingObjective,
      rotationRoundCount: 3,
    });

    assert.equal(plan.assignmentResolution.status, "supported");
    assert.equal(plan.effectiveMatchingObjective, "coverage");
    assert.equal(plan.rotationRounds.length, 3);
    assert.ok(plan.rotationRounds.every((round) => round.pairs.length === 2));
    const pairKeys = plan.rotationRounds.flatMap((round) =>
      round.pairs.map((pair) => pairUids(pair).join("__"))
    );
    assert.equal(new Set(pairKeys).size, 6);
    assert.equal(
      plan.explainability.matchingObjectiveFallbackReason === null,
      matchingObjective === "coverage"
    );
  });
}

test("resolution table covers every legal variable combination", () => {
  const expectedCount = EVENT_SUCCESS_ASSIGNMENT_ALGORITHMS.length *
    EVENT_SUCCESS_COMPATIBILITY_POLICIES.length *
    EVENT_SUCCESS_MATCHING_OBJECTIVES.length *
    EVENT_SUCCESS_TOPOLOGIES.length *
    EVENT_SUCCESS_UNIT_OUTCOMES.length;
  assert.equal(EVENT_SUCCESS_VARIABLE_RESOLUTION_TABLE.length, expectedCount);
  const keys = EVENT_SUCCESS_VARIABLE_RESOLUTION_TABLE.map((entry) =>
    [
      entry.assignmentAlgorithm,
      entry.compatibilityPolicy,
      entry.matchingObjective,
      entry.topology,
      entry.unitOutcome,
    ].join("|")
  );
  assert.equal(new Set(keys).size, expectedCount);
  for (const entry of EVENT_SUCCESS_VARIABLE_RESOLUTION_TABLE) {
    const supported = entry.topology === "set" ?
      entry.assignmentAlgorithm !== "none" :
      entry.topology === "sequence" ?
        entry.assignmentAlgorithm === "pairRotations" :
        entry.assignmentAlgorithm === "tableSeating";
    if (!supported) {
      assert.equal(entry.status, "unsupported");
      assert.ok(entry.reason.length > 0);
    } else {
      assert.equal(entry.status, "supported");
    }
  }
});

test("sequence and adjacency never fall back to neighbouring engines", () => {
  const sequenceTeam = runAssignmentEngine({
    participants: ["a", "b", "c", "d"].map(profileFreeParticipant),
    blockedPairs: new Set(),
    topology: {
      ...pairTopology(2),
      topology: "sequence",
    },
    assignmentAlgorithm: "teamBalancer",
    compatibilityPolicy: "none",
    matchingObjective: "coverage",
    rotationRoundCount: 2,
  });
  const adjacencyTable = runAssignmentEngine({
    participants: ["a", "b", "c", "d"].map(profileFreeParticipant),
    blockedPairs: new Set(),
    topology: {
      unitKind: "tables",
      unitSize: 4,
      groupCount: 1,
      maxGroupSize: 4,
      rotationIntervalMinutes: null,
      rotationsEnabled: false,
      topology: "adjacency",
    },
    assignmentAlgorithm: "tableSeating",
    compatibilityPolicy: "questionnaireClueOnly",
    matchingObjective: "affinity",
  });

  assert.equal(sequenceTeam.assignmentResolution.status, "unsupported");
  assert.match(sequenceTeam.assignmentResolution.reason, /pair rotations/i);
  assert.deepEqual(sequenceTeam.rotationRounds, []);
  assert.deepEqual(sequenceTeam.groups, []);
  // Adjacency is table seating's own engine, not a neighbouring fallback.
  assert.equal(adjacencyTable.assignmentResolution.status, "supported");
  assert.equal(adjacencyTable.explainability.engineCore, "shapePlanner");
  assert.equal(adjacencyTable.plannedRounds[0].units[0].seatOrder?.length, 4);
  const adjacencyPods = runAssignmentEngine({
    participants: ["a", "b", "c", "d"].map(profileFreeParticipant),
    blockedPairs: new Set(),
    topology: {
      unitKind: "pods",
      unitSize: 4,
      groupCount: 1,
      maxGroupSize: 4,
      rotationIntervalMinutes: null,
      rotationsEnabled: false,
      topology: "adjacency",
    },
    assignmentAlgorithm: "socialPods",
    compatibilityPolicy: "none",
    matchingObjective: "coverage",
  });
  assert.equal(adjacencyPods.assignmentResolution.status, "unsupported");
  assert.match(adjacencyPods.assignmentResolution.reason, /table seating/i);
  assert.deepEqual(adjacencyPods.groups, []);
});

test("matching objectives cannot read signals forbidden by policy", () => {
  const participants = [
    participant("a", "man", ["woman"], ["same"]),
    participant("b", "woman", ["man"], ["same"]),
    participant("c", "woman", ["man"], ["different"]),
  ];
  const affinity = runAssignmentEngine({
    participants,
    blockedPairs: new Set(),
    topology: pairTopology(1),
    assignmentAlgorithm: "pairRotations",
    compatibilityPolicy: "mutualInterestOnly",
    matchingObjective: "affinity",
    rotationRoundCount: 1,
  });
  const romantic = runAssignmentEngine({
    participants,
    blockedPairs: new Set(),
    topology: pairTopology(1),
    assignmentAlgorithm: "pairRotations",
    compatibilityPolicy: "questionnaireClueOnly",
    matchingObjective: "romantic",
    rotationRoundCount: 1,
  });

  assert.equal(affinity.effectiveMatchingObjective, "coverage");
  assert.equal(romantic.effectiveMatchingObjective, "coverage");
  assert.match(
    affinity.explainability.matchingObjectiveFallbackReason ?? "",
    /coverage/i
  );
  assert.match(
    romantic.explainability.matchingObjectiveFallbackReason ?? "",
    /coverage/i
  );
});

test("coverage is the engine default even when profile signals exist", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("a", "man", ["woman"]),
      participant("b", "woman", ["man"]),
    ],
    blockedPairs: new Set(),
    topology: pairTopology(1),
    assignmentAlgorithm: "pairRotations",
    compatibilityPolicy: "mutualInterestOnly",
    rotationRoundCount: 1,
  });

  assert.equal(plan.matchingObjective, "coverage");
  assert.equal(plan.effectiveMatchingObjective, "coverage");
  assert.equal(plan.rotationRounds[0].pairs[0].mutualInterest, false);
  assert.equal(plan.explainability.matchingObjectiveFallbackReason, null);
});

test("table seating runs its own engine instead of micro-pods", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("man-1", "man", ["woman"]),
      participant("woman-1", "woman", ["man"]),
      participant("man-2", "man", ["woman"]),
      participant("woman-2", "woman", ["man"]),
    ],
    blockedPairs: new Set(),
    topology: {
      unitKind: "tables",
      unitSize: 4,
      groupCount: 1,
      maxGroupSize: 4,
      rotationIntervalMinutes: null,
      rotationsEnabled: false,
    },
    compatibilityPolicy: "mutualInterestOnly",
    matchingObjective: "romantic",
  });

  assert.equal(plan.assignmentAlgorithm, "tableSeating");
  assert.equal(plan.assignmentResolution.status, "supported");
  assert.equal(plan.explainability.engineCore, "shapePlanner");
  assert.equal(plan.groups.length, 1);
  assert.equal(plan.explainability.unitKind, "tables");
  assert.equal(plan.explainability.targetUnitSize, 4);
  assert.equal(plan.explainability.targetGroupCount, 1);
  assert.equal(plan.explainability.participantCount, 4);
  assert.equal(plan.explainability.assignedParticipantCount, 4);
  assert.equal(plan.explainability.unassignedParticipantCount, 0);
  assert.equal(plan.explainability.generatedStaticGroupCount, 1);
  assert.equal(plan.explainability.assignmentResolutionStatus, "supported");
  assert.equal(plan.plannedRounds[0].bench.length, 0);
});

test("micro-pods balance romantic dyads across equal-sized groups", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("man-1", "man", ["woman"]),
      participant("man-2", "man", ["woman"]),
      participant("man-3", "man", ["woman"]),
      participant("man-4", "man", ["woman"]),
      participant("man-5", "man", ["woman"]),
      participant("man-6", "man", ["woman"]),
      participant("woman-1", "woman", ["man"]),
      participant("woman-2", "woman", ["man"]),
      participant("woman-3", "woman", ["man"]),
      participant("woman-4", "woman", ["man"]),
      participant("woman-5", "woman", ["man"]),
      participant("woman-6", "woman", ["man"]),
    ],
    blockedPairs: new Set(),
    topology: {
      unitKind: "pods",
      unitSize: 6,
      groupCount: 2,
      maxGroupSize: 6,
      rotationIntervalMinutes: null,
      rotationsEnabled: false,
    },
    assignmentAlgorithm: "socialPods",
    compatibilityPolicy: "mutualInterestOnly",
    matchingObjective: "romantic",
  });

  assert.equal(plan.groups.length, 2);
  for (const group of plan.groups) {
    assert.equal(group.participants.length, 6);
    assert.equal(countGender(group.participants, "man"), 3);
    assert.equal(countGender(group.participants, "woman"), 3);
  }
  assert.equal(plan.explainability.groupSizeSkew, 0);
  assert.equal(plan.explainability.unassignedParticipantCount, 0);
});

test("group composition distributes imbalanced mutual opportunity", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("man-1", "man", ["woman"]),
      participant("man-2", "man", ["woman"]),
      participant("man-3", "man", ["woman"]),
      participant("man-4", "man", ["woman"]),
      participant("woman-1", "woman", ["man"]),
      participant("woman-2", "woman", ["man"]),
    ],
    blockedPairs: new Set(),
    topology: {
      unitKind: "pods",
      unitSize: 3,
      groupCount: 2,
      maxGroupSize: 3,
      rotationIntervalMinutes: null,
      rotationsEnabled: false,
    },
    assignmentAlgorithm: "socialPods",
    compatibilityPolicy: "mutualInterestOnly",
    matchingObjective: "romantic",
  });

  assert.equal(plan.groups.length, 2);
  for (const group of plan.groups) {
    assert.equal(group.participants.length, 3);
    assert.equal(countGender(group.participants, "woman"), 1);
    assert.ok(group.mutualDyadCount > 0);
  }
  assert.equal(plan.explainability.lowOpportunityGroupCount, 0);
  assert.equal(
    constraintStatus(plan, "group_opportunity_balance", []),
    "satisfied"
  );
  assert.ok(!plan.explainability.constraintRelaxations.includes(
    "group_opportunity_imbalance"
  ));
});

test("group composition explainability reports unavoidable imbalance", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("man-1", "man", ["woman"]),
      participant("man-2", "man", ["woman"]),
      participant("man-3", "man", ["woman"]),
      participant("man-4", "man", ["woman"]),
      participant("man-5", "man", ["woman"]),
      participant("woman-1", "woman", ["man"]),
    ],
    blockedPairs: new Set(),
    topology: {
      unitKind: "pods",
      unitSize: 3,
      groupCount: 2,
      maxGroupSize: 3,
      rotationIntervalMinutes: null,
      rotationsEnabled: false,
    },
    assignmentAlgorithm: "socialPods",
    compatibilityPolicy: "mutualInterestOnly",
    matchingObjective: "romantic",
  });

  assert.equal(plan.groups.length, 2);
  assert.equal(plan.explainability.lowOpportunityGroupCount, 1);
  assert.ok(plan.explainability.uncoveredParticipantAssignmentCount > 0);
  assert.equal(
    constraintStatus(plan, "group_opportunity_balance", []),
    "relaxed"
  );
  assert.ok(plan.explainability.constraintRelaxations.includes(
    "group_opportunity_imbalance"
  ));
});

test("host constraints steer group placement and explain satisfaction", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("man-1", "man", ["woman"]),
      participant("woman-1", "woman", ["man"]),
      participant("man-2", "man", ["woman"]),
      participant("woman-2", "woman", ["man"]),
    ],
    blockedPairs: new Set(),
    topology: {
      unitKind: "pods",
      unitSize: 2,
      groupCount: 2,
      maxGroupSize: 2,
      rotationIntervalMinutes: null,
      rotationsEnabled: false,
    },
    assignmentAlgorithm: "socialPods",
    compatibilityPolicy: "mutualInterestOnly",
    matchingObjective: "romantic",
    constraints: {
      host: {
        anchorUidsByGroupIndex: {"1": ["man-1"]},
        keepTogetherPairs: [{aUid: "man-1", bUid: "woman-2"}],
        keepApartPairs: [{aUid: "man-1", bUid: "woman-1"}],
      },
    },
  });

  assert.equal(groupIndexForUid(plan.groups, "man-1"), 1);
  assert.equal(sameGroup(plan.groups, "man-1", "woman-2"), true);
  assert.equal(sameGroup(plan.groups, "man-1", "woman-1"), false);
  assert.equal(
    constraintStatus(plan, "host_anchor", ["man-1"]),
    "satisfied"
  );
  assert.equal(
    constraintStatus(plan, "host_keep_together", ["man-1", "woman-2"]),
    "satisfied"
  );
  assert.equal(
    constraintStatus(plan, "host_keep_apart", ["man-1", "woman-1"]),
    "satisfied"
  );
  assert.equal(plan.explainability.violatedConstraintCount, 0);
  assert.ok(!plan.explainability.constraintRelaxations.includes(
    "host_keep_together_relaxed"
  ));
});

test("host constraint relaxations are explicit when impossible", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("man-1", "man", ["woman"]),
      participant("woman-1", "woman", ["man"]),
    ],
    blockedPairs: new Set(),
    topology: {
      unitKind: "pods",
      unitSize: 1,
      groupCount: 2,
      maxGroupSize: 1,
      rotationIntervalMinutes: null,
      rotationsEnabled: false,
    },
    assignmentAlgorithm: "socialPods",
    compatibilityPolicy: "mutualInterestOnly",
    matchingObjective: "romantic",
    constraints: {
      host: {
        keepTogetherPairs: [{aUid: "man-1", bUid: "woman-1"}],
      },
    },
  });

  assert.equal(plan.groups.length, 2);
  assert.equal(sameGroup(plan.groups, "man-1", "woman-1"), false);
  assert.equal(
    constraintStatus(plan, "host_keep_together", ["man-1", "woman-1"]),
    "relaxed"
  );
  assert.ok(plan.explainability.constraintRelaxations.includes(
    "host_keep_together_relaxed"
  ));
  assert.equal(plan.explainability.relaxedConstraintCount, 1);
});

test("affinity constraints retain value and this-round or pinned scope", () => {
  const constraints = normalizeAssignmentConstraints({
    affinityConstraints: [
      {
        aUid: "a",
        bUid: "b",
        value: "mustPair",
        scope: "pinned",
      },
      {
        aUid: "c",
        bUid: "d",
        value: "avoidRepeat",
        scope: "thisRound",
      },
      {
        aUid: "e",
        bUid: "f",
        value: "neutral",
        scope: "thisRound",
      },
    ],
  });

  assert.equal(affinityConstraintScopeForPair("b", "a", constraints),
    "pinned");
  assert.equal(affinityConstraintScopeForPair("c", "d", constraints),
    "thisRound");
  assert.equal(constraints.keepTogetherPairs.has("a__b"), true);
  assert.equal(constraints.avoidRepeatPairs.has("c__d"), true);
  assert.equal(constraints.keepTogetherPairs.has("e__f"), false);
  assert.equal(affinityRepeatPairScoreAdjustment("c", "d", 0, constraints),
    0);
  assert.ok(affinityRepeatPairScoreAdjustment("c", "d", 1, constraints) < 0);
});

test("must-split affinity is enforced as a hard host constraint", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("a", "person", []),
      participant("b", "person", []),
      participant("c", "person", []),
      participant("d", "person", []),
    ],
    blockedPairs: new Set(),
    topology: {
      unitKind: "pods",
      unitSize: 2,
      groupCount: 2,
      maxGroupSize: 2,
      rotationIntervalMinutes: null,
      rotationsEnabled: false,
    },
    assignmentAlgorithm: "socialPods",
    compatibilityPolicy: "none",
    matchingObjective: "coverage",
    constraints: {
      affinityConstraints: [{
        aUid: "a",
        bUid: "b",
        value: "mustSplit",
        scope: "pinned",
      }],
    },
  });

  assert.equal(sameGroup(plan.groups, "a", "b"), false);
  assert.equal(constraintStatus(plan, "host_keep_apart", ["a", "b"]),
    "satisfied");
});

test("must-pair affinity keeps a feasible pair in one unit", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("a", "person", []),
      participant("b", "person", []),
      participant("c", "person", []),
      participant("d", "person", []),
    ],
    blockedPairs: new Set(),
    topology: {
      unitKind: "pods",
      unitSize: 2,
      groupCount: 2,
      maxGroupSize: 2,
      rotationIntervalMinutes: null,
      rotationsEnabled: false,
    },
    assignmentAlgorithm: "socialPods",
    compatibilityPolicy: "none",
    matchingObjective: "coverage",
    constraints: {
      affinityConstraints: [{
        aUid: "a",
        bUid: "b",
        value: "mustPair",
        scope: "pinned",
      }],
    },
  });

  assert.equal(sameGroup(plan.groups, "a", "b"), true);
  assert.equal(constraintStatus(plan, "host_keep_together", ["a", "b"]),
    "satisfied");
});

test("safety keep-apart wins over must-pair affinity", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("a", "person", []),
      participant("b", "person", []),
      participant("c", "person", []),
      participant("d", "person", []),
    ],
    blockedPairs: new Set(["a__b"]),
    topology: {
      unitKind: "pods",
      unitSize: 2,
      groupCount: 2,
      maxGroupSize: 2,
      rotationIntervalMinutes: null,
      rotationsEnabled: false,
    },
    assignmentAlgorithm: "socialPods",
    compatibilityPolicy: "none",
    matchingObjective: "coverage",
    constraints: {
      affinityConstraints: [{
        aUid: "a",
        bUid: "b",
        value: "mustPair",
        scope: "pinned",
      }],
    },
  });

  assert.equal(sameGroup(plan.groups, "a", "b"), false);
  assert.equal(constraintStatus(plan, "blocked_pair", []), "satisfied");
  assert.equal(constraintStatus(plan, "host_keep_together", ["a", "b"]),
    "relaxed");
});

test("balance objective distributes skill across micro-pods", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("advanced-1", "person", [], [], {skillBand: "advanced"}),
      participant("advanced-2", "person", [], [], {skillBand: "advanced"}),
      participant("beginner-1", "person", [], [], {skillBand: "beginner"}),
      participant("beginner-2", "person", [], [], {skillBand: "beginner"}),
    ],
    blockedPairs: new Set(),
    topology: {
      unitKind: "pods",
      unitSize: 2,
      groupCount: 2,
      maxGroupSize: 2,
      rotationIntervalMinutes: null,
      rotationsEnabled: false,
    },
    assignmentAlgorithm: "socialPods",
    compatibilityPolicy: "none",
    matchingObjective: "balance",
    constraints: {
      activity: {
        balanceAttributes: ["skillBand"],
      },
    },
  });

  assert.equal(plan.groups.length, 2);
  for (const group of plan.groups) {
    assert.equal(countActivityValue(group.participants, "skillBand",
      "advanced"), 1);
    assert.equal(countActivityValue(group.participants, "skillBand",
      "beginner"), 1);
  }
  assert.equal(plan.explainability.activityBalanceAttributeCount, 1);
  assert.equal(plan.explainability.activityBalanceSkew, 0);
  assert.equal(plan.explainability.activityMissingAttributeValueCount, 0);
  assert.equal(
    constraintStatus(plan, "activity_attribute_balance", []),
    "satisfied"
  );
  assert.equal(
    constraintStatus(plan, "group_opportunity_balance", []),
    "not_applicable"
  );
});

test("spread objective mixes activity attributes within pair units", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("host-1", "person", [], [], {roleBand: "host"}),
      participant("host-2", "person", [], [], {roleBand: "host"}),
      participant("guest-1", "person", [], [], {roleBand: "guest"}),
      participant("guest-2", "person", [], [], {roleBand: "guest"}),
    ],
    blockedPairs: new Set(),
    topology: pairTopology(1),
    assignmentAlgorithm: "pairRotations",
    compatibilityPolicy: "none",
    matchingObjective: "spread",
    rotationRoundCount: 1,
    constraints: {
      activity: {
        balanceAttributes: ["roleBand"],
      },
    },
  });

  assert.equal(plan.effectiveMatchingObjective, "spread");
  for (const pair of plan.rotationRounds[0].pairs) {
    assert.notEqual(
      pair.a.activityAttributes?.roleBand,
      pair.b.activityAttributes?.roleBand
    );
  }
});

test("activity cluster attributes group similar pace bands", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("fast-1", "person", [], [], {paceBand: "fast"}),
      participant("fast-2", "person", [], [], {paceBand: "fast"}),
      participant("social-1", "person", [], [], {paceBand: "social"}),
      participant("social-2", "person", [], [], {paceBand: "social"}),
    ],
    blockedPairs: new Set(),
    topology: {
      unitKind: "pods",
      unitSize: 2,
      groupCount: 2,
      maxGroupSize: 2,
      rotationIntervalMinutes: null,
      rotationsEnabled: false,
    },
    assignmentAlgorithm: "pacePods",
    compatibilityPolicy: "none",
    matchingObjective: "affinity",
    constraints: {
      activity: {
        clusterAttributes: ["paceBand"],
      },
    },
  });

  assert.equal(plan.groups.length, 2);
  for (const group of plan.groups) {
    assert.equal(uniqueActivityValues(group.participants, "paceBand").size, 1);
  }
  assert.equal(plan.explainability.activityClusterAttributeCount, 1);
  assert.equal(plan.explainability.activityClusterMixedGroupCount, 0);
  assert.equal(
    constraintStatus(plan, "activity_attribute_cluster", []),
    "satisfied"
  );
});

test("activity cluster attributes steer pair rotations", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("fast-1", "person", [], [], {paceBand: "fast"}),
      participant("fast-2", "person", [], [], {paceBand: "fast"}),
      participant("social-1", "person", [], [], {paceBand: "social"}),
      participant("social-2", "person", [], [], {paceBand: "social"}),
    ],
    blockedPairs: new Set(),
    topology: {
      unitKind: "pairs",
      unitSize: 2,
      groupCount: 2,
      maxGroupSize: 2,
      rotationIntervalMinutes: 15,
      rotationsEnabled: true,
    },
    assignmentAlgorithm: "pairRotations",
    compatibilityPolicy: "none",
    matchingObjective: "affinity",
    rotationRoundCount: 1,
    constraints: {
      activity: {
        clusterAttributes: ["paceBand"],
      },
    },
  });

  assert.equal(plan.rotationRounds.length, 1);
  assert.equal(plan.rotationRounds[0].pairs.length, 2);
  for (const pair of plan.rotationRounds[0].pairs) {
    assert.equal(pair.a.activityAttributes?.paceBand,
      pair.b.activityAttributes?.paceBand);
  }
  assert.equal(plan.explainability.activityClusterMixedGroupCount, 0);
});

test("activity attributes report missing data relaxations", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("advanced-1", "person", [], [], {skillBand: "advanced"}),
      participant("unknown-1", "person", [], []),
    ],
    blockedPairs: new Set(),
    topology: {
      unitKind: "pods",
      unitSize: 2,
      groupCount: 1,
      maxGroupSize: 2,
      rotationIntervalMinutes: null,
      rotationsEnabled: false,
    },
    assignmentAlgorithm: "socialPods",
    compatibilityPolicy: "none",
    matchingObjective: "balance",
    constraints: {
      activity: {
        balanceAttributes: ["skillBand"],
      },
    },
  });

  assert.equal(plan.explainability.activityMissingAttributeValueCount, 1);
  assert.equal(
    constraintStatus(plan, "activity_attribute_balance", []),
    "relaxed"
  );
  assert.ok(plan.explainability.constraintRelaxations.includes(
    "activity_attribute_balance_relaxed"
  ));
});

test("team balancer runs its own engine instead of micro-pods", () => {
  const plan = optimizeEventSuccessAssignments({
    participants: [
      participant("gay-man-1", "man", ["man"]),
      participant("gay-man-2", "man", ["man"]),
      participant("straight-man-1", "man", ["woman"]),
      participant("straight-man-2", "man", ["woman"]),
      participant("straight-woman-1", "woman", ["man"]),
      participant("straight-woman-2", "woman", ["man"]),
    ],
    blockedPairs: new Set(),
    topology: {
      unitKind: "teams",
      unitSize: 3,
      groupCount: 2,
      maxGroupSize: 3,
      rotationIntervalMinutes: null,
      rotationsEnabled: false,
    },
    assignmentAlgorithm: "teamBalancer",
    compatibilityPolicy: "mutualInterestOnly",
    matchingObjective: "balance",
  });

  assert.equal(plan.assignmentResolution.status, "supported");
  assert.match(plan.assignmentResolution.reason, /teams/i);
  assert.equal(plan.explainability.engineCore, "shapePlanner");
  // `balance` needs an assignment attribute; none is configured, so the
  // honest fallback is coverage, never a romantic reading of the profiles.
  assert.equal(plan.effectiveMatchingObjective, "coverage");
  assert.equal(plan.rotationRounds.length, 0);
  assert.deepEqual(plan.groups.map((group) => group.participants.length),
    [3, 3]);
  assert.equal(plan.explainability.unassignedParticipantCount, 0);
});

test("table seating rotates tables by course without repeating tablemates",
  () => {
    const plan = optimizeEventSuccessAssignments({
      participants: [
        participant("man-1", "man", ["woman"]),
        participant("man-2", "man", ["woman"]),
        participant("man-3", "man", ["woman"]),
        participant("woman-1", "woman", ["man"]),
        participant("woman-2", "woman", ["man"]),
        participant("woman-3", "woman", ["man"]),
      ],
      blockedPairs: new Set(),
      topology: {
        unitKind: "tables",
        unitSize: 3,
        groupCount: 2,
        maxGroupSize: 3,
        rotationIntervalMinutes: 20,
        rotationsEnabled: true,
      },
      assignmentAlgorithm: "tableSeating",
      compatibilityPolicy: "mutualInterestOnly",
      matchingObjective: "affinity",
      rotationRoundCount: 2,
    });

    assert.equal(plan.assignmentResolution.status, "supported");
    assert.equal(plan.groups.length, 0);
    assert.equal(plan.rotationRounds.length, 0);
    assert.equal(plan.groupRounds.length, 2);
    assert.ok(plan.groupRounds.every((round) =>
      round.groups.every((group) => group.participants.length === 3)));
  });

test("fallback rotations pair socially when no romantic dyad exists", () => {
  const rounds = buildOptimizedRotationRounds({
    participants: [
      participant("man-1", "man", ["woman"]),
      participant("man-2", "man", ["woman"]),
    ],
    blockedPairs: new Set(),
    roundCount: 1,
    compatibilityPolicy: "mutualInterestOnly",
    allowOrientationFallback: true,
  });

  assert.equal(rounds.length, 1);
  assert.equal(rounds[0].pairs[0].compatibility, "social");
  assert.equal(rounds[0].pairs[0].mutualInterest, false);
});

test("rotation metrics show requested rounds and avoid repeats", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("man-1", "man", ["woman"]),
      participant("man-2", "man", ["woman"]),
      participant("man-3", "man", ["woman"]),
      participant("woman-1", "woman", ["man"]),
      participant("woman-2", "woman", ["man"]),
      participant("woman-3", "woman", ["man"]),
    ],
    blockedPairs: new Set(),
    topology: {
      unitKind: "pairs",
      unitSize: 2,
      groupCount: 3,
      maxGroupSize: 2,
      rotationIntervalMinutes: 15,
      rotationsEnabled: true,
    },
    compatibilityPolicy: "mutualInterestOnly",
    matchingObjective: "romantic",
    rotationRoundCount: 3,
  });

  assert.equal(plan.rotationRounds.length, 3);
  assert.equal(plan.explainability.requestedRotationRoundCount, 3);
  assert.equal(plan.explainability.generatedRotationRoundCount, 3);
  assert.equal(plan.explainability.repeatedPairCount, 0);
  assert.equal(plan.explainability.orientationFallbackPairCount, 0);
  assert.equal(plan.explainability.mutualDyadCount, 9);
  assert.deepEqual(plan.explainability.constraintRelaxations, []);
});

test("rotation metrics explain infeasible extra rounds", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("man-1", "man", ["woman"]),
      participant("man-2", "man", ["woman"]),
      participant("woman-1", "woman", ["man"]),
      participant("woman-2", "woman", ["man"]),
    ],
    blockedPairs: new Set(),
    topology: {
      unitKind: "pairs",
      unitSize: 2,
      groupCount: 2,
      maxGroupSize: 2,
      rotationIntervalMinutes: 15,
      rotationsEnabled: true,
    },
    compatibilityPolicy: "mutualInterestOnly",
    matchingObjective: "romantic",
    rotationRoundCount: 5,
  });

  assert.equal(plan.rotationRounds.length, 2);
  assert.equal(plan.explainability.requestedRotationRoundCount, 5);
  assert.equal(plan.explainability.generatedRotationRoundCount, 2);
  assert.equal(plan.explainability.repeatedPairCount, 0);
  assert.ok(
    plan.explainability.constraintRelaxations.includes(
      "rotations_not_generated"
    )
  );
});

test("rotation policy fills exhausted rounds with bounded repeats", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("man-1", "man", ["woman"]),
      participant("man-2", "man", ["woman"]),
      participant("woman-1", "woman", ["man"]),
      participant("woman-2", "woman", ["man"]),
    ],
    blockedPairs: new Set(),
    topology: {
      unitKind: "pairs",
      unitSize: 2,
      groupCount: 2,
      maxGroupSize: 2,
      rotationIntervalMinutes: 15,
      rotationsEnabled: true,
    },
    compatibilityPolicy: "mutualInterestOnly",
    matchingObjective: "romantic",
    rotationRoundCount: 3,
    rotationPolicy: {
      repeatStrategy: "allowWhenExhausted",
      maxPairMeetings: 2,
    },
  });

  assert.equal(plan.rotationRounds.length, 3);
  assert.equal(
    plan.explainability.rotationRepeatStrategy,
    "allowWhenExhausted"
  );
  assert.equal(plan.explainability.maxPairMeetings, 2);
  assert.equal(plan.explainability.repeatedPairCount, 2);
  assert.ok(plan.explainability.constraintRelaxations.includes(
    "repeated_pairs_required"
  ));
});

test("host requested repeat pair overrides default repeat avoidance", () => {
  const plan = runAssignmentEngine({
    participants: [
      participant("man-1", "man", ["woman"]),
      participant("woman-1", "woman", ["man"]),
    ],
    blockedPairs: new Set(),
    topology: {
      unitKind: "pairs",
      unitSize: 2,
      groupCount: 1,
      maxGroupSize: 2,
      rotationIntervalMinutes: 15,
      rotationsEnabled: true,
    },
    compatibilityPolicy: "mutualInterestOnly",
    matchingObjective: "romantic",
    rotationRoundCount: 2,
    constraints: {
      host: {
        requestedRepeatPairs: [{aUid: "man-1", bUid: "woman-1"}],
      },
    },
  });

  assert.equal(plan.rotationRounds.length, 2);
  assert.equal(plan.explainability.rotationRepeatStrategy, "avoid");
  assert.equal(plan.explainability.hostRequestedRepeatPairCount, 1);
  assert.equal(plan.explainability.repeatedPairCount, 1);
  assert.ok(plan.explainability.constraintRelaxations.includes(
    "repeated_pairs_required"
  ));
});

function pairTopology(groupCount: number) {
  return {
    unitKind: "pairs" as const,
    unitSize: 2,
    groupCount,
    maxGroupSize: 2,
    rotationIntervalMinutes: 15,
    rotationsEnabled: true,
  };
}

function pairUids(pair: {
  a: AssignmentParticipant;
  b: AssignmentParticipant;
}): string[] {
  return [pair.a.uid, pair.b.uid].sort();
}

function profileFreeParticipant(uid: string): AssignmentParticipant {
  return {uid, interestedInGenders: []};
}

function policyForObjective(
  objective: EventSuccessMatchingObjective
) {
  switch (objective) {
  case "romantic":
    return "mutualInterestOnly" as const;
  case "affinity":
  case "novelty":
    return "questionnaireClueOnly" as const;
  case "balance":
  case "spread":
    return "socialCohortBalance" as const;
  case "coverage":
    return "none" as const;
  }
}

function countGender(
  participants: AssignmentParticipant[],
  gender: string
): number {
  return participants.filter((participant) => participant.gender === gender)
    .length;
}

function countActivityValue(
  participants: AssignmentParticipant[],
  attribute: string,
  value: string
): number {
  return participants.filter((participant) =>
    participant.activityAttributes?.[attribute] === value
  ).length;
}

function uniqueActivityValues(
  participants: AssignmentParticipant[],
  attribute: string
): Set<unknown> {
  return new Set(
    participants.map((participant) =>
      participant.activityAttributes?.[attribute]
    )
  );
}

function groupIndexForUid(
  groups: Array<{groupIndex: number; participants: AssignmentParticipant[]}>,
  uid: string
): number | null {
  for (const group of groups) {
    if (group.participants.some((participant) => participant.uid === uid)) {
      return group.groupIndex;
    }
  }
  return null;
}

function sameGroup(
  groups: Array<{participants: AssignmentParticipant[]}>,
  uidA: string,
  uidB: string
): boolean {
  return groups.some((group) =>
    group.participants.some((participant) => participant.uid === uidA) &&
    group.participants.some((participant) => participant.uid === uidB)
  );
}

function constraintStatus(
  plan: {
    explainability: {
      constraintEvaluations: Array<{
        key: string;
        status: string;
        subjectUids: string[];
      }>;
    };
  },
  key: string,
  subjectUids: string[]
): string | null {
  const expected = [...subjectUids].sort().join(",");
  return plan.explainability.constraintEvaluations.find((evaluation) =>
    evaluation.key === key &&
    [...evaluation.subjectUids].sort().join(",") === expected
  )?.status ?? null;
}

function participant(
  uid: string,
  gender: string,
  interestedInGenders: string[],
  compatibilityAnswerIds: string[] = [],
  activityAttributes?: Record<string, string | number | boolean | null>
): AssignmentParticipant {
  return {
    uid,
    gender,
    interestedInGenders,
    compatibilityAnswerIds,
    activityAttributes,
  };
}
