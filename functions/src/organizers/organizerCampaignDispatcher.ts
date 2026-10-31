/* firestore-index: organizerCampaignRecipients (
  organizerId:ASCENDING,
  endpointHash:ASCENDING,
  acceptedAt:DESCENDING
)
  firestore-index: organizerCampaigns (
  status:ASCENDING,
  leaseExpiresAt:ASCENDING
) */
import * as admin from "firebase-admin";
import * as crypto from "node:crypto";
import * as logger from "firebase-functions/logger";
import {expr, projectID} from "firebase-functions/params";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithSecrets} from "../shared/callableOptions";
import type {
  OrganizerCampaignDocument,
  OrganizerCampaignRecipientDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {OrganizerCampaignActionCallablePayload} from
  "../shared/generated/organizerCampaignActionCallablePayload";
import type {OrganizerCampaignCallableResponse} from
  "../shared/generated/organizerCampaignCallableResponse";
import {
  validateOrganizerCampaignActionCallablePayload,
} from "../shared/generated/validators/organizerCampaignActionInput";
import {requireOrganizerManager} from "../shared/organizerManagerAuthority";
import {checkRateLimit} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {
  getOrganizerCampaignReportHandler,
} from "./organizerCampaigns";
import {
  CampaignDeliveryWorker,
  campaignMessageIdFor,
  markRecipientFailed,
} from "./campaignDeliveryWorker";
import {assertOutboundContentAllowed} from
  "../communications/outboundContentPolicy";
import {
  metaWhatsappAppId,
  metaWhatsappAppSecret,
  metaWhatsappConfigId,
  metaWhatsappGraphVersion,
  organizerWhatsappAccessTokens,
} from "./organizerMessagingSetup";
import {
  MetaWhatsappProvider,
  OrganizerTokenStore,
} from "./organizerWhatsappProvider";

import {openCampaignDiscovery, renewCampaignDiscoveryLease} from
  "./campaignDiscoveryCursor";

const campaignLeaseMillis = 3 * 60 * 1000;
const dispatchPageSize = 100;
const recoveryPageSize = 100;

export interface DispatcherDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  tokenStore: Pick<OrganizerTokenStore, "accessBound">;
  provider: () => Pick<MetaWhatsappProvider, "sendTemplate">;
  now: () => FirebaseFirestore.Timestamp;
  runtimeProjectId?: () => string;
}

const defaultDeps: DispatcherDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  tokenStore: new OrganizerTokenStore(),
  provider: () =>
    new MetaWhatsappProvider({
      appId: metaWhatsappAppId.value(),
      appSecret: metaWhatsappAppSecret.value(),
      configId: metaWhatsappConfigId.value(),
      graphVersion: metaWhatsappGraphVersion.value(),
    }),
  now: () => admin.firestore.Timestamp.now(),
};

export async function dispatchOrganizerCampaignHandler(
  request: CallableRequest<unknown>,
  deps: DispatcherDeps = defaultDeps,
): Promise<OrganizerCampaignCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<OrganizerCampaignActionCallablePayload>(
    request,
    validateOrganizerCampaignActionCallablePayload,
    normalizePayload,
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "dispatchOrganizerCampaign");
  await requireOrganizerManager({
    db,
    organizerId: data.organizerId,
    actorUid,
  });
  await dispatchCampaign({
    db,
    organizerId: data.organizerId,
    campaignId: data.campaignId,
    expectedRevision: data.expectedRevision ?? null,
    deps,
  });
  return getOrganizerCampaignReportHandler(request, deps);
}

/**
 * Campaign orchestration: claim the campaign lease, then drive each frozen
 * recipient row through the shared delivery core. Per-recipient authority
 * rechecks, single-executor claims, provider ambiguity, and receipt
 * reconciliation all live in `CampaignDeliveryWorker` / the outbox — this
 * function only owns campaign-level scheduling and report finalization.
 */
