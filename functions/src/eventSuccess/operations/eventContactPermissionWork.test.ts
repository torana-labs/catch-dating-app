import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {eventContactSourceChanges} from "./eventContactPermissionWork";
import {sourceWakeScopes} from "./sourceWorkSignals";
import type {EventContactPermission} from
  "../../shared/eventContactPermissions";

// An event document change wakes the live work an old permission write woke
// (issue #2494): one source change per changed channel grant, scoped to the
// roster row the grant covers.
const at = Timestamp.fromMillis(1_000);
const grant = (attendeeId: string, revision: number) => ({
  status: "optedIn" as const, endpointE164: "+919999999999",
  receiptId: `receipt-${revision}`, termsVersion: "v1",
  source: "participantSettings" as const, updatedAt: at, expiresAt: at,
  revision, senderId: "sender", senderIdentityHash: "a".repeat(64),
  attendeeId, attendeeGeneration: "b".repeat(64),
  recipientEndpointId: "endpoint", evidence: null});
const booking = (status: "optedIn" | "optedOut") => ({status,
  endpointE164: null, receiptId: "eapr", termsVersion: "event-approval-v1" as
    const, source: "participantSettings" as const, updatedAt: at,
  revision: 1});
const document = (grants: EventContactPermission["grants"]) => ({
  generation: 1, value: {senderKind: "event" as const, senderId: "event-1",
    organizerId: "organizer-1", grants, granted: [], updatedAt: at}});
const change = (before: EventContactPermission["grants"] | null,
  after: EventContactPermission["grants"] | null) => ({
  triggerEventId: "trigger-1", eventId: "event-1", occurredAt: 1_000,
  before: before && document(before), after: after && document(after)});

test("a changed channel grant wakes its roster row only", () => {
  const changes = eventContactSourceChanges(change(
    {"sms:eventService": grant("attendee-1", 1),
      "rcs:eventService": grant("attendee-1", 1)},
    {"sms:eventService": grant("attendee-1", 2),
      "rcs:eventService": grant("attendee-1", 1)}));
  assert.equal(changes.length, 1);
  assert.equal(changes[0].source.collection, "contactPermissions");
  assert.equal(changes[0].source.documentId, "event_event-1");
  assert.deepEqual(sourceWakeScopes(changes[0]), [{context: {mode: "live",
    eventId: "event-1", organizerId: "organizer-1"},
  attendeeId: "attendee-1"}]);
});

test("approval choices and unchanged grants wake no live work", () => {
  assert.deepEqual(eventContactSourceChanges(change(
    {"phone:bookingUpdates": booking("optedOut")},
    {"phone:bookingUpdates": booking("optedIn")})), []);
  const same = {"whatsapp:eventService": grant("attendee-1", 3)};
  assert.deepEqual(eventContactSourceChanges(change(same, same)), []);
});

test("a deleted document wakes every grant it held", () => {
  const changes = eventContactSourceChanges(change(
    {"sms:eventService": grant("attendee-1", 1),
      "whatsapp:eventService": grant("attendee-2", 1)}, null));
  assert.deepEqual(changes.map((item) =>
    sourceWakeScopes(item)[0]).map((scope) =>
    "attendeeId" in scope ? scope.attendeeId : null),
  ["attendee-1", "attendee-2"]);
});
