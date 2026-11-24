import assert from "node:assert/strict";
import test from "node:test";
import {isHttpsError} from "../shared/testUtils";
import {
  defaultUnitOutcomeFor,
  eventSuccessPrimitivesFor,
} from "../domain/formats/formatPrimitives";
import {resolveUnitOutcomeUpdate} from "./unitOutcomes";

test("binds all four reviewed formats to their unit outcomes", () => {
  assert.equal(defaultUnitOutcomeFor("pacePods"), "completion");
  assert.equal(defaultUnitOutcomeFor("teamRotations"), "score");
  assert.equal(defaultUnitOutcomeFor("seatedTable"), "none");
  assert.equal(defaultUnitOutcomeFor("pairedRotations"), "rank");
  assert.equal(defaultUnitOutcomeFor("freeFormMixer"), "none");
  assert.equal(defaultUnitOutcomeFor("hostLedProgram"), "none");
  assert.equal(defaultUnitOutcomeFor("openFormat"), "none");
});

test("saved unit outcome overrides its format binding", () => {
  const resolved = eventSuccessPrimitivesFor({
    version: 1,
    activityKind: "pubQuiz",
    interactionModel: "teamRotations",
    eventSuccessPrimitives: {unitOutcome: "completion"},
  });

  assert.equal(resolved.unitOutcome, "completion");
  assert.equal(resolved.assignmentResolution.unitOutcome, "completion");
});

test("score standings accumulate rounds and replace corrected rounds", () => {
  const first = resolveUnitOutcomeUpdate({
    unitOutcome: "score",
    expectedRevision: 0,
    roundIndex: 0,
    entries: [
      {unitId: "a", unitLabel: "Team A", score: 10},
      {unitId: "b", unitLabel: "Team B", score: 5},
    ],
  });
  const second = resolveUnitOutcomeUpdate({
    unitOutcome: "score",
    current: {
      unitOutcome: "score",
      revision: first.revision,
      rounds: first.rounds,
    },
    expectedRevision: 1,
    roundIndex: 1,
    entries: [
      {unitId: "a", unitLabel: "Team A", score: 2},
      {unitId: "b", unitLabel: "Team B", score: 8},
    ],
  });

  assert.deepEqual(
    second.standings.map((entry) => [entry.unitId, entry.value]),
    [["b", 13], ["a", 12]]
  );
  assert.deepEqual(second.standings.map((entry) => entry.position), [1, 2]);

  const corrected = resolveUnitOutcomeUpdate({
    unitOutcome: "score",
    current: {
      unitOutcome: "score",
      revision: second.revision,
      rounds: second.rounds,
    },
    expectedRevision: 2,
    roundIndex: 1,
    entries: [
      {unitId: "a", unitLabel: "Team A", score: 20},
      {unitId: "b", unitLabel: "Team B", score: 1},
    ],
  });
  assert.deepEqual(
    corrected.standings.map((entry) => [entry.unitId, entry.value]),
    [["a", 30], ["b", 6]]
  );
  assert.equal(corrected.rounds.length, 2);
});

test("exact outcome replay is idempotent before revision checking", () => {
  const first = resolveUnitOutcomeUpdate({
    unitOutcome: "completion",
    expectedRevision: 0,
    roundIndex: 0,
    entries: [{unitId: "segment", unitLabel: "First leg", completed: true}],
  });
  const replay = resolveUnitOutcomeUpdate({
    unitOutcome: "completion",
    current: {
      unitOutcome: "completion",
      revision: first.revision,
      rounds: first.rounds,
    },
    expectedRevision: 0,
    roundIndex: 0,
    entries: [{unitId: "segment", unitLabel: "First leg", completed: true}],
  });

  assert.equal(replay.replayed, true);
  assert.equal(replay.revision, 1);
  assert.deepEqual(replay.standings, []);
});

test("rank standings use the latest complete ordering", () => {
  const first = resolveUnitOutcomeUpdate({
    unitOutcome: "rank",
    expectedRevision: 0,
    roundIndex: 0,
    entries: [
      {unitId: "a", unitLabel: "Asha", rank: 1},
      {unitId: "b", unitLabel: "Kabir", rank: 2},
    ],
  });
  const second = resolveUnitOutcomeUpdate({
    unitOutcome: "rank",
    current: {
      unitOutcome: "rank",
      revision: first.revision,
      rounds: first.rounds,
    },
    expectedRevision: 1,
    roundIndex: 1,
    entries: [
      {unitId: "a", unitLabel: "Asha", rank: 2},
      {unitId: "b", unitLabel: "Kabir", rank: 1},
    ],
  });

  assert.deepEqual(
    second.standings.map((entry) => [entry.unitId, entry.value]),
    [["b", 1], ["a", 2]]
  );
  assert.deepEqual(
    second.standings.map((entry) => entry.roundsRecorded),
    [2, 2]
  );
});

test("rank outcomes require one contiguous unique ordering", () => {
  assert.throws(
    () => resolveUnitOutcomeUpdate({
      unitOutcome: "rank",
      expectedRevision: 0,
      roundIndex: 0,
      entries: [
        {unitId: "a", unitLabel: "A", rank: 1},
        {unitId: "b", unitLabel: "B", rank: 3},
      ],
    }),
    (error) => {
      isHttpsError(error, "invalid-argument", "complete ordering");
      return true;
    }
  );
});

test("invalid outcome states fail closed", () => {
  assert.throws(
    () => resolveUnitOutcomeUpdate({
      unitOutcome: "none",
      expectedRevision: 0,
      roundIndex: 0,
      entries: [{unitId: "a", unitLabel: "A", score: 1}],
    }),
    (error) => {
      isHttpsError(error, "failed-precondition", "does not record");
      return true;
    }
  );
  assert.throws(
    () => resolveUnitOutcomeUpdate({
      unitOutcome: "score",
      expectedRevision: 0,
      roundIndex: 2,
      entries: [{unitId: "a", unitLabel: "A", score: 1}],
    }),
    (error) => {
      isHttpsError(error, "failed-precondition", "recorded in order");
      return true;
    }
  );
  assert.throws(
    () => resolveUnitOutcomeUpdate({
      unitOutcome: "score",
      expectedRevision: 0,
      roundIndex: 0,
      entries: [{unitId: "a", unitLabel: "A", rank: 1}],
    }),
    (error) => {
      isHttpsError(error, "invalid-argument", "must match");
      return true;
    }
  );
  assert.throws(
    () => resolveUnitOutcomeUpdate({
      unitOutcome: "completion",
      expectedRevision: 0,
      roundIndex: 0,
      entries: [
        {unitId: "a", unitLabel: "A", completed: true},
        {unitId: "a", unitLabel: "A again", completed: false},
      ],
    }),
    (error) => {
      isHttpsError(error, "invalid-argument", "unique unit ids");
      return true;
    }
  );
  assert.throws(
    () => resolveUnitOutcomeUpdate({
      unitOutcome: "score",
      current: {unitOutcome: "score", revision: 2, rounds: []},
      expectedRevision: 1,
      roundIndex: 0,
      entries: [{unitId: "a", unitLabel: "A", score: 1}],
    }),
    (error) => {
      isHttpsError(error, "aborted", "another device");
      return true;
    }
  );
});
