import assert from "node:assert/strict";
import test from "node:test";
import * as admin from "firebase-admin";
import {
  inboundStopPermissionReceipt,
  organizerUpdatesConsentCopyHash,
  publicRegistrationPermissionReceipt,
} from "./organizerCommunicationPreferences";
import {contractValidator} from "./contractTestValidators";

const validReceipt = contractValidator("ContactPermissionReceiptDocument");

const now = admin.firestore.Timestamp.fromMillis(1_000);

test("registration receipt binds reviewed copy and participant identity",
  () => {
    const receipt = publicRegistrationPermissionReceipt({
      organizerId: "organizer-1",
      uid: "user-1",
      channel: "whatsapp",
      eventId: "event-1",
      termsVersion: "organizer-updates-v1",
      endpointE164: "+919812345678",
      supersedesReceiptId: null,
      now,
    });
    assert.ok(receipt);
    assert.equal(validReceipt(receipt.document), true);
    assert.equal(receipt.document.senderId, "organizer-1");
    assert.equal(receipt.document.purpose, "marketing");
    assert.equal(receipt.document.endpointE164, "+919812345678");
    assert.equal(receipt.document.evidenceStatus, "complete");
    assert.equal(receipt.document.identityStrength, "phoneVerified");
    assert.equal(receipt.document.actorUid, "user-1");
    assert.equal(
      receipt.document.consentCopyHash,
      organizerUpdatesConsentCopyHash("organizer-updates-v1", "whatsapp")
    );
    assert.equal(
      publicRegistrationPermissionReceipt({
        organizerId: "organizer-1",
        uid: "user-1",
        channel: "whatsapp",
        eventId: "event-1",
        termsVersion: "unreviewed-v2",
        endpointE164: "+919812345678",
        supersedesReceiptId: null,
        now,
      }),
      null
    );
  });

test("STOP appends a withdrawal that supersedes but does not erase a grant",
  () => {
    const receipt = inboundStopPermissionReceipt({
      organizerId: "organizer-1",
      uid: "user-1",
      providerEventId: "inbound:wamid-1",
      supersedesReceiptId: "grant-1",
      now,
    });
    assert.equal(validReceipt(receipt.document), true);
    assert.equal(receipt.document.decision, "optedOut");
    assert.equal(receipt.document.source, "inboundStop");
    assert.equal(receipt.document.supersedesReceiptId, "grant-1");
    assert.equal(receipt.document.revokedAt?.toMillis(), 1_000);
  });
