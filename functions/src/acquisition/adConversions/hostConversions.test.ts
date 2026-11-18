import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {
  conversionOwner,
  hashedEmail,
  hashedPhone,
  hashedPhoneForMeta,
  hostConversionEventId,
  newHostConversions,
  sha256Hex,
} from "./hostConversions";
import {afterAttempt, hostDeliveryRecords} from "./deliveries";
import {
  classifyGoogle,
  classifyMeta,
  googleIngestBody,
  metaEvent,
} from "./platforms";

const now = Date.parse("2026-11-17T12:00:00Z");
const day = 24 * 60 * 60 * 1000;
const at = (millis: number) => Timestamp.fromMillis(millis);
const facts = (milestones: Record<string, number>) => ({
  milestones: Object.fromEntries(Object.entries(milestones)
    .map(([key, value]) => [key, at(value)])),
});

test("a new owner and a first booked event become conversions", () => {
  assert.deepEqual(newHostConversions(facts({}),
    facts({claimedAt: now - day}), now), ["organizer_signup"]);
  assert.deepEqual(newHostConversions(facts({claimedAt: now - day}),
    facts({claimedAt: now - day, firstEventAt: now + 3 * day}), now),
  ["organizer_qualified"]);
});

test("replays, old steps and unowned organizers send nothing", () => {
  // Already present before the write.
  assert.deepEqual(newHostConversions(facts({claimedAt: now - day}),
    facts({claimedAt: now - day}), now), []);
  // A replay rebuilding a claim from last month.
  assert.deepEqual(newHostConversions(undefined,
    facts({claimedAt: now - 40 * day}), now), []);
  // A first event long past, rebuilt by a replay.
  assert.deepEqual(newHostConversions(facts({claimedAt: now - 90 * day}),
    facts({claimedAt: now - 90 * day, firstEventAt: now - 60 * day}), now),
  []);
  // A booked event on a listing nobody owns is not a qualified host.
  assert.deepEqual(newHostConversions(facts({}),
    facts({firstEventAt: now}), now), []);
  assert.deepEqual(newHostConversions(facts({}), undefined, now), []);
});

test("only real owned organizers have a conversion owner", () => {
  const owned = {ownership: {state: "userCreated", ownerUserId: "host-1"}};
  assert.equal(conversionOwner(owned), "host-1");
  assert.equal(conversionOwner({...owned, synthetic: true}), null);
  assert.equal(conversionOwner({...owned, demoOps: true}), null);
  assert.equal(conversionOwner({ownership: {state: "programmatic",
    ownerUserId: "host-1"}}), null);
  assert.equal(conversionOwner({ownership: {state: "claimed",
    ownerUserId: null}}), null);
});

test("contact keys are normalised and hashed, or dropped", () => {
  assert.equal(hashedPhone("+919876543210")?.length, 64);
  assert.equal(hashedPhone("98765 43210"), null);
  // Google takes E.164 with its plus; Meta takes the digits only.
  assert.equal(hashedPhone("+919876543210"), sha256Hex("+919876543210"));
  assert.equal(hashedPhoneForMeta("+919876543210"), sha256Hex("919876543210"));
  assert.equal(hashedPhoneForMeta("9876543210"), null);
  assert.equal(hashedEmail("  Host@Example.COM "),
    hashedEmail("host@example.com"));
  assert.equal(hashedEmail("not-an-email"), null);
  assert.match(hostConversionEventId("org-1", "organizer_signup"),
    /^hc_[a-f0-9]{32}$/u);
  assert.notEqual(hostConversionEventId("org-1", "organizer_signup"),
    hostConversionEventId("org-1", "organizer_qualified"));
});

const organizer = {ownership: {state: "claimed", ownerUserId: "host-1"},
  email: "club@example.com"};
const owner = {phoneNumber: "+919876543210", email: ""};

