import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FormPaymentTestStore} from
  "../payments/formPayments/formPaymentTestStore";
import {
  inboundStopPermissionReceipt,
  organizerCommunicationPreferenceId,
} from "../shared/organizerCommunicationPreferences";
import {followByPhonePermissionReceipt, followerWhatsappGrant} from
  "../organizers/organizerFollowerWhatsapp";
import {contactPermissionAllows, organizerWhatsappKeys,
  type ContactPermission} from "../shared/contactPermissions";
import {contractValidator} from "../shared/contractTestValidators";
import {
  grantFromReceipt,
  nextContactPermission,
  readContactPermissionState,
  writeContactPermissionState,
} from "./contactPermissions";

const validPermission = contractValidator("ContactPermissionDocument");
const validReceipt = contractValidator("ContactPermissionReceiptDocument");
const validRow = contractValidator("GuestMessagingPermissionDocument");
const sender = {kind: "organizer" as const, organizerId: "org-1"};
const phone = "+919812345678";
const at = (millis: number) => Timestamp.fromMillis(millis);
const permissionPath = "users/uid-1/contactPermissions/organizer_org-1";
const rowPath = "guestMessagingPermissions/" +
  organizerCommunicationPreferenceId("org-1", "uid-1");

function store() {
  const records = new FormPaymentTestStore();
  return {records, db: records as unknown as FirebaseFirestore.Firestore};
}

async function follow(h: ReturnType<typeof store>, millis: number) {
  const receipt = followByPhonePermissionReceipt({organizerId: "org-1",
    uid: "uid-1", endpointE164: phone, requestId: `follow-${millis}`,
    supersedesReceiptId: null, now: at(millis)});
  await h.db.runTransaction(async (tx) => {
    const state = await readContactPermissionState(h.db, tx,
      {uid: "uid-1", sender});
    writeContactPermissionState(tx, state, {
      next: nextContactPermission(state, {"whatsapp:followerUpdates":
        followerWhatsappGrant({receiptId: receipt.id, endpointE164: phone,
          now: at(millis)})}, at(millis)),
      receipts: [{id: receipt.id, document: receipt.document}]});
  });
  return receipt.id;
}

async function stop(h: ReturnType<typeof store>, millis: number) {
  const receipt = inboundStopPermissionReceipt({organizerId: "org-1",
    uid: "uid-1", providerEventId: `wamid-${millis}`,
    supersedesReceiptId: null, now: at(millis)});
  const withdrawal = grantFromReceipt(receipt.document, receipt.id,
    at(millis));
  await h.db.runTransaction(async (tx) => {
    const state = await readContactPermissionState(h.db, tx,
      {uid: "uid-1", sender});
    writeContactPermissionState(tx, state, {
      next: nextContactPermission(state, Object.fromEntries(
        organizerWhatsappKeys.map((key) => [key, withdrawal])), at(millis)),
      receipts: [{id: receipt.id, document: receipt.document}]});
  });
  return receipt.id;
}

const stored = (h: ReturnType<typeof store>) =>
  h.records.records.get(permissionPath) as unknown as ContactPermission;

test("one transaction writes the receipt, the permission and the guest row",
  async () => {
    const h = store();
    h.records.failNextCommit = true;
    await assert.rejects(follow(h, 1000));
    assert.equal(h.records.records.size, 0);

    const receiptId = await follow(h, 1000);
    const permission = stored(h);
    assert.equal(validPermission(permission), true);
    assert.equal(validReceipt(h.records.records.get(
      `contactPermissionReceipts/${receiptId}`)), true);
    assert.deepEqual(permission.granted, ["whatsapp:followerUpdates"]);
    const row = h.records.records.get(rowPath) as
      {preference: {status: string; receiptId: string}};
    assert.equal(validRow(row), true);
    assert.equal(row.preference.status, "optedIn");
    assert.equal(row.preference.receiptId, receiptId);
  });

test("a later opt-out beats an earlier opt-in, and a later opt-in wins back",
  async () => {
    const h = store();
    await follow(h, 1000);
    const stopId = await stop(h, 2000);
    const stopped = stored(h);
    assert.deepEqual(stopped.granted, []);
    for (const key of organizerWhatsappKeys) {
      assert.equal(stopped.grants[key]?.status, "optedOut", key);
      assert.equal(stopped.grants[key]?.receiptId, stopId, key);
    }
    assert.equal(contactPermissionAllows(stopped,
      "whatsapp:followerUpdates", phone), false);
    assert.equal((h.records.records.get(rowPath) as
      {preference: {status: string}}).preference.status, "optedOut");

    await follow(h, 3000);
    assert.deepEqual(stored(h).granted, ["whatsapp:followerUpdates"]);
    assert.equal(stored(h).grants["whatsapp:marketing"]?.status, "optedOut");
  });

test("an existing receipt id cannot be written twice", async () => {
  const h = store();
  await follow(h, 1000);
  await assert.rejects(follow(h, 1000), /Already exists/u);
});
