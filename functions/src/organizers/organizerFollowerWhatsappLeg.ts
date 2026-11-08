import * as admin from "firebase-admin";
import type {
  OrganizerCampaignDocument,
  OrganizerCampaignRecipientDocument,
  OrganizerCommunicationPreferenceDocument,
  OrganizerFollowDocument,
  OrganizerMessageTemplateDocument,
  OrganizerPostDeliveryOperationDocument,
  OrganizerSenderConnectionDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {CreateOrganizerPostCallableResponse} from
  "../shared/generated/createOrganizerPostCallableResponse";
import {organizerCommunicationPreferenceId} from
  "../shared/organizerCommunicationPreferences";
import {WHATSAPP_ENDPOINT_STOPS, whatsappStopId} from
  "../shared/organizerWhatsappStops";
import {organizerRelationshipId} from "../shared/relationshipDocuments";
import {
  emptyCampaignAudienceCounts,
  hashCanonical,
  hashEndpoint,
} from "./organizerCampaignModel";
import {
  effectiveFollowerWhatsappStatus,
  followerUpdateTemplateReady,
  followerUpdateTemplateText,
  followerWhatsappTermsVersion,
  organizerFollowerUpdateTemplateName,
  sha256,
} from "./organizerFollowerWhatsapp";

/**
 * The WhatsApp leg of a follower update. It never sends anything itself:
 * it freezes eligible followers as recipients of one campaign
 * (recipientSource organizerFollowers) and the campaign delivery engine
 * sends, retries and records receipts exactly as it does for campaigns.
 *
 * 1. createOrganizerPost finds the organiser's sender (active connection +
 *    approved organizer_follower_update template) and creates the campaign
 *    as `approved`, so the campaign scheduler leaves it alone.
 * 2. Each follower page decides per follower (queued or skipped) in the same
 *    transaction as the push receipt, so retries never double count.
 * 3. When the last page is read the campaign becomes `scheduled` and the
 *    campaign scheduler dispatches it; the follower scheduler mirrors its
 *    delivery counts back onto the post's delivery operation.
 */

type Operation = OrganizerPostDeliveryOperationDocument;
type Leg = NonNullable<Operation["whatsapp"]>;
type Recipient = OrganizerCampaignRecipientDocument;
type Preference = OrganizerCommunicationPreferenceDocument;
type ExclusionReason = NonNullable<Recipient["exclusionReason"]>;
type QueryRead = (query: FirebaseFirestore.Query) =>
  Promise<FirebaseFirestore.QuerySnapshot>;

export interface FollowerWhatsappSender {
  connectionId: string;
  connection: OrganizerSenderConnectionDocument;
  templateId: string;
  template: OrganizerMessageTemplateDocument;
}

export type FollowerWhatsappDecision =
  | {kind: "queued"; recipientId: string; recipient: Recipient}
  | {kind: "skipped"};

export function followerWhatsappCampaignId(postId: string): string {
  return `ofwa_${postId}`.slice(0, 180);
}

/** Hides the follower's uid in the recipient id, like the push receipts. */
export function followerWhatsappRecipientId(
  campaignId: string,
  uid: string,
): string {
  return `ofwr_${sha256(`${campaignId}|${uid}`).slice(0, 48)}`;
}

/**
 * The organiser's first active WhatsApp connection holding an approved,
 * fillable organizer_follower_update template, or null.
 */
export async function findFollowerWhatsappSender(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  read: QueryRead = (query) => query.get(),
): Promise<FollowerWhatsappSender | null> {
  const [connections, templates] = await Promise.all([
    read(db.collection("organizerSenderConnections")
      .where("organizerId", "==", organizerId)
      .where("channel", "==", "whatsapp")
      .where("status", "==", "active")
      .limit(5)),
    read(db.collection("organizerMessageTemplates")
      .where("organizerId", "==", organizerId)
      .where("name", "==", organizerFollowerUpdateTemplateName)
      .where("status", "==", "APPROVED")
      .limit(20)),
  ]);
  for (const connectionSnap of connections.docs) {
    const connection = connectionSnap.data() as
      OrganizerSenderConnectionDocument;
    for (const templateSnap of templates.docs) {
      const template = templateSnap.data() as OrganizerMessageTemplateDocument;
      if (followerUpdateTemplateReady({organizerId,
        connectionId: connectionSnap.id, connection, template})) {
        return {connectionId: connectionSnap.id, connection,
          templateId: templateSnap.id, template};
      }
    }
  }
  return null;
}

/** The approved, unscheduled campaign that carries one update on WhatsApp. */
export function followerWhatsappCampaign(params: {
  organizerId: string;
  authorUid: string;
  postId: string;
  text: string;
  sender: FollowerWhatsappSender;
  now: FirebaseFirestore.Timestamp;
}): OrganizerCampaignDocument {
  const templateVariables = {
    [params.sender.template.variableNames[0]]:
      followerUpdateTemplateText(params.text),
  };
  return {
    organizerId: params.organizerId,
    createdByUid: params.authorUid,
    messageClass: "organizerUpdate",
    channel: "whatsapp",
    status: "approved",
    name: "Follower update",
    segmentIds: [],
    savedAudienceId: null,
    savedAudienceRevision: null,
    savedAudienceDefinitionHash: null,
    recipientSource: {kind: "organizerFollowers"},
    organizerPostId: params.postId,
    connectionId: params.sender.connectionId,
    templateId: params.sender.templateId,
    templateVariables,
    eventId: null,
    inviteDestinationKind: null,
    scheduledAt: null,
    recipientSnapshotHash: null,
    contentHash: hashCanonical({templateId: params.sender.templateId,
      templateVariables, postId: params.postId}),
    audienceCounts: emptyCampaignAudienceCounts(),
    deliveryCounts: {pending: 0, suppressed: 0, accepted: 0, sent: 0,
      delivered: 0, read: 0, failed: 0, replied: 0, optedOut: 0},
    revision: 1,
    leaseOwner: null,
    leaseExpiresAt: null,
    createdAt: params.now,
    updatedAt: params.now,
    approvedAt: params.now,
    dispatchedAt: null,
    completedAt: null,
    cancelledAt: null,
  };
}

export function initialFollowerWhatsappLeg(campaignId: string): Leg {
  return {campaignId, status: "collecting", queuedCount: 0, skippedCount: 0,
    sentCount: 0, deliveredCount: 0, readCount: 0, failedCount: 0,
    suppressedCount: 0, syncedAt: null};
}

export interface FollowerWhatsappPageDeps {
  verifiedPhones: (uids: string[]) => Promise<Map<string, string | null>>;
  hasBlockingRelationship: (
    db: FirebaseFirestore.Firestore,
    userId: string,
    peerIds: string[],
  ) => Promise<boolean>;
}

/** Verified phones from Firebase Auth, the follower's phone identity. */
export async function verifiedPhonesFromAuth(
  uids: string[],
): Promise<Map<string, string | null>> {
  const phones = new Map<string, string | null>();
  for (let start = 0; start < uids.length; start += 100) {
    const result = await admin.auth().getUsers(
      uids.slice(start, start + 100).map((uid) => ({uid})));
    for (const user of result.users) {
      phones.set(user.uid, user.phoneNumber ?? null);
    }
  }
  return phones;
}

/**
 * Prepares one follower page's WhatsApp decisions: verified phones are read
 * once for the page; consent and STOP are read per follower. The decision
 * only freezes the recipient; send time re-reads all of it.
 */
export async function prepareFollowerWhatsappPage(params: {
  db: FirebaseFirestore.Firestore;
  deps: FollowerWhatsappPageDeps;
  operation: Operation;
  follows: OrganizerFollowDocument[];
  now: FirebaseFirestore.Timestamp;
}): Promise<((follow: OrganizerFollowDocument) =>
  Promise<FollowerWhatsappDecision>) | null> {
  const leg = params.operation.whatsapp;
  if (!leg || leg.status !== "collecting") return null;
  const campaign = (await params.db.collection("organizerCampaigns")
    .doc(leg.campaignId).get()).data() as OrganizerCampaignDocument |
    undefined;
  if (!campaign || campaign.organizerId !== params.operation.organizerId) {
    throw new Error("follower-whatsapp-campaign-missing");
  }
  const uids = params.follows.map((follow) => follow.uid)
    .filter((uid) => uid !== params.operation.authorUid);
  const phones = await params.deps.verifiedPhones(uids);
  const renderedVariablesHash = hashCanonical(campaign.templateVariables);
  return async (follow) => {
    const phone = phones.get(follow.uid) ?? null;
    if (follow.uid === params.operation.authorUid || !phone) {
      return {kind: "skipped"};
    }
    const endpointHash = hashEndpoint(phone);
    const [preferenceSnap, stopSnap, blocked] = await Promise.all([
      params.db.collection("organizerCommunicationPreferences").doc(
        organizerCommunicationPreferenceId(params.operation.organizerId,
          follow.uid)).get(),
      params.db.collection(WHATSAPP_ENDPOINT_STOPS).doc(
        whatsappStopId(params.operation.organizerId, endpointHash)).get(),
      params.deps.hasBlockingRelationship(params.db,
        params.operation.authorUid, [follow.uid]),
    ]);
    const preference = preferenceSnap.data() as Preference | undefined;
    const stoppedAt = stopSnap.data()?.stoppedAt;
    if (blocked || !preference ||
        preference.organizerId !== params.operation.organizerId ||
        preference.uid !== follow.uid ||
        effectiveFollowerWhatsappStatus(preference, phone,
          typeof stoppedAt === "number" ? stoppedAt : null) !== "optedIn") {
      return {kind: "skipped"};
    }
    const grant = preference.whatsappPurposes!.followerUpdates!;
    const recipientId = followerWhatsappRecipientId(leg.campaignId,
      follow.uid);
    return {kind: "queued", recipientId, recipient: {
      organizerId: params.operation.organizerId,
      campaignId: leg.campaignId,
      contactId: null,
      followerRecipient: {uid: follow.uid, postId: params.operation.postId,
        permissionReceiptId: grant.currentReceiptId!},
      channel: "whatsapp",
      eligibility: "eligible",
      exclusionReason: null,
      endpointE164: phone,
      endpointHash,
      permissionTermsVersion: followerWhatsappTermsVersion,
      permissionUpdatedAt: grant.updatedAt,
      renderedVariablesHash,
      inviteLinkId: null,
      status: "pending",
      providerMessageId: null,
      providerErrorCategory: null,
      retryEligible: false,
      attemptCount: 0,
      leaseOwner: null,
      leaseExpiresAt: null,
      acceptedAt: null,
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      failedAt: null,
      repliedAt: null,
      optedOutAt: null,
      createdAt: params.now,
      updatedAt: params.now,
    }};
  };
}

/**
 * Stages one decision inside the push receipt's transaction, after its
 * reads: the frozen recipient, the campaign's counts and the leg's counts.
 */
export function stageFollowerWhatsappDecision(params: {
  tx: FirebaseFirestore.Transaction;
  db: FirebaseFirestore.Firestore;
  operationRef: FirebaseFirestore.DocumentReference;
  campaignId: string;
  decision: FollowerWhatsappDecision;
  increment: (value: number) => FirebaseFirestore.FieldValue;
}): void {
  const queued = params.decision.kind === "queued";
  if (params.decision.kind === "queued") {
    params.tx.create(params.db.collection("organizerCampaignRecipients")
      .doc(params.decision.recipientId), params.decision.recipient);
    params.tx.update(params.db.collection("organizerCampaigns")
      .doc(params.campaignId), {
      "audienceCounts.total": params.increment(1),
      "audienceCounts.reachable": params.increment(1),
      "deliveryCounts.pending": params.increment(1),
    });
  }
  params.tx.update(params.operationRef, {
    "whatsapp.queuedCount": params.increment(queued ? 1 : 0),
    "whatsapp.skippedCount": params.increment(queued ? 0 : 1),
  });
}

/**
 * Once every follower page is read: schedule the campaign now, or close it
 * when nobody was reachable. Runs inside finishPage's transaction.
 */
export function stageFollowerWhatsappRelease(params: {
  tx: FirebaseFirestore.Transaction;
  db: FirebaseFirestore.Firestore;
  operationRef: FirebaseFirestore.DocumentReference;
  leg: Leg;
  now: FirebaseFirestore.Timestamp;
}): Leg {
  if (params.leg.status !== "collecting") return params.leg;
  const reachable = params.leg.queuedCount > 0;
  params.tx.update(params.db.collection("organizerCampaigns")
    .doc(params.leg.campaignId), reachable ? {
    status: "scheduled", scheduledAt: params.now, updatedAt: params.now,
  } : {status: "completed", completedAt: params.now, updatedAt: params.now});
  const status = reachable ? "sending" as const : "completed" as const;
  params.tx.update(params.operationRef, {
    "whatsapp.status": status,
    "whatsapp.syncedAt": params.now,
  });
  return {...params.leg, status, syncedAt: params.now};
}

/** Mirrors the campaign's delivery counts back onto the post's operation. */
export async function syncFollowerWhatsappLeg(
  db: FirebaseFirestore.Firestore,
  postId: string,
  now: FirebaseFirestore.Timestamp,
): Promise<Leg | null> {
  const operationRef = db.collection("organizerPostDeliveryOperations")
    .doc(postId);
  return db.runTransaction(async (tx) => {
    const operation = (await tx.get(operationRef)).data() as
      Operation | undefined;
    const leg = operation?.whatsapp;
    if (!leg || leg.status !== "sending") return leg ?? null;
    const campaign = (await tx.get(db.collection("organizerCampaigns")
      .doc(leg.campaignId))).data() as OrganizerCampaignDocument | undefined;
    if (!campaign) return leg;
    const counts = campaign.deliveryCounts;
    const settled = ["completed", "partiallyFailed", "cancelled"]
      .includes(campaign.status);
    const next: Leg = {...leg,
      status: settled ? "completed" : "sending",
      sentCount: counts.accepted + counts.sent + counts.delivered +
        counts.read + counts.replied,
      deliveredCount: counts.delivered + counts.read + counts.replied,
      readCount: counts.read + counts.replied,
      failedCount: counts.failed,
      suppressedCount: counts.suppressed + counts.optedOut,
      syncedAt: now,
    };
    tx.update(operationRef, {whatsapp: next});
    return next;
  });
}

export function followerWhatsappResponse(
  leg: Leg | undefined,
): CreateOrganizerPostCallableResponse["whatsapp"] {
  return leg ? {status: leg.status, queuedCount: leg.queuedCount,
    skippedCount: leg.skippedCount, sentCount: leg.sentCount,
    deliveredCount: leg.deliveredCount, failedCount: leg.failedCount} :
    null;
}

/**
 * The send-time gate for a follower recipient, re-read inside the campaign
 * engine's reserve and claim transactions: the follow is still active, the
 * followerUpdates consent is still bound to the frozen phone and no STOP for
 * that phone came after it. No campaign frequency cap applies: follower
 * updates have their own weekly and monthly allowances.
 */
export async function followerRecipientSuppression(params: {
  tx: FirebaseFirestore.Transaction;
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  recipient: Recipient;
}): Promise<ExclusionReason | null> {
  const follower = params.recipient.followerRecipient;
  if (!follower || !params.recipient.endpointE164 ||
      !params.recipient.endpointHash ||
      hashEndpoint(params.recipient.endpointE164) !==
        params.recipient.endpointHash) {
    return "invalidEndpoint";
  }
  const [followSnap, preferenceSnap, stopSnap] = await Promise.all([
    params.tx.get(params.db.collection("organizerFollows").doc(
      organizerRelationshipId(params.organizerId, follower.uid))),
    params.tx.get(params.db.collection("organizerCommunicationPreferences")
      .doc(organizerCommunicationPreferenceId(params.organizerId,
        follower.uid))),
    params.tx.get(params.db.collection(WHATSAPP_ENDPOINT_STOPS).doc(
      whatsappStopId(params.organizerId, params.recipient.endpointHash))),
  ]);
  if (followSnap.data()?.status !== "active") return "optedOut";
  const preference = preferenceSnap.data() as Preference | undefined;
  if (!preference || preference.organizerId !== params.organizerId ||
      preference.uid !== follower.uid) {
    return "unknownPermission";
  }
  const stoppedAt = stopSnap.data()?.stoppedAt;
  const status = effectiveFollowerWhatsappStatus(preference,
    params.recipient.endpointE164,
    typeof stoppedAt === "number" ? stoppedAt : null);
  return status === "optedIn" ? null :
    status === "optedOut" ? "optedOut" : "unknownPermission";
}
