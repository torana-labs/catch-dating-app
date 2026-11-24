import assert from "node:assert/strict";
import test from "node:test";
import {applicationDetailFormResponseChanged} from
  "../hostReadModels/applicationDetailViewTriggers";
import {deleteRunnerOne} from "./accountDeletionTestHarness";

// One test per collection of #2468 group 2 that organisers hold. runner-1
// is the deleted account; runner-2 is another guest.

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

test("deletion erases the account's open and closed waitlist offers and " +
  "keeps the accepted one behind its booking", async () => {
  const harness = await deleteRunnerOne({
    "eventWaitlistOffers/event1_runner-1": {eventId: "event1",
      uid: "runner-1", status: "active"},
    "eventWaitlistOffers/event2_runner-1": {eventId: "event2",
      uid: "runner-1", status: "expired"},
    "eventWaitlistOffers/event3_runner-1": {eventId: "event3",
      uid: "runner-1", status: "accepted"},
    "eventWaitlistOffers/event1_runner-2": {eventId: "event1",
      uid: "runner-2", status: "active"},
  });
  assert.ok(deletes(harness, "eventWaitlistOffers/event1_runner-1"));
  assert.ok(deletes(harness, "eventWaitlistOffers/event2_runner-1"));
  assert.ok(!deletes(harness, "eventWaitlistOffers/event3_runner-1"));
  assert.ok(!deletes(harness, "eventWaitlistOffers/event1_runner-2"));
});

test("deletion keeps paid admission receipts for payments", async () => {
  const harness = await deleteRunnerOne({
    "publicEventAdmissionReceipts/receipt-1": {eventId: "event1",
      recipientUid: "runner-1", amountPaise: 50000},
  });
  assert.ok(!touched(harness, "publicEventAdmissionReceipts/"));
});

test("deletion undoes and retires the account's offer invitation claims",
  async () => {
    const harness = await deleteRunnerOne({
      "organizerEventOfferRecipients/grant-1": {offerId: "offer-1",
        issuedByUid: "host-1", recipientUid: "runner-1",
        claimedAtMillis: 10, revokedAtMillis: null},
      "organizerEventOfferRecipients/grant-2": {offerId: "offer-1",
        issuedByUid: "host-1", recipientUid: "runner-1",
        claimedAtMillis: 10, revokedAtMillis: 20},
      "organizerEventOfferRecipients/grant-3": {offerId: "offer-1",
        issuedByUid: "host-1", recipientUid: "runner-2",
        claimedAtMillis: 10, revokedAtMillis: null},
    });
    const [first] = updatesOf(harness, "organizerEventOfferRecipients/grant-1");
    assert.equal(first.recipientUid, null);
    assert.equal(first.claimedAtMillis, null);
    assert.equal(typeof first.revokedAtMillis, "number");
    assert.equal(first.issuedByUid, undefined);
    assert.deepEqual(updatesOf(harness,
      "organizerEventOfferRecipients/grant-2"), [{recipientUid: null,
      claimedAtMillis: null, revokedAtMillis: 20}]);
    assert.deepEqual(updatesOf(harness,
      "organizerEventOfferRecipients/grant-3"), []);
  });

test("deletion unlinks the account's submitted form responses and keeps " +
  "the organiser's answers", async () => {
  const harness = await deleteRunnerOne({
    "organizerFormResponses/response-1": {organizerId: "club-1",
      respondentUid: "runner-1", answers: {q1: "Yes"}},
    "organizerFormResponses/response-2": {organizerId: "club-1",
      respondentUid: "runner-2", answers: {q1: "No"}},
  });
  assert.deepEqual(updatesOf(harness, "organizerFormResponses/response-1"),
    [{respondentUid: null}]);
  assert.ok(!deletes(harness, "organizerFormResponses/response-1"));
  assert.deepEqual(updatesOf(harness, "organizerFormResponses/response-2"),
    []);
});

test("deletion erases the account's form drafts except one locked by an " +
  "unresolved fee", async () => {
  const harness = await deleteRunnerOne({
    "organizerFormResponseDrafts/draft-1": {respondentUid: "runner-1",
      paymentAttemptId: null},
    "organizerFormResponseDrafts/draft-2": {respondentUid: "runner-1",
      paymentAttemptId: "attempt-1"},
    "organizerFormResponseDrafts/draft-3": {respondentUid: "runner-2",
      paymentAttemptId: null},
  });
  assert.ok(deletes(harness, "organizerFormResponseDrafts/draft-1"));
  assert.ok(!deletes(harness, "organizerFormResponseDrafts/draft-2"));
  assert.ok(!deletes(harness, "organizerFormResponseDrafts/draft-3"));
});

test("deletion erases the account's form uploads and their files",
  async () => {
    const harness = await deleteRunnerOne({
      "organizerFormAssets/asset-1": {respondentUid: "runner-1",
        storagePath: "organizerForms/club-1/form-1/asset-1"},
      "organizerFormAssets/asset-2": {respondentUid: "runner-2",
        storagePath: "organizerForms/club-1/form-1/asset-2"},
    });
    assert.ok(deletes(harness, "organizerFormAssets/asset-1"));
    assert.ok(!deletes(harness, "organizerFormAssets/asset-2"));
    assert.ok(harness.deletedStorageFiles.includes(
      "organizerForms/club-1/form-1/asset-1"));
    assert.ok(!harness.deletedStorageFiles.includes(
      "organizerForms/club-1/form-1/asset-2"));
  });

