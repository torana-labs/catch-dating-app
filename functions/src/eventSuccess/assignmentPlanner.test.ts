import assert from "node:assert/strict";
import test from "node:test";
import {
  AssignmentEngineContext,
  AssignmentParticipant,
  runAssignmentEngine,
} from "./assignmentOptimizer";
import {resolveUnitSizes} from "./assignmentPlanner";
import {
  ageBandAt,
  optInProfileAttributesForStructureConfig,
  withOptInProfileAttributes,
} from "./assignmentPrimitiveControls";
import type {AssignmentTopology} from "./assignmentTopology";
import type {
  AssignmentFeatureRule,
  EventAssignmentFeatureSnapshot,
} from "./assignmentFeatureScoring";

type Person = AssignmentParticipant;

const pad = (index: number) => String(index).padStart(2, "0");

function person(uid: string, extra: Partial<Person> = {}): Person {
  return {uid, interestedInGenders: [], ...extra};
}

function categoryRule(
  featureId: string,
  mode: AssignmentFeatureRule["mode"],
  optionIds: string[],
  weight = 30
): AssignmentFeatureRule {
  return {
    featureId,
    formId: "signup",
    versionId: "v1",
    questionId: featureId,
    transformVersion: 1,
    kind: "category",
    mode,
    weight,
    optionIds,
  };
}

function snapshot(
  uid: string,
  featureId: string,
  optionId: string
): EventAssignmentFeatureSnapshot {
  return {
    eventId: "event",
    organizerId: "org",
    uid,
    featureId,
    formId: "signup",
    versionId: "v1",
    questionId: featureId,
    transformVersion: 1,
    responseId: `response-${uid}`,
    consentReceiptId: `grant-${uid}`,
    value: {kind: "category", optionId},
  };
}

function topology(overrides: Partial<AssignmentTopology>): AssignmentTopology {
  return {
    unitKind: "teams",
    unitSize: 5,
    groupCount: 1,
    maxGroupSize: 5,
    rotationIntervalMinutes: null,
    rotationsEnabled: false,
    topology: "set",
    resourceCapacity: null,
    ...overrides,
  };
}

function run(params: Partial<AssignmentEngineContext<Person>> & {
  participants: Person[];
  topology: AssignmentTopology;
}) {
  return runAssignmentEngine<Person>({
    blockedPairs: new Set(),
    compatibilityPolicy: "none",
    matchingObjective: "coverage",
    seed: "event",
    ...params,
  });
}

function count<T>(values: T[], predicate: (value: T) => boolean): number {
  return values.filter(predicate).length;
}

test("unit shapes: explicit groups, counts, courts and flexible tables", () => {
  assert.deepEqual(resolveUnitSizes(24, {sizes: [8, 8, 8]}), [8, 8, 8]);
  assert.deepEqual(resolveUnitSizes(20, {count: 10}), Array(10).fill(2));
  assert.deepEqual(resolveUnitSizes(23, {size: 5}), [5, 5, 5, 4, 4]);
  assert.deepEqual(
    resolveUnitSizes(40, {resource: {count: 3, seatsPerUnit: 4}}),
    [4, 4, 4]
  );
  assert.deepEqual(
    resolveUnitSizes(22, {resource: {count: 5, seatsPerUnit: 6, minSeats: 4}}),
    [6, 6, 5, 5]
  );
  assert.deepEqual(resolveUnitSizes(7, {sizes: [8, 8, 8]}), [3, 2, 2]);
  assert.deepEqual(
    resolveUnitSizes(3, {resource: {count: 3, seatsPerUnit: 4}}),
    []
  );
});

