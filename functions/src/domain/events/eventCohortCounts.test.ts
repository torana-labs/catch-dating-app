import assert from "node:assert/strict";
import test from "node:test";
import {withEventCohortCounts} from "./eventCohortCounts";

test("private cohort totals replace the event's copy map by map", () => {
  const event = {bookedCount: 3, genderCounts: {woman: 2},
    cohortCounts: {queerOrOpen: 9}, waitlistedCohortCounts: {queerOrOpen: 1}};
  const seen = withEventCohortCounts(event, {eventId: "e",
    cohortCounts: {queerOrOpen: 2}});
  assert.deepEqual(seen.cohortCounts, {queerOrOpen: 2});
  // A map not moved yet keeps the event's legacy copy.
  assert.deepEqual(seen.waitlistedCohortCounts, {queerOrOpen: 1});
  assert.deepEqual(seen.genderCounts, {woman: 2});
  assert.deepEqual(event.cohortCounts, {queerOrOpen: 9});
});

test("an event with no private totals reads as it is stored", () => {
  const event = {bookedCount: 0};
  assert.deepEqual(withEventCohortCounts(event, undefined), event);
});
