import {readProgramGuestFields} from
  "../workspaces/workspaceFieldAuthority";
import * as admin from "firebase-admin";
import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";
import {requireAuth} from "../shared/auth";
import {appCheckCallableOptionsWithLimits} from "../shared/callableOptions";
import type {
  EventDocument,
  OrganizerAudienceSummaryDocument,
  OrganizerCampaignDocument,
  OrganizerCampaignRecipientDocument,
  OrganizerCommunicationPreferenceDocument,
  OrganizerContactChannelStateDocument,
  OrganizerContactDocument,
  OrganizerContactTraitDocument,
  OrganizerMessageTemplateDocument,
  OrganizerProgramDocument,
  OrganizerSavedAudienceDocument,
  OrganizerSenderConnectionDocument,
  ProgramFunctionDocument,
  ProgramFunctionGuestDocument,
  ProgramGuestDocument,
  ProgramHouseholdDocument,
} from "../shared/generated/firestoreAdminTypes";
import type {OrganizerCampaignActionCallablePayload} from
  "../shared/generated/organizerCampaignActionCallablePayload";
import type {OrganizerCampaignCallableResponse} from
  "../shared/generated/organizerCampaignCallableResponse";
import type {UpsertOrganizerCampaignCallablePayload} from
  "../shared/generated/upsertOrganizerCampaignCallablePayload";
import {
  validateOrganizerCampaignActionCallablePayload,
} from "../shared/generated/validators/organizerCampaignActionInput";
import {
  validateUpsertOrganizerCampaignCallablePayload,
} from "../shared/generated/validators/upsertOrganizerCampaignInput";
import {
  effectiveOrganizerWhatsappPurposeStatus,
  organizerCommunicationPreferenceId,
} from
  "../shared/organizerCommunicationPreferences";
import {requireOrganizerManager} from "../shared/organizerManagerAuthority";
import {checkRateLimit, RateLimitConfig} from "../shared/rateLimit";
import {validateCallableWithAjv} from "../shared/validation";
import {eventInviteToken, inviteLinkTokenHash} from "../events/inviteLinks";
import {organizerWhatsappCampaignRoute} from
  "../communications/communicationRoutes";
import {assertOutboundContentAllowed} from
  "../communications/outboundContentPolicy";
import {
  emptyCampaignAudienceCounts,
  emptyCampaignDeliveryCounts,
  hashCanonical,
  hashEndpoint,
  organizerCampaignAudienceLimit,
  organizerCampaignFrequencyCapMillis,
  organizerCampaignId,
  organizerCampaignRecipientId,
  organizerContactChannelStateId,
} from "./organizerCampaignModel";
import {
  effectiveOrganizerAudienceCoverage,
  resolveOrganizerAudienceCoverage,
} from "./organizerAudienceCoverage";
import {
  resolveSavedAudienceRows,
  SavedAudienceEvaluationRow,
} from "./organizerSavedAudiences";
import {
  resolveProgramSelection,
  type ProgramSelectionResolution,
  type SelectionGuest,
  type SelectionRecipient,
} from "../programRsvp/programSelection";
import type {
  FunctionGuestRowLike,
  FunctionLike,
} from "../programRsvp/functionInvitation";
import {BRAND} from "../shared/generated/brand";


type CampaignBlocker = OrganizerCampaignCallableResponse["blockers"][number];
type ExclusionReason = OrganizerCampaignRecipientDocument["exclusionReason"];

interface CampaignDeps {
  firestore: () => FirebaseFirestore.Firestore;
  checkRateLimit: typeof checkRateLimit;
  now: () => FirebaseFirestore.Timestamp;
}

const defaultDeps: CampaignDeps = {
  firestore: () => admin.firestore(),
  checkRateLimit,
  now: () => admin.firestore.Timestamp.now(),
};

interface AudienceRow {
  // CRM contact id, or the programSelection recipientKey
  // ("guest:{id}"/"household:{id}") for program recipients.
  contactId: string;
  contact: OrganizerContactDocument | null;
  trait: OrganizerContactTraitDocument | null;
  preference: OrganizerCommunicationPreferenceDocument | null;
  channelState: OrganizerContactChannelStateDocument | null;
  eligibility: "eligible" | "excluded";
  exclusionReason: ExclusionReason;
  endpointHash: string | null;
  programRecipient?: ProgramAudienceRecipient;
}

// The program-native recipient identity written onto the campaign
// recipient document. messagingConsent is the approve-time snapshot;
// dispatch re-reads the household doc for a live grant check.
interface ProgramAudienceRecipient {
  programId: string;
  recipientKey: string;
  guestIds: string[];
  householdId: string | null;
  endpointGuestId: string;
  phoneE164: string | null;
  messagingConsent: {
    granted: boolean;
    grantedAt: FirebaseFirestore.Timestamp | null;
    source:
      "householdRsvpLink" | "staff" | "import" | "whatsappStop" | null;
  } | null;
}

interface CampaignContext {
  campaignId: string;
  campaign: OrganizerCampaignDocument;
  connection: OrganizerSenderConnectionDocument | null;
  template: OrganizerMessageTemplateDocument | null;
  event: EventDocument | null;
  summary: OrganizerAudienceSummaryDocument | null;
  savedAudience: OrganizerSavedAudienceDocument | null;
  savedAudienceChanged: boolean;
  audienceRows: AudienceRow[];
  audienceTooLarge: boolean;
}

