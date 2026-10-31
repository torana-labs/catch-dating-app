import assert from "node:assert/strict";
import test from "node:test";
import {planEventSeatMigration, SeatMigrationAttendee,
  SeatMigrationInput} from "./seatMigration";
import {seatIdentityAliasId} from "./seatIdentityAuthority";

const PHONE = "+919876543210";

function guest(overrides: Partial<SeatMigrationAttendee> = {}):
  SeatMigrationAttendee {
  return {id: "att_guest", eventId: "event1", organizerId: "org1",
    source: "hostImport", status: "registered", linkedUid: null,
    phoneE164: PHONE, externalReference: "booking-1", sourceRowId: "row1",
    ...overrides};
}

function input(overrides: Partial<SeatMigrationInput> = {}):
  SeatMigrationInput {
  return {eventId: "event1", organizerId: "org1", asOfMillis: 1000,
    migrationRevision: 1,
    event: {organizerId: "org1", status: "active",
      capacityLimit: 2, bookedCount: 0, constraints: {}},
    participations: [], attendees: [guest()], verifiedPhones: [],
    origins: [], contacts: [], formReceipts: [], ...overrides,
    sourceReadEvidence: {complete: true,
      participationRows: overrides.participations?.length ?? 0,
      attendeeRows: overrides.attendees?.length ?? 1,
      originRows: overrides.origins?.length ?? 0}};
}

test("a guest retains one seat without a Catch UID", () => {
  const result = planEventSeatMigration(input());
  assert.equal(result.state, "ready");
  if (result.state !== "ready") return;
  assert.equal(result.ledger.occupied, 1);
  assert.equal(result.reservations.length, 1);
  assert.equal(result.aliases.length, 3);
  assert.ok(result.aliases.some((row) => row.id ===
    seatIdentityAliasId("event1", "attendee", "att_guest")));
  assert.ok(result.aliases.some((row) => row.id ===
    seatIdentityAliasId("event1", "phone", PHONE)));
  assert.equal(result.verifiedPhoneProofs.length, 0);
});

test("explicit linked attendee and Auth proof converge with participation",
  () => {
    const result = planEventSeatMigration(input({
      event: {organizerId: "org1", status: "active", capacityLimit: 2,
        bookedCount: 1, constraints: {}},
      participations: [{eventId: "event1", organizerId: "org1",
        uid: "user1", status: "signedUp"}],
      attendees: [guest({linkedUid: "user1", source: "catchBooking"})],
      verifiedPhones: [{uid: "user1", phoneE164: PHONE,
        verifiedByAuth: true}],
    }));
    assert.equal(result.state, "ready");
    if (result.state !== "ready") return;
    assert.equal(result.ledger.occupied, 1);
    assert.equal(result.reservations.length, 1);
    assert.ok(result.aliases.every((row) =>
      row.value.canonicalKey === result.reservations[0].value.canonicalKey));
  });

test("matching guest phone alone cannot merge into a verified UID", () => {
  const result = planEventSeatMigration(input({
    event: {organizerId: "org1", status: "active", capacityLimit: 2,
      bookedCount: 1, constraints: {}},
    participations: [{eventId: "event1", organizerId: "org1",
      uid: "user1", status: "signedUp"}],
    verifiedPhones: [{uid: "user1", phoneE164: PHONE,
      verifiedByAuth: true}],
  }));
  assert.deepEqual(result, {state: "blocked",
    blockers: ["ambiguousSeatAlias"]});
});

test("duplicate guest aliases and stale counters block a ready ledger",
  () => {
    const duplicate = planEventSeatMigration(input({attendees: [guest(),
      guest({id: "att_other", externalReference: "booking-2"})]}));
    assert.equal(duplicate.state, "blocked");
    assert.ok(duplicate.blockers.includes("ambiguousSeatAlias"));
    const count = planEventSeatMigration(input({event: {organizerId: "org1",
      status: "active", capacityLimit: 2, bookedCount: 1}}));
    assert.deepEqual(count, {state: "blocked",
      blockers: ["catchCountMismatch"]});
  });

test("two active imported rows linked to one UID need reconciliation", () => {
  const rows = [guest({id: "att_a", linkedUid: "user1",
    phoneE164: PHONE}), guest({id: "att_b", linkedUid: "user1",
    phoneE164: PHONE, externalReference: "booking-2"})];
  const result = planEventSeatMigration(input({attendees: rows,
    verifiedPhones: [{uid: "user1", phoneE164: PHONE,
      verifiedByAuth: true}]}));
  assert.equal(result.state, "blocked");
  if (result.state !== "blocked") return;
  assert.ok(result.blockers.includes("duplicateActiveAttendee"));
});

