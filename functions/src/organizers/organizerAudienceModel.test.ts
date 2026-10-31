import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import type {
  EventAttendeeDocument,
  OrganizerContactDocument,
  OrganizerContactEventEdgeDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  attendeeIdentityEvidence,
  organizerAudienceContribution,
  organizerContactEventEdge,
  organizerContactId,
  organizerContactTraitMatchesSegment,
  organizerContactTraits,
} from "./organizerAudienceModel";
import {audienceSummaryAfterDelta} from "./organizerAudienceProjection";

const day = 24 * 60 * 60 * 1000;
const now = admin.firestore.Timestamp.fromMillis(200 * day);
const identitySecret = "a".repeat(32);

test("imported endpoints stay proposed while OTP evidence is verified", () => {
  const imported = attendeeIdentityEvidence({
    attendee: attendee({source: "hostImport", linkedUid: null}),
    secret: identitySecret,
  });
  assert.deepEqual(imported.map((item) => [item.kind, item.confidence]), [
    ["phone", "proposed"],
    ["email", "proposed"],
  ]);

  const verified = attendeeIdentityEvidence({
    attendee: attendee({source: "webOtp", linkedUid: "user-1"}),
    secret: identitySecret,
  });
  assert.deepEqual(verified.map((item) => [item.kind, item.confidence]), [
    ["uid", "verified"],
    ["phone", "verified"],
    ["email", "proposed"],
  ]);
  assert.notEqual(verified[0].identityHash, verified[1].identityHash);
});

test("zero-event traits retain standalone contacts without attendance", () => {
  const contact = organizerContact({primarySource: "hostForm"});
  const traits = organizerContactTraits({
    contactId: "contact-1", contact, edges: [], now,
  });
  assert.ok(traits);
  assert.equal(traits.expectedEventCount, 0);
  assert.equal(traits.attendedEventCount, 0);
  assert.equal(traits.noShowCount, 0);
  assert.equal(traits.attendanceRate, null);
  assert.deepEqual(traits.segmentIds, ["new_to_organizer"]);
  assert.equal(traits.firstSeenAt, contact.firstSeenAt);
  assert.equal(traits.lastSeenAt, contact.lastSeenAt);
  assert.equal(traits.sourceCoverage, "exact");
  assert.equal(organizerContactTraits({contactId: "contact-1",
    contact: organizerContact({identityState: "merged"}),
    edges: [], now}), null);
});

test("contact ids are opaque, deterministic, and organizer scoped", () => {
  const first = organizerContactId("organizer-1", "attendee-1");
  assert.equal(first, organizerContactId("organizer-1", "attendee-1"));
  assert.notEqual(first, organizerContactId("organizer-2", "attendee-1"));
  assert.match(first, /^oc_[a-f0-9]{48}$/);
});

test("traits expose independent attendance and reachability segments", () => {
  const contact = organizerContact({
    linkedUid: "user-1",
    whatsappStatus: "optedIn",
  });
  const edges = [
    edge({
      eventId: "event-1",
      checkedIn: true,
      checkedInAt: admin.firestore.Timestamp.fromMillis(10 * day),
      source: "hostImport",
    }),
    edge({
      eventId: "event-2",
      checkedIn: true,
      checkedInAt: admin.firestore.Timestamp.fromMillis(20 * day),
      source: "webOtp",
    }),
    edge({
      eventId: "event-3",
      checkedIn: false,
      eventEndAt: admin.firestore.Timestamp.fromMillis(30 * day),
      source: "webOtp",
    }),
  ];
  const traits = organizerContactTraits({
    contactId: "contact-1",
    contact,
    edges,
    now,
  });
  assert.ok(traits);
  assert.equal(traits.attendedEventCount, 2);
  assert.equal(traits.noShowCount, 1);
  assert.equal(traits.importedEventCount, 1);
  assert.equal(traits.attendanceRate, 2 / 3);
  assert.ok(traits.segmentIds.includes("past_attendee"));
  assert.ok(traits.segmentIds.includes("repeat_attendee"));
  assert.ok(traits.segmentIds.includes("lapsed_regular"));
  assert.ok(traits.segmentIds.includes("whatsapp_reachable"));
  assert.ok(!traits.segmentIds.includes("sms_reachable"));

  const legacyTraits = {
    ...traits,
    segmentIds: traits.segmentIds.filter((id) => id !== "past_attendee"),
  };
  assert.equal(
    organizerContactTraitMatchesSegment(legacyTraits, "past_attendee"),
    true,
  );
});

test("summary deltas add, update, and remove without negatives", () => {
  const before = organizerAudienceContribution(undefined);
  const firstTime = organizerAudienceContribution({
    ...trait(),
    attendedEventCount: 1,
  });
  const created = audienceSummaryAfterDelta({
    organizerId: "organizer-1",
    before,
    after: firstTime,
    now,
  });
  assert.equal(created.contactCount, 1);
  assert.equal(created.pastAttendeeCount, 1);
  assert.equal(created.repeatAttendeeCount, 0);

  const repeat = organizerAudienceContribution({
    ...trait(),
    attendedEventCount: 2,
  });
  const updated = audienceSummaryAfterDelta({
    organizerId: "organizer-1",
    existing: created,
    before: firstTime,
    after: repeat,
    now,
  });
  assert.equal(updated.contactCount, 1);
  assert.equal(updated.repeatAttendeeCount, 1);

  const removed = audienceSummaryAfterDelta({
    organizerId: "organizer-1",
    existing: updated,
    before: repeat,
    after: organizerAudienceContribution(undefined),
    now,
  });
  assert.equal(removed.contactCount, 0);
  assert.equal(removed.pastAttendeeCount, 0);
  assert.equal(removed.repeatAttendeeCount, 0);
});