export async function upsertOrganizerCampaignHandler(
  request: CallableRequest<unknown>,
  deps: CampaignDeps = defaultDeps,
): Promise<OrganizerCampaignCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<UpsertOrganizerCampaignCallablePayload>(
    request,
    validateUpsertOrganizerCampaignCallablePayload,
    normalizePayload,
  );
  assertOutboundContentAllowed(
    Object.values(data.templateVariables),
    "A WhatsApp template value contains language that cannot be delivered.",
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "upsertOrganizerCampaign", {
    maxRequests: 30, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({
    db,
    organizerId: data.organizerId,
    actorUid,
  });
  const recipientSource = data.recipientSource ?? null;
  const programSelection =
    recipientSource?.kind === "programSelection" ? recipientSource : null;
  if (programSelection) {
    if (!programSelection.programId) {
      throw new HttpsError("invalid-argument",
        "programSelection campaigns require a programId.");
    }
    if (data.savedAudienceId) {
      throw new HttpsError("invalid-argument",
        "savedAudienceId must be null for programSelection campaigns.");
    }
    if (data.eventId) {
      throw new HttpsError("invalid-argument",
        "Event invite links are CRM-contact bound; programSelection " +
        "campaigns cannot carry an eventId.");
    }
  } else if (!data.savedAudienceId) {
    throw new HttpsError("invalid-argument",
      "Choose an audience.");
  }
  const programId = programSelection?.programId ?? null;
  const campaignId =
    data.campaignId ??
    organizerCampaignId(data.organizerId, actorUid, data.requestId);
  const campaignRef = db.collection("organizerCampaigns").doc(campaignId);
  const savedAudienceRef = data.savedAudienceId ?
    db.collection("organizerSavedAudiences").doc(data.savedAudienceId) :
    null;
  const programRef = programId ?
    db.collection("organizerPrograms").doc(programId) :
    null;
  const now = deps.now();
  await db.runTransaction(async (tx) => {
    const [snapshot, savedAudienceSnap, programSnap] = await Promise.all([
      tx.get(campaignRef),
      savedAudienceRef ? tx.get(savedAudienceRef) : null,
      programRef ? tx.get(programRef) : null,
    ]);
    const existing = snapshot.data() as OrganizerCampaignDocument | undefined;
    const savedAudience = savedAudienceSnap?.data() as
      OrganizerSavedAudienceDocument | undefined;
    const program = programSnap?.data() as
      OrganizerProgramDocument | undefined;
    if (programSelection && (!program ||
        program.organizerId !== data.organizerId)) {
      throw new HttpsError(
        "failed-precondition",
        "Program not found for this organizer.",
      );
    }
    if (
      !programSelection &&
      (!savedAudience ||
        savedAudience.organizerId !== data.organizerId ||
        savedAudience.scope !== "organizerCrm" ||
        savedAudience.status !== "active")
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Choose an active saved customer audience.",
      );
    }
    if (existing && existing.organizerId !== data.organizerId) {
      throw new HttpsError("already-exists", "Campaign id collision.");
    }
    if (existing && !["draft", "previewed"].includes(existing.status)) {
      throw new HttpsError(
        "failed-precondition",
        "Approved campaigns are immutable.",
      );
    }
    if (
      existing &&
      data.expectedRevision !== null &&
      data.expectedRevision !== undefined &&
      existing.revision !== data.expectedRevision
    ) {
      throw new HttpsError(
        "aborted",
        "Campaign changed. Refresh before editing it.",
      );
    }
    const revision = (existing?.revision ?? 0) + 1;
    const scheduledAt =
      data.scheduledAtMillis === null || data.scheduledAtMillis === undefined ?
        null :
        admin.firestore.Timestamp.fromMillis(data.scheduledAtMillis);
    const normalizedSource = programSelection && programId ? {
      kind: "programSelection" as const,
      programId,
      functionIds: programSelection.functionIds?.length ?
        [...programSelection.functionIds] : null,
      rsvpStatuses: programSelection.rsvpStatuses?.length ?
        [...programSelection.rsvpStatuses] : null,
      householdDedupe: programSelection.householdDedupe ?? true,
    } : null;
    const content = {
      messageClass: data.messageClass,
      savedAudienceId: savedAudience?.audienceId ?? null,
      savedAudienceRevision: savedAudience?.revision ?? null,
      savedAudienceDefinitionHash: savedAudience?.definitionHash ?? null,
      recipientSource: normalizedSource,
      connectionId: data.connectionId,
      templateId: data.templateId,
      templateVariables: data.templateVariables,
      eventId: data.eventId ?? null,
      inviteDestinationKind: data.inviteDestinationKind ?? null,
      scheduledAtMillis: scheduledAt?.toMillis() ?? null,
    };
    const next: OrganizerCampaignDocument = {
      organizerId: data.organizerId,
      createdByUid: existing?.createdByUid ?? actorUid,
      messageClass: data.messageClass,
      channel: organizerWhatsappCampaignRoute.transport,
      status: "draft",
      name: data.name,
      segmentIds: [],
      recipientSource: normalizedSource,
      savedAudienceId: savedAudience?.audienceId ?? null,
      savedAudienceRevision: savedAudience?.revision ?? null,
      savedAudienceDefinitionHash: savedAudience?.definitionHash ?? null,
      connectionId: data.connectionId,
      templateId: data.templateId,
      templateVariables: data.templateVariables,
      eventId: data.eventId ?? null,
      inviteDestinationKind: data.inviteDestinationKind ?? null,
      scheduledAt,
      recipientSnapshotHash: null,
      contentHash: hashCanonical(content),
      audienceCounts: emptyCampaignAudienceCounts(),
      deliveryCounts: emptyCampaignDeliveryCounts(),
      revision,
      leaseOwner: null,
      leaseExpiresAt: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      approvedAt: null,
      dispatchedAt: null,
      completedAt: null,
      cancelledAt: null,
    };
    if (snapshot.exists) tx.set(campaignRef, next);
    else tx.create(campaignRef, next);
  });
  return campaignResponse(
    await campaignContext(db, data.organizerId, campaignId, deps.now()),
    deps.now(),
  );
}

/** Validates a reusable draft without requiring a future recipient to exist. */
export async function validateAutomationCampaignRecipe(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  campaignId: string,
  expectedRevision: number,
  now: FirebaseFirestore.Timestamp,
): Promise<OrganizerCampaignDocument> {
  const context = await campaignContext(
    db,
    organizerId,
    campaignId,
    now,
    false,
  );
  const recipe = context.campaign;
  if (
    recipe.revision !== expectedRevision ||
    !recipe.savedAudienceId ||
    !["draft", "previewed"].includes(recipe.status) ||
    recipe.scheduledAt
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Choose the current revision of an unscheduled draft message.",
    );
  }
  const blockers = campaignBlockers(context, now).filter(
    (value) => value !== "noReachableRecipients",
  );
  if (blockers.length) {
    throw new HttpsError(
      "failed-precondition",
      `Automation message needs attention: ${blockers.join(", ")}.`,
    );
  }
  assertOutboundContentAllowed(
    Object.values(recipe.templateVariables),
    "A message template value cannot be delivered.",
  );
  return recipe;
}

export async function previewOrganizerCampaignHandler(
  request: CallableRequest<unknown>,
  deps: CampaignDeps = defaultDeps,
): Promise<OrganizerCampaignCallableResponse> {
  const {data, db} = await authorizeAction(
    request,
    "previewOrganizerCampaign",
    {maxRequests: 30, windowMs: 60 * 1000},
    deps,
  );
  const context = await campaignContext(
    db,
    data.organizerId,
    data.campaignId,
    deps.now(),
  );
  assertExpectedRevision(context.campaign, data.expectedRevision ?? null);
  if (!["draft", "previewed"].includes(context.campaign.status)) {
    throw new HttpsError(
      "failed-precondition",
      "Approved campaigns cannot be previewed again.",
    );
  }
  if (
    context.campaign.savedAudienceId &&
    (!context.savedAudience || context.savedAudienceChanged)
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Saved audience changed or was archived. Choose it again.",
    );
  }
  const counts = audienceCounts(context.audienceRows);
  const snapshotHash = campaignAudienceSnapshotHash(context.audienceRows);
  await db
    .collection("organizerCampaigns")
    .doc(data.campaignId)
    .update({
      status: "previewed",
      audienceCounts: counts,
      recipientSnapshotHash: snapshotHash,
      updatedAt: deps.now(),
      revision: admin.firestore.FieldValue.increment(1),
    });
  return campaignResponse(
    await campaignContext(db, data.organizerId, data.campaignId, deps.now()),
    deps.now(),
  );
}