export async function dispatchCampaign(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  campaignId: string;
  expectedRevision: number | null;
  deps: DispatcherDeps;
}): Promise<void> {
  const leaseOwner = `campaign-${crypto.randomUUID()}`;
  const campaignRef = params.db
    .collection("organizerCampaigns")
    .doc(params.campaignId);
  await params.db.runTransaction(async (tx) => {
    const snapshot = await tx.get(campaignRef);
    const now = params.deps.now();
    const campaign = snapshot.data() as OrganizerCampaignDocument | undefined;
    if (!campaign || campaign.organizerId !== params.organizerId) {
      throw new HttpsError("not-found", "Campaign not found.");
    }
    assertOutboundContentAllowed(
      Object.values(campaign.templateVariables),
      "A WhatsApp template value contains language that cannot be delivered.",
    );
    if (
      params.expectedRevision !== null &&
      campaign.revision !== params.expectedRevision
    ) {
      throw new HttpsError(
        "aborted",
        "Campaign changed. Refresh before sending.",
      );
    }
    // "blocked" re-enters here deliberately: it is the state a campaign
    // lands in when rows are still pending/sending after a pass, and a
    // re-run is exactly how interrupted or unknown-outcome rows converge.
    if (
      !["approved", "scheduled", "resolving", "sending", "blocked"].includes(
        campaign.status,
      )
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Campaign is not approved for delivery.",
      );
    }
    if (
      campaign.scheduledAt &&
      campaign.scheduledAt.toMillis() > now.toMillis()
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Campaign is scheduled for a future time.",
      );
    }
    if (
      campaign.leaseExpiresAt &&
      campaign.leaseExpiresAt.toMillis() > now.toMillis()
    ) {
      return;
    }
    tx.update(campaignRef, {
      status: "resolving",
      dispatchedAt: campaign.dispatchedAt ?? now,
      leaseOwner,
      leaseExpiresAt: admin.firestore.Timestamp.fromMillis(
        now.toMillis() + campaignLeaseMillis,
      ),
      updatedAt: now,
      revision: campaign.revision + 1,
    });
  });
  const campaignSnap = await campaignRef.get();
  const campaign = campaignSnap.data() as
    | OrganizerCampaignDocument
    | undefined;
  if (!campaign || campaign.leaseOwner !== leaseOwner) return;
  const worker = new CampaignDeliveryWorker(
    params.db,
    params.deps.provider(),
    params.deps.tokenStore,
    () => params.deps.now().toMillis(),
  );
  const clock = () => params.deps.now().toMillis();
  const lease = {organizerId: params.organizerId,
    campaignId: params.campaignId, leaseOwner};
  const refreshLease = () => renewCampaignDiscoveryLease({
    db: params.db, lease, clock, durationMillis: campaignLeaseMillis,
  });
  const project = (params.deps.runtimeProjectId ?? (() => projectID.value()))();
  const pendingCursor = await openCampaignDiscovery({db: params.db,
    projectId: project, queue: {kind: "pendingRecipients", lease}, clock});
  let pendingQuery = params.db.collection("organizerCampaignRecipients")
    .where("campaignId", "==", params.campaignId)
    .where("status", "==", "pending")
    .orderBy(admin.firestore.FieldPath.documentId())
    .limit(dispatchPageSize);
  if (pendingCursor.cursor !== null) {
    pendingQuery = pendingQuery.startAfter(pendingCursor.cursor);
  }
  const recipients = await pendingQuery.get();
  if (!recipients.empty) {
    // Discover before processing: interruption cannot pin this page forever.
    await pendingCursor.checkpoint(recipients.docs.at(-1)!.id);
  } else if (pendingCursor.cursor !== null) {
    await pendingCursor.checkpoint(null);
  }
  for (const recipientDoc of recipients.docs) {
    await refreshLease();
    await enqueueAndDispatch(worker, campaign,
      params.campaignId, recipientDoc.id)
      .catch((error) => {
        logger.error("Organizer campaign recipient dispatch failed", {
          organizerId: params.organizerId,
          campaignId: params.campaignId,
          recipientId: recipientDoc.id,
          error,
        });
      });
    await refreshLease();
  }
  if (!recipients.empty && recipients.size < dispatchPageSize) {
    await pendingCursor.checkpoint(null);
  }
  // Recovery: rows claimed by an interrupted executor sit `sending` with an
  // expired lease. The outbox record decides whether evidence, a retry, or
  // a terminal failure applies — never a blind resend.
  const sendingCursor = await openCampaignDiscovery({db: params.db,
    projectId: project, queue: {kind: "sendingRecipients", lease}, clock});
  let sendingQuery = params.db.collection("organizerCampaignRecipients")
    .where("campaignId", "==", params.campaignId)
    .where("status", "==", "sending")
    .orderBy(admin.firestore.FieldPath.documentId())
    .limit(recoveryPageSize);
  if (sendingCursor.cursor !== null) {
    sendingQuery = sendingQuery.startAfter(sendingCursor.cursor);
  }
  const stalled = await sendingQuery.get();
  if (!stalled.empty) {
    await sendingCursor.checkpoint(stalled.docs.at(-1)!.id);
  } else if (sendingCursor.cursor !== null) {
    await sendingCursor.checkpoint(null);
  }
  for (const recipientDoc of stalled.docs) {
    await refreshLease();
    try {
      const recipient = recipientDoc.data() as
        OrganizerCampaignRecipientDocument;
      if (recipient.leaseExpiresAt &&
          recipient.leaseExpiresAt.toMillis() > clock()) continue;
      const messageId = campaignMessageIdFor(
        params.organizerId, params.campaignId, recipientDoc.id);
      const record = await worker.get(messageId);
      if (!record) {
        // A legacy sending row has no proof of whether the provider was
        // reached. Preserve the existing fail-closed adjudication.
        await markRecipientFailed(params.db, params.campaignId,
          recipientDoc.id, null, "unknown", clock());
      } else {
        await worker.dispatch(messageId);
      }
    } catch (error) {
      logger.error("Organizer campaign recovery dispatch failed", {
        organizerId: params.organizerId,
        campaignId: params.campaignId,
        recipientId: recipientDoc.id,
        error,
      });
    }
    // Lost campaign ownership stops the page, unlike a malformed row.
    await refreshLease();
  }
  if (!stalled.empty && stalled.size < recoveryPageSize) {
    await sendingCursor.checkpoint(null);
  }
  await finishDispatch(
    params.db,
    params.campaignId,
    leaseOwner,
    params.deps.now,
  );
}

