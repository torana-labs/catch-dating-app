import assert from "node:assert/strict";
import test from "node:test";
import {testCommercialTerms} from "../commercialTerms/testFixture";
import {computeTrialStatus, dayMillis, trialWindow} from "./hostTrial";

const terms = testCommercialTerms();
const start = Date.UTC(2026, 9, 1, 12);
const none = {firstEventAtMillis: null, firstPaidBookingAtMillis: null};

test("the trial waits for the first event or paid booking", () => {
  assert.deepEqual(computeTrialStatus({anchors: none, terms,
    nowMillis: start}), {state: "notStarted", anchor: null, days: 30,
    startsAtMillis: null, endsAtMillis: null, daysLeft: null});
});

test("unsaved platform terms report the trial as unconfigured", () => {
  assert.equal(computeTrialStatus({anchors: {...none,
    firstEventAtMillis: start}, terms: null, nowMillis: start}).state,
  "unconfigured");
});

test("the first event wins over the first paid booking", () => {
  const window = trialWindow({firstEventAtMillis: start,
    firstPaidBookingAtMillis: start - 5 * dayMillis}, 30);
  assert.deepEqual(window, {anchor: "firstEvent", startsAtMillis: start,
    endsAtMillis: start + 30 * dayMillis});
  assert.equal(trialWindow({...none, firstPaidBookingAtMillis: start}, 30)
    ?.anchor, "firstPaidBooking");
});

test("days left round up and count down to the end", () => {
  const anchors = {...none, firstEventAtMillis: start};
  const at = (millis: number) => computeTrialStatus({anchors, terms,
    nowMillis: millis});
  assert.deepEqual(at(start), {state: "active", anchor: "firstEvent",
    days: 30, startsAtMillis: start, endsAtMillis: start + 30 * dayMillis,
    daysLeft: 30});
  assert.equal(at(start + 18 * dayMillis + 1).daysLeft, 12);
  assert.equal(at(start + 30 * dayMillis - 1).daysLeft, 1);
  const ended = at(start + 30 * dayMillis);
  assert.equal(ended.state, "ended");
  assert.equal(ended.daysLeft, null);
  assert.equal(ended.endsAtMillis, start + 30 * dayMillis);
});

test("a booked first event in the future schedules the trial", () => {
  const status = computeTrialStatus({anchors: {...none,
    firstEventAtMillis: start}, terms, nowMillis: start - 3 * dayMillis});
  assert.equal(status.state, "scheduled");
  assert.equal(status.daysLeft, 30);
});

test("zero trial days means no trial", () => {
  const noTrial = {...terms, trial: {days: 0, anchor: "firstEvent" as const}};
  assert.equal(computeTrialStatus({anchors: {...none,
    firstEventAtMillis: start}, terms: noTrial, nowMillis: start}).state,
  "none");
  assert.equal(computeTrialStatus({anchors: none, terms: noTrial,
    nowMillis: start}).state, "none");
});
