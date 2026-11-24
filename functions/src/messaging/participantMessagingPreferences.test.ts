import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import type {CallableRequest} from "firebase-functions/v2/https";
import {FormPaymentTestStore, createFormPaymentFixture} from
  "../payments/formPayments/formPaymentTestStore";
import {organizerCommunicationPreferenceId} from
  "../shared/organizerCommunicationPreferences";
import {
  contactSenderKey,
  effectiveContactKeys,
  whatsappPermissionSummary,
  type ContactGrant,
  type ContactPermission,
} from "../shared/contactPermissions";
import {normalizeFormMessagingDecision} from
  "../organizers/organizerFormMessagingConsent";
import {withdrawParticipantMessagingPermissionHandler as withdraw} from
  "./participantMessagingPreferences";
import {catchPermissionViewId} from "./guestMessagingPermissionStore";
import type {WithdrawParticipantMessagingPermissionCallableResponse} from
  "../shared/generated/withdrawParticipantMessagingPermissionCallableResponse";
import {contractValidator} from "../shared/contractTestValidators";

const validResult =
  contractValidator<WithdrawParticipantMessagingPermissionCallableResponse>(
    "WithdrawParticipantMessagingPermissionCallableResponse"
  );
const validReceipt = contractValidator("ContactPermissionReceiptDocument");
const validPermission = contractValidator("ContactPermissionDocument");

const now = Timestamp.fromMillis(1000);
const phone = "+919000000001";
const request = (data: unknown, uid = "person") =>
  ({auth: {uid, token: {}}, data}) as unknown as CallableRequest<unknown>;
const input = (scope: "catch" | "organizer", expectedReceiptId: string | null
= null,
requestId = "withdraw-1", organizerId = "org") =>
  ({scope, organizerId: scope === "catch" ? null : organizerId,
    expectedReceiptId, requestId});
const senderOf = (scope: "catch" | "organizer", organizerId = "org") =>
  scope === "catch" ? {kind: "catch" as const} :
    {kind: "organizer" as const, organizerId};
const permissionPath = (scope: "catch" | "organizer", uid = "person",
  organizerId = "org") =>
  `users/${uid}/contactPermissions/${contactSenderKey(
    senderOf(scope, organizerId))}`;

function fixture() {
  const store = new FormPaymentTestStore();
  store.records.set("organizers/org", {name: "RSVP Demo"});
  const db = store as unknown as FirebaseFirestore.Firestore;
  const deps = {db: () => db, now: () => now, rateLimit: async () => undefined};
  return {store, db, deps};
}

function grant(receiptId: string, patch: Partial<ContactGrant> = {}):
  ContactGrant {
  return {status: "optedIn", endpointE164: phone, receiptId,
    termsVersion: "organizer-updates-v1", source: "publicEventRegistration",
    updatedAt: Timestamp.fromMillis(500), ...patch};
}

/** Stores one sender's permission, as a consent writer leaves it. */
function seed(h: {store: FormPaymentTestStore}, scope: "catch" | "organizer",
  grants: ContactPermission["grants"], uid = "person", organizerId = "org") {
  const sender = senderOf(scope, organizerId);
  h.store.records.set(permissionPath(scope, uid, organizerId), {
    senderKind: sender.kind,
    senderId: scope === "catch" ? "catch" : organizerId,
    grants, granted: effectiveContactKeys(grants), updatedAt: now});
}

const stored = (h: {store: FormPaymentTestStore},
  scope: "catch" | "organizer") =>
  h.store.records.get(permissionPath(scope)) as unknown as
    ContactPermission | undefined;
const row = (h: {store: FormPaymentTestStore}, scope: "catch" | "organizer") =>
  h.store.records.get("guestMessagingPermissions/" +
    (scope === "catch" ? catchPermissionViewId("person") :
      organizerCommunicationPreferenceId("org", "person"))) as
    {preference: unknown} | undefined;

test("Catch and each organizer withdraw independently, preserving SMS",
  async () => {
    const h = fixture();
    seed(h, "catch", {"whatsapp:marketing": grant("catch-grant")});
    seed(h, "organizer", {"whatsapp:marketing": grant("organizer-grant"),
      "sms:marketing": grant("sms-grant")});
    const before = stored(h, "organizer");
    const result = await withdraw(
      request(input("catch", "catch-grant")), h.deps);
    assert.equal(validResult(result), true);
    assert.equal(result.preference.status, "optedOut");
    assert.deepEqual(stored(h, "organizer"), before);
    const evidence = h.store.records.get(
      `contactPermissionReceipts/${result.preference.receiptId}`)!;
    assert.equal(validReceipt(evidence), true);
    assert.equal(evidence.senderKind, "catch");
    assert.equal(evidence.sourceOrganizerId, null);
    assert.equal(evidence.actorUid, "person");
    assert.equal(validReceipt({...evidence, source: "hostFormResponse"}),
      false);
    assert.equal(validReceipt({...evidence, source: "hostFormResponse",
      sourceOrganizerId: "org"}), true);
    const org = await withdraw(request(input("organizer", "organizer-grant")),
      h.deps);
    assert.equal(org.preference.status, "optedOut");
    const organizer = stored(h, "organizer")!;
    assert.equal(validPermission(organizer), true);
    for (const key of ["whatsapp:eventOperations", "whatsapp:marketing",
      "whatsapp:followerUpdates"] as const) {
      assert.equal(organizer.grants[key]?.status, "optedOut", key);
      assert.equal(organizer.grants[key]?.receiptId, org.preference.receiptId,
        key);
    }
    assert.deepEqual(organizer.grants["sms:marketing"],
      before!.grants["sms:marketing"]);
    assert.deepEqual(organizer.granted, ["sms:marketing"]);
    // The guest's row holds the summary the withdrawal returned.
    assert.deepEqual(row(h, "catch")?.preference, result.preference);
    assert.deepEqual(row(h, "organizer")?.preference, org.preference);
  });

