import assert from "node:assert/strict";
import test from "node:test";
import type {Firestore} from "firebase-admin/firestore";
import {ProgressFirestore} from "./groupProgressTestFixtures";
import {CATCH_EVENT_SMS_SENDER_ID, SMS_CONSENT_VERSION} from "./smsConsent";
import {smsCollections, smsPermissionId} from "./smsPermissionRecords";
import {SmsPreferenceStore} from "./smsPreferenceStore";
import {readSmsMessagePermission} from "./messagePermissionReader";
import {permissionFromEventGrant} from "./eventContactGrants";
import {readEventContactPermission} from
  "../../shared/eventContactPermissions";

// Event-day consent lives in users/{uid}/contactPermissions/event_{eventId}
// and the send gate reads only that (issue #2494).
const start = Date.parse("2026-09-07T12:00:00Z");
const context = {mode: "live" as const, organizerId: "organizer-one",
  eventId: "event-one"};
const actor = {uid: "guest-one", phone: "+919999999999"};
const eventPath = "users/guest-one/contactPermissions/event_event-one";

async function harness() {
  const fake = new ProgressFirestore();
  const db = fake as unknown as Firestore;
  const clock = {now: start};
  fake.write("events/event-one", {organizerId: context.organizerId,
    status: "active", name: "Test event",
    endTime: {seconds: (start + 3_600_000) / 1000, nanoseconds: 0}});
  const row = (id: string) => fake.write(`eventAttendees/${id}`, {
    organizerId: context.organizerId, eventId: context.eventId,
    linkedUid: actor.uid, phoneE164: actor.phone, status: "registered",
    createdAt: {seconds: start / 1000, nanoseconds: 5}});
  row("attendee-one");
  fake.write(`${smsCollections.senders}/${CATCH_EVENT_SMS_SENDER_ID}`, {
    schemaVersion: 1, senderId: CATCH_EVENT_SMS_SENDER_ID, revision: 1,
    provider: "gupshup", senderIdentity: "catchPlatform", country: "IN",
    status: "ready", mask: "CATCHS", principalEntityId: "12345",
    credentialVersion: "projects/catchdates-dev/secrets/EVENT_SMS/versions/1",
    activation: {useCaseApprovalId: "fixture-approval",
      senderApprovalId: "fixture-header", approvedAt: start - 1000,
      validUntil: start + 86_400_000},
    maxSegments: 3, quote: {revision: 1, currency: "INR",
      maxMicrosPerSegment: 500_000, validUntil: start + 86_400_000},
    templates: [{templateId: "fixture", revision: 1,
      purpose: "joiningUpdate", dltTemplateId: "123456", status: "approved",
      parts: [{kind: "variable", name: "instruction", maxCharacters: 150},
        {kind: "literal", text: " Reply: "},
        {kind: "variable", name: "responseUrl", maxCharacters: 160}]}]});
  const store = new SmsPreferenceStore(db, () => clock.now);
  const scope = {eventId: context.eventId, attendeeId: "attendee-one"};
  const decide = async (kind: "grant" | "revoke", requestId: string) => {
    const view = (await store.get(actor, scope)).view;
    return store.set(actor, {...scope, requestId,
      expectedRevision: view.revision, expectedReviewHash: view.reviewHash,
      decision: kind === "grant" ?
        {kind, copyVersion: SMS_CONSENT_VERSION} : {kind}});
  };
  const gate = (attendeeId = "attendee-one",
    senderId = CATCH_EVENT_SMS_SENDER_ID, now = clock.now + 1) =>
    db.runTransaction((tx) => readSmsMessagePermission(db, tx,
      {context, attendeeId, senderId}, now));
  return {fake, db, clock, row, decide, gate};
}

test("a grant writes the event document the gate rebuilds exactly",
  async () => {
    const h = await harness();
    assert.equal((await h.decide("grant", "grant-1")).outcome, "applied");
    const legacy = h.fake.read(smsCollections.permissions + "/" +
      smsPermissionId(context, "attendee-one", CATCH_EVENT_SMS_SENDER_ID));
    const document = readEventContactPermission(h.fake.read(eventPath),
      context.eventId)!;
    assert.deepEqual(document.granted, ["sms:eventService"]);
    const grant = document.grants["sms:eventService"]!;
    assert.deepEqual(permissionFromEventGrant("sms", actor.uid, document,
      grant), legacy);
    const receipt = h.fake.read(`contactPermissionReceipts/${grant.receiptId}`);
    assert.equal(receipt?.senderKind, "event");
    assert.equal(receipt?.decision, "optedIn");
    assert.equal(receipt?.supersedesReceiptId, null);
    const allowed = await h.gate();
    assert.equal(allowed.kind, "allowed");
  });

test("the gate refuses another row, another sender and an expired grant",
  async () => {
    const h = await harness();
    await h.decide("grant", "grant-1");
    // Another roster row linked to the same guest is not covered.
    h.row("attendee-two");
    assert.deepEqual(await h.gate("attendee-two"),
      {kind: "blocked", reason: "missingPermission"});
    // A grant for one sender never covers another.
    assert.deepEqual(await h.gate("attendee-one", "another-sender"),
      {kind: "blocked", reason: "missingPermission"});
    // Past expiresAt (event end plus one day).
    assert.deepEqual(await h.gate("attendee-one", CATCH_EVENT_SMS_SENDER_ID,
      start + 3_600_000 + 86_400_000),
    {kind: "blocked", reason: "missingPermission"});
  });

test("a later withdrawal wins over the earlier grant", async () => {
  const h = await harness();
  await h.decide("grant", "grant-1");
  assert.equal((await h.decide("revoke", "stop-1")).outcome, "applied");
  const document = readEventContactPermission(h.fake.read(eventPath),
    context.eventId)!;
  const grant = document.grants["sms:eventService"]!;
  assert.equal(grant.status, "optedOut");
  assert.equal(grant.revision, 2);
  assert.notEqual(grant.evidence, null, "the withdrawal keeps its evidence");
  assert.deepEqual(document.granted, []);
  assert.equal(h.fake.read(`contactPermissionReceipts/${grant.receiptId}`)
    ?.supersedesReceiptId, grant.evidence!.receiptId);
  assert.deepEqual(await h.gate(), {kind: "blocked", reason: "suppressed"});
});

test("an unlinked row reads no one's permission document", async () => {
  const h = await harness();
  await h.decide("grant", "grant-1");
  h.fake.write("eventAttendees/attendee-one", {
    ...h.fake.read("eventAttendees/attendee-one"), linkedUid: null});
  const reads: string[] = [];
  h.fake.beforeRead = (path) => reads.push(path);
  assert.deepEqual(await h.gate(),
    {kind: "blocked", reason: "missingPermission"});
  assert.equal(reads.some((path) => path.startsWith("users/")), false);
});

test("a guest linked to two rows in the event cannot grant until merged",
  async () => {
    const h = await harness();
    h.row("attendee-two");
    await assert.rejects(h.decide("grant", "grant-1"), /two places/);
    assert.equal(h.fake.read(eventPath), undefined);
    // Withdrawal stays possible.
    assert.equal((await h.decide("revoke", "stop-1")).outcome, "applied");
    assert.equal(readEventContactPermission(h.fake.read(eventPath),
      context.eventId)?.grants["sms:eventService"]?.status, "optedOut");
  });
