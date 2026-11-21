import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {getOrganizerContactDetailHandler} from
  "../organizers/organizerContacts";
import {
  reconcileHostContactDetailView,
  reconcileHostContactDetailViewsForAccount,
  reconcileHostContactDetailViewsForEvent,
} from "./contactDetailViewStore";

const at = (millis: number) => Timestamp.fromMillis(millis);
const viewPath = "hostContactDetailViews/person";

const edge = (eventId: string, millis: number, extra = {}) => ({
  organizerId: "org-1", contactId: "person", eventId,
  attendeeId: `attendee-${eventId}`, source: "catch", status: "checkedIn",
  expected: true, registered: true, cancelled: false, checkedIn: true,
  eventStartAt: at(millis), eventEndAt: at(millis + 10), registeredAt:
    at(millis - 10), cancelledAt: null, checkedInAt: at(millis), ...extra,
});

function world(docs: Record<string, Record<string, unknown>> = {}) {
  return new AudienceTestStore({
    "organizers/org-1": {ownerUserId: "host-1", hostUserIds: ["host-1"],
      hostProfiles: []},
    "organizerContacts/person": {organizerId: "org-1", contactId: "person",
      displayName: "Ananya Rao", displayNameOverride: null,
      linkedUid: "guest-1", phoneE164: null, email: null,
      identityState: "verified", identityConfidence: "verified",
      ambiguousCandidateContactIds: [], manualTagIds: [], deletedAt: null,
      hiddenAt: null, revision: 3},
    "organizerContactTraits/person": {organizerId: "org-1",
      expectedEventCount: 3, attendedEventCount: 2, cancelledEventCount: 0,
      noShowCount: 1, importedEventCount: 0, attendanceRate: 0.66,
      segmentIds: ["past_attendee", "repeat_attendee"],
      whatsappStatus: "unknown", smsStatus: "unknown",
      sourceCoverage: "exact"},
    "organizerContactEventEdges/edge-1": edge("event-1", 1_000),
    "organizerContactEventEdges/edge-2": edge("event-2", 2_000,
      {revenueAmountMinor: 80000, revenueCurrency: "INR",
        revenueSource: "hostImport"}),
    "organizerContactEventEdges/edge-3": edge("event-3", 3_000,
      {checkedIn: false, status: "noShow", eventDisplayName: "Old Supper"}),
    "events/event-1": {organizerId: "org-1", name: "Morning Run"},
    "events/event-2": {organizerId: "org-1", name: "Long Table Supper"},
    "guestPayments/payment-1": {purpose: "booking", userId: "guest-1",
      eventId: "event-1", status: "completed", amountMinor: 50000,
      currency: "INR"},
    "guestPayments/payment-other": {purpose: "booking", userId: "guest-1",
      eventId: "event-elsewhere", status: "completed", amountMinor: 99900,
      currency: "INR"},
    ...docs,
  });
}

async function callableDetail(db: AudienceTestStore) {
  return getOrganizerContactDetailHandler({auth: {uid: "host-1"},
    data: {organizerId: "org-1", contactId: "person", includeHistory: false},
  } as CallableRequest<unknown>, {firestore: () => db.asFirestore(),
    checkRateLimit: async () => undefined, identitySecret: () => "unused"});
}

test("the view holds the callable's traits, revenue and event rows",
  async () => {
    const db = world();
    await reconcileHostContactDetailView(db.asFirestore(), "person");
    const detail = await callableDetail(db);
    assert.deepEqual(db.docs[viewPath], {
      organizerId: "org-1", contactId: "person", traits: detail.traits,
      revenue: detail.revenue, events: detail.events,
      eventsTruncated: detail.eventsTruncated, activeMerges: [], version: 1,
    });
    const view = db.docs[viewPath] as {
      events: Array<{eventId: string; displayName: string}>;
      revenue: {amounts: Array<{currency: string; amountMinor: number}>};
    };
    assert.deepEqual(view.events.map((row) => row.eventId),
      ["event-3", "event-2", "event-1"]);
    assert.equal(view.events[0].displayName, "Old Supper");
    assert.deepEqual(view.revenue.amounts.map((amount) =>
      [amount.currency, amount.amountMinor]), [["INR", 130000]]);
    assert.equal(JSON.stringify(view).includes("guest-1"), false);
  });

