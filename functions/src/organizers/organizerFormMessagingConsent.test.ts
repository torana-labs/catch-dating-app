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
import {effectiveContactKeys, organizerWhatsappKeys,
  type ContactGrant, type ContactPermission} from
  "../shared/contactPermissions";
import {contractValidator} from "../shared/contractTestValidators";

const validReceipt = contractValidator("ContactPermissionReceiptDocument");
const validPermission = contractValidator("ContactPermissionDocument");
const organizerPath = "users/person/contactPermissions/organizer_org";
const catchPath = "users/person/contactPermissions/catch";

function withdrawal(millis: number): ContactGrant {
  return {status: "optedOut", endpointE164: null, receiptId: "receipt_stop",
    termsVersion: null, source: "inboundStop",
    updatedAt: Timestamp.fromMillis(millis)};
}

const receiptCount = (store: {records: Map<string, unknown>}) =>
  [...store.records.keys()].filter((path) =>
    path.startsWith("contactPermissionReceipts/")).length;

function stored(grants: ContactPermission["grants"],
  scope: "organizer" | "catch"): ContactPermission {
  return {senderKind: scope, senderId: scope === "catch" ? "catch" : "org",
    grants, granted: effectiveContactKeys(grants),
    updatedAt: Timestamp.fromMillis(800)};
}

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
    assert.equal(h.records("contactPermissionReceipts").length, 0);
    assert.equal(h.records("users").length, 0);
  });

test("captured form creates independent immutable receipts exactly once",
  async () => {
    const h = fixture(true, true);
    const {paymentId} = await h.reserve();
    assert.equal(h.records("contactPermissionReceipts").length, 0);
    h.capture(paymentId);
    await Promise.all([h.finalize(paymentId), h.finalize(paymentId)]);
    const receipts = h.records("contactPermissionReceipts");
    assert.equal(receipts.length, 2);
    const org = receipts.find(([, value]) => value.senderKind === "organizer")!;
    const platform = receipts.find(([, value]) =>
      value.senderKind === "catch")!;
    for (const [, receipt] of receipts) {
      assert.equal(validReceipt(receipt), true);
    }
    assert.notEqual(org[1].consentCopyHash, platform[1].consentCopyHash);
    assert.equal(org[1].senderId, "org");
    assert.equal(platform[1].senderId, "catch");
    assert.equal(platform[1].sourceOrganizerId, "org");
    assert.equal(org[1].uid, "person");
    assert.equal(org[1].sourceResponseId,
      h.records("organizerFormResponses")[0][0].split("/")[1]);
    // No profile is created; only the person's contact permissions are.
    assert.deepEqual(h.records("users").map(([path]) => path).sort(),
      [catchPath, organizerPath]);
    // The first form copy named no purpose: it is recorded as a marketing
    // answer the send gate does not honour.
    for (const [, permission] of h.records("users")) {
      assert.equal(validPermission(permission), true);
      const grants = permission.grants as ContactPermission["grants"];
      assert.equal(grants["whatsapp:marketing"]?.status, "optedIn");
      assert.deepEqual(permission.granted, []);
    }
    assert.equal(h.records("guestMessagingPermissions").length, 2);
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
    const receipts = h.records("contactPermissionReceipts");
    assert.equal(receipts.length, 1);
    assert.equal(receipts[0][1].senderKind, "organizer");
    assert.equal(h.records("guestPayments").length, 0);
  });

test("delayed capture cannot overwrite a later organizer STOP or Catch opt-out",
  async () => {
    const h = fixture(true, true);
    const {paymentId} = await h.reserve();
    const org = stored(Object.fromEntries(organizerWhatsappKeys.map((key) =>
      [key, withdrawal(800)])), "organizer");
    const platform = stored({"whatsapp:marketing": withdrawal(800)}, "catch");
    h.store.records.set(organizerPath, org);
    h.store.records.set(catchPath, platform);
    h.capture(paymentId);
    await h.finalize(paymentId);
    assert.deepEqual(h.store.records.get(organizerPath), org);
    assert.deepEqual(h.store.records.get(catchPath), platform);
    assert.equal(h.records("contactPermissionReceipts").length, 0);
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
    assert.equal(h.records("contactPermissionReceipts").length, 0);
  });

test("deleted participant cannot be re-subscribed by a delayed payment",
  async () => {
    const h = fixture(true, true);
    const {paymentId} = await h.reserve();
    h.store.records.set("deletedUsers/person", {status: "processing"});
    h.capture(paymentId);
    await h.finalize(paymentId);
    assert.equal(h.records("contactPermissionReceipts").length, 0);
    assert.equal(h.records("users").length, 0);
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
      path.startsWith("contactPermissionReceipts/")).length, 0);
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
    // Promoted form choices are recorded, bound to the verified phone, and
    // wait for provider review before any send gate honours them.
    const organizer = h.store.records.get(organizerPath) as unknown as
      ContactPermission;
    assert.equal(validPermission(organizer), true);
    assert.equal(organizer.grants["whatsapp:eventOperations"]?.endpointE164,
      "+919000000001");
    assert.deepEqual(organizer.granted, []);
    assert.equal((h.store.records.get(catchPath) as unknown as
      ContactPermission).grants["whatsapp:marketing"]?.status, "optedIn");
    for (const [path, receipt] of h.store.records) {
      if (path.startsWith("contactPermissionReceipts/")) {
        assert.equal(validReceipt(receipt), true);
      }
    }
    assert.equal((await promoteFormCommunicationIntentHandler(
      callableRequest, deps))
      .replayed, true);
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
  const org = stored(Object.fromEntries(organizerWhatsappKeys.map((key) =>
    [key, withdrawal(800)])), "organizer");
  h.store.records.set(organizerPath, org);
  const result = await promoteFormCommunicationIntentHandler({
    data: {responseId, withdrawalToken: null, requestId: "promote-stop"},
    auth: {uid: "person", token: {phone_number: "+919000000001"}},
  } as never, {db: () => h.db, now: () => now,
    rateLimit: async () => undefined} as never);
  assert.deepEqual(result.promotedPurposes, []);
  assert.equal(receiptCount(h.store), 0);
  assert.deepEqual(h.store.records.get(organizerPath), org);
});

test("later v1 submission keeps an earlier marketing withdrawal",
  async () => {
    const h = fixture(true, true);
    const scoped = {...withdrawal(450), receiptId: "scoped-stop",
      source: "participantSettings" as const};
    h.store.records.set(organizerPath,
      stored({"whatsapp:marketing": scoped}, "organizer"));
    h.store.records.set(catchPath,
      stored({"whatsapp:marketing": scoped}, "catch"));
    const {paymentId} = await h.reserve();
    h.capture(paymentId);
    assert.equal(await h.finalize(paymentId), "submitted");
    for (const path of [organizerPath, catchPath]) {
      const permission = h.store.records.get(path) as unknown as
        ContactPermission;
      assert.deepEqual(permission.grants["whatsapp:marketing"], scoped);
      assert.deepEqual(permission.granted, []);
    }
    // The ambiguous copy is still kept as evidence.
    assert.equal(h.records("contactPermissionReceipts").length, 2);
  });
