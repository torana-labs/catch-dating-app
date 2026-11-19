/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {interactionModelFor, planNight} from "./nightPlan";

const groups = (format: Parameters<typeof planNight>[0], n: number) => {
  const plan = planNight(format, n);
  assert.ok(plan);
  return plan.groups;
};

test("run: one pace group per ten guests, between one and four, labelled by pace", () => {
  assert.deepEqual(groups("run", 8), {kind: "paceGroups", count: 1, size: null, unitKind: null, labels: ["steady"], benchCount: 0});
  assert.deepEqual(groups("run", 10).count, 1);
  assert.deepEqual(groups("run", 11), {kind: "paceGroups", count: 2, size: null, unitKind: null, labels: ["easy", "quick"], benchCount: 0});
  assert.deepEqual(groups("run", 30).labels, ["easy", "steady", "quick"]);
  assert.equal(groups("run", 31).count, 4);
  assert.equal(groups("run", 200).count, 4);
});

test("courts: four to a court, the rest on the bench", () => {
  assert.deepEqual(groups("courts", 12), {kind: "courts", count: 3, size: 4, unitKind: "pairs", labels: [], benchCount: 0});
  assert.deepEqual(groups("courts", 14), {kind: "courts", count: 3, size: 4, unitKind: "pairs", labels: [], benchCount: 2});
  assert.deepEqual(groups("courts", 3), {kind: "courts", count: 1, size: 4, unitKind: "pairs", labels: [], benchCount: 0});
});

test("dinner and quiz size groups with the live assignment engine's own rule", () => {
  assert.deepEqual(groups("dinner", 12), {kind: "units", count: 3, size: 4, unitKind: "tables", labels: [], benchCount: 0});
  assert.equal(groups("dinner", 13).count, 4);
  assert.deepEqual(groups("quiz", 20), {kind: "units", count: 4, size: 5, unitKind: "teams", labels: [], benchCount: 0});
  assert.equal(groups("quiz", 21).count, 5);
});

test("crawl: everyone together, three stops", () => {
  const plan = planNight("crawl", 24);
  assert.ok(plan);
  assert.deepEqual(plan.groups, {kind: "wholeGroup", count: 1, size: 24, unitKind: "wholeGroup", labels: [], benchCount: 0});
  assert.equal(plan.stops, 3);
});

test("the mixing moment and run of show come from the playbook", () => {
  assert.deepEqual(planNight("run", 20)?.mixingMoment, {kind: "runOfShowStage", stage: "mixing", durationMinutes: 12, rotationIntervalMinutes: null});
  assert.deepEqual(planNight("crawl", 20)?.mixingMoment, {kind: "runOfShowStage", stage: "mixing", durationMinutes: 10, rotationIntervalMinutes: null});
  assert.deepEqual(planNight("dinner", 20)?.mixingMoment, {kind: "rotation", stage: "activity", durationMinutes: 30, rotationIntervalMinutes: 30});
  assert.deepEqual(planNight("courts", 20)?.mixingMoment, {kind: "rotation", stage: "activity", durationMinutes: 50, rotationIntervalMinutes: 15});
  assert.deepEqual(planNight("quiz", 20)?.mixingMoment, {kind: "teamRevealAtRoundBreak", stage: "activity", durationMinutes: 60, rotationIntervalMinutes: null});
  const run = planNight("run", 20);
  assert.equal(run?.durationMinutes, 62);
  assert.deepEqual(run?.runOfShow.map((step) => step.stage), ["arrival", "opening", "activity", "mixing", "closing"]);
});

test("three missions: the format's light, personal and reflective prompts", () => {
  assert.deepEqual(planNight("run", 20)?.missions, [
    {promptId: "pacePods.light", disclosureLevel: "light"},
    {promptId: "shared.personal", disclosureLevel: "personal"},
    {promptId: "shared.reflective", disclosureLevel: "reflective"},
  ]);
  assert.equal(planNight("dinner", 20)?.missions[0].promptId, "seatedTable.light");
});

test("a head count outside the playbook's range is noted, not refused", () => {
  assert.deepEqual(planNight("quiz", 10)?.capacity, {min: 16, max: 60, fit: "below"});
  assert.deepEqual(planNight("quiz", 30)?.capacity, {min: 16, max: 60, fit: "within"});
  assert.deepEqual(planNight("courts", 40)?.capacity, {min: 12, max: 32, fit: "above"});
});

test("each format resolves to its playbook's interaction model", () => {
  assert.deepEqual(["run", "dinner", "quiz", "courts", "crawl"].map((format) => planNight(format as never, 20)?.interactionModel),
    ["pacePods", "seatedTable", "teamRotations", "pairedRotations", "routeStops"]);
  assert.equal(interactionModelFor("no_such_playbook"), null);
});
