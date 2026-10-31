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
} from "./automationDelivery";
import {
  automationDeliveryAdapter,
} from "./automationDelivery";
import type {AutomationDeliveryMessageIntent as MessageIntent} from
  "../shared/generated/automationDeliveryMessageIntent";
import type {
  EventDocument,
  EventInviteLinkDocument,
  OrganizerCampaignDocument,
  OrganizerCommunicationPreferenceDocument,
  OrganizerContactChannelStateDocument,
  OrganizerContactDocument,
  OrganizerDocument,
  OrganizerFormAutomationRuleDocument,
  OrganizerMessageTemplateDocument,
  OrganizerSenderConnectionDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  MetaProviderError, MetaWhatsappProvider, OrganizerTokenStore,
  metaTemplateFromDocument,
} from "./organizerWhatsappProvider";
import {whatsappStatusCorrelation} from
  "../eventSuccess/operations/whatsappDeliveryProtocol";
import {validateAutomationWhatsappDispatchDocument} from
  "../shared/generated/validators/automationWhatsappDispatchDocument";
import {
  effectiveOrganizerWhatsappPurposeStatus,
  organizerCommunicationPreferenceId,
} from "../shared/organizerCommunicationPreferences";
import {isOrganizerManager} from "../shared/organizerHosts";
import {
  hashEndpoint,
  organizerCampaignFrequencyCapMillis,
  organizerContactChannelStateId,
} from "./organizerCampaignModel";
import {
  organizerAutomationDueMillis, readOrganizerAutomationEventTx,
} from "./organizerAutomationSource";
import {momentFromDocument} from "../moments/momentDocuments";

/** Claim-time submission evidence for webhook status correlation. */
export const AUTOMATION_WHATSAPP_DISPATCHES = "automationWhatsappDispatches";

export type AutomationDeliveryOutbox = FirestoreDeliveryOutbox<
  MessageIntent["context"], ProviderBinding, MessageIntent, DeliveryAttempt,
  MessageRecord>;

export type AutomationSubmissionOutcome =
  {kind: "accepted"; providerMessageId: string} | {kind: "unknown"};

/**
 * Internal suppression taxonomy — the same strings the campaign recipient
 * mirror records, so automation suppression stays legible next to campaign
 * outcomes. The moments journal maps these onto its own reason enum.
 */
export type AutomationSuppression =
  "deleted" | "identityUnresolved" | "invalidEndpoint" |
    "unknownPermission" | "optedOut" | "providerBlocked" | "frequencyCapped" |
    "audienceExcluded" | "inviteRevoked";

export type AutomationDispatchResult =
  | {kind: "suppressed"; reason: AutomationSuppression}
  | {kind: "withheld"; reason: "permitExpired" | "notReserved" |
    "rehearsal" | "authorityChanged" | "authorizationExpired" |
    "deliveryConflict" | "resourceUnavailable"}
  | {kind: "waiting"; reason: "retryBackoff" | "reconcile" | "staleFacts" |
    "ruleEnded" | "alreadyDelivered" | "superseded" | "recipientWithdrawn" |
    "expired" | "conflicted" | "recordMissing"}
  | {kind: "notDue"; notBefore: number}
  | {kind: "terminal"; reason: "attemptLimit" | "policyRejected" |
    "recipientNeedsReview" | "providerOwnsFallback" | "providerFailed"}
  | {kind: "submitted"; outcome: AutomationSubmissionOutcome};

const FACT_SNAPSHOT_MS = 120_000;

/**
 * The claim-time authority read shared by reserve and claim.
 * Every document a suppression or authorization decision consumes is read
 * inside the transaction: the rule and its approved revisions, the
 * companion moment (instruction revision), the recipe, the live source
 * event, the current contact identity, permission/channel state, sender,
 * template, and any minted invitation link.
 */
