import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {createFormPaymentFixture} from
  "../payments/formPayments/formPaymentTestStore";
import {formMessagingOffer, formMessagingTerms,
  normalizeFormMessagingDecision} from "./organizerFormMessagingConsent";
import {submitOrganizerFormResponseHandler} from "./organizerFormResponses";
import {promoteFormCommunicationIntentHandler} from
  "./organizerFormConsentPromotion";
import {organizerCommunicationPreferenceId,
  effectiveOrganizerWhatsappPurposeStatus,
  unknownOrganizerCommunicationChannel} from
  "../shared/organizerCommunicationPreferences";

const chosenAt = Timestamp.fromMillis(500);
const now = Timestamp.fromMillis(1000);

function fixture(organizerWhatsapp: boolean, catchWhatsapp: boolean) {
  const h = createFormPaymentFixture();
  h.version.definition.messagingConsent = {
    organizerWhatsapp: true, catchWhatsapp: true,
  };
  const decision = normalizeFormMessagingDecision({
    choices: {termsVersion: "form-whatsapp-v1", organizerWhatsapp,
      catchWhatsapp}, previous: undefined, definition: h.version.definition,
    phoneVerified: true, now: chosenAt,
  });
  h.store.records.set("organizerFormResponseDrafts/draft",
    {...h.draft, messagingDecision: decision});
  const records = (collection: string) => [...h.store.records.entries()]
    .filter(([path]) => path.startsWith(collection + "/"));
  return {...h, decision: decision!, records};
}

test("offer is server copy, opt-in is optional, and destinations are distinct",
  () => {
    const h = fixture(false, false);
    h.version.definition.messagingConsent!.catchWhatsapp = false;
    assert.deepEqual(formMessagingOffer(h.version.definition), {
      termsVersion: "form-whatsapp-v1",
      organizerWhatsapp: formMessagingTerms.organizerWhatsapp,
      catchWhatsapp: null,
    });
    assert.throws(() => normalizeFormMessagingDecision({
      choices: {termsVersion: "form-whatsapp-v1",
        organizerWhatsapp: false, catchWhatsapp: true},
      previous: undefined, definition: h.version.definition,
      phoneVerified: true, now,
    }), /not offered/u);
    assert.throws(() => normalizeFormMessagingDecision({
      choices: {termsVersion: "form-whatsapp-v1",
        organizerWhatsapp: true, catchWhatsapp: false},
      previous: undefined, definition: h.version.definition,
      phoneVerified: false, now,
    }), /Verify your phone/u);
  });

test("autosave and changing one scope do not refresh the other grant time",
  () => {
    const h = fixture(true, false);
    const same = normalizeFormMessagingDecision({
      choices: {termsVersion: "form-whatsapp-v1",
        organizerWhatsapp: true, catchWhatsapp: false},
      previous: h.decision, definition: h.version.definition,
      phoneVerified: true, now,
    });
    assert.equal(same, h.decision);
    const changed = normalizeFormMessagingDecision({
      choices: {termsVersion: "form-whatsapp-v1",
        organizerWhatsapp: true, catchWhatsapp: true},
      previous: h.decision, definition: h.version.definition,
      phoneVerified: true, now,
    })!;
    assert.equal(changed.organizerDecidedAt.toMillis(), chosenAt.toMillis());
    assert.equal(changed.catchDecidedAt.toMillis(), now.toMillis());
  });

test("payment and submission with unchecked choices grant neither scope",
  async () => {
    const h = fixture(false, false);
    const {paymentId} = await h.reserve();
    h.capture(paymentId);
    assert.equal(await h.finalize(paymentId), "submitted");
    assert.equal(
      h.records("organizerCommunicationPermissionReceipts").length, 0);
    assert.equal(h.records("catchCommunicationPermissionReceipts").length, 0);
  });

test("captured form creates independent immutable receipts exactly once",
  async () => {
    const h = fixture(true, true);
    const {paymentId} = await h.reserve();
    assert.equal(
      h.records("organizerCommunicationPermissionReceipts").length, 0);
    h.capture(paymentId);
    await Promise.all([h.finalize(paymentId), h.finalize(paymentId)]);
    const org = h.records("organizerCommunicationPermissionReceipts");
    const platform = h.records("catchCommunicationPermissionReceipts");
    assert.equal(org.length, 1);
    assert.equal(platform.length, 1);
    assert.notEqual(org[0][0], platform[0][0]);
    assert.notEqual(org[0][1].consentCopyHash, platform[0][1].consentCopyHash);
    assert.equal(org[0][1].organizerId, "org");
    assert.equal(platform[0][1].sourceOrganizerId, "org");
    assert.equal(platform[0][1].organizerId, undefined);
    assert.equal(org[0][1].uid, "person");
    assert.equal(org[0][1].sourceResponseId,
      h.records("organizerFormResponses")[0][0].split("/")[1]);
    assert.equal(h.records("users").length, 0);
  });

