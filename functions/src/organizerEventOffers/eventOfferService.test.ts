import assert from "node:assert/strict";
import type {EventPaymentTerms} from
  "../events/eventSetupPreferences/types";
import test from "node:test";
import {
  EventOffer, eventOfferId, OfferActionReceipt, OfferDomainError,
} from "./eventOfferDomain";
import {
  commitEventOffers, mutateEventOffer, OfferApplication, OfferAuditEntry,
  OfferBatchInput, OfferBatchReceipt, OfferContact, OfferEvent, OfferOrigin,
  OfferRepository, OfferSourceState, OfferTransaction, previewEventOffers,
  getEventOffer, listEventOffers,
  prepareEventOfferHandoff, getEventOfferConfiguration,
} from "./eventOfferService";
import {parseStoredEventOffer} from "./eventOfferFirestoreRepository";
import {BRAND} from "../shared/generated/brand";

const now = 1_800_000_000_000;
const actor = {uid: "manager-one"};
const row = {organizerId: "organizer-one", eventId: "saturday",
  applicationId: "application-one", contactId: "contact-one",
  expiresAtMillis: now + 600_000, organizerPaymentLink: null};
const input: OfferBatchInput = {organizerId: row.organizerId,
  eventId: row.eventId, mode: "offer", rows: [row]};

type State = {
  managers: Set<string>;
  applications: Map<string, OfferApplication>;
  sources: Map<string, OfferSourceState>;
  contacts: Map<string, OfferContact>;
  origins: Map<string, OfferOrigin>;
  events: Map<string, OfferEvent>;
  paymentTerms: Map<string, EventPaymentTerms>;
  offers: Map<string, EventOffer>;
  receipts: Map<string, OfferActionReceipt>;
  batches: Map<string, OfferBatchReceipt>;
  audit: OfferAuditEntry[];
};

function copy(state: State): State {
  return {managers: new Set(state.managers),
    applications: new Map(state.applications),
    sources: new Map(state.sources), contacts: new Map(state.contacts),
    origins: new Map(state.origins), events: new Map(state.events),
    paymentTerms: new Map(state.paymentTerms),
    offers: new Map(state.offers), receipts: new Map(state.receipts),
    batches: new Map(state.batches), audit: [...state.audit]};
}

class AtomicStore implements OfferRepository {
  state: State;
  clockMillis = now;
  handoffPermission: "available" | "optedOut" | "unavailable" =
    "available";
  private queue: Promise<void> = Promise.resolve();

  constructor() {
    this.state = {managers: new Set(["organizer-one|manager-one"]),
      applications: new Map([[row.applicationId, {
        sourceKind: "application",
        organizerId: row.organizerId, applicationId: row.applicationId,
        contactId: row.contactId, latestResponseId: "response-one",
        reviewStatus: "approved", revision: 1, targetKind: "event",
        targetId: row.eventId,
      }]]),
      sources: new Map([[row.applicationId, "submittedFormResponse"]]),
      contacts: new Map([[row.contactId, {organizerId: row.organizerId,
        contactId: row.contactId, deleted: false, hidden: false,
        mergedIntoContactId: null, revision: 1}]]),
      origins: new Map([[row.applicationId, {organizerId: row.organizerId,
        sourceResponseId: "response-one", currentContactId: row.contactId,
        originContactId: row.contactId}]]),
      events: new Map([[row.eventId, {organizerId: row.organizerId,
        eventId: row.eventId, startsAtMillis: now + 3_600_000,
        cancelled: false, sourceRevision: now}]]),
      paymentTerms: new Map([[row.eventId, {revision: 1,
        preferredCollection: null, reusablePaymentPage: null,
        paymentInstructions: null, expectedAmountMinor: 0,
        currency: "INR", offerValidityMinutes: 30,
        offerMessageTemplate: null, sourceDefaultsRevision: 1,
        sourceDefaultsHash: "a".repeat(64), fieldSources: {}}]]),
      offers: new Map(),
      receipts: new Map(),
      batches: new Map(), audit: []};
  }