async function readAutomationFacts(
  tx: Transaction, db: Firestore, intent: MessageIntent, nowMillis: number
): Promise<{
  gate: DeliveryDispatchGate;
  suppression: AutomationSuppression | null;
  notBefore: number | null;
  snapshot: AutomationFactSnapshot | null;
}> {
  const context = intent.context;
  const stop = (reason: string, notBefore: number | null = null) => ({
    gate: {kind: "stop", reason} as DeliveryDispatchGate,
    suppression: null as AutomationSuppression | null,
    notBefore,
    snapshot: null as AutomationFactSnapshot | null,
  });

  const [ruleSnap, momentSnap, recipeSnap, organizerSnap] =
    await Promise.all([
      tx.get(db.collection("organizerFormAutomationRules")
        .doc(context.ruleId)),
      tx.get(db.collection("organizerMoments")
        .doc(intent.workflow.momentId)),
      tx.get(db.collection("organizerCampaigns")
        .doc(context.recipeCampaignId)),
      tx.get(db.collection("organizers").doc(context.organizerId)),
    ]);
  const rule = ruleSnap.data() as
    | OrganizerFormAutomationRuleDocument
    | undefined;
  const momentDoc = momentSnap.data() as Record<string, unknown> | undefined;
  const recipe = recipeSnap.data() as OrganizerCampaignDocument | undefined;
  const organizer = organizerSnap.data() as OrganizerDocument | undefined;

  // --- Authorization bindings: rule, recipe, and companion revisions.
  if (!rule || rule.organizerId !== context.organizerId || !rule.enabled) {
    return stop("ruleEnded");
  }
  const action = rule.actions.find(
    (item) => item.actionId === context.actionId,
  );
  if (rule.revision !== context.ruleRevision ||
      action?.kind !== "campaignHandoff" ||
      action.campaignId !== context.recipeCampaignId ||
      action.campaignRevision !== context.recipeRevision) {
    return stop("superseded");
  }
  const moment = momentDoc ? momentFromDocument(momentDoc) : null;
  if (!moment || moment.origin !== "formAutomation" ||
      moment.scope.kind !== "organizer" ||
      moment.scope.organizerId !== context.organizerId ||
      moment.initiation.kind !== "triggered" ||
      moment.initiation.triggerKind !== "formAutomation" ||
      moment.initiation.automation?.ruleId !== context.ruleId ||
      moment.initiation.automation.actionId !== context.actionId ||
      moment.initiation.automation.ruleRevision !== context.ruleRevision ||
      moment.initiation.automation.recipeCampaignId !==
        context.recipeCampaignId ||
      moment.initiation.automation.recipeRevision !==
        context.recipeRevision ||
      moment.status !== "armed") {
    return stop("superseded");
  }
  if (!recipe || recipe.organizerId !== context.organizerId ||
      recipe.revision !== context.recipeRevision ||
      !["draft", "previewed"].includes(recipe.status) ||
      recipe.scheduledAt) {
    return stop("superseded");
  }
  // The rule's approver must still hold manager authority.
  if (!organizer || !isOrganizerManager(organizer, rule.updatedByUid)) {
    return stop("permissionRevoked");
  }

  // --- Source occurrence: the live event re-derived transactionally.
  const source = await readOrganizerAutomationEventTx(
    tx, db, context.eventKind, context.sourceId);
  if (!source || source.organizerId !== context.organizerId) {
    return stop("recipientWithdrawn");
  }
  // A contact merge follows the send to the surviving identity; a removed
  // or unavailable identity withdraws the recipient.
  const liveContactId = source.contactId;
  if (!liveContactId) {
    return stop("recipientWithdrawn");
  }
  const dueMillis = organizerAutomationDueMillis(source, rule);
  if (dueMillis > nowMillis) {
    // The event's end time (or delay horizon) moved forward — this is a
    // deferral, not a stop. The seam re-arms the run at the live due.
    return {
      gate: {kind: "stop", reason: "notDue"},
      suppression: null,
      notBefore: dueMillis,
      snapshot: null,
    };
  }

  const gate: DeliveryDispatchGate = {
    kind: "allow",
    checkedAt: nowMillis,
    validUntil: Math.min(nowMillis + FACT_SNAPSHOT_MS, intent.expiresAt),
    instructionRevision: moment.revision,
  };

  // --- Contact policy + sender/template/invite liveness, all in-tx.
  const contactRef = db.collection("organizerContacts").doc(liveContactId);
  const connectionRef = db.collection("organizerSenderConnections")
    .doc(intent.whatsapp.connectionId);
  const templateRef = db.collection("organizerMessageTemplates")
    .doc(intent.whatsapp.templateId);
  const contactSnap = await tx.get(contactRef);
  const contact = contactSnap.data() as
    | OrganizerContactDocument
    | undefined;
  const preferenceRef = contact?.linkedUid ?
    db.collection("organizerCommunicationPreferences").doc(
      organizerCommunicationPreferenceId(
        context.organizerId, contact.linkedUid)) :
    null;
  const channelRef = db.collection("organizerContactChannelStates").doc(
    organizerContactChannelStateId(context.organizerId, liveContactId));
  const eventRef = intent.whatsapp.eventId ?
    db.collection("events").doc(intent.whatsapp.eventId) :
    null;
  const inviteLinkRef = intent.whatsapp.inviteLinkId ?
    db.collection("eventInviteLinks").doc(intent.whatsapp.inviteLinkId) :
    null;
  const inviteSecretRef = intent.whatsapp.inviteLinkId ?
    db.collection("eventInviteLinkSecrets")
      .doc(intent.whatsapp.inviteLinkId) :
    null;
  const [preferenceSnap, channelSnap, connectionSnap, templateSnap,
    eventSnap, inviteLinkSnap, inviteSecretSnap] = await Promise.all([
    preferenceRef ? tx.get(preferenceRef) : null,
    tx.get(channelRef),
    tx.get(connectionRef),
    tx.get(templateRef),
    eventRef ? tx.get(eventRef) : null,
    inviteLinkRef ? tx.get(inviteLinkRef) : null,
    inviteSecretRef ? tx.get(inviteSecretRef) : null,
  ]);
  const preference = preferenceSnap?.data() as
    | OrganizerCommunicationPreferenceDocument
    | undefined;
  const channelState = channelSnap.data() as
    | OrganizerContactChannelStateDocument
    | undefined;
  const connection = connectionSnap.data() as
    | OrganizerSenderConnectionDocument
    | undefined;
  const template = templateSnap.data() as
    | OrganizerMessageTemplateDocument
    | undefined;
  const event = eventSnap?.data() as EventDocument | undefined;
  const inviteLink = inviteLinkSnap?.data() as
    | EventInviteLinkDocument
    | undefined;
  const inviteToken = typeof inviteSecretSnap?.data()?.token === "string" ?
    (inviteSecretSnap!.data()!.token as string) :
    null;
  const now = admin.firestore.Timestamp.fromMillis(nowMillis);
  const suppression = automationSuppressionReason({
    organizerId: context.organizerId,
    contact, preference, channelState, connection, template,
    recipe, event, inviteLink, inviteToken,
    intentInviteLinkId: intent.whatsapp.inviteLinkId,
    now,
  });
  if (suppression || !contact?.phoneE164 || !connection || !template) {
    return {gate, suppression: suppression ?? "providerBlocked",
      notBefore: null, snapshot: null};
  }
  return {gate, suppression: null, notBefore: null,
    snapshot: {
      rule, moment, recipe, contact, preference, channelState,
      connection, template, contactId: liveContactId,
      endpointHash: hashEndpoint(contact.phoneE164),
    }};
}

