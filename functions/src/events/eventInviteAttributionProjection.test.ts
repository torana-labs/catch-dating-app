import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import type {OrganizerContactEventEdgeDocument} from
  "../shared/generated/firestoreAdminTypes";
import {FakeFirestore} from "../shared/testing/fakeFirestore";
import {
  attributionTransitions,
  isReferralCredit,
  projectEventInviteAttributionEvent,
} from "./eventInviteAttributionProjection";

test("registration and check-in transitions credit and reverse once", () => {
  assert.deepEqual(attributionTransitions(undefined, edge({
    registered: true,
    checkedIn: false,
  })), [{factKind: "registration", operation: "credit"}]);
  assert.deepEqual(attributionTransitions(edge({
    registered: true,
    checkedIn: false,
  }), edge({registered: true, checkedIn: true})), [
    {factKind: "checkIn", operation: "credit"},
  ]);
  assert.deepEqual(attributionTransitions(edge({
    registered: true,
    checkedIn: true,
  }), edge({registered: false, cancelled: true, checkedIn: false})), [
    {factKind: "registration", operation: "reversal"},
    {factKind: "checkIn", operation: "reversal"},
  ]);
});

test("registration events in any order end at the edge's latest state " +
  "(#2472)", async () => {
  const project = async (order: "inOrder" | "reversed") => {
    const fake = new FakeFirestore({
      "eventInviteLinks/link-1": {eventId: "event-1",
        organizerId: "organizer-1", linkKind: "hostChannel",
        verifiedRegistrationCount: 0},
    });
    const deps = {firestore: () =>
      fake as unknown as FirebaseFirestore.Firestore,
    timestamp: () => admin.firestore.Timestamp.fromMillis(5_000)};
    const registeredEdge = edge({registered: true});
    const cancelledEdge = edge({registered: false, cancelled: true,
      status: "cancelled"});
    const stored = (value: OrganizerContactEventEdgeDocument) =>
      value as unknown as Record<string, unknown>;
    // The edge is registered, then cancelled; both writes have landed.
    fake.put("organizerContactEventEdges/edge-1", stored(cancelledEdge));
    const created = () => projectEventInviteAttributionEvent("edge-1",
      undefined, undefined, deps);
    const cancelled = () => projectEventInviteAttributionEvent("edge-1",
      registeredEdge, undefined, deps);
    if (order === "inOrder") {
      // The creation's event ran while the edge was still registered.
      fake.put("organizerContactEventEdges/edge-1", stored(registeredEdge));
      await created();
      fake.put("organizerContactEventEdges/edge-1", stored(cancelledEdge));
      await cancelled();
    } else {
      await cancelled();
      await created();
    }
    return {
      attributions: fake.paths("eventInviteAttributions/")
        .map((path) => fake.get(path)?.operation).sort(),
      count: fake.get("eventInviteLinks/link-1")?.verifiedRegistrationCount,
    };
  };
  // In order: credited, then reversed. Out of order: never credited.
  assert.deepEqual(await project("inOrder"),
    {attributions: ["credit", "reversal"], count: 0});
  assert.deepEqual(await project("reversed"), {attributions: [], count: 0});
});

test("a direct recipient is not credited for their own registration", () => {
  assert.equal(isReferralCredit({
    linkKind: "directRecipient",
    ownerContactId: null,
    intendedRecipientContactId: "contact-1",
    subjectContactId: "contact-1",
  }), false);
  assert.equal(isReferralCredit({
    linkKind: "directRecipient",
    ownerContactId: null,
    intendedRecipientContactId: "contact-1",
    subjectContactId: "contact-2",
  }), true);
});

test("attendee referral credit requires a different verified contact", () => {
  assert.equal(isReferralCredit({
    linkKind: "attendeeReferrer",
    ownerContactId: "contact-1",
    intendedRecipientContactId: null,
    subjectContactId: "contact-2",
  }), true);
  assert.equal(isReferralCredit({
    linkKind: "hostChannel",
    ownerContactId: null,
    intendedRecipientContactId: null,
    subjectContactId: "contact-2",
  }), false);
});

function edge(
  overrides: Partial<OrganizerContactEventEdgeDocument>
): OrganizerContactEventEdgeDocument {
  const time = admin.firestore.Timestamp.fromMillis(1_000);
  return {
    organizerId: "organizer-1",
    contactId: "contact-1",
    originContactId: "contact-1",
    eventId: "event-1",
    attendeeId: "attendee-1",
    displayName: "Asha",
    linkedUid: "user-1",
    phoneE164: "+919876543210",
    email: null,
    source: "webOtp",
    status: "registered",
    expected: true,
    registered: true,
    cancelled: false,
    checkedIn: false,
    eventStartAt: time,
    eventEndAt: time,
    registeredAt: time,
    cancelledAt: null,
    checkedInAt: null,
    inviteLinkId: "link-1",
    inviteCapturedAt: time,
    sourceCreatedAt: time,
    sourceUpdatedAt: time,
    revision: 1,
    createdAt: time,
    updatedAt: time,
    ...overrides,
  };
}
