import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FormPaymentTestStore, createFormPaymentFixture} from
  "../payments/formPayments/formPaymentTestStore";
import {unknownOrganizerCommunicationChannel,
  organizerCommunicationPreferenceId} from
  "../shared/organizerCommunicationPreferences";
import {normalizeFormMessagingDecision} from
  "../organizers/organizerFormMessagingConsent";
import {withdrawParticipantMessagingPermissionHandler as withdraw} from
  "./participantMessagingPreferences";
import {catchPermissionViewId, summarize} from
  "./guestMessagingPermissionStore";
import {contactSenderKey} from "./contactPermissions";
import type {WithdrawParticipantMessagingPermissionCallableResponse} from
  "../shared/generated/withdrawParticipantMessagingPermissionCallableResponse";
import {contractValidator} from "../shared/contractTestValidators";

const validResult =
  contractValidator<WithdrawParticipantMessagingPermissionCallableResponse>(
    "WithdrawParticipantMessagingPermissionCallableResponse"
  );
const validCatchReceipt =
  contractValidator("CatchCommunicationPermissionReceiptDocument");

const now = Timestamp.fromMillis(1000);
const request = (data: unknown, uid = "person") =>
  ({auth: {uid, token: {}}, data}) as unknown as CallableRequest<unknown>;
const input = (scope: "catch" | "organizer", expectedReceiptId: string | null
= null,
requestId = "withdraw-1", organizerId = "org") =>
  ({scope, organizerId: scope === "catch" ? null : organizerId,
    expectedReceiptId, requestId});
function fixture() {
  const store = new FormPaymentTestStore();
  store.records.set("organizers/org", {name: "RSVP Demo"});
  const db = store as unknown as FirebaseFirestore.Firestore;
  const deps = {db: () => db, now: () => now, rateLimit: async () => undefined};
  return {store, db, deps};
}
/** One sender's settings row, as summarize computes it from the stored
 * preference and receipts. */
async function permission(db: FirebaseFirestore.Firestore,
  scope: "catch" | "organizer", uid = "person", organizerId = "org") {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(scope === "catch" ?
      db.collection("catchCommunicationPreferences").doc(uid) :
      db.collection("organizerCommunicationPreferences")
        .doc(organizerCommunicationPreferenceId(organizerId, uid)));
    assert.ok(snap.exists);
    return summarize(db, tx, snap.data() as never, scope);
  });
}
/** The guest's stored row and permission document for one sender. */
function storedRows(h: {store: FormPaymentTestStore},
  scope: "catch" | "organizer",
  uid = "person", organizerId = "org") {
  const sender = scope === "catch" ? {kind: "catch" as const} :
    {kind: "organizer" as const, organizerId};
  return {
    row: h.store.records.get("guestMessagingPermissions/" +
      (scope === "catch" ? catchPermissionViewId(uid) :
        organizerCommunicationPreferenceId(organizerId, uid))) as
      {preference: unknown} | undefined,
    permission: h.store.records.get(
      `users/${uid}/contactPermissions/${contactSenderKey(sender)}`) as
      {grants: Record<string, {status: string; receiptId: string | null}>;
        granted: string[]} | undefined,
  };
}
function grant(h: ReturnType<typeof fixture>, scope: "catch" | "organizer",
  uid = "person", organizerId = "org", receiptId = `${scope}-grant`) {
  const whatsapp = {...unknownOrganizerCommunicationChannel(), status:
    "optedIn",
  evidenceStatus: "complete", currentReceiptId: receiptId, termsVersion:
      "form-whatsapp-v1",
  source: "hostFormResponse", updatedAt: Timestamp.fromMillis(500)};
  const channel = {uid, whatsapp, createdAt: now, updatedAt: now};
  const receipt = {uid, channel: "whatsapp", decision: "optedIn",
    evidenceStatus: "complete",
    termsVersion: "form-whatsapp-v1", consentCopyHash: "a".repeat(64),
    grantedAt: Timestamp.fromMillis(500), revokedAt: null};
  if (scope === "catch") {
    h.store.records.set(`catchCommunicationPreferences/${uid}`, channel);
    h.store.records.set(`catchCommunicationPermissionReceipts/${receiptId}`,
      receipt);
  } else {
    h.store.records.set("organizerCommunicationPreferences/" +
      organizerCommunicationPreferenceId(organizerId, uid), {...channel,
      organizerId,
      sms: unknownOrganizerCommunicationChannel()});
    h.store.records.set(`organizerCommunicationPermissionReceipts/${receiptId}`,
      {...receipt, organizerId});
  }
}

