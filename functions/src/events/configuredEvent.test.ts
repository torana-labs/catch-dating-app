import assert from "node:assert/strict";
import test from "node:test";
import {HttpsError} from "firebase-functions/v2/https";
import type {EventDocument} from "../shared/generated/firestoreAdminTypes";
import {isConfiguredEvent, isPublicConfiguredEvent,
  requireConfiguredEvent, requirePublicConfiguredEvent} from
  "./configuredEvent";

const time = (millis: number) => ({
  toMillis: () => millis,
}) as FirebaseFirestore.Timestamp;

function event(overrides: Record<string, unknown> = {}): EventDocument {
  return {
    organizerId: "club-1",
    startTime: time(1_000),
    endTime: time(2_000),
    meetingPoint: "Park gate",
    meetingLocation: {name: "Park", latitude: 19, longitude: 72},
    eventFormat: {
      version: 1,
      activityKind: "running",
      interactionModel: "pacePods",
    },
    capacityLimit: 20,
    priceInPaise: 0,
    ...overrides,
  } as EventDocument;
}

test("configured event accepts rich legacy and published events", () => {
  assert.equal(isConfiguredEvent(event()), true);
  assert.equal(isConfiguredEvent(event({publicationState: "published",
    setupRevision: 1})), true);
  assert.equal(isConfiguredEvent(event({publicationState: "private",
    setupRevision: 1})), true);
  assert.equal(isPublicConfiguredEvent(event({publicationState: "private",
    setupRevision: 1})), false);
  assert.equal(isPublicConfiguredEvent(event()), true);
  assert.equal(requireConfiguredEvent(event()).capacityLimit, 20);
  assert.throws(() => requirePublicConfiguredEvent(event({
    publicationState: "private", setupRevision: 1,
  })), (error) => error instanceof HttpsError &&
    error.code === "failed-precondition");
});

test("incomplete setup never becomes configured event authority",
  () => {
    for (const candidate of [
      event({capacityLimit: undefined}),
      event({capacityLimit: 0}),
      event({priceInPaise: undefined}),
      event({priceInPaise: -1}),
      event({endTime: undefined}),
      event({endTime: time(500)}),
      event({meetingLocation: undefined}),
      event({eventFormat: undefined}),
    ]) {
      assert.equal(isConfiguredEvent(candidate), false);
      assert.throws(() => requireConfiguredEvent(candidate), (error) =>
        error instanceof HttpsError && error.code === "failed-precondition");
    }
  });
