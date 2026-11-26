import assert from "node:assert/strict";
import {test} from "node:test";
import {
  hostAnalyticsCallableResponseSchema,
} from "../shared/generated/schemas/hostAnalyticsOutput";
import {lazyValidator} from "../shared/generated/schemaValidationRuntime";
import {buildHostEventCoach} from "./hostEventCoach";

const scorecard = {
  eventId: "event-1",
  organizerId: "organizer-1",
  bookedCount: 24,
  checkedInCount: 18,
  feedbackCount: 9,
  attendeesWhoMetTwoPlusPeople: 15,
  catchSentCount: 30,
  attendeesWhoCaughtSomeone: 12,
  catchRecipientCount: 14,
  catchRate: 0.67,
  mutualMatchCount: 5,
  chatStartedCount: 3,
  averageWelcomeRating: 4.4,
  averageStructureRating: 4.1,
  safetyIncidentCount: 0,
  conversationGraph: {responseCount: 10, conversationCount: 22},
  funnel: {bookedCount: 24, checkedInCount: 18, repeatAttendeeCount: 6},
  updatedAt: "2026-11-20T21:00:00.000Z",
  synthetic: true,
  seedPrefix: "demo",
};

test("no scorecard means no coach block", () => {
  assert.equal(buildHostEventCoach(undefined, 10), null);
});

test("a group at or above the floor gets the aggregate figures", () => {
  const coach = buildHostEventCoach(scorecard, 10);
  assert.equal(coach?.status, "ready");
  assert.equal(coach?.caption, null);
  assert.equal(coach?.scorecard?.checkedInCount, 18);
  assert.equal(coach?.scorecard?.mutualMatchCount, 5);
  assert.equal(coach?.scorecard?.conversationGraph.conversationCount, 22);
  assert.equal(coach?.scorecard?.conversationGraph.skippedCount, 0);
  assert.equal(coach?.scorecard?.funnel.repeatAttendeeCount, 6);
  // Identifiers and demo markers stay on the server.
  assert.equal("eventId" in (coach?.scorecard ?? {}), false);
  assert.equal("synthetic" in (coach?.scorecard ?? {}), false);
});

test("a group below the floor carries no figures at all", () => {
  const coach = buildHostEventCoach({...scorecard, checkedInCount: 9}, 10);
  assert.deepEqual(coach, {
    status: "withheld",
    groupSizeFloor: 10,
    caption: "The coach report shows once at least 10 guests checked in.",
    scorecard: null,
  });
});

test("Admin applies no floor", () => {
  const coach = buildHostEventCoach({...scorecard, checkedInCount: 3}, 0);
  assert.equal(coach?.status, "ready");
  assert.equal(coach?.scorecard?.checkedInCount, 3);
});

test("unusable stored values read as zero or clamp into range", () => {
  const coach = buildHostEventCoach({
    checkedInCount: 12,
    catchRate: 4,
    averageWelcomeRating: -1,
    mutualMatchCount: "five",
  }, 10);
  assert.equal(coach?.scorecard?.catchRate, 1);
  assert.equal(coach?.scorecard?.averageWelcomeRating, 0);
  assert.equal(coach?.scorecard?.mutualMatchCount, 0);
});

test("both coach shapes satisfy the response contract", () => {
  const properties = (hostAnalyticsCallableResponseSchema as {
    properties: Record<string, Record<string, unknown>>;
  }).properties;
  const validate = lazyValidator<unknown>(properties.eventCoach);
  for (const coach of [
    buildHostEventCoach(scorecard, 10),
    buildHostEventCoach({...scorecard, checkedInCount: 2}, 10),
  ]) {
    assert.equal(validate(coach), true, JSON.stringify(validate.errors));
  }
});
