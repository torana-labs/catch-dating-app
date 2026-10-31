import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {eventPaymentTermsFromPreferences} from
  "../events/eventSetupPreferences/resolve";
import type {ResolvedEventPreferences} from
  "../events/eventSetupPreferences/types";
import {formConversionReceiptId} from
  "../organizers/organizerFormAdmissionIdentity";
import {organizerContactOriginId} from
  "../shared/organizerContactOrigins";
import {organizerContactChannelStateId, hashEndpoint} from
  "../organizers/organizerCampaignModel";
import {whatsappStopId} from "../shared/organizerWhatsappStops";
import {FirestoreEventOfferRepository} from
  "./eventOfferFirestoreRepository";
import {commitEventOffers, prepareEventOfferHandoff,
  previewEventOffers, getEventOfferConfiguration} from "./eventOfferService";

const now = 1_800_000_000_000;
const organizerId = "organizer-one";
const eventId = "saturday";
const responseId = "registration-response";
const contactId = "crm-contact";
const actor = {uid: "manager-one"};
const row = {organizerId, eventId, contactId,
  applicationId: responseId, sourceKind: "formResponse" as const,
  expiresAtMillis: now + 600_000, organizerPaymentLink: null};
const input = {organizerId, eventId, mode: "offer" as const, rows: [row]};
const time = (millis: number) => ({toMillis: () => millis});
const cleared = {value: null, source: "cleared" as const};
const preferences: ResolvedEventPreferences = {
  defaultsRevision: 1, defaultsHash: "a".repeat(64),
  usualDurationMinutes: cleared, preferredVenueId: cleared,
  offerValidityMinutes: {value: 30, source: "event"},
  admissionPreset: cleared, collectionPreference: cleared,
  currency: {value: "INR", source: "event"},
  offerMessageTemplate: cleared, paymentInstructions: cleared,
  reusablePaymentPage: cleared,
  expectedAmountMinor: {value: 0, source: "event"},
};

function fixture(conversionStatus: "completed" | "pending" = "completed",
  resultId = contactId): AudienceTestStore {
  const originId = organizerContactOriginId({organizerId,
    sourceKind: "hostForm", sourceEntityKind: "hostFormResponse",
    sourceEntityId: responseId});
  const receiptId = formConversionReceiptId(responseId, "crmContact");
  return new AudienceTestStore({
    [`organizers/${organizerId}`]: {ownerUserId: actor.uid,
      hostUserId: null, hostUserIds: [], hostProfiles: []},
    [`organizerFormResponses/${responseId}`]: {organizerId,
      formId: "registration-form", versionId: "version-one",
      status: "submitted"},
    "organizerFormVersions/version-one": {organizerId,
      formId: "registration-form", version: 1,
      definition: {purpose: "registration", defaultTargetKind: "event",
        defaultTargetId: eventId}},
    [`organizerFormConversionReceipts/${receiptId}`]: {
      organizerId, formId: "registration-form", responseId,
      kind: "crmContact", status: conversionStatus, resultId},
    [`organizerContactOrigins/${originId}`]: {organizerId,
      sourceEntityId: responseId, sourceEntityKind: "hostFormResponse",
      currentContactId: contactId, originContactId: contactId},
    [`organizerContacts/${contactId}`]: {organizerId, revision: 1,
      deletedAt: null, hiddenAt: null, mergedIntoContactId: null},
    [`eventSetupPreferences/${eventId}`]: {organizerId, eventId,
      revision: 1, paymentTerms: eventPaymentTermsFromPreferences(
        preferences, 1), preferences},
    [`events/${eventId}`]: {organizerId, status: "active", startTime: time(
      now + 3_600_000)},
  }, {[`events/${eventId}`]: new Timestamp(1_800_000_000, 123_456_000)});
}

test("actual adapter maps reviewed registration and buffers all writes",
  async () => {
    const store = fixture();
    const repository = new FirestoreEventOfferRepository(
      store.asFirestore(), () => now);
    const preview = await previewEventOffers({repository, actor, input});
    assert.equal(preview.rows.length, 1);
    const receipt = await commitEventOffers({repository, actor,
      input: {...input, requestId: "registration-batch-one",
        planDigest: preview.planDigest}});
    assert.equal(receipt.results.length, 1);
    const stored = store.docs[
      `organizerEventOffers/${receipt.results[0].offerId}`];
    assert.equal(stored.status, "offered");
    assert.equal(Object.keys(store.docs).filter((path) =>
      path.startsWith("organizerEventOfferActionReceipts/")).length, 2);
    assert.equal(Object.keys(store.docs).filter((path) =>
      path.startsWith("organizerEventOfferAudits/")).length, 2);
    const replay = await commitEventOffers({repository, actor,
      input: {...input, requestId: "registration-batch-one",
        planDigest: preview.planDigest}});
    assert.deepEqual(replay, receipt);
  });

test("legacy snapshot update invalidates an already reviewed offer plan",
  async () => {
    const store = fixture();
    const repository = new FirestoreEventOfferRepository(
      store.asFirestore(), () => now);
    const first = await previewEventOffers({repository, actor, input});
    store.updateTimes[`events/${eventId}`] =
      new Timestamp(1_800_000_000, 123_457_000);
    await assert.rejects(() => commitEventOffers({repository, actor,
      input: {...input, requestId: "stale-legacy-offer",
        planDigest: first.planDigest}}));
    assert.equal(Object.keys(store.docs).filter((path) =>
      path.startsWith("organizerEventOffers/")).length, 0);
    const refreshed = await previewEventOffers({repository, actor, input});
    assert.notEqual(refreshed.planDigest, first.planDigest);
    const saved = await commitEventOffers({repository, actor,
      input: {...input, requestId: "fresh-legacy-offer",
        planDigest: refreshed.planDigest}});
    assert.equal(saved.results.length, 1);
  });

