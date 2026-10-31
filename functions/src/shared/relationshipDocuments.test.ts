import assert from "node:assert/strict";
import {test} from "node:test";
import * as admin from "firebase-admin";
import {eventParticipationPatch, type EventParticipationStatus} from
  "./relationshipDocuments";
import {validateEventParticipationDocument} from
  "./generated/validators/eventParticipationDocument";

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
  assert.equal(validateEventParticipationDocument(document), true,
    JSON.stringify(validateEventParticipationDocument.errors));
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
        genderAtSignup: "woman", cohortAtSignup: "cohort_test",
        paymentId: "pay_test",
      }));
      for (const nextStatus of statuses) {
        const document = applyPatch(previous, eventParticipationPatch({
          ...identity, exists: true, status: nextStatus,
        }), nextTime);
        assertValid(document);
        assert.equal(document.genderAtSignup, "woman");
        assert.equal(document.paymentId, "pay_test");
        assert.equal(document.cohortAtSignup, "cohort_test");
        assert.deepEqual(document.createdAt, firstTime);
        assert.deepEqual(document.updatedAt, nextTime);
      }
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
