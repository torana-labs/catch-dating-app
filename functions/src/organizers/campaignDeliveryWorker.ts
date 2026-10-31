import {readProgramGuestFields} from
  "../workspaces/workspaceFieldAuthority";
import * as admin from "firebase-admin";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash} from "../operations/durableActions";
import type {
  DeliveryDispatchGate, DeliveryRouteReadiness,
} from "../delivery/deliveryCore";
import {FirestoreDeliveryOutbox, ReadDeliveryFacts} from
  "../delivery/firestoreDeliveryOutbox";
import type {
  DeliveryAttempt, LiveAttempt, MessageRecord, ProviderBinding,
} from "./campaignDelivery";
import {
  campaignDeliveryAdapter, campaignDeliveryIntentId,
  campaignDeliveryMessageId,
} from "./campaignDelivery";
import type {CampaignDeliveryMessageIntent as MessageIntent} from
  "../shared/generated/campaignDeliveryMessageIntent";
import type {
  EventDocument,
  OrganizerCampaignDocument,
  OrganizerCampaignRecipientDocument,
  OrganizerCommunicationPreferenceDocument,
  OrganizerContactChannelStateDocument,
  OrganizerContactDocument,
  OrganizerMessageTemplateDocument,
  OrganizerSenderConnectionDocument,
  ProgramGuestDocument,
  ProgramHouseholdDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  MetaProviderError, MetaWhatsappProvider, OrganizerTokenStore,
  metaTemplateFromDocument,
} from "./organizerWhatsappProvider";
import {whatsappStatusCorrelation} from
  "../eventSuccess/operations/whatsappDeliveryProtocol";
import {validateCampaignWhatsappDispatchDocument} from
  "../shared/generated/validators/campaignWhatsappDispatchDocument";
import {
  effectiveOrganizerWhatsappPurposeStatus,
  organizerCommunicationPreferenceId,
} from "../shared/organizerCommunicationPreferences";
import {
  classifyMetaError, hashCanonical, hashEndpoint,
  organizerCampaignFrequencyCapMillis,
  organizerContactChannelStateId,
} from "./organizerCampaignModel";
import {campaignVariables} from "./organizerCampaigns";

/** Claim-time submission evidence for webhook status correlation. */
export const CAMPAIGN_WHATSAPP_DISPATCHES = "campaignWhatsappDispatches";

export type CampaignDeliveryOutbox = FirestoreDeliveryOutbox<
  MessageIntent["context"], ProviderBinding, MessageIntent, DeliveryAttempt,
  MessageRecord>;

export type WhatsappSubmissionOutcome =
  {kind: "accepted"; providerMessageId: string} | {kind: "unknown"};

export type CampaignRecipientDispatchResult =
  | {kind: "suppressed"; reason: NonNullable<
      OrganizerCampaignRecipientDocument["exclusionReason"]>}
  | {kind: "withheld"; reason: "permitExpired" | "notReserved" |
    "rehearsal" | "authorityChanged" | "authorizationExpired" |
    "deliveryConflict" | "resourceUnavailable"}
  | {kind: "waiting";
    reason: "retryBackoff" | "reconcile" | "staleFacts" | "campaignEnded" |
      "alreadyDelivered" | "superseded" | "recipientWithdrawn" | "expired" |
      "conflicted" | "recordMissing"}
  | {kind: "terminal"; reason: "attemptLimit" | "policyRejected" |
    "recipientNeedsReview" | "providerOwnsFallback" | "providerFailed"}
  | {kind: "submitted"; outcome: WhatsappSubmissionOutcome};

const FACT_SNAPSHOT_MS = 120_000;
/** Provider evidence usually lands within minutes; a day bounds the tail. */
const INTENT_TTL_MS = 24 * 60 * 60 * 1000;
/** The recipient lease mirrors the attempt permit so a stalled claim frees
 *  the row for the recovery pass instead of parking it `sending` forever. */
const RECIPIENT_LEASE_MS = 60 * 1000;

type ExclusionReason =
  NonNullable<OrganizerCampaignRecipientDocument["exclusionReason"]>;

/** Deterministic message id for a campaign/recipient pair — recovery paths
 *  derive it without loading the outbox record. */
export function campaignMessageIdFor(
  organizerId: string, campaignId: string, recipientId: string
): string {
  return campaignDeliveryMessageId({
    context: {mode: "live", organizerId, campaignId, recipientId},
    intentId: campaignDeliveryIntentId(campaignId, recipientId),
    revision: 1,
  } as MessageIntent);
}

/** The durable intent minted per pending recipient at dispatch time. */
export function campaignDeliveryIntent(params: {
  campaign: OrganizerCampaignDocument;
  campaignId: string;
  recipientId: string;
  variables: Record<string, string>;
  dispatchEpochMillis: number;
  now: number;
}): MessageIntent {
  return {
    schemaVersion: 1,
    intentId: campaignDeliveryIntentId(params.campaignId,
      params.recipientId),
    revision: 1,
    context: {
      mode: "live",
      organizerId: params.campaign.organizerId,
      campaignId: params.campaignId,
      recipientId: params.recipientId,
    },
    campaignId: params.campaignId,
    recipient: {kind: "campaignRecipient", recipientKey: params.recipientId},
    workflow: {
      kind: "campaignDispatch",
      campaignId: params.campaignId,
      recipientId: params.recipientId,
    },
    createdAt: params.now,
    expiresAt: params.now + INTENT_TTL_MS,
    permittedRoutes: ["organizerWhatsappCampaign"],
    // One extra attempt lets a proven-unsent send (permit/reservation
    // expiry) redispatch; provider rejections still terminate the row.
    deliveryPolicy: {
      maxAttempts: 2,
      maxAttemptsPerRoute: 2,
      minimumRetrySeconds: 120,
    },
    kind: "campaignMessage",
    instructionRevision: params.dispatchEpochMillis,
    whatsapp: {
      connectionId: params.campaign.connectionId,
      templateId: params.campaign.templateId,
      variables: params.variables,
    },
  };
}

