import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {
  admissionVisibilityFormat,
  eventGuestDisclosure,
  organiserFieldsFor,
} from "./admissionVisibility";

const endTime = Timestamp.fromDate(new Date("2026-12-05T20:00:00.000Z"));

function eventWith(format: unknown) {
  return {organizerId: "club-1", endTime,
    eventPolicy: {admission: {format}}};
}

test("only gender-balanced formats show the organiser a guest's gender",
  () => {
    assert.deepEqual(organiserFieldsFor(eventWith("balancedSingles")),
      ["gender"]);
    assert.deepEqual(organiserFieldsFor(eventWith("fixedCohortCaps")),
      ["gender"]);
    assert.deepEqual(organiserFieldsFor(eventWith("openCapacity")), []);
    assert.deepEqual(organiserFieldsFor(eventWith("inviteOnly")), []);
  });

test("an unknown or missing format reads as open capacity", () => {
  assert.equal(admissionVisibilityFormat(eventWith("somethingNew")),
    "openCapacity");
  assert.equal(admissionVisibilityFormat({}), "openCapacity");
  assert.equal(admissionVisibilityFormat(eventWith("toString")),
    "openCapacity");
});

test("a balanced event's disclosure holds only gender and expires after " +
  "the event", () => {
  const data = eventGuestDisclosure({eventId: "event-1", uid: "runner-1",
    event: eventWith("balancedSingles"), gender: "woman"});
  assert.ok(data);
  assert.deepEqual(data.fields, {gender: "woman"});
  assert.equal(data.organizerId, "club-1");
  assert.equal(data.format, "balancedSingles");
  assert.equal(data.grantKey, null);
  assert.equal((data.expiresAt as Timestamp).toMillis(),
    endTime.toMillis() + 7 * 24 * 60 * 60 * 1000);
  assert.equal("cohortAtSignup" in data, false);
});

test("no disclosure without a field the format allows", () => {
  assert.equal(eventGuestDisclosure({eventId: "event-1", uid: "runner-1",
    event: eventWith("openCapacity"), gender: "woman"}), null);
  assert.equal(eventGuestDisclosure({eventId: "event-1", uid: "runner-1",
    event: eventWith("balancedSingles"), gender: null}), null);
  assert.equal(eventGuestDisclosure({eventId: "event-1", uid: "runner-1",
    event: {eventPolicy: {admission: {format: "balancedSingles"}}},
    gender: "woman"}), null);
});
