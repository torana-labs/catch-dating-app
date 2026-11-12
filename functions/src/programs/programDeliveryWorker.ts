import {WHATSAPP_DISPATCHES} from "../delivery/whatsappDispatches";
import * as admin from "firebase-admin";
import {prepareProgramActivityChannel, type ProgramFcmSender} from
  "./programActivityChannel";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {operationContentHash} from "../operations/durableActions";
import type {
  DeliveryDispatchGate, DeliveryRouteReadiness,
} from "../delivery/deliveryCore";
import {FirestoreDeliveryOutbox, ReadDeliveryFacts} from
  "../delivery/firestoreDeliveryOutbox";
import type {
  DeliveryAttempt, LiveAttempt, MessageRecord, ProviderBinding,
} from "./programDelivery";
import {programDeliveryAdapter} from "./programDelivery";
import type {ProgramDeliveryMessageIntent as MessageIntent} from
  "../shared/generated/programDeliveryMessageIntent";
import type {
  OrganizerMessageTemplateDocument,
  OrganizerSenderConnectionDocument,
  ProgramGuestDocument, ProgramHouseholdDocument,
  OrganizerProgramDocument,
} from "../shared/generated/firestoreAdminTypes";
import {
  MetaProviderError, MetaWhatsappProvider, OrganizerTokenStore,
  metaTemplateFromDocument,
} from "../organizers/organizerWhatsappProvider";
import {whatsappStatusCorrelation} from
  "../eventSuccess/operations/whatsappDeliveryProtocol";
import {whatsappEndpointHash} from
  "../eventSuccess/operations/whatsappReplyProtocol";
import {validateProgramWhatsappDispatchDocument} from
  "../shared/generated/validators/programWhatsappDispatchDocument";

import {readProgramGuestFields, readProgramHouseholdFields} from
  "../workspaces/workspaceFieldAuthority";

/** Claim-time submission evidence for webhook status correlation. */
export const PROGRAM_WHATSAPP_DISPATCHES = WHATSAPP_DISPATCHES;

export type ProgramDeliveryOutbox = FirestoreDeliveryOutbox<
  MessageIntent["context"], ProviderBinding, MessageIntent, DeliveryAttempt,
  MessageRecord>;

export type WhatsappSubmissionOutcome =
  {kind: "accepted"; providerMessageId: string} | {kind: "unknown"};

export type ProgramSubmissionOutcome = WhatsappSubmissionOutcome |
  {kind: "activityRecorded"; reason: "noEndpoint" | "preferenceOff"};

export type ProgramChannelDispatchResult =
  | {kind: "withheld"; reason: "permitExpired" | "notReserved" |
    "rehearsal" | "authorityChanged" | "authorizationExpired" |
    "deliveryConflict" | "resourceUnavailable" | "endpointChanged"}
  | {kind: "submitted"; outcome: ProgramSubmissionOutcome};

export type PreparedProgramChannel = {
  kind: "ready";
  routeId: MessageIntent["permittedRoutes"][number];
  readFacts: ReadDeliveryFacts<MessageIntent, ProviderBinding>;
  dispatchReserved(outbox: ProgramDeliveryOutbox, messageId: string,
    attemptId: string): Promise<ProgramChannelDispatchResult>;
} | {kind: "unavailable"; reason: "senderUnavailable" |
  "credentialUnavailable"};

export type ProgramDeliveryWorkerResult =
  | {kind: "withheld"; reason: "senderUnavailable" |
    "credentialUnavailable" |
    Extract<ProgramChannelDispatchResult,
      {kind: "withheld"}>["reason"]}
  | {kind: "waiting"; decision: import("../delivery/deliveryCore")
      .DeliveryDecision<ProviderBinding>}
  | {kind: "submitted"; routeId: string;
    outcome: ProgramSubmissionOutcome};

const FACT_SNAPSHOT_MS = 120_000;

interface RecipientEndpointFacts {
  /** Raw endpoint the channel dispatches to; never persisted on records. */
  e164: string | null;
  /** Deterministic endpoint reference frozen into the attempt binding. */
  endpointId: string | null;
  /** Consent triple from the messaging-consent holder, if any. */
  consent: {granted: boolean; revision: number} | null;
  withdrawn: boolean;
}

function endpointRef(e164: string): string | null {
  const hash = whatsappEndpointHash(e164);
  return hash ? "whatsapp:" + hash : null;
}

/**
 * Resolve the intent's recipient inside the transaction. Households carry
 * their own consent; guests defer to their household's consent row; a
 * missing document means the recipient was withdrawn from the program.
 */
