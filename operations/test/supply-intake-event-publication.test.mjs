import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTO_PUBLISH_ACTOR,
  AUTO_PUBLISH_MODE,
  attributionFindings,
  automatedEventReview,
  datingFramingFindings,
  loadEventPublicationPolicy,
  priceFindings,
  staffEventReview,
} from "../src/workflows/supply-intake/event-publication.mjs";

const NOW = "2026-10-25T08:00:00.000Z";
const organizer = {name: "BlrDroid Community", links: ["https://luma.com/blrdroid", "https://instagram.com/blrdroid"]};
const event = (overrides = {}) => ({title: "Android Dev Meetup", description: "Talks and demos on Compose.",
  organizerName: "BlrDroid Community", organizerUrl: "https://luma.com/blrdroid",
  price: {min: 0, max: 0, currency: "INR"}, ...overrides});

test("the shipped policy records the owner's decision to auto-publish approved organizers' events", async () => {
  const policy = await loadEventPublicationPolicy();
  assert.equal(policy.mode, AUTO_PUBLISH_MODE);
  assert.equal(policy.decision.decidedBy, "owner");
  assert.match(policy.decision.reference, /CAT-213/u);
});

test("a policy outside its schema fails closed", async () => {
  const readFile = async (file) => file.endsWith(".schema.json") ?
    (await import("node:fs/promises")).readFile(file, "utf8") :
    JSON.stringify({schemaVersion: 1, policyVersion: "x", mode: "publish_everything", decision: null});
  await assert.rejects(loadEventPublicationPolicy({readFile}), {code: "INVALID_EVENT_PUBLICATION_POLICY"});
});

test("an attributed event with clean copy is eligible under auto-publish", async () => {
  const policy = await loadEventPublicationPolicy();
  const result = automatedEventReview({event: event(), organizer, policy, now: NOW});
  assert.equal(result.eligible, true);
  assert.deepEqual(result.findings, []);
  assert.deepEqual([result.review.reviewerUid, result.review.ownerSafeCopyReviewed,
    result.review.importPolicyAcknowledged, result.review.blockerResolutions], [AUTO_PUBLISH_ACTOR, true, true, []]);
});

test("staff review mode never auto-publishes", async () => {
  const policy = {...await loadEventPublicationPolicy(), mode: "staff_review"};
  const result = automatedEventReview({event: event(), organizer, policy, now: NOW});
  assert.equal(result.eligible, false);
  assert.equal(result.review.importPolicyAcknowledged, false);
});

test("dating framing in the organizer's copy waits for a person", async () => {
  const policy = await loadEventPublicationPolicy();
  for (const [field, text] of [["title", "Singles Mixer Night"], ["description", "Speed dating, then drinks."],
    ["title", "Find your match at the park"]]) {
    const result = automatedEventReview({event: event({[field]: text}), organizer, policy, now: NOW});
    assert.equal(result.eligible, false, text);
    assert.equal(result.review.ownerSafeCopyReviewed, false, text);
    assert.ok(result.findings.every((finding) => finding.check === "dating_framing" && finding.field === field));
  }
  for (const title of ["Single-origin coffee cupping", "Single ticket, doubles padel"]) {
    assert.deepEqual(datingFramingFindings(event({title})), [], `ordinary English passes: ${title}`);
  }
  assert.equal(datingFramingFindings(event({description: "A night for single professionals."})).length, 1);
});

test("an event whose page states no price waits for a person; a free one does not", async () => {
  const policy = await loadEventPublicationPolicy();
  for (const price of [null, {min: null, max: null, currency: "INR"}]) {
    const result = automatedEventReview({event: event({price}), organizer, policy, now: NOW});
    assert.equal(result.eligible, false);
    assert.deepEqual(result.findings.map((finding) => finding.check), ["price_missing"]);
    assert.equal(result.review.ownerSafeCopyReviewed, true, "a missing price is not a copy problem");
  }
  assert.deepEqual(priceFindings(event({price: {min: 0, max: 0, currency: "INR"}})), []);
  assert.deepEqual(priceFindings(event({price: {min: 499, max: 499, currency: "INR"}})), []);
});

test("an event naming another organizer waits for a person", () => {
  assert.deepEqual(attributionFindings(event({organizerName: "Someone Else", organizerUrl: "https://luma.com/other"}),
    organizer).map((finding) => finding.check), ["organizer_attribution"]);
  assert.deepEqual(attributionFindings(event({organizerName: "BLRDROID community!"}), organizer), [],
    "names compare case- and punctuation-insensitively");
  assert.deepEqual(attributionFindings(event({organizerName: "BlrDroid", organizerUrl: "https://lu.ma/blrdroid?x=1"}),
    organizer), [], "a matching organizer link is enough");
  assert.deepEqual(attributionFindings(event({organizerName: null, organizerUrl: null}), organizer), [],
    "a calendar event that names no organizer is the calendar owner's");
});

test("a staff review carries the checklist and the reviewer's resolutions", () => {
  const review = staffEventReview({reviewerUid: "staff-1", decidedAt: NOW, note: "Checked on Luma.",
    checklist: {outboundLinksReviewed: true, noCatchBookingPaymentsWaitlist: true, ownerSafeCopyReviewed: true},
    blockerResolutions: [{blockerCode: "missing_end_time", outcome: "resolved", note: "Two-hour meetup."}]});
  assert.deepEqual([review.ownerSafeCopyReviewed, review.importPolicyAcknowledged], [true, true]);
  assert.deepEqual(review.blockerResolutions, [{blockerCode: "missing_end_time", outcome: "resolved",
    policyGapDecisionId: null, note: "Two-hour meetup."}]);
  const unchecked = staffEventReview({reviewerUid: "staff-1", decidedAt: NOW, note: "x",
    checklist: {outboundLinksReviewed: true, noCatchBookingPaymentsWaitlist: false, ownerSafeCopyReviewed: false}});
  assert.deepEqual([unchecked.ownerSafeCopyReviewed, unchecked.importPolicyAcknowledged], [false, false]);
});
