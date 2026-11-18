import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {
  requestViewAttendedCount,
  requestViewEventChanged,
  requestViewEventsForParticipation,
  requestViewName,
  requestViewPeopleForContact,
} from "./requestViewTriggers";

const at = (millis: number) => Timestamp.fromMillis(millis);

test("only a waiting participation's shown facts trigger its event", () => {
  const waiting = {eventId: "e1", uid: "zoya", status: "waitlisted",
    waitlistedAt: at(100), createdAt: at(100), updatedAt: at(100)};
  assert.deepEqual(requestViewEventsForParticipation(undefined, waiting),
    ["e1"]);
  assert.deepEqual(requestViewEventsForParticipation(waiting,
    {...waiting, status: "signedUp"}), ["e1"]);
  assert.deepEqual(requestViewEventsForParticipation(waiting,
    {...waiting, updatedAt: at(200)}), []);
  assert.deepEqual(requestViewEventsForParticipation(
    {...waiting, status: "signedUp"}, {...waiting, status: "attended"}), []);
  assert.deepEqual(requestViewEventsForParticipation(waiting,
    {...waiting, waitlistOfferStatus: "active",
      waitlistOfferExpiresAt: at(500)}), ["e1"]);
});

test("bookings and shown event facts trigger the view, other writes do not",
  () => {
    const event = {organizerId: "org", status: "active", name: "Supper",
      startTime: at(1), endTime: at(2), capacityLimit: 10, priceInPaise: 0,
      bookedCount: 3, discoveryGeoCell: "a",
      eventPolicy: {admission: {manualApprovalRequired: false}}};
    assert.equal(requestViewEventChanged(event,
      {...event, discoveryGeoCell: "b"}), false);
    assert.equal(requestViewEventChanged(event, {...event, bookedCount: 4}),
      true);
    assert.equal(requestViewEventChanged(event,
      {...event, status: "cancelled"}), true);
    assert.equal(requestViewEventChanged(event, {...event,
      eventPolicy: {admission: {manualApprovalRequired: true}}}), true);
    assert.equal(requestViewEventChanged(event, undefined), true);
  });

test("names and attended counts compare as rows show them", () => {
  assert.equal(requestViewName({name: " Zoya "}), "Zoya");
  assert.equal(requestViewName({name: "  "}), null);
  assert.equal(requestViewAttendedCount({row: {attendedEventCount: 2}}), 2);
  assert.equal(requestViewAttendedCount(undefined), null);
});

test("linking or unlinking an account re-evaluates both people", () => {
  const linked = {organizerId: "org", linkedUid: "zoya", name: "Zoya"};
  assert.deepEqual(requestViewPeopleForContact(linked,
    {...linked, name: "Zoya M"}), []);
  assert.deepEqual(requestViewPeopleForContact(linked,
    {...linked, linkedUid: "zara"}), [{uid: "zoya", organizerId: "org"},
    {uid: "zara", organizerId: "org"}]);
  assert.deepEqual(requestViewPeopleForContact(linked, undefined),
    [{uid: "zoya", organizerId: "org"}]);
});