test("one record per destination, holding only digests", () => {
  const records = hostDeliveryRecords({organizerId: "org-1",
    conversion: "organizer_qualified", organizer, owner, nowMillis: now});
  assert.deepEqual(records.map((r) => r.destination), ["meta", "google"]);
  assert.equal(records[0].eventId, records[1].eventId);
  assert.match(records[0].deliveryId, /^meta_hc_[a-f0-9]{32}$/u);
  const text = JSON.stringify(records);
  assert.equal(text.includes("+919876543210"), false);
  assert.equal(text.includes("club@example.com"), false);
  assert.equal(records[0].matching.emailSha256,
    hashedEmail("club@example.com"));
  assert.equal(records[0].expiresAt.toMillis() - now, 7 * day);
  // Deleted owners and owners with no contact key are skipped.
  assert.deepEqual(hostDeliveryRecords({organizerId: "org-1",
    conversion: "organizer_signup", organizer,
    owner: {...owner, deletedAt: at(now)}, nowMillis: now}), []);
  assert.deepEqual(hostDeliveryRecords({organizerId: "org-1",
    conversion: "organizer_signup", organizer: {...organizer, email: ""},
    owner: {phoneNumber: "", email: ""}, nowMillis: now}), []);
});

test("an opted-out owner's records are born cancelled without digests",
  () => {
    const records = hostDeliveryRecords({organizerId: "org-1",
      conversion: "organizer_qualified", organizer, owner, nowMillis: now,
      metaLeadId: "1234567890123", optedOut: true});
    assert.equal(records.length, 2);
    for (const record of records) {
      assert.equal(record.status, "cancelled");
      assert.equal(record.lastOutcome, "opted_out");
      assert.equal(record.matching.phoneSha256, null);
      assert.equal(record.matching.emailSha256, null);
      assert.equal(record.matching.metaPhoneSha256, null);
      assert.equal(record.metaLeadId, null);
    }
  });

test("wire payloads carry hashed keys and the shared event ID", () => {
  const [meta, google] = hostDeliveryRecords({organizerId: "org-1",
    conversion: "organizer_qualified", organizer, owner, nowMillis: now});
  const event = metaEvent(meta);
  assert.equal(event.event_name, "QualifiedHost");
  assert.equal(event.event_id, meta.eventId);
  assert.equal(event.action_source, "system_generated");
  assert.deepEqual(event.user_data.ph, [sha256Hex("919876543210")]);
  // A record queued before the Meta digest existed sends Meta no phone.
  assert.equal(metaEvent({...meta, matching: {...meta.matching,
    metaPhoneSha256: undefined}}).user_data.ph, undefined);
  assert.equal(event.custom_data.content_category, "host");
  const body = googleIngestBody(google, true);
  assert.equal(body.validateOnly, true);
  assert.equal(body.destinations[0].productDestinationId, "7906748544");
  assert.equal(body.events[0].transactionId, google.eventId);
  assert.deepEqual(body.events[0].userData.userIdentifiers.map(Object.keys)
    .flat().sort(), ["emailAddress", "phoneNumber"]);
});

test("provider responses map to accepted, final or retry", () => {
  assert.deepEqual(classifyMeta(200, {events_received: 1}),
    {kind: "accepted"});
  assert.equal(classifyMeta(400, {error: {code: 100}}).kind, "rejected");
  assert.equal(classifyMeta(429, null).kind, "retry");
  assert.equal(classifyMeta(200, {events_received: 0}).kind, "retry");
  assert.equal(classifyGoogle(200).kind, "accepted");
  assert.equal(classifyGoogle(400).kind, "rejected");
  assert.equal(classifyGoogle(503).kind, "retry");
});

test("retries back off and stop after five attempts", () => {
  const [record] = hostDeliveryRecords({organizerId: "org-1",
    conversion: "organizer_signup", organizer, owner, nowMillis: now});
  const first = afterAttempt(record, {kind: "retry", code: "meta_uncertain"},
    now);
  assert.equal(first.status, "pending");
  assert.equal(first.nextAttemptAt?.toMillis(), now + 5 * 60_000);
  const last = afterAttempt({...record, attempts: 4},
    {kind: "retry", code: "meta_uncertain"}, now);
  assert.equal(last.status, "unknown");
  assert.equal(afterAttempt(record, {kind: "accepted"}, now).status,
    "accepted");
});
