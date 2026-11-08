import assert from "node:assert/strict";
import test from "node:test";
import {
  eventPaymentTermsFromPreferences, eventPaymentTermsHash,
  organizerEventDefaultsHash,
  resolveEventPreferences,
} from "./resolve";
import {
  previewEventPaymentChange, snapshotOfferPaymentTerms,
} from "./payment";
import {
  EventPaymentTerms, EventPreferenceError, EventPreferenceIntents,
  OrganizerEventDefaults,
} from "./types";

const reusablePage = {
  url: "https://payments.example.com/events/club",
  reusableForEvents: true as const,
};
const defaults: OrganizerEventDefaults = {
  revision: 7,
  timezone: "Asia/Kolkata",
  eventPolicy: {admissionPreset: "inviteOnly"},
  eventSetup: {
    usualDurationMinutes: 120,
    preferredVenueId: "venue_1",
    offerValidityMinutes: 180,
    collectionPreference: "reusablePage",
    currency: "INR",
    offerMessageTemplate: "Your event offer is ready.",
    paymentInstructions: "Use the payment page and save the reference.",
    reusablePaymentPage: reusablePage,
  },
};

function intents(): EventPreferenceIntents {
  return {
    usualDurationMinutes: {mode: "inherit"},
    preferredVenueId: {mode: "inherit"},
    offerValidityMinutes: {mode: "inherit"},
    admissionPreset: {mode: "inherit"},
    collectionPreference: {mode: "inherit"},
    currency: {mode: "inherit"},
    offerMessageTemplate: {mode: "inherit"},
    paymentInstructions: {mode: "inherit"},
    reusablePaymentPage: {mode: "inherit"},
    expectedAmountMinor: {mode: "clear"},
  };
}

function resolved(input: EventPreferenceIntents = intents(),
  source: OrganizerEventDefaults = defaults) {
  return resolveEventPreferences({defaults: source, intents: input,
    reviewedDefaultsHash: organizerEventDefaultsHash(source)});
}

function payment(input: EventPreferenceIntents = intents(),
  revision = 1): EventPaymentTerms {
  return eventPaymentTermsFromPreferences(resolved(input), revision);
}

function isError(error: unknown, code: EventPreferenceError["code"]):
  boolean {
  return error instanceof EventPreferenceError && error.code === code;
}

test("inherit, set and clear retain field provenance and revision", () => {
  const input = intents();
  input.usualDurationMinutes = {mode: "set", value: 90};
  input.preferredVenueId = {mode: "clear"};
  input.expectedAmountMinor = {mode: "set", value: 25000};
  const result = resolved(input);
  assert.deepEqual(result.usualDurationMinutes,
    {value: 90, source: "event"});
  assert.deepEqual(result.preferredVenueId,
    {value: null, source: "cleared"});
  assert.deepEqual(result.offerValidityMinutes,
    {value: 180, source: "organizer"});
  assert.deepEqual(result.admissionPreset,
    {value: "inviteOnly", source: "organizer"});
  assert.deepEqual(result.expectedAmountMinor,
    {value: 25000, source: "event"});
  assert.equal(result.defaultsRevision, 7);
  assert.equal(result.currency.value, "INR");
  assert.equal(Object.hasOwn(result, "endTime"), false);
  assert.equal(Object.hasOwn(result, "selectedVenue"), false);
});

test("one offer field follows the full inherit/set/clear truth table", () => {
  const inherited = resolved();
  assert.deepEqual(inherited.offerValidityMinutes,
    {value: 180, source: "organizer"});
  const set = intents();
  set.offerValidityMinutes = {mode: "set", value: 45};
  assert.deepEqual(resolved(set).offerValidityMinutes,
    {value: 45, source: "event"});
  const cleared = intents();
  cleared.offerValidityMinutes = {mode: "clear"};
  assert.deepEqual(resolved(cleared).offerValidityMinutes,
    {value: null, source: "cleared"});
  assert.throws(() => snapshotOfferPaymentTerms({terms: payment(cleared),
    nowMillis: 1_000_000, eventStartsAtMillis: 9_000_000}),
  (error) => isError(error, "incomplete"));
});

