import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";
import {DELETED_ACCOUNT_UID} from "./accountDeletionSupportRecords";
import {supportExpiresAtMillis} from "../shared/supportRetention";
import {deleteRunnerOne} from "./accountDeletionTestHarness";

// One test per collection of #2468 group 2 that Catch holds about the
// guest outside events. runner-1 is the deleted account; runner-2 is
// another person.

type Harness = Awaited<ReturnType<typeof deleteRunnerOne>>;
const deletes = (harness: Harness, path: string) =>
  harness.deletedPublicDocs.includes(path);
const updatesOf = (harness: Harness, path: string) =>
  harness.updateWrites.filter((write) => write.path === path)
    .map((write) => write.data);
const touched = (harness: Harness, prefix: string) =>
  [...harness.deletedPublicDocs, ...harness.updateWrites.map((w) => w.path),
    ...harness.setWrites.map((w) => w.path)]
    .some((path) => path.startsWith(prefix));

test("deletion unlinks the account's support conversations and starts " +
  "the retention clock of a closed one", async () => {
  const later = Timestamp.fromMillis(Date.now() + 400 * 24 * 3600_000);
  const harness = await deleteRunnerOne({
    "supportConversations/whatsapp-1": {uid: "runner-1",
      ownerUid: "staff-1", status: "open"},
    "supportConversations/whatsapp-2": {uid: "runner-2",
      ownerUid: "staff-1", status: "open"},
    "supportConversations/whatsapp-3": {uid: "runner-1", status: "closed",
      expiresAt: Timestamp.fromMillis(Date.now())},
    "supportConversations/whatsapp-3/messages/m1": {direction: "inbound",
      authorUid: null},
    "supportConversations/whatsapp-4": {uid: "runner-1", status: "closed",
      expiresAt: later},
  });
  assert.deepEqual(updatesOf(harness, "supportConversations/whatsapp-1"),
    [{uid: null}]);
  assert.ok(!deletes(harness, "supportConversations/whatsapp-1"));
  assert.deepEqual(updatesOf(harness, "supportConversations/whatsapp-2"),
    []);
  // A closed conversation is kept at least 180 days after the deletion,
  // with its messages.
  const [closed] = updatesOf(harness, "supportConversations/whatsapp-3");
  assert.equal(closed.uid, null);
  const expiry = (closed.expiresAt as Timestamp).toMillis();
  assert.ok(Math.abs(expiry - supportExpiresAtMillis(Date.now())) < 60_000);
  assert.deepEqual(updatesOf(harness,
    "supportConversations/whatsapp-3/messages/m1"),
  [{expiresAt: closed.expiresAt}]);
  // A later expiry is kept.
  const [kept] = updatesOf(harness, "supportConversations/whatsapp-4");
  assert.ok((kept.expiresAt as Timestamp).isEqual(later));
});

test("deletion keeps support messages, whose author is staff", async () => {
  const harness = await deleteRunnerOne({
    "supportConversations/whatsapp-1": {uid: "runner-1"},
    "supportConversations/whatsapp-1/messages/m1": {direction: "inbound",
      authorUid: null, text: "Hello"},
    "supportConversations/whatsapp-1/messages/m2": {direction: "outbound",
      authorUid: "staff-1", text: "Hi"},
  });
  assert.ok(!touched(harness, "supportConversations/whatsapp-1/messages/"));
});

test("deletion keeps Catch support reply claims", async () => {
  const harness = await deleteRunnerOne({
    "catchWhatsappReplyOperations/cwreply_1": {recipientUid: "runner-1",
      actorUid: "staff-1", state: "completed"},
  });
  assert.ok(!touched(harness, "catchWhatsappReplyOperations/"));
});

test("deletion erases approval delivery records addressed to the account",
  async () => {
    const harness = await deleteRunnerOne({
      "deliveryMessages/outbox-1": {intent: {context: {uid: "runner-1",
        eventId: "event1"}}},
      "deliveryMessages/outbox-2": {intent: {context: {uid: "runner-2",
        eventId: "event1"}}},
      "deliveryMessages/outbox-3": {intent: {context: {organizerId:
        "club-1"}}},
    });
    assert.ok(deletes(harness, "deliveryMessages/outbox-1"));
    assert.ok(!deletes(harness, "deliveryMessages/outbox-2"));
    assert.ok(!deletes(harness, "deliveryMessages/outbox-3"));
  });