interface CampaignFactSnapshot {
  campaign: OrganizerCampaignDocument;
  recipient: OrganizerCampaignRecipientDocument;
  connection: OrganizerSenderConnectionDocument;
  template: OrganizerMessageTemplateDocument;
  channelState: OrganizerContactChannelStateDocument | undefined;
}

/**
 * The claim-time authority read shared by reserve and claim. Every document
 * the suppression functions consume is loaded inside the transaction so the
 * permission snapshot and the staged writes commit atomically.
 */
async function readCampaignFacts(
  tx: Transaction, db: Firestore, intent: MessageIntent, nowMillis: number
): Promise<{
  gate: DeliveryDispatchGate;
  suppression: ExclusionReason | null;
  snapshot: CampaignFactSnapshot | null;
}> {
  const [campaignSnap, recipientSnap] = await Promise.all([
    tx.get(db.collection("organizerCampaigns")
      .doc(intent.context.campaignId)),
    tx.get(db.collection("organizerCampaignRecipients")
      .doc(intent.context.recipientId)),
  ]);
  const campaign = campaignSnap.data() as
    | OrganizerCampaignDocument
    | undefined;
  const recipient = recipientSnap.data() as
    | OrganizerCampaignRecipientDocument
    | undefined;
  const stop = (reason: string) => ({
    gate: {kind: "stop", reason} as DeliveryDispatchGate,
    suppression: null as ExclusionReason | null,
    snapshot: null as CampaignFactSnapshot | null,
  });
  if (!campaign || campaign.organizerId !== intent.context.organizerId ||
      (campaign.status !== "resolving" && campaign.status !== "sending") ||
      !campaign.dispatchedAt) {
    return stop("campaignEnded");
  }
  if (!recipient || recipient.campaignId !== intent.context.campaignId ||
      recipient.organizerId !== intent.context.organizerId) {
    return stop("recipientWithdrawn");
  }
  const gate: DeliveryDispatchGate = {
    kind: "allow",
    checkedAt: nowMillis,
    validUntil: Math.min(nowMillis + FACT_SNAPSHOT_MS, intent.expiresAt),
    instructionRevision: campaign.dispatchedAt.toMillis(),
  };
  const program = recipient.programRecipient ?? null;
  const contactRef = recipient.contactId ?
    db.collection("organizerContacts").doc(recipient.contactId) :
    null;
  const contactSnap = contactRef ? await tx.get(contactRef) : null;
  const contact = contactSnap?.data() as
    | OrganizerContactDocument
    | undefined;
  const preferenceRef = contact?.linkedUid ?
    db.collection("organizerCommunicationPreferences").doc(
      organizerCommunicationPreferenceId(
        intent.context.organizerId, contact.linkedUid)) :
    null;
  const channelRef = recipient.contactId ?
    db.collection("organizerContactChannelStates").doc(
      organizerContactChannelStateId(
        intent.context.organizerId, recipient.contactId)) :
    null;
  const connectionRef = db.collection("organizerSenderConnections")
    .doc(intent.whatsapp.connectionId);
  const templateRef = db.collection("organizerMessageTemplates")
    .doc(intent.whatsapp.templateId);
  const eventRef = campaign.eventId ?
    db.collection("events").doc(campaign.eventId) :
    null;
  const inviteSecretRef = recipient.inviteLinkId ?
    db.collection("eventInviteLinkSecrets").doc(recipient.inviteLinkId) :
    null;
  // Program recipients re-check the endpoint guest, the household's live
  // messaging consent, and recent sends to the same endpoint — the program
  // analog of CRM preference/channel state.
  const endpointGuestRef = program ?
    db.collection("programGuests").doc(program.endpointGuestId) :
    null;
  const householdRef = program?.householdId ?
    db.collection("programHouseholds").doc(program.householdId) :
    null;
  const endpointHistoryQuery = program && recipient.endpointHash ?
    db.collection("organizerCampaignRecipients")
      .where("organizerId", "==", intent.context.organizerId)
      .where("endpointHash", "==", recipient.endpointHash)
      .orderBy("acceptedAt", "desc")
      .limit(10) :
    null;
  const related = await Promise.all([
    preferenceRef ? tx.get(preferenceRef) : null,
    channelRef ? tx.get(channelRef) : null,
    tx.get(connectionRef),
    tx.get(templateRef),
    eventRef ? tx.get(eventRef) : null,
    inviteSecretRef ? tx.get(inviteSecretRef) : null,
    endpointGuestRef ? tx.get(endpointGuestRef) : null,
    householdRef ? tx.get(householdRef) : null,
    endpointHistoryQuery ? tx.get(endpointHistoryQuery) : null,
  ]);
  const preference = related[0]?.data() as
    | OrganizerCommunicationPreferenceDocument
    | undefined;
  const channelState = related[1]?.data() as
    | OrganizerContactChannelStateDocument
    | undefined;
  const connection = related[2].data() as
    | OrganizerSenderConnectionDocument
    | undefined;
  const template = related[3].data() as
    | OrganizerMessageTemplateDocument
    | undefined;
  const event = related[4]?.data() as EventDocument | undefined;
  const inviteToken =
    typeof related[5]?.data()?.token === "string" ?
      (related[5]!.data()!.token as string) :
      null;
  const endpointGuest = related[6]?.data() as
    | ProgramGuestDocument
    | undefined;
  const household = related[7]?.data() as
    | ProgramHouseholdDocument
    | undefined;
  const endpointHistory = related[8] ?
    (related[8] as FirebaseFirestore.QuerySnapshot).docs.map((doc) =>
      doc.data() as OrganizerCampaignRecipientDocument
    ) :
    [];
  const now = admin.firestore.Timestamp.fromMillis(nowMillis);
  const scopedGuest = program && endpointGuest &&
      endpointGuest.programId === program.programId &&
      endpointGuest.organizerId === intent.context.organizerId ? {
      ...endpointGuest,
      phoneE164: (await readProgramGuestFields({db, tx,
        programId: program.programId,
        organizerId: intent.context.organizerId,
        guestId: program.endpointGuestId, guest: endpointGuest,
        fields: ["phoneE164"], includeAlternatives: false}))
        .values.phoneE164,
    } : undefined;
  const suppression = program ?
    programSuppressionReason({
      organizerId: intent.context.organizerId,
      campaign, recipient, endpointGuest: scopedGuest, household,
      endpointHistory,
      connection, template, now,
    }) :
    finalSuppressionReason({
      organizerId: intent.context.organizerId,
      campaign, recipient, contact, preference, channelState,
      connection, template, event, inviteToken, now,
    });
  // The frozen recipient content hash re-verifies inside the claim window —
  // a rotated invite token or edited template value cannot slip a stale
  // payload through an approved audience row.
  const contentSuppression =
    !suppression &&
    hashCanonical(intent.whatsapp.variables) !==
      recipient.renderedVariablesHash ?
      "providerBlocked" : suppression;
  if (contentSuppression || !connection || !template) {
    return {gate, suppression: contentSuppression ?? "providerBlocked",
      snapshot: null};
  }
  return {gate, suppression: null,
    snapshot: {campaign, recipient, connection, template, channelState}};
}