test("free submissions share the same consent transaction without a payment",
  async () => {
    const h = fixture(true, false);
    h.version.definition.payment = null;
    const result = await submitOrganizerFormResponseHandler(h.request, {
      firestore: () => h.db, timestamp: () => now,
      checkRateLimit: async () => undefined,
      storageBucket: () => {
        throw new Error("No storage needed");
      },
    });
    assert.equal(result.status, "submitted");
    assert.equal(
      h.records("organizerCommunicationPermissionReceipts").length, 1);
    assert.equal(h.records("catchCommunicationPermissionReceipts").length, 0);
    assert.equal(h.records("guestPayments").length, 0);
  });

test("delayed capture cannot overwrite a later organizer STOP or Catch opt-out",
  async () => {
    const h = fixture(true, true);
    const {paymentId} = await h.reserve();
    const withdrawal = {...unknownOrganizerCommunicationChannel(),
      status: "optedOut", evidenceStatus: "complete",
      currentReceiptId: "receipt_stop", termsVersion: null,
      source: "inboundStop", updatedAt: Timestamp.fromMillis(800)};
    const orgKey = "organizerCommunicationPreferences/" +
      organizerCommunicationPreferenceId("org", "person");
    const org = {organizerId: "org", uid: "person", whatsapp: withdrawal,
      sms: unknownOrganizerCommunicationChannel(), createdAt: chosenAt,
      updatedAt: withdrawal.updatedAt};
    const platform = {uid: "person", whatsapp: withdrawal,
      createdAt: chosenAt, updatedAt: withdrawal.updatedAt};
    h.store.records.set(orgKey, org);
    h.store.records.set("catchCommunicationPreferences/person", platform);
    h.capture(paymentId);
    await h.finalize(paymentId);
    assert.deepEqual(h.store.records.get(orgKey), org);
    assert.deepEqual(
      h.store.records.get("catchCommunicationPreferences/person"), platform);
    assert.equal(h.records("catchCommunicationPermissionReceipts").length, 0);
    assert.equal(
      h.records("organizerCommunicationPermissionReceipts").length, 0);
  });

test("consent mutation after checkout invalidates frozen submission",
  async () => {
    const h = fixture(true, false);
    const {paymentId} = await h.reserve();
    const draft = h.store.records.get("organizerFormResponseDrafts/draft")!;
    h.store.records.set("organizerFormResponseDrafts/draft", {...draft,
      messagingDecision: {...h.decision, catchWhatsapp: true}});
    h.capture(paymentId);
    assert.equal(await h.finalize(paymentId), "refundPending");
    assert.equal(h.records("organizerFormResponses").length, 0);
    assert.equal(h.records("catchCommunicationPermissionReceipts").length, 0);
  });

test("deleted participant cannot be re-subscribed by a delayed payment",
  async () => {
    const h = fixture(true, true);
    const {paymentId} = await h.reserve();
    h.store.records.set("deletedUsers/person", {status: "processing"});
    h.capture(paymentId);
    await h.finalize(paymentId);
    assert.equal(h.records("catchCommunicationPermissionReceipts").length, 0);
    assert.equal(
      h.records("organizerCommunicationPermissionReceipts").length, 0);
  });

