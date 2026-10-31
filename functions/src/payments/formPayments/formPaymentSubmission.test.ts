import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {saveOrganizerFormResponseDraftHandler,
  submitOrganizerFormResponseHandler} from
  "../../organizers/organizerFormResponses";
import {canFinalizeFrozenForm, expireFormPaymentReservation,
  reserveFormPayment} from "./formPaymentSubmission";
import {createFormPaymentFixture as harness} from "./formPaymentTestStore";

const now = Timestamp.fromMillis(1000);

test("checkout retries do not duplicate responses", async () => {
  const h = harness();
  const [first, second] = await Promise.all([h.reserve(), h.reserve()]);
  assert.equal(first.paymentId, second.paymentId);
  assert.equal(h.store.records.get("organizerForms/form")?.pendingPaymentCount,
    1);
  assert.equal([...h.store.records.keys()].some((key) =>
    key.startsWith("organizerFormResponses/")), false);
  assert.equal(await h.finalize(first.paymentId), "creatingOrder");
  h.capture(first.paymentId);
  assert.deepEqual(await Promise.all([h.finalize(first.paymentId),
    h.finalize(first.paymentId)]), ["submitted", "submitted"]);
  const form = h.store.records.get("organizerForms/form");
  assert.equal(form?.pendingPaymentCount, 0);
  assert.equal(form?.submittedResponseCount, 1);
  const responses = [...h.store.records.entries()].filter(([path]) =>
    path.startsWith("organizerFormResponses/"));
  assert.equal(responses.length, 1);
  assert.deepEqual(responses[0][1].answers, {name: "Sara Demo"});
  assert.equal([...h.store.records.keys()].some((path) =>
    /^(users|matches|eventAttendees|organizerCustomers)\//u.test(path)), false);
});

test("pending reservation closes capacity to another response", async () => {
  const h = harness();
  await h.reserve();
  h.store.records.set("organizerFormResponseDrafts/other", {...h.draft});
  await assert.rejects(reserveFormPayment({db: h.db, request: h.request,
    data: {...h.data, draftId: "other"}, now}), /not accepting/u);
});

test("expiry frees capacity once and blocks late submission", async () => {
  const h = harness();
  const {paymentId, payment} = await h.reserve();
  await expireFormPaymentReservation({db: h.db, paymentId, now});
  assert.equal(h.store.records.get("organizerForms/form")?.pendingPaymentCount,
    1);
  const expire = () => expireFormPaymentReservation({db: h.db, paymentId,
    now: payment.checkoutExpiresAt});
  await Promise.all([expire(), expire()]);
  assert.equal(h.store.records.get("organizerForms/form")?.pendingPaymentCount,
    0);
  h.capture(paymentId);
  assert.equal(await h.finalize(paymentId), "refundPending");
  assert.equal(
    h.store.records.get("organizerForms/form")?.submittedResponseCount,
    0);
});

test("interrupted finalization rolls back and can retry", async () => {
  const h = harness();
  const {paymentId} = await h.reserve();
  h.capture(paymentId);
  h.store.failNextCommit = true;
  await assert.rejects(h.finalize(paymentId), /Interrupted/u);
  assert.equal(
    h.store.records.get("organizerForms/form")?.submittedResponseCount,
    0);
  assert.equal(await h.finalize(paymentId), "submitted");
});

test("frozen answers, identity, version, fee and consent cannot be substituted",
  async () => {
    const h = harness();
    const {paymentId, payment} = await h.reserve();
    const draft = {...h.draft, paymentAttemptId: paymentId};
    const form = {...h.form, pendingPaymentCount: 1};
    const input = {paymentId, payment, draft, form, version: h.version};
    assert.equal(canFinalizeFrozenForm(input), true);
    for (const patch of [{answers: {name: "Changed"}}, {revision: 2},
      {respondentUid: "other"}, {organizerId: "other"}, {versionId: "other"},
      {paymentAttemptId: "other"}, {consentAccepted: false},
      {consentVersion: "v2"}, {status: "submitted" as const}]) {
      assert.equal(canFinalizeFrozenForm({
        ...input, draft: {...draft, ...patch}}),
      false);
    }
    assert.equal(canFinalizeFrozenForm({...input, payment: {...payment,
      amountPaise: 20000}}), false);
    h.capture(paymentId);
    h.store.records.delete("organizerFormResponseDrafts/draft");
    assert.equal(await h.finalize(paymentId), "refundPending");
    assert.equal(
      h.store.records.get("organizerForms/form")?.submittedResponseCount,
      0);
  });

test("checkout denies unverified and foreign identities", async () => {
  const h = harness();
  await assert.rejects(reserveFormPayment({db: h.db, data: h.data, now,
    request: {...h.request, auth: undefined}}), /Verify/u);
  await h.reserve();
  await assert.rejects(reserveFormPayment({db: h.db, data: h.data, now,
    request: {...h.request, auth: {...h.request.auth!, uid: "other"}}}),
  /unavailable/u);
});

test("locked checkout cannot be edited or submitted through the free endpoint",
  async () => {
    const h = harness();
    await h.reserve();
    const deps = {firestore: () => h.db, checkRateLimit: async () => undefined,
      timestamp: () => now,
      storageBucket: () => {
        throw new Error("No storage in this test");
      }};
    await assert.rejects(submitOrganizerFormResponseHandler(h.request, deps),
      /no longer editable/u);
    const request = {...h.request, data: {draftId: "draft", draftToken: null,
      expectedRevision: 1, answers: {name: "Changed"}, consentAccepted: true}};
    await assert.rejects(saveOrganizerFormResponseDraftHandler(request, deps),
      /no longer editable/u);
  });

test("event cancellation prevents new checkout and routes capture to refund",
  async () => {
    const h = harness();
    h.version.definition.defaultTargetKind = "event";
    h.version.definition.defaultTargetId = "event";
    const event = {organizerId: "org", name: "Private event",
      publicationState: "private",
      setupRevision: 1, publicRegistrationEnabled: false,
      eventCityId: "city1", eventMarketId: "market1",
      eventLocalDate: "2026-10-02", eventLocalStartTime: "18:00",
      eventTimezone: "Asia/Kolkata", setupDefaults: {
        city: {value: {cityId: "city1", marketId: "market1"}, source: "event"},
        timezone: {value: "Asia/Kolkata", source: "event"},
        organizerDefaultsRevision: null, organizerDefaultsHash: "a".repeat(64),
      },
      startTime: Timestamp.fromMillis(1_000_000),
      bookedCount: 0, checkedInCount: 0, waitlistedCount: 0, status: "active",
      cancelledAt: null, cancellationReason: null, genderCounts: {},
      cohortCounts: {}, waitlistedCohortCounts: {}};
    h.store.records.set("events/event", {...event, status: "cancelled"});
    await assert.rejects(h.reserve(), {code: "failed-precondition"});
    assert.equal([...h.store.records.keys()].some((key) =>
      key.startsWith("organizerFormPayments/")), false);
    h.store.records.set("events/event", event);
    const {paymentId} = await h.reserve();
    h.store.records.set("events/event", {...event, status: "cancelled"});
    h.capture(paymentId);
    assert.equal(await h.finalize(paymentId), "refundPending");
    assert.equal(await h.finalize(paymentId), "refundPending");
    assert.equal(h.store.records.get(`organizerFormPayments/${paymentId}`)
      ?.lastErrorCode, "formEventUnavailable");
    assert.equal(h.store.records.get("organizerForms/form")
      ?.submittedResponseCount, 0);
    assert.equal([...h.store.records.keys()].some((key) =>
      key.startsWith("organizerFormResponses/")), false);
  });

test("completed paid response replay stays submitted after event cancellation",
  async () => {
    const h = harness();
    h.version.definition.defaultTargetKind = "event";
    h.version.definition.defaultTargetId = "event";
    h.store.records.set("events/event", {organizerId: "org",
      name: "Private event", publicationState: "private",
      setupRevision: 1, publicRegistrationEnabled: false,
      eventCityId: "city1", eventMarketId: "market1",
      eventLocalDate: "2026-10-02", eventLocalStartTime: "18:00",
      eventTimezone: "Asia/Kolkata", setupDefaults: {
        city: {value: {cityId: "city1", marketId: "market1"}, source: "event"},
        timezone: {value: "Asia/Kolkata", source: "event"},
        organizerDefaultsRevision: null, organizerDefaultsHash: "a".repeat(64),
      },
      startTime: Timestamp.fromMillis(1_000_000), bookedCount: 0,
      checkedInCount: 0, waitlistedCount: 0, status: "active",
      cancelledAt: null,
      cancellationReason: null, genderCounts: {}, cohortCounts: {},
      waitlistedCohortCounts: {}});
    const {paymentId} = await h.reserve();
    h.capture(paymentId);
    assert.equal(await h.finalize(paymentId), "submitted");
    h.store.records.delete("events/event");
    const before = JSON.stringify([...h.store.records]);
    assert.equal(await h.finalize(paymentId), "submitted");
    assert.equal(JSON.stringify([...h.store.records]), before);
  });
