import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {
  contactGrantIsEffective,
  contactPermissionAllows,
  contactPermissionStatus,
  effectiveContactKeys,
  readContactPermission,
  whatsappPermissionSummary,
  type ContactGrant,
  type ContactPermission,
} from "./contactPermissions";

const phone = "+919812345678";
const otherPhone = "+919800000002";
const at = (millis: number) => Timestamp.fromMillis(millis);

function grant(patch: Partial<ContactGrant> = {}): ContactGrant {
  return {status: "optedIn", endpointE164: phone, receiptId: "receipt-1",
    termsVersion: "organizer-updates-v1", source: "publicEventRegistration",
    updatedAt: at(1000), ...patch};
}

function permission(grants: ContactPermission["grants"]): ContactPermission {
  return {senderKind: "organizer", senderId: "org-1", grants,
    granted: effectiveContactKeys(grants), updatedAt: at(2000)};
}

test("a grant for one number does not cover another", () => {
  const value = permission({"whatsapp:marketing": grant()});
  assert.deepEqual(value.granted, ["whatsapp:marketing"]);
  assert.equal(contactPermissionAllows(value, "whatsapp:marketing", phone),
    true);
  assert.equal(contactPermissionAllows(value, "whatsapp:marketing",
    otherPhone), false);
  assert.equal(contactPermissionAllows(value, "whatsapp:marketing", null),
    false);
  assert.equal(contactPermissionStatus(value, "whatsapp:marketing",
    otherPhone), "unknown");
  assert.equal(contactPermissionAllows(value, "sms:marketing", phone), false);
  assert.equal(contactPermissionAllows(null, "whatsapp:marketing", phone),
    false);
});

test("a withdrawal is optedOut at every number", () => {
  const value = permission({"whatsapp:marketing": grant({status: "optedOut",
    endpointE164: null, source: "inboundStop", termsVersion: null})});
  assert.deepEqual(value.granted, []);
  for (const endpoint of [phone, otherPhone, null]) {
    assert.equal(contactPermissionStatus(value, "whatsapp:marketing",
      endpoint), "optedOut");
  }
});

test("only approved copy with a number and a receipt is effective", () => {
  assert.equal(contactGrantIsEffective("whatsapp:marketing", grant()), true);
  assert.equal(contactGrantIsEffective("whatsapp:marketing",
    grant({endpointE164: null})), false);
  assert.equal(contactGrantIsEffective("whatsapp:marketing",
    grant({receiptId: null})), false);
  for (const termsVersion of ["form-whatsapp-v1", "form-whatsapp-v2"]) {
    assert.equal(contactGrantIsEffective("whatsapp:marketing",
      grant({source: "hostFormResponse", termsVersion})), false);
  }
  assert.equal(contactGrantIsEffective("whatsapp:followerUpdates", grant()),
    false);
  assert.equal(contactGrantIsEffective("whatsapp:followerUpdates",
    grant({source: "organizerFollowByPhone",
      termsVersion: "follower-whatsapp-v1"})), true);
});

test("a permission naming another sender reads as none", () => {
  const value = permission({});
  assert.ok(readContactPermission(value, {kind: "organizer",
    organizerId: "org-1"}));
  assert.equal(readContactPermission(value, {kind: "organizer",
    organizerId: "org-2"}), null);
  assert.equal(readContactPermission(value, {kind: "catch"}), null);
  assert.equal(readContactPermission(undefined, {kind: "catch"}), null);
});

test("the settings summary names the active grant or the latest stop",
  () => {
    const active = whatsappPermissionSummary(permission({
      "whatsapp:marketing": grant({receiptId: "marketing"}),
      "whatsapp:followerUpdates": grant({receiptId: "follower",
        source: "organizerFollowByPhone"}),
    }), "organizer");
    assert.deepEqual(active, {status: "optedIn", receiptId: "marketing",
      purposes: {marketing: {status: "optedIn", receiptId: "marketing"}}});
    const follower = whatsappPermissionSummary(permission({
      "whatsapp:followerUpdates": grant({receiptId: "follower"}),
    }), "organizer");
    assert.deepEqual(follower, {status: "optedIn", receiptId: "follower",
      purposes: {}});
    const stopped = whatsappPermissionSummary(permission({
      "whatsapp:eventOperations": grant({status: "optedOut",
        receiptId: "old-stop", updatedAt: at(1000)}),
      "whatsapp:marketing": grant({status: "optedOut",
        receiptId: "new-stop", updatedAt: at(3000)}),
    }), "organizer");
    assert.equal(stopped.status, "optedOut");
    assert.equal(stopped.receiptId, "new-stop");
    assert.deepEqual(whatsappPermissionSummary(null, "catch"),
      {status: "unknown", receiptId: null, purposes: {}});
  });
