import assert from "node:assert/strict";
import test from "node:test";
import {CallableRequest, HttpsError} from "firebase-functions/v2/https";
import {
  commitEventOffersHandler, getEventOfferHandler, listEventOffersHandler,
  mutateEventOfferHandler, OfferCallableDependencies,
  previewEventOffersHandler, prepareEventOfferHandoffHandler,
  getEventOfferConfigurationHandler, configureEventOfferPreferencesHandler,
  previewEventOfferPreferencesHandler,
} from "./callables";
import {applyEventOfferAction, EventOffer} from "./eventOfferDomain";
import type {OfferTransaction} from "./eventOfferService";

const request = (data: unknown, uid = "host1") => ({data,
  ...(uid ? {auth: {uid, token: {}}} : {})}) as CallableRequest<unknown>;
const code = (value: string) => (error: unknown) =>
  error instanceof HttpsError && error.code === value;
const now = 1_800_000_000_000;
const scope = {organizerId: "org1", eventId: "event1", contactId: "contact1"};

function offer(): EventOffer {
  const terms = {expiresAtMillis: now + 10000, organizerPaymentLink: null};
  return applyEventOfferAction({current: null, nowMillis: now,
    action: {kind: "createDraft", requestId: "request-1",
      expectedRevision: 0, terms}, context: {...scope,
      applicationId: "application1", sourceKind: "application",
      applicationTargetKind: "organizer", applicationTargetId: null,
      actorUid: "host1", actorAuthorized: true, applicationApproved: true,
      sourceCurrent: true, contactCurrent: true, eventCurrent: true,
      eventStartsAtMillis: now + 100000,
      currentPaymentHash: "a".repeat(64), currentPaymentRevision: 1,
      paymentSnapshot: {eventPaymentHash: "a".repeat(64),
        eventPaymentRevision: 1, expectedAmountMinor: 0, currency: "INR",
        collectionMode: null, personalPaymentLink: null,
        expiresAtMillis: terms.expiresAtMillis, reusablePaymentPageUrl: null,
        paymentInstructions: null, messageTemplate: null},
    }}).offer;
}

function fixture() {
  const actions: string[] = [];
  let authorized = true;
  let saved = offer();
  const deps: OfferCallableDependencies = {
    firestore: () => ({}) as FirebaseFirestore.Firestore,
    checkRateLimit: async (_db, uid, action) => {
      assert.equal(uid, "host1");
      actions.push(action);
    },
    repository: () => ({transaction: async (run) => run({
      nowMillis: () => now,
      managerAuthorized: async (organizerId: string, actorUid: string) => {
        assert.equal(organizerId, "org1");
        assert.equal(actorUid, "host1");
        return authorized;
      },
      event: async () => ({organizerId: "org1", eventId: "event1",
        startsAtMillis: now + 100000, cancelled: false, sourceRevision: 1}),
      eventPaymentTerms: async () => null,
      eventPreferences: async () => null,
      offer: async () => saved,
      listOffers: async () => [saved],
    } as unknown as OfferTransaction)}),
  };
  return {deps, actions,
    setAuthorized: (value: boolean) => authorized = value,
    setOffer: (value: EventOffer) => saved = value};
}

test("all offer endpoints require auth and exact input before database access",
  async () => {
    const h = fixture();
    h.deps.firestore = () => {
      throw new Error("Unexpected database access");
    };
    for (const handler of [previewEventOffersHandler, commitEventOffersHandler,
      mutateEventOfferHandler, getEventOfferHandler, listEventOffersHandler,
      prepareEventOfferHandoffHandler, getEventOfferConfigurationHandler,
      configureEventOfferPreferencesHandler,
      previewEventOfferPreferencesHandler]) {
      await assert.rejects(handler(request({}, ""), h.deps),
        code("unauthenticated"));
      await assert.rejects(handler(request({actorAuthorized: true}), h.deps),
        code("invalid-argument"));
    }
    assert.equal(h.actions.length, 0);
  });

