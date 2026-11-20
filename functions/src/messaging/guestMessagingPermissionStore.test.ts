import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FormPaymentTestStore} from
  "../payments/formPayments/formPaymentTestStore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {unknownOrganizerCommunicationChannel,
  organizerCommunicationPreferenceId} from
  "../shared/organizerCommunicationPreferences";
import {catchPermissionViewId, receiptPermissionRow,
  reconcileGuestMessagingPermission} from "./guestMessagingPermissionStore";
import {contractValidator} from "../shared/contractTestValidators";

const validView = contractValidator("GuestMessagingPermissionDocument");
const now = Timestamp.fromMillis(1000);
const orgPref = organizerCommunicationPreferenceId("org", "person");

function fixture() {
  const store = new FormPaymentTestStore();
  store.records.set("organizers/org", {name: "RSVP Demo"});
  const db = store as unknown as FirebaseFirestore.Firestore;
  return {store, db};
}

function grant(h: ReturnType<typeof fixture>, scope: "catch" | "organizer",
  receiptId = `${scope}-grant`) {
  const whatsapp = {...unknownOrganizerCommunicationChannel(),
    status: "optedIn", evidenceStatus: "complete",
    currentReceiptId: receiptId, termsVersion: "form-whatsapp-v1",
    source: "hostFormResponse", updatedAt: Timestamp.fromMillis(500)};
  const channel = {uid: "person", whatsapp, createdAt: now, updatedAt: now};
  const receipt = {uid: "person", channel: "whatsapp", decision: "optedIn",
    evidenceStatus: "complete", termsVersion: "form-whatsapp-v1",
    consentCopyHash: "a".repeat(64), grantedAt: Timestamp.fromMillis(500),
    revokedAt: null};
  if (scope === "catch") {
    h.store.records.set("catchCommunicationPreferences/person", channel);
    h.store.records.set(`catchCommunicationPermissionReceipts/${receiptId}`,
      receipt);
  } else {
    h.store.records.set(`organizerCommunicationPreferences/${orgPref}`,
      {...channel, organizerId: "org",
        sms: unknownOrganizerCommunicationChannel()});
    h.store.records.set(
      `organizerCommunicationPermissionReceipts/${receiptId}`,
      {...receipt, organizerId: "org"});
  }
}

const view = (h: ReturnType<typeof fixture>, id: string) =>
  h.store.records.get(`guestMessagingPermissions/${id}`) as
    Record<string, unknown> | undefined;

test("each row holds the sender's verified permission summary", async () => {
  const h = fixture();
  grant(h, "catch");
  grant(h, "organizer");
  await reconcileGuestMessagingPermission(h.db, {scope: "catch",
    uid: "person"});
  await reconcileGuestMessagingPermission(h.db, {scope: "organizer",
    preferenceId: orgPref});
  const catchRow = view(h, catchPermissionViewId("person"));
  const orgRow = view(h, orgPref);
  assert.equal(validView(catchRow), true);
  assert.equal(validView(orgRow), true);
  assert.deepEqual(catchRow, {uid: "person", scope: "catch",
    organizerId: null, preference: {status: "optedIn",
      receiptId: "catch-grant", purposes: {}}, version: 1});
  assert.deepEqual(orgRow, {uid: "person", scope: "organizer",
    organizerId: "org", preference: {status: "optedIn",
      receiptId: "organizer-grant", purposes: {}}, version: 1});
});

test("a receipt that stops proving the grant changes the row", async () => {
  const h = fixture();
  grant(h, "organizer");
  const row = receiptPermissionRow("organizer",
    h.store.records.get("organizerCommunicationPermissionReceipts/" +
      "organizer-grant") as FirebaseFirestore.DocumentData);
  assert.deepEqual(row, {scope: "organizer", preferenceId: orgPref});
  await reconcileGuestMessagingPermission(h.db, row!);
  assert.equal((view(h, orgPref)?.preference as {status: string}).status,
    "optedIn");
  h.store.records.delete(
    "organizerCommunicationPermissionReceipts/organizer-grant");
  await reconcileGuestMessagingPermission(h.db, row!);
  assert.equal((view(h, orgPref)?.preference as {status: string}).status,
    "unknown");
});

test("no preference means no row, and a deleted one removes it", async () => {
  // This store implements transactional deletes.
  const store = new AudienceTestStore();
  const db = store.asFirestore();
  const id = `guestMessagingPermissions/${catchPermissionViewId("person")}`;
  await reconcileGuestMessagingPermission(db, {scope: "catch",
    uid: "person"});
  assert.equal(store.docs[id], undefined);
  store.docs["catchCommunicationPreferences/person"] = {uid: "person",
    whatsapp: unknownOrganizerCommunicationChannel(), createdAt: now,
    updatedAt: now};
  await reconcileGuestMessagingPermission(db, {scope: "catch",
    uid: "person"});
  const row = store.docs[id] as {preference: {status: string}} | undefined;
  assert.equal(row?.preference.status, "unknown");
  delete store.docs["catchCommunicationPreferences/person"];
  await reconcileGuestMessagingPermission(db, {scope: "catch",
    uid: "person"});
  assert.equal(store.docs[id], undefined);
});

test("an inconsistent source keeps its previous row and does not throw",
  async () => {
    const h = fixture();
    grant(h, "organizer");
    await reconcileGuestMessagingPermission(h.db, {scope: "organizer",
      preferenceId: orgPref});
    const before = view(h, orgPref);
    h.store.records.set(`organizerCommunicationPreferences/${orgPref}`, {
      ...(h.store.records.get(`organizerCommunicationPreferences/${orgPref}`) as
        object), organizerId: "someone-else"});
    await reconcileGuestMessagingPermission(h.db, {scope: "organizer",
      preferenceId: orgPref});
    assert.deepEqual(view(h, orgPref), before);
  });

test("receipts without an owner map to no row", () => {
  assert.equal(receiptPermissionRow("catch", undefined), null);
  assert.equal(receiptPermissionRow("organizer", {uid: "person"}), null);
  assert.deepEqual(receiptPermissionRow("catch", {uid: "person"}),
    {scope: "catch", uid: "person"});
});