export async function approveOrganizerCampaignHandler(
  request: CallableRequest<unknown>,
  deps: CampaignDeps = defaultDeps,
): Promise<OrganizerCampaignCallableResponse> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<OrganizerCampaignActionCallablePayload>(
    request,
    validateOrganizerCampaignActionCallablePayload,
    normalizePayload,
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, "approveOrganizerCampaign", {
    maxRequests: 20, windowMs: 60 * 1000,
  });
  await requireOrganizerManager({
    db,
    organizerId: data.organizerId,
    actorUid,
  });
  const initial = await campaignContext(
    db,
    data.organizerId,
    data.campaignId,
    deps.now(),
  );
  assertExpectedRevision(initial.campaign, data.expectedRevision ?? null);
  const blockers = campaignBlockers(initial, deps.now());
  if (initial.campaign.status !== "previewed" || blockers.length > 0) {
    throw new HttpsError(
      "failed-precondition",
      blockers.length > 0 ?
        `Campaign cannot be approved: ${blockers.join(", ")}.` :
        "Preview this campaign before approval.",
    );
  }
  const now = deps.now();
  const snapshotHash = campaignAudienceSnapshotHash(initial.audienceRows);
  if (initial.campaign.recipientSnapshotHash !== snapshotHash) {
    throw new HttpsError(
      "aborted",
      "Campaign audience changed after preview. Preview it again.",
    );
  }
  const recipientTokens = new Map(
    initial.audienceRows
      .filter(
        (row) => row.eligibility === "eligible" && initial.campaign.eventId,
      )
      .map((row) => [
        row.contactId,
        eventInviteToken(campaignInviteLinkId(data.campaignId, row.contactId)),
      ]),
  );
  const campaignRef = db.collection("organizerCampaigns").doc(data.campaignId);
  await db.runTransaction(async (tx) => {
    const savedAudienceRef = initial.campaign.savedAudienceId ?
      db.collection("organizerSavedAudiences")
        .doc(initial.campaign.savedAudienceId) : null;
    const isProgramSelection =
      initial.campaign.recipientSource?.kind === "programSelection";
    const refs = [
      campaignRef,
      db.collection("organizerAudienceSummaries").doc(data.organizerId),
      ...(savedAudienceRef ? [savedAudienceRef] : []),
      ...initial.audienceRows.flatMap((row) =>
        // Program rows carry no CRM identity to re-read.
        row.programRecipient ?
          [] :
          [
            db.collection("organizerContacts").doc(row.contactId),
            db.collection("organizerContactTraits").doc(row.contactId),
            ...(row.contact?.linkedUid ?
              [
                db
                  .collection("organizerCommunicationPreferences")
                  .doc(
                    organizerCommunicationPreferenceId(
                      data.organizerId,
                      row.contact.linkedUid,
                    ),
                  ),
              ] :
              []),
            db
              .collection("organizerContactChannelStates")
              .doc(organizerContactChannelStateId(
                data.organizerId,
                row.contactId,
              )),
          ],
      ),
    ];
    const attendeeHistorySnap = await tx.get(
      db.collection("eventAttendees")
        .where("organizerId", "==", data.organizerId)
        .limit(1),
    );
    const snapshots = await tx.getAll(...refs);
    const liveCampaign = snapshots[0].data() as
      | OrganizerCampaignDocument
      | undefined;
    const liveSummary = snapshots[1].data() as
      | OrganizerAudienceSummaryDocument
      | undefined;
    const liveSavedAudience = savedAudienceRef ?
      snapshots[2].data() as OrganizerSavedAudienceDocument | undefined :
      undefined;
    const rowSnapshotOffset = savedAudienceRef ? 3 : 2;
    const liveCoverage = effectiveOrganizerAudienceCoverage(
      liveSummary?.sourceCoverage,
      attendeeHistorySnap.size > 0,
    );
    if (
      !liveCampaign ||
      liveCampaign.organizerId !== data.organizerId ||
      liveCampaign.status !== "previewed" ||
      liveCampaign.revision !== initial.campaign.revision ||
      (savedAudienceRef && (
        !liveSavedAudience ||
        liveSavedAudience.organizerId !== data.organizerId ||
        liveSavedAudience.status !== "active" ||
        liveSavedAudience.revision !== liveCampaign.savedAudienceRevision ||
        liveSavedAudience.definitionHash !==
          liveCampaign.savedAudienceDefinitionHash
      )) ||
      (!isProgramSelection &&
        (!liveSummary || liveCoverage !== "exact"))
    ) {
      throw new HttpsError(
        "aborted",
        "Campaign or audience changed. Preview it again.",
      );
    }
    // Program selections re-resolve live inside the transaction; CRM
    // rows re-evaluate from the fresh doc snapshots.
    const liveRows = isProgramSelection ?
      (await loadProgramSelectionRows({
        db,
        organizerId: data.organizerId,
        campaign: liveCampaign,
        tx,
      })).rows :
      audienceRowsFromSnapshots({
        organizerId: data.organizerId,
        segmentIds:
          liveCampaign.savedAudienceId ? null : liveCampaign.segmentIds,
        originalRows: initial.audienceRows,
        snapshots: snapshots.slice(rowSnapshotOffset),
        now,
      });
    if (
      campaignAudienceSnapshotHash(liveRows) !== snapshotHash
    ) {
      throw new HttpsError(
        "aborted",
        "Campaign audience changed. Preview it again.",
      );
    }
    for (const row of liveRows) {
      const inviteLinkId =
        liveCampaign.eventId && row.eligibility === "eligible" ?
          campaignInviteLinkId(data.campaignId, row.contactId) :
          null;
      const variables = campaignVariables(
        liveCampaign,
        recipientTokens.get(row.contactId) ?? null,
        initial.event,
        initial.template?.variableNames ?? [],
      );
      const recipient: OrganizerCampaignRecipientDocument = {
        organizerId: data.organizerId,
        campaignId: data.campaignId,
        // Program rows keep contactId null — no CRM contact is created.
        contactId: row.programRecipient ? null : row.contactId,
        channel: "whatsapp",
        eligibility: row.eligibility,
        exclusionReason: row.exclusionReason,
        endpointE164:
          row.eligibility === "eligible" ?
            (row.contact?.phoneE164 ??
              row.programRecipient?.phoneE164 ??
              null) :
            null,
        programRecipient: row.programRecipient ? {
          programId: row.programRecipient.programId,
          recipientKey: row.programRecipient.recipientKey,
          guestIds: row.programRecipient.guestIds,
          householdId: row.programRecipient.householdId,
          endpointGuestId: row.programRecipient.endpointGuestId,
          messagingConsent: row.programRecipient.messagingConsent,
        } : null,
        endpointHash: row.endpointHash,
        permissionTermsVersion: row.preference?.whatsapp.termsVersion ?? null,
        permissionUpdatedAt: row.preference?.whatsapp.updatedAt ?? null,
        renderedVariablesHash: hashCanonical(variables),
        inviteLinkId,
        status: row.eligibility === "eligible" ? "pending" : "suppressed",
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
        createdAt: now,
        updatedAt: now,
      };
      tx.create(
        db
          .collection("organizerCampaignRecipients")
          .doc(organizerCampaignRecipientId(data.campaignId, row.contactId)),
        recipient,
      );
      if (inviteLinkId) {
        createCampaignInviteLink({
          tx,
          db,
          inviteLinkId,
          token: recipientTokens.get(row.contactId)!,
          campaignId: data.campaignId,
          campaign: liveCampaign,
          contactId: row.contactId,
          hostUid: actorUid,
          event: initial.event!,
          now,
        });
      }
    }
    tx.update(campaignRef, {
      status:
        liveCampaign.scheduledAt &&
        liveCampaign.scheduledAt.toMillis() > now.toMillis() ?
          "scheduled" :
          "approved",
      recipientSnapshotHash: snapshotHash,
      audienceCounts: audienceCounts(liveRows),
      deliveryCounts: deliveryCounts(liveRows),
      approvedAt: now,
      updatedAt: now,
      revision: liveCampaign.revision + 1,
    });
  });
  return campaignResponse(
    await campaignContext(
      db,
      data.organizerId,
      data.campaignId,
      deps.now(),
      false,
    ),
    deps.now(),
  );
}

