import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";
import {
  currentAccountabilityResolution,
  requireAccountabilityAcknowledgement,
  unresolvedAccountabilityCount,
} from "./accountability";
import {
  accountabilityResolutionFields,
  requireCurrentAccountabilityCheckIn,
} from "../domain/bookings/attendeeAccountability";
import {
  defaultAccountabilityFor,
  eventSuccessPrimitivesFor,
} from "../domain/formats/formatPrimitives";

const checkIn = admin.firestore.Timestamp.fromMillis(1_000);
const laterCheckIn = admin.firestore.Timestamp.fromMillis(2_000);

test("pace pods default to sweep without an activity-kind fork", () => {
  assert.equal(defaultAccountabilityFor("pacePods"), "sweep");
  assert.equal(defaultAccountabilityFor("teamRotations"), "none");
  assert.equal(defaultAccountabilityFor("openFormat"), "none");
});

test("explicit accountability overrides the format default", () => {
  assert.equal(eventSuccessPrimitivesFor({
    version: 1,
    activityKind: "running",
    interactionModel: "pacePods",
    eventSuccessPrimitives: {accountability: "rollCall"},
  }).accountability, "rollCall");
});

test("unresolved sweep completion raises a warning until acknowledged", () => {
  assert.throws(
    () => requireAccountabilityAcknowledgement({
      accountability: "sweep",
      unresolvedCount: 2,
      acknowledged: false,
    }),
    (error: unknown) => error instanceof HttpsError &&
      error.code === "failed-precondition" &&
      error.message.includes("finish anyway")
  );
  assert.doesNotThrow(() => requireAccountabilityAcknowledgement({
    accountability: "sweep",
    unresolvedCount: 2,
    acknowledged: true,
  }));
});

test("none and roll call never inherit sweep completion behavior", () => {
  for (const accountability of ["none", "rollCall"] as const) {
    assert.doesNotThrow(() => requireAccountabilityAcknowledgement({
      accountability,
      unresolvedCount: 3,
      acknowledged: false,
    }));
  }
});

test("operational guests count without a linked Catch identity", () => {
  assert.equal(unresolvedAccountabilityCount([{
    status: "checkedIn",
    checkedInAt: checkIn,
  }]), 1);
});

test("a prior visit resolution is stale after another check-in", () => {
  assert.equal(currentAccountabilityResolution({
    status: "checkedIn",
    checkedInAt: laterCheckIn,
    accountabilityResolution: "departed",
    accountabilityResolvedForCheckInAt: checkIn,
  }), null);
  assert.equal(currentAccountabilityResolution({
    status: "checkedIn",
    checkedInAt: laterCheckIn,
    accountabilityResolution: "returned",
    accountabilityResolvedForCheckInAt: laterCheckIn,
  }), "returned");
});

test("only a currently checked-in operational attendee can be resolved", () => {
  assert.throws(
    () => requireCurrentAccountabilityCheckIn({
      status: "registered",
      checkedInAt: null,
    }),
    (error: unknown) => error instanceof HttpsError &&
      error.code === "failed-precondition"
  );
  assert.doesNotThrow(() => requireCurrentAccountabilityCheckIn({
    status: "checkedIn",
    checkedInAt: checkIn,
  }));
});

test("wire timestamps retain exact check-in identity", () => {
  assert.equal(currentAccountabilityResolution({
    status: "checkedIn",
    checkedInAt: {_seconds: 1, _nanoseconds: 123},
    accountabilityResolution: "returned",
    accountabilityResolvedForCheckInAt: new admin.firestore.Timestamp(1, 124),
  }), null);
  assert.equal(currentAccountabilityResolution({
    status: "checkedIn",
    checkedInAt: {_seconds: 1, _nanoseconds: 123},
    accountabilityResolution: "returned",
    accountabilityResolvedForCheckInAt: new admin.firestore.Timestamp(1, 123),
  }), "returned");
});

test("all sweep writers advance the same revision, including clearing", () => {
  const attendee = {status: "checkedIn" as const, checkedInAt: checkIn};
  const fields = accountabilityResolutionFields(attendee, "returned", "host",
    laterCheckIn);
  assert.equal(fields.accountabilityRevision, 1);
  const cleared = accountabilityResolutionFields({...attendee,
    accountabilityRevision: fields.accountabilityRevision}, "unresolved",
  "host", laterCheckIn);
  assert.equal(cleared.accountabilityRevision, 2);
  assert.equal(cleared.accountabilityResolution, null);
  assert.equal(cleared.accountabilityResolvedForCheckInAt, null);
  assert.equal(cleared.accountabilityResolvedBy, null);
  assert.throws(() => accountabilityResolutionFields({...attendee,
    accountabilityRevision: Number.MAX_SAFE_INTEGER}, "returned", "host",
  laterCheckIn), {code: "failed-precondition"});
});