test("hackathon: colleges spread evenly and every team covers disciplines",
  () => {
    const colleges = [
      ...Array(9).fill("iit"), ...Array(6).fill("bits"),
      ...Array(6).fill("nit"), ...Array(3).fill("iiit"),
    ];
    const disciplines = [
      ...Array(5).fill("uiux"), ...Array(9).fill("frontend"),
      ...Array(10).fill("backend"),
    ];
    // Deterministic interleave so the input order is not already balanced.
    const people = colleges.map((_, index) => person(`h${pad(index)}`, {
      // Gender is present on the profile but never opted in: it must not
      // reach the engine's objectives.
      gender: index % 2 === 0 ? "man" : "woman",
      interestedInGenders: [index % 2 === 0 ? "woman" : "man"],
    }));
    const snapshots = people.flatMap((member, index) => [
      snapshot(member.uid, "college", colleges[index]),
      snapshot(member.uid, "discipline", disciplines[(index * 7) % 24]),
    ]);
    const result = run({
      participants: people,
      topology: topology({unitKind: "teams", unitSize: 8, groupCount: 3,
        maxGroupSize: 8}),
      assignmentAlgorithm: "teamBalancer",
      softFeatures: {eventId: "event", organizerId: "org", snapshots,
        rules: [
          categoryRule("college", "balanceAcrossGroups",
            ["iit", "bits", "nit", "iiit"]),
          categoryRule("discipline", "coverAcrossGroups",
            ["uiux", "frontend", "backend"]),
        ]},
    });

    assert.equal(result.explainability.engineCore, "shapePlanner");
    assert.equal(result.effectiveMatchingObjective, "coverage");
    assert.equal(result.groups.length, 3);
    assert.deepEqual(result.groups.map((group) => group.participants.length),
      [8, 8, 8]);
    const collegeOf = new Map(people.map((member, index) =>
      [member.uid, colleges[index]]));
    const disciplineOf = new Map(people.map((member, index) =>
      [member.uid, disciplines[(index * 7) % 24]]));
    for (const group of result.groups) {
      const uids = group.participants.map((member) => member.uid);
      assert.equal(
        new Set(uids.map((uid) => disciplineOf.get(uid))).size,
        3,
        "every team has UI/UX, frontend and backend"
      );
      for (const [college, total] of [["iit", 9], ["bits", 6], ["nit", 6],
        ["iiit", 3]] as const) {
        const here = count(uids, (uid) => collegeOf.get(uid) === college);
        assert.ok(Math.abs(here - total / 3) <= 1,
          `${college}: ${here} on one team, fair share ${total / 3}`);
      }
    }
    const stats = result.explainability.planner?.attributeStats ?? [];
    assert.deepEqual(stats.map((stat) => [stat.id, stat.unmetUnitCount]),
      [["feature:college", 0], ["feature:discipline", 0]]);
  });

test("hackathon: a withheld answer is neutral and the person still joins",
  () => {
    const people = Array.from({length: 9}, (_, index) =>
      person(`w${index}`));
    const snapshots = people.slice(1).map((member, index) =>
      snapshot(member.uid, "college", ["a", "b", "c"][index % 3]));
    const result = run({
      participants: people,
      topology: topology({unitKind: "teams", unitSize: 3, groupCount: 3,
        maxGroupSize: 3}),
      assignmentAlgorithm: "teamBalancer",
      softFeatures: {eventId: "event", organizerId: "org", snapshots,
        rules: [categoryRule("college", "balanceAcrossGroups",
          ["a", "b", "c"])]},
    });
    assert.equal(result.explainability.assignedParticipantCount, 9);
    assert.equal(result.explainability.planner?.attributeStats[0]
      .missingValueCount, 1);
  });