test("qualified referrals create explainable advocate segments", () => {
  const traits = organizerContactTraits({
    contactId: "contact-1",
    contact: organizerContact(),
    edges: [edge({eventId: "event-1", checkedIn: true})],
    now,
    referredRegistrationCount: 4,
    referredCheckedInCount: 3,
    referredCheckedIn365DayCount: 3,
  });
  assert.ok(traits);
  assert.equal(traits.referredRegistrationCount, 4);
  assert.equal(traits.referredCheckedInCount, 3);
  assert.equal(traits.referredCheckedIn365DayCount, 3);
  assert.ok(traits.segmentIds.includes("advocate"));
  assert.ok(traits.segmentIds.includes("high_impact_advocate"));
});

function attendee(
  overrides: Partial<EventAttendeeDocument> = {}
): EventAttendeeDocument {
  const timestamp = admin.firestore.Timestamp.fromMillis(day);
  return {
    eventId: "event-1",
    organizerId: "organizer-1",
    displayName: "Asha",
    searchName: "asha",
    source: "hostImport",
    status: "registered",
    linkedUid: null,
    phoneE164: "+919876543210",
    email: "ASHA@example.com",
    externalReference: null,
    arrivalGroup: null,
    ticketType: null,
    importId: "import-1",
    sourceRowId: "row-1",
    createdAt: timestamp,
    updatedAt: timestamp,
    registeredAt: timestamp,
    waitlistedAt: null,
    checkedInAt: null,
    cancelledAt: null,
    checkedInBy: null,
    linkedAt: null,
    ...overrides,
  };
}

function organizerContact(
  overrides: Partial<OrganizerContactDocument> = {}
): OrganizerContactDocument {
  const timestamp = admin.firestore.Timestamp.fromMillis(day);
  return {
    organizerId: "organizer-1",
    displayName: "Asha",
    searchName: "asha",
    linkedUid: null,
    phoneE164: "+919876543210",
    email: "asha@example.com",
    identityState: "unlinked",
    identityConfidence: "proposed",
    primarySource: "hostImport",
    ambiguousCandidateContactIds: [],
    firstSeenAt: timestamp,
    lastSeenAt: timestamp,
    sourceCount: 1,
    whatsappStatus: "unknown",
    smsStatus: "unknown",
    revision: 1,
    mergedIntoContactId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    ...overrides,
  };
}

function edge(
  overrides: Partial<OrganizerContactEventEdgeDocument> & {eventId: string}
): OrganizerContactEventEdgeDocument {
  const source = attendee({eventId: overrides.eventId});
  const document = organizerContactEventEdge({
    attendeeId: `attendee-${overrides.eventId}`,
    attendee: source,
    contactId: "contact-1",
    eventStartAt: admin.firestore.Timestamp.fromMillis(29 * day),
    eventEndAt: admin.firestore.Timestamp.fromMillis(30 * day),
    eventDisplayName: "Social run",
    eventOriginMode: "externalCompanion",
    eventProvider: "eventbrite",
    now,
  });
  return {
    ...document,
    status: overrides.checkedIn ? "checkedIn" : "registered",
    expected: true,
    registered: true,
    ...overrides,
  };
}

function trait() {
  const contact = organizerContactTraits({
    contactId: "contact-1",
    contact: organizerContact(),
    edges: [edge({eventId: "event-1", checkedIn: false})],
    now,
  });
  assert.ok(contact);
  return contact;
}

test("membership segments follow entitlement and 30/60-day attendance", () => {
  const checkIn = (eventId: string, daysAgo: number) => edge({eventId,
    checkedIn: true,
    checkedInAt: admin.firestore.Timestamp.fromMillis(200 * day -
      daysAgo * day)});
  const membership: NonNullable<Parameters<
    typeof organizerContactTraits>[0]["membership"]> = {
      planId: "hmp_AbCdEfGhIjKlMnOpQrSt", planName: "Sunday Runners",
      status: "active", memberSinceMillis: day, entitled: true};
  const segments = (edges: OrganizerContactEventEdgeDocument[],
    member: typeof membership | null) => organizerContactTraits({
      contactId: "contact-1", contact: organizerContact({linkedUid: "user-1"}),
      edges, now, membership: member})!;

  const quietMember = segments([checkIn("event-1", 45)], membership);
  assert.ok(quietMember.segmentIds.includes("active_member"));
  assert.ok(quietMember.segmentIds.includes("member_no_recent_attendance"));
  assert.equal(quietMember.attended30DayCount, 0);
  assert.deepEqual(quietMember.membership, membership);

  const busyMember = segments([checkIn("event-1", 5)], membership);
  assert.ok(!busyMember.segmentIds.includes("member_no_recent_attendance"));

  const lapsed = segments([], {...membership, status: "expired",
    entitled: false});
  assert.ok(lapsed.segmentIds.includes("lapsed_member"));
  assert.ok(!lapsed.segmentIds.includes("active_member"));

  const regulars = ["a", "b", "c", "d"].map((id, index) =>
    checkIn(`event-${id}`, 10 + index * 10));
  const frequent = segments(regulars, null);
  assert.equal(frequent.attended60DayCount, 4);
  assert.ok(frequent.segmentIds.includes("frequent_non_member"));
  assert.ok(!segments(regulars, membership).segmentIds
    .includes("frequent_non_member"));
  const older = segments([...regulars.slice(0, 3), checkIn("event-e", 61)],
    null);
  assert.ok(!older.segmentIds.includes("frequent_non_member"));
  assert.equal(segments([], null).membership, null);
});