  async transaction<T>(callback: (tx: OfferTransaction) => Promise<T>):
    Promise<T> {
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    const next = copy(this.state);
    let applicationWasRead = false;
    const tx: OfferTransaction = {
      nowMillis: () => this.clockMillis,
      managerAuthorized: async (organizerId, uid) =>
        next.managers.has(`${organizerId}|${uid}`),
      application: async (id, sourceKind) => {
        await Promise.resolve();
        applicationWasRead = true;
        const found = next.applications.get(id);
        return found?.sourceKind === sourceKind ? found : null;
      },
      sourceState: async (id) => {
        assert.equal(applicationWasRead, true,
          "source resolution follows the delayed application read");
        return next.sources.get(id) ?? "revokedParticipantGrant";
      },
      contact: async (id) => next.contacts.get(id) ?? null,
      origin: async (id) => next.origins.get(id) ?? null,
      event: async (id) => next.events.get(id) ?? null,
      eventPaymentTerms: async (id) => next.paymentTerms.get(id) ?? null,
      eventPreferences: async (id) => {
        const paymentTerms = next.paymentTerms.get(id);
        return paymentTerms ? {revision: paymentTerms.revision,
          preferences: {} as import("../events/eventSetupPreferences/types")
            .ResolvedEventPreferences, paymentTerms} : null;
      },
      handoffPresentation: async (offer) => ({
        event: {eventId: offer.eventId, title: "Saturday Social",
          startsAtMillis: now + 3_600_000,
          timeZone: "Asia/Kolkata", lifecycle:
            next.events.get(offer.eventId)?.cancelled ?
              "canceled" as const : "current" as const},
        recipient: {contactId: offer.contactId,
          displayName: "Asha", phoneE164: "+919876543210",
          whatsappPermission: this.handoffPermission,
          sourceCurrent: true,
          contactCurrent: !next.contacts.get(offer.contactId)?.deleted},
      }),
      offer: async (id) => next.offers.get(id) ?? null,
      actionReceipt: async (id, requestId) =>
        next.receipts.get(`${id}|${requestId}`) ?? null,
      batchReceipt: async (id, requestId) =>
        next.batches.get(`${id}|${requestId}`) ?? null,
      listOffers: async (organizerId, eventId, cursor, limit) =>
        [...next.offers.values()].filter((offer) =>
          offer.organizerId === organizerId && offer.eventId === eventId &&
          (!cursor || offer.offerId > cursor))
          .sort((a, b) => a.offerId.localeCompare(b.offerId))
          .slice(0, limit),
      hasMergedContactOffer: async (organizerId, eventId,
        canonicalContactId) =>
        [...next.origins.values()].some((origin) =>
          origin.organizerId === organizerId &&
          origin.currentContactId === canonicalContactId &&
          origin.originContactId !== canonicalContactId &&
          next.offers.has(eventOfferId({organizerId, eventId,
            contactId: origin.originContactId}))),
      putOffer: (offer) => {
        next.offers.set(offer.offerId, offer);
      },
      createActionReceipt: (receipt) => {
        const key = `${receipt.offerId}|${receipt.requestId}`;
        assert.equal(next.receipts.has(key), false);
        next.receipts.set(key, receipt);
      },
      createBatchReceipt: (receipt) => {
        const key = `${receipt.organizerId}|${receipt.requestId}`;
        assert.equal(next.batches.has(key), false);
        next.batches.set(key, receipt);
      },
      appendAudit: (entry) => {
        next.audit.push(entry);
      },
    };
    try {
      const result = await callback(tx);
      this.state = next;
      return result;
    } finally {
      release();
    }
  }
}

function assertCode(error: unknown, code: OfferDomainError["code"]):
  boolean {
  return error instanceof OfferDomainError && error.code === code;
}

test("bulk preview and commit create only chosen event offers", async () => {
  const store = new AtomicStore();
  const preview = await previewEventOffers({repository: store,
    actor, input});
  assert.equal(store.state.offers.size, 0);
  const receipt = await commitEventOffers({repository: store, actor,
    input: {...input, requestId: "batch-request-one",
      planDigest: preview.planDigest}});
  assert.equal(receipt.results.length, 1);
  assert.equal(store.state.offers.size, 1);
  assert.equal([...store.state.offers.values()][0].status, "offered");
  assert.equal(store.state.audit.length, 2);
  assert.equal(store.state.audit[0].kind, "createDraft");
  assert.equal(store.state.audit[1].kind, "offer");
  assert.equal("attendeeId" in receipt, false);
});

test("review digest and draft issuance fence changed event payment terms",
  async () => {
    const store = new AtomicStore();
    const preview = await previewEventOffers({repository: store,
      actor, input});
    const oldTerms = store.state.paymentTerms.get(row.eventId)!;
    store.state.paymentTerms.set(row.eventId, {...oldTerms, revision: 2,
      preferredCollection: "manualInstructions",
      paymentInstructions: "Pay by bank transfer", expectedAmountMinor: 1500});
    await assert.rejects(() => commitEventOffers({repository: store,
      actor, input: {...input, requestId: "stale-terms-batch",
        planDigest: preview.planDigest}}),
    (error) => assertCode(error, "conflict"));
    assert.equal(store.state.offers.size, 0);

    const draft = await mutateEventOffer({repository: store, actor, row,
      action: {kind: "createDraft", requestId: "terms-draft-create",
        expectedRevision: 0, terms: {expiresAtMillis: row.expiresAtMillis,
          organizerPaymentLink: null}}});
    assert.equal(draft.offer.paymentSnapshot.expectedAmountMinor, 1500);
    store.state.paymentTerms.set(row.eventId, {...oldTerms, revision: 3,
      preferredCollection: "manualInstructions",
      paymentInstructions: "Pay by bank transfer", expectedAmountMinor: 2000});
    await assert.rejects(() => mutateEventOffer({repository: store,
      actor, row, action: {kind: "offer", requestId: "terms-draft-offer",
        expectedRevision: draft.offer.revision,
        expectedGeneration: draft.offer.generation}}),
    (error) => assertCode(error, "conflict"));
    const refreshed = await mutateEventOffer({repository: store, actor,
      row, action: {kind: "reissueDraft",
        requestId: "terms-draft-refresh",
        expectedRevision: draft.offer.revision,
        expectedGeneration: draft.offer.generation,
        terms: {expiresAtMillis: row.expiresAtMillis,
          organizerPaymentLink: null}}});
    assert.equal(refreshed.offer.paymentSnapshot.eventPaymentRevision, 3);
    assert.equal(refreshed.offer.paymentSnapshot.expectedAmountMinor, 2000);
  });