export async function cancelOrganizerCampaignHandler(
  request: CallableRequest<unknown>,
  deps: CampaignDeps = defaultDeps,
): Promise<OrganizerCampaignCallableResponse> {
  const {data, db} = await authorizeAction(
    request,
    "cancelOrganizerCampaign",
    {maxRequests: 30, windowMs: 60 * 1000},
    deps,
  );
  const ref = db.collection("organizerCampaigns").doc(data.campaignId);
  const now = deps.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const campaign = snap.data() as OrganizerCampaignDocument | undefined;
    if (!campaign || campaign.organizerId !== data.organizerId) {
      throw new HttpsError("not-found", "Campaign not found.");
    }
    assertExpectedRevision(campaign, data.expectedRevision ?? null);
    if (
      !["draft", "previewed", "approved", "scheduled"].includes(campaign.status)
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Campaign can no longer be cancelled.",
      );
    }
    tx.update(ref, {
      status: "cancelled",
      cancelledAt: now,
      updatedAt: now,
      revision: campaign.revision + 1,
    });
  });
  return campaignResponse(
    await campaignContext(
      db,
      data.organizerId,
      data.campaignId,
      deps.now(),
      false,
    ),
    deps.now(),
  );
}

export async function getOrganizerCampaignReportHandler(
  request: CallableRequest<unknown>,
  deps: CampaignDeps = defaultDeps,
): Promise<OrganizerCampaignCallableResponse> {
  const {data, db} = await authorizeAction(
    request,
    "getOrganizerCampaignReport",
    {maxRequests: 30, windowMs: 60 * 1000},
    deps,
  );
  return campaignResponse(
    await campaignContext(
      db,
      data.organizerId,
      data.campaignId,
      deps.now(),
      false,
    ),
    deps.now(),
  );
}

async function authorizeAction(
  request: CallableRequest<unknown>,
  operation: string,
  limit: RateLimitConfig,
  deps: CampaignDeps,
): Promise<{
  actorUid: string;
  data: OrganizerCampaignActionCallablePayload;
  db: FirebaseFirestore.Firestore;
}> {
  const actorUid = requireAuth(request);
  const data = validateCallableWithAjv<OrganizerCampaignActionCallablePayload>(
    request,
    validateOrganizerCampaignActionCallablePayload,
    normalizePayload,
  );
  const db = deps.firestore();
  await deps.checkRateLimit(db, actorUid, operation, limit);
  await requireOrganizerManager({
    db,
    organizerId: data.organizerId,
    actorUid,
  });
  return {actorUid, data, db};
}

async function campaignContext(
  db: FirebaseFirestore.Firestore,
  organizerId: string,
  campaignId: string,
  now: FirebaseFirestore.Timestamp,
  loadAudience = true,
): Promise<CampaignContext> {
  const campaignSnap = await db
    .collection("organizerCampaigns")
    .doc(campaignId)
    .get();
  const campaign = campaignSnap.data() as OrganizerCampaignDocument | undefined;
  if (!campaign || campaign.organizerId !== organizerId) {
    throw new HttpsError("not-found", "Campaign not found.");
  }
  const [
    connectionSnap,
    templateSnap,
    eventSnap,
    summarySnap,
    savedAudienceSnap,
  ] = await Promise.all([
    db
      .collection("organizerSenderConnections")
      .doc(campaign.connectionId)
      .get(),
    db.collection("organizerMessageTemplates").doc(campaign.templateId).get(),
    campaign.eventId ?
      db.collection("events").doc(campaign.eventId).get() :
      Promise.resolve(null),
    db.collection("organizerAudienceSummaries").doc(organizerId).get(),
    campaign.savedAudienceId ?
      db.collection("organizerSavedAudiences")
        .doc(campaign.savedAudienceId).get() :
      Promise.resolve(null),
  ]);
  const connection = connectionSnap.data() as
    | OrganizerSenderConnectionDocument
    | undefined;
  const template = templateSnap.data() as
    | OrganizerMessageTemplateDocument
    | undefined;
  const event = eventSnap?.data() as EventDocument | undefined;
  const summary = summarySnap.data() as
    | OrganizerAudienceSummaryDocument
    | undefined;
  const savedAudience = savedAudienceSnap?.data() as
    | OrganizerSavedAudienceDocument
    | undefined;
  const activeSavedAudience =
    savedAudience?.organizerId === organizerId &&
    savedAudience.scope === "organizerCrm" &&
    savedAudience.status === "active" ? savedAudience : null;
  const savedAudienceChanged = Boolean(
    campaign.savedAudienceId && activeSavedAudience &&
    (activeSavedAudience.revision !== campaign.savedAudienceRevision ||
      activeSavedAudience.definitionHash !==
        campaign.savedAudienceDefinitionHash),
  );
  const summaryForOrganizer = summary?.organizerId === organizerId ?
    summary : undefined;
  const sourceCoverage = await resolveOrganizerAudienceCoverage({
    db,
    organizerId,
    storedCoverage: summaryForOrganizer?.sourceCoverage,
  });
  const audience = !loadAudience ? {rows: [], tooLarge: false} :
    campaign.recipientSource?.kind === "programSelection" ?
      await loadProgramSelectionRows({db, organizerId, campaign}) :
      campaign.savedAudienceId && activeSavedAudience && !savedAudienceChanged ?
        await loadSavedAudienceCampaignRows({
          db,
          organizerId,
          savedAudience: activeSavedAudience,
          now,
        }) : campaign.savedAudienceId ?
          {rows: [], tooLarge: false} :
          await loadLegacyAudienceRows({
            db,
            organizerId,
            segmentIds: campaign.segmentIds,
            now,
          });
  return {
    campaignId,
    campaign,
    connection: connection?.organizerId === organizerId ? connection : null,
    template:
      template?.organizerId === organizerId &&
      template.connectionId === campaign.connectionId ?
        template :
        null,
    event:
      event && (event.organizerId ?? event.clubId) === organizerId ?
        event :
        null,
    summary: summaryForOrganizer ? {
      ...summaryForOrganizer,
      sourceCoverage,
    } : null,
    savedAudience: activeSavedAudience,
    savedAudienceChanged,
    audienceRows: audience.rows,
    audienceTooLarge: audience.tooLarge,
  };
}