test("actual adapter requires completed matching CRM conversion receipt",
  async () => {
    for (const store of [fixture("pending"),
      fixture("completed", "another-contact")]) {
      const repository = new FirestoreEventOfferRepository(
        store.asFirestore(), () => now);
      await assert.rejects(() => previewEventOffers({repository,
        actor, input}));
      assert.equal(Object.keys(store.docs).filter((path) =>
        path.startsWith("organizerEventOffers/")).length, 0);
    }
    const missing = fixture();
    delete missing.docs[`organizerFormConversionReceipts/${
      formConversionReceiptId(responseId, "crmContact")}`];
    await assert.rejects(() => previewEventOffers({repository:
      new FirestoreEventOfferRepository(missing.asFirestore(), () => now),
    actor, input}));
  });

test("private payment projection rejects malformed or foreign snapshots",
  async () => {
    const missing = fixture();
    const path = `eventSetupPreferences/${eventId}`;
    missing.docs[path] = {...missing.docs[path], preferences: {}};
    await assert.rejects(() => previewEventOffers({repository:
      new FirestoreEventOfferRepository(missing.asFirestore(), () => now),
    actor, input}));
    const foreign = fixture();
    foreign.docs[`events/${eventId}`] = {...foreign.docs[`events/${eventId}`],
      organizerId: "another-organizer"};
    await assert.rejects(() => previewEventOffers({repository:
      new FirestoreEventOfferRepository(foreign.asFirestore(), () => now),
    actor, input}));
    const setupOnly = fixture();
    setupOnly.docs[`events/${eventId}`] = {
      ...setupOnly.docs[`events/${eventId}`], setupRevision: 3};
    const preview = await previewEventOffers({repository:
      new FirestoreEventOfferRepository(setupOnly.asFirestore(), () => now),
    actor, input});
    assert.equal(preview.rows.length, 1);
  });

test("app-free manual handoff respects opt-out, admin suppression and STOP",
  async () => {
    const store = fixture();
    store.docs[`organizerContacts/${contactId}`] = {
      ...store.docs[`organizerContacts/${contactId}`],
      identityState: "unlinked", displayName: "Asha",
      linkedUid: null, phoneE164: "+919876543210",
      whatsappStatus: "unknown"};
    store.docs[`events/${eventId}`] = {
      ...store.docs[`events/${eventId}`], name: "Saturday Social",
      eventTimezone: "Asia/Kolkata"};
    const repository = new FirestoreEventOfferRepository(
      store.asFirestore(), () => now);
    const preview = await previewEventOffers({repository, actor, input});
    const receipt = await commitEventOffers({repository, actor,
      input: {...input, requestId: "consent-handoff-batch",
        planDigest: preview.planDigest}});
    const request = {repository, actor, organizerId, eventId, contactId,
      expectedOfferRevision: receipt.results[0].revision,
      expectedGeneration: receipt.results[0].generation};
    const prepared = await prepareEventOfferHandoff(request);
    assert.equal(prepared.kind, "prepared");
    assert.equal("sent" in prepared, false);
    store.docs[`organizerContacts/${contactId}`].whatsappStatus = "optedOut";
    const optedOut = await prepareEventOfferHandoff(request);
    assert.equal(optedOut.kind, "blocked");
    if (optedOut.kind === "blocked") {
      assert.ok(optedOut.blockers.includes("contactOptedOut"));
    }
    store.docs[`organizerContacts/${contactId}`].whatsappStatus = "unknown";
    const channelId = organizerContactChannelStateId(organizerId,
      contactId);
    store.docs[`organizerContactChannelStates/${channelId}`] = {
      organizerId, contactId, adminSuppressed: true,
      suppressionStatus: "adminSuppressed"};
    const suppressed = await prepareEventOfferHandoff(request);
    assert.equal(suppressed.kind, "blocked");
    if (suppressed.kind === "blocked") {
      assert.ok(suppressed.blockers.includes("permissionUnavailable"));
    }
    delete store.docs[`organizerContactChannelStates/${channelId}`];
    const stopId = whatsappStopId(organizerId,
      hashEndpoint("+919876543210"));
    store.docs[`organizerWhatsappEndpointStops/${stopId}`] =
      {organizerId, endpointHash: hashEndpoint("+919876543210")};
    const stopped = await prepareEventOfferHandoff(request);
    assert.equal(stopped.kind, "blocked");
    if (stopped.kind === "blocked") {
      assert.ok(stopped.blockers.includes("permissionUnavailable"));
    }
  });

test("configuration reopens saved intent provenance without private metadata",
  async () => {
    const store = fixture();
    const repository = new FirestoreEventOfferRepository(
      store.asFirestore(), () => now);
    const result = await getEventOfferConfiguration({repository, actor,
      organizerId, eventId});
    assert.equal(result.preferencesRevision, 1);
    assert.deepEqual(result.preferences, preferences);
    assert.equal(result.paymentTerms?.expectedAmountMinor, 0);
    assert.equal("updatedByUid" in result, false);
    delete store.docs[`eventSetupPreferences/${eventId}`];
    const missing = await getEventOfferConfiguration({repository, actor,
      organizerId, eventId});
    assert.equal(missing.preferencesRevision, 0);
    assert.equal(missing.preferences, null);
    assert.equal(missing.paymentTerms, null);
  });
