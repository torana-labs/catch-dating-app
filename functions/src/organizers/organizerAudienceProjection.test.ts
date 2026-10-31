import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {EventAttendeeDocument, OrganizerContactDocument,
  OrganizerContactEventEdgeDocument, OrganizerContactOriginDocument} from
  "../shared/generated/firestoreAdminTypes";
import {manualOrganizerContactOrigin} from "../shared/organizerContactOrigins";
import {organizerContactTraits, organizerContactEventEdge,
  organizerIdentityClaimId, organizerIdentityHash} from
  "./organizerAudienceModel";
import {AudienceTestStore} from "./organizerAudienceTestStore";
import {projectEventAttendeeToOrganizerAudience, rebuildOrganizerContact} from
  "./organizerAudienceProjection";

const at = Timestamp.fromMillis;
const now = at(100_000);
const secret = "x".repeat(32);
function contact(overrides: Partial<OrganizerContactDocument> = {}) {
  return {organizerId: "org-1", displayName: "Submitted name",
    searchName: "submitted name", linkedUid: null,
    phoneE164: "+919999999999", email: "submitted@example.test",
    identityState: "unlinked", identityConfidence: "proposed",
    primarySource: "hostManual", ambiguousCandidateContactIds: [],
    firstSeenAt: at(1000), lastSeenAt: at(1000), sourceCount: 1,
    whatsappStatus: "unknown", smsStatus: "unknown", revision: 1,
    mergedIntoContactId: null, createdAt: at(1000), updatedAt: at(1000),
    deletedAt: null, manualTagIds: [], ...overrides} satisfies
    OrganizerContactDocument;
}
function attendee(overrides: Partial<EventAttendeeDocument> = {}) {
  return {eventId: "event-1", organizerId: "org-1",
    displayName: "Event name", searchName: "event name", source: "catchBooking",
    status: "registered", linkedUid: "uid-1", phoneE164: null, email: null,
    externalReference: null, arrivalGroup: null, ticketType: null,
    importId: null, sourceRowId: null, createdAt: at(2000), updatedAt: at(2000),
    registeredAt: at(2000), waitlistedAt: null, checkedInAt: null,
    cancelledAt: null, checkedInBy: null, linkedAt: at(2000),
    ...overrides} satisfies EventAttendeeDocument;
}
function edge(overrides: Partial<OrganizerContactEventEdgeDocument> = {}) {
  return {...organizerContactEventEdge({attendeeId: "attendee-1",
    attendee: attendee(), contactId: "person", eventStartAt: at(10_000),
    eventEndAt: at(20_000), eventDisplayName: "Event", eventOriginMode: null,
    eventProvider: null, now}), ...overrides};
}
function harness(source: OrganizerContactOriginDocument["sourceEntityKind"] |
  null = "manualEntry") {
  const person = contact();
  const traits = organizerContactTraits({contactId: "person", contact: person,
    edges: [], now});
  const store = new AudienceTestStore({"organizerContacts/person": person,
    "organizerContactTraits/person": {...traits!},
    "organizerAudienceSummaries/org-1": {organizerId: "org-1", contactCount: 1,
      pastAttendeeCount: 0, repeatAttendeeCount: 0, linkedAccountCount: 0,
      importedContactCount: 0, advocateCount: 0, highImpactAdvocateCount: 0,
      whatsappOptInCount: 0, smsOptInCount: 0, sourceCoverage: "exact"}});
  if (source !== null) {
    store.docs["organizerContactOrigins/origin"] = {
      ...manualOrganizerContactOrigin({organizerId: "org-1",
        contactId: "person",
        actorUid: "host-1", now: at(1000)}), sourceEntityKind: source,
      sourceKind: source === "manualEntry" ? "hostManual" : "hostForm"};
  }
  return {store, deps: {firestore: () => store.asFirestore(),
    timestamp: () => now, identitySecret: () => secret}};
}

test("standalone sources survive zero-event rebuilds and retries", async () => {
  for (const kind of ["manualEntry", "hostFormResponse",
    "hostApplicationResponse"] as const) {
    const {store, deps} = harness(kind);
    const origin = {...store.docs["organizerContactOrigins/origin"]};
    await rebuildOrganizerContact("person", `rebuild-${kind}`, deps);
    const after = {...store.docs["organizerContacts/person"]};
    await rebuildOrganizerContact("person", `rebuild-${kind}`, deps);
    assert.deepEqual(store.docs["organizerContacts/person"], after);
    assert.equal(after.deletedAt, null);
    assert.equal(after.phoneE164, "+919999999999");
    assert.equal(after.email, "submitted@example.test");
    assert.equal(store.docs["organizerContactTraits/person"]
      .expectedEventCount, 0);
    assert.equal(store.docs["organizerAudienceSummaries/org-1"]
      .contactCount, 1);
    assert.deepEqual(store.docs["organizerContactOrigins/origin"], origin);
  }
});

test("linking and removing event history retains submitted fields and source",
  async () => {
    const {store, deps} = harness("hostFormResponse");
    store.docs["organizerContacts/person"].primarySource = "hostForm";
    store.docs["organizerContactEventEdges/attendee-1"] = edge({
      phoneE164: "+918888888888", email: "event@example.test"});
    await rebuildOrganizerContact("person", "linked", deps);
    const person = store.docs["organizerContacts/person"];
    assert.equal(person.linkedUid, "uid-1");
    assert.equal(person.displayName, "Submitted name");
    assert.equal(person.phoneE164, "+919999999999");
    assert.equal(person.email, "submitted@example.test");
    assert.equal(person.primarySource, "hostForm");
    assert.equal(store.docs["organizerContactTraits/person"]
      .expectedEventCount, 1);
    delete store.docs["organizerContactEventEdges/attendee-1"];
    await rebuildOrganizerContact("person", "removed", deps);
    assert.equal(store.docs["organizerContacts/person"].deletedAt,
      null);
    assert.equal(store.docs["organizerContactTraits/person"]
      .expectedEventCount, 0);
    assert.equal(store.docs["organizerAudienceSummaries/org-1"]
      .contactCount, 1);
  });