test("defaults change requires review and preserves old snapshot", () => {
  const old = payment();
  const prior = JSON.stringify(old);
  const changed: OrganizerEventDefaults = {...defaults, revision: 8,
    eventSetup: {...defaults.eventSetup, offerValidityMinutes: 60}};
  assert.throws(() => resolveEventPreferences({defaults: changed,
    intents: intents(), reviewedDefaultsHash:
      organizerEventDefaultsHash(defaults)}),
  (error) => isError(error, "stale"));
  assert.equal(JSON.stringify(old), prior);
  assert.equal(old.offerValidityMinutes, 180);
  assert.equal(resolved(intents(), changed).offerValidityMinutes.value, 60);
});

test("reusable page requires explicit reuse, amount requires currency", () => {
  const badPage: OrganizerEventDefaults = {...defaults,
    eventSetup: {...defaults.eventSetup,
      reusablePaymentPage: {...reusablePage,
        reusableForEvents: false as true}}};
  assert.throws(() => organizerEventDefaultsHash(badPage),
    (error) => isError(error, "invalid"));
  const badLink: OrganizerEventDefaults = {...defaults,
    eventSetup: {...defaults.eventSetup,
      reusablePaymentPage: {url: "http://127.0.0.1/invoice",
        reusableForEvents: true}}};
  assert.throws(() => organizerEventDefaultsHash(badLink),
    (error) => isError(error, "invalid"));
  const input = intents();
  input.currency = {mode: "clear"};
  input.expectedAmountMinor = {mode: "set", value: 25000};
  assert.throws(() => resolved(input),
    (error) => isError(error, "invalid"));
});

