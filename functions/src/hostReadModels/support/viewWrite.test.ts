import assert from "node:assert/strict";
import test from "node:test";
import {
  countOutcome,
  emptyOutcomeCounts,
  EvaluationFields,
  planViewWrite,
  positiveInteger,
} from "./viewWrite";

interface Doc extends EvaluationFields {
  view: Record<string, unknown> | null;
}

const stamp = (millis: number) =>
  ({toMillis: () => millis}) as unknown as FirebaseFirestore.Timestamp;

const next = {sourceCoverage: "complete" as const, incompleteSource: null,
  view: {a: 1, b: [1, 2]}};

test("a first write starts at revision 1", () => {
  const now = stamp(5);
  const plan = planViewWrite<Doc>(null, next, now);
  assert.equal(plan.unchanged, false);
  assert.equal(plan.revision, 1);
  assert.deepEqual(plan.unchanged ? null : plan.document,
    {...next, revision: 1, evaluatedAt: now});
});

test("an unchanged document is not written, whatever its key order", () => {
  const previous: Doc = {revision: 3, evaluatedAt: stamp(1),
    view: {b: [1, 2], a: 1}, incompleteSource: null,
    sourceCoverage: "complete"};
  assert.deepEqual(planViewWrite<Doc>(previous, next, stamp(5)),
    {unchanged: true, revision: 3});
});

test("undefined fields compare as Firestore reads them", () => {
  const previous: Doc = {revision: 2, evaluatedAt: stamp(1), ...next};
  assert.equal(planViewWrite<Doc>(previous,
    {...next, view: {...next.view, gone: undefined}}, stamp(5)).unchanged,
  true);
});

test("a changed document gets the next revision", () => {
  const previous: Doc = {revision: 2, evaluatedAt: stamp(1), ...next};
  const plan = planViewWrite<Doc>(previous, {...next, view: null}, stamp(9));
  assert.equal(plan.unchanged, false);
  assert.equal(plan.revision, 3);
});

test("an unusable previous revision restarts at 1", () => {
  const previous = {revision: -4, evaluatedAt: stamp(1), ...next} as Doc;
  assert.equal(planViewWrite<Doc>(previous, {...next, view: null},
    stamp(9)).revision, 1);
});

test("positiveInteger accepts only positive safe integers", () => {
  assert.equal(positiveInteger(4), 4);
  for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "4", null,
    undefined]) {
    assert.equal(positiveInteger(value), null, String(value));
  }
});

test("outcome counts start at zero and count by kind", () => {
  const counts = emptyOutcomeCounts();
  assert.deepEqual(counts,
    {removed: 0, unchanged: 0, complete: 0, invalidSource: 0});
  countOutcome(counts, {kind: "complete", revision: 1});
  countOutcome(counts, {kind: "complete", revision: 2});
  countOutcome(counts, {kind: "invalidSource", source: "events",
    detail: "bad", revision: 1, written: true});
  assert.deepEqual(counts,
    {removed: 0, unchanged: 0, complete: 2, invalidSource: 1});
});