test("v2 keeps unverified choices pending until same-source verified claim",
  async () => {
    const h = createFormPaymentFixture();
    h.version.definition.messagingConsent = {
      organizerWhatsapp: false, catchWhatsapp: false,
      organizerOperationsWhatsapp: true,
      organizerMarketingWhatsapp: true, catchMarketingWhatsapp: true,
    };
    const choices = {termsVersion: "form-whatsapp-v2" as const,
      organizerWhatsapp: false, catchWhatsapp: false,
      organizerOperationsWhatsapp: true,
      organizerMarketingWhatsapp: false, catchMarketingWhatsapp: true};
    const decision = normalizeFormMessagingDecision({
      choices, previous: undefined, definition: h.version.definition,
      phoneVerified: false, now: chosenAt,
    });
    assert.equal(decision?.organizerOperationsWhatsapp, true);
    h.store.records.set("organizerFormResponseDrafts/draft",
      {...h.draft, messagingDecision: decision});
    const {paymentId} = await h.reserve();
    h.capture(paymentId);
    assert.equal(await h.finalize(paymentId), "submitted");
    const responseId = [...h.store.records.keys()].find((path) =>
      path.startsWith("organizerFormResponses/"))!.split("/")[1];
    const pending = h.store.records.get(
      `formCommunicationConsentIntents/${responseId}`)!;
    assert.equal(pending.endpointE164, "+919000000001");
    assert.equal([...h.store.records.keys()].filter((path) =>
      path.includes("CommunicationPermissionReceipts/")).length, 0);
    const request = {data: {responseId, withdrawalToken: null,
      requestId: "promote-1"}, auth: {uid: "person",
      token: {phone_number: "+919000000001"}}};
    const callableRequest = request as never;
    const deps = {db: () => h.db, now: () => now,
      rateLimit: async () => undefined} as never;
    await assert.rejects(
      promoteFormCommunicationIntentHandler({
        ...request, auth: {uid: "person",
          token: {phone_number: "+919000000099"}},
      } as never, deps), /unavailable/u);
    await assert.rejects(
      promoteFormCommunicationIntentHandler({
        ...request, auth: {uid: "another",
          token: {phone_number: "+919000000001"}},
      } as never, deps), /unavailable/u);
    const validIntent = pending;
    h.store.records.set(`formCommunicationConsentIntents/${responseId}`,
      {...validIntent, decisions: (
        validIntent.decisions as Array<Record<string, unknown>>
      ).map((entry) => ({...entry, copyHash: "tampered"}))});
    await assert.rejects(
      promoteFormCommunicationIntentHandler(callableRequest, deps),
      /unavailable/u);
    h.store.records.set(`formCommunicationConsentIntents/${responseId}`,
      {...validIntent, createdAt: Timestamp.fromMillis(1100)});
    await assert.rejects(
      promoteFormCommunicationIntentHandler(callableRequest, deps),
      /unavailable/u);
    h.store.records.set(`formCommunicationConsentIntents/${responseId}`,
      validIntent);
    const promoted = await promoteFormCommunicationIntentHandler(
      callableRequest, deps);
    assert.deepEqual(promoted.promotedPurposes,
      ["organizer:eventOperations", "catch:marketing"]);
    assert.equal((await promoteFormCommunicationIntentHandler(
      callableRequest, deps))
      .replayed, true);
  });

test("purpose gate keeps operations out of marketing and honors STOP ordering",
  () => {
    const scoped = {status: "optedIn" as const,
      evidenceStatus: "complete" as const, currentReceiptId: "receipt-op",
      termsVersion: "reviewed-operations-v1",
      source: "hostFormResponse" as const, sourceEventId: null,
      sourceResponseId: "source-response",
      endpointE164: "+919000000001", updatedAt: Timestamp.fromMillis(900)};
    const stopped = {status: "optedOut" as const,
      evidenceStatus: "complete" as const, currentReceiptId: "stop",
      termsVersion: null, source: "inboundStop" as const,
      sourceEventId: null, updatedAt: Timestamp.fromMillis(800)};
    const preference = {organizerId: "org", uid: "person", whatsapp: stopped,
      whatsappPurposes: {eventOperations: scoped},
      sms: unknownOrganizerCommunicationChannel(),
      createdAt: chosenAt, updatedAt: now};
    assert.equal(effectiveOrganizerWhatsappPurposeStatus(preference,
      "marketing", "+919000000001"), "optedOut");
    assert.equal(effectiveOrganizerWhatsappPurposeStatus(preference,
      "eventOperations", "+919000000001", "other-response"), "unknown");
    assert.equal(effectiveOrganizerWhatsappPurposeStatus(preference,
      "eventOperations", "+919000000001", "source-response"), "optedIn");
    preference.whatsapp.updatedAt = Timestamp.fromMillis(1000);
    assert.equal(effectiveOrganizerWhatsappPurposeStatus(preference,
      "eventOperations", "+919000000001", "source-response"), "optedOut");
  });