test("handoff uses issued snapshot after terms change without writing",
  async () => {
    const store = new AtomicStore();
    const terms = store.state.paymentTerms.get(row.eventId)!;
    store.state.paymentTerms.set(row.eventId, {...terms,
      preferredCollection: "personalRequest", expectedAmountMinor: 1800});
    const personalRow = {...row,
      organizerPaymentLink: "https://pay.example.test/asha"};
    const issued = await mutateEventOffer({repository: store, actor,
      row: personalRow, action: {kind: "createDraft",
        requestId: "personal-draft", expectedRevision: 0,
        terms: {expiresAtMillis: row.expiresAtMillis,
          organizerPaymentLink: personalRow.organizerPaymentLink}}});
    const offered = await mutateEventOffer({repository: store, actor,
      row: personalRow, action: {kind: "offer",
        requestId: "personal-issued",
        expectedRevision: issued.offer.revision,
        expectedGeneration: issued.offer.generation}});
    store.state.paymentTerms.set(row.eventId, {...terms, revision: 2,
      preferredCollection: "manualInstructions",
      paymentInstructions: "New instructions", expectedAmountMinor: 5000});
    const before = store.state.audit.length;
    const result = await prepareEventOfferHandoff({repository: store,
      actor, organizerId: row.organizerId, eventId: row.eventId,
      contactId: row.contactId, expectedOfferRevision: offered.offer.revision,
      expectedGeneration: offered.offer.generation});
    assert.equal(result.kind, "prepared");
    if (result.kind === "prepared") {
      assert.match(result.editableText, /https:\/\/pay\.example\.test\/asha/u);
      assert.equal(result.editableText.includes("New instructions"), false);
      assert.equal(new URL(result.whatsappUrl).searchParams.get("text"),
        result.copyText);
    }
    store.state.paymentTerms.delete(row.eventId);
    const historical = await prepareEventOfferHandoff({repository: store,
      actor, organizerId: row.organizerId, eventId: row.eventId,
      contactId: row.contactId, expectedOfferRevision: offered.offer.revision,
      expectedGeneration: offered.offer.generation});
    assert.equal(historical.kind, "prepared");
    assert.equal(store.state.audit.length, before);
    assert.equal(store.state.offers.get(offered.offer.offerId)?.revision,
      offered.offer.revision);
  });

test("handoff rechecks manager, source, contact, event, offer and permission",
  async () => {
    const store = new AtomicStore();
    const preview = await previewEventOffers({repository: store,
      actor, input});
    await commitEventOffers({repository: store, actor,
      input: {...input, requestId: "handoff-offer-batch",
        planDigest: preview.planDigest}});
    const offer = [...store.state.offers.values()][0];
    const prepare = () => prepareEventOfferHandoff({repository: store,
      actor, organizerId: row.organizerId, eventId: row.eventId,
      contactId: row.contactId, expectedOfferRevision: offer.revision,
      expectedGeneration: offer.generation});
    store.handoffPermission = "optedOut";
    const optedOut = await prepare();
    assert.equal(optedOut.kind, "blocked");
    if (optedOut.kind === "blocked") {
      assert.ok(optedOut.blockers.includes("contactOptedOut"));
    }
    store.handoffPermission = "available";
    store.state.managers.clear();
    await assert.rejects(prepare, (error) => assertCode(error, "denied"));
    store.state.managers.add("organizer-one|manager-one");
    store.state.sources.set(row.applicationId, "revokedParticipantGrant");
    const revoked = await prepare();
    assert.equal(revoked.kind, "blocked");
    if (revoked.kind === "blocked") {
      assert.ok(revoked.blockers.includes("sourceRevoked"));
    }
    store.state.sources.set(row.applicationId, "submittedFormResponse");
    store.state.contacts.get(row.contactId)!.mergedIntoContactId =
      "survivor";
    await assert.rejects(prepare, (error) => assertCode(error, "denied"));
    store.state.contacts.get(row.contactId)!.mergedIntoContactId = null;
    store.state.events.get(row.eventId)!.cancelled = true;
    const canceled = await prepare();
    assert.equal(canceled.kind, "blocked");
    if (canceled.kind === "blocked") {
      assert.ok(canceled.blockers.includes("eventCanceled"));
    }
    store.state.events.get(row.eventId)!.cancelled = false;
    await assert.rejects(() => prepareEventOfferHandoff({repository: store,
      actor, organizerId: row.organizerId, eventId: row.eventId,
      contactId: "foreign-contact", expectedOfferRevision: offer.revision,
      expectedGeneration: offer.generation}),
    (error) => assertCode(error, "conflict"));
    store.clockMillis = row.expiresAtMillis;
    const expired = await prepare();
    assert.equal(expired.kind, "blocked");
    if (expired.kind === "blocked") {
      assert.ok(expired.blockers.includes("offerExpired"));
    }
    store.clockMillis = now;
    store.state.offers.set(offer.offerId, {...offer, status: "withdrawn"});
    const withdrawn = await prepare();
    assert.equal(withdrawn.kind, "blocked");
    if (withdrawn.kind === "blocked") {
      assert.ok(withdrawn.blockers.includes("offerWithdrawn"));
    }
    assert.equal(store.state.audit.length, 2);
  });

