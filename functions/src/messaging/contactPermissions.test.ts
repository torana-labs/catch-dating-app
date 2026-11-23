import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {FormPaymentTestStore} from
  "../payments/formPayments/formPaymentTestStore";
import {
  inboundStopPermissionReceipt,
  organizerCommunicationPreferenceId,
  publicRegistrationPermissionReceipt,
  unknownOrganizerCommunicationChannel,
} from "../shared/organizerCommunicationPreferences";
import {followByPhonePermissionReceipt, followerWhatsappGrant} from
  "../organizers/organizerFollowerWhatsapp";
import type {
  OrganizerCommunicationPermissionReceiptDocument as Receipt,
  OrganizerCommunicationPreferenceDocument as Preference,
} from "../shared/generated/firestoreAdminTypes";
import {contractValidator} from "../shared/contractTestValidators";
import {
  contactPermissionAllows,
  contactPermissionReceipt,
  readContactPermissionState,
  resolveContactPermission,
  writeContactPermissionState,
  type ContactPermission,
} from "./contactPermissions";

const validPermission = contractValidator("ContactPermissionDocument");
const validReceipt = contractValidator("ContactPermissionReceiptDocument");
const validRow = contractValidator("GuestMessagingPermissionDocument");
const organizer = {kind: "organizer" as const, organizerId: "org-1"};
const phone = "+919812345678";
const otherPhone = "+919800000002";
const at = (millis: number) => Timestamp.fromMillis(millis);

function preference(patch: Partial<Preference> = {}): Preference {
  return {organizerId: "org-1", uid: "uid-1",
    whatsapp: unknownOrganizerCommunicationChannel(),
    sms: unknownOrganizerCommunicationChannel(), createdAt: at(100),
    updatedAt: at(100), ...patch};
}

function follow(millis: number) {
  const receipt = followByPhonePermissionReceipt({organizerId: "org-1",
    uid: "uid-1", endpointE164: phone, requestId: `follow-${millis}`,
    supersedesReceiptId: null, now: at(millis)});
  return {receipt, grant: followerWhatsappGrant({receiptId: receipt.id,
    endpointE164: phone, now: at(millis)})};
}

function stop(millis: number) {
  const receipt = inboundStopPermissionReceipt({organizerId: "org-1",
    uid: "uid-1", providerEventId: `wamid-${millis}`,
    supersedesReceiptId: null, now: at(millis)});
  const channel = {status: "optedOut" as const,
    evidenceStatus: "complete" as const, currentReceiptId: receipt.id,
    termsVersion: null, source: "inboundStop" as const, sourceEventId: null,
    updatedAt: at(millis)};
  return {receipt, channel};
}

function registration(millis: number) {
  const receipt = publicRegistrationPermissionReceipt({organizerId: "org-1",
    uid: "uid-1", channel: "whatsapp", eventId: "event-1",
    termsVersion: "organizer-updates-v1", supersedesReceiptId: null,
    now: at(millis)})!;
  const channel = {status: "optedIn" as const,
    evidenceStatus: "complete" as const, currentReceiptId: receipt.id,
    termsVersion: "organizer-updates-v1",
    source: "publicEventRegistration" as const, sourceEventId: "event-1",
    updatedAt: at(millis)};
  return {receipt, channel};
}

const resolve = (value: Preference, extra: Partial<Parameters<
  typeof resolveContactPermission>[0]> = {}) =>
  resolveContactPermission({sender: organizer, preference: value,
    now: at(5000), ...extra});

test("a permission for one number does not cover another", () => {
  const {grant} = follow(1000);
  const permission = resolve(preference({
    whatsappPurposes: {followerUpdates: grant}}));
  assert.equal(validPermission(permission), true);
  assert.deepEqual(permission.granted, ["whatsapp:followerUpdates"]);
  assert.equal(permission.grants["whatsapp:followerUpdates"]?.endpointE164,
    phone);
  assert.equal(contactPermissionAllows(permission,
    "whatsapp:followerUpdates", phone), true);
  assert.equal(contactPermissionAllows(permission,
    "whatsapp:followerUpdates", otherPhone), false);
  assert.equal(contactPermissionAllows(permission,
    "whatsapp:followerUpdates", null), false);
  assert.equal(contactPermissionAllows(permission, "whatsapp:marketing",
    phone), false);
  assert.equal(contactPermissionAllows(null, "whatsapp:followerUpdates",
    phone), false);
});

test("a later opt-out beats an earlier opt-in, and a later opt-in wins back",
  () => {
    const optIn = follow(1000);
    const optOut = stop(2000);
    const stopped = resolve(preference({whatsapp: optOut.channel,
      whatsappPurposes: {followerUpdates: optIn.grant}}));
    assert.equal(validPermission(stopped), true);
    assert.deepEqual(stopped.granted, []);
    for (const key of ["whatsapp:eventOperations", "whatsapp:marketing",
      "whatsapp:followerUpdates"] as const) {
      assert.equal(stopped.grants[key]?.status, "optedOut", key);
      assert.equal(stopped.grants[key]?.receiptId, optOut.receipt.id, key);
      assert.equal(stopped.grants[key]?.endpointE164, null, key);
    }
    assert.equal(contactPermissionAllows(stopped, "whatsapp:followerUpdates",
      phone), false);

    const again = follow(3000);
    const resumed = resolve(preference({whatsapp: optOut.channel,
      whatsappPurposes: {followerUpdates: again.grant}}));
    assert.deepEqual(resumed.granted, ["whatsapp:followerUpdates"]);
    assert.equal(resumed.grants["whatsapp:marketing"]?.status, "optedOut");
  });