// Resolves recipientSource=programSelection audiences: program guests
// invited to the selected functions whose per-function RSVP matches,
// deduped per household when requested, gated by explicit household
// messaging consent. Unreachable identities become excluded rows so
// preview shows the gap instead of silently dropping it.
async function loadProgramSelectionRows(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  campaign: OrganizerCampaignDocument;
  tx?: FirebaseFirestore.Transaction;
}): Promise<{ rows: AudienceRow[]; tooLarge: boolean }> {
  const source = params.campaign.recipientSource;
  const programId = source?.kind === "programSelection" ?
    source.programId ?? null : null;
  if (programId === null) {
    throw new HttpsError("failed-precondition",
      "programSelection campaigns require a programId.");
  }
  const getQuery = (query: FirebaseFirestore.Query) =>
    params.tx ? params.tx.get(query) : query.get();
  const programRef = params.db.collection("organizerPrograms").doc(programId);
  const [programSnap, functionsSnap, guestsSnap, rowsSnap,
    householdsSnap] = await Promise.all([
    params.tx ? params.tx.get(programRef) : programRef.get(),
    getQuery(params.db.collection("programFunctions")
      .where("programId", "==", programId)),
    getQuery(params.db.collection("programGuests")
      .where("programId", "==", programId)),
    getQuery(params.db.collection("programFunctionGuests")
      .where("programId", "==", programId)),
    getQuery(params.db.collection("programHouseholds")
      .where("programId", "==", programId)),
  ]);
  const program = programSnap.data() as OrganizerProgramDocument | undefined;
  if (!program || program.organizerId !== params.organizerId) {
    throw new HttpsError("failed-precondition",
      "Program not found for this organizer.");
  }
  const functions = new Map<string, FunctionLike>();
  for (const doc of functionsSnap.docs) {
    const fn = doc.data() as ProgramFunctionDocument;
    if (fn.programId !== programId ||
        fn.organizerId !== params.organizerId) {
      throw new HttpsError("failed-precondition",
        "Program audience ownership needs reconciliation.");
    }
    functions.set(doc.id, {
      functionId: doc.id,
      status: fn.status,
      invitationMode: fn.invitationMode ?? "allGuests",
    });
  }
  const guests: SelectionGuest[] = [];
  for (const doc of guestsSnap.docs) {
    const guest = doc.data() as ProgramGuestDocument;
    guests.push({
      guestId: doc.id,
      householdId: guest.householdId,
      phoneE164: (await readProgramGuestFields({db: params.db, tx: params.tx,
        programId, organizerId: params.organizerId, guestId: doc.id,
        guest, fields: ["phoneE164"], includeAlternatives: false}))
        .values.phoneE164,
      invitationStatus: guest.invitationStatus,
    });
  }
  const rows: FunctionGuestRowLike[] = [];
  for (const doc of rowsSnap.docs) {
    const row = doc.data() as ProgramFunctionGuestDocument;
    if (row.programId !== programId ||
        row.organizerId !== params.organizerId) {
      throw new HttpsError("failed-precondition",
        "Program audience ownership needs reconciliation.");
    }
    rows.push({
      functionId: row.functionId,
      guestId: row.guestId,
      invited: row.invited,
      rsvpStatus: row.rsvpStatus,
      attendanceStatus: row.attendanceStatus,
    });
  }
  const consentByHousehold = new Map<string,
    ProgramAudienceRecipient["messagingConsent"]>();
  for (const doc of householdsSnap.docs) {
    const household = doc.data() as ProgramHouseholdDocument;
    if (household.programId !== programId ||
        household.organizerId !== params.organizerId) {
      throw new HttpsError("failed-precondition",
        "Program audience ownership needs reconciliation.");
    }
    consentByHousehold.set(doc.id, household.messagingConsent ? {
      granted: household.messagingConsent.granted,
      grantedAt: household.messagingConsent.grantedAt,
      source: household.messagingConsent.source,
    } : null);
  }
  const resolution: ProgramSelectionResolution =
    resolveProgramSelection({
      functionIds: source?.functionIds?.length ?
        [...source.functionIds] : null,
      rsvpStatuses: source?.rsvpStatuses?.length ?
        [...source.rsvpStatuses] :
        ["pending", "attending", "maybe", "declined"],
      householdDedupe: source?.householdDedupe ?? true,
    }, functions, guests, rows);
  const toRow = (recipient: SelectionRecipient): AudienceRow => {
    const messagingConsent = recipient.householdId === null ? null :
      consentByHousehold.get(recipient.householdId) ?? null;
    const declined = messagingConsent?.granted === false;
    return {
      contactId: recipient.recipientKey,
      contact: null,
      trait: null,
      preference: null,
      channelState: null,
      eligibility: declined ? "excluded" : "eligible",
      exclusionReason: declined ? "optedOut" : null,
      endpointHash: hashEndpoint(recipient.phoneE164),
      programRecipient: {
        programId,
        recipientKey: recipient.recipientKey,
        guestIds: recipient.guestIds,
        householdId: recipient.householdId,
        endpointGuestId: recipient.endpointGuestId,
        phoneE164: recipient.phoneE164,
        messagingConsent,
      },
    };
  };
  const audienceRows: AudienceRow[] = resolution.recipients.map(toRow);
  for (const unreachable of resolution.noPhoneRecipients) {
    audienceRows.push({
      contactId: unreachable.recipientKey,
      contact: null,
      trait: null,
      preference: null,
      channelState: null,
      eligibility: "excluded",
      exclusionReason: "noVerifiedEndpoint",
      endpointHash: null,
      programRecipient: {
        programId,
        recipientKey: unreachable.recipientKey,
        guestIds: unreachable.guestIds,
        householdId: unreachable.recipientKey.startsWith("household:") ?
          unreachable.recipientKey.slice("household:".length) : null,
        endpointGuestId: unreachable.guestIds[0],
        phoneE164: null,
        messagingConsent: null,
      },
    });
  }
  const tooLarge = audienceRows.length > organizerCampaignAudienceLimit;
  return {rows: audienceRows.slice(0, organizerCampaignAudienceLimit),
    tooLarge};
}

async function loadSavedAudienceCampaignRows(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  savedAudience: OrganizerSavedAudienceDocument;
  now: FirebaseFirestore.Timestamp;
  contactId?: string;
}): Promise<{ rows: AudienceRow[]; tooLarge: boolean }> {
  const matches = await resolveSavedAudienceRows({
    db: params.db,
    organizerId: params.organizerId,
    definition: params.savedAudience.definition,
    now: params.now,
  });
  return {
    rows: evaluateAudienceRows(
      matches.filter((row) => !params.contactId ||
        row.contactId === params.contactId)
        .map((row: SavedAudienceEvaluationRow) => ({
          contactId: row.contactId,
          contact: row.contact,
          trait: row.trait,
          preference: row.preference,
          channelState: row.channelState,
        })),
      params.now,
      null,
    ),
    tooLarge: false,
  };
}