// The send-time gate shared by CRM and program recipients: the sender
// connection, template, and event invite checks are identity-agnostic.
function senderGateReason(params: {
  organizerId: string;
  campaign: OrganizerCampaignDocument;
  connection: OrganizerSenderConnectionDocument | undefined;
  template: OrganizerMessageTemplateDocument | undefined;
  event: EventDocument | undefined;
  inviteToken: string | null;
}): OrganizerCampaignRecipientDocument["exclusionReason"] {
  if (
    !params.connection ||
    params.connection.organizerId !== params.organizerId ||
    params.connection.status !== "active" ||
    !params.connection.secretVersionResource ||
    !params.connection.phoneNumberId
  ) {
    return "providerBlocked";
  }
  if (
    !params.template ||
    params.template.organizerId !== params.organizerId ||
    (params.template.connectionId !== params.connection.phoneNumberId &&
      params.template.connectionId !== params.campaign.connectionId) ||
    params.template.status !== "APPROVED"
  ) {
    return "providerBlocked";
  }
  if (
    params.campaign.eventId &&
    (!params.event ||
      (params.event.organizerId) !==
        params.organizerId ||
      params.event.status !== "active" ||
      !params.inviteToken)
  ) {
    return "providerBlocked";
  }
  return null;
}

export function finalSuppressionReason(params: {
  organizerId: string;
  campaign: OrganizerCampaignDocument;
  recipient: OrganizerCampaignRecipientDocument;
  contact: OrganizerContactDocument | undefined;
  preference: OrganizerCommunicationPreferenceDocument | undefined;
  channelState: OrganizerContactChannelStateDocument | undefined;
  connection: OrganizerSenderConnectionDocument | undefined;
  template: OrganizerMessageTemplateDocument | undefined;
  event: EventDocument | undefined;
  inviteToken: string | null;
  now: FirebaseFirestore.Timestamp;
}): OrganizerCampaignRecipientDocument["exclusionReason"] {
  if (!params.contact || params.contact.deletedAt !== null ||
      params.contact.hiddenAt != null) return "deleted";
  if (
    params.contact.identityState !== "verified" ||
    params.contact.identityConfidence !== "verified" ||
    !params.contact.linkedUid
  ) {
    return "identityUnresolved";
  }
  if (
    !params.contact.phoneE164 ||
    hashEndpoint(params.contact.phoneE164) !== params.recipient.endpointHash
  ) {
    return "invalidEndpoint";
  }
  if (!params.preference ||
      params.preference.organizerId !== params.organizerId ||
      params.preference.uid !== params.contact.linkedUid) {
    return "unknownPermission";
  }
  const permissionStatus = effectiveOrganizerWhatsappPurposeStatus(
    params.preference,
    "marketing",
    params.contact.phoneE164
  );
  if (permissionStatus === "unknown") return "unknownPermission";
  if (permissionStatus === "optedOut") return "optedOut";
  if (
    params.channelState?.adminSuppressed === true
  ) {
    return "providerBlocked";
  }
  if (
    params.channelState?.suppressionStatus !== undefined &&
    params.channelState.suppressionStatus !== "none"
  ) {
    return params.channelState.suppressionStatus === "invalidEndpoint" ?
      "invalidEndpoint" :
      params.channelState.suppressionStatus === "optedOut" ?
        "optedOut" :
        "providerBlocked";
  }
  if (
    params.channelState?.lastCampaignAcceptedAt &&
    params.now.toMillis() -
      params.channelState.lastCampaignAcceptedAt.toMillis() <
      organizerCampaignFrequencyCapMillis
  ) {
    return "frequencyCapped";
  }
  return senderGateReason(params);
}