async function readRecipientEndpoint(
  tx: Transaction, db: Firestore, intent: MessageIntent
): Promise<RecipientEndpointFacts> {
  const {kind, recipientKey} = intent.recipient;
  const readHousehold = async (id: string) =>
    (await tx.get(db.collection("programHouseholds").doc(id)))
      .data() as ProgramHouseholdDocument | undefined;
  if (kind === "household") {
    const household = await readHousehold(recipientKey);
    if (!household || household.programId !== intent.programId ||
        household.organizerId !== intent.context.organizerId) {
      return {e164: null, endpointId: null, consent: null,
        withdrawn: true};
    }
    const fields = await readProgramHouseholdFields({db, tx,
      programId: intent.programId, organizerId: intent.context.organizerId,
      householdId: recipientKey, household,
      fields: ["phoneE164"], includeAlternatives: false});
    return {e164: fields.values.phoneE164,
      endpointId: fields.values.phoneE164 ?
        endpointRef(fields.values.phoneE164) : null,
      consent: household.messagingConsent ?
        {granted: household.messagingConsent.granted,
          revision: household.revision} : null,
      withdrawn: false};
  }
  if (kind === "guest") {
    const guest = (await tx.get(db.collection("programGuests")
      .doc(recipientKey))).data() as ProgramGuestDocument | undefined;
    if (!guest || guest.programId !== intent.programId ||
        guest.organizerId !== intent.context.organizerId) {
      return {e164: null, endpointId: null, consent: null,
        withdrawn: true};
    }
    const household = guest.householdId ?
      await readHousehold(guest.householdId) : undefined;
    if (guest.householdId && (!household ||
        household.programId !== intent.programId ||
        household.organizerId !== intent.context.organizerId)) {
      return {e164: null, endpointId: null, consent: null, withdrawn: true};
    }
    const fields = await readProgramGuestFields({db, tx,
      programId: intent.programId, organizerId: intent.context.organizerId,
      guestId: recipientKey, guest,
      fields: ["phoneE164"], includeAlternatives: false});
    return {e164: fields.values.phoneE164,
      endpointId: fields.values.phoneE164 ?
        endpointRef(fields.values.phoneE164) : null,
      consent: household?.messagingConsent ?
        {granted: household.messagingConsent.granted,
          revision: household.revision} : null,
      withdrawn: false};
  }
  // staff endpoints are uid-based; the reminder worker only provisions
  // phone routes today.
  return {e164: null, endpointId: null, consent: null, withdrawn: true};
}

/**
 * The domain gate for program reminders: the program must still be live,
 * the producing moment's revision must still match the intent's frozen
 * instruction revision, and the recipient must still exist.
 */
async function readProgramGate(
  tx: Transaction, db: Firestore, intent: MessageIntent, now: number
): Promise<{gate: DeliveryDispatchGate;
  recipient: RecipientEndpointFacts | null}> {
  const programRef = db.collection("organizerPrograms").doc(intent.programId);
  const momentRef = db.collection("organizerMoments")
    .doc(intent.workflow.momentId);
  const [programSnap, momentSnap] =
    await Promise.all([tx.get(programRef), tx.get(momentRef)]);
  const program = programSnap.data() as
    OrganizerProgramDocument | undefined;
  if (!program) {
    return {gate: {kind: "stop", reason: "programEnded"}, recipient: null};
  }
  if (program.organizerId !== intent.context.organizerId) {
    throw new Error("Program delivery context mismatch");
  }
  if (program.status !== "active" && program.status !== "draft") {
    return {gate: {kind: "stop", reason: "programEnded"}, recipient: null};
  }
  const recipient = await readRecipientEndpoint(tx, db, intent);
  if (recipient.withdrawn) {
    return {gate: {kind: "stop", reason: "recipientWithdrawn"},
      recipient: null};
  }
  const moment = momentSnap.data() as {revision?: number} | undefined;
  return {gate: {kind: "allow", checkedAt: now,
    validUntil: Math.min(now + FACT_SNAPSHOT_MS, intent.expiresAt),
    instructionRevision: moment?.revision ?? -1}, recipient};
}

interface PreparedWhatsappSender {
  connection: OrganizerSenderConnectionDocument;
  template: OrganizerMessageTemplateDocument;
  accessToken: string;
}

/**
 * Slow credential reads finish before the shared route reservation; the
 * claim transaction re-reads the complete sender/consent snapshot.
 */