test("Catch and each organizer withdraw independently, preserving SMS",
  async () => {
    const h = fixture(); grant(h, "catch"); grant(h, "organizer");
    const orgPath = "organizerCommunicationPreferences/" +
    organizerCommunicationPreferenceId("org", "person");
    const before = h.store.records.get(orgPath);
    const result = await withdraw(
      request(input("catch", "catch-grant")), h.deps);
    assert.equal(validResult(result), true);
    assert.equal(result.preference.status, "optedOut");
    assert.deepEqual(h.store.records.get(orgPath), before);
    const evidence = h.store.records.get(
      "catchCommunicationPermissionReceipts/" +
    result.preference.receiptId)!;
    assert.equal(validCatchReceipt(evidence), true);
    assert.equal(evidence.sourceOrganizerId, null);
    assert.equal(validCatchReceipt({...evidence, source: "hostFormResponse"}),
      false);
    assert.equal(validCatchReceipt({...evidence, source: "hostFormResponse",
      sourceOrganizerId: "org"}), true);
    assert.equal(evidence.actorUid, "person");
    const org = await withdraw(request(input("organizer", "organizer-grant")),
      h.deps);
    assert.equal(org.preference.status, "optedOut");
    assert.deepEqual(h.store.records.get(orgPath)?.sms, before?.sms);
    const saved = h.store.records.get("catchCommunicationPreferences/person")!;
    assert.equal(
      (saved.whatsapp as {currentReceiptId: string}).currentReceiptId,
      result.preference.receiptId);
    // The same transaction wrote the guest's row, the permission document
    // and the receipt copy for each sender.
    for (const [scope, outcome] of [["catch", result],
      ["organizer", org]] as const) {
      const {row, permission: document} = storedRows(h, scope);
      assert.deepEqual(row?.preference, outcome.preference);
      assert.equal(document?.grants["whatsapp:marketing"]?.status,
        "optedOut");
      assert.equal(document?.grants["whatsapp:marketing"]?.receiptId,
        outcome.preference.receiptId);
      assert.deepEqual(document?.granted, []);
      const copy = h.store.records.get(
        `contactPermissionReceipts/${outcome.preference.receiptId}`);
      assert.equal(copy?.senderKind, scope);
      assert.equal(copy?.senderId, scope === "catch" ? "catch" : "org");
      assert.equal(copy?.decision, "optedOut");
    }
  });