// Program recipients carry no CRM identity: the gate is the endpoint
// guest still resolving to the snapshotted phone, the household's live
// explicit consent (granted:false suppresses; absent consent does not —
// save-the-date precedes the consent tick), recent sends to the same
// endpoint for the frequency cap, then the shared sender gate.
export function programSuppressionReason(params: {
  organizerId: string;
  campaign: OrganizerCampaignDocument;
  recipient: OrganizerCampaignRecipientDocument;
  endpointGuest: ProgramGuestDocument | undefined;
  household: ProgramHouseholdDocument | undefined;
  endpointHistory: OrganizerCampaignRecipientDocument[];
  connection: OrganizerSenderConnectionDocument | undefined;
  template: OrganizerMessageTemplateDocument | undefined;
  now: FirebaseFirestore.Timestamp;
}): OrganizerCampaignRecipientDocument["exclusionReason"] {
  if (
    !params.endpointGuest ||
    params.endpointGuest.organizerId !== params.organizerId ||
    params.endpointGuest.programId !==
      params.recipient.programRecipient?.programId ||
    params.endpointGuest.householdId !==
      params.recipient.programRecipient?.householdId ||
    params.recipient.programRecipient?.householdId != null &&
      !params.household ||
    params.household !== undefined &&
      (params.household.programId !== params.endpointGuest.programId ||
        params.household.organizerId !== params.organizerId) ||
    !params.endpointGuest.phoneE164 ||
    hashEndpoint(params.endpointGuest.phoneE164) !==
      params.recipient.endpointHash
  ) {
    return "invalidEndpoint";
  }
  if (params.household?.messagingConsent?.granted === false) {
    return "optedOut";
  }
  for (const prior of params.endpointHistory) {
    if (prior.optedOutAt) return "optedOut";
    if (
      prior.acceptedAt &&
      params.now.toMillis() - prior.acceptedAt.toMillis() <
        organizerCampaignFrequencyCapMillis
    ) {
      return "frequencyCapped";
    }
  }
  return senderGateReason({
    organizerId: params.organizerId,
    campaign: params.campaign,
    connection: params.connection,
    template: params.template,
    event: undefined,
    inviteToken: null,
  });
}

interface PreparedWhatsappSender {
  connection: OrganizerSenderConnectionDocument;
  template: OrganizerMessageTemplateDocument;
  accessToken: string;
}

/**
 * Claim → submit → record. The claim transaction re-reads the endpoint,
 * sender, template, and the frozen recipient row so the number dialed and
 * the payload hashed are exactly the ones the reservation authorized; the
 * dispatch evidence and the recipient lease commit atomically with it.
 */
