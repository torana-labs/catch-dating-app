import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import type {EventAttendeeDocument} from
  "../shared/generated/firestoreAdminTypes";
import {LumaGuest} from "./organizerLumaProvider";
import {organizerProviderCatalog} from "./organizerProviderCatalog";
import {
  externalEventMappingId,
  lumaAttendeeDocument,
  lumaEventChoicesResponse,
  lumaOperationalStatus,
  organizerProviderConnectionId,
  providerSyncRunId,
} from "./organizerProviderSetup";

const now = admin.firestore.Timestamp.fromMillis(
  Date.parse("2026-08-12T12:00:00.000Z")
);

test("catalog exposes exact current provider availability", () => {
  assert.equal(organizerProviderCatalog.length, 9);
  const luma = organizerProviderCatalog.find((item) =>
    item.provider === "luma"
  );
  assert.equal(luma?.availability, "available");
  assert.equal(luma?.capabilities.registrationStatus, true);
  assert.equal(luma?.capabilities.refundStatus, false);
  assert.equal(luma?.capabilities.writeBookings, false);
  const eventbrite = organizerProviderCatalog.find((item) =>
    item.provider === "eventbrite"
  );
  assert.equal(eventbrite?.availability, "configurationRequired");
  const airbnb = organizerProviderCatalog.find((item) =>
    item.provider === "airbnb"
  );
  assert.equal(airbnb?.availability, "partnerAccessRequired");
});

test("provider identifiers are deterministic and independently scoped", () => {
  assert.match(
    organizerProviderConnectionId("org-1", "luma", "cal-1"),
    /^opc_[a-f0-9]{48}$/
  );
  assert.notEqual(
    organizerProviderConnectionId("org-1", "luma", "cal-1"),
    organizerProviderConnectionId("org-2", "luma", "cal-1")
  );
  assert.notEqual(externalEventMappingId("event-1"),
    externalEventMappingId("event-2"));
  assert.notEqual(
    providerSyncRunId("event-1", "host-1", "operation-123456"),
    providerSyncRunId("event-1", "host-1", "operation-654321")
  );
});

test("maps Luma registration states without inventing bookings", () => {
  assert.equal(lumaOperationalStatus("approved"), "registered");
  assert.equal(lumaOperationalStatus("session"), "registered");
  assert.equal(lumaOperationalStatus("pending_approval"), "waitlisted");
  assert.equal(lumaOperationalStatus("waitlist"), "waitlisted");
  assert.equal(lumaOperationalStatus("invited"), "invited");
  assert.equal(lumaOperationalStatus("declined"), "cancelled");
});

test("returns host-safe Luma event choices with exact timestamps", () => {
  assert.deepEqual(lumaEventChoicesResponse(
    {id: "cal-1", name: "Sunday Club"},
    {
      entries: [{
        id: "evt-1",
        name: "Sunday Social",
        startAt: "2026-08-16T12:00:00.000Z",
      }],
      hasMore: true,
      nextCursor: "next-page",
    },
  ), {
    calendarName: "Sunday Club",
    events: [{
      externalEventId: "evt-1",
      name: "Sunday Social",
      startAtMillis: Date.parse("2026-08-16T12:00:00.000Z"),
    }],
    truncated: true,
  });
});

test("provider check-in confirms attendance and increments revision", () => {
  const document = lumaAttendeeDocument({
    eventId: "event-1",
    organizerId: "org-1",
    connectionId: "connection-1",
    guest: guest({checkedInAt: "2026-08-12T10:00:00.000Z"}),
    now,
  });
  assert.equal(document.source, "providerSync");
  assert.equal(document.status, "checkedIn");
  assert.equal(document.checkedInBy, "provider:luma");
  assert.equal(document.attendanceRevision, 1);
  assert.equal(document.preCheckInStatus, "registered");
});

test("provider absence never erases a Catch manual check-in", () => {
  const checkedInAt = admin.firestore.Timestamp.fromMillis(
    Date.parse("2026-08-12T09:30:00.000Z")
  );
  const document = lumaAttendeeDocument({
    eventId: "event-1",
    organizerId: "org-1",
    connectionId: "connection-1",
    guest: guest({checkedInAt: null}),
    old: attendee({
      source: "hostImport",
      status: "checkedIn",
      checkedInAt,
      checkedInBy: "host-1",
      attendanceRevision: 4,
      preCheckInStatus: "registered",
    }),
    now,
  });
  assert.equal(document.status, "checkedIn");
  assert.equal(document.checkedInAt, checkedInAt);
  assert.equal(document.checkedInBy, "host-1");
  assert.equal(document.attendanceRevision, 4);
  assert.equal(document.source, "hostImport");
});

test("provider enriches but never relabels a Catch booking", () => {
  const document = lumaAttendeeDocument({
    eventId: "event-1",
    organizerId: "org-1",
    connectionId: "connection-1",
    guest: guest({displayName: "New name", ticketType: "VIP"}),
    old: attendee({source: "catchBooking"}),
    now,
  });
  assert.equal(document.source, "catchBooking");
  assert.equal(document.provider, "luma");
  assert.equal(document.providerGuestId, "gst-1");
  assert.equal(document.ticketType, "VIP");
});

function guest(overrides: Partial<LumaGuest> = {}): LumaGuest {
  return {
    id: "gst-1",
    displayName: "Asha Shah",
    phone: "+919876543210",
    email: "asha@example.com",
    approvalStatus: "approved",
    registeredAt: "2026-08-12T08:00:00.000Z",
    checkedInAt: null,
    ticketType: "General",
    ...overrides,
  };
}

function attendee(
  overrides: Partial<EventAttendeeDocument> = {}
): EventAttendeeDocument {
  return {
    eventId: "event-1",
    organizerId: "org-1",
    displayName: "Asha Shah",
    searchName: "asha shah",
    source: "hostImport",
    status: "registered",
    linkedUid: null,
    phoneE164: "+919876543210",
    email: "asha@example.com",
    externalReference: null,
    arrivalGroup: null,
    ticketType: null,
    importId: "import-1",
    sourceRowId: "row-1",
    createdAt: now,
    updatedAt: now,
    registeredAt: now,
    waitlistedAt: null,
    checkedInAt: null,
    cancelledAt: null,
    checkedInBy: null,
    linkedAt: null,
    attendanceRevision: 0,
    preCheckInStatus: null,
    ...overrides,
  };
}