test("pickleball: 40 players, 3 doubles courts, 2 hours share court time " +
  "fairly and never repeat a partner", () => {
  const players = Array.from({length: 40}, (_, index) =>
    person(`p${pad(index)}`, {activityAttributes: {
      skillBand: ["beginner", "intermediate", "advanced"][index % 3],
    }}));
  const blocked = new Set(["p00__p01", "p05__p17"]);
  const result = run({
    participants: players,
    blockedPairs: blocked,
    topology: topology({
      unitKind: "pairs",
      unitSize: 2,
      groupCount: 20,
      maxGroupSize: 2,
      rotationIntervalMinutes: 15,
      rotationsEnabled: true,
      resourceCapacity: {concurrentUnits: 3, resourceLabelId: "court",
        seatsPerUnit: 4},
    }),
    assignmentAlgorithm: "pairRotations",
    rotationRoundCount: 8, // 120 minutes / 15-minute games
    constraints: {activity: {balanceAttributes: ["skillBand"]}},
  });

  assert.equal(result.explainability.engineCore, "shapePlanner");
  assert.equal(result.plannedRounds.length, 8);
  for (const round of result.plannedRounds) {
    assert.equal(round.units.length, 3, "three courts in use");
    assert.equal(round.bench.length, 28, "28 mix in the common area");
    const onCourt = round.units.flatMap((unit) =>
      unit.members.map((member) => member.uid));
    assert.equal(new Set(onCourt).size, 12, "nobody is on two courts");
    for (const unit of round.units) {
      assert.equal(unit.members.length, 4);
      assert.equal(unit.subunits?.length, 2);
      assert.ok(unit.subunits?.every((side) => side.length === 2));
      for (const key of blocked) {
        const [a, b] = key.split("__");
        assert.ok(!(unit.members.some((m) => m.uid === a) &&
          unit.members.some((m) => m.uid === b)), "blocked pair on a court");
      }
    }
  }
  // 8 rounds x 12 seats = 96 player-games over 40 people: 2.4 each.
  const ledger = Object.values(result.timeLedger);
  const rounds = ledger.map((entry) => entry.assignedRounds);
  assert.ok(Math.max(...rounds) - Math.min(...rounds) <= 1,
    "court time differs by at most one game");
  assert.equal(count(rounds, (value) => value === 3), 16);
  assert.equal(count(rounds, (value) => value === 2), 24);
  const fairness = result.explainability.planner?.fairness;
  assert.equal(fairness?.targetMinutes, 36);
  assert.equal(fairness?.minimumAssignedMinutes, 30);
  assert.equal(fairness?.maximumAssignedMinutes, 45);
  assert.deepEqual(fairness?.belowFairShareUids, []);
  assert.ok(ledger.every((entry) => entry.longestBenchStreak <= 3),
    "nobody waits more than three games in a row");
  assert.equal(result.explainability.planner?.repeatedPartnerCount, 0);
  assert.equal(result.explainability.planner?.hardViolationCount, 0);
  // Every partnership in the history is a first meeting.
  assert.ok(Object.values(result.history.partnerCounts)
    .every((value) => value === 1));
  assert.equal(Object.keys(result.history.partnerCounts).length, 48);
});

test("pickleball: partners repeat only once every partnership is exhausted",
  () => {
    const players = ["a", "b", "c", "d"].map((uid) => person(uid));
    const result = run({
      participants: players,
      topology: topology({unitKind: "pairs", unitSize: 2, groupCount: 2,
        maxGroupSize: 2, rotationIntervalMinutes: 15, rotationsEnabled: true,
        resourceCapacity: {concurrentUnits: 1, resourceLabelId: "court",
          seatsPerUnit: 4}}),
      assignmentAlgorithm: "pairRotations",
      rotationRoundCount: 4,
    });
    const partnerKeys = result.plannedRounds.map((round) =>
      (round.units[0].subunits ?? []).map((side) =>
        side.map((member) => member.uid).sort().join("+")).sort().join("|"));
    assert.equal(new Set(partnerKeys.slice(0, 3)).size, 3,
      "three rounds, three different partner splits");
    assert.equal(result.explainability.planner?.repeatedPartnerCount, 2,
      "round four repeats one split (two partnerships)");
  });

test("pickleball: an opted-in gender balance gives mixed partnerships", () => {
  const players = Array.from({length: 16}, (_, index) =>
    person(`m${pad(index)}`, {activityAttributes: {
      gender: index < 8 ? "man" : "woman",
    }}));
  const result = run({
    participants: players,
    topology: topology({unitKind: "pairs", unitSize: 2, groupCount: 8,
      maxGroupSize: 2, rotationIntervalMinutes: 15, rotationsEnabled: true,
      resourceCapacity: {concurrentUnits: 2, resourceLabelId: "court",
        seatsPerUnit: 4}}),
    assignmentAlgorithm: "pairRotations",
    rotationRoundCount: 4,
    attributeObjectives: [{attribute: "gender", mode: "balance", weight: 60}],
  });
  for (const round of result.plannedRounds) {
    for (const unit of round.units) {
      for (const side of unit.subunits ?? []) {
        const genders = side.map((member) =>
          member.activityAttributes?.gender);
        assert.deepEqual([...genders].sort(), ["man", "woman"]);
      }
    }
  }
});

