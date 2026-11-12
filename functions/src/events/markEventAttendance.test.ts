import assert from "node:assert/strict";
import test from "node:test";
import {FieldValue} from "firebase-admin/firestore";
import {FakeFirestore, type FakeData} from "../shared/testing/fakeFirestore";
import {guestInstallation} from "../shared/testing/pushInstallationFixture";
import {CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {markEventAttendanceHandler} from "./markEventAttendance";
import type {FcmParams} from "../shared/notifications";

test(
  "markEventAttendanceHandler sends companion-ready push after host check-in",
  async () => {
    const h = buildHarness();

    const result = await markEventAttendanceHandler(
      callableRequest({eventId: "event-1", userId: "runner-1"}),
      h.deps
    );

    assert.deepEqual(result, {userId: "runner-1", attended: true});
    assert.deepEqual(h.notifications, [{
      token: "token-1",
      title: "Your event companion is ready",
      body: "Open the live guide for your 5 km event from Bandstand.",
      type: "eventCompanionReady",
      eventId: "event-1",
      organizerId: "club-1",
    }]);
  }
);

test(
  "markEventAttendanceHandler skips companion-ready push without a saved plan",
  async () => {
    const h = buildHarness({"eventSuccessPlans/event-1": undefined});

    await markEventAttendanceHandler(
      callableRequest({eventId: "event-1", userId: "runner-1"}),
      h.deps
    );

    assert.deepEqual(h.notifications, []);
  }
);

test(
  "markEventAttendanceHandler skips companion-ready push when attendee " +
    "opted out",
  async () => {
    const h = buildHarness({
      "users/runner-1": {prefsRunStatusUpdates: false},
      ...guestInstallation("runner-1", "token-1"),
    });

    await markEventAttendanceHandler(
      callableRequest({eventId: "event-1", userId: "runner-1"}),
      h.deps
    );

    assert.deepEqual(h.notifications, []);
    // The check-in moves the guest's roster row in the same transaction.
    const pointer = h.firestore.get("eventAttendeeIndex/event-1_runner-1");
    const row = h.firestore.get(`eventAttendees/${pointer?.attendeeId}`);
    assert.equal(row?.status, "checkedIn");
    assert.equal(row?.linkedUid, "runner-1");
  }
);

function buildHarness(
  overrides: Record<string, FakeData | undefined> = {},
  now = new Date("2026-05-02T10:55:00.000Z")
) {
  const notifications: FcmParams[] = [];
  const firestore = new FakeFirestore({
    "events/event-1": eventDoc(),
    "organizers/club-1": {
      hostUserId: "host-1",
      hostUserIds: ["host-1"],
      hostProfiles: [],
    },
    "eventParticipations/event-1_runner-1": {
      eventId: "event-1",
      organizerId: "club-1",
      uid: "runner-1",
      status: "signedUp",
    },
    "eventSuccessPlans/event-1": {
      eventId: "event-1",
      organizerId: "club-1",
      selectedModuleIds: ["qr_check_in"],
      contextualOpenersEnabled: false,
    },
    "users/runner-1": {prefsRunStatusUpdates: true},
    ...guestInstallation("runner-1", "token-1"),
    ...overrides,
  });

  return {
    firestore,
    notifications,
    deps: {
      firestore: () =>
        firestore as unknown as FirebaseFirestore.Firestore,
      now: () => now,
      increment: (value: number) => FieldValue.increment(value),
      checkRateLimit: async () => undefined,
      recordSignalFacts: async () => undefined,
      sendNotification: async (notification: FcmParams) => {
        notifications.push(notification);
      },
    },
  };
}

function eventDoc(): FakeData {
  return {
    organizerId: "club-1",
    status: "active",
    startTime: timestamp("2026-05-02T11:00:00.000Z"),
    endTime: timestamp("2026-05-02T12:00:00.000Z"),
    meetingPoint: "Bandstand",
    distanceKm: 5,
  };
}

function timestamp(isoString: string): FirebaseFirestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(new Date(isoString));
}

function callableRequest(data: FakeData): CallableRequest<unknown> {
  return {
    auth: {uid: "host-1"},
    data,
  } as CallableRequest<unknown>;
}

test(
  "markEventAttendanceHandler holds the companion push for a runner " +
    "checked in mid-run",
  async () => {
    const h = buildHarness({
      "events/event-1": {
        ...eventDoc(),
        eventFormat: {
          version: 1,
          activityKind: "socialRun",
          interactionModel: "pacePods",
        },
      },
    }, new Date("2026-05-02T11:10:00.000Z"));

    await markEventAttendanceHandler(
      callableRequest({eventId: "event-1", userId: "runner-1"}),
      h.deps
    );

    assert.deepEqual(h.notifications, []);
    // Deferred to the next planned stop or the finish, not dropped.
    const held = h.firestore.get(
      "eventSuccessDeferredCues/event-1_runner-1"
    ) as FakeData | undefined;
    assert.equal(held?.kind, "companionReady");
    assert.equal(held?.uid, "runner-1");
    assert.equal(held?.organizerId, "club-1");
  }
);

test(
  "markEventAttendanceHandler still sends the companion push for a late " +
    "arrival when phones are allowed",
  async () => {
    for (const eventFormat of [
      {version: 1, activityKind: "dinner", interactionModel: "seatedTable"},
      {version: 1, activityKind: "pubQuiz", interactionModel: "teamRotations"},
      {version: 1, activityKind: "barCrawl", interactionModel: "routeStops"},
    ]) {
      const h = buildHarness({
        "events/event-1": {...eventDoc(), eventFormat},
      }, new Date("2026-05-02T11:10:00.000Z"));

      await markEventAttendanceHandler(
        callableRequest({eventId: "event-1", userId: "runner-1"}),
        h.deps
      );

      assert.equal(h.notifications.length, 1, eventFormat.activityKind);
    }
  }
);
