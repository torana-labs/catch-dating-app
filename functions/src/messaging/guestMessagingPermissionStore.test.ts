import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FormPaymentTestStore} from
  "../payments/formPayments/formPaymentTestStore";
import {unknownOrganizerCommunicationChannel} from
  "../shared/organizerCommunicationPreferences";
import {summarize, summarizeWithReceipts, summaryReceiptIds} from
  "./guestMessagingPermissionStore";

const now = Timestamp.fromMillis(1000);
const preference = {organizerId: "org", uid: "person",
  whatsapp: {...unknownOrganizerCommunicationChannel(), status: "optedIn",
    evidenceStatus: "complete", currentReceiptId: "organizer-grant",
    termsVersion: "form-whatsapp-v1", source: "hostFormResponse",
    updatedAt: Timestamp.fromMillis(500)},
  sms: unknownOrganizerCommunicationChannel(), createdAt: now,
  updatedAt: now} as never;
const receipt = {organizerId: "org", uid: "person", channel: "whatsapp",
  decision: "optedIn", evidenceStatus: "complete",
  termsVersion: "form-whatsapp-v1", consentCopyHash: "a".repeat(64),
  grantedAt: Timestamp.fromMillis(500), revokedAt: null} as never;

test("the row is the sender's summary over the receipts it names",
  async () => {
    assert.deepEqual(summaryReceiptIds(preference), ["organizer-grant"]);
    const store = new FormPaymentTestStore();
    store.records.set("organizerCommunicationPermissionReceipts/" +
      "organizer-grant", receipt);
    const db = store as unknown as FirebaseFirestore.Firestore;
    const read = await db.runTransaction((tx) =>
      summarize(db, tx, preference, "organizer"));
    const inHand = summarizeWithReceipts(preference, "organizer",
      new Map([["organizer-grant", receipt]]));
    assert.deepEqual(read, {status: "optedIn", receiptId: "organizer-grant",
      purposes: {}});
    assert.deepEqual(inHand, read);
  });

test("a missing or foreign receipt does not prove the grant", () => {
  assert.equal(summarizeWithReceipts(preference, "organizer", new Map())
    .status, "unknown");
  assert.equal(summarizeWithReceipts(preference, "organizer",
    new Map([["organizer-grant", {...(receipt as object),
      organizerId: "someone-else"} as never]])).status, "unknown");
  assert.equal(summarizeWithReceipts(null, "catch", new Map()).status,
    "unknown");
});