test("deletion unlinks the account's imported application answers",
  async () => {
    const harness = await deleteRunnerOne({
      "organizerApplicationResponses/answer-1": {applicationId: "app-1",
        linkedUid: "runner-1", answers: {}},
      "organizerApplicationResponses/answer-2": {applicationId: "app-2",
        linkedUid: "runner-2", answers: {}},
    });
    assert.deepEqual(updatesOf(harness,
      "organizerApplicationResponses/answer-1"), [{linkedUid: null}]);
    assert.deepEqual(updatesOf(harness,
      "organizerApplicationResponses/answer-2"), []);
  });

test("deletion unlinks the account's applications", async () => {
  const harness = await deleteRunnerOne({
    "organizerApplications/app-1": {organizerId: "club-1",
      linkedUid: "runner-1", reviewStatus: "approved"},
    "organizerApplications/app-2": {organizerId: "club-1",
      linkedUid: "runner-2", reviewStatus: "approved"},
  });
  const [patch] = updatesOf(harness, "organizerApplications/app-1");
  assert.equal(patch.linkedUid, null);
  assert.equal(patch.reviewStatus, undefined);
  assert.deepEqual(updatesOf(harness, "organizerApplications/app-2"), []);
});

test("an unlinked response refreshes the Host application view", () => {
  // The application write reconciles its view on every change; a
  // response losing its respondent is a change the view trigger acts on.
  assert.equal(applicationDetailFormResponseChanged(
    {organizerId: "club-1", status: "submitted", respondentUid: "runner-1"},
    {organizerId: "club-1", status: "submitted", respondentUid: null}),
  true);
});

test("deletion clears the follower from campaign receipts and excludes an " +
  "unsent one", async () => {
  const follower = {uid: "runner-1", postId: "post-1",
    permissionReceiptId: "receipt-1"};
  const harness = await deleteRunnerOne({
    "organizerCampaignRecipients/sent": {followerRecipient: follower,
      status: "delivered", eligibility: "eligible"},
    "organizerCampaignRecipients/pending": {followerRecipient: follower,
      status: "pending", eligibility: "eligible"},
    "organizerCampaignRecipients/other": {followerRecipient: {
      ...follower, uid: "runner-2"}, status: "pending"},
  });
  const [sent] = updatesOf(harness, "organizerCampaignRecipients/sent");
  assert.equal(sent.followerRecipient, null);
  assert.equal(sent.status, undefined);
  const [pending] = updatesOf(harness, "organizerCampaignRecipients/pending");
  assert.equal(pending.followerRecipient, null);
  assert.equal(pending.status, "suppressed");
  assert.equal(pending.eligibility, "excluded");
  assert.equal(pending.exclusionReason, "deleted");
  assert.deepEqual(updatesOf(harness, "organizerCampaignRecipients/other"),
    []);
});

test("deletion clears the account from invite attributions", async () => {
  const harness = await deleteRunnerOne({
    "eventInviteAttributions/credit-1": {inviteLinkId: "link-1",
      subjectUid: "runner-1", factKind: "booking"},
    "eventInviteAttributions/credit-2": {inviteLinkId: "link-1",
      subjectUid: "runner-2", factKind: "booking"},
  });
  assert.deepEqual(updatesOf(harness, "eventInviteAttributions/credit-1"),
    [{subjectUid: null}]);
  assert.deepEqual(updatesOf(harness, "eventInviteAttributions/credit-2"),
    []);
});

test("deletion clears the account as owner of its invite links and keeps " +
  "their counts", async () => {
  const harness = await deleteRunnerOne({
    "eventInviteLinks/link-1": {hostUid: "host-1", ownerUid: "runner-1",
      openCount: 4},
    "eventInviteLinks/link-2": {hostUid: "host-1", ownerUid: "runner-2",
      openCount: 1},
  });
  const [patch] = updatesOf(harness, "eventInviteLinks/link-1");
  assert.equal(patch.ownerUid, null);
  assert.equal(patch.openCount, undefined);
  assert.ok(!deletes(harness, "eventInviteLinks/link-1"));
  assert.deepEqual(updatesOf(harness, "eventInviteLinks/link-2"), []);
});

test("deletion erases the account's invite touches", async () => {
  const harness = await deleteRunnerOne({
    "eventInviteTouches/touch-1": {inviteLinkId: "link-1",
      actorUid: "runner-1"},
    "eventInviteTouches/touch-2": {inviteLinkId: "link-1",
      actorUid: "runner-2"},
  });
  assert.ok(deletes(harness, "eventInviteTouches/touch-1"));
  assert.ok(!deletes(harness, "eventInviteTouches/touch-2"));
});

test("deletion erases the account's share intents", async () => {
  const harness = await deleteRunnerOne({
    "eventShareIntents/intent-1": {inviteLinkId: "link-1",
      actorUid: "runner-1"},
    "eventShareIntents/intent-2": {inviteLinkId: "link-1",
      actorUid: "runner-2"},
  });
  assert.ok(deletes(harness, "eventShareIntents/intent-1"));
  assert.ok(!deletes(harness, "eventShareIntents/intent-2"));
});
