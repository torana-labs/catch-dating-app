import assert from "node:assert/strict";
import test from "node:test";
import {departureLeaveBy, departureState} from "./programDepartures";

const HOUR = 3_600_000;

test("leave-by prefers the reviewed curb time over the flight lead", () => {
  assert.equal(departureLeaveBy({manualCurbAtMillis: 10,
    flightAtMillis: 99 * HOUR}), 10);
  assert.equal(departureLeaveBy({manualCurbAtMillis: null,
    flightAtMillis: 5 * HOUR}), 2 * HOUR);
  assert.equal(departureLeaveBy({manualCurbAtMillis: null,
    flightAtMillis: null}), null);
});

test("desk state reads the journey first, then the stay", () => {
  assert.equal(departureState({readiness: "arrived", pickupPointId: "a"},
    "checkedIn"), "left");
  assert.equal(departureState({readiness: "expected", pickupPointId: "a"},
    "checkedOut"), "checkedOut");
  assert.equal(departureState({readiness: "expected", pickupPointId: null},
    null), "carNotNeeded");
  assert.equal(departureState({readiness: "ready", pickupPointId: "a"},
    "checkedIn"), "inRoom");
});