test("stored offer parser rejects missing lifecycle evidence", async () => {
  const store = new AtomicStore();
  const preview = await previewEventOffers({repository: store,
    actor, input});
  await commitEventOffers({repository: store, actor,
    input: {...input, requestId: "batch-parse-test",
      planDigest: preview.planDigest}});
  const offer = [...store.state.offers.values()][0];
  assert.equal(parseStoredEventOffer(offer, offer.offerId).revision, 2);
  assertCode(() => parseStoredEventOffer({...offer,
    offeredAtMillis: undefined}, offer.offerId), "conflict");
  assertCode(() => parseStoredEventOffer({...offer,
    manualPayment: {...offer.manualPayment,
      bankReceiptChecked: undefined}}, offer.offerId), "conflict");
  assertCode(() => parseStoredEventOffer({...offer,
    contactId: "another-contact"}, offer.offerId), "conflict");
  assertCode(() => parseStoredEventOffer({...offer,
    status: "draft"}, offer.offerId), "conflict");
  assertCode(() => parseStoredEventOffer({...offer,
    manualPayment: {...offer.manualPayment,
      status: "hostAttestedReceived", evidenceReference: "bank-reference",
      evidenceRecordedAtMillis: now, reviewedByUid: actor.uid,
      reviewedAtMillis: now + 1, reviewNote: "Checked statement",
      bankReceiptChecked: false}}, offer.offerId), "conflict");
});

test("manager event list shows payment and effective expiry separately",
  async () => {
    const store = new AtomicStore();
    const preview = await previewEventOffers({repository: store,
      actor, input});
    await commitEventOffers({repository: store, actor,
      input: {...input, requestId: "batch-list-one",
        planDigest: preview.planDigest}});
    store.clockMillis = row.expiresAtMillis + 1;
    const list = await listEventOffers({repository: store, actor,
      organizerId: row.organizerId, eventId: row.eventId});
    assert.equal(list.items.length, 1);
    assert.equal(list.items[0].status, "offered");
    assert.equal(list.items[0].effectiveStatus, "expired");
    assert.equal(list.items[0].paymentStatus, "none");
    assert.equal("evidenceReference" in list.items[0], false);
    await assert.rejects(() => listEventOffers({repository: store,
      actor: {uid: "outsider"}, organizerId: row.organizerId,
      eventId: row.eventId}),
    (error) => assertCode(error, "denied"));
  });

test("manager offer detail includes reference and rejects foreign access",
  async () => {
    const store = new AtomicStore();
    const preview = await previewEventOffers({repository: store,
      actor, input});
    await commitEventOffers({repository: store, actor,
      input: {...input, requestId: "batch-detail-one",
        planDigest: preview.planDigest}});
    const offered = [...store.state.offers.values()][0];
    await mutateEventOffer({repository: store, actor, row,
      action: {kind: "recordEvidence",
        requestId: "detail-evidence-one",
        expectedRevision: offered.revision,
        expectedGeneration: offered.generation,
        evidenceReference: "bank-reference-456"}});
    const detail = await getEventOffer({repository: store, actor,
      organizerId: row.organizerId, eventId: row.eventId,
      contactId: row.contactId});
    assert.equal(detail.offer.manualPayment.evidenceReference,
      "bank-reference-456");
    await assert.rejects(() => getEventOffer({repository: store,
      actor: {uid: "outsider"}, organizerId: row.organizerId,
      eventId: row.eventId, contactId: row.contactId}),
    (error) => assertCode(error, "denied"));
    await assert.rejects(() => getEventOffer({repository: store,
      actor, organizerId: row.organizerId,
      eventId: "another-event", contactId: row.contactId}),
    (error) => assertCode(error, "denied"));
  });

