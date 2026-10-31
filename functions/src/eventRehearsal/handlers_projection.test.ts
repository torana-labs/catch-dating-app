import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import type {
  EventDocument,
  EventRehearsalActorDocument,
  EventRehearsalDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  rehearsalGuestProjection,
  rehearsalSetupFromEvent,
} from "./handlers";

test("source rehearsal freezes synthetic movement", () => {
  const startTime = admin.firestore.Timestamp.fromMillis(
    Date.parse("2026-08-25T10:00:00.000Z")
  );
  const endTime = admin.firestore.Timestamp.fromMillis(
    Date.parse("2026-08-25T12:00:00.000Z")
  );
  const setup = rehearsalSetupFromEvent({
    name: "Monsoon Miles",
    publicationState: "private",
    setupRevision: 1,
    organizerId: "organizer-1",
    startTime,
    endTime,
    meetingPoint: "Promenade",
    meetingLocation: {
      name: "Promenade gate",
      latitude: 19.1,
      longitude: 72.8,
    },
    itinerary: [{
      id: "water",
      kind: "stop",
      offsetMinutes: 45,
      title: "Water regroup",
    }],
    eventFormat: {
      version: 1,
      activityKind: "socialRun",
      interactionModel: "pacePods",
      activityDetails: {
        routePlan: {
          version: 2,
          movementMode: "run",
          routeShape: "loop",
          groupStrategy: "paceGroups",
          stopCadence: "hostedStops",
          stopKinds: ["water"],
          roleKinds: ["routeLead", "sweep"],
          path: [
            {latitude: 19.1, longitude: 72.8},
            {latitude: 19.2, longitude: 72.9},
            {latitude: 19.3, longitude: 73},
          ],
          liveTrackingPolicy: {
            mode: "authorizedOperators",
            staleAfterSeconds: 120,
            retentionMinutes: 15,
          },
        },
      },
    },
  } as EventDocument);

  assert.equal(setup.title, "Monsoon Miles");
  assert.equal(setup.locationName, "Promenade gate");
  assert.equal(setup.durationMinutes, 120);
  assert.deepEqual(setup.movementSimulation?.itinerary, [{
    id: "water",
    kind: "stop",
    offsetMinutes: 45,
    title: "Water regroup",
  }]);
  assert.deepEqual(setup.movementSimulation?.livePositions, [
    {
      role: "host",
      latitude: 19.2,
      longitude: 72.9,
      recordedOffsetMinutes: 30,
    },
    {
      role: "operator",
      latitude: 19.1,
      longitude: 72.8,
      recordedOffsetMinutes: 29,
    },
  ]);
  assert.equal(
    setup.movementSimulation?.lateArrivalGuidance,
    "Join at the next published stop: Water regroup."
  );
});

test("private basics cannot supply an invented rehearsal venue", () => {
  assert.throws(() => rehearsalSetupFromEvent({
    name: "Monsoon Miles",
    organizerId: "organizer-1",
    publicationState: "private",
    setupRevision: 1,
    startTime: admin.firestore.Timestamp.fromMillis(
      Date.parse("2026-08-25T10:00:00.000Z")
    ),
  } as EventDocument), /valid schedule and format/);
});

test("rehearsal accepts a named venue without booking coordinates", () => {
  const startTime = admin.firestore.Timestamp.fromMillis(1_000_000);
  const event = {
    organizerId: "organizer-1",
    startTime,
    endTime: admin.firestore.Timestamp.fromMillis(1_000_000 + 3_600_000),
    meetingLocation: {name: "Courtyard"},
    eventFormat: {
      version: 1,
      activityKind: "pubQuiz",
      interactionModel: "teamRotations",
    },
  } as EventDocument;
  assert.equal(rehearsalSetupFromEvent(event).locationName, "Courtyard");
  assert.throws(() => rehearsalSetupFromEvent({
    ...event,
    meetingLocation: undefined,
  }), /valid schedule and venue/);
});

test(
  "anonymous rehearsal guest receives only frozen synthetic movement",
  () => {
    const movementSimulation = {
      itinerary: [{
        id: "water",
        kind: "stop" as const,
        offsetMinutes: 45,
        title: "Water regroup",
      }],
      routePlan: {
        version: 2 as const,
        movementMode: "run" as const,
        routeShape: "loop" as const,
        groupStrategy: "together" as const,
        stopCadence: "hostedStops" as const,
        stopKinds: ["water" as const],
        roleKinds: ["routeLead" as const],
        path: [
          {latitude: 19.1, longitude: 72.8},
          {latitude: 19.2, longitude: 72.9},
          {latitude: 19.3, longitude: 73},
        ],
      },
      livePositions: [{
        role: "host" as const,
        latitude: 19.2,
        longitude: 72.9,
        recordedOffsetMinutes: 30,
      }],
      lateArrivalGuidance: "Join at the next published stop: Water regroup.",
    };
    const projection = rehearsalGuestProjection({
      setup: {
        title: "Monsoon Miles",
        locationName: "Promenade gate",
        attendeePrompt: "Say hello",
        moduleIds: ["arrival"],
        durationMinutes: 120,
        movementSimulation,
      },
      status: "running",
      activeStepIndex: 1,
      virtualNow: admin.firestore.Timestamp.fromMillis(60 * 60000),
      virtualStartedAt: admin.firestore.Timestamp.fromMillis(0),
      setupRevision: 0,
      runtimeRevision: 2,
      faultId: "none",
    } as unknown as EventRehearsalDocument, {
      sessionId: "session-1",
      actorId: "actor-1",
      displayName: "Rhea",
      status: "late",
      connectionState: "disconnected",
      guestMoment: "checkIn",
      optedOut: false,
      helpRequested: false,
      promptCompleted: false,
    } as unknown as EventRehearsalActorDocument, "slot-token");

    assert.deepEqual(projection.session.movementSimulation?.livePositions, [{
      role: "host",
      latitude: 19.2,
      longitude: 72.9,
      recordedOffsetMinutes: 60,
    }]);
    assert.deepEqual(
      projection.session.movementSimulation?.itinerary,
      movementSimulation.itinerary
    );
    assert.equal("organizerId" in projection.session, false);
    assert.equal("operatorUid" in projection.session, false);
    assert.equal(projection.actor.status, "late");
    assert.equal(projection.actor.connectionState, "disconnected");
  }
);
