import * as admin from "firebase-admin";
import type {DeletionWriter} from "./accountDeletion";

type Db = FirebaseFirestore.Firestore;
type StorageBucket = ReturnType<ReturnType<typeof admin.storage>["bucket"]>;

/** Campaign recipient states a send can still leave. */
const OPEN_CAMPAIGN_RECIPIENT_STATES = new Set(["pending"]);

/**
 * Erases the guest's own records that organisers hold (#2468, group 2):
 * waitlist offers, form drafts and uploads, invite touches and share
 * intents are deleted; submitted form responses, applications and their
 * answers, offer invitations, campaign receipts, invite attributions and
 * guest-owned invite links stay with the organiser without the account's
 * uid. Paid admission receipts are kept for payments.
 * @param {object} params Inputs.
 * @param {Db} params.db Firestore.
 * @param {string} params.uid The account being deleted.
 * @param {DeletionWriter} params.writer Deletion writes.
 * @param {StorageBucket} params.bucket The default Storage bucket.
 * @param {number} params.nowMillis Clock.
 */
export async function queueOrganizerRecordCleanup(params: {
  db: Db;
  uid: string;
  writer: DeletionWriter;
  bucket: StorageBucket;
  nowMillis: number;
}): Promise<void> {
  const {db, uid, writer, bucket, nowMillis} = params;
  const byField = (collection: string, field: string) =>
    db.collection(collection).where(field, "==", uid).get();
  const [offers, recipientGrants, responses, drafts, assets,
    applicationResponses, applications, campaignRecipients, attributions,
    inviteLinks, touches, shareIntents] = await Promise.all([
    byField("eventWaitlistOffers", "uid"),
    byField("organizerEventOfferRecipients", "recipientUid"),
    byField("organizerFormResponses", "respondentUid"),
    byField("organizerFormResponseDrafts", "respondentUid"),
    byField("organizerFormAssets", "respondentUid"),
    byField("organizerApplicationResponses", "linkedUid"),
    byField("organizerApplications", "linkedUid"),
    byField("organizerCampaignRecipients", "followerRecipient.uid"),
    byField("eventInviteAttributions", "subjectUid"),
    byField("eventInviteLinks", "ownerUid"),
    byField("eventInviteTouches", "actorUid"),
    byField("eventShareIntents", "actorUid"),
  ]);
  const now = admin.firestore.FieldValue.serverTimestamp();

  // An accepted offer is the record of the booking it produced, which
  // deletion keeps (status deleted) for the roster and the seat ledger.
  offers.forEach((doc) => {
    if (doc.data().status !== "accepted") writer.delete(doc.ref);
  });
  // An unclaimed grant has no uid and a revoked one cannot be claimed, so
  // the account's claim is undone and the invitation retired together.
  recipientGrants.forEach((doc) => writer.update(doc.ref, {
    recipientUid: null,
    claimedAtMillis: null,
    revokedAtMillis: doc.data().revokedAtMillis ?? nowMillis,
  }));
  // A response and its derived application lose the uid together, so the
  // organiser still sees the answers (organizerApplicationAccess matches
  // respondentUid to linkedUid).
  responses.forEach((doc) => writer.update(doc.ref, {respondentUid: null}));
  applicationResponses.forEach((doc) =>
    writer.update(doc.ref, {linkedUid: null}));
  applications.forEach((doc) =>
    writer.update(doc.ref, {linkedUid: null, updatedAt: now}));
  // A draft locked by an unresolved fee stays until the payment settles;
  // payment reconciliation reads it.
  drafts.forEach((doc) => {
    if (doc.data().paymentAttemptId == null) writer.delete(doc.ref);
  });
  await Promise.all(assets.docs.map(async (doc) => {
    const path = doc.data().storagePath;
    if (typeof path === "string" && path.startsWith("organizerForms/")) {
      await bucket.file(path).delete({ignoreNotFound: true});
    }
    writer.delete(doc.ref);
  }));
  // Clearing followerRecipient sends the row down the contact path, which
  // suppresses a row with no contact as deleted; a row not yet sent is
  // excluded now as well.
  campaignRecipients.forEach((doc) => {
    const patch: FirebaseFirestore.DocumentData = {
      followerRecipient: null, updatedAt: now};
    if (OPEN_CAMPAIGN_RECIPIENT_STATES.has(doc.data().status)) {
      Object.assign(patch, {eligibility: "excluded",
        exclusionReason: "deleted", status: "suppressed"});
    }
    writer.update(doc.ref, patch);
  });
  attributions.forEach((doc) => writer.update(doc.ref, {subjectUid: null}));
  inviteLinks.forEach((doc) =>
    writer.update(doc.ref, {ownerUid: null, updatedAt: now}));
  touches.forEach((doc) => writer.delete(doc.ref));
  shareIntents.forEach((doc) => writer.delete(doc.ref));
}