interface AutomationFactSnapshot {
  rule: OrganizerFormAutomationRuleDocument;
  moment: NonNullable<ReturnType<typeof momentFromDocument>>;
  recipe: OrganizerCampaignDocument;
  contact: OrganizerContactDocument;
  preference: OrganizerCommunicationPreferenceDocument | undefined;
  channelState: OrganizerContactChannelStateDocument | undefined;
  connection: OrganizerSenderConnectionDocument;
  template: OrganizerMessageTemplateDocument;
  contactId: string;
  endpointHash: string;
}

/**
 * Contact-policy gate shared in shape with the campaign recipient mirror:
 * deletion, identity, endpoint, permission, suppression, frequency cap,
 * then the sender/template/invite chain. There is no frozen recipient row
 * — the live contact supplies the endpoint hash.
 */
function automationSuppressionReason(params: {
  organizerId: string;
  contact: OrganizerContactDocument | undefined;
  preference: OrganizerCommunicationPreferenceDocument | undefined;
  channelState: OrganizerContactChannelStateDocument | undefined;
  connection: OrganizerSenderConnectionDocument | undefined;
  template: OrganizerMessageTemplateDocument | undefined;
  recipe: OrganizerCampaignDocument;
  event: EventDocument | undefined;
  inviteLink: EventInviteLinkDocument | undefined;
  inviteToken: string | null;
  intentInviteLinkId: string | null;
  now: FirebaseFirestore.Timestamp;
}): AutomationSuppression | null {
  if (!params.contact || params.contact.deletedAt !== null ||
      params.contact.hiddenAt != null) return "deleted";
  if (
    params.contact.identityState !== "verified" ||
    params.contact.identityConfidence !== "verified" ||
    !params.contact.linkedUid
  ) {
    return "identityUnresolved";
  }
  if (!params.contact.phoneE164) {
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
  if (params.channelState?.adminSuppressed === true) {
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
  return automationSenderGate(params);
}

/** Sender connection, template, event, and invite checks — identity-free. */
function automationSenderGate(params: {
  organizerId: string;
  connection: OrganizerSenderConnectionDocument | undefined;
  template: OrganizerMessageTemplateDocument | undefined;
  recipe: OrganizerCampaignDocument;
  event: EventDocument | undefined;
  inviteLink: EventInviteLinkDocument | undefined;
  inviteToken: string | null;
  intentInviteLinkId: string | null;
}): AutomationSuppression | null {
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
      params.template.connectionId !== params.recipe.connectionId) ||
    params.template.status !== "APPROVED"
  ) {
    return "providerBlocked";
  }
  if (params.recipe.eventId) {
    if (!params.event ||
        (params.event.organizerId) !==
          params.organizerId ||
        params.event.status !== "active") {
      return "providerBlocked";
    }
    if (!params.intentInviteLinkId || !params.inviteLink ||
        params.inviteLink.disabledAt != null ||
        params.inviteLink.organizerId !== params.organizerId ||
        !params.inviteToken) {
      return "inviteRevoked";
    }
  }
  return null;
}

