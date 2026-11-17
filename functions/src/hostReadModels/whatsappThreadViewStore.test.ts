import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {AudienceTestStore} from "../organizers/organizerAudienceTestStore";
import {
  organizerWhatsappThreadId,
  whatsappThreadSummary,
} from "../organizers/organizerWhatsappThreads";
import type {
  OrganizerContactDocument,
  OrganizerWhatsappThreadDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  contactWhatsappThreadIds,
  hostWhatsappThreadView,
  reconcileWhatsappThreadView,
} from "./whatsappThreadViewStore";

const at = (millis: number) => Timestamp.fromMillis(millis);
const threadId = organizerWhatsappThreadId("org", "contact-1");
const now = 50_000;

function thread(overrides: Record<string, unknown> = {}) {
  return {schemaVersion: 1, threadId, organizerId: "org",
    contactId: "contact-1", connectionId: "connection-1",
    endpointHash: "a".repeat(64), eventIds: ["event-1"],
    lastMessageBody: "See you at 7?", lastMessageDirection: "inbound",
    lastMessageAt: at(40_000), lastInboundAt: at(40_000),
    serviceWindowExpiresAt: at(40_000 + 86_400_000), messageCount: 3,
    createdAt: at(1_000), updatedAt: at(40_000), expiresAt: at(900_000),
    ...overrides};
}

function contact(overrides: Record<string, unknown> = {}) {
  return {organizerId: "org", displayName: "Riya", displayNameOverride: null,
    linkedUid: "riya", identityState: "verified",
    identityConfidence: "verified", deletedAt: null, hiddenAt: null,
    mergedIntoContactId: null, lastSeenAt: at(1), ...overrides};
}

test("the view is the list callable's summary plus retention, nothing more",
  () => {
    const view = hostWhatsappThreadView(threadId, thread(),
      contact() as unknown as OrganizerContactDocument, now);
    assert.deepEqual(view, {organizerId: "org", threadId,
      contactId: "contact-1", linkedUid: "riya", displayName: "Riya",
      eventIds: ["event-1"], lastMessageBody: "See you at 7?",
      lastMessageDirection: "inbound", lastMessageAtMillis: 40_000,
      lastInboundAtMillis: 40_000,
      serviceWindowExpiresAtMillis: 40_000 + 86_400_000,
      expiresAtMillis: 900_000, version: 1});
    // Exactly the callable's summary fields.
    const {organizerId: _organizerId, expiresAtMillis: _expires,
      version: _version, ...rest} = view!;
    void _organizerId;
    void _expires;
    void _version;
    assert.deepEqual(rest, whatsappThreadSummary(threadId,
      thread() as unknown as OrganizerWhatsappThreadDocument,
      contact() as unknown as OrganizerContactDocument));
    // No phone hash, sender connection or message count reaches the client.
    const json = JSON.stringify(view);
    assert.equal(json.includes("a".repeat(64)), false);
    assert.equal(json.includes("connection-1"), false);
    assert.equal("messageCount" in view!, false);
  });

test("an unverified, foreign or missing contact keeps the callable fallbacks",
  () => {
    const unverified = hostWhatsappThreadView(threadId, thread(),
      contact({identityState: "unverified", displayNameOverride: "R."}) as
        unknown as OrganizerContactDocument, now);
    assert.equal(unverified?.linkedUid, null);
    assert.equal(unverified?.displayName, "R.");
    const foreign = hostWhatsappThreadView(threadId, thread(),
      contact({organizerId: "other"}) as unknown as OrganizerContactDocument,
      now);
    assert.equal(foreign?.displayName, "Customer");
    assert.equal(foreign?.linkedUid, null);
    assert.equal(hostWhatsappThreadView(threadId, thread(), undefined, now)
      ?.displayName, "Customer");
  });

test("a missing, ownerless or expired thread has no view", () => {
  assert.equal(hostWhatsappThreadView(threadId, undefined, undefined, now),
    null);
  assert.equal(hostWhatsappThreadView(threadId, thread({organizerId: ""}),
    undefined, now), null);
  assert.equal(hostWhatsappThreadView(threadId,
    thread({expiresAt: at(now)}), undefined, now), null);
  assert.throws(() => hostWhatsappThreadView("owt_other", thread(),
    undefined, now), /does not match/);
});

test("reconcile follows the thread and contact and writes only on change",
  async () => {
    const db = new AudienceTestStore({
      [`organizerWhatsappThreads/${threadId}`]: thread(),
      "organizerContacts/contact-1": contact(),
    });
    await reconcileWhatsappThreadView(db.asFirestore(), threadId, now);
    const first = db.docs[`hostWhatsappThreadViews/${threadId}`];
    assert.equal(first.displayName, "Riya");
    const same = first;
    await reconcileWhatsappThreadView(db.asFirestore(), threadId, now);
    assert.equal(db.docs[`hostWhatsappThreadViews/${threadId}`], same);

    db.docs["organizerContacts/contact-1"] = contact({linkedUid: null,
      identityState: "unlinked", displayNameOverride: "Riya S"});
    await reconcileWhatsappThreadView(db.asFirestore(), threadId, now);
    assert.equal(db.docs[`hostWhatsappThreadViews/${threadId}`].linkedUid,
      null);
    assert.equal(db.docs[`hostWhatsappThreadViews/${threadId}`].displayName,
      "Riya S");

    delete db.docs[`organizerWhatsappThreads/${threadId}`];
    await reconcileWhatsappThreadView(db.asFirestore(), threadId, now);
    assert.equal(db.docs[`hostWhatsappThreadViews/${threadId}`], undefined);
  });

test("a thread that fails its contract keeps its view and does not throw",
  async () => {
    const kept = {organizerId: "org", threadId, version: 1};
    const db = new AudienceTestStore({
      [`organizerWhatsappThreads/${threadId}`]: thread({expiresAt: null}),
      [`hostWhatsappThreadViews/${threadId}`]: kept,
    });
    await reconcileWhatsappThreadView(db.asFirestore(), threadId, now);
    assert.equal(db.docs[`hostWhatsappThreadViews/${threadId}`], kept);
  });

test("only contact fields the view reads route a contact write", () => {
  assert.deepEqual(contactWhatsappThreadIds("contact-1", contact(),
    contact({lastSeenAt: at(2), searchName: "riya"})), []);
  assert.deepEqual(contactWhatsappThreadIds("contact-1", contact(),
    contact({displayNameOverride: "R."})), [threadId]);
  assert.deepEqual(contactWhatsappThreadIds("contact-1", undefined,
    contact()), [threadId]);
  assert.deepEqual(contactWhatsappThreadIds("contact-1", contact(),
    undefined), [threadId]);
  assert.deepEqual(contactWhatsappThreadIds("contact-1", undefined,
    undefined), []);
});