export async function prepareProgramWhatsappChannel(
  db: Firestore, intent: MessageIntent,
  provider: Pick<MetaWhatsappProvider, "sendTemplate">,
  credentials: Pick<OrganizerTokenStore, "accessBound">,
  clock: () => number = Date.now
): Promise<PreparedProgramChannel> {
  const whatsapp = intent.whatsapp;
  if (!whatsapp) {
    return {kind: "unavailable", reason: "senderUnavailable"};
  }
  const [connSnap, templateSnap] = await Promise.all([
    db.collection("organizerSenderConnections").doc(whatsapp.connectionId)
      .get(),
    db.collection("organizerMessageTemplates").doc(whatsapp.templateId).get(),
  ]);
  const connection = connSnap.data() as
    OrganizerSenderConnectionDocument | undefined;
  const template = templateSnap.data() as
    OrganizerMessageTemplateDocument | undefined;
  if (!connection || connection.status !== "active" ||
      !connection.phoneNumberId || !connection.secretVersionResource ||
      connection.organizerId !== intent.context.organizerId ||
      !template || template.status !== "APPROVED") {
    return {kind: "unavailable", reason: "senderUnavailable"};
  }
  let accessToken: string;
  try {
    accessToken = await credentials.accessBound({
      versionResource: connection.secretVersionResource,
      organizerId: connection.organizerId,
      connectionId: whatsapp.connectionId,
    });
  } catch {
    return {kind: "unavailable", reason: "credentialUnavailable"};
  }
  const sender: PreparedWhatsappSender = {connection, template, accessToken};

  const readFacts: ReadDeliveryFacts<MessageIntent, ProviderBinding> =
    async (tx, liveIntent, now) => {
      const {gate, recipient} = await readProgramGate(tx, db, liveIntent, now);
      const routes: DeliveryRouteReadiness<ProviderBinding>[] = [];
      if (gate.kind === "stop" || !recipient) {
        routes.push({routeId: "organizerProgramWhatsapp",
          state: {kind: "blocked", reason: "policyBlocked"}});
        return {gate, routes};
      }
      // Re-read sender/template inside the same transaction snapshot.
      const [liveConnSnap, liveTemplateSnap] = await Promise.all([
        tx.get(db.collection("organizerSenderConnections")
          .doc(whatsapp.connectionId)),
        tx.get(db.collection("organizerMessageTemplates")
          .doc(whatsapp.templateId)),
      ]);
      const conn = liveConnSnap.data() as
        OrganizerSenderConnectionDocument | undefined;
      const tpl = liveTemplateSnap.data() as
        OrganizerMessageTemplateDocument | undefined;
      // Explicit decline suppresses the route; an absent consent record
      // does not — service messages precede the first consent opportunity
      // (mirrors the shipped campaign/policy semantics).
      if (recipient.consent !== null && !recipient.consent.granted) {
        routes.push({routeId: "organizerProgramWhatsapp",
          state: {kind: "blocked", reason: "suppressed"}});
        return {gate, routes};
      }
      if (!conn || conn.status !== "active" || !conn.phoneNumberId ||
          !conn.secretVersionResource) {
        routes.push({routeId: "organizerProgramWhatsapp",
          state: {kind: "blocked", reason: "channelUnavailable"}});
        return {gate, routes};
      }
      if (!tpl || tpl.status !== "APPROVED") {
        routes.push({routeId: "organizerProgramWhatsapp",
          state: {kind: "blocked", reason: "templateUnavailable"}});
        return {gate, routes};
      }
      if (!recipient.endpointId) {
        routes.push({routeId: "organizerProgramWhatsapp",
          state: {kind: "blocked", reason: "notProvisioned"}});
        return {gate, routes};
      }
      routes.push({routeId: "organizerProgramWhatsapp",
        state: {kind: "eligible", checkedAt: now,
          validUntil: Math.min(now + FACT_SNAPSHOT_MS,
            liveIntent.expiresAt),
          permissionRevision: "progperm:" + operationContentHash([
            conn.revision, tpl.contentHash ?? tpl.providerUpdatedAt ?? 0,
            recipient.consent?.granted ?? null,
            recipient.consent?.revision ?? 0,
          ]),
          candidate: {mode: "live", binding: {
            routeId: "organizerProgramWhatsapp", transport: "whatsapp",
            senderIdentity: "organizerManaged", provider: "meta",
            senderId: whatsapp.connectionId, bindingRevision: conn.revision,
            recipientEndpointId: recipient.endpointId,
            fallbackOwner: "catch",
          } satisfies ProviderBinding}}});
      return {gate, routes};
    };

  return {kind: "ready", routeId: "organizerProgramWhatsapp", readFacts,
    dispatchReserved: (outbox, messageId, attemptId) =>
      dispatchProgramWhatsapp(db, outbox, messageId, attemptId, intent,
        sender, provider, clock)};
}

