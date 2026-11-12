import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateRecipientPolicy,
  inQuietHours,
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
