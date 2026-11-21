import {isDeepStrictEqual} from "node:util";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import type {
  HostSendSummaryDocument,
  OrganizerBroadcastSummaryDocument,
  OrganizerCampaignDocument,
  OrganizerPostDeliveryOperationDocument,
  OrganizerPostDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  announcementSendRow,
  campaignSendRow,
  followerUpdateSendRow,
  type SendRow,
} from "../organizers/organizerSends";

export const hostSendSummariesCollection = "hostSendSummaries";

/** One Send a view row is built from. */
export type SendSource =
  | {kind: "campaign"; campaignId: string}
  | {kind: "announcement"; broadcastId: string}
  | {kind: "followerUpdate"; organizerId: string; postId: string};

/**
 * The view id of one Send: its kind and source id.
 * @param {SendSource} source The Send.
 * @return {string} The hostSendSummaries document id.
 */
export function sendSummaryId(source: SendSource): string {
  switch (source.kind) {
  case "campaign":
    return `campaign_${source.campaignId}`;
  case "announcement":
    return `announcement_${source.broadcastId}`;
  case "followerUpdate":
    return `followerUpdate_${source.postId}`;
  }
}

const nonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

/**
 * Wraps one Sends row as its view document.
 * @param {string} organizerId The owning organizer.
 * @param {SendSource} source The Send.
 * @param {SendRow} row Exactly the retired listOrganizerCampaigns row.
 * @return {HostSendSummaryDocument} The view.
 */
function summary(organizerId: string, source: SendSource,
  row: SendRow): HostSendSummaryDocument {
  return {organizerId, sendId: sendSummaryId(source), kind: source.kind,
    activityAtMillis: row.activityAtMillis, row, version: 1};
}

/**
 * The name of one organizer-owned document, or null when it is missing or
 * belongs to another organizer.
 * @param {FirebaseFirestore.Transaction} tx The read transaction.
 * @param {FirebaseFirestore.DocumentReference} ref The document.
 * @param {string} organizerId The campaign's organizer.
 * @return {Promise<string|null>} The name.
 */
async function ownedName(tx: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference,
  organizerId: string): Promise<string | null> {
  const snapshot = await tx.get(ref);
  const data = snapshot.data();
  return data?.organizerId === organizerId && nonEmpty(data.name) ?
    data.name : null;
}

/**
 * Reads one Send's view from current sources inside a transaction, without
 * writing, or null when the Send is absent, has no owner, or is a follower
 * update's WhatsApp leg. The row is exactly what the retired
 * listOrganizerCampaigns callable returned for it.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {FirebaseFirestore.Transaction} tx The read transaction.
 * @param {SendSource} source The Send.
 * @return {Promise<HostSendSummaryDocument|null>} The view.
 */
export async function readHostSendSummary(db: FirebaseFirestore.Firestore,
  tx: FirebaseFirestore.Transaction,
  source: SendSource): Promise<HostSendSummaryDocument | null> {
  switch (source.kind) {
  case "campaign": {
    const snapshot = await tx.get(db.collection("organizerCampaigns")
      .doc(source.campaignId));
    const campaign = snapshot.data() as OrganizerCampaignDocument | undefined;
    if (!campaign || !nonEmpty(campaign.organizerId)) return null;
    const organizerId = campaign.organizerId;
    const templateName = nonEmpty(campaign.templateId) ? await ownedName(tx,
      db.collection("organizerMessageTemplates").doc(campaign.templateId),
      organizerId) : null;
    const savedAudienceName = nonEmpty(campaign.savedAudienceId) ?
      await ownedName(tx, db.collection("organizerSavedAudiences")
        .doc(campaign.savedAudienceId), organizerId) : null;
    const row = campaignSendRow(source.campaignId, campaign,
      {templateName, savedAudienceName});
    return row ? summary(organizerId, source, row) : null;
  }
  case "announcement": {
    const snapshot = await tx.get(db.collection("organizerBroadcastSummaries")
      .doc(source.broadcastId));
    const announcement = snapshot.data() as
      OrganizerBroadcastSummaryDocument | undefined;
    if (!announcement || !nonEmpty(announcement.organizerId) ||
        announcement.broadcastId !== source.broadcastId) return null;
    return summary(announcement.organizerId, source,
      announcementSendRow(announcement));
  }
  case "followerUpdate": {
    const [postSnapshot, operationSnapshot] = await Promise.all([
      tx.get(db.collection(`organizers/${source.organizerId}/posts`)
        .doc(source.postId)),
      tx.get(db.collection("organizerPostDeliveryOperations")
        .doc(source.postId)),
    ]);
    const post = postSnapshot.data() as OrganizerPostDocument | undefined;
    if (!post) return null;
    const operation = operationSnapshot.data() as
      OrganizerPostDeliveryOperationDocument | undefined;
    return summary(source.organizerId, source, followerUpdateSendRow(
      source.postId, post,
      operation?.organizerId === source.organizerId ? operation : undefined));
  }
  }
}

/**
 * Rewrites one Send's view from current sources, writing only on change.
 * A source that fails its contract is logged and keeps its previous view
 * rather than blocking a trigger retry loop; the nightly data validation
 * reports the document.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {SendSource} source The Send.
 * @return {Promise<void>} Resolves once the view matches its sources.
 */
export async function reconcileSendSummary(db: FirebaseFirestore.Firestore,
  source: SendSource): Promise<void> {
  await db.runTransaction(async (tx) => {
    const ref = db.collection(hostSendSummariesCollection)
      .doc(sendSummaryId(source));
    const old = await tx.get(ref);
    let next: HostSendSummaryDocument | null;
    try {
      next = await readHostSendSummary(db, tx, source);
    } catch (error) {
      logger.warn("Send summary view kept a source that fails its contract.",
        {sendId: ref.id,
          reason: error instanceof Error ? error.message : String(error)});
      return;
    }
    if (isDeepStrictEqual(old.data() ?? null, next)) return;
    if (next) tx.set(ref, next);
    else if (old.exists) tx.delete(ref);
  });
}

/**
 * Reconciles the campaign rows that show a renamed template or saved
 * audience, in bounded pages. Only a change to the name or owner matters.
 * @param {FirebaseFirestore.Firestore} db Firestore.
 * @param {"templateId"|"savedAudienceId"} field The campaign field.
 * @param {string} id The template or saved audience id.
 * @param {FirebaseFirestore.DocumentData|undefined} before Old data.
 * @param {FirebaseFirestore.DocumentData|undefined} after New data.
 * @return {Promise<number>} How many campaigns were reconciled.
 */
export async function refreshNamedCampaignSummaries(
  db: FirebaseFirestore.Firestore, field: "templateId" | "savedAudienceId",
  id: string, before: FirebaseFirestore.DocumentData | undefined,
  after: FirebaseFirestore.DocumentData | undefined): Promise<number> {
  if (before?.name === after?.name &&
      before?.organizerId === after?.organizerId) return 0;
  let reconciled = 0;
  let cursor: string | undefined;
  do {
    let query = db.collection("organizerCampaigns").where(field, "==", id)
      .orderBy(admin.firestore.FieldPath.documentId()).limit(100);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const doc of page.docs) {
      await reconcileSendSummary(db, {kind: "campaign", campaignId: doc.id});
      reconciled++;
    }
    cursor = page.docs.length === 100 ? page.docs.at(-1)?.id : undefined;
  } while (cursor);
  return reconciled;
}
