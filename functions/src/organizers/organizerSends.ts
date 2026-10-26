import * as admin from "firebase-admin";
import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import type {
  OrganizerBroadcastSummaryDocument,
  OrganizerCampaignDocument,
  OrganizerMessageTemplateDocument,
  OrganizerPostDeliveryOperationDocument,
  OrganizerPostDocument,
  OrganizerSavedAudienceDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {ListOrganizerCampaignsCallablePayload} from
  "../shared/generated/listOrganizerCampaignsCallablePayload";
import type {ListOrganizerCampaignsCallableResponse} from
  "../shared/generated/listOrganizerCampaignsCallableResponse";
import {
  validateListOrganizerCampaignsCallablePayload,
} from "../shared/generated/validators/listOrganizerCampaignsInput";
import {requireOrganizerManager} from "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";

const defaultPageSize = 25;

interface OrganizerSendsDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  documentIdField: () => FirebaseFirestore.FieldPath;
  timestampFromMillis: (millis: number) => FirebaseFirestore.Timestamp;
}

const defaultDeps: OrganizerSendsDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  documentIdField: () => admin.firestore.FieldPath.documentId(),
  timestampFromMillis: (millis) =>
    admin.firestore.Timestamp.fromMillis(millis),
};

interface SendCursor {
  activityAtMillis: number;
  sendId: string;
}

type SendRow = ListOrganizerCampaignsCallableResponse["sends"][number];

/** Lists one reverse-chronological page across every Host Sends route. */
export async function listOrganizerCampaignsHandler(
  request: CallableRequest<unknown>,
  deps: OrganizerSendsDeps = defaultDeps,
): Promise<ListOrganizerCampaignsCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<ListOrganizerCampaignsCallablePayload>(
    request,
    validateListOrganizerCampaignsCallablePayload,
    normalizePayload,
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "listOrganizerCampaigns", {
    maxRequests: 60, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({
    db,
    organizerId: data.organizerId,
    actorUid,
  });
  const limit = data.limit ?? defaultPageSize;
  const cursor = decodeOrganizerSendCursor(data.cursor ?? null);
  let campaignsQuery: FirebaseFirestore.Query = db
    .collection("organizerCampaigns")
    .where("organizerId", "==", data.organizerId)
    .orderBy("createdAt", "desc")
    .orderBy(deps.documentIdField(), "desc");
  let announcementsQuery: FirebaseFirestore.Query = db
    .collection("organizerBroadcastSummaries")
    .where("organizerId", "==", data.organizerId)
    .orderBy("sentAt", "desc")
    .orderBy(deps.documentIdField(), "desc");
  let followerUpdatesQuery: FirebaseFirestore.Query = db
    .collection("organizers")
    .doc(data.organizerId)
    .collection("posts")
    .orderBy("createdAt", "desc")
    .orderBy(deps.documentIdField(), "desc");
  if (cursor) {
    const timestamp = deps.timestampFromMillis(cursor.activityAtMillis);
    campaignsQuery = campaignsQuery.startAfter(timestamp, cursor.sendId);
    announcementsQuery = announcementsQuery.startAfter(
      timestamp,
      cursor.sendId,
    );
    followerUpdatesQuery = followerUpdatesQuery.startAfter(
      timestamp,
      cursor.sendId,
    );
  }
  const [
    campaignSnapshot,
    announcementSnapshot,
    followerUpdateSnapshot,
  ] = await Promise.all([
    campaignsQuery.limit(limit + 1).get(),
    announcementsQuery.limit(limit + 1).get(),
    followerUpdatesQuery.limit(limit + 1).get(),
  ]);
  const campaigns = campaignSnapshot.docs.map((snapshot) => ({
    id: snapshot.id,
    data: snapshot.data() as OrganizerCampaignDocument,
  })).filter((row) => row.data.organizerId === data.organizerId);
  const templateIds = [...new Set(campaigns.map((row) => row.data.templateId))];
  const savedAudienceIds = [...new Set(campaigns.flatMap((row) =>
    row.data.savedAudienceId ? [row.data.savedAudienceId] : [],
  ))];
  const templateSnapshots = templateIds.length === 0 ? [] : await db.getAll(
    ...templateIds.map((templateId) => db
      .collection("organizerMessageTemplates").doc(templateId)),
  );
  const templateNames = new Map(templateSnapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => [
      snapshot.id,
      (snapshot.data() as OrganizerMessageTemplateDocument).name,
    ]));
  const savedAudienceSnapshots = savedAudienceIds.length === 0 ? [] :
    await db.getAll(...savedAudienceIds.map((audienceId) => db
      .collection("organizerSavedAudiences").doc(audienceId)));
  const savedAudienceNames = new Map(savedAudienceSnapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => [
      snapshot.id,
      (snapshot.data() as OrganizerSavedAudienceDocument).name,
    ]));
  const followerOperationSnapshots = followerUpdateSnapshot.docs.length === 0 ?
    [] : await db.getAll(...followerUpdateSnapshot.docs.map((snapshot) =>
      db.collection("organizerPostDeliveryOperations").doc(snapshot.id),
    ));
  const followerOperations = new Map(followerOperationSnapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => [
      snapshot.id,
      snapshot.data() as OrganizerPostDeliveryOperationDocument,
    ]));
  const sends = sortOrganizerSendRows([
    ...campaigns.map(({id, data: campaign}): SendRow => ({
      kind: "campaign",
      campaignId: id,
      name: campaign.name,
      status: campaign.status,
      savedAudienceId: campaign.savedAudienceId ?? null,
      savedAudienceName: campaign.savedAudienceId ?
        savedAudienceNames.get(campaign.savedAudienceId) ?? null : null,
      segmentIds: campaign.segmentIds,
      templateId: campaign.templateId,
      templateName: templateNames.get(campaign.templateId) ?? null,
      audienceCounts: campaign.audienceCounts,
      deliveryCounts: campaign.deliveryCounts,
      scheduledAtMillis: campaign.scheduledAt?.toMillis() ?? null,
      dispatchedAtMillis: campaign.dispatchedAt?.toMillis() ?? null,
      activityAtMillis: campaign.createdAt.toMillis(),
    })),
    ...announcementSnapshot.docs
      .map((snapshot) => snapshot.data() as
        OrganizerBroadcastSummaryDocument)
      .filter((announcement) =>
        announcement.organizerId === data.organizerId)
      .map((announcement): SendRow => ({
        kind: "announcement",
        broadcastId: announcement.broadcastId,
        eventId: announcement.eventId,
        eventName: announcement.eventName,
        audience: announcement.audience,
        recipientCount: announcement.recipientCount,
        sentAtMillis: announcement.sentAt.toMillis(),
        partialFailure: announcement.partialFailure,
        activityAtMillis: announcement.sentAt.toMillis(),
      })),
    ...followerUpdateSnapshot.docs
      .map((snapshot) => ({
        id: snapshot.id,
        data: snapshot.data() as OrganizerPostDocument,
      }))
      .map(({id, data: post}): SendRow => {
        const operation = followerOperations.get(id);
        const deliveryStatus = operation?.status === "processing" ?
          "pending" : operation?.status ?? "unknown";
        return {
          kind: "followerUpdate",
          postId: id,
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
        };
      }),
  ]);
  const page = sends.slice(0, limit);
  return {
    organizerId: data.organizerId,
    sends: page,
    nextCursor: sends.length > limit && page.length > 0 ?
      encodeOrganizerSendCursor(page[page.length - 1]) : null,
  };
}