async function dispatchCampaignWhatsapp(
  db: Firestore, outbox: CampaignDeliveryOutbox,
  messageId: string, attemptId: string, intent: MessageIntent,
  sender: PreparedWhatsappSender,
  provider: Pick<MetaWhatsappProvider, "sendTemplate">,
  clock: () => number
): Promise<CampaignRecipientDispatchResult> {
  const claim = await outbox.claimLiveDispatch<{
    e164: string; payloadHash: string}>(
      messageId, attemptId,
      async (tx, liveRecord, liveAttempt, now) => {
        const recipientRef = db.collection("organizerCampaignRecipients")
          .doc(intent.context.recipientId);
        const recipientSnap = await tx.get(recipientRef);
        const recipient = recipientSnap.data() as
          | OrganizerCampaignRecipientDocument
          | undefined;
        const [connSnap, tplSnap] = await Promise.all([
          tx.get(db.collection("organizerSenderConnections")
            .doc(intent.whatsapp.connectionId)),
          tx.get(db.collection("organizerMessageTemplates")
            .doc(intent.whatsapp.templateId)),
        ]);
        const conn = connSnap.data() as
          | OrganizerSenderConnectionDocument
          | undefined;
        const tpl = tplSnap.data() as
          | OrganizerMessageTemplateDocument
          | undefined;
        // A row already `sending` re-enters only after its lease lapsed —
        // that is the recovery path for a proven-unsent prior attempt.
        const reclaimable = recipient?.status === "sending" &&
          recipient.leaseExpiresAt !== null &&
          recipient.leaseExpiresAt.toMillis() <= now;
        if (!recipient ||
            recipient.campaignId !== intent.context.campaignId ||
            recipient.organizerId !== intent.context.organizerId ||
            (recipient.status !== "pending" && !reclaimable) ||
            !recipient.endpointE164 ||
            !recipient.endpointHash ||
            "whatsapp:" + recipient.endpointHash !==
              liveAttempt.binding.recipientEndpointId ||
            hashCanonical(intent.whatsapp.variables) !==
              recipient.renderedVariablesHash ||
            !conn || conn.status !== "active" || !conn.phoneNumberId ||
            !conn.secretVersionResource || !conn.wabaId ||
            conn.organizerId !== intent.context.organizerId ||
            conn.revision !== liveAttempt.binding.bindingRevision ||
            intent.whatsapp.connectionId !== liveAttempt.binding.senderId ||
            !tpl || tpl.status !== "APPROVED" ||
            tpl.organizerId !== intent.context.organizerId) {
          return {kind: "withheld"};
        }
        // Reservation evidence may be up to two minutes old. Re-read the
        // program field selection and consent in the final claim transaction.
        if (recipient.programRecipient) {
          const program = recipient.programRecipient;
          const guestSnap = await tx.get(db.collection("programGuests")
            .doc(program.endpointGuestId));
          const guest = guestSnap.data() as ProgramGuestDocument | undefined;
          const householdSnap = program.householdId ?
            await tx.get(db.collection("programHouseholds")
              .doc(program.householdId)) : null;
          const household = householdSnap?.data() as
            ProgramHouseholdDocument | undefined;
          if (!guest || guest.programId !== program.programId ||
              guest.organizerId !== intent.context.organizerId) {
            return {kind: "withheld"};
          }
          const fields = await readProgramGuestFields({db, tx,
            programId: program.programId,
            organizerId: intent.context.organizerId,
            guestId: program.endpointGuestId, guest,
            fields: ["phoneE164"], includeAlternatives: false});
          if (fields.values.phoneE164 !== recipient.endpointE164 ||
              guest.householdId !== program.householdId ||
              program.householdId !== null && (!household ||
                household.programId !== program.programId ||
                household.organizerId !== intent.context.organizerId) ||
              household?.messagingConsent?.granted === false) {
            return {kind: "withheld"};
          }
        }
        const endpointHash = recipient.endpointHash;
        const payloadHash = operationContentHash([
          metaTemplateFromDocument(tpl), intent.whatsapp.variables]);
        const dispatch = {
          schemaVersion: 1, attemptId: liveAttempt.attemptId,
          messageId: liveRecord.messageId, context: intent.context,
          senderId: intent.whatsapp.connectionId,
          bindingRevision: conn.revision,
          providerAccountId: conn.wabaId,
          providerPhoneNumberId: conn.phoneNumberId,
          senderHash: operationContentHash(connSnap.data()),
          recipientEndpointId: "whatsapp:" + endpointHash,
          endpointHash,
          templateDocumentId: intent.whatsapp.templateId,
          templateHash: operationContentHash(tplSnap.data()),
          payloadHash, createdAt: now};
        if (!validateCampaignWhatsappDispatchDocument(dispatch)) {
          throw new Error("Invalid campaign WhatsApp dispatch evidence");
        }
        const evidenceRef = db.collection(CAMPAIGN_WHATSAPP_DISPATCHES)
          .doc(liveAttempt.attemptId);
        if ((await tx.get(evidenceRef)).exists) return {kind: "withheld"};
        const campaignRef = db.collection("organizerCampaigns")
          .doc(intent.context.campaignId);
        const leaseUntil = Math.min(now + RECIPIENT_LEASE_MS,
          liveAttempt.authorization.validUntil);
        return {kind: "ready",
          value: {e164: recipient.endpointE164, payloadHash},
          validUntil: Math.min(now + FACT_SNAPSHOT_MS, intent.expiresAt),
          commit: () => {
            tx.create(evidenceRef, dispatch);
            // The attempt id IS the lease: exactly one executor can hold
            // the recipient row, and the row always names its executor.
            tx.update(recipientRef, {
              status: "sending",
              leaseOwner: liveAttempt.attemptId,
              leaseExpiresAt:
                admin.firestore.Timestamp.fromMillis(leaseUntil),
              attemptCount: recipient.attemptCount + 1,
              retryEligible: false,
              updatedAt: admin.firestore.Timestamp.fromMillis(now),
            });
            tx.update(campaignRef, {
              status: "sending",
              updatedAt: admin.firestore.Timestamp.fromMillis(now),
            });
          }};
      });
  if (claim.kind === "withheld") {
    return {kind: "withheld", reason: claim.reason};
  }
  const attempt = claim.permit.attempt as LiveAttempt;
  let providerMessageId: string;
  try {
    ({providerMessageId} = await provider.sendTemplate({
      accessToken: sender.accessToken,
      phoneNumberId: sender.connection.phoneNumberId!,
      toE164: claim.resource.e164,
      template: metaTemplateFromDocument(sender.template),
      variables: {...intent.whatsapp.variables},
      callbackData: whatsappStatusCorrelation(attempt.attemptId,
        claim.resource.payloadHash),
      deadline: claim.permit.validUntil}));
  } catch (error) {
    // Only a proven unsent request plus actual permit expiry can mark this
    // unsent. Timeouts, HTTP errors and parse failures stay held unknown.
    if (error instanceof MetaProviderError &&
        error.disposition === "requestNotSent") {
      if (clock() >= claim.permit.validUntil) {
        await outbox.recordExpiredBeforeSend(claim.permit);
        return {kind: "withheld", reason: "permitExpired"};
      }
      const failedAt = clock();
      await outbox.recordReceipt(messageId, {
        attemptId: attempt.attemptId, ...attempt.binding,
        providerEventId: "campaign-wa-notsent:" + operationContentHash([
          attempt.attemptId, error.providerCode ?? "none",
        ]),
        receivedAt: failedAt,
        state: {kind: "failed", at: failedAt, providerMessageId: null,
          classification: "technical",
          evidenceId: "local:requestNotSent:" +
            String(error.providerCode ?? "none")},
      });
      await markRecipientFailed(db, intent.context.campaignId,
        intent.context.recipientId, attempt.attemptId,
        classifyMetaError(error.providerCode), failedAt);
      return {kind: "submitted", outcome: {kind: "unknown"}};
    }
    return {kind: "submitted", outcome: {kind: "unknown"}};
  }
  const now = clock();
  await outbox.recordReceipt(messageId, {
    attemptId: attempt.attemptId, ...attempt.binding,
    providerEventId: "campaign-wa-submission:" + operationContentHash([
      attempt.attemptId, providerMessageId,
    ]),
    receivedAt: now,
    state: {kind: "accepted", at: now, providerMessageId},
  });
  await markRecipientAccepted(db, intent.context.campaignId,
    intent.context.recipientId, attempt.attemptId, providerMessageId, now);
  return {kind: "submitted", outcome: {kind: "accepted", providerMessageId}};
}