test("offer terms cap expiry and freeze a per-offer revision/hash", () => {
  const input = intents();
  input.expectedAmountMinor = {mode: "set", value: 25000};
  const terms = payment(input);
  const snapshot = snapshotOfferPaymentTerms({terms, nowMillis: 1_000_000,
    eventStartsAtMillis: 1_600_000});
  assert.equal(snapshot.expiresAtMillis, 1_600_000);
  assert.equal(snapshot.eventPaymentRevision, 1);
  assert.equal(snapshot.expectedAmountMinor, 25000);
  assert.equal(snapshot.reusablePaymentPageUrl, reusablePage.url);
  assert.match(snapshot.eventPaymentHash, /^[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(snapshot, "paid"), false);
});

test("a preference never activates one-off request or Catch checkout", () => {
  for (const method of ["personalRequest", "catchCheckout"] as const) {
    const input = intents();
    input.collectionPreference = {mode: "set", value: method};
    const terms = payment(input);
    assert.throws(() => snapshotOfferPaymentTerms({terms,
      nowMillis: 1_000_000, eventStartsAtMillis: 9_000_000}),
    (error) => isError(error, "incomplete"));
  }
});

test("change preview preserves historical offered terms", () => {
  const current = payment();
  const priorOffer = snapshotOfferPaymentTerms({terms: current,
    nowMillis: 1_000_000, eventStartsAtMillis: 9_000_000});
  const frozen = JSON.stringify(priorOffer);
  const nextIntent = intents();
  nextIntent.paymentInstructions = {mode: "set",
    value: "New instructions for future offers."};
  const candidate = payment(nextIntent, 2);
  const preview = previewEventPaymentChange({current, candidate,
    expectedRevision: 1, existingOffers: [priorOffer]});
  assert.deepEqual(preview.changedFields, ["paymentInstructions"]);
  assert.equal(preview.requiresOfferReview, true);
  assert.equal(preview.existingOffersKeepOriginalTerms, true);
  assert.equal(JSON.stringify(priorOffer), frozen);
  assert.notEqual(snapshotOfferPaymentTerms({terms: candidate,
    nowMillis: 1_000_000, eventStartsAtMillis: 9_000_000})
    .eventPaymentHash, priorOffer.eventPaymentHash);
  assert.throws(() => previewEventPaymentChange({current, candidate,
    expectedRevision: 0, existingOffers: [priorOffer]}),
  (error) => isError(error, "stale"));
  const reordered = {
    ...current,
    reusablePaymentPage: {reusableForEvents: true as const,
      url: reusablePage.url},
  };
  assert.equal(eventPaymentTermsHash(reordered),
    eventPaymentTermsHash(current));
});


test("resolved payment snapshots do not retain mutable defaults references",
  () => {
    const source: OrganizerEventDefaults = {...defaults,
      eventSetup: {...defaults.eventSetup,
        reusablePaymentPage: {...reusablePage}}};
    const preferences = resolved(intents(), source);
    const terms = eventPaymentTermsFromPreferences(preferences, 1);
    source.eventSetup!.reusablePaymentPage!.url =
      "https://payments.example.com/changed-default";
    assert.equal(preferences.reusablePaymentPage.value?.url, reusablePage.url);
    preferences.reusablePaymentPage.value!.url =
      "https://payments.example.com/changed-editor";
    assert.equal(terms.reusablePaymentPage?.url, reusablePage.url);
    const input = intents();
    input.expectedAmountMinor = {mode: "inherit"} as never;
    assert.throws(() => resolved(input),
      (error) => isError(error, "invalid"));
  });

test("integrated checkout freezes terms without activating a provider", () => {
  const input = intents();
  input.collectionPreference = {mode: "set", value: "catchCheckout"};
  input.expectedAmountMinor = {mode: "set", value: 25000};
  const terms = payment(input);
  const snapshot = snapshotOfferPaymentTerms({terms, nowMillis: 1_000_000,
    eventStartsAtMillis: 9_000_000, allowCatchCheckout: true});
  assert.equal(snapshot.expectedAmountMinor, 25000);
  assert.equal(snapshot.reusablePaymentPageUrl, null);
  assert.equal(Object.hasOwn(snapshot, "provider"), false);
  assert.throws(() => snapshotOfferPaymentTerms({
    terms: {...terms, currency: "USD"},
    nowMillis: 1_000_000, eventStartsAtMillis: 9_000_000,
    allowCatchCheckout: true}), (error) => isError(error, "incomplete"));
});

test("booking mode is optional, inherits and leaves old hashes alone", () => {
  const without = resolved();
  assert.equal("bookingMode" in without, false);
  const withDefault = {...defaults, eventSetup: {...defaults.eventSetup,
    bookingMode: "askFirst" as const}};
  assert.notEqual(organizerEventDefaultsHash(withDefault),
    organizerEventDefaultsHash(defaults));
  assert.deepEqual(resolved(intents(), withDefault).bookingMode,
    {value: "askFirst", source: "organizer"});
  const inherited = resolved({...intents(), bookingMode: {mode: "inherit"}},
    withDefault);
  assert.deepEqual(inherited.bookingMode,
    {value: "askFirst", source: "organizer"});
  const set = resolved({...intents(), bookingMode: {mode: "set",
    value: "anyone"}}, withDefault);
  assert.deepEqual(set.bookingMode, {value: "anyone", source: "event"});
  assert.throws(() => resolved({...intents(), bookingMode: {mode: "set",
    value: "everyone" as never}}), EventPreferenceError);
});

test("the waitlist choice is optional and inherits the default", () => {
  assert.equal("waitlistEnabled" in resolved(), false);
  const withDefault = {...defaults, eventSetup: {...defaults.eventSetup,
    waitlistEnabled: false}};
  assert.deepEqual(resolved(intents(), withDefault).waitlistEnabled,
    {value: false, source: "organizer"});
  assert.deepEqual(resolved({...intents(), waitlistEnabled: {mode: "set",
    value: true}}, withDefault).waitlistEnabled,
  {value: true, source: "event"});
});
