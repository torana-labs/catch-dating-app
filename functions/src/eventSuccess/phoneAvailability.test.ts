import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultPhoneAvailabilityFor,
  eventSuccessGuestCueAllowed,
  eventSuccessPrimitivesFor,
  type EventSuccessGuestCueTiming,
  type EventSuccessPhoneAvailability,
} from "./formatPrimitives";

const TIMINGS: EventSuccessGuestCueTiming[] =
  ["arrival", "stepChange", "midStep", "postEvent"];

test("phone availability defaults mirror the Dart profile", () => {
  assert.equal(
    defaultPhoneAvailabilityFor({activityKind: "socialRun"}, "pacePods"),
    "arrivalAndPostEventOnly"
  );
  assert.equal(
    defaultPhoneAvailabilityFor({activityKind: "pickleball"},
      "pairedRotations"),
    "plannedPauses"
  );
  assert.equal(
    defaultPhoneAvailabilityFor({activityKind: "pubQuiz"}, "teamRotations"),
    "plannedPauses"
  );
  assert.equal(
    defaultPhoneAvailabilityFor({activityKind: "dinner"}, "seatedTable"),
    "continuous"
  );
  assert.equal(
    defaultPhoneAvailabilityFor({activityKind: "barCrawl"}, "routeStops"),
    "plannedPauses"
  );
  assert.equal(
    defaultPhoneAvailabilityFor({activityKind: "cycling"}, "hostLedProgram"),
    "hostOnlyLive"
  );
  assert.equal(
    defaultPhoneAvailabilityFor({activityKind: "yoga"}, "hostLedProgram"),
    "plannedPauses"
  );
  assert.equal(
    defaultPhoneAvailabilityFor({activityKind: "openActivity"}, "openFormat"),
    "hostOnlyLive"
  );
});

test("continuous lets every cue through, mid-step included", () => {
  for (const timing of TIMINGS) {
    for (const underway of [true, false]) {
      assert.equal(
        eventSuccessGuestCueAllowed("continuous", timing, underway),
        true
      );
    }
  }
});

test("planned pauses hold mid-step cues for the next step change", () => {
  for (const underway of [true, false]) {
    assert.equal(
      eventSuccessGuestCueAllowed("plannedPauses", "midStep", underway),
      false
    );
    for (const timing of ["arrival", "stepChange", "postEvent"] as const) {
      assert.equal(
        eventSuccessGuestCueAllowed("plannedPauses", timing, underway),
        true
      );
    }
  }
});

test("arrival-and-post-event-only never interrupts the activity", () => {
  const awayModes: EventSuccessPhoneAvailability[] =
    ["arrivalAndPostEventOnly", "hostOnlyLive", "noneDuringActivity"];
  for (const mode of awayModes) {
    for (const timing of ["arrival", "stepChange", "midStep"] as const) {
      assert.equal(eventSuccessGuestCueAllowed(mode, timing, true), false);
    }
    assert.equal(eventSuccessGuestCueAllowed(mode, "arrival", false), true);
    assert.equal(eventSuccessGuestCueAllowed(mode, "stepChange", false), true);
    assert.equal(eventSuccessGuestCueAllowed(mode, "postEvent", true), true);
  }
});

test("a saved phone availability overrides the format default", () => {
  const resolved = eventSuccessPrimitivesFor({
    version: 1,
    activityKind: "socialRun",
    interactionModel: "pacePods",
    eventSuccessPrimitives: {phoneAvailability: "continuous"},
  });
  assert.equal(resolved.phoneAvailability, "continuous");
});

test("crawls resolve to a route with stops", () => {
  const resolved = eventSuccessPrimitivesFor({
    version: 1,
    activityKind: "barCrawl",
    interactionModel: "routeStops",
  });

  assert.equal(resolved.interactionModel, "routeStops");
  assert.equal(resolved.durationShape, "stops");
  assert.equal(resolved.accountability, "sweep");
  assert.equal(resolved.phoneAvailability, "plannedPauses");
  assert.equal(resolved.assignmentAlgorithm, "none");
  assert.equal(resolved.unitOutcome, "none");
  assert.equal(resolved.assignmentResolution.status, "unsupported");
});

test("dinner resolves to continuous phones without a sweep", () => {
  const resolved = eventSuccessPrimitivesFor({
    version: 1,
    activityKind: "dinner",
    interactionModel: "seatedTable",
  });

  assert.equal(resolved.phoneAvailability, "continuous");
  assert.equal(resolved.accountability, "none");
  assert.equal(
    eventSuccessPrimitivesFor({
      version: 1,
      activityKind: "dinner",
      interactionModel: "seatedTable",
      eventSuccessPrimitives: {accountability: "sweep"},
    }).accountability,
    "sweep"
  );
});