interface PreparedWhatsappSender {
  connection: OrganizerSenderConnectionDocument;
  template: OrganizerMessageTemplateDocument;
  accessToken: string;
}

/**
 * Claim → submit → record. The claim transaction re-reads the live contact
 * endpoint, sender, and template so the number dialed and the payload sent
 * are exactly what the reservation authorized; the dispatch evidence
 * commits atomically with the claim.
 */
async function dispatchAutomationWhatsapp(
  db: Firestore, outbox: AutomationDeliveryOutbox,
  messageId: string, attemptId: string, intent: MessageIntent,
  sender: PreparedWhatsappSender, liveContactId: string,
  provider: Pick<MetaWhatsappProvider, "sendTemplate">,
  clock: () => number
): Promise<AutomationDispatchResult> {
  const claim = await outbox.claimLiveDispatch<{
    e164: string; payloadHash: string}>(
      messageId, attemptId,
      async (tx, liveRecord, liveAttempt, now) => {
        const contactRef = db.collection("organizerContacts")
          .doc(liveContactId);
        const [contactSnap, connSnap, tplSnap] = await Promise.all([
          tx.get(contactRef),
          tx.get(db.collection("organizerSenderConnections")
            .doc(intent.whatsapp.connectionId)),
          tx.get(db.collection("organizerMessageTemplates")
            .doc(intent.whatsapp.templateId)),
        ]);
        const contact = contactSnap.data() as
          | OrganizerContactDocument
          | undefined;
        const conn = connSnap.data() as
          | OrganizerSenderConnectionDocument
          | undefined;
        const tpl = tplSnap.data() as
          | OrganizerMessageTemplateDocument
          | undefined;
        if (!contact?.phoneE164 ||
            "whatsapp:" + hashEndpoint(contact.phoneE164) !==
              liveAttempt.binding.recipientEndpointId ||
            !conn || conn.status !== "active" || !conn.phoneNumberId ||
            !conn.secretVersionResource || !conn.wabaId ||
            conn.organizerId !== intent.context.organizerId ||
            conn.revision !== liveAttempt.binding.bindingRevision ||
            intent.whatsapp.connectionId !== liveAttempt.binding.senderId ||
            !tpl || tpl.status !== "APPROVED") {
          return {kind: "withheld"};
        }
        const endpointHash = hashEndpoint(contact.phoneE164);
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
        if (!validateAutomationWhatsappDispatchDocument(dispatch)) {
          throw new Error("Invalid automation WhatsApp dispatch evidence");
        }
        const evidenceRef = db.collection(AUTOMATION_WHATSAPP_DISPATCHES)
          .doc(liveAttempt.attemptId);
        if ((await tx.get(evidenceRef)).exists) return {kind: "withheld"};
        return {kind: "ready",
          value: {e164: contact.phoneE164, payloadHash},
          validUntil: Math.min(now + FACT_SNAPSHOT_MS, intent.expiresAt),
          commit: () => {
            tx.create(evidenceRef, dispatch);
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
        providerEventId: "automation-wa-notsent:" + operationContentHash([
          attempt.attemptId, error.providerCode ?? "none",
        ]),
        receivedAt: failedAt,
        state: {kind: "failed", at: failedAt, providerMessageId: null,
          classification: "technical",
          evidenceId: "local:requestNotSent:" +
            String(error.providerCode ?? "none")},
      });
      return {kind: "submitted", outcome: {kind: "unknown"}};
    }
    return {kind: "submitted", outcome: {kind: "unknown"}};
  }
  const now = clock();
  await outbox.recordReceipt(messageId, {
    attemptId: attempt.attemptId, ...attempt.binding,
    providerEventId: "automation-wa-submission:" + operationContentHash([
      attempt.attemptId, providerMessageId,
    ]),
    receivedAt: now,
    state: {kind: "accepted", at: now, providerMessageId},
  });
  await markAutomationAccepted(db, intent.context.organizerId,
    liveContactId, hashEndpoint(claim.resource.e164), now);
  return {kind: "submitted", outcome: {kind: "accepted", providerMessageId}};
}

