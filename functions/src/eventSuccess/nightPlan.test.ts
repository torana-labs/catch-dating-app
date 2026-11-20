/* eslint-disable max-len */
import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import {interactionModelFor, NIGHT_PLAN_MAX_GUESTS, NIGHT_PLAN_MAX_UNITS, paceBandsFor, planNight} from "./nightPlan";

const groups = (format: Parameters<typeof planNight>[0], n: number) => {
  const plan = planNight(format, n);
  assert.ok(plan);
  return plan.groups;
};

test("run: one pace group per ten guests, uncapped, named by pace band fastest first", () => {
  assert.deepEqual(groups("run", 8), {kind: "paceGroups", count: 1, size: null, unitKind: null, labels: ["Pace group 1"],
    paceBands: [{label: "Pace group 1", targetPaceSecondsPerKm: null}], benchCount: 0, countLimited: false});
  assert.equal(groups("run", 10).count, 1);
  assert.equal(groups("run", 11).count, 2);
  assert.deepEqual(groups("run", 30).labels, ["Pace group 1", "Pace group 2", "Pace group 3"]);
  // No cap of its own (owner decision, 19 Nov 2026): 50 guests run in 5 groups, 1000 in 100.
  assert.equal(groups("run", 50).count, 5);
  assert.equal(groups("run", 1000).count, 100);
  assert.equal(groups("run", 1000).paceBands.length, 100);
  assert.equal(groups("run", 1000).countLimited, false);
});

test("a pace band is named ~m:ss/km once its pace is known", () => {
  assert.deepEqual(paceBandsFor([300, 345, null]), [
    {label: "~5:00/km", targetPaceSecondsPerKm: 300},
    {label: "~5:45/km", targetPaceSecondsPerKm: 345},
    {label: "Pace group 3", targetPaceSecondsPerKm: null},
  ]);
  assert.equal(paceBandsFor([425])[0].label, "~7:05/km");
});

test("courts: four to a court, the rest on the bench, up to the 200-unit contract limit", () => {
  const court = {kind: "courts", size: 4, unitKind: "pairs", labels: [], paceBands: [], countLimited: false};
  assert.deepEqual(groups("courts", 12), {...court, count: 3, benchCount: 0});
  assert.deepEqual(groups("courts", 14), {...court, count: 3, benchCount: 2});
  assert.deepEqual(groups("courts", 3), {...court, count: 1, benchCount: 0});
  assert.deepEqual(groups("courts", 1000), {...court, count: 200, benchCount: 200, countLimited: true});
});

test("dinner and quiz size groups with the live assignment engine's own rule", () => {
  const unit = {kind: "units", labels: [], paceBands: [], benchCount: 0, countLimited: false};
  assert.deepEqual(groups("dinner", 12), {...unit, count: 3, size: 4, unitKind: "tables"});
  assert.equal(groups("dinner", 13).count, 4);
  assert.deepEqual(groups("quiz", 20), {...unit, count: 4, size: 5, unitKind: "teams"});
  assert.equal(groups("quiz", 21).count, 5);
});

test("groups at the extremes match night.plan's response contract", () => {
  const response = JSON.parse(readFileSync(path.join(__dirname, "../../../contracts/callable_responses/plan_night_response.schema.json"), "utf8"));
  const groupsSchema = response.properties.result.properties.plan.anyOf[1].properties.groups;
  const validate = new Ajv({strict: false}).compile(groupsSchema);
  for (const format of ["run", "dinner", "quiz", "courts", "crawl"] as const) {
    for (const n of [2, 17, 200, 999, 1000]) {
      assert.equal(validate(groups(format, n)), true, `${format} ${n}: ${JSON.stringify(validate.errors)}`);
    }
  }
});

test("past 200 units the same guests share fewer, larger units, and the plan stores that count", () => {
  const plan = planNight("dinner", 1000)!;
  assert.deepEqual(plan.groups, {kind: "units", count: 200, size: 5, unitKind: "tables", labels: [], paceBands: [],
    benchCount: 0, countLimited: true});
  assert.equal(plan.structureConfig.unitCount, 200);
  assert.equal(planNight("dinner", 800)!.groups.countLimited, false);
});

test("the only hard limits are the plan contract's bounds", () => {
  const common = JSON.parse(readFileSync(path.join(__dirname, "../../../contracts/shared/event_common.schema.json"), "utf8"));
  const plans = JSON.parse(readFileSync(path.join(__dirname, "../../../contracts/firestore/event_success_plans.schema.json"), "utf8"));
  assert.equal(NIGHT_PLAN_MAX_UNITS, common.definitions.eventSuccessStructureConfig.properties.unitCount.maximum);
  assert.equal(NIGHT_PLAN_MAX_GUESTS, plans.properties.targetAttendeeCount.maximum);
  assert.equal(planNight("run", 5000)!.guestCount, 1000);
});

test("crawl: everyone together, three stops", () => {
  const plan = planNight("crawl", 24);
  assert.ok(plan);
  assert.deepEqual(plan.groups, {kind: "wholeGroup", count: 1, size: 24, unitKind: "wholeGroup", labels: [], paceBands: [],
    benchCount: 0, countLimited: false});
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