test("a registration grant is bound to the verified number it came with",
  () => {
    const whatsapp = registration(1000);
    const value = preference({whatsapp: whatsapp.channel});
    const copy = contactPermissionReceipt(organizer,
      whatsapp.receipt.document, phone);
    assert.equal(validReceipt(copy), true);
    assert.equal(copy.senderId, "org-1");
    assert.equal("organizerId" in copy, false);
    const bound = resolve(value, {receipts: new Map([[whatsapp.receipt.id,
      copy]])});
    assert.deepEqual(bound.granted, ["whatsapp:marketing"]);
    assert.equal(bound.grants["whatsapp:marketing"]?.endpointE164, phone);
    // A later write without the receipt copy keeps the number it knew.
    const later = resolve(value, {existing: bound});
    assert.deepEqual(later.granted, ["whatsapp:marketing"]);
    // An older grant recorded without any number is kept but not granted.
    const unbound = resolve(value);
    assert.equal(unbound.grants["whatsapp:marketing"]?.status, "optedIn");
    assert.equal(unbound.grants["whatsapp:marketing"]?.endpointE164, null);
    assert.deepEqual(unbound.granted, []);
    assert.equal(validPermission(unbound), true);
  });

test("unknown and unreviewed answers are not grants", () => {
  // A form opt-in from the first form copy maps to no purpose.
  const formOnly = resolve(preference({whatsapp: {
    status: "optedIn", evidenceStatus: "complete",
    currentReceiptId: "fcpr_1", termsVersion: "form-whatsapp-v1",
    source: "hostFormResponse", sourceEventId: null, updatedAt: at(1000)}}));
  assert.deepEqual(formOnly.grants, {});
  assert.deepEqual(formOnly.granted, []);
  // Incomplete evidence is no answer at all.
  const incomplete = resolve(preference({whatsapp: {
    status: "optedIn", evidenceStatus: "incomplete",
    currentReceiptId: null, termsVersion: null, source: "legacyIncomplete",
    sourceEventId: null, updatedAt: at(1000)}}));
  assert.deepEqual(incomplete.grants, {});
  // Catch has only the marketing purpose.
  const catchPermission = resolveContactPermission({sender: {kind: "catch"},
    preference: {uid: "uid-1", whatsapp: stop(1000).channel,
      createdAt: at(100), updatedAt: at(100)}, now: at(5000)});
  assert.equal(validPermission(catchPermission), true);
  assert.deepEqual(Object.keys(catchPermission.grants),
    ["whatsapp:marketing"]);
  assert.equal(catchPermission.senderId, "catch");
});

function store() {
  const records = new FormPaymentTestStore();
  return {records, db: records as unknown as FirebaseFirestore.Firestore};
}

test("one transaction writes the old, the new and the guest documents",
  async () => {
    const {records, db} = store();
    const {receipt, grant} = follow(1000);
    const prefPath = "organizerCommunicationPreferences/" +
      organizerCommunicationPreferenceId("org-1", "uid-1");
    const next = preference({whatsappPurposes: {followerUpdates: grant}});
    const write = () => db.runTransaction(async (tx) => {
      const state = await readContactPermissionState(db, tx, {uid: "uid-1",
        sender: organizer, previous: null});
      tx.create(db.collection("organizerCommunicationPermissionReceipts")
        .doc(receipt.id), receipt.document);
      tx.set(db.collection("organizerCommunicationPreferences")
        .doc(prefPath.split("/")[1]), next);
      return writeContactPermissionState(tx, state, {next, now: at(1000),
        receipts: [{id: receipt.id, document: receipt.document,
          created: true}]});
    });
    // A failed commit writes none of them.
    records.failNextCommit = true;
    await assert.rejects(write());
    assert.equal(records.records.size, 0);

    const row = await write();
    const permission = records.records.get(
      "users/uid-1/contactPermissions/organizer_org-1") as
      unknown as ContactPermission;
    const copy = records.records.get(`contactPermissionReceipts/${receipt.id}`);
    assert.ok(records.records.get(prefPath));
    assert.ok(records.records.get(
      `organizerCommunicationPermissionReceipts/${receipt.id}`));
    assert.equal(validPermission(permission), true);
    assert.equal(validReceipt(copy), true);
    assert.deepEqual(permission.granted, ["whatsapp:followerUpdates"]);
    assert.deepEqual(records.records.get("guestMessagingPermissions/" +
      prefPath.split("/")[1]), row);
    assert.equal(validRow(row), true);
    assert.equal(row.preference.status, "optedIn");
    assert.equal(row.preference.receiptId, receipt.id);
  });

test("a replayed receipt is evidence but is not written again", async () => {
  const {records, db} = store();
  const {receipt, channel} = registration(1000);
  const next = preference({whatsapp: channel});
  await db.runTransaction(async (tx) => {
    const state = await readContactPermissionState(db, tx, {uid: "uid-1",
      sender: organizer, previous: null});
    writeContactPermissionState(tx, state, {next, now: at(1000),
      receipts: [{id: receipt.id, document: receipt.document as Receipt,
        created: false, endpointE164: phone}]});
  });
  assert.equal(records.records.has(`contactPermissionReceipts/${receipt.id}`),
    false);
  const permission = records.records.get(
    "users/uid-1/contactPermissions/organizer_org-1") as
    unknown as ContactPermission;
  assert.deepEqual(permission.granted, ["whatsapp:marketing"]);
});