async function dispatchProgramWhatsapp(
  db: Firestore, outbox: ProgramDeliveryOutbox,
  messageId: string, attemptId: string, intent: MessageIntent,
  sender: PreparedWhatsappSender,
  provider: Pick<MetaWhatsappProvider, "sendTemplate">,
  clock: () => number
): Promise<ProgramChannelDispatchResult> {
  const record = await outbox.get(messageId);
  const reserved = record?.attempts.find((a) => a.attemptId === attemptId);
  if (!reserved || reserved.state.kind !== "reserved" ||
      reserved.binding.routeId !== "organizerProgramWhatsapp" ||
      reserved.binding.provider !== "meta") {
    return {kind: "withheld", reason: "notReserved"};
  }
  const claim = await outbox.claimLiveDispatch<{
    e164: string; payloadHash: string}>(
      messageId, attemptId,
      // The claim transaction re-reads the endpoint, sender, and template so
      // the number dialed and the payload hashed are exactly the ones the
      // reservation authorized. The dispatch evidence commits atomically
      // with the claim — a later webhook status can verify against it.
      async (tx, record, liveAttempt, now) => {
        const recipient = await readRecipientEndpoint(tx, db, intent);
        const [connSnap, tplSnap] = await Promise.all([
          tx.get(db.collection("organizerSenderConnections")
            .doc(intent.whatsapp!.connectionId)),
          tx.get(db.collection("organizerMessageTemplates")
            .doc(intent.whatsapp!.templateId)),
        ]);
        const conn = connSnap.data() as
        OrganizerSenderConnectionDocument | undefined;
        const tpl = tplSnap.data() as
        OrganizerMessageTemplateDocument | undefined;
        const endpointHash = recipient.e164 ?
          whatsappEndpointHash(recipient.e164) : null;
        if (recipient.withdrawn || recipient.consent?.granted === false ||
          !recipient.e164 || !endpointHash || recipient.endpointId !==
          liveAttempt.binding.recipientEndpointId ||
          !conn || conn.status !== "active" || !conn.phoneNumberId ||
          !conn.secretVersionResource || !conn.wabaId ||
          conn.organizerId !== intent.context.organizerId ||
          conn.revision !== liveAttempt.binding.bindingRevision ||
          intent.whatsapp!.connectionId !== liveAttempt.binding.senderId ||
          !tpl || tpl.status !== "APPROVED") {
          return {kind: "withheld"};
        }
        const payloadHash = operationContentHash([
          metaTemplateFromDocument(tpl), intent.whatsapp!.variables]);
        const dispatch = {
          schemaVersion: 1, source: "program",
          attemptId: liveAttempt.attemptId,
          messageId: record.messageId, context: intent.context,
          senderId: intent.whatsapp!.connectionId,
          bindingRevision: conn.revision,
          providerAccountId: conn.wabaId,
          providerPhoneNumberId: conn.phoneNumberId,
          senderHash: operationContentHash(connSnap.data()),
          recipientEndpointId: "whatsapp:" + endpointHash,
          endpointHash,
          templateDocumentId: intent.whatsapp!.templateId,
          templateHash: operationContentHash(tplSnap.data()),
          payloadHash, createdAt: now};
        if (!validateProgramWhatsappDispatchDocument(dispatch)) {
          throw new Error("Invalid program WhatsApp dispatch evidence");
        }
        const ref = db.collection(PROGRAM_WHATSAPP_DISPATCHES)
          .doc(liveAttempt.attemptId);
        if ((await tx.get(ref)).exists) return {kind: "withheld"};
        return {kind: "ready",
          value: {e164: recipient.e164, payloadHash},
          validUntil: Math.min(now + FACT_SNAPSHOT_MS, intent.expiresAt),
          commit: () => tx.create(ref, dispatch)};
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
      variables: {...intent.whatsapp!.variables},
      callbackData: whatsappStatusCorrelation(attempt.attemptId,
        claim.resource.payloadHash),
      deadline: claim.permit.validUntil}));
  } catch (error) {
    // Only a proven unsent request plus actual permit expiry can mark this
    // unsent. Timeouts, HTTP errors and parse failures stay held unknown.
    if (error instanceof MetaProviderError &&
        error.disposition === "requestNotSent" &&
        clock() >= claim.permit.validUntil) {
      await outbox.recordExpiredBeforeSend(claim.permit);
      return {kind: "withheld", reason: "permitExpired"};
    }
    return {kind: "submitted", outcome: {kind: "unknown"}};
  }
  const now = clock();
  await outbox.recordReceipt(messageId, {
    attemptId: attempt.attemptId, ...attempt.binding,
    providerEventId: "program-wa-submission:" + operationContentHash([
      attempt.attemptId, providerMessageId,
    ]),
    receivedAt: now,
    state: {kind: "accepted", at: now, providerMessageId},
  });
  return {kind: "submitted", outcome: {kind: "accepted", providerMessageId}};
}