test("submitted registration with CRM origin needs no application approval",
  async () => {
    const store = new AtomicStore();
    const registration = {...row, sourceKind: "formResponse" as const,
      applicationId: "registration-response"};
    store.state.applications.set(registration.applicationId, {
      sourceKind: "formResponse", organizerId: row.organizerId,
      applicationId: registration.applicationId, contactId: null,
      latestResponseId: registration.applicationId,
      conversionContactId: row.contactId,
      conversionStatus: "completed",
      reviewStatus: "submitted", revision: 1,
      targetKind: "event", targetId: row.eventId});
    store.state.sources.set(registration.applicationId,
      "submittedFormResponse");
    store.state.origins.set(registration.applicationId, {
      organizerId: row.organizerId,
      sourceResponseId: registration.applicationId,
      currentContactId: row.contactId,
      originContactId: row.contactId});
    const batch = {...input, rows: [registration]};
    const preview = await previewEventOffers({repository: store,
      actor, input: batch});
    const result = await commitEventOffers({repository: store, actor,
      input: {...batch, requestId: "registration-offer-batch",
        planDigest: preview.planDigest}});
    assert.equal(result.results.length, 1);
    assert.equal([...store.state.offers.values()][0].sourceKind,
      "formResponse");
  });

test("registration offer rejects absent, pending or wrong CRM conversion",
  async () => {
    for (const conversion of [
      {conversionStatus: null, conversionContactId: null},
      {conversionStatus: "pending" as const,
        conversionContactId: row.contactId},
      {conversionStatus: "completed" as const,
        conversionContactId: "another-contact"},
    ]) {
      const store = new AtomicStore();
      const registration = {...row, sourceKind: "formResponse" as const,
        applicationId: "registration-response"};
      store.state.applications.set(registration.applicationId, {
        sourceKind: "formResponse", organizerId: row.organizerId,
        applicationId: registration.applicationId, contactId: null,
        latestResponseId: registration.applicationId,
        reviewStatus: "submitted", revision: 1,
        targetKind: "event", targetId: row.eventId, ...conversion});
      store.state.sources.set(registration.applicationId,
        "submittedFormResponse");
      store.state.origins.set(registration.applicationId, {
        organizerId: row.organizerId,
        sourceResponseId: registration.applicationId,
        currentContactId: row.contactId,
        originContactId: row.contactId});
      await assert.rejects(() => previewEventOffers({repository: store,
        actor, input: {...input, rows: [registration]}}),
      (error) => assertCode(error, "denied"));
      assert.equal(store.state.offers.size, 0);
    }
  });

test("batch replay is idempotent and altered request conflicts", async () => {
  const store = new AtomicStore();
  const preview = await previewEventOffers({repository: store,
    actor, input});
  const command = {repository: store, actor,
    input: {...input, requestId: "batch-replay-one",
      planDigest: preview.planDigest}};
  const first = await commitEventOffers(command);
  const offered = [...store.state.offers.values()][0];
  await mutateEventOffer({repository: store, actor, row,
    action: {kind: "withdraw", requestId: "withdraw-after-batch",
      expectedRevision: offered.revision,
      expectedGeneration: offered.generation}});
  const replay = await commitEventOffers(command);
  assert.deepEqual(replay, first);
  assert.equal(store.state.audit.length, 3);
  assert.equal([...store.state.offers.values()][0].status, "withdrawn");
  await assert.rejects(() => commitEventOffers({...command,
    input: {...command.input, mode: "draft"}}),
  (error) => assertCode(error, "conflict"));
});

test("approval, target, contact and source are rechecked", async () => {
  const variations: Array<(store: AtomicStore) => void> = [
    (s) => {
 s.state.applications.get(row.applicationId)!
   .reviewStatus = "submitted";
    },
    (s) => {
 s.state.applications.get(row.applicationId)!
   .targetId = "sunday";
    },
    (s) => {
 s.state.origins.get(row.applicationId)!
   .currentContactId = "merged-contact";
    },
    (s) => {
      s.state.sources.set(row.applicationId,
        "revokedParticipantGrant");
    },
    (s) => {
 s.state.contacts.get(row.contactId)!
   .mergedIntoContactId = "merged-contact";
    },
    (s) => {
 s.state.events.get(row.eventId)!.cancelled = true;
    },
  ];
  for (const change of variations) {
    const store = new AtomicStore();
    change(store);
    await assert.rejects(() => previewEventOffers({repository: store,
      actor, input}), (error) =>
      assertCode(error, "denied") || assertCode(error, "conflict"));
    assert.equal(store.state.offers.size, 0);
  }
});