test("event fields resolve separately without giving UID endpoint precedence",
  async () => {
    const {store, deps} = harness(null);
    store.docs["organizerContacts/person"].primarySource = "hostImport";
    store.docs["organizerContactEventEdges/older"] = edge({attendeeId: "older",
      linkedUid: "uid-1", email: "older@example.test",
      sourceUpdatedAt: at(1000)});
    store.docs["organizerContactEventEdges/recent"] = edge({
      attendeeId: "recent",
      linkedUid: null, source: "hostImport", phoneE164: "+917777777777",
      sourceUpdatedAt: at(2000)});
    await rebuildOrganizerContact("person", "fields", deps);
    assert.equal(store.docs["organizerContacts/person"].linkedUid, "uid-1");
    assert.equal(store.docs["organizerContacts/person"].phoneE164,
      "+917777777777");
    assert.equal(store.docs["organizerContacts/person"].email,
      "older@example.test");
  });

test("rebuild rereads manager edits inside its write transaction", async () => {
  const {store, deps} = harness();
  const run = store.runTransaction.bind(store);
  store.runTransaction = async (body) => {
    Object.assign(store.docs["organizerContacts/person"], {
      phoneE164: "+916666666666", displayNameOverride: "Updated by host",
      manualTagIds: ["a".repeat(32)], revision: 10});
    return run(body);
  };
  await rebuildOrganizerContact("person", "edit-during-rebuild", deps);
  const person = store.docs["organizerContacts/person"];
  assert.equal(person.phoneE164, "+916666666666");
  assert.equal(person.displayNameOverride, "Updated by host");
  assert.deepEqual(person.manualTagIds, ["a".repeat(32)]);
  assert.ok(Number(person.revision) > 10);
});

test("hidden and merged contacts stay outside rebuild authority", async () => {
  for (const patch of [{hiddenAt: now}, {identityState: "merged"}]) {
    const {store, deps} = harness();
    Object.assign(store.docs["organizerContacts/person"], patch);
    const before = {...store.docs["organizerContacts/person"]};
    await rebuildOrganizerContact("person", "inactive", deps);
    assert.deepEqual(store.docs["organizerContacts/person"], before);
    assert.equal(Object.keys(store.docs).some((key) =>
      key.startsWith("organizerAudienceProjectionReceipts/")), false);
  }
});

test("full attendee projection never replays a standalone contact snapshot",
  async () => {
    const {store, deps} = harness();
    const claimId = organizerIdentityClaimId(organizerIdentityHash(secret,
      "org-1", "uid", "uid-1"));
    store.docs[`organizerContactIdentityClaims/${claimId}`] = {
      verifiedContactId: "person", originVerifiedContactId: "person",
      createdAt: at(1000), revision: 1};
    const source = attendee({phoneE164: "+918888888888",
      email: "event@example.test"});
    await projectEventAttendeeToOrganizerAudience("attendee-1", undefined,
      source, "new-event", deps);
    const person = store.docs["organizerContacts/person"];
    assert.equal(person.phoneE164, "+919999999999");
    assert.equal(person.email, "submitted@example.test");
    assert.equal(person.primarySource, "hostManual");
    assert.equal(person.linkedUid, "uid-1");
  });

test("event-only contact loses its trait when its final event disappears",
  async () => {
    const {store, deps} = harness(null);
    await rebuildOrganizerContact("person", "event-removed", deps);
    assert.equal(store.docs["organizerContacts/person"].deletedAt, now);
    assert.equal(store.docs["organizerContactTraits/person"], undefined);
    assert.equal(store.docs["organizerAudienceSummaries/org-1"]
      .contactCount, 0);
  });

test("a delayed event cannot overwrite a newer edge inside the transaction",
  async () => {
    const {store, deps} = harness();
    store.docs["organizerContactEventEdges/attendee-1"] = edge({
      linkedUid: null});
    const run = store.runTransaction.bind(store);
    store.runTransaction = async (body) => {
      store.docs["organizerContactEventEdges/attendee-1"] = edge({
        sourceUpdatedAt: at(3000), phoneE164: "+915555555555"});
      return run(body);
    };
    await projectEventAttendeeToOrganizerAudience("attendee-1", undefined,
      attendee({linkedUid: null}), "stale-event", deps);
    assert.equal(store.docs["organizerContactEventEdges/attendee-1"].phoneE164,
      "+915555555555");
    assert.equal(store.docs["organizerContacts/person"].revision, 1);
  });

test("deletion preserves a recreated attendee and removes only absent history",
  async () => {
    const {store, deps} = harness();
    const before = attendee();
    store.docs["organizerContactEventEdges/attendee-1"] = edge();
    store.docs["eventAttendees/attendee-1"] = attendee({updatedAt: at(3000)});
    await projectEventAttendeeToOrganizerAudience("attendee-1", before,
      undefined, "old-delete", deps);
    assert.ok(store.docs["organizerContactEventEdges/attendee-1"]);
    delete store.docs["eventAttendees/attendee-1"];
    await projectEventAttendeeToOrganizerAudience("attendee-1", before,
      undefined, "delete", deps);
    assert.equal(store.docs["organizerContactEventEdges/attendee-1"],
      undefined);
    assert.equal(store.docs["organizerContacts/person"].deletedAt,
      null);
    assert.equal(store.docs["organizerContactTraits/person"]
      .expectedEventCount, 0);
  });