test("trivia: teams of five keep arrival groups and spread solo arrivals",
  () => {
    const groups: Record<string, string> = {
      t00: "smiths", t01: "smiths", t02: "smiths",
      t03: "jones", t04: "jones",
      t05: "lee", t06: "lee",
      t07: "patel", t08: "patel", t09: "patel",
    };
    const people = Array.from({length: 23}, (_, index) =>
      person(`t${pad(index)}`, {arrivalGroup: groups[`t${pad(index)}`] ??
        null}));
    const result = run({
      participants: people,
      topology: topology({unitKind: "teams", unitSize: 5, groupCount: 5,
        maxGroupSize: 5}),
      assignmentAlgorithm: "teamBalancer",
    });
    assert.deepEqual(result.groups.map((group) => group.participants.length)
      .sort(), [4, 4, 5, 5, 5]);
    const teamOf = new Map(result.groups.flatMap((group) =>
      group.participants.map((member) => [member.uid, group.groupIndex])));
    for (const name of ["smiths", "jones", "lee", "patel"]) {
      const teams = new Set(Object.entries(groups)
        .filter(([, group]) => group === name)
        .map(([uid]) => teamOf.get(uid)));
      assert.equal(teams.size, 1, `${name} arrived together, play together`);
    }
    const solos = result.groups.map((group) => count(group.participants,
      (member) => member.arrivalGroup === null));
    assert.ok(Math.max(...solos) - Math.min(...solos) <= 2,
      `solo arrivals spread: ${solos.join(",")}`);
    assert.ok(solos.every((value) => value >= 1),
      "every team has someone who came alone");
  });

test("dinner: tables of four to six seat by affinity with couples beside " +
  "each other", () => {
  const people = Array.from({length: 22}, (_, index) =>
    person(`d${pad(index)}`, {
      compatibilityAnswerIds: index % 2 === 0 ?
        ["books", "jazz"] : ["climbing", "trail"],
      arrivalGroup: index === 0 || index === 2 ? "couple-a" :
        index === 1 || index === 3 ? "couple-b" : null,
    }));
  const result = run({
    participants: people,
    topology: topology({unitKind: "tables", unitSize: 6, groupCount: 4,
      maxGroupSize: 6, topology: "adjacency",
      resourceCapacity: {concurrentUnits: 5, resourceLabelId: "table",
        seatsPerUnit: 6}}),
    assignmentAlgorithm: "tableSeating",
    compatibilityPolicy: "questionnaireClueOnly",
    matchingObjective: "affinity",
  });
  assert.equal(result.assignmentResolution.status, "supported");
  assert.equal(result.effectiveMatchingObjective, "affinity");
  const sizes = result.groups.map((group) => group.participants.length);
  assert.deepEqual([...sizes].sort(), [5, 5, 6, 6]);
  assert.ok(sizes.every((size) => size >= 4 && size <= 6));
  const mixedTables = count(result.groups, (group) => new Set(
    group.participants.map((member) => member.compatibilityAnswerIds?.[0]))
    .size > 1);
  assert.equal(mixedTables, 0, "every table shares interests");
  const table = result.plannedRounds[0].units.find((unit) =>
    unit.members.some((member) => member.uid === "d00"));
  assert.ok(table?.members.some((member) => member.uid === "d02"),
    "couple seated at the same table");
  const seats = table?.seatOrder ?? [];
  const index = seats.indexOf("d00");
  const neighbours = [seats[(index + 1) % seats.length],
    seats[(index - 1 + seats.length) % seats.length]];
  assert.ok(neighbours.includes("d02"), "couple seated side by side");
});

