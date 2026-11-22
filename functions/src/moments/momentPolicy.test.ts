import assert from "node:assert/strict";
import test from "node:test";
import {eventFeedbackPrompt, eventStartReminder} from "./momentTemplates";
import {
  evaluateRecipientPolicy,
  inQuietHours,
  isTimeCriticalMoment,
  rollupPolicy,
  type PolicyInput,
} from "./momentPolicy";

const base: PolicyInput = {
  endpoint: {kind: "phone", e164: "+919876543210"},
  consent: {},
  explicitConsentRequired: true,
  quietHours: null,
  localMinuteOfDay: 720,
  sentTodayForEndpoint: 0,
  dailyCap: 2,
  timeCritical: false,
};

test("quiet hours wrap midnight and defer rather than suppress", () => {
  const quiet = {startMinute: 1260, endMinute: 480};
  assert.ok(inQuietHours(quiet, 1400));
  assert.ok(inQuietHours(quiet, 100));
  assert.ok(!inQuietHours(quiet, 720));
  assert.ok(!inQuietHours({startMinute: 600, endMinute: 600}, 600));
  assert.deepEqual(
    evaluateRecipientPolicy({...base, quietHours: quiet,
      localMinuteOfDay: 100}),
    {kind: "defer", reason: "quietHours"});
});

test("phone endpoints honor consent and suppression order", () => {
  assert.deepEqual(evaluateRecipientPolicy(base), {kind: "send"});
  assert.deepEqual(evaluateRecipientPolicy({...base,
    endpoint: {kind: "phone", e164: " "}}),
  {kind: "suppress", reason: "noEndpoint"});
  assert.deepEqual(evaluateRecipientPolicy({...base,
    consent: {endpointSuppressed: true}}),
  {kind: "suppress", reason: "endpointSuppressed"});
  assert.deepEqual(evaluateRecipientPolicy({...base,
    consent: {communicationPermission: "optedOut"}}),
  {kind: "suppress", reason: "optedOut"});
  // Explicit decline suppresses; absent record sends.
  assert.deepEqual(evaluateRecipientPolicy({...base,
    consent: {householdConsentGranted: false}}),
  {kind: "suppress", reason: "noConsent"});
  assert.deepEqual(evaluateRecipientPolicy({...base,
    consent: {householdConsentGranted: null}}),
  {kind: "send"});
  assert.deepEqual(evaluateRecipientPolicy({...base,
    consent: {communicationPermission: "unknown"}}),
  {kind: "suppress", reason: "noConsent"});
});

test("consent checks are skipped when the send does not require them", () => {
  // Service sends without an explicit-consent requirement ignore household
  // state, but a hard opt-out still suppresses.
  assert.deepEqual(evaluateRecipientPolicy({...base,
    explicitConsentRequired: false,
    consent: {householdConsentGranted: false}}),
  {kind: "send"});
  assert.deepEqual(evaluateRecipientPolicy({...base,
    explicitConsentRequired: false,
    consent: {communicationPermission: "optedOut"}}),
  {kind: "suppress", reason: "optedOut"});
});

test("uid endpoints are deliverable without a token; opt-out still " +
    "suppresses", () => {
  const uidBase: PolicyInput = {...base,
    endpoint: {kind: "uid", uid: "u1"}};
  // A uid endpoint always lands as an activity item; a missing device
  // token only forgoes the push leg at delivery (reminder parity).
  assert.deepEqual(evaluateRecipientPolicy(uidBase), {kind: "send"});
  assert.deepEqual(evaluateRecipientPolicy({...uidBase,
    consent: {communicationPermission: "optedOut"}}),
  {kind: "suppress", reason: "preferenceOff"});
});

test("daily cap suppresses; cap of zero disables", () => {
  assert.deepEqual(evaluateRecipientPolicy({...base,
    sentTodayForEndpoint: 2}),
  {kind: "suppress", reason: "dailyCap"});
  assert.deepEqual(evaluateRecipientPolicy({...base, dailyCap: 0,
    sentTodayForEndpoint: 99}), {kind: "send"});
});

test("rollup aggregates suppression reasons", () => {
  const rollup = rollupPolicy([
    {kind: "send"},
    {kind: "send"},
    {kind: "defer", reason: "quietHours"},
    {kind: "suppress", reason: "noConsent"},
    {kind: "suppress", reason: "noConsent"},
    {kind: "suppress", reason: "dailyCap"},
  ]);
  assert.deepEqual(rollup, {
    send: 2, deferred: 1,
    suppressed: {noConsent: 2, dailyCap: 1},
  });
});

test("time-critical sends skip quiet hours and the daily cap only", () => {
  const quiet = {startMinute: 1260, endMinute: 480};
  const urgent: PolicyInput = {...base,
    endpoint: {kind: "uid", uid: "u1"}, explicitConsentRequired: false,
    quietHours: quiet, localMinuteOfDay: 375, sentTodayForEndpoint: 9,
    timeCritical: true};
  assert.deepEqual(evaluateRecipientPolicy(urgent), {kind: "send"});
  // A preference opt-out still wins.
  assert.deepEqual(evaluateRecipientPolicy({...urgent,
    consent: {communicationPermission: "optedOut"}}),
  {kind: "suppress", reason: "preferenceOff"});
  // The same send without the class is capped, then deferred.
  assert.deepEqual(evaluateRecipientPolicy({...urgent, timeCritical: false}),
    {kind: "suppress", reason: "dailyCap"});
  assert.deepEqual(evaluateRecipientPolicy({...urgent, timeCritical: false,
    sentTodayForEndpoint: 0}), {kind: "defer", reason: "quietHours"});
});

test("only the system start reminder is time-critical", () => {
  const reminder = eventStartReminder({eventId: "e1"});
  assert.ok(isTimeCriticalMoment(reminder));
  // Stored before the rule existed: a host-edited lead keeps the class.
  assert.ok(isTimeCriticalMoment({...reminder,
    initiation: {kind: "anchored", anchorKind: "scopeStart",
      anchorId: null, offsetMinutes: -30}}));
  assert.ok(!isTimeCriticalMoment({...reminder, origin: "organizer"}));
  assert.ok(!isTimeCriticalMoment(eventFeedbackPrompt({eventId: "e1"})));
  assert.ok(!isTimeCriticalMoment({...reminder,
    initiation: {kind: "anchored", anchorKind: "scopeStart",
      anchorId: null, offsetMinutes: 30}}));
  assert.ok(!isTimeCriticalMoment({...reminder,
    initiation: {kind: "anchored", anchorKind: "scopeStart",
      anchorId: null, offsetMinutes: 0, offsetDays: -1}}));
  assert.ok(!isTimeCriticalMoment({...reminder,
    initiation: {kind: "scheduled", atMillis: 1}}));
});