/** The accepted write to the shared frequency counter — identical shape to
 *  the campaign recipient mirror's channel-state update, so campaign and
 *  automation sends draw on one seven-day ledger per contact. */
async function markAutomationAccepted(
  db: Firestore, organizerId: string, contactId: string,
  endpointHash: string, nowMillis: number
): Promise<void> {
  const now = admin.firestore.Timestamp.fromMillis(nowMillis);
  const stateRef = db.collection("organizerContactChannelStates")
    .doc(organizerContactChannelStateId(organizerId, contactId));
  await db.runTransaction(async (tx) => {
    const existing = (await tx.get(stateRef)).data() as
      | OrganizerContactChannelStateDocument
      | undefined;
    tx.set(stateRef, {
      organizerId,
      contactId,
      channel: "whatsapp",
      endpointHash,
      suppressionStatus: existing?.suppressionStatus ?? "none",
      suppressionSource: existing?.suppressionSource ?? null,
      adminSuppressed: existing?.adminSuppressed ?? false,
      campaignAcceptedCount: (existing?.campaignAcceptedCount ?? 0) + 1,
      lastCampaignAcceptedAt: now,
      lastInboundAt: existing?.lastInboundAt ?? null,
      lastReplyAt: existing?.lastReplyAt ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }, {merge: false});
  });
}

/**
 * Dispatches one automation intent through the shared delivery core:
 * reserve, claim (staging dispatch evidence in the same transaction),
 * submit, and record the provider outcome. Automation semantics are
 * terminal on any confirmed provider failure — a `failed` attempt never
 * earns a second provider submission.
 */
export class AutomationDeliveryWorker {
  constructor(private readonly db: Firestore,
    private readonly provider: Pick<MetaWhatsappProvider, "sendTemplate">,
    private readonly credentials: Pick<OrganizerTokenStore, "accessBound">,
    private readonly clock: () => number = Date.now) {}

  private outbox(readFacts?: ReadDeliveryFacts<MessageIntent,
    ProviderBinding>): AutomationDeliveryOutbox {
    return new FirestoreDeliveryOutbox(this.db, automationDeliveryAdapter,
      readFacts ?? (async () => {
        throw new Error("Automation delivery lookup cannot reserve dispatch");
      }), this.clock);
  }

  /** Read the durable record for an automation message, if it exists. */
  async get(messageId: string): Promise<MessageRecord | null> {
    return this.outbox().get(messageId);
  }