/** The accepted mirror — identical effect to the legacy post-send write. */
async function markRecipientAccepted(
  db: Firestore, campaignId: string, recipientId: string,
  attemptId: string, providerMessageId: string, nowMillis: number
): Promise<void> {
  const now = admin.firestore.Timestamp.fromMillis(nowMillis);
  await db.runTransaction(async (tx) => {
    const recipientRef = db.collection("organizerCampaignRecipients")
      .doc(recipientId);
    const campaignRef = db.collection("organizerCampaigns").doc(campaignId);
    const recipientSnap = await tx.get(recipientRef);
    const recipient = recipientSnap.data() as
      | OrganizerCampaignRecipientDocument
      | undefined;
    if (!recipient ||
        recipient.status !== "sending" ||
        recipient.leaseOwner !== attemptId) {
      return;
    }
    // Program recipients have no CRM channel-state doc; the send-time
    // endpoint-history read is their frequency-cap record.
    const stateRef = recipient.contactId ?
      db.collection("organizerContactChannelStates")
        .doc(organizerContactChannelStateId(
          recipient.organizerId, recipient.contactId)) :
      null;
    const stateSnap = stateRef ? await tx.get(stateRef) : null;
    const existingState = stateSnap?.data() as
      | OrganizerContactChannelStateDocument
      | undefined;
    tx.update(recipientRef, {
      status: "accepted",
      providerMessageId,
      acceptedAt: now,
      leaseOwner: null,
      leaseExpiresAt: null,
      updatedAt: now,
    });
    if (stateRef && recipient.contactId) {
      tx.set(stateRef, {
        organizerId: recipient.organizerId,
        contactId: recipient.contactId,
        channel: "whatsapp",
        endpointHash: recipient.endpointHash,
        suppressionStatus: existingState?.suppressionStatus ?? "none",
        suppressionSource: existingState?.suppressionSource ?? null,
        adminSuppressed: existingState?.adminSuppressed ?? false,
        campaignAcceptedCount:
          (existingState?.campaignAcceptedCount ?? 0) + 1,
        lastCampaignAcceptedAt: now,
        lastInboundAt: existingState?.lastInboundAt ?? null,
        lastReplyAt: existingState?.lastReplyAt ?? null,
        createdAt: existingState?.createdAt ?? now,
        updatedAt: now,
      }, {merge: false});
    }
    tx.update(campaignRef, {
      "deliveryCounts.pending": admin.firestore.FieldValue.increment(-1),
      "deliveryCounts.accepted": admin.firestore.FieldValue.increment(1),
      "updatedAt": now,
    });
  });
}

export async function markRecipientFailed(
  db: Firestore, campaignId: string, recipientId: string,
  attemptId: string | null,
  category: OrganizerCampaignRecipientDocument["providerErrorCategory"],
  nowMillis: number
): Promise<void> {
  const now = admin.firestore.Timestamp.fromMillis(nowMillis);
  await db.runTransaction(async (tx) => {
    const recipientRef = db.collection("organizerCampaignRecipients")
      .doc(recipientId);
    const campaignRef = db.collection("organizerCampaigns").doc(campaignId);
    const recipientSnap = await tx.get(recipientRef);
    const recipient = recipientSnap.data() as
      | OrganizerCampaignRecipientDocument
      | undefined;
    // With an attemptId this is a post-submit write and must match the
    // executor that holds the lease. Without one it is terminal
    // adjudication of a row that may never have been claimed.
    const eligible = attemptId === null ?
      recipient?.status === "pending" || recipient?.status === "sending" :
      recipient?.status === "sending" &&
        recipient.leaseOwner === attemptId;
    if (!recipient || !eligible) {
      return;
    }
    tx.update(recipientRef, {
      status: "failed",
      providerErrorCategory: category,
      retryEligible: false,
      failedAt: now,
      leaseOwner: null,
      leaseExpiresAt: null,
      updatedAt: now,
    });
    tx.update(campaignRef, {
      "deliveryCounts.pending": admin.firestore.FieldValue.increment(-1),
      "deliveryCounts.failed": admin.firestore.FieldValue.increment(1),
      "updatedAt": now,
    });
  });
}

/**
 * The suppressed mirror. The reserve transaction already made the authority
 * call; this write only lands if the row is still pending (a concurrent
 * claim that won already carries the authoritative outcome).
 */
export async function markRecipientSuppressed(
  db: Firestore, campaignId: string, recipientId: string,
  reason: ExclusionReason, nowMillis: number
): Promise<void> {
  const now = admin.firestore.Timestamp.fromMillis(nowMillis);
  await db.runTransaction(async (tx) => {
    const recipientRef = db.collection("organizerCampaignRecipients")
      .doc(recipientId);
    const campaignRef = db.collection("organizerCampaigns").doc(campaignId);
    const [recipientSnap, campaignSnap] = await Promise.all([
      tx.get(recipientRef), tx.get(campaignRef),
    ]);
    const recipient = recipientSnap.data() as
      | OrganizerCampaignRecipientDocument
      | undefined;
    const campaign = campaignSnap.data() as
      | OrganizerCampaignDocument
      | undefined;
    if (!recipient || !campaign || recipient.status !== "pending" ||
        (campaign.status !== "resolving" && campaign.status !== "sending")) {
      return;
    }
    tx.update(recipientRef, {
      status: "suppressed",
      exclusionReason: reason,
      retryEligible: false,
      updatedAt: now,
    });
    tx.update(campaignRef, {
      "deliveryCounts.pending": admin.firestore.FieldValue.increment(-1),
      "deliveryCounts.suppressed": admin.firestore.FieldValue.increment(1),
      "updatedAt": now,
    });
  });
}

/**
 * Reconciles a stalled `sending` row against confirmed attempt evidence.
 * Recovery never guesses: unknown/reserved attempts stay `sending` until
 * evidence or expiry resolves them.
 */
export async function recoverRecipientMirror(
  db: Firestore, record: MessageRecord, nowMillis: number
): Promise<void> {
  const {campaignId, recipientId} = record.intent.context;
  const latest = [...record.attempts]
    .sort((a, b) => b.ordinal - a.ordinal)[0];
  if (!latest) return;
  const state = latest.state;
  if (state.kind !== "accepted" && state.kind !== "delivered" &&
      state.kind !== "read" && state.kind !== "failed") {
    return;
  }
  const now = admin.firestore.Timestamp.fromMillis(nowMillis);
  await db.runTransaction(async (tx) => {
    const recipientRef = db.collection("organizerCampaignRecipients")
      .doc(recipientId);
    const campaignRef = db.collection("organizerCampaigns").doc(campaignId);
    const recipientSnap = await tx.get(recipientRef);
    const recipient = recipientSnap.data() as
      | OrganizerCampaignRecipientDocument
      | undefined;
    if (!recipient || recipient.status !== "sending" ||
        recipient.leaseOwner !== latest.attemptId) {
      return;
    }
    if (state.kind === "failed") {
      tx.update(recipientRef, {
        status: "failed",
        providerErrorCategory: state.classification === "policy" ?
          "policy" : state.classification === "invalidRecipient" ?
            "invalidRecipient" : "provider",
        retryEligible: false,
        failedAt: now,
        leaseOwner: null, leaseExpiresAt: null, updatedAt: now,
      });
      tx.update(campaignRef, {
        "deliveryCounts.pending": admin.firestore.FieldValue.increment(-1),
        "deliveryCounts.failed": admin.firestore.FieldValue.increment(1),
        "updatedAt": now,
      });
      return;
    }
    const status = state.kind;
    tx.update(recipientRef, {
      status,
      providerMessageId: state.providerMessageId,
      acceptedAt: admin.firestore.Timestamp.fromMillis(state.at),
      ...(status === "delivered" ?
        {deliveredAt: admin.firestore.Timestamp.fromMillis(state.at)} : {}),
      ...(status === "read" ?
        {readAt: admin.firestore.Timestamp.fromMillis(state.at)} : {}),
      leaseOwner: null, leaseExpiresAt: null, updatedAt: now,
    });
    tx.update(campaignRef, {
      "deliveryCounts.pending": admin.firestore.FieldValue.increment(-1),
      [`deliveryCounts.${status}`]: admin.firestore.FieldValue.increment(1),
      "updatedAt": now,
    });
  });
}

