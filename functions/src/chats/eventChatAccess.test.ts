import assert from "node:assert/strict";
import test from "node:test";
import {hasEventChatAdmission, eventChatMembershipId} from "./eventChatAccess";
import type {EventParticipationDocument as Participation,
  EventAttendeeDocument as Attendee} from
  "../shared/generated/firestoreAdminTypes";

const participation = (status: Participation["status"]) =>
  ({eventId: "event", organizerId: "org", uid: "person",
    status}) as Participation;
const attendee = (status: Attendee["status"]) =>
  ({eventId: "event", organizerId: "org", linkedUid: "person",
    status}) as Attendee;

test("event chat admits only current booking or operational admission", () => {
  for (const status of ["signedUp", "attended", "waitlisted", "cancelled",
    "deleted"] as const) {
    assert.equal(hasEventChatAdmission("event", "org", "person",
      participation(status), []), ["signedUp", "attended"].includes(status));
  }
  for (const status of ["registered", "checkedIn", "invited", "waitlisted",
    "cancelled"] as const) {
    assert.equal(hasEventChatAdmission("event", "org", "person", null,
      [attendee(status)]), ["registered", "checkedIn"].includes(status));
  }
  assert.equal(hasEventChatAdmission("event", "org", "person", null, []),
    false);
});

test("contradictory or ambiguous projections never broaden room access", () => {
  const booked = participation("signedUp");
  const admitted = attendee("registered");
  assert.equal(hasEventChatAdmission("event", "org", "person", booked,
    [admitted]), true);
  assert.equal(hasEventChatAdmission("event", "org", "person", booked,
    [attendee("cancelled")]), false);
  assert.equal(hasEventChatAdmission("event", "org", "person",
    participation("cancelled"), [admitted]), false);
  assert.equal(hasEventChatAdmission("event", "org", "person", null,
    [admitted, admitted]), false);
  for (const field of ["eventId", "organizerId", "uid"] as const) {
    assert.equal(hasEventChatAdmission("event", "org", "person",
      {...booked, [field]: "foreign"}, []), false);
  }
  for (const field of ["eventId", "organizerId", "linkedUid"] as const) {
    assert.equal(hasEventChatAdmission("event", "org", "person", null,
      [{...admitted, [field]: "foreign"}]), false);
  }
  assert.notEqual(eventChatMembershipId("a_b", "c"),
    eventChatMembershipId("a", "b_c"));
});