test("manager and tenant checks fail closed with no writes", async () => {
  const store = new AtomicStore();
  await assert.rejects(() => previewEventOffers({repository: store,
    actor: {uid: "outsider"}, input}),
  (error) => assertCode(error, "denied"));
  store.state.contacts.get(row.contactId)!.organizerId = "other-organizer";
  await assert.rejects(() => previewEventOffers({repository: store,
    actor, input}),
  (error) => assertCode(error, "denied"));
  assert.equal(store.state.audit.length, 0);
});

test("stale row rolls back the entire bulk commit", async () => {
  const store = new AtomicStore();
  const second = {...row, applicationId: "application-two",
    contactId: "contact-two"};
  store.state.applications.set(second.applicationId, {
    ...store.state.applications.get(row.applicationId)!,
    applicationId: second.applicationId, contactId: second.contactId,
    latestResponseId: "response-two"});
  store.state.sources.set(second.applicationId, "organizerImported");
  store.state.contacts.set(second.contactId, {
    ...store.state.contacts.get(row.contactId)!, contactId: second.contactId});
  store.state.origins.set(second.applicationId, {
    organizerId: row.organizerId, sourceResponseId: "response-two",
    currentContactId: second.contactId,
    originContactId: second.contactId});
  const batch = {...input, rows: [row, second]};
  const preview = await previewEventOffers({repository: store,
    actor, input: batch});
  store.state.sources.set(second.applicationId, "revokedParticipantGrant");
  await assert.rejects(() => commitEventOffers({repository: store,
    actor, input: {...batch, requestId: "batch-stale-one",
      planDigest: preview.planDigest}}),
  (error) => assertCode(error, "denied"));
  assert.equal(store.state.offers.size, 0);
  assert.equal(store.state.audit.length, 0);
});

test("preview digest fences a still-approved replacement source", async () => {
  const store = new AtomicStore();
  const preview = await previewEventOffers({repository: store,
    actor, input});
  const application = store.state.applications.get(row.applicationId)!;
  application.latestResponseId = "response-replaced";
  application.revision++;
  store.state.origins.get(row.applicationId)!.sourceResponseId =
    "response-replaced";
  await assert.rejects(() => commitEventOffers({repository: store,
    actor, input: {...input, requestId: "batch-stale-source",
      planDigest: preview.planDigest}}),
  (error) => assertCode(error, "conflict"));
  assert.equal(store.state.offers.size, 0);
});

test("canonical CRM merge cannot create a second event offer", async () => {
  const store = new AtomicStore();
  const preview = await previewEventOffers({repository: store,
    actor, input});
  await commitEventOffers({repository: store, actor,
    input: {...input, requestId: "batch-before-merge",
      planDigest: preview.planDigest}});
  store.state.contacts.get(row.contactId)!.mergedIntoContactId =
    "survivor-contact";
  store.state.contacts.set("survivor-contact", {
    ...store.state.contacts.get(row.contactId)!,
    contactId: "survivor-contact", mergedIntoContactId: null});
  store.state.origins.get(row.applicationId)!.currentContactId =
    "survivor-contact";
  const survivorRow = {...row, contactId: "survivor-contact"};
  await assert.rejects(() => previewEventOffers({repository: store,
    actor, input: {...input, rows: [survivorRow]}}),
  (error) => assertCode(error, "conflict"));
  await assert.rejects(() => mutateEventOffer({repository: store,
    actor, row: survivorRow, action: {kind: "createDraft",
      requestId: "single-after-merge", expectedRevision: 0,
      terms: {expiresAtMillis: row.expiresAtMillis,
        organizerPaymentLink: null}}}),
  (error) => assertCode(error, "conflict"));
  assert.equal(store.state.offers.size, 1);
});

test("exact action retry survives revoked source without resurrecting offer",
  async () => {
    const store = new AtomicStore();
    const action = {kind: "createDraft" as const,
      requestId: "single-replay-after-revoke", expectedRevision: 0,
      terms: {expiresAtMillis: row.expiresAtMillis,
        organizerPaymentLink: null}};
    const created = await mutateEventOffer({repository: store,
      actor, row, action});
    store.state.sources.set(row.applicationId,
      "revokedParticipantGrant");
    const replay = await mutateEventOffer({repository: store,
      actor, row, action});
    assert.equal(replay.replayed, true);
    assert.deepEqual(replay.receipt, created.receipt);
    assert.equal(store.state.audit.length, 1);
    await assert.rejects(() => mutateEventOffer({repository: store,
      actor, row, action: {...action, terms: {...action.terms,
        expiresAtMillis: row.expiresAtMillis + 1}}}),
    (error) => assertCode(error, "conflict"));
  });