/**
 * Dispatches one campaign recipient through the shared delivery core:
 * enqueue the durable intent, reserve, claim (staging the recipient lease
 * and dispatch evidence in one transaction), submit, and record the
 * provider outcome. All provider I/O stays outside transactions.
 */
export class CampaignDeliveryWorker {
  constructor(private readonly db: Firestore,
    private readonly provider: Pick<MetaWhatsappProvider, "sendTemplate">,
    private readonly credentials: Pick<OrganizerTokenStore, "accessBound">,
    private readonly clock: () => number = Date.now) {}

  private outbox(): CampaignDeliveryOutbox {
    return new FirestoreDeliveryOutbox(this.db, campaignDeliveryAdapter,
      async () => {
        throw new Error("Campaign delivery lookup cannot reserve dispatch");
      }, this.clock);
  }

  /** Read the durable record for a campaign/recipient pair, if it exists. */
  async get(messageId: string): Promise<MessageRecord | null> {
    return this.outbox().get(messageId);
  }

  /** Enqueue the recipient's intent; idempotent across re-dispatch. The
   *  frozen variables hash is re-verified at claim, so a stale payload can
   *  never claim — minting is safe from any snapshot. */
  async enqueueRecipient(params: {
    campaign: OrganizerCampaignDocument;
    campaignId: string;
    recipientId: string;
  }): Promise<string> {
    const now = this.clock();
    const {campaign, campaignId, recipientId} = params;
    const [tplSnap, eventSnap] = await Promise.all([
      this.db.collection("organizerMessageTemplates")
        .doc(campaign.templateId).get(),
      campaign.eventId ?
        this.db.collection("events").doc(campaign.eventId).get() :
        Promise.resolve(null),
    ]);
    const template = tplSnap.data() as
      | OrganizerMessageTemplateDocument
      | undefined;
    const event = eventSnap?.data() as EventDocument | undefined;
    const recipientSnap = await this.db
      .collection("organizerCampaignRecipients").doc(recipientId).get();
    const recipientDoc = recipientSnap.data() as
      | OrganizerCampaignRecipientDocument
      | undefined;
    const inviteToken = recipientDoc?.inviteLinkId ?
      ((await this.db.collection("eventInviteLinkSecrets")
        .doc(recipientDoc.inviteLinkId).get()).data() as
        {token?: unknown} | undefined)?.token :
      null;
    const variables = campaignVariables(campaign,
      typeof inviteToken === "string" ? inviteToken : null,
      event ?? null, template?.variableNames ?? []);
    const messageId = campaignMessageIdFor(
      campaign.organizerId, campaignId, recipientId);
    const intent = campaignDeliveryIntent({
      campaign, campaignId, recipientId, variables,
      dispatchEpochMillis: campaign.dispatchedAt?.toMillis() ?? now,
      now,
    });
    try {
      await this.outbox().enqueue(intent);
    } catch (error) {
      // A changed invite token mutates the payload hash — the existing
      // record keeps the original intent and claim-time suppression
      // (variables hash mismatch) owns the refusal.
      if (error instanceof Error &&
          error.message.includes("already has other content")) {
        return messageId;
      }
      throw error;
    }
    return messageId;
  }