test("purpose grants are visible and sender withdrawal revokes every purpose",
  async () => {
    const h = fixture();
    const form = (receiptId: string) => grant(receiptId,
      {source: "hostFormResponse", termsVersion: "form-whatsapp-v2"});
    seed(h, "organizer", {
      "whatsapp:eventOperations": form("purpose-eventOperations"),
      "whatsapp:marketing": form("purpose-marketing"),
    });
    const listed = whatsappPermissionSummary(stored(h, "organizer")!,
      "organizer");
    assert.equal(listed.purposes?.eventOperations?.status, "optedIn");
    assert.equal(listed.purposes?.marketing?.status, "optedIn");
    // The form opt-ins await provider review: recorded, never granted.
    assert.deepEqual(stored(h, "organizer")!.granted, []);
    const scoped = await withdraw(request({...input("organizer",
      "purpose-eventOperations", "scope-operations"),
    purpose: "eventOperations"}), h.deps);
    assert.equal(scoped.preference.status, "optedIn");
    assert.equal(scoped.preference.purposes?.eventOperations?.status,
      "optedOut");
    assert.equal(scoped.preference.purposes?.marketing?.status, "optedIn");
    const result = await withdraw(request(input("organizer",
      "purpose-marketing")), h.deps);
    assert.equal(result.preference.status, "optedOut");
    assert.equal(result.preference.purposes?.eventOperations?.status,
      "optedOut");
    assert.equal(result.preference.purposes?.marketing?.status, "optedOut");
    // A newer opt-in is not undone by replaying the old withdrawal.
    seed(h, "organizer", {...stored(h, "organizer")!.grants,
      "whatsapp:eventOperations": form("later-operations")});
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
    const h = fixture();
    seed(h, "catch", {"whatsapp:marketing": grant("catch-grant")});
    const data = input("catch", "catch-grant");
    const first = await withdraw(request(data), h.deps);
    const writes = h.store.records.size;
    assert.equal((await withdraw(request(data), h.deps)).replayed, true);
    assert.equal(h.store.records.size, writes);
    await assert.rejects(withdraw(request({...data, expectedReceiptId: null}),
      h.deps),
    {code: "already-exists"});
    seed(h, "catch", {"whatsapp:marketing": grant("later-grant",
      {updatedAt: Timestamp.fromMillis(5000)})});
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
    seed(h, "catch", {"whatsapp:marketing": grant("catch-grant")});
    const data = input("catch", "catch-grant", "old-request");
    const oldId = "pmpr_" + createHash("sha256")
      .update(JSON.stringify(["person", "catch", null, "old-request"]))
      .digest("hex").slice(0, 48);
    h.store.records.set(`contactPermissionReceipts/${oldId}`,
      {uid: "person", senderKind: "catch", source: "participantSettings",
        decision: "optedOut", supersedesReceiptId: "catch-grant"});
    const before = h.store.records.size;
    const replay = await withdraw(request(data), h.deps);
    assert.equal(replay.replayed, true);
    assert.equal(replay.preference.status, "optedIn");
    assert.equal(h.store.records.size, before);
  });

test("auth, sender scope, deletion and foreign receipts cannot write",
  async () => {
    const h = fixture();
    seed(h, "catch", {"whatsapp:marketing": grant("catch-grant")});
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
  const h = fixture();
  seed(h, "catch", {"whatsapp:marketing": grant("catch-grant")});
  h.store.failNextCommit = true;
  await assert.rejects(withdraw(request(input("catch", "catch-grant")),
    h.deps));
  assert.equal(stored(h, "catch")!.grants["whatsapp:marketing"]?.status,
    "optedIn");
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
    const catchRow = whatsappPermissionSummary(stored(h, "catch")!, "catch");
    assert.equal(catchRow.status, a.preference.status);
    assert.equal(catchRow.receiptId, a.preference.receiptId);
    assert.equal(catchRow.purposes?.marketing?.status, "optedOut");
    const organizerRow = whatsappPermissionSummary(stored(h, "organizer")!,
      "organizer");
    assert.equal(organizerRow.status, b.preference.status);
    assert.equal(organizerRow.receiptId, b.preference.receiptId);
    assert.equal(organizerRow.purposes?.eventOperations?.status, "optedOut");
  });