test("missing Auth proof, foreign rows, malformed policy and capacity block",
  () => {
    const participation = {eventId: "event1", organizerId: "org1",
      uid: "user1", status: "signedUp" as const};
    const missingProof = planEventSeatMigration(input({
      event: {organizerId: "org1", status: "active", capacityLimit: 2,
        bookedCount: 1}, participations: [participation]}));
    assert.equal(missingProof.state, "blocked");
    if (missingProof.state !== "blocked") return;
    assert.ok(missingProof.blockers.includes(
      "verifiedUidEvidenceUnavailable"));
    const foreign = planEventSeatMigration(input({attendees: [guest({
      organizerId: "other"})]}));
    assert.equal(foreign.state, "blocked");
    if (foreign.state !== "blocked") return;
    assert.ok(foreign.blockers.includes("attendeeSourceConflict"));
    const policy = planEventSeatMigration(input({event: {organizerId: "other",
      capacityLimit: 2, status: "active"}}));
    assert.deepEqual(policy, {state: "blocked",
      blockers: ["eventTenantConflict"]});
    const full = planEventSeatMigration(input({event: {organizerId: "org1",
      capacityLimit: 0, bookedCount: 0, status: "active"}}));
    assert.equal(full.state, "blocked");
    if (full.state !== "blocked") return;
    assert.ok(full.blockers.includes("eventCapacityOrPolicyUnavailable"));
  });

test("CRM origin joins only through reviewed attendee provenance", () => {
  const source = input({attendees: [guest({id: "att_form", source: "hostManual",
    externalReference: "response1", sourceRowId: "response1"})],
  origins: [{id: "origin1", organizerId: "org1", eventId: null,
    sourceKind: "hostForm", sourceEntityKind: "hostFormResponse",
    sourceEntityId: "response1", responseId: "response1", formId: "form1",
    originContactId: "contact1",
    currentContactId: "contact1"}],
  contacts: [{id: "contact1", organizerId: "org1", linkedUid: null,
    identityState: "unlinked", deleted: false, hidden: false,
    mergedIntoContactId: null, ambiguousCandidateContactIds: []}]});
  const blocked = planEventSeatMigration(source);
  assert.equal(blocked.state, "blocked");
  if (blocked.state !== "blocked") return;
  assert.ok(blocked.blockers.includes("formAdmissionProvenanceUnavailable"));
  const result = planEventSeatMigration({...source,
    formReceipts: [{organizerId: "org1", eventId: "event1",
      formId: "form1", responseId: "response1", status: "completed"}]});
  assert.equal(result.state, "ready");
  if (result.state !== "ready") return;
  assert.ok(result.aliases.some((row) => row.id ===
    seatIdentityAliasId("event1", "contactOrigin", "origin1")));
  assert.ok(result.aliases.some((row) => row.id ===
    seatIdentityAliasId("event1", "contact", "contact1")));
  const mismatched = planEventSeatMigration({...source,
    origins: [{...source.origins[0], sourceEntityId: "other"}],
    formReceipts: [{organizerId: "org1", eventId: "event1",
      formId: "form1", responseId: "response1", status: "completed"}],
    sourceReadEvidence: {...source.sourceReadEvidence}});
  assert.equal(mismatched.state, "blocked");
  if (mismatched.state !== "blocked") return;
  assert.ok(mismatched.blockers.includes("formOriginConflict"));
});

test("malformed original CRM contact cannot produce a ready alias", () => {
  const origin = {id: "origin1", organizerId: "org1", eventId: "event1",
    sourceKind: "hostImport" as const,
    sourceEntityKind: "eventAttendee" as const,
    sourceEntityId: "att_guest", responseId: null, formId: null,
    originContactId: "contact1", currentContactId: "contact1"};
  const contact = {id: "contact1", organizerId: "org1", linkedUid: null,
    identityState: "unlinked" as const, deleted: false, hidden: false,
    mergedIntoContactId: null, ambiguousCandidateContactIds: []};
  const source = input({origins: [origin], contacts: [contact]});
  assert.equal(planEventSeatMigration(source).state, "ready");
  for (const malformed of [undefined, "invalid/id"]) {
    const result = planEventSeatMigration({...source,
      origins: [{...origin, originContactId: malformed as string}]});
    assert.equal(result.state, "blocked");
    if (result.state === "blocked") {
      assert.ok(result.blockers.includes("contactOriginProvenanceConflict"));
    }
  }
});

test("ready output is deterministic under source row reorder", () => {
  const a = guest({id: "att_a", phoneE164: "+919876543210",
    externalReference: "booking-a"});
  const b = guest({id: "att_b", phoneE164: "+919876543211",
    externalReference: "booking-b"});
  const first = planEventSeatMigration(input({attendees: [a, b]}));
  const second = planEventSeatMigration(input({attendees: [b, a]}));
  assert.deepEqual(first, second);
});

test("partial source-read witness cannot create ready ledger", () => {
  const result = planEventSeatMigration({...input(),
    sourceReadEvidence: {complete: true, participationRows: 0,
      attendeeRows: 0, originRows: 0}});
  assert.deepEqual(result, {state: "blocked",
    blockers: ["sourceReadIncomplete"]});
});