test("dinner: course rotations avoid repeating table companions", () => {
  // Four tables of four over three courses is the largest dinner where a
  // repeat-free seating exists (orthogonal Latin squares); tables larger
  // than the table count force repeats by pigeonhole.
  const people = Array.from({length: 16}, (_, index) =>
    person(`c${pad(index)}`));
  const result = run({
    participants: people,
    topology: topology({unitKind: "tables", unitSize: 4, groupCount: 4,
      maxGroupSize: 4, topology: "adjacency", rotationIntervalMinutes: 30,
      rotationsEnabled: true, resourceCapacity: {concurrentUnits: 4,
        resourceLabelId: "table", seatsPerUnit: 4}}),
    assignmentAlgorithm: "tableSeating",
    rotationRoundCount: 3,
  });
  assert.equal(result.groupRounds.length, 3);
  assert.equal(result.explainability.planner?.repeatedPairCount, 0);
  assert.equal(result.explainability.planner?.repeatedNeighborCount, 0);
});

test("singles mixer: opt-in romantic compatibility still drives pairs", () => {
  const people = [
    ...["m1", "m2", "m3"].map((uid) => person(uid, {gender: "man",
      interestedInGenders: ["woman"]})),
    ...["w1", "w2", "w3"].map((uid) => person(uid, {gender: "woman",
      interestedInGenders: ["man"]})),
  ];
  const legacy = run({
    participants: people,
    topology: topology({unitKind: "pairs", unitSize: 2, groupCount: 3,
      maxGroupSize: 2, rotationIntervalMinutes: 15, rotationsEnabled: true}),
    assignmentAlgorithm: "pairRotations",
    compatibilityPolicy: "mutualInterestOnly",
    matchingObjective: "romantic",
    rotationRoundCount: 3,
  });
  assert.equal(legacy.explainability.engineCore, "legacyScorer");
  assert.equal(legacy.effectiveMatchingObjective, "romantic");
  assert.ok(legacy.rotationRounds.every((round) =>
    round.pairs.every((pair) => pair.mutualInterest)));

  // The same romantic objective plugs into the shape planner for tables.
  const tables = run({
    participants: people,
    topology: topology({unitKind: "tables", unitSize: 2, groupCount: 3,
      maxGroupSize: 2}),
    assignmentAlgorithm: "tableSeating",
    compatibilityPolicy: "mutualInterestOnly",
    matchingObjective: "romantic",
  });
  assert.equal(tables.explainability.engineCore, "shapePlanner");
  assert.ok(tables.groups.every((group) => group.mutualDyadCount === 1));

  // Without the opt-in, the planner never reads gender or orientation.
  const coverage = run({
    participants: people,
    topology: topology({unitKind: "tables", unitSize: 2, groupCount: 3,
      maxGroupSize: 2}),
    assignmentAlgorithm: "tableSeating",
    compatibilityPolicy: "questionnaireClueOnly",
    matchingObjective: "romantic",
  });
  assert.equal(coverage.effectiveMatchingObjective, "coverage");
  assert.match(coverage.explainability.matchingObjectiveFallbackReason ?? "",
    /not permitted/);
});

