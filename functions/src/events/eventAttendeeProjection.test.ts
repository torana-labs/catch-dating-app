import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {
  catchBookingAttendeeDocument,
  participationStatus,
  projectedParticipationStatus,
} from "./eventAttendeeProjection";
import type {
  EventAttendeeDocument,
  EventBookingDocument,
} from "../shared/generated/firestoreAdminTypes";

const now = admin.firestore.Timestamp.fromMillis(5_000);
const earlier = admin.firestore.Timestamp.fromMillis(1_000);

function participation(
  overrides: Partial<EventBookingDocument> = {}
): EventBookingDocument {
  return {
    eventId: "event-1",
    organizerId: "organizer-1",
    uid: "user-1",
    status: "signedUp",
    createdAt: earlier,
    updatedAt: earlier,
    signedUpAt: earlier,
    waitlistedAt: null,
    attendedAt: null,
    cancelledAt: null,
    deletedAt: null,
    genderAtSignup: null,
    paymentId: null,
    inviteLinkId: null,
    inviteCapturedAt: null,
    ...overrides,
  } as EventBookingDocument;
}

test("participationStatus preserves the operational roster lifecycle", () => {
  assert.equal(participationStatus("signedUp"), "registered");
  assert.equal(participationStatus("waitlisted"), "waitlisted");
  assert.equal(participationStatus("attended"), "checkedIn");
  assert.equal(participationStatus("cancelled"), "cancelled");
  assert.equal(participationStatus("deleted"), "cancelled");
  assert.equal(participationStatus(undefined), "cancelled");
});

test("a Catch booking does not undo a Host check-in", () => {
  assert.equal(
    projectedParticipationStatus("registered", "checkedIn"),
    "checkedIn"
  );
  assert.equal(
    projectedParticipationStatus("cancelled", "checkedIn"),
    "cancelled"
  );
});

test("a Catch booking never adds private contact data to a Host row", () => {
  const existing = {eventId: "event-1", organizerId: "organizer-1",
    source: "hostImport", status: "registered", phoneE164: "+919000000001",
    email: "guest@example.test", externalReference: "ticket-1",
    displayName: "Imported"} as unknown as EventAttendeeDocument;
  const row = catchBookingAttendeeDocument({source: participation(),
    sourceExists: true, existing, organizerId: "organizer-1",
    displayName: "Asha", now});
  assert.equal(row.source, "hostImport");
  assert.equal(row.phoneE164, "+919000000001");
  assert.equal(row.email, "guest@example.test");
  assert.equal(row.linkedUid, "user-1");
  const fresh = catchBookingAttendeeDocument({source: participation(),
    sourceExists: true, existing: undefined, organizerId: "organizer-1",
    displayName: "Asha", now});
  assert.equal(fresh.source, "catchBooking");
  assert.equal(fresh.phoneE164, null);
  assert.equal(fresh.email, null);
  assert.equal(fresh.status, "registered");
});

test("the roster row carries no copy of the booking", () => {
  const row = catchBookingAttendeeDocument({source: participation({
    paymentId: "pay_1", hostApprovalStatus: "approved"}),
  sourceExists: true, existing: undefined, organizerId: "organizer-1",
  displayName: "Asha", now});
  assert.equal("booking" in row, false);
  assert.equal("paymentId" in row, false);
});
