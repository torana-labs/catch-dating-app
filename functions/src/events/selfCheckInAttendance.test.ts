import assert from "node:assert/strict";
import test from "node:test";
import {FakeFirestore} from "../shared/testing/fakeFirestore";
import * as admin from "firebase-admin";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {selfCheckInAttendanceHandler} from "./selfCheckInAttendance";
import {eventVenueSessionRedemptionId} from "./venueSessions";

const sessionId = "session_123456789012345678901234";
const token =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const now = admin.firestore.Timestamp.fromMillis(1_000_000);

function harness() {
  const firestore = new FakeFirestore({
    "events/event-1": {
      organizerId: "organizer-1",
      status: "active",
      startTime: admin.firestore.Timestamp.fromMillis(1_300_000),
      checkedInCount: 0,
    },
    "eventParticipations/event-1_runner-1": {
      eventId: "event-1",
      organizerId: "organizer-1",
      uid: "runner-1",
      status: "signedUp",
    },
    "eventParticipations/event-1_runner-2": {
      eventId: "event-1",
      organizerId: "organizer-1",
      uid: "runner-2",
      status: "signedUp",
    },
    [`eventVenueSessions/${sessionId}`]: {
      eventId: "event-1",
      organizerId: "organizer-1",
      createdBy: "host-1",
      issuedAt: admin.firestore.Timestamp.fromMillis(900_000),
      expiresAt: admin.firestore.Timestamp.fromMillis(1_100_000),
    },
  });
  return {
    firestore,
    deps: {
      firestore: () => firestore as unknown as FirebaseFirestore.Firestore,
      now: () => now,
      checkRateLimit: async () => undefined,
      verifyToken: (params: {eventId: string}) => ({
        version: 1 as const,
        eventId: params.eventId,
        organizerId: "organizer-1",
        sessionId,
        issuedAtMillis: 900_000,
        expiresAtMillis: 1_100_000,
      }),
      recordSignalFacts: async () => undefined,
      incrementInviteLink: async () => undefined,
    },
  };
}

test("one live venue session admits different signed-up attendees",
  async () => {
    const h = harness();
    await selfCheckInAttendanceHandler(request("runner-1", {
      eventId: "event-1",
      venueSessionToken: token,
    }), h.deps);
    await selfCheckInAttendanceHandler(request("runner-2", {
      eventId: "event-1",
      venueSessionToken: token,
    }), h.deps);

    assert.equal(h.firestore.get(
      "eventParticipations/event-1_runner-1"
    )?.status, "attended");
    assert.equal(h.firestore.get(
      "eventParticipations/event-1_runner-2"
    )?.status, "attended");
    for (const uid of ["runner-1", "runner-2"]) {
      const redemptionId = eventVenueSessionRedemptionId({
        eventId: "event-1",
        sessionId,
        uid,
      });
      assert.equal(h.firestore.get(
        `eventVenueSessionRedemptions/${redemptionId}`
      )?.purpose, "attendance");
    }
  }
);

test("a location claim without a live Host token cannot write attendance",
  async () => {
    const h = harness();
    await assert.rejects(
      () => selfCheckInAttendanceHandler(request("runner-1", {
        eventId: "event-1",
        latitude: 19.076,
        longitude: 72.8777,
      }), h.deps),
      (error) => error instanceof HttpsError &&
        error.code === "invalid-argument"
    );
    assert.equal(h.firestore.get(
      "eventParticipations/event-1_runner-1"
    )?.status, "signedUp");
  });

function request(uid: string, data: Record<string, unknown>) {
  return {
    auth: {uid, token: {}} as CallableRequest["auth"],
    data,
    rawRequest: {} as CallableRequest["rawRequest"],
  } as CallableRequest<unknown>;
}
