import assert from "node:assert/strict";
import test from "node:test";
import {hostSalesIntentReplay, prepareHostSalesIntent} from "./hostSalesIntent";

const input = {
  waitlistId: "private-lead-a", requestId: "submission-a",
  fullName: "Example Host", email: "host@example.test", city: "Example City",
  role: "host", hostApplication: {organizationName: "Example Club"},
  entryRoute: "/host/",
};

test("host and both submissions create private identity-review intents", () => {
  for (const role of ["host", "both"]) {
    const intent = prepareHostSalesIntent({...input, role})!;
    assert.equal(intent.organizerId, null);
    assert.equal(intent.status, "needs_identity_review");
    assert.equal(intent.classification, "sales_private");
    assert.equal(intent.evidenceStatus, "self_reported");
    assert.match(intent.intentId, /^[a-f0-9]{64}$/);
    assert.equal("ownerUid" in intent, false);
    assert.equal("appVisibility" in intent, false);
  }
  assert.equal(prepareHostSalesIntent({...input, role: "member"}), null);
});

test("request IDs scope replay to one lead", () => {
  const first = prepareHostSalesIntent(input)!;
  assert.deepEqual(prepareHostSalesIntent(input), first);
  assert.notEqual(
    prepareHostSalesIntent({...input, waitlistId: "another"})!.intentId,
    first.intentId);
  assert.equal(
    hostSalesIntentReplay({...first, alreadyJoined: false}, first), false);
  assert.equal(
    hostSalesIntentReplay({...first, alreadyJoined: true}, first), true);
  assert.equal(hostSalesIntentReplay(undefined, first), null);
});

test("changed material cannot reuse a submission ID", () => {
  const first = prepareHostSalesIntent(input)!;
  const changed = prepareHostSalesIntent({...input, city: "Another City"})!;
  assert.equal(first.intentId, changed.intentId);
  assert.throws(
    () => hostSalesIntentReplay({...first, alreadyJoined: true}, changed),
    /identity conflicts/);
  const next = prepareHostSalesIntent({...input,
    city: "Another City",
    requestId: "next"})!;
  assert.notEqual(first.intentId, next.intentId);
});

test("legacy retries coalesce and changed packets remain distinct", () => {
  const first = prepareHostSalesIntent({...input, requestId: null})!;
  assert.equal(prepareHostSalesIntent({...input, requestId: null})!.intentId,
    first.intentId);
  assert.notEqual(prepareHostSalesIntent({...input, requestId: null,
    hostApplication: {organizationName: "Another Club"}})!.intentId,
  first.intentId);
  const reordered = prepareHostSalesIntent({...input,
    hostApplication: {a: 1,
      b: 2}})!;
  assert.equal(
    prepareHostSalesIntent({...input,
      hostApplication: {b: 2,
        a: 1}})!.requestHash,
    reordered.requestHash);
});

test("phone and programme join the hash only when present", () => {
  const legacy = prepareHostSalesIntent(input)!;
  assert.equal(prepareHostSalesIntent({...input, phone: null,
    programme: null, programmeApplication: null})!.requestHash,
  legacy.requestHash);
  const weddings = prepareHostSalesIntent({...input, email: null,
    phone: "+919820144718", programme: "weddings",
    programmeApplication: {planningCompany: "Example Weddings"}})!;
  assert.notEqual(weddings.requestHash, legacy.requestHash);
  assert.equal(weddings.phone, "+919820144718");
  assert.equal(weddings.programme, "weddings");
  assert.deepEqual(weddings.programmeApplication,
    {planningCompany: "Example Weddings"});
});