async function loadLegacyAudienceRows(params: {
  db: FirebaseFirestore.Firestore;
  organizerId: string;
  segmentIds: OrganizerCampaignDocument["segmentIds"];
  now: FirebaseFirestore.Timestamp;
}): Promise<{ rows: AudienceRow[]; tooLarge: boolean }> {
  const traitSnap = await params.db
    .collection("organizerContactTraits")
    .where("organizerId", "==", params.organizerId)
    .where("segmentIds", "array-contains-any", params.segmentIds)
    .orderBy(admin.firestore.FieldPath.documentId())
    .limit(organizerCampaignAudienceLimit + 1)
    .get();
  const selected = traitSnap.docs.slice(0, organizerCampaignAudienceLimit);
  const contactSnaps =
    selected.length === 0 ?
      [] :
      await params.db.getAll(
        ...selected.map((doc) =>
          params.db.collection("organizerContacts").doc(doc.id),
        ),
      );
  const contacts = contactSnaps.map(
    (snap) => snap.data() as OrganizerContactDocument | undefined,
  );
  const preferenceRefs = contacts
    .filter((contact) => contact?.linkedUid)
    .map((contact) =>
      params.db
        .collection("organizerCommunicationPreferences")
        .doc(
          organizerCommunicationPreferenceId(
            params.organizerId,
            contact!.linkedUid!,
          ),
        ),
    );
  const channelRefs = selected.map((doc) =>
    params.db
      .collection("organizerContactChannelStates")
      .doc(organizerContactChannelStateId(params.organizerId, doc.id)),
  );
  const [preferenceSnaps, channelSnaps] = await Promise.all([
    preferenceRefs.length === 0 ? [] : params.db.getAll(...preferenceRefs),
    channelRefs.length === 0 ? [] : params.db.getAll(...channelRefs),
  ]);
  const preferences = new Map(
    preferenceSnaps.map((snap) => [
      (snap.data() as OrganizerCommunicationPreferenceDocument | undefined)
        ?.uid,
      snap.data() as OrganizerCommunicationPreferenceDocument | undefined,
    ]),
  );
  const channelStates = new Map(
    channelSnaps.map((snap) => [
      (snap.data() as OrganizerContactChannelStateDocument | undefined)
        ?.contactId,
      snap.data() as OrganizerContactChannelStateDocument | undefined,
    ]),
  );
  return {
    rows: evaluateAudienceRows(
      selected.map((traitSnap, index) => ({
        contactId: traitSnap.id,
        trait: traitSnap.data() as OrganizerContactTraitDocument,
        contact: contacts[index],
        preference: contacts[index]?.linkedUid ?
          (preferences.get(contacts[index]?.linkedUid ?? "") ?? null) :
          null,
        channelState: channelStates.get(traitSnap.id) ?? null,
      })),
      params.now,
      params.segmentIds,
    ),
    tooLarge: traitSnap.size > organizerCampaignAudienceLimit,
  };
}

function audienceRowsFromSnapshots(params: {
  organizerId: string;
  segmentIds: OrganizerCampaignDocument["segmentIds"] | null;
  originalRows: AudienceRow[];
  snapshots: FirebaseFirestore.DocumentSnapshot[];
  now: FirebaseFirestore.Timestamp;
}): AudienceRow[] {
  let index = 0;
  const inputs = params.originalRows.map((original) => {
    const contact = params.snapshots[index++].data() as
      | OrganizerContactDocument
      | undefined;
    const trait = params.snapshots[index++].data() as
      | OrganizerContactTraitDocument
      | undefined;
    let preference: OrganizerCommunicationPreferenceDocument | null = null;
    if (original.contact?.linkedUid) {
      preference =
        (params.snapshots[index++].data() as
          | OrganizerCommunicationPreferenceDocument
          | undefined) ?? null;
    }
    const channelState =
      (params.snapshots[index++].data() as
        | OrganizerContactChannelStateDocument
        | undefined) ?? null;
    return {
      contactId: original.contactId,
      contact,
      trait,
      preference,
      channelState,
    };
  });
  return evaluateAudienceRows(inputs, params.now, params.segmentIds);
}

export function evaluateAudienceRows(
  inputs: Array<{
    contactId: string;
    contact: OrganizerContactDocument | undefined;
    trait: OrganizerContactTraitDocument | undefined;
    preference: OrganizerCommunicationPreferenceDocument | null;
    channelState: OrganizerContactChannelStateDocument | null;
  }>,
  now: FirebaseFirestore.Timestamp,
  segmentIds: OrganizerCampaignDocument["segmentIds"] | null,
): AudienceRow[] {
  const seenEndpoints = new Set<string>();
  return inputs.map((input): AudienceRow => {
    const {contact, trait, preference, channelState} = input;
    let reason: ExclusionReason = null;
    if (!contact || !trait || contact.deletedAt !== null ||
        contact.hiddenAt != null) reason = "deleted";
    else if (
      contact.identityState !== "verified" ||
      contact.identityConfidence !== "verified" ||
      !contact.linkedUid
    ) {
      reason = "identityUnresolved";
    } else if (
      segmentIds !== null &&
      !trait.segmentIds.some((id) =>
        segmentIds.includes(
          id as OrganizerCampaignDocument["segmentIds"][number],
        ),
      )
    ) {
      reason = "deleted";
    } else if (
      !contact.phoneE164 ||
      !/^\+[1-9][0-9]{7,14}$/.test(contact.phoneE164)
    ) {
      reason = "noVerifiedEndpoint";
    } else if (
      !preference ||
      preference.organizerId !== contact.organizerId ||
      preference.uid !== contact.linkedUid ||
      effectiveOrganizerWhatsappPurposeStatus(preference, "marketing",
        contact.phoneE164) ===
        "unknown"
    ) {
      reason = "unknownPermission";
    } else if (
      effectiveOrganizerWhatsappPurposeStatus(preference, "marketing",
        contact.phoneE164) ===
        "optedOut"
    ) reason = "optedOut";
    else if (channelState?.suppressionStatus === "optedOut") {
      reason = "optedOut";
    } else if (channelState?.suppressionStatus === "providerBlocked") {
      reason = "providerBlocked";
    } else if (channelState?.suppressionStatus === "invalidEndpoint") {
      reason = "invalidEndpoint";
    } else if (channelState?.adminSuppressed === true ||
        channelState?.suppressionStatus === "adminSuppressed") {
      reason = "providerBlocked";
    } else if (
      channelState?.lastCampaignAcceptedAt &&
      now.toMillis() - channelState.lastCampaignAcceptedAt.toMillis() <
        organizerCampaignFrequencyCapMillis
    ) {
      reason = "frequencyCapped";
    }
    const endpointHash = contact?.phoneE164 ?
      hashEndpoint(contact.phoneE164) :
      null;
    if (!reason && endpointHash && seenEndpoints.has(endpointHash)) {
      reason = "duplicateEndpoint";
    }
    if (!reason && endpointHash) seenEndpoints.add(endpointHash);
    return {
      contactId: input.contactId,
      contact: contact ?? deletedContact(input.contactId, now),
      trait: trait ?? deletedTrait(input.contactId, now),
      preference,
      channelState,
      eligibility: reason ? "excluded" : "eligible",
      exclusionReason: reason,
      endpointHash,
    };
  });
}