/** Stable ordering used by the callable and focused unit tests. */
export function sortOrganizerSendRows(rows: SendRow[]): SendRow[] {
  return [...rows].sort((left, right) => {
    const timeDifference = right.activityAtMillis - left.activityAtMillis;
    if (timeDifference !== 0) return timeDifference;
    return sendRowId(right).localeCompare(sendRowId(left));
  });
}

function sendRowId(row: SendRow): string {
  switch (row.kind) {
  case "campaign":
    return row.campaignId;
  case "announcement":
    return row.broadcastId;
  case "followerUpdate":
    return row.postId;
  }
}

export function encodeOrganizerSendCursor(row: SendRow): string {
  return Buffer.from(JSON.stringify({
    activityAtMillis: row.activityAtMillis,
    sendId: sendRowId(row),
  })).toString("base64url");
}

export function decodeOrganizerSendCursor(
  value: string | null,
): SendCursor | null {
  if (value === null) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<SendCursor>;
    if (!Number.isSafeInteger(parsed.activityAtMillis) ||
        (parsed.activityAtMillis ?? -1) < 0 ||
        typeof parsed.sendId !== "string" ||
        parsed.sendId.length === 0) {
      throw new Error("invalid cursor fields");
    }
    return parsed as SendCursor;
  } catch {
    throw new HttpsError("invalid-argument", "Sends cursor is invalid.");
  }
}

function normalizePayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  return {
    ...input,
    organizerId: typeof input.organizerId === "string" ?
      input.organizerId.trim() : input.organizerId,
    cursor: typeof input.cursor === "string" ?
      input.cursor.trim() || null : input.cursor,
  };
}

export const listOrganizerCampaigns = onCall(
  appCheckCallableOptionsWithLimits({timeoutSeconds: 60, maxInstances: 20}),
  (request) => listOrganizerCampaignsHandler(request),
);