test("server-owned payload flags are rejected before any access", async () => {
  const h = fixture();
  await assert.rejects(getEventOfferHandler(request({...scope,
    integrationReady: true}), h.deps), code("invalid-argument"));
  assert.equal(h.actions.length, 0);
});

test("authorized reads validate complete server outputs", async () => {
  const h = fixture();
  const detail = await getEventOfferHandler(request(scope), h.deps);
  assert.equal(detail.offer.paymentSnapshot.expectedAmountMinor, 0);
  assert.equal(detail.effectiveStatus, "draft");
  const page = await listEventOffersHandler(request({organizerId: "org1",
    eventId: "event1", limit: 1}), h.deps);
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].contactId, "contact1");
  assert.equal(page.nextCursor, null);
  assert.deepEqual(h.actions, ["getEventOffer", "listEventOffers"]);
  h.setOffer({...offer(), privateSecret: "never"} as EventOffer);
  await assert.rejects(getEventOfferHandler(request(scope), h.deps),
    code("internal"));
});

test("manager denial maps to a normalized permission error", async () => {
  const h = fixture();
  h.setAuthorized(false);
  await assert.rejects(getEventOfferHandler(request(scope), h.deps),
    code("permission-denied"));
  await assert.rejects(listEventOffersHandler(request({organizerId: "org1",
    eventId: "event1"}), h.deps), code("permission-denied"));
});

test("manual evidence commands cannot inject amount or provider-paid state",
  async () => {
    const h = fixture();
    const row = {...scope, applicationId: "application1",
      sourceKind: "application"};
    const action = {kind: "reconcileEvidence", requestId: "reference-1",
      expectedRevision: 2, expectedGeneration: 1,
      decision: "hostAttestedReceived", reviewNote: "Bank statement checked",
      bankReceiptChecked: true};
    for (const patch of [{providerPaid: true}, {attestedAmountMinor: 1},
      {decision: "paid"}]) {
      await assert.rejects(mutateEventOfferHandler(request({row,
        action: {...action, ...patch}}), h.deps), code("invalid-argument"));
    }
    assert.equal(h.actions.length, 0);
  });

test("handoff rejects stale review before loading recipient data", async () => {
  const h = fixture();
  await assert.rejects(prepareEventOfferHandoffHandler(request({...scope,
    expectedOfferRevision: 99, expectedGeneration: 1}), h.deps),
  code("failed-precondition"));
  assert.deepEqual(h.actions, ["prepareEventOfferHandoff"]);
  h.setAuthorized(false);
  await assert.rejects(prepareEventOfferHandoffHandler(request({...scope,
    expectedOfferRevision: 1, expectedGeneration: 1}), h.deps),
  code("permission-denied"));
});

test("configuration reports missing private terms", async () => {
  const h = fixture();
  const result = await getEventOfferConfigurationHandler(request({
    organizerId: "org1", eventId: "event1"}), h.deps);
  assert.equal(result.paymentTerms, null);
  assert.equal(result.suggestedExpiresAtMillis, null);
  assert.equal(result.nowMillis, now);
  assert.deepEqual(h.actions, ["getEventOfferConfiguration"]);
});

test("event preference payload cannot carry server-owned fields", async () => {
  const h = fixture();
  h.deps.firestore = () => {
    throw new Error("Unexpected database access");
  };
  const intents = Object.fromEntries(["usualDurationMinutes",
    "preferredVenueId", "offerValidityMinutes", "admissionPreset",
    "collectionPreference", "currency", "offerMessageTemplate",
    "paymentInstructions", "reusablePaymentPage", "expectedAmountMinor"]
    .map((key) => [key, {mode: "clear"}]));
  const data = {organizerId: "org1", eventId: "event1",
    requestId: "settings-1", expectedPreferencesRevision: 0,
    expectedEventSourceRevision: 1, reviewedDefaultsHash: "a".repeat(64),
    intents};
  await assert.rejects(configureEventOfferPreferencesHandler(
    request({...data, configurationReady: true}), h.deps),
  code("invalid-argument"));
  assert.deepEqual(h.actions, []);
});