test("purpose grants are visible and sender withdrawal revokes every purpose",
  async () => {
    const h = fixture();
    const orgPath = "organizerCommunicationPreferences/" +
      organizerCommunicationPreferenceId("org", "person");
    const makeChannel = (purpose: "eventOperations" | "marketing") => ({
      status: "optedIn", evidenceStatus: "complete",
      currentReceiptId: `purpose-${purpose}`,
      termsVersion: "form-whatsapp-v2", source: "hostFormResponse",
      sourceEventId: null, sourceResponseId: "response",
      endpointE164: "+919000000001", updatedAt: Timestamp.fromMillis(500),
    });
    h.store.records.set(orgPath, {organizerId: "org", uid: "person",
      whatsapp: unknownOrganizerCommunicationChannel(),
      whatsappPurposes: {eventOperations: makeChannel("eventOperations"),
        marketing: makeChannel("marketing")},
      sms: unknownOrganizerCommunicationChannel(),
      createdAt: now, updatedAt: now});
    for (const purpose of ["eventOperations", "marketing"]) {
      h.store.records.set(
        `organizerCommunicationPermissionReceipts/purpose-${purpose}`,
        {organizerId: "org", uid: "person", channel: "whatsapp", purpose,
          sourceResponseId: "response", endpointE164: "+919000000001",
          decision: "optedIn", evidenceStatus: "complete",
          consentCopyHash: "a".repeat(64), revokedAt: null});
    }
    const listed = await permission(h.db, "organizer");
    assert.equal(listed.purposes?.eventOperations?.status, "optedIn");
    assert.equal(listed.purposes?.marketing?.status, "optedIn");
    const scoped = await withdraw(request({...input("organizer",
      "purpose-eventOperations", "scope-operations"),
    purpose: "eventOperations"}), h.deps);
    assert.equal(scoped.preference.status, "optedIn");
    assert.equal(scoped.preference.purposes?.eventOperations?.status,
      "optedOut");
    assert.equal(scoped.preference.purposes?.marketing?.status, "optedIn");
    const partial = await permission(h.db, "organizer");
    assert.equal(partial.purposes?.eventOperations?.status, "optedOut");
    assert.equal(partial.purposes?.marketing?.status, "optedIn");
    // The form opt-in awaits provider review, so the permission keeps the
    // answer but does not grant it.
    const document = storedRows(h, "organizer").permission;
    assert.equal(document?.grants["whatsapp:eventOperations"]?.status,
      "optedOut");
    assert.equal(document?.grants["whatsapp:marketing"]?.status, "optedIn");
    assert.deepEqual(document?.granted, []);
    const result = await withdraw(request(input("organizer",
      "purpose-marketing")), h.deps);
    assert.equal(result.preference.status, "optedOut");
    const after = await permission(h.db, "organizer");
    assert.equal(after.purposes?.eventOperations?.status, "optedOut");
    assert.equal(after.purposes?.marketing?.status, "optedOut");
    const stored = h.store.records.get(orgPath)!;
    h.store.records.set(orgPath, {...stored, whatsappPurposes: {
      ...(stored.whatsappPurposes as Record<string, unknown>),
      eventOperations: {...makeChannel("eventOperations"),
        currentReceiptId: "later-operations",
        updatedAt: Timestamp.fromMillis(2000)},
    }});
    h.store.records.set(
      "organizerCommunicationPermissionReceipts/later-operations",
      {organizerId: "org", uid: "person", channel: "whatsapp",
        purpose: "eventOperations", sourceResponseId: "response",
        endpointE164: "+919000000001", decision: "optedIn",
        evidenceStatus: "complete", consentCopyHash: "a".repeat(64),
        revokedAt: null});
    const replay = await withdraw(request({...input("organizer",
      "purpose-eventOperations", "scope-operations"),
    purpose: "eventOperations"}), h.deps);
    assert.equal(replay.replayed, true);
    assert.equal(replay.preference.status, "optedIn");
    assert.equal(replay.preference.purposes?.eventOperations?.status,
      "optedIn");
    await assert.rejects(withdraw(request({...input("catch"),
      purpose: "eventOperations"}), h.deps), {code: "invalid-argument"});
  });

test("retry is immutable, payload bound, and cannot overwrite a newer grant",
  async () => {
    const h = fixture(); grant(h, "catch");
    const data = input("catch", "catch-grant");
    const first = await withdraw(request(data), h.deps);
    const writes = h.store.records.size;
    assert.equal((await withdraw(request(data), h.deps)).replayed, true);
    assert.equal(h.store.records.size, writes);
    await assert.rejects(withdraw(request({...data, expectedReceiptId: null}),
      h.deps),
    {code: "already-exists"});
    grant(h, "catch", "person", "org", "later-grant");
    const replay = await withdraw(request(data), h.deps);
    assert.equal(replay.replayed, true);
    assert.equal(replay.preference.status, "optedIn");
    assert.equal(replay.preference.receiptId, "later-grant");
    await assert.rejects(withdraw(request({...data, requestId: "new-request"}),
      h.deps),
    {code: "aborted"});
    assert.notEqual(first.preference.receiptId, replay.preference.receiptId);
  });

