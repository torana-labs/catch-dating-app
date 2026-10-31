import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import type {OrganizerCommunicationPreferenceDocument} from
  "../shared/generated/firestoreAdminTypes";
import {
  OrganizerCrmAttendeeRow,
  mergeOrganizerCrmSummaries,
  projectedOrganizerCrmSummary,
  summarizeOrganizerCrm,
} from "./organizerCrm";

const timestamp = admin.firestore.Timestamp.fromMillis(10);

test(
  "CRM summary deduplicates event history and gates channels by consent",
  () => {
    const attendees = [
      attendee({
        id: "attendee-import-1",
        eventId: "event-1",
        linkedUid: null,
        phoneE164: "+919876543210",
        source: "hostImport",
        status: "checkedIn",
      }),
      attendee({
        id: "attendee-linked-2",
        eventId: "event-2",
        linkedUid: "user-1",
        phoneE164: "+919876543210",
        source: "webOtp",
        status: "checkedIn",
      }),
      attendee({
        id: "attendee-waitlist",
        eventId: "event-3",
        linkedUid: "user-2",
        phoneE164: "+919999999999",
        source: "webOtp",
        status: "waitlisted",
      }),
    ];
    const preferences = [
      preference({uid: "user-1", whatsapp: true, sms: true}),
    ];

    assert.deepEqual(summarizeOrganizerCrm({
      organizerId: "organizer-1",
      attendees,
      preferences,
      truncated: false,
    }), {
      organizerId: "organizer-1",
      contactCount: 2,
      pastAttendeeCount: 1,
      repeatAttendeeCount: 1,
      advocateCount: 0,
      highImpactAdvocateCount: 0,
      linkedAccountCount: 2,
      importedContactCount: 1,
      whatsappOptInCount: 1,
      smsOptInCount: 1,
      truncated: false,
      readiness: {
        inApp: "currentEventOnly",
        whatsapp: "providerSetupRequired",
        sms: "providerAndDltSetupRequired",
      },
    });
  }
);

test("imported phone numbers are never treated as marketing permission", () => {
  const summary = summarizeOrganizerCrm({
    organizerId: "organizer-1",
    attendees: [attendee({
      id: "attendee-import",
      eventId: "event-1",
      linkedUid: null,
      phoneE164: "+919876543210",
      source: "hostImport",
      status: "checkedIn",
    })],
    preferences: [],
    truncated: false,
  });
  assert.equal(summary.pastAttendeeCount, 1);
  assert.equal(summary.whatsappOptInCount, 0);
  assert.equal(summary.smsOptInCount, 0);
});

test("projected CRM summary preserves compatibility and coverage", () => {
  const summary = projectedOrganizerCrmSummary({
    organizerId: "organizer-1",
    contactCount: 5000,
    pastAttendeeCount: 4000,
    repeatAttendeeCount: 2000,
    advocateCount: 400,
    highImpactAdvocateCount: 100,
    linkedAccountCount: 3000,
    importedContactCount: 3500,
    whatsappOptInCount: 1200,
    smsOptInCount: 800,
    sourceCoverage: "partial",
    projectionVersion: 1,
    computedAt: timestamp,
  });
  assert.equal(summary.contactCount, 5000);
  assert.equal(summary.truncated, true);
  assert.equal(summary.readiness.whatsapp, "providerSetupRequired");
});

test(
  "partial summaries retain manual contacts missing from attendee history",
  () => {
    const merged = mergeOrganizerCrmSummaries({
      organizerId: "organizer-1",
      contactCount: 1,
      pastAttendeeCount: 0,
      repeatAttendeeCount: 0,
      advocateCount: 0,
      highImpactAdvocateCount: 0,
      linkedAccountCount: 0,
      importedContactCount: 0,
      whatsappOptInCount: 0,
      smsOptInCount: 0,
      sourceCoverage: "partial",
      projectionVersion: 1,
      computedAt: timestamp,
    }, {
      organizerId: "organizer-1",
      contactCount: 0,
      pastAttendeeCount: 0,
      repeatAttendeeCount: 0,
      advocateCount: 0,
      highImpactAdvocateCount: 0,
      linkedAccountCount: 0,
      importedContactCount: 0,
      whatsappOptInCount: 0,
      smsOptInCount: 0,
      truncated: false,
      readiness: {
        inApp: "currentEventOnly",
        whatsapp: "providerSetupRequired",
        sms: "providerAndDltSetupRequired",
      },
    });

    assert.equal(merged.contactCount, 1);
    assert.equal(merged.truncated, true);
  }
);

function attendee(overrides: Partial<OrganizerCrmAttendeeRow> & {
  id: string;
  eventId: string;
}): OrganizerCrmAttendeeRow {
  const {id, eventId, ...fields} = overrides;
  return {
    organizerId: "organizer-1",
    displayName: "Asha",
    searchName: "asha",
    source: "webOtp",
    status: "registered",
    linkedUid: "user-1",
    phoneE164: "+919876543210",
    email: null,
    externalReference: null,
    arrivalGroup: null,
    ticketType: null,
    importId: null,
    sourceRowId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    registeredAt: timestamp,
    waitlistedAt: null,
    checkedInAt: null,
    cancelledAt: null,
    checkedInBy: null,
    linkedAt: timestamp,
    ...fields,
    id,
    eventId,
  };
}

function preference(params: {
  uid: string;
  whatsapp: boolean;
  sms: boolean;
}): OrganizerCommunicationPreferenceDocument {
  const channel = (optedIn: boolean) => ({
    status: optedIn ? "optedIn" as const : "unknown" as const,
    evidenceStatus: optedIn ? "complete" as const :
      "notApplicable" as const,
    currentReceiptId: optedIn ? "receipt-1" : null,
    termsVersion: optedIn ? "organizer-updates-v1" : null,
    source: optedIn ? "publicEventRegistration" as const : null,
    sourceEventId: optedIn ? "event-1" : null,
    updatedAt: optedIn ? timestamp : null,
  });
  return {
    organizerId: "organizer-1",
    uid: params.uid,
    whatsapp: channel(params.whatsapp),
    sms: channel(params.sms),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
