import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {resolveJourneyViewOrganizerIds} from "./organizerJourneyViewTriggers";

const at = (millis: number) => Timestamp.fromMillis(millis);

test("organizer writes route only when the journey or its readers change",
  () => {
    const organizer = {name: "Moonmoth", createdAt: at(1),
      ownerUserId: "owner", hostUserIds: ["owner"], followerCount: 3};
    assert.deepEqual(resolveJourneyViewOrganizerIds("organizers", "org",
      organizer, {...organizer, followerCount: 4}), []);
    for (const after of [{...organizer, name: "Moonmoth Club"},
      {...organizer, hostUserIds: ["owner", "manager"]},
      {...organizer, ownership: {claimedAt: at(2)}}, undefined]) {
      assert.deepEqual(resolveJourneyViewOrganizerIds("organizers", "org",
        organizer, after), ["org"]);
    }
    assert.deepEqual(resolveJourneyViewOrganizerIds("organizers", "org",
      undefined, organizer), ["org"]);
  });

test("event writes route only when time, title or organizer change", () => {
  const event = {organizerId: "org", name: "Run", startTime: at(5),
    bookedCount: 1};
  assert.deepEqual(resolveJourneyViewOrganizerIds("events", "e", event,
    {...event, bookedCount: 2}), []);
  assert.deepEqual(resolveJourneyViewOrganizerIds("events", "e", event,
    {...event, startTime: at(6)}), ["org"]);
  assert.deepEqual(resolveJourneyViewOrganizerIds("events", "e", event,
    {...event, organizerId: "other"}), ["org", "other"]);
  assert.deepEqual(resolveJourneyViewOrganizerIds("events", "e", undefined,
    event), ["org"]);
});

test("claims and intake route to their organizers", () => {
  assert.deepEqual(resolveJourneyViewOrganizerIds("organizerClaimRequests",
    "c", {organizerId: "org"}, {organizerId: "org", status: "approved"}),
  ["org"]);
  assert.deepEqual(resolveJourneyViewOrganizerIds("supplyIntakeRequests",
    "i", {request: {}}, {request: {}, approval: {organizerId: "org"}}),
  ["org"]);
  assert.deepEqual(resolveJourneyViewOrganizerIds("supplyIntakeRequests",
    "i", {request: {}}, {request: {}}), []);
});

test("growth facts route only for the first paid booking", () => {
  assert.deepEqual(resolveJourneyViewOrganizerIds("organizerGrowthFacts",
    "org", {channel: "a"}, {channel: "b"}), []);
  assert.deepEqual(resolveJourneyViewOrganizerIds("organizerGrowthFacts",
    "org", {channel: "a"},
    {channel: "a", milestones: {firstPaidBookingAt: at(9)}}), ["org"]);
});