test("parallel same-contact commits serialize to one offer", async () => {
  const store = new AtomicStore();
  const preview = await previewEventOffers({repository: store,
    actor, input});
  const results = await Promise.allSettled(["batch-racer-one",
    "batch-racer-two"].map((requestId) => commitEventOffers({
    repository: store, actor, input: {...input, requestId,
      planDigest: preview.planDigest}})));
  assert.equal(results.filter((result) => result.status === "fulfilled")
    .length, 1);
  assert.equal(results.filter((result) => result.status === "rejected")
    .length, 1);
  assert.equal(store.state.offers.size, 1);
  assert.equal(store.state.audit.length, 2);
});

test("transaction retry after expiry cannot issue from request-start time",
  async () => {
    const store = new AtomicStore();
    const preview = await previewEventOffers({repository: store,
      actor, input});
    const retrying: OfferRepository = {transaction: async (callback) => {
      await assert.rejects(() => store.transaction(async (tx) => {
        await callback(tx);
        throw new Error("retry transaction");
      }), /retry transaction/u);
      store.clockMillis = row.expiresAtMillis;
      return store.transaction(callback);
    }};
    await assert.rejects(() => commitEventOffers({repository: retrying,
      actor, input: {...input, requestId: "batch-retried-after-expiry",
        planDigest: preview.planDigest}}),
    (error) => assertCode(error, "invalid"));
    assert.equal(store.state.offers.size, 0);
    assert.equal(store.state.audit.length, 0);
  });

test("mutations append audited manual decisions without accepting evidence",
  async () => {
    const store = new AtomicStore();
    const preview = await previewEventOffers({repository: store,
      actor, input});
    await commitEventOffers({repository: store, actor,
      input: {...input, requestId: "batch-payment-one",
        planDigest: preview.planDigest}});
    const offered = [...store.state.offers.values()][0];
    const evidence = await mutateEventOffer({repository: store, actor,
      row, action: {kind: "recordEvidence",
        requestId: "evidence-request-one",
        expectedRevision: offered.revision,
        expectedGeneration: offered.generation,
        evidenceReference: "bank-reference-123"}});
    assert.equal(evidence.offer.manualPayment.status, "evidenceSubmitted");
    const reviewed = await mutateEventOffer({repository: store, actor,
      row, action: {kind: "reconcileEvidence",
        requestId: "review-request-one",
        expectedRevision: evidence.offer.revision,
        expectedGeneration: evidence.offer.generation,
        decision: "hostAttestedReceived", reviewNote: "Statement checked",
        bankReceiptChecked: true}});
    assert.equal(reviewed.offer.manualPayment.reviewedByUid, actor.uid);
    assert.equal(store.state.audit.at(-1)!.paymentStatus,
      "hostAttestedReceived");
    assert.equal("evidenceReference" in store.state.audit.at(-1)!, false);
    await assert.rejects(() => mutateEventOffer({repository: store,
      actor: {uid: "outsider"}, row,
      action: {kind: "withdraw", requestId: "outsider-withdraw",
        expectedRevision: reviewed.offer.revision,
        expectedGeneration: reviewed.offer.generation}}),
    (error) => assertCode(error, "denied"));
  });

test("closure and payment review survive CRM merge and source revocation",
  async () => {
    const store = new AtomicStore();
    const preview = await previewEventOffers({repository: store,
      actor, input});
    await commitEventOffers({repository: store, actor,
      input: {...input, requestId: "batch-close-after-merge",
        planDigest: preview.planDigest}});
    const offered = [...store.state.offers.values()][0];
    store.state.origins.get(row.applicationId)!.currentContactId =
      "merged-contact";
    store.state.contacts.get(row.contactId)!.mergedIntoContactId =
      "merged-contact";
    store.state.sources.set(row.applicationId,
      "revokedParticipantGrant");
    const evidence = await mutateEventOffer({repository: store, actor,
      row, action: {kind: "recordEvidence",
        requestId: "late-reference-after-merge",
        expectedRevision: offered.revision,
        expectedGeneration: offered.generation,
        evidenceReference: "bank-reference"}});
    const closed = await mutateEventOffer({repository: store, actor,
      row, action: {kind: "withdraw",
        requestId: "withdraw-after-merge",
        expectedRevision: evidence.offer.revision,
        expectedGeneration: evidence.offer.generation}});
    const reviewed = await mutateEventOffer({repository: store, actor,
      row, action: {kind: "reconcileEvidence",
        requestId: "review-after-merge",
        expectedRevision: closed.offer.revision,
        expectedGeneration: closed.offer.generation,
        decision: "rejected", reviewNote: "No matching bank credit",
        bankReceiptChecked: false}});
    assert.equal(reviewed.offer.status, "withdrawn");
    assert.equal(reviewed.offer.manualPayment.status, "rejected");
    assert.equal(store.state.audit.length, 5);
  });