  async dispatch(messageId: string): Promise<AutomationDispatchResult> {
    const outbox = this.outbox();
    const message = await outbox.get(messageId);
    if (!message) return {kind: "waiting", reason: "recordMissing"};
    if (message.lifecycle !== "active") {
      return {kind: "waiting", reason: "ruleEnded"};
    }
    const intent = message.intent;
    // Confirmed provider failure is terminal — the evaluator's technical
    // retry must never reach a second send (campaign parity).
    const latestExisting = [...message.attempts]
      .sort((a, b) => b.ordinal - a.ordinal)[0];
    if (latestExisting && latestExisting.state.kind === "failed") {
      const classification = latestExisting.state.classification;
      const reason = classification === "policy" ||
          classification === "suppressed" ? "policyRejected" as const :
        classification === "invalidRecipient" ?
          "recipientNeedsReview" as const : "providerFailed" as const;
      return {kind: "terminal", reason};
    }
    let lastSuppression: AutomationSuppression | null = null;
    let liveContactId: string | null = null;
    let notBefore: number | null = null;
    const readFacts: ReadDeliveryFacts<MessageIntent, ProviderBinding> =
      async (tx, liveIntent, now) => {
        const {gate, suppression, notBefore: due, snapshot} =
          await readAutomationFacts(tx, this.db, liveIntent, now);
        lastSuppression = suppression;
        notBefore = due;
        liveContactId = snapshot?.contactId ?? null;
        const routes: DeliveryRouteReadiness<ProviderBinding>[] = [];
        if (gate.kind === "stop" || !snapshot) {
          routes.push({routeId: "organizerWhatsappAutomation",
            state: {kind: "blocked",
              reason: suppression ??
                (gate.kind === "stop" ? gate.reason : "policyBlocked")}});
          return {gate, routes};
        }
        const {connection, template, endpointHash} = snapshot;
        routes.push({routeId: "organizerWhatsappAutomation",
          state: {kind: "eligible", checkedAt: now,
            validUntil: Math.min(now + FACT_SNAPSHOT_MS,
              liveIntent.expiresAt),
            permissionRevision: "autoperm:" + operationContentHash([
              connection.revision, template.status,
              template.contentHash ?? null,
              endpointHash,
              intent.context.ruleRevision,
              intent.context.recipeRevision,
            ]),
            candidate: {mode: "live", binding: {
              routeId: "organizerWhatsappAutomation", transport: "whatsapp",
              senderIdentity: "organizerManaged", provider: "meta",
              senderId: liveIntent.whatsapp.connectionId,
              bindingRevision: connection.revision,
              recipientEndpointId: "whatsapp:" + endpointHash,
              fallbackOwner: "catch",
            } satisfies ProviderBinding}}});
        return {gate, routes};
      };
    const reserving = new FirestoreDeliveryOutbox(
      this.db, automationDeliveryAdapter, readFacts, this.clock);
    const reservation = await reserving.reserve(messageId);
    const decision = reservation.decision;
    if (decision.kind !== "dispatch") {
      if (decision.kind === "hostDecision" &&
          decision.reason === "noEligibleRoute" && lastSuppression) {
        return {kind: "suppressed", reason: lastSuppression};
      }
      if (notBefore !== null) {
        return {kind: "notDue", notBefore};
      }
      if (decision.kind === "hostDecision" &&
          (decision.reason === "attemptLimit" ||
           decision.reason === "policyRejected" ||
           decision.reason === "recipientNeedsReview" ||
           decision.reason === "providerOwnsFallback")) {
        return {kind: "terminal", reason: decision.reason};
      }
      if (decision.kind === "hostDecision" &&
          decision.reason === "conflictingDeliveryEvidence") {
        return {kind: "waiting", reason: "conflicted"};
      }
      if (decision.kind === "delivered") {
        return {kind: "waiting", reason: "alreadyDelivered"};
      }
      if (decision.kind === "stop" && decision.reason === "expired") {
        return {kind: "waiting", reason: "expired"};
      }
      return {kind: "waiting",
        reason: decision.kind === "stop" ?
          (decision.reason === "ruleEnded" ? "ruleEnded" :
            decision.reason === "recipientWithdrawn" ?
              "recipientWithdrawn" : "superseded") :
          decision.kind === "wait" ? "retryBackoff" :
            decision.kind === "reconcile" ? "reconcile" : "staleFacts"};
    }
    const attempt = reservation.record.attempts[
      reservation.record.attempts.length - 1];
    if (!attempt || attempt.state.kind !== "reserved" ||
        !liveContactId) {
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
    return dispatchAutomationWhatsapp(this.db, reserving, messageId,
      attempt.attemptId, intent,
      {connection, template, accessToken}, liveContactId,
      this.provider, this.clock);
  }
}

