import assert from "node:assert/strict";
import test from "node:test";
import {FakeFirestore} from "../shared/testing/programFirestore";
import {MOMENT_RUNS_COLLECTION} from "./momentDocuments";
import type {MomentDefinition} from "./momentModel";
import {loadMomentPlans, summarizeMomentPlans} from "./momentPlans";

function moment(
  momentId: string,
  overrides: Partial<MomentDefinition> = {},
): MomentDefinition {
  return {
    momentId,
    scope: {kind: "program", programId: "prog"},
    name: momentId,
    initiation: {kind: "scheduled", atMillis: 5_000},
    sense: "audience",
    audience: {kind: "households", rsvpPendingOnly: false},
    action: {kind: "push", notificationType: "programUpdate",
      preferenceKey: "programUpdates"},
    status: "armed",
    approval: {approvedByUid: "mgr", approvedAtMillis: 1},
    origin: "organizer",
    revision: 1,
    ...overrides,
  };
}

test("anchors default from the initiation when none is stored", () => {
  const plans = summarizeMomentPlans([
    moment("a", {initiation: {kind: "anchored", anchorKind: "functionStart",
      anchorId: "sangeet", offsetMinutes: -60}}),
    moment("b", {initiation: {kind: "anchored", anchorKind: "travelLegTime",
      anchorId: null, offsetMinutes: -120}}),
    moment("c"),
    moment("d", {anchor: {kind: "flight", id: "leg1"}}),
  ], new Map());
  assert.deepEqual(plans.map((plan) => plan.anchor), [
    {kind: "function", id: "sangeet"},
    {kind: "flight", id: null},
    {kind: "date", id: null},
    {kind: "flight", id: "leg1"},
  ]);
});

test("the soonest armed run is next; sent and paused read through", () => {
  const plans = summarizeMomentPlans([
    moment("later"),
    moment("soon"),
    moment("sent"),
    moment("paused", {status: "paused", approval: null}),
    moment("draft", {status: "draft", approval: null}),
  ], new Map([
    ["later", {sent: 0, nextDueAtMillis: 9_000}],
    ["soon", {sent: 0, nextDueAtMillis: 3_000}],
    ["sent", {sent: 118, nextDueAtMillis: null}],
    ["paused", {sent: 0, nextDueAtMillis: 1_000}],
  ]));
  assert.deepEqual(plans.map((plan) => [plan.momentId, plan.state,
    plan.nextRunAtMillis, plan.sentCount]), [
    ["later", "planned", 9_000, 0],
    ["soon", "next", 3_000, 0],
    ["sent", "sent", null, 118],
    ["paused", "paused", null, 0],
    ["draft", "draft", null, 0],
  ]);
});

test("loadMomentPlans sums dispatched sends, ignores other runs", async () => {
  const runs = MOMENT_RUNS_COLLECTION;
  const db = new FakeFirestore({
    [`${runs}/r1`]: {runId: "r1", momentId: "m", status: "dispatched",
      sent: 40, dueAtMillis: 1_000},
    [`${runs}/r2`]: {runId: "r2", momentId: "m", status: "dispatched",
      sent: 72, dueAtMillis: 2_000},
    [`${runs}/r3`]: {runId: "r3", momentId: "m", status: "planned",
      dueAtMillis: 8_000},
    [`${runs}/r4`]: {runId: "r4", momentId: "m", status: "superseded",
      dueAtMillis: 4_000},
    [`${runs}/r5`]: {runId: "r5", momentId: "other", status: "dispatched",
      sent: 9, dueAtMillis: 1_000},
  });
  const [plan] = await loadMomentPlans(db as never, [moment("m")]);
  assert.equal(plan.sentCount, 112);
  assert.equal(plan.nextRunAtMillis, 8_000);
  assert.equal(plan.state, "next");
  assert.deepEqual(await loadMomentPlans(db as never, []), []);
});
