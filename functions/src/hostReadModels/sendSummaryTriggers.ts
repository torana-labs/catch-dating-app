import * as admin from "firebase-admin";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {
  reconcileSendSummary,
  refreshNamedCampaignSummaries,
} from "./sendSummaryStore";

const options = {retry: true};

/** A campaign's row follows the campaign: drafts, approval, delivery. */
export const onHostSendCampaignChanged = onDocumentWritten({
  ...options, document: "organizerCampaigns/{campaignId}",
}, (event) => reconcileSendSummary(admin.firestore(),
  {kind: "campaign", campaignId: event.params.campaignId}));

/** An announcement's row follows its broadcast summary. */
export const onHostSendAnnouncementChanged = onDocumentWritten({
  ...options, document: "organizerBroadcastSummaries/{broadcastId}",
}, (event) => reconcileSendSummary(admin.firestore(),
  {kind: "announcement", broadcastId: event.params.broadcastId}));

/** A follower update's row follows its post. */
export const onHostSendFollowerPostChanged = onDocumentWritten({
  ...options, document: "organizers/{organizerId}/posts/{postId}",
}, (event) => reconcileSendSummary(admin.firestore(), {kind: "followerUpdate",
  organizerId: event.params.organizerId, postId: event.params.postId}));

/** A follower update's row follows its delivery counts. */
export const onHostSendFollowerDeliveryChanged = onDocumentWritten({
  ...options, document: "organizerPostDeliveryOperations/{postId}",
}, async (event) => {
  const organizerIds = new Set([event.data?.before.get("organizerId"),
    event.data?.after.get("organizerId")]);
  for (const organizerId of organizerIds) {
    if (typeof organizerId !== "string" || !organizerId) continue;
    await reconcileSendSummary(admin.firestore(), {kind: "followerUpdate",
      organizerId, postId: event.params.postId});
  }
});

/** A template rename reaches the campaign rows that name it. */
export const onHostSendTemplateChanged = onDocumentWritten({
  ...options, document: "organizerMessageTemplates/{templateId}",
}, async (event) => {
  await refreshNamedCampaignSummaries(admin.firestore(), "templateId",
    event.params.templateId, event.data?.before.data(),
    event.data?.after.data());
});

/** A saved audience rename reaches the campaign rows that name it. */
export const onHostSendSavedAudienceChanged = onDocumentWritten({
  ...options, document: "organizerSavedAudiences/{audienceId}",
}, async (event) => {
  await refreshNamedCampaignSummaries(admin.firestore(), "savedAudienceId",
    event.params.audienceId, event.data?.before.data(),
    event.data?.after.data());
});