test("hidden, merged and deleted contacts lose their view", async () => {
  for (const change of [{hiddenAt: at(5)}, {identityState: "merged"},
    {deletedAt: at(5)}]) {
    const db = world();
    await reconcileHostContactDetailView(db.asFirestore(), "person");
    assert.ok(db.docs[viewPath]);
    Object.assign(db.docs["organizerContacts/person"], change);
    await reconcileHostContactDetailView(db.asFirestore(), "person");
    assert.equal(db.docs[viewPath], undefined);
  }
  const db = world();
  delete db.docs["organizerContactTraits/person"];
  await reconcileHostContactDetailView(db.asFirestore(), "person");
  assert.equal(db.docs[viewPath], undefined);
});

test("the view lists active merges into the contact, not reversed ones",
  async () => {
    const receipt = (operation: string, millis: number,
      reversalOfReceiptId: string | null = null) => ({organizerId: "org-1",
      operation, survivorContactId: "person", sourceContactId: "old-person",
      evidence: ["sameVerifiedPhone"], conflicts: [], actorUid: "host-1",
      survivorRevision: 3, sourceRevision: 1, movedEdgeIds: ["e"],
      movedIdentityEvidenceIds: [], movedClaimIds: [], movedOriginIds: ["o"],
      movedEdgeCount: 1, movedIdentityEvidenceCount: 0, movedClaimCount: 0,
      movedOriginCount: 1, idempotencyKey: `key-${millis}`,
      reversalOfReceiptId, createdAt: at(millis)});
    const db = world({
      "organizerContacts/old-person": {organizerId: "org-1",
        contactId: "old-person", displayName: "Ananya R",
        displayNameOverride: null, identityState: "merged",
        mergedIntoContactId: "person"},
      "organizerContactMergeReceipts/merge-1": receipt("merge", 10),
    });
    await reconcileHostContactDetailView(db.asFirestore(), "person");
    const merges = (db.docs[viewPath] as {activeMerges: Array<{
      mergeReceiptId: string; sourceDisplayName: string;
      movedFactCount: number; mergedAtMillis: number}>}).activeMerges;
    assert.deepEqual(merges.map((merge) => [merge.mergeReceiptId,
      merge.sourceDisplayName, merge.movedFactCount, merge.mergedAtMillis]),
    [["merge-1", "Ananya R", 2, 10]]);
    db.docs["organizerContactMergeReceipts/unmerge-1"] =
      receipt("unmerge", 20, "merge-1");
    await reconcileHostContactDetailView(db.asFirestore(), "person");
    assert.deepEqual((db.docs[viewPath] as {activeMerges: unknown[]})
      .activeMerges, []);
  });

test("an unchanged view is not written again", async () => {
  const db = world();
  await reconcileHostContactDetailView(db.asFirestore(), "person");
  const written = db.docs[viewPath];
  await reconcileHostContactDetailView(db.asFirestore(), "person");
  assert.equal(db.docs[viewPath], written);
});

test("a payer's contacts and an event's contacts are re-evaluated",
  async () => {
    const db = world();
    await reconcileHostContactDetailView(db.asFirestore(), "person");
    db.docs["guestPayments/payment-2"] = {purpose: "booking",
      userId: "guest-1", eventId: "event-3", status: "completed",
      amountMinor: 1000, currency: "INR"};
    await reconcileHostContactDetailViewsForAccount(db.asFirestore(),
      "guest-1");
    const amounts = (db.docs[viewPath] as {revenue: {amounts:
      Array<{amountMinor: number}>}}).revenue.amounts;
    assert.equal(amounts[0].amountMinor, 131000);
    db.docs["events/event-3"] = {organizerId: "org-1", name: "New Supper"};
    await reconcileHostContactDetailViewsForEvent(db.asFirestore(),
      "event-3");
    const events = (db.docs[viewPath] as {events:
      Array<{displayName: string}>}).events;
    assert.equal(events[0].displayName, "New Supper");
  });