test("deletion erases WhatsApp dispatches addressed to the account",
  async () => {
    const harness = await deleteRunnerOne({
      "whatsappDispatches/attempt-1": {context: {uid: "runner-1"}},
      "whatsappDispatches/attempt-2": {context: {uid: "runner-2"}},
    });
    assert.ok(deletes(harness, "whatsappDispatches/attempt-1"));
    assert.ok(!deletes(harness, "whatsappDispatches/attempt-2"));
  });

test("deletion erases the account's try-it workspace pointer", async () => {
  const harness = await deleteRunnerOne({
    "tryItWorkspaces/runner-1": {uid: "runner-1", organizerId: "org1"},
    "tryItWorkspaces/runner-2": {uid: "runner-2", organizerId: "org2"},
  });
  assert.ok(deletes(harness, "tryItWorkspaces/runner-1"));
  assert.ok(!deletes(harness, "tryItWorkspaces/runner-2"));
});

test("deletion erases the account's launch access application", async () => {
  const harness = await deleteRunnerOne({
    "accessApplications/runner-1": {status: "pending", whyCatch: "Friends"},
    "accessApplications/runner-2": {status: "pending"},
  });
  assert.ok(deletes(harness, "accessApplications/runner-1"));
  assert.ok(!deletes(harness, "accessApplications/runner-2"));
});

test("deletion redacts the account as submitter of listing work items",
  async () => {
    const harness = await deleteRunnerOne({
      "operationWorkItems/item-1": {normalizedPayload: {intake: {listing: {
        submittedBy: {role: "organizer", uid: "runner-1",
          partnerId: null}}}}},
      "operationWorkItems/item-2": {normalizedPayload: {intake: {listing: {
        submittedBy: {role: "organizer", uid: "runner-2",
          partnerId: null}}}}},
    });
    assert.deepEqual(updatesOf(harness, "operationWorkItems/item-1"),
      [{"normalizedPayload.intake.listing.submittedBy.uid": null}]);
    assert.deepEqual(updatesOf(harness, "operationWorkItems/item-2"), []);
  });

test("deletion redacts the account from its intake requests", async () => {
  const harness = await deleteRunnerOne({
    "supplyIntakeRequests/request-1": {tryItImport: {uid: "runner-1",
      organizerId: "org1"}, request: {submittedBy: {role: "organizer",
      uid: "runner-1", partnerId: null}}},
    "supplyIntakeRequests/request-2": {request: {submittedBy: {
      role: "associate", uid: "runner-1", partnerId: null}}},
    "supplyIntakeRequests/request-3": {tryItImport: {uid: "runner-2",
      organizerId: "org2"}},
  });
  assert.deepEqual(updatesOf(harness, "supplyIntakeRequests/request-1"), [{
    "tryItImport.uid": DELETED_ACCOUNT_UID,
    "request.submittedBy.uid": null,
  }]);
  // A staff submitter is left for the staff-access pass.
  assert.deepEqual(updatesOf(harness, "supplyIntakeRequests/request-2"), []);
  assert.deepEqual(updatesOf(harness, "supplyIntakeRequests/request-3"), []);
});

test("deletion erases the account's nominator entry", async () => {
  const harness = await deleteRunnerOne({
    "supplyNominators/nominator-1": {uid: "runner-1", role: "guest"},
    "supplyNominators/nominator-2": {uid: "runner-2", role: "guest"},
  });
  assert.ok(deletes(harness, "supplyNominators/nominator-1"));
  assert.ok(!deletes(harness, "supplyNominators/nominator-2"));
});

test("deletion clears the account as nominator of inbox items", async () => {
  const harness = await deleteRunnerOne({
    "adminInboxItems/item-1": {nominatorUid: "runner-1",
      assigneeUid: "staff-1"},
    "adminInboxItems/item-2": {nominatorUid: "runner-2",
      assigneeUid: "staff-1"},
  });
  assert.deepEqual(updatesOf(harness, "adminInboxItems/item-1"),
    [{nominatorUid: null}]);
  assert.deepEqual(updatesOf(harness, "adminInboxItems/item-2"), []);
});