  /**
   * Reserve → claim → submit → record. Suppression decisions made inside
   * the reserve transaction mirror to the recipient row with the exact
   * exclusion reason the authority check returned.
   */
  async dispatch(messageId: string): Promise<CampaignRecipientDispatchResult> {
    const outbox = this.outbox();
    const message = await outbox.get(messageId);
    if (!message) return {kind: "waiting", reason: "recordMissing"};
    if (message.lifecycle !== "active") {
      return {kind: "waiting", reason: "campaignEnded"};
    }
    const intent = message.intent;
    // Campaign semantics are terminal on ANY confirmed provider failure —
    // the shared evaluator's technical retry must never reach a second
    // send for a marketing message. Finalize the row before reserving.
    const latestExisting = [...message.attempts]
      .sort((a, b) => b.ordinal - a.ordinal)[0];
    if (latestExisting && latestExisting.state.kind === "failed") {
      const classification = latestExisting.state.classification;
      const reason = classification === "policy" ||
          classification === "suppressed" ? "policyRejected" as const :
        classification === "invalidRecipient" ?
          "recipientNeedsReview" as const : "providerFailed" as const;
      await markRecipientFailed(this.db, intent.context.campaignId,
        intent.context.recipientId, latestExisting.attemptId,
        reason === "recipientNeedsReview" ? "invalidRecipient" :
          reason === "policyRejected" ? "policy" : "provider",
        this.clock());
      return {kind: "terminal", reason};
    }
    // The suppression verdict computed inside the reserve transaction is
    // captured here so the recipient mirror records the exact reason.
    let lastSuppression: ExclusionReason | null = null;
    const readFacts: ReadDeliveryFacts<MessageIntent, ProviderBinding> =
      async (tx, liveIntent, now) => {
        const {gate, suppression, snapshot} = await readCampaignFacts(
          tx, this.db, liveIntent, now);
        lastSuppression = suppression;
        const routes: DeliveryRouteReadiness<ProviderBinding>[] = [];
        if (gate.kind === "stop" || !snapshot) {
          routes.push({routeId: "organizerWhatsappCampaign",
            state: {kind: "blocked",
              reason: suppression ??
                (gate.kind === "stop" ? gate.reason : "policyBlocked")}});
          return {gate, routes};
        }
        const {connection, template, recipient} = snapshot;
        if (!recipient.endpointHash) {
          routes.push({routeId: "organizerWhatsappCampaign",
            state: {kind: "blocked", reason: "invalidEndpoint"}});
          return {gate, routes};
        }
        routes.push({routeId: "organizerWhatsappCampaign",
          state: {kind: "eligible", checkedAt: now,
            validUntil: Math.min(now + FACT_SNAPSHOT_MS,
              liveIntent.expiresAt),
            permissionRevision: "ocperm:" + operationContentHash([
              connection.revision, template.status,
              template.contentHash ?? null,
              recipient.renderedVariablesHash,
              recipient.endpointHash,
            ]),
            candidate: {mode: "live", binding: {
              routeId: "organizerWhatsappCampaign", transport: "whatsapp",
              senderIdentity: "organizerManaged", provider: "meta",
              senderId: liveIntent.whatsapp.connectionId,
              bindingRevision: connection.revision,
              recipientEndpointId: "whatsapp:" + recipient.endpointHash,
              fallbackOwner: "catch",
            } satisfies ProviderBinding}}});
        return {gate, routes};
      };
    const reserving = new FirestoreDeliveryOutbox(
      this.db, campaignDeliveryAdapter, readFacts, this.clock);
    const reservation = await reserving.reserve(messageId);
    const decision = reservation.decision;
    if (decision.kind !== "dispatch") {
      // Confirmed evidence on the record converges a stalled mirror before
      // anything else is decided — an accepted attempt sitting behind a
      // crashed mirror resolves to accepted here.
      await recoverRecipientMirror(this.db, reservation.record,
        this.clock());
      if (decision.kind === "hostDecision" &&
          decision.reason === "noEligibleRoute" && lastSuppression) {
        await markRecipientSuppressed(this.db, intent.context.campaignId,
          intent.context.recipientId, lastSuppression, this.clock());
        return {kind: "suppressed", reason: lastSuppression};
      }
      if (decision.kind === "hostDecision" &&
          (decision.reason === "attemptLimit" ||
           decision.reason === "policyRejected" ||
           decision.reason === "recipientNeedsReview" ||
           decision.reason === "providerOwnsFallback")) {
        const category = decision.reason === "policyRejected" ? "policy" :
          decision.reason === "recipientNeedsReview" ?
            "invalidRecipient" : "provider";
        await markRecipientFailed(this.db, intent.context.campaignId,
          intent.context.recipientId, null, category, this.clock());
        return {kind: "terminal", reason: decision.reason};
      }
      if (decision.kind === "hostDecision" &&
          decision.reason === "conflictingDeliveryEvidence") {
        // Evidence dispute: leave the row for ops — never resend.
        return {kind: "waiting", reason: "conflicted"};
      }
      if (decision.kind === "delivered") {
        return {kind: "waiting", reason: "alreadyDelivered"};
      }
      if (decision.kind === "stop" && decision.reason === "expired") {
        // The reconcile tail closed without evidence: anything still
        // `sending` is the truthful terminal the old code reached early.
        await markRecipientFailed(this.db, intent.context.campaignId,
          intent.context.recipientId, null, "unknown", this.clock());
        return {kind: "waiting", reason: "expired"};
      }
      return {kind: "waiting",
        reason: decision.kind === "stop" ?
          decision.reason === "campaignEnded" ? "campaignEnded" :
            decision.reason === "recipientWithdrawn" ?
              "recipientWithdrawn" : "superseded" :
          decision.kind === "wait" ? "retryBackoff" :
            decision.kind === "reconcile" ? "reconcile" : "staleFacts"};
    }
    const attempt = reservation.record.attempts[
      reservation.record.attempts.length - 1];
    if (!attempt || attempt.state.kind !== "reserved") {
      return {kind: "withheld", reason: "notReserved"};
    }
    // Channel preparation does credential I/O outside the transaction.
    const [connSnap, tplSnap] = await Promise.all([
      this.db.collection("organizerSenderConnections")
        .doc(intent.whatsapp.connectionId).get(),
      this.db.collection("organizerMessageTemplates")
        .doc(intent.whatsapp.templateId).get(),
    ]);
    const connection = connSnap.data() as
      | OrganizerSenderConnectionDocument
      | undefined;
    const template = tplSnap.data() as
      | OrganizerMessageTemplateDocument
      | undefined;
    if (!connection || connection.status !== "active" ||
        !connection.phoneNumberId || !connection.secretVersionResource ||
        connection.organizerId !== intent.context.organizerId ||
        !template || template.status !== "APPROVED") {
      return {kind: "withheld", reason: "resourceUnavailable"};
    }
    let accessToken: string;
    try {
      accessToken = await this.credentials.accessBound({
        versionResource: connection.secretVersionResource,
        organizerId: connection.organizerId,
        connectionId: intent.whatsapp.connectionId,
      });
    } catch {
      return {kind: "withheld", reason: "resourceUnavailable"};
    }
    return dispatchCampaignWhatsapp(this.db, reserving, messageId,
      attempt.attemptId, intent,
      {connection, template, accessToken}, this.provider, this.clock);
  }
}