async function enqueueAndDispatch(
  worker: CampaignDeliveryWorker,
  campaign: OrganizerCampaignDocument,
  campaignId: string,
  recipientId: string,
) {
  const messageId = await worker.enqueueRecipient({
    campaign, campaignId, recipientId,
  });
  return worker.dispatch(messageId);
}

async function finishDispatch(
  db: FirebaseFirestore.Firestore,
  campaignId: string,
  leaseOwner: string,
  clock: () => FirebaseFirestore.Timestamp,
): Promise<void> {
  const [pending, failed] = await Promise.all([
    db
      .collection("organizerCampaignRecipients")
      .where("campaignId", "==", campaignId)
      .where("status", "in", ["pending", "sending"])
      .count()
      .get(),
    db
      .collection("organizerCampaignRecipients")
      .where("campaignId", "==", campaignId)
      .where("status", "==", "failed")
      .count()
      .get(),
  ]);
  const campaignRef = db.collection("organizerCampaigns").doc(campaignId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(campaignRef);
    const campaign = snap.data() as OrganizerCampaignDocument | undefined;
    const now = clock();
    if (!campaign || campaign.leaseOwner !== leaseOwner ||
        !campaign.leaseExpiresAt ||
        campaign.leaseExpiresAt.toMillis() <= now.toMillis()) return;
    const remaining = pending.data().count;
    tx.update(campaignRef, {
      status:
        remaining > 0 ?
          "blocked" :
          failed.data().count > 0 ?
            "partiallyFailed" :
            "completed",
      completedAt: remaining > 0 ? null : now,
      leaseOwner: null,
      leaseExpiresAt: null,
      updatedAt: now,
      revision: campaign.revision + 1,
    });
  });
}

function normalizePayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value,
    ]),
  );
}

const dispatcherCallableLimits = {
  timeoutSeconds: 540,
  maxInstances: 10,
  concurrency: 1,
};

export const dispatchOrganizerCampaign = onCall(
  {
    ...appCheckCallableOptionsWithSecrets(
      [metaWhatsappAppSecret, organizerWhatsappAccessTokens],
      dispatcherCallableLimits,
    ),
    serviceAccount:
      expr`catch-whatsapp-reader@${projectID}.iam.gserviceaccount.com`,
  },
  (request) => dispatchOrganizerCampaignHandler(request),
);

export const dispatchScheduledOrganizerCampaigns = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Asia/Kolkata",
    timeoutSeconds: 540,
    maxInstances: 1,
    secrets: [metaWhatsappAppSecret, organizerWhatsappAccessTokens],
  },
  () => dispatchScheduledOrganizerCampaignsHandler(),
);

/** One bounded scheduler pass; provider and clock boundaries are injectable. */
export async function dispatchScheduledOrganizerCampaignsHandler(
  deps: DispatcherDeps = defaultDeps,
): Promise<void> {
  const db = deps.firestore();
  const now = deps.now();
  const blockedCursor = await openCampaignDiscovery({db,
    projectId: (deps.runtimeProjectId ?? (() => projectID.value()))(),
    queue: {kind: "blockedCampaigns"}, clock: () => deps.now().toMillis()});
  let blockedQuery = db.collection("organizerCampaigns")
    .where("status", "==", "blocked")
    .orderBy(admin.firestore.FieldPath.documentId()).limit(10);
  if (blockedCursor.cursor !== null) {
    blockedQuery = blockedQuery.startAfter(blockedCursor.cursor);
  }
  const [scheduled, stalled, blocked] = await Promise.all([
    db
      .collection("organizerCampaigns")
      .where("status", "==", "scheduled")
      .where("scheduledAt", "<=", now)
      .orderBy("scheduledAt")
      .limit(10)
      .get(),
    // Interrupted passes leave resolving/sending campaigns behind an
    // expired lease; re-running them is how stalled recipients and
    // pending rows converge.
    db
      .collection("organizerCampaigns")
      .where("status", "in", ["resolving", "sending"])
      .where("leaseExpiresAt", "<=", now)
      .orderBy("leaseExpiresAt")
      .limit(10)
      .get(),
    blockedQuery.get(),
  ]);
  if (!blocked.empty) {
    await blockedCursor.checkpoint(blocked.docs.at(-1)!.id);
  } else if (blockedCursor.cursor !== null) {
    await blockedCursor.checkpoint(null);
  }
  const retryableBlocked = [];
  for (const doc of blocked.docs) {
    try {
      const remaining = await db
        .collection("organizerCampaignRecipients")
        .where("campaignId", "==", doc.id)
        .where("status", "in", ["pending", "sending"])
        .count().get();
      if (remaining.data().count > 0) retryableBlocked.push(doc);
    } catch (error) {
      logger.error("Organizer campaign discovery failed", {
        campaignId: doc.id, error,
      });
    }
  }
  for (const doc of [
    ...scheduled.docs,
    ...stalled.docs,
    ...retryableBlocked,
  ]) {
    const campaign = doc.data() as OrganizerCampaignDocument;
    await dispatchCampaign({
      db,
      organizerId: campaign.organizerId,
      campaignId: doc.id,
      expectedRevision: null,
      deps,
    }).catch((error) =>
      logger.error("Scheduled organizer campaign dispatch failed", {
        campaignId: doc.id,
        organizerId: campaign.organizerId,
        error,
      }),
    );
  }
  if (!blocked.empty && blocked.size < 10) {
    await blockedCursor.checkpoint(null);
  }
}