test("legacy sender-wide withdrawal request IDs replay across upgrade",
  async () => {
    const h = fixture();
    grant(h, "catch");
    const data = input("catch", "catch-grant", "old-request");
    const oldId = "pmpr_" + createHash("sha256")
      .update(JSON.stringify(["person", "catch", null, "old-request"]))
      .digest("hex").slice(0, 48);
    h.store.records.set(`catchCommunicationPermissionReceipts/${oldId}`,
      {uid: "person", source: "participantSettings",
        decision: "optedOut", supersedesReceiptId: "catch-grant"});
    const before = h.store.records.size;
    const replay = await withdraw(request(data), h.deps);
    assert.equal(replay.replayed, true);
    assert.equal(replay.preference.status, "optedIn");
    assert.equal(h.store.records.size, before);
  });

test("auth, sender scope, deletion and foreign receipts cannot write",
  async () => {
    const h = fixture(); grant(h, "catch");
    const before = h.store.records.size;
    await assert.rejects(withdraw({data: input("catch")} as
    CallableRequest<unknown>, h.deps),
    {code: "unauthenticated"});
    await assert.rejects(withdraw(request({...input("catch"), organizerId:
    "org"}), h.deps),
    {code: "invalid-argument"});
    await assert.rejects(withdraw(request({...input("catch"), uid: "foreign"}),
      h.deps));
    await assert.rejects(withdraw(request(input("catch", "catch-grant"),
      "foreign"), h.deps),
    {code: "aborted"});
    assert.equal(h.store.records.size, before);
    h.store.records.set("deletedUsers/person", {status: "processing"});
    await assert.rejects(withdraw(request(input("catch", "catch-grant")),
      h.deps), {code: "not-found"});
  });

test("failed commits preserve permission and allow retry", async () => {
  const h = fixture(); grant(h, "catch");
  h.store.failNextCommit = true;
  await assert.rejects(withdraw(request(input("catch", "catch-grant")),
    h.deps));
  assert.equal((await permission(h.db, "catch")).status, "optedIn");
  assert.equal((await withdraw(request(input("catch", "catch-grant")),
    h.deps)).preference.status, "optedOut");
});

test("actual withdrawals fence both grants from an earlier pending checkout",
  async () => {
    const h = createFormPaymentFixture();
    h.store.records.set("organizers/org", {name: "RSVP Demo"});
    h.version.definition.messagingConsent = {organizerWhatsapp: true,
      catchWhatsapp: true};
    const decision = normalizeFormMessagingDecision({choices: {termsVersion:
    "form-whatsapp-v1",
    organizerWhatsapp: true, catchWhatsapp: true}, previous: undefined,
    definition: h.version.definition, phoneVerified: true, now:
    Timestamp.fromMillis(500)});
    h.store.records.set("organizerFormResponseDrafts/draft", {...h.draft,
      messagingDecision: decision});
    const {paymentId} = await h.reserve();
    const deps = {db: () => h.db, now: () => Timestamp.fromMillis(800),
      rateLimit: async () => undefined};
    const a = await withdraw(request(input("catch")), deps);
    const b = await withdraw(request(input("organizer")), deps);
    h.capture(paymentId);
    assert.equal(await h.finalize(paymentId), "submitted");
    const catchRow = await permission(h.db, "catch");
    assert.equal(catchRow.status, a.preference.status);
    assert.equal(catchRow.receiptId, a.preference.receiptId);
    assert.equal(catchRow.purposes?.marketing?.status, "optedOut");
    const organizerRow = await permission(h.db, "organizer");
    assert.equal(organizerRow.status, b.preference.status);
    assert.equal(organizerRow.receiptId, b.preference.receiptId);
    assert.equal(organizerRow.purposes?.eventOperations?.status, "optedOut");
  });
