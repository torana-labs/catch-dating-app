import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "./organizerAudienceTestStore";
import {createFormPaymentFixture} from
  "../payments/formPayments/formPaymentTestStore";
import {getPublicOrganizerFormHandler, beginOrganizerFormResponseHandler,
  saveOrganizerFormResponseDraftHandler, submitOrganizerFormResponseHandler}
  from "./organizerFormResponses";

const now = Timestamp.fromMillis(1000);
function fixture() {
  const base = createFormPaymentFixture();
  delete base.version.definition.payment;
  base.version.definition.defaultTargetKind = "event";
  base.version.definition.defaultTargetId = "event";
  const store = new AudienceTestStore(Object.fromEntries(base.store.records));
  store.docs["events/event"] = {
    organizerId: "org", name: "Private event", publicationState: "private",
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
    cohortCounts: {}, waitlistedCohortCounts: {},
  };
  const deps = {firestore: () => store.asFirestore(), timestamp: () => now,
    checkRateLimit: async () => undefined, storageBucket: () => {
      throw new Error("No external storage in fixture");
    }};
  const request = (data: object) => ({...base.request, data});
  const publicData = {publicFormId: base.draft.publicFormId, sourceToken: null};
  const open = () => getPublicOrganizerFormHandler(request(publicData), deps);
  const begin = () => beginOrganizerFormResponseHandler(request({
    ...publicData, requestId: "begin-event-form-response"}), deps);
  const save = () => saveOrganizerFormResponseDraftHandler(request({
    draftId: "draft", draftToken: null, expectedRevision: 1,
    answers: {name: "Sara Demo"}, consentAccepted: true}), deps);
  const submit = () => submitOrganizerFormResponseHandler(base.request, deps);
  return {base, store, open, begin, save, submit};
}

test("public fixed-event forms close without disclosing unavailable targets",
  async () => {
    for (const change of [null, {organizerId: "foreign"}, {status: "cancelled"},
      {startTime: now}, {startTime: Timestamp.fromMillis(1)},
      {publicationState: "invalid"}]) {
      const h = fixture();
      assert.equal((await h.open()).availabilityStatus, "active");
      if (change === null) delete h.store.docs["events/event"];
      else Object.assign(h.store.docs["events/event"], change);
      const projection = await h.open();
      assert.equal(projection.availabilityStatus, "closed");
      assert.equal(projection.availabilityMessage,
        "This form is not accepting responses right now.");
      await assert.rejects(h.begin(), {code: "failed-precondition"});
      await assert.rejects(h.save());
      await assert.rejects(h.submit());
      assert.equal(Object.keys(h.store.docs).some((path) =>
        path.startsWith("organizerFormResponses/")), false);
      assert.equal(h.store.docs["organizerForms/form"]
        .submittedResponseCount, 0);
    }
  });

test("event cancellation after public resolution rejects the begin write",
  async () => {
    const h = fixture();
    const transaction = h.store.runTransaction.bind(h.store);
    h.store.runTransaction = async (body) => {
      h.store.docs["events/event"].status = "cancelled";
      return transaction(body);
    };
    await assert.rejects(h.begin(), {code: "failed-precondition"});
    assert.equal(Object.keys(h.store.docs).filter((path) =>
      path.startsWith("organizerFormResponseDrafts/")).length, 1);
  });

test("completed response replay survives cancellation without duplicate writes",
  async () => {
    const h = fixture();
    const first = await h.submit();
    h.store.docs["events/event"].status = "cancelled";
    const before = JSON.stringify(h.store.docs);
    assert.deepEqual(await h.submit(), first);
    assert.equal(JSON.stringify(h.store.docs), before);
    assert.equal(h.store.docs["organizerForms/form"].submittedResponseCount, 1);
  });

test("immutable version target wins over an edited reusable form draft",
  async () => {
    const h = fixture();
    h.store.docs["organizerForms/form"].defaultTargetKind = "organizer";
    h.store.docs["organizerForms/form"].defaultTargetId = null;
    h.store.docs["events/event"].status = "cancelled";
    assert.equal((await h.open()).availabilityStatus, "closed");
    await assert.rejects(h.submit(), {code: "failed-precondition"});
  });

test("reusable intake remains open without an event and submits normally",
  async () => {
    const h = fixture();
    h.base.version.definition.defaultTargetKind = "organizer";
    h.base.version.definition.defaultTargetId = null;
    delete h.store.docs["events/event"];
    assert.equal((await h.open()).availabilityStatus, "active");
    await h.submit();
    assert.equal(h.store.docs["organizerForms/form"].submittedResponseCount, 1);
  });
