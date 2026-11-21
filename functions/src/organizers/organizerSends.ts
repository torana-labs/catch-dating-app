import {followerWhatsappResponse} from "./organizerFollowerWhatsappLeg";
import type {
  HostSendSummaryDocument,
  OrganizerBroadcastSummaryDocument,
  OrganizerCampaignDocument,
  OrganizerPostDeliveryOperationDocument,
  OrganizerPostDocument,
} from "../shared/generated/firestoreAdminTypes";

// The Host Sends rows the hostSendSummaries read model stores.

export type SendRow = HostSendSummaryDocument["row"];

/**
 * Whether a campaign is a follower update's WhatsApp leg, which is shown on
 * its follower update row rather than as a row of its own.
 * @param {OrganizerCampaignDocument} campaign The campaign.
 * @return {boolean} True for a follower update leg.
 */
export function isFollowerUpdateLeg(
  campaign: OrganizerCampaignDocument,
): boolean {
  return campaign.recipientSource?.kind === "organizerFollowers";
}

/**
 * One campaign's Sends row, or null for a follower update's WhatsApp leg.
 * The callable and the hostSendSummaries read model both use it.
 * @param {string} campaignId The campaign document id.
 * @param {OrganizerCampaignDocument} campaign The campaign.
 * @param {object} names The template and saved audience names, if known.
 * @return {SendRow|null} The row, or null.
 */
export function campaignSendRow(
  campaignId: string,
  campaign: OrganizerCampaignDocument,
  names: {templateName: string | null; savedAudienceName: string | null},
): SendRow | null {
  if (isFollowerUpdateLeg(campaign)) return null;
  return {
    kind: "campaign",
    campaignId,
    name: campaign.name,
    status: campaign.status,
    savedAudienceId: campaign.savedAudienceId ?? null,
    savedAudienceName: campaign.savedAudienceId ?
      names.savedAudienceName : null,
    segmentIds: campaign.segmentIds,
    templateId: campaign.templateId,
    templateName: names.templateName,
    audienceCounts: campaign.audienceCounts,
    deliveryCounts: campaign.deliveryCounts,
    scheduledAtMillis: campaign.scheduledAt?.toMillis() ?? null,
    dispatchedAtMillis: campaign.dispatchedAt?.toMillis() ?? null,
    activityAtMillis: campaign.createdAt.toMillis(),
  };
}

/**
 * One event announcement's Sends row.
 * @param {OrganizerBroadcastSummaryDocument} announcement The summary.
 * @return {SendRow} The row.
 */
export function announcementSendRow(
  announcement: OrganizerBroadcastSummaryDocument,
): SendRow {
  return {
    kind: "announcement",
    broadcastId: announcement.broadcastId,
    eventId: announcement.eventId,
    eventName: announcement.eventName,
    audience: announcement.audience,
    recipientCount: announcement.recipientCount,
    sentAtMillis: announcement.sentAt.toMillis(),
    partialFailure: announcement.partialFailure,
    activityAtMillis: announcement.sentAt.toMillis(),
  };
}

/**
 * One follower update's Sends row, with its delivery operation's counts when
 * the operation exists.
 * @param {string} postId The post document id.
 * @param {OrganizerPostDocument} post The post.
 * @param {OrganizerPostDeliveryOperationDocument|undefined} operation Its
 *   delivery operation, if any.
 * @return {SendRow} The row.
 */
export function followerUpdateSendRow(
  postId: string,
  post: OrganizerPostDocument,
  operation: OrganizerPostDeliveryOperationDocument | undefined,
): SendRow {
  const deliveryStatus = operation?.status === "processing" ?
    "pending" : operation?.status ?? "unknown";
  return {
    kind: "followerUpdate",
    postId,
    eventId: post.eventId ?? null,
    audience: post.audience,
    status: post.status,
    deliveryStatus,
    recipientCount: operation?.recipientCount ?? 0,
    excludedCount: operation?.excludedCount ?? 0,
    activityAvailableCount: operation?.activityAvailableCount ?? 0,
    pushAttemptedCount: operation?.pushAttemptedCount ?? 0,
    pushAcceptedCount: operation?.pushAcceptedCount ?? 0,
    pushFailedCount: operation?.pushFailedCount ?? 0,
    pushUnknownCount: operation?.pushUnknownCount ?? 0,
    createdAtMillis: post.createdAt.toMillis(),
    activityAtMillis: post.createdAt.toMillis(),
    ...(operation?.whatsapp ?
      {whatsapp: followerWhatsappResponse(operation.whatsapp)} : {}),
  };
}