function audienceCounts(
  rows: AudienceRow[],
): OrganizerCampaignDocument["audienceCounts"] {
  const counts = emptyCampaignAudienceCounts();
  counts.total = rows.length;
  for (const row of rows) {
    if (row.eligibility === "eligible") counts.reachable += 1;
    else if (row.exclusionReason === "optedOut") counts.optedOut += 1;
    else if (
      ["invalidEndpoint", "noVerifiedEndpoint"].includes(
        row.exclusionReason ?? "",
      )
    ) {
      counts.invalid += 1;
    } else if (row.exclusionReason === "duplicateEndpoint") {
      counts.duplicate += 1;
    } else if (row.exclusionReason === "frequencyCapped") {
      counts.frequencyCapped += 1;
    } else if (row.exclusionReason === "providerBlocked") {
      counts.providerBlocked += 1;
    } else if (
      row.exclusionReason === "unknownPermission" ||
      row.exclusionReason === "identityUnresolved"
    ) {
      counts.unknown += 1;
    } else counts.unsupported += 1;
  }
  return counts;
}

function deliveryCounts(
  rows: AudienceRow[],
): OrganizerCampaignDocument["deliveryCounts"] {
  const counts = emptyCampaignDeliveryCounts();
  counts.pending = rows.filter((row) => row.eligibility === "eligible").length;
  counts.suppressed = rows.length - counts.pending;
  return counts;
}

function campaignBlockers(
  context: CampaignContext,
  now: FirebaseFirestore.Timestamp,
): CampaignBlocker[] {
  const blockers: CampaignBlocker[] = [];
  const campaign = context.campaign;
  if (!context.connection) blockers.push("providerSetupRequired");
  else if (context.connection.status !== "active") {
    blockers.push("senderInactive");
  }
  if (!context.template) blockers.push("templateMissing");
  else if (context.template.status !== "APPROVED") {
    blockers.push("templateUnapproved");
  }
  if (
    context.template &&
    !templateVariablesMatch(
      context.template.variableNames,
      campaign.templateVariables,
      campaign.eventId !== null,
    )
  ) {
    blockers.push("templateUnapproved");
  }
  if (campaign.savedAudienceId && !context.savedAudience) {
    blockers.push("savedAudienceMissing");
  } else if (context.savedAudienceChanged) {
    blockers.push("savedAudienceChanged");
  }
  // CRM coverage is irrelevant to program audiences — resolution is
  // exact by construction.
  if (
    campaign.recipientSource?.kind !== "programSelection" &&
    context.summary?.sourceCoverage !== "exact"
  ) {
    blockers.push("audienceCoveragePartial");
  }
  if (context.audienceTooLarge) blockers.push("audienceTooLarge");
  if (!hasReachableCampaignRecipient(context.audienceRows)) {
    blockers.push("noReachableRecipients");
  }
  if (campaign.eventId && !context.event) blockers.push("eventMissing");
  else if (
    context.event &&
    !eventSupportsDestination(context.event, campaign.inviteDestinationKind)
  ) {
    blockers.push("eventUnavailable");
  }
  if (
    campaign.scheduledAt &&
    campaign.scheduledAt.toMillis() < now.toMillis()
  ) {
    blockers.push("scheduleInPast");
  }
  if (!["draft", "previewed"].includes(campaign.status)) {
    blockers.push("campaignImmutable");
  }
  if (campaign.status === "cancelled") blockers.push("campaignCancelled");
  if (["completed", "partiallyFailed"].includes(campaign.status)) {
    blockers.push("campaignComplete");
  }
  if (
    campaign.leaseExpiresAt &&
    campaign.leaseExpiresAt.toMillis() > now.toMillis()
  ) {
    blockers.push("campaignLeaseActive");
  }
  return [...new Set(blockers)];
}

export function hasReachableCampaignRecipient(
  rows: ReadonlyArray<{ eligibility: "eligible" | "excluded" }>,
): boolean {
  return rows.some((row) => row.eligibility === "eligible");
}

export function campaignAudienceSnapshotHash(rows: AudienceRow[]): string {
  return hashCanonical(
    [...rows]
      .sort((left, right) => left.contactId.localeCompare(right.contactId))
      .map((row) => ({
        contactId: row.contactId,
        eligibility: row.eligibility,
        exclusionReason: row.exclusionReason,
        endpointHash: row.endpointHash,
        permissionTermsVersion:
          row.preference?.whatsapp.termsVersion ?? null,
        permissionUpdatedAtMillis:
          row.preference?.whatsapp.updatedAt?.toMillis() ?? null,
      })),
  );
}

function campaignResponse(
  context: CampaignContext,
  now: FirebaseFirestore.Timestamp,
): OrganizerCampaignCallableResponse {
  const blockers = campaignBlockers(context, now);
  return {
    organizerId: context.campaign.organizerId,
    campaignId: context.campaignId,
    savedAudienceId: context.campaign.savedAudienceId ?? null,
    status: context.campaign.status,
    revision: context.campaign.revision,
    audienceCounts: context.campaign.audienceCounts,
    deliveryCounts: context.campaign.deliveryCounts,
    senderStatus: context.connection?.status ?? "notConnected",
    templateStatus: context.template?.status ?? "missing",
    canApprove:
      context.campaign.status === "previewed" && blockers.length === 0,
    canDispatch:
      ["approved", "scheduled"].includes(context.campaign.status) &&
      context.connection?.status === "active" &&
      context.template?.status === "APPROVED",
    blockers,
  };
}

function templateVariablesMatch(
  expected: string[],
  provided: Record<string, string>,
  hasEvent: boolean,
): boolean {
  const providedKeys = Object.keys(provided);
  return (
    expected.every((key) =>
      isInviteTemplateVariable(key) ? hasEvent : providedKeys.includes(key),
    ) && providedKeys.every((key) => expected.includes(key))
  );
}

function isInviteTemplateVariable(value: string): boolean {
  return value === "invite_url" || value === "invite_token";
}

function eventSupportsDestination(
  event: EventDocument,
  destination: OrganizerCampaignDocument["inviteDestinationKind"],
): boolean {
  if (event.status !== "active") return false;
  if (destination === "eventRuntime") {
    return (
      event.runtimeAccess?.enabled === true &&
      Boolean(event.runtimeAccess.publicRuntimeId)
    );
  }
  if (destination === "externalBooking") {
    return (
      event.eventOrigin?.mode === "externalCompanion" &&
      Boolean(event.eventOrigin.externalEventUrl)
    );
  }
  if (destination === "catchEvent") {
    return event.publicRegistrationEnabled === true;
  }
  return destination === "marketingLanding";
}