test("pending v2 choice cannot revive a later sender STOP", async () => {
  const h = createFormPaymentFixture();
  h.version.definition.messagingConsent = {
    organizerWhatsapp: false, catchWhatsapp: false,
    organizerOperationsWhatsapp: true,
  };
  const decision = normalizeFormMessagingDecision({
    choices: {termsVersion: "form-whatsapp-v2",
      organizerWhatsapp: false, catchWhatsapp: false,
      organizerOperationsWhatsapp: true,
      organizerMarketingWhatsapp: false, catchMarketingWhatsapp: false},
    previous: undefined, definition: h.version.definition,
    phoneVerified: false, now: chosenAt,
  });
  h.store.records.set("organizerFormResponseDrafts/draft",
    {...h.draft, messagingDecision: decision});
  const {paymentId} = await h.reserve();
  h.capture(paymentId);
  assert.equal(await h.finalize(paymentId), "submitted");
  const responseId = [...h.store.records.keys()].find((path) =>
    path.startsWith("organizerFormResponses/"))!.split("/")[1];
  const stopped = {...unknownOrganizerCommunicationChannel(),
    status: "optedOut", evidenceStatus: "complete",
    currentReceiptId: "stop", source: "inboundStop",
    updatedAt: Timestamp.fromMillis(800)};
  const preferenceId = "organizerCommunicationPreferences/" +
    organizerCommunicationPreferenceId("org", "person");
  h.store.records.set(preferenceId, {organizerId: "org", uid: "person",
    whatsapp: stopped, sms: unknownOrganizerCommunicationChannel(),
    createdAt: chosenAt, updatedAt: stopped.updatedAt});
  const result = await promoteFormCommunicationIntentHandler({
    data: {responseId, withdrawalToken: null, requestId: "promote-stop"},
    auth: {uid: "person", token: {phone_number: "+919000000001"}},
  } as never, {db: () => h.db, now: () => now,
    rateLimit: async () => undefined} as never);
  assert.deepEqual(result.promotedPurposes, []);
  assert.equal([...h.store.records.keys()].filter((path) =>
    path.startsWith("organizerCommunicationPermissionReceipts/")).length, 0);
  assert.equal((h.store.records.get(preferenceId)!.whatsapp as
    {status: string}).status, "optedOut");
});

test("later v1 submission keeps scoped grant and withdrawal decisions",
  async () => {
    const h = fixture(true, true);
    const organizerId = "organizerCommunicationPreferences/" +
    organizerCommunicationPreferenceId("org", "person");
    const scoped = {status: "optedOut" as const,
      evidenceStatus: "complete" as const, currentReceiptId: "scoped-stop",
      termsVersion: null, source: "participantSettings" as const,
      sourceEventId: null,
      updatedAt: Timestamp.fromMillis(450)};
    h.store.records.set(organizerId, {organizerId: "org", uid: "person",
      whatsapp: unknownOrganizerCommunicationChannel(),
      whatsappPurposes: {marketing: scoped},
      sms: unknownOrganizerCommunicationChannel(),
      createdAt: chosenAt, updatedAt: chosenAt});
    h.store.records.set("catchCommunicationPreferences/person", {
      uid: "person", whatsapp: unknownOrganizerCommunicationChannel(),
      whatsappPurposes: {marketing: scoped},
      createdAt: chosenAt, updatedAt: chosenAt,
    });
    const {paymentId} = await h.reserve();
    h.capture(paymentId);
    assert.equal(await h.finalize(paymentId), "submitted");
    assert.deepEqual(h.store.records.get(organizerId)!.whatsappPurposes,
      {marketing: scoped});
    assert.deepEqual(h.store.records.get(
      "catchCommunicationPreferences/person")!.whatsappPurposes,
    {marketing: scoped});
    assert.equal(effectiveOrganizerWhatsappPurposeStatus(
    h.store.records.get(organizerId) as never,
    "marketing", "+919000000001"), "optedOut");
  });

test("only explicit newer registration marketing copy reverses scoped opt-out",
  () => {
    const scoped = {status: "optedOut" as const,
      evidenceStatus: "complete" as const, currentReceiptId: "stop",
      termsVersion: null, source: "participantSettings" as const,
      sourceEventId: null,
      updatedAt: Timestamp.fromMillis(800)};
    const broad = {status: "optedIn" as const,
      evidenceStatus: "complete" as const, currentReceiptId: "registration",
      termsVersion: "organizer-updates-v1",
      source: "publicEventRegistration" as const,
      sourceEventId: "event", updatedAt: Timestamp.fromMillis(900)};
    const preference = {organizerId: "org", uid: "person", whatsapp: broad,
      whatsappPurposes: {marketing: scoped},
      sms: unknownOrganizerCommunicationChannel(),
      createdAt: chosenAt, updatedAt: now};
    assert.equal(effectiveOrganizerWhatsappPurposeStatus(preference,
      "marketing", "+919000000001"), "optedIn");
    broad.source = "hostFormResponse" as never;
    assert.equal(effectiveOrganizerWhatsappPurposeStatus(preference,
      "marketing", "+919000000001"), "optedOut");
  });
