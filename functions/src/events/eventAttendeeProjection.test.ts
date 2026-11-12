import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {
  catchBookingAttendeeDocument,
  catchBookingFacts,
  eventAttendeeIndexDocument,
  eventAttendeeIndexId,
  participationStatus,
  projectedParticipationStatus,
} from "./eventAttendeeProjection";
import type {
  EventAttendeeDocument,
  EventParticipationDocument,
} from "../shared/generated/firestoreAdminTypes";

const now = admin.firestore.Timestamp.fromMillis(5_000);
const earlier = admin.firestore.Timestamp.fromMillis(1_000);

function participation(
  overrides: Partial<EventParticipationDocument> = {}
): EventParticipationDocument {
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
  } as EventParticipationDocument;
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

test("booking facts carry payment, cohort, approval and offer state", () => {
  assert.deepEqual(catchBookingFacts(participation({paymentId: "pay_1",
    genderAtSignup: "woman", cohortAtSignup: "womenInterestedInMen",
    hostApprovalStatus: "approved", waitlistOfferId: "offer-1",
    inviteSource: "Instagram"}), true, now), {status: "signedUp",
    createdAt: earlier, signedUpAt: earlier, waitlistedAt: null,
    attendedAt: null, cancelledAt: null, inviteLinkId: null,
    inviteCapturedAt: null, paymentId: "pay_1",
    genderAtSignup: "woman", cohortAtSignup: "womenInterestedInMen",
    hostApprovalStatus: "approved", hostApprovalDecidedAt: null,
    hostApprovalDecidedBy: null, waitlistOfferStatus: null,
    waitlistOfferedAt: null, waitlistOfferExpiresAt: null,
    waitlistOfferAcceptedAt: null, waitlistOfferId: "offer-1",
    inviteSource: "Instagram", deletedAt: null});
});

test("a deleted or missing booking records its deletion time", () => {
  assert.equal(catchBookingFacts(participation({status: "deleted",
    deletedAt: earlier}), true, now).deletedAt, earlier);
  assert.equal(catchBookingFacts(participation(), false, now).deletedAt, now);
  assert.equal(catchBookingFacts(participation(), false, now).status,
    "deleted");
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

test("the index pointer is keyed by event and account", () => {
  assert.equal(eventAttendeeIndexId("event-1", "user-1"), "event-1_user-1");
  assert.deepEqual(eventAttendeeIndexDocument({source: participation(),
    attendeeId: "att_1", organizerId: "organizer-1", now}), {
    eventId: "event-1", organizerId: "organizer-1", uid: "user-1",
    attendeeId: "att_1", createdAt: now});
});