export function campaignVariables(
  campaign: OrganizerCampaignDocument,
  inviteToken: string | null,
  event: EventDocument | null,
  templateVariableNames: string[],
): Record<string, string> {
  const variables = {...campaign.templateVariables};
  if (campaign.eventId && inviteToken) {
    if (event && templateVariableNames.includes("invite_url")) {
      variables.invite_url = campaignInviteUrl(inviteToken);
    }
    if (templateVariableNames.includes("invite_token")) {
      variables.invite_token = encodeURIComponent(inviteToken);
    }
  }
  return variables;
}

function campaignInviteUrl(token: string): string {
  return `${BRAND.web.origin}/invite/${encodeURIComponent(token)}`;
}

function campaignInviteLinkId(campaignId: string, contactId: string): string {
  return `ecil_${hashCanonical({campaignId, contactId}).slice(0, 48)}`;
}

function createCampaignInviteLink(params: {
  tx: FirebaseFirestore.Transaction;
  db: FirebaseFirestore.Firestore;
  inviteLinkId: string;
  token: string;
  campaignId: string;
  campaign: OrganizerCampaignDocument;
  contactId: string;
  hostUid: string;
  event: EventDocument;
  now: FirebaseFirestore.Timestamp;
}): void {
  const organizerId = params.event.organizerId ?? params.event.clubId;
  const linkRef = params.db
    .collection("eventInviteLinks")
    .doc(params.inviteLinkId);
  const secretRef = params.db
    .collection("eventInviteLinkSecrets")
    .doc(params.inviteLinkId);
  params.tx.create(linkRef, {
    eventId: params.campaign.eventId,
    clubId: params.event.clubId,
    organizerId,
    hostUid: params.hostUid,
    label: params.campaign.name.slice(0, 80),
    source: "campaign",
    tokenHash: inviteLinkTokenHash(params.token),
    contractVersion: 2,
    linkKind: "directRecipient",
    ownerContactId: null,
    ownerUid: null,
    intendedRecipientContactId: params.contactId,
    campaignId: params.campaignId,
    issuanceChannel: "campaign",
    destinationKind: params.campaign.inviteDestinationKind,
    tokenVersion: 2,
    attributionWindowEndsAt: admin.firestore.Timestamp.fromMillis(
      params.now.toMillis() + 30 * 24 * 60 * 60 * 1000,
    ),
    openCount: 0,
    likelyHumanOpenCount: 0,
    shareIntentCount: 0,
    verifiedRegistrationCount: 0,
    referredRegistrationCount: 0,
    referredCheckedInCount: 0,
    requestCount: 0,
    confirmedCount: 0,
    paidCount: 0,
    checkedInCount: 0,
    catcherCount: 0,
    matchCount: 0,
    chatStartedCount: 0,
    disabledAt: null,
    createdAt: params.now,
    updatedAt: params.now,
  });
  params.tx.create(secretRef, {
    eventId: params.campaign.eventId,
    organizerId,
    token: params.token,
    tokenHash: inviteLinkTokenHash(params.token),
    tokenVersion: 2,
    createdAt: params.now,
    updatedAt: params.now,
  });
}

function assertExpectedRevision(
  campaign: OrganizerCampaignDocument,
  expectedRevision: number | null,
): void {
  if (expectedRevision !== null && campaign.revision !== expectedRevision) {
    throw new HttpsError(
      "aborted",
      "Campaign changed. Refresh before continuing.",
    );
  }
}

function normalizePayload(data: unknown): unknown {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return data;
  }
  const normalized = {...(data as Record<string, unknown>)};
  for (const [key, value] of Object.entries(normalized)) {
    if (typeof value === "string") normalized[key] = value.trim();
  }
  if (
    typeof normalized.templateVariables === "object" &&
    normalized.templateVariables !== null &&
    !Array.isArray(normalized.templateVariables)
  ) {
    normalized.templateVariables = Object.fromEntries(
      Object.entries(
        normalized.templateVariables as Record<string, unknown>,
      ).map(([key, value]) => [
        key.trim(),
        typeof value === "string" ? value.trim() : value,
      ]),
    );
  }
  return normalized;
}

function deletedContact(
  contactId: string,
  now: FirebaseFirestore.Timestamp,
): OrganizerContactDocument {
  return {
    organizerId: "deleted",
    displayName: contactId,
    searchName: contactId,
    linkedUid: null,
    phoneE164: null,
    email: null,
    identityState: "unlinked",
    identityConfidence: "eventOnly",
    primarySource: "hostManual",
    ambiguousCandidateContactIds: [],
    firstSeenAt: now,
    lastSeenAt: now,
    sourceCount: 0,
    whatsappStatus: "unknown",
    smsStatus: "unknown",
    revision: 1,
    mergedIntoContactId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: now,
    displayNameOverride: null,
    hiddenAt: null,
    hiddenBy: null,
  };
}

function deletedTrait(
  contactId: string,
  now: FirebaseFirestore.Timestamp,
): OrganizerContactTraitDocument {
  return {
    organizerId: "deleted",
    contactId,
    expectedEventCount: 0,
    attendedEventCount: 0,
    cancelledEventCount: 0,
    noShowCount: 0,
    importedEventCount: 0,
    referredRegistrationCount: 0,
    referredCheckedInCount: 0,
    referredCheckedIn365DayCount: 0,
    linkedAccount: false,
    firstSeenAt: now,
    lastSeenAt: now,
    firstAttendedAt: null,
    lastAttendedAt: null,
    attendanceRate: null,
    segmentIds: [],
    definitionVersion: 1,
    whatsappStatus: "unknown",
    smsStatus: "unknown",
    sourceCoverage: "insufficientData",
    projectionVersion: 1,
    computedAt: now,
  };
}

const campaignCallableLimits = {
  timeoutSeconds: 60,
  maxInstances: 30,
  concurrency: 40,
};

export const upsertOrganizerCampaign = onCall(
  appCheckCallableOptionsWithLimits(campaignCallableLimits),
  (request) => upsertOrganizerCampaignHandler(request),
);
export const previewOrganizerCampaign = onCall(
  appCheckCallableOptionsWithLimits(campaignCallableLimits),
  (request) => previewOrganizerCampaignHandler(request),
);
export const approveOrganizerCampaign = onCall(
  appCheckCallableOptionsWithLimits(campaignCallableLimits),
  (request) => approveOrganizerCampaignHandler(request),
);
export const cancelOrganizerCampaign = onCall(
  appCheckCallableOptionsWithLimits(campaignCallableLimits),
  (request) => cancelOrganizerCampaignHandler(request),
);
export const getOrganizerCampaignReport = onCall(
  appCheckCallableOptionsWithLimits(campaignCallableLimits),
  (request) => getOrganizerCampaignReportHandler(request),
);
