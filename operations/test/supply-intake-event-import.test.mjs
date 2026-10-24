import Ajv from "ajv";
import addFormats from "ajv-formats";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {
  GOVERNED_BLOCKERS,
  activityKind,
  externalEventId,
  planListingEventImport,
  price,
} from "../src/workflows/supply-intake/event-import.mjs";

const contracts = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../contracts");
// Load exactly the schemas the externalEvents contract references.
const validateExternalEvent = (() => {
  const ajv = new Ajv({allErrors: true, strict: false});
  addFormats(ajv);
  const pending = [path.join(contracts, "firestore/external_events.schema.json")];
  const loaded = new Set();
  while (pending.length > 0) {
    const file = pending.pop();
    if (loaded.has(file)) continue;
    loaded.add(file);
    const text = fs.readFileSync(file, "utf8");
    const schema = JSON.parse(text);
    // Shared contracts also keep plain data lists under definitions.
    for (const [key, value] of Object.entries(schema.definitions ?? {})) {
      if (value === null || typeof value !== "object" || Array.isArray(value)) delete schema.definitions[key];
    }
    ajv.addSchema(schema);
    for (const [, ref] of text.matchAll(/"\$ref":\s*"([^"#]+)/gu)) pending.push(path.resolve(path.dirname(file), ref));
  }
  return ajv.getSchema("https://catch.app/contracts/firestore/external_events.schema.json");
})();

const NOW = "2026-10-24T08:00:00.000Z";
const event = (overrides = {}) => ({
  listingId: "intake-nom-1", listingWorkItemId: "wi-listing", requestId: "nom-1",
  eventKey: "luma:1dfd73wq", platform: "luma", sourceEntityId: "1dfd73wq",
  title: "BlrDroid Meetup #133", description: "Talks on Kotlin and Compose.",
  startAt: "2026-11-01T09:30:00.000+05:30", endAt: "2026-11-01T13:00:00.000+05:30", timezone: "Asia/Kolkata",
  venue: "Thoughtworks", address: "Koramangala, Bengaluru", locality: "Bengaluru",
  latitude: 12.9352, longitude: 77.6245, sourceUrl: "https://luma.com/1dfd73wq",
  imageUrl: "https://images.lumacdn.com/x.png", price: {min: 0, max: 0, currency: "INR"}, status: "scheduled",
  attendanceMode: "offline", organizerName: "BlrDroid", organizerUrl: "https://luma.com/blrdroid",
  adapterId: "luma", evidenceFields: ["title", "startAt"], alsoListedAt: [], ...overrides,
});
const organizer = {organizerId: "organizer-blrdroid", claimable: true};
const review = (overrides = {}) => ({reviewerUid: "staff-1", decidedAt: NOW, note: null,
  ownerSafeCopyReviewed: true, importPolicyAcknowledged: true, blockerResolutions: [], ...overrides});
const plan = (overrides = {}) => planListingEventImport({event: event(), workItemId: "wi-event-1", organizer,
  review: review(), citySlug: "bengaluru", now: NOW, ...overrides});

test("a complete, reviewed event plans a read-only external event that satisfies the contract", () => {
  const result = plan();
  assert.deepEqual([result.status, result.blockers], ["write_ready", []]);
  assert.equal(validateExternalEvent(result.document), true, JSON.stringify(validateExternalEvent.errors));
  const doc = result.document;
  assert.equal(doc.canonicalHostId, "organizer-blrdroid");
  assert.equal(doc.booking.mode, "external_outbound_only");
  assert.deepEqual([doc.booking.catchBookingEnabled, doc.booking.catchPaymentsEnabled,
    doc.organizerCapabilities.bookable, doc.organizerCapabilities.claimable], [false, false, false, true]);
  assert.deepEqual(doc.booking.externalLinks.map((link) => [link.platform, link.url, link.primary]),
    [["luma", "https://luma.com/1dfd73wq", true]]);
  assert.equal(doc.price.displayText, "Free");
  assert.equal(doc.discovery.manualApprovalRequired, true);
  assert.equal(doc.startTime._seconds, Date.parse("2026-11-01T04:00:00.000Z") / 1000);
  assert.equal(result.eventId, externalEventId(event(), organizer.organizerId), "the id is stable across re-plans");
});

test("missing facts block, and only governed blockers can be resolved or waived per event", () => {
  const sparse = plan({event: event({endAt: null, venue: null, address: null, latitude: null, longitude: null}),
    review: review({ownerSafeCopyReviewed: false})});
  assert.deepEqual(sparse.blockers, ["missing_end_time", "missing_exact_coordinates", "missing_location_detail",
    "requires_owner_safe_copy_review"]);
  assert.ok(sparse.blockers.every((blocker) => GOVERNED_BLOCKERS.includes(blocker)));
  const resolved = plan({event: event({endAt: null, latitude: null, longitude: null}), review: review({
    blockerResolutions: [
      {blockerCode: "missing_end_time", outcome: "resolved", policyGapDecisionId: null, note: "Two-hour meetup."},
      {blockerCode: "missing_exact_coordinates", outcome: "waived", policyGapDecisionId: "decision-7",
        note: "Venue address is precise."},
    ]})});
  assert.deepEqual([resolved.status, resolved.blockers], ["write_ready", []]);
  assert.equal(validateExternalEvent(resolved.document), true, JSON.stringify(validateExternalEvent.errors));
  // A waiver without its policy decision, or for an ungoverned blocker, changes nothing.
  const unbacked = plan({event: event({latitude: null}), review: review({blockerResolutions: [
    {blockerCode: "missing_exact_coordinates", outcome: "waived", policyGapDecisionId: null, note: "x"},
    {blockerCode: "organizer_listing_pending", outcome: "resolved", policyGapDecisionId: null, note: "x"}]}),
  organizer: null});
  assert.deepEqual(unbacked.blockers, ["missing_exact_coordinates", "organizer_listing_pending"]);
  assert.equal(unbacked.document, null, "nothing is drafted before the organizer exists");
});

test("events that cannot be published say why", () => {
  for (const [label, overrides, blocker] of [
    ["unpublished organizer", {organizer: null}, "organizer_listing_pending"],
    ["Urbanaut until the platform enum allows it", {event: event({platform: "urbanaut", eventKey: "urbanaut:x"})},
      "platform_not_publishable"],
    ["cancelled", {event: event({status: "cancelled"})}, "event_cancelled"],
    ["ended", {now: "2026-12-01T00:00:00.000Z"}, "event_already_ended"],
    ["no start", {event: event({startAt: null})}, "start_time_missing"],
    ["policy not acknowledged", {review: review({importPolicyAcknowledged: false})}, "import_policy_not_acknowledged"],
  ]) {
    const result = plan(overrides);
    assert.equal(result.status, "blocked", label);
    assert.ok(result.blockers.includes(blocker), `${label}: ${result.blockers}`);
  }
});

test("the same event on two platforms publishes once with both links", () => {
  const district = event({eventKey: "district:abc", platform: "district", sourceEntityId: "abc",
    sourceUrl: "https://district.in/events/blrdroid-133"});
  const blocked = plan({duplicates: [district]});
  assert.deepEqual(blocked.blockers, ["duplicate_normalized_event_key"]);
  const merged = plan({duplicates: [district], review: review({blockerResolutions: [{blockerCode:
    "duplicate_normalized_event_key", outcome: "resolved", policyGapDecisionId: null, note: "Same meetup."}]})});
  assert.equal(merged.status, "write_ready");
  assert.deepEqual(merged.document.booking.externalLinks.map((link) => [link.platform, link.primary]),
    [["luma", true], ["district", false]]);
  assert.deepEqual(merged.document.dedupe.duplicateCandidateIds, ["district:abc"]);
  const alsoListed = plan({event: event({alsoListedAt: ["https://district.in/events/blrdroid-133"]})});
  assert.deepEqual(alsoListed.document.booking.externalLinks.map((link) => link.platform), ["luma", "district"],
    "a link elsewhere keeps its own platform");
  assert.equal(validateExternalEvent(merged.document), true, JSON.stringify(validateExternalEvent.errors));
});

test("activity and price heuristics carry over from the retired plan", () => {
  assert.equal(activityKind({title: "Sunday 5K run club"}), "socialRun");
  assert.equal(activityKind({title: "Pub quiz night"}), "pubQuiz");
  assert.equal(activityKind({title: "Tech meetup"}), "openActivity");
  assert.deepEqual(price(null), {displayText: null, parsedPriceInPaise: null, currency: "INR"});
  assert.deepEqual(price({min: 499, max: 499, currency: "INR"}), {displayText: "₹499", parsedPriceInPaise: 49_900, currency: "INR"});
  assert.deepEqual(price({min: 300, max: 800, currency: "INR"}), {displayText: "₹300–800", parsedPriceInPaise: 30_000, currency: "INR"});
  assert.deepEqual(price({min: 10, max: null, currency: "usd"}), {displayText: "USD 10", parsedPriceInPaise: 1_000, currency: "USD"});
  assert.equal(price({min: 250, max: 250, currency: null}).currency, "INR", "an unstated currency is the market's");
});