test("late manual attestation uses historical terms, not current terms",
  async () => {
    const store = new AtomicStore();
    const prior = store.state.paymentTerms.get(row.eventId)!;
    store.state.paymentTerms.set(row.eventId, {...prior,
      preferredCollection: "manualInstructions",
      paymentInstructions: "Pay by bank transfer", expectedAmountMinor: 1200});
    const preview = await previewEventOffers({repository: store,
      actor, input});
    await commitEventOffers({repository: store, actor,
      input: {...input, requestId: "historical-offer-batch",
        planDigest: preview.planDigest}});
    const offer = [...store.state.offers.values()][0];
    store.state.paymentTerms.set(row.eventId, {...prior,
      revision: 2, expectedAmountMinor: 5000});
    store.clockMillis = row.expiresAtMillis + 1;
    const evidence = await mutateEventOffer({repository: store, actor,
      row, action: {kind: "recordEvidence",
        requestId: "historical-evidence", expectedRevision: offer.revision,
        expectedGeneration: offer.generation,
        evidenceReference: "bank-credit-1200"}});
    const reviewed = await mutateEventOffer({repository: store, actor,
      row, action: {kind: "reconcileEvidence",
        requestId: "historical-review",
        expectedRevision: evidence.offer.revision,
        expectedGeneration: evidence.offer.generation,
        decision: "hostAttestedReceived", reviewNote: "Statement checked",
        bankReceiptChecked: true}});
    assert.equal(reviewed.offer.paymentSnapshot.expectedAmountMinor, 1200);
    assert.equal(reviewed.offer.manualPayment.attestedAmountMinor, 1200);
    assert.equal(reviewed.offer.manualPayment.attestedCurrency, "INR");
    assert.equal(reviewed.offer.manualPayment.attestedEventPaymentRevision, 1);
    assert.equal(reviewed.offer.manualPayment.attestedEventPaymentHash,
      offer.paymentSnapshot.eventPaymentHash);
    assert.equal("admitted" in reviewed.offer, false);
    assert.equal("providerReceipt" in reviewed.offer.manualPayment, false);
  });

test("event configuration uses current terms and server expiry with no writes",
  async () => {
    const store = new AtomicStore();
    const read = () => getEventOfferConfiguration({repository: store, actor,
      organizerId: row.organizerId, eventId: row.eventId});
    const first = await read();
    assert.equal(first.paymentTerms?.revision, 1);
    assert.equal(first.preferencesRevision, 1);
    assert.equal(first.suggestedExpiresAtMillis, Math.min(
      first.nowMillis + first.paymentTerms!.offerValidityMinutes! * 60_000,
      first.startsAtMillis));
    store.state.paymentTerms.delete(row.eventId);
    const missing = await read();
    assert.equal(missing.paymentTerms, null);
    assert.equal(missing.preferences, null);
    assert.equal(missing.preferencesRevision, 0);
    assert.equal(missing.suggestedExpiresAtMillis, null);
    assert.equal(store.state.audit.length, 0);
    assert.equal(store.state.offers.size, 0);
    store.state.managers.clear();
    await assert.rejects(read, (error) => assertCode(error, "denied"));
  });

for (const free of [false, true]) {
  test(`communication checked before ${free ? "free" : "paid"} invitation`,
    async () => {
      const store = new AtomicStore();
      store.state.paymentTerms.set(row.eventId, {
        ...store.state.paymentTerms.get(row.eventId)!,
        preferredCollection: free ? null : "catchCheckout",
        expectedAmountMinor: free ? 0 : 1800,
        currency: "INR",
      });
      const preview = await previewEventOffers({
        repository: store, actor, input});
      await commitEventOffers({repository: store, actor,
        input: {...input, requestId: "automatic-handoff-offer",
          planDigest: preview.planDigest}});
      const offer = [...store.state.offers.values()][0];
      const calls: unknown[] = [];
      const prepare = () => prepareEventOfferHandoff({repository: store, actor,
        organizerId: row.organizerId, eventId: row.eventId,
        contactId: row.contactId, expectedOfferRevision: offer.revision,
        expectedGeneration: offer.generation,
        issueInvitation: async (scope) => {
          calls.push(scope);
          return `${BRAND.web.origin}/offer#${"a".repeat(43)}`;
        }});
      store.handoffPermission = "optedOut";
      assert.equal((await prepare()).kind, "blocked");
      assert.equal(calls.length, 0);
      store.handoffPermission = "available";
      const prepared = await prepare();
      assert.equal(prepared.kind, "prepared");
      assert.deepEqual(calls, [{organizerId: row.organizerId,
        eventId: row.eventId, offerId: offer.offerId,
        responseId: "response-one", actorUid: actor.uid,
        expectedOfferGeneration: offer.generation,
        expectedOfferRevision: offer.revision}]);
      if (prepared.kind === "prepared") {
        assert.ok(prepared.copyText.includes(`${BRAND.web.origin}/offer#`));
      }
    });
}
