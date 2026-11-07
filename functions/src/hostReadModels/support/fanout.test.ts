import assert from "node:assert/strict";
import test from "node:test";
import {sameFields, valueAt} from "./fanout";
import {distinctIds, isAssistanceId} from "./ids";

test("valueAt reads dotted paths", () => {
  assert.equal(valueAt({context: {mode: "live"}}, "context.mode"), "live");
  assert.equal(valueAt({context: null}, "context.mode"), undefined);
  assert.equal(valueAt(undefined, "context"), undefined);
});

test("sameFields compares only the listed fields of both versions", () => {
  const before = {status: "open", hostProfiles: [{uid: "a"}], other: 1};
  assert.equal(sameFields(before, {...before, other: 2},
    ["status", "hostProfiles"]), true);
  assert.equal(sameFields(before, {...before, hostProfiles: [{uid: "b"}]},
    ["status", "hostProfiles"]), false);
  assert.equal(sameFields(undefined, before, ["status"]), false);
  assert.equal(sameFields(before, undefined, ["status"]), false);
});

test("assistance ids accept the stores' document ids only", () => {
  assert.equal(isAssistanceId("event-1:a.b_c"), true);
  assert.equal(isAssistanceId("a".repeat(160)), true);
  assert.equal(isAssistanceId("a".repeat(161)), false);
  assert.equal(isAssistanceId("-leading"), false);
  assert.equal(isAssistanceId("has/slash"), false);
  assert.equal(isAssistanceId(7), false);
  assert.deepEqual(distinctIds(["a", "a", undefined, "b", "/bad"]),
    ["a", "b"]);
});
