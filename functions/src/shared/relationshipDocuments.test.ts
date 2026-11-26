import assert from "node:assert/strict";
import {test} from "node:test";
import * as admin from "firebase-admin";
import {eventParticipationPatch, type EventParticipationStatus} from
  "./relationshipDocuments";
import {validateEventBookingDocument} from
  "./generated/validators/eventBookingDocument";

const statuses: EventParticipationStatus[] = [
  "signedUp", "waitlisted", "attended", "cancelled", "deleted",
];
const identity = {eventId: "event_test", organizerId: "club_test",
  uid: "user_test"};
const firstTime = {_seconds: 1700000000, _nanoseconds: 0};
const nextTime = {_seconds: 1700000060, _nanoseconds: 0};

// Apply Firestore's top-level merge/transform semantics before validating the
// resulting document, rather than validating an incomplete update patch.
function applyPatch(previous: Record<string, unknown>,
  patch: Record<string, unknown>, timestamp = firstTime) {
  const result = {...previous};
  for (const [field, value] of Object.entries(patch)) {
    if (value instanceof admin.firestore.FieldValue) {
      if (value.isEqual(admin.firestore.FieldValue.delete())) {
        delete result[field];
      } else {
        assert.ok(value.isEqual(admin.firestore.FieldValue.serverTimestamp()));
        result[field] = timestamp;
      }
    } else {
      result[field] = value;
    }
  }
  return result;
}

function assertValid(document: Record<string, unknown>) {
  assert.equal(validateEventBookingDocument(document), true,
    JSON.stringify(validateEventBookingDocument.errors));
}

for (const status of statuses) {
  test(`new ${status} participation satisfies the read contract`, () => {
    const document = applyPatch({}, eventParticipationPatch({
      ...identity, exists: false, status,
    }));
    assertValid(document);
    assert.equal(document.genderAtSignup, null);
    assert.equal(document.paymentId, null);
    assert.deepEqual(document.createdAt, firstTime);
  });

  test(`transitions from ${status} retain a readable booking and attribution`,
    () => {
      const previous = applyPatch({}, eventParticipationPatch({
        ...identity, exists: false, status,
        genderAtSignup: "woman", paymentId: "pay_test",
      }));
      for (const nextStatus of statuses) {
        const document = applyPatch(previous, eventParticipationPatch({
          ...identity, exists: true, status: nextStatus,
        }), nextTime);
        assertValid(document);
        assert.equal(document.genderAtSignup, "woman");
        assert.equal(document.paymentId, "pay_test");
        assert.deepEqual(document.createdAt, firstTime);
        assert.deepEqual(document.updatedAt, nextTime);
      }
    });
}

// A cohort encodes the guest's sexual orientation, and organisers read the
// booking (#2493): no write ever stores one, and every write to an existing
// booking removes a copy an older write left.
for (const status of statuses) {
  test(`a ${status} booking write never carries the guest's cohort`, () => {
    const created = eventParticipationPatch({
      ...identity, exists: false, status, genderAtSignup: "woman",
    });
    assert.equal(Object.hasOwn(created, "cohortAtSignup"), false);
    const legacy = {...applyPatch({}, created), cohortAtSignup: "queerOrOpen"};
    const document = applyPatch(legacy, eventParticipationPatch({
      ...identity, exists: true, status,
    }), nextTime);
    assertValid(document);
    assert.equal(Object.hasOwn(document, "cohortAtSignup"), false);
  });
}

test("rebooking clears stale lifecycle values without removing required fields",
  () => {
    const previous = {...identity, status: "cancelled",
      createdAt: firstTime, updatedAt: firstTime,
      signedUpAt: firstTime, waitlistedAt: firstTime, attendedAt: firstTime,
      cancelledAt: firstTime, deletedAt: firstTime,
      genderAtSignup: "man", paymentId: "pay_old"};
    const document = applyPatch(previous, eventParticipationPatch({
      ...identity, exists: true, status: "signedUp", paymentId: "pay_new",
    }), nextTime);
    assertValid(document);
    assert.deepEqual(document.signedUpAt, nextTime);
    assert.equal(document.paymentId, "pay_new");
    const cleared = ["waitlistedAt", "attendedAt", "cancelledAt", "deletedAt"];
    for (const field of cleared) {
      assert.equal(document[field], null);
    }
  });

test("attendance and cancellation preserve signup history and payment", () => {
  let document = applyPatch({}, eventParticipationPatch({
    ...identity, exists: false, status: "signedUp", paymentId: "pay_test",
  }));
  for (const status of ["attended", "cancelled"] as const) {
    document = applyPatch(document, eventParticipationPatch({
      ...identity, exists: true, status,
    }), nextTime);
    assertValid(document);
    assert.deepEqual(document.signedUpAt, firstTime);
    assert.equal(document.paymentId, "pay_test");
  }
  assert.deepEqual(document.attendedAt, nextTime);
  assert.deepEqual(document.cancelledAt, nextTime);
});