/**
 * Dispatches one program delivery intent through the shared core: prepare
 * permitted channels (credential I/O outside the transaction), reserve,
 * claim, submit, and record the provider outcome.
 */
export class ProgramDeliveryWorker {
  constructor(private readonly db: Firestore,
    private readonly provider:
      Pick<MetaWhatsappProvider, "sendTemplate"> | null,
    private readonly credentials:
      Pick<OrganizerTokenStore, "accessBound"> | null,
    private readonly clock: () => number = Date.now,
    private readonly sendFcm: ProgramFcmSender =
    (message) => admin.messaging().send(message)) {}

  async dispatch(messageId: string,
    executionDeadline = Number.MAX_SAFE_INTEGER):
    Promise<ProgramDeliveryWorkerResult> {
    const requireWindow = () => {
      const now = this.clock();
      if (!Number.isSafeInteger(executionDeadline) ||
          !Number.isSafeInteger(now) || now < 0 ||
          now >= executionDeadline) {
        throw new Error("Program delivery worker window expired");
      }
    };
    requireWindow();
    const lookup: ProgramDeliveryOutbox = new FirestoreDeliveryOutbox(
      this.db, programDeliveryAdapter, async () => {
        throw new Error("Program delivery lookup cannot reserve dispatch");
      }, this.clock);
    const message = await lookup.get(messageId);
    if (!message) throw new Error("Program delivery message unavailable");
    if (message.lifecycle !== "active") {
      return {kind: "waiting", decision: {kind: "stop",
        reason: message.lifecycle}};
    }
    const channels = new Map<string, PreparedProgramChannel>();
    await Promise.all(message.intent.permittedRoutes.map(async (routeId) => {
      const channel = routeId === "catchProgramActivity" ?
        prepareProgramActivityChannel(this.db, message.intent, this.sendFcm,
          this.clock) : routeId === "organizerProgramWhatsapp" &&
            this.provider && this.credentials ?
          await prepareProgramWhatsappChannel(this.db, message.intent,
            this.provider, this.credentials, this.clock) :
          {kind: "unavailable" as const,
            reason: "senderUnavailable" as const};
      if (channel.kind === "ready" && channel.routeId !== routeId) {
        throw new Error("Prepared program channel has the wrong route");
      }
      channels.set(routeId, channel);
    }));
    requireWindow();
    const outbox: ProgramDeliveryOutbox = new FirestoreDeliveryOutbox(
      this.db, programDeliveryAdapter,
      async (tx, intent, now) => {
        if (intent.activity) {
          const activity = channels.get("catchProgramActivity");
          if (activity?.kind !== "ready") {
            return {gate: {kind: "stop", reason: "recipientWithdrawn"},
              routes: []};
          }
          return activity.readFacts(tx, intent, now);
        }
        const gate = (await readProgramGate(tx, this.db, intent, now)).gate;
        const routes: DeliveryRouteReadiness<ProviderBinding>[] = [];
        for (const routeId of intent.permittedRoutes) {
          const channel = channels.get(routeId);
          if (gate.kind === "stop" || !channel ||
              channel.kind === "unavailable") {
            routes.push({routeId, state: {kind: "blocked",
              reason: gate.kind === "stop" ? "policyBlocked" :
                "notProvisioned"}});
            continue;
          }
          // Sequential readers share the transaction snapshot; a channel
          // cannot hide a revoked permission behind a cached check.
          const facts = await channel.readFacts(tx, intent, now);
          if (operationContentHash(facts.gate) !==
              operationContentHash(gate) ||
              facts.routes.length !== 1 ||
              facts.routes[0].routeId !== routeId) {
            throw new Error("Program channel facts disagree with scope");
          }
          routes.push(facts.routes[0]);
        }
        return {gate, routes};
      }, this.clock);
    const reservation = await outbox.reserve(messageId);
    const attempt = reservation.record.attempts.at(-1);
    if (!attempt || attempt.state.kind !== "reserved") {
      return {kind: "waiting", decision: reservation.decision};
    }
    const channel = channels.get(attempt.binding.routeId);
    if (!channel || channel.kind !== "ready") {
      return {kind: "waiting", decision: reservation.decision};
    }
    requireWindow();
    const result = await channel.dispatchReserved(outbox, messageId,
      attempt.attemptId);
    return result.kind === "submitted" ? {...result,
      routeId: attempt.binding.routeId} : result;
  }
}