test("safety: blocked and keep-apart pairs are never placed together", () => {
  const people = Array.from({length: 12}, (_, index) =>
    person(`s${pad(index)}`, {arrivalGroup: index < 4 ? "crew" : null,
      compatibilityAnswerIds: ["same"]}));
  const blockedPairs = new Set(["s00__s01", "s02__s03", "s04__s05"]);
  const shapes: Array<Partial<AssignmentEngineContext<Person>> & {
    topology: AssignmentTopology;
  }> = [
    {topology: topology({unitKind: "teams", unitSize: 4, groupCount: 3,
      maxGroupSize: 4}), assignmentAlgorithm: "teamBalancer"},
    {topology: topology({unitKind: "tables", unitSize: 6, groupCount: 2,
      maxGroupSize: 6, topology: "adjacency"}),
    assignmentAlgorithm: "tableSeating",
    compatibilityPolicy: "questionnaireClueOnly",
    matchingObjective: "affinity"},
    {topology: topology({unitKind: "pairs", unitSize: 2, groupCount: 6,
      maxGroupSize: 2, rotationIntervalMinutes: 15, rotationsEnabled: true,
      resourceCapacity: {concurrentUnits: 2, resourceLabelId: "court",
        seatsPerUnit: 4}}),
    assignmentAlgorithm: "pairRotations", rotationRoundCount: 6},
  ];
  for (const shape of shapes) {
    const result = run({
      participants: people,
      blockedPairs,
      constraints: {
        host: {keepApartPairs: [{aUid: "s06", bUid: "s07"}]},
        // A host keep-together on a blocked pair must still lose.
        affinityConstraints: [{aUid: "s00", bUid: "s01", value: "mustPair",
          scope: "pinned"}],
      },
      ...shape,
    });
    for (const round of result.plannedRounds) {
      for (const unit of round.units) {
        const uids = new Set(unit.members.map((member) => member.uid));
        for (const key of [...blockedPairs, "s06__s07"]) {
          const [a, b] = key.split("__");
          assert.ok(!(uids.has(a) && uids.has(b)),
            `${key} together in ${shape.assignmentAlgorithm}`);
        }
      }
    }
    assert.equal(result.explainability.planner?.hardViolationCount, 0);
    assert.ok(result.explainability.constraintEvaluations.some((evaluation) =>
      evaluation.key === "blocked_pair" && evaluation.status === "satisfied"));
  }
});

test("history: a second occurrence avoids pairs who already met", () => {
  const people = Array.from({length: 16}, (_, index) =>
    person(`r${pad(index)}`));
  const shape = {
    participants: people,
    topology: topology({unitKind: "teams", unitSize: 4, groupCount: 4,
      maxGroupSize: 4}),
    assignmentAlgorithm: "teamBalancer" as const,
  };
  const first = run(shape);
  const second = run({...shape, history: first.history});
  assert.equal(second.explainability.planner?.repeatedPairCount, 0);
  assert.ok(Object.values(second.history.pairMeetingCounts)
    .every((value) => value === 1));
});

test("determinism: the same request yields the same plan", () => {
  const people = Array.from({length: 17}, (_, index) =>
    person(`x${pad(index)}`));
  const shape = {
    participants: people,
    topology: topology({unitKind: "teams", unitSize: 4, groupCount: 4,
      maxGroupSize: 5}),
    assignmentAlgorithm: "teamBalancer" as const,
  };
  const uids = (result: ReturnType<typeof run>) => result.groups.map(
    (group) => group.participants.map((member) => member.uid));
  assert.deepEqual(uids(run(shape)), uids(run({...shape,
    participants: [...people].reverse()})));
});

test("opt-in profile attributes: absent unless the event names them", () => {
  const dateOfBirth = {toDate: () => new Date(Date.UTC(1995, 5, 15))};
  const atMillis = Date.UTC(2026, 10, 8);
  const none = optInProfileAttributesForStructureConfig({
    balanceActivityAttributes: ["skillBand"],
  });
  assert.equal(none.size, 0);
  assert.deepEqual(withOptInProfileAttributes({attributes: {skillBand: "a"},
    optIn: none, gender: "woman", dateOfBirth, atMillis}), {skillBand: "a"});
  const optIn = optInProfileAttributesForStructureConfig({
    balanceActivityAttributes: ["gender"],
    clusterActivityAttributes: ["ageBand"],
  });
  assert.deepEqual([...optIn].sort(), ["ageBand", "gender"]);
  assert.deepEqual(withOptInProfileAttributes({attributes: {},
    optIn, gender: "woman", dateOfBirth, atMillis}),
  {gender: "woman", ageBand: "30-34"});
  assert.equal(ageBandAt(null, atMillis), null);
  assert.equal(ageBandAt({toDate: () => new Date(Date.UTC(2012, 0, 1))},
    atMillis), null, "minors never get a band");
});
