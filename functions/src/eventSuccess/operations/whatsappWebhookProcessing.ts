import {runAssistanceTransaction as transact} from "./transactionCallback";
import {createHash} from "node:crypto";
import {getFirestore, Firestore, Transaction} from "firebase-admin/firestore";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {operationContentHash} from "../../operations/durableActions";
import type {OrganizerMessagingWebhookEventDocument as QueueEvent} from
  "../../shared/generated/organizerMessagingWebhookEventDocument";
import {validateOrganizerMessagingWebhookEventDocument} from
  "../../shared/generated/validators/organizerMessagingWebhookEventDocument";
import {validateOrganizerCampaignWebhookReceiptDocument} from
  "../../shared/generated/validators/organizerCampaignWebhookReceiptDocument";
import {WhatsappDeliveryStore} from "./whatsappDeliveryStore";
import {ProgramWhatsappDeliveryStore} from
  "../../programs/programWhatsappDeliveryStore";
import {CampaignWhatsappDeliveryStore} from
  "../../organizers/campaignWhatsappDeliveryStore";
import {CAMPAIGN_WHATSAPP_DISPATCHES} from
  "../../organizers/campaignDeliveryWorker";
import {AutomationWhatsappDeliveryStore} from
  "../../organizers/automationWhatsappDeliveryStore";
import {WHATSAPP_DISPATCHES} from "../../delivery/whatsappDispatches";
import {WhatsappReplyStore} from "./whatsappReplyStore";
import {whatsappAttemptFromReplyId} from "./whatsappReplyProtocol";
import {whatsappAttemptFromStatus} from "./whatsappDeliveryProtocol";

type Processing = NonNullable<QueueEvent["assistanceProcessing"]>;
export type WhatsappProcessingOutcome = Processing["outcome"];
type Consumers = {
  delivery: Pick<WhatsappDeliveryStore, "consumeQueued">;
  replies: Pick<WhatsappReplyStore, "consumeQueued">;
};
const collection = "organizerMessagingWebhookEvents";

/** Routes a status receipt to the outbox that claimed the attempt. Event
 *  assistance and program deliveries share the signed correlation format;
 *  the claim-time dispatch doc decides which store may consume it. */
class RoutedWhatsappDeliveryStore
implements Pick<WhatsappDeliveryStore, "consumeQueued"> {
  private readonly eventStore: WhatsappDeliveryStore;
  private readonly programStore: ProgramWhatsappDeliveryStore;
  private readonly campaignStore: CampaignWhatsappDeliveryStore;
  private readonly automationStore: AutomationWhatsappDeliveryStore;

  constructor(private readonly db: Firestore, clock: () => number) {
    this.eventStore = new WhatsappDeliveryStore(db, clock);
    this.programStore = new ProgramWhatsappDeliveryStore(db, clock);
    this.campaignStore = new CampaignWhatsappDeliveryStore(db, clock);
    this.automationStore = new AutomationWhatsappDeliveryStore(db, clock);
  }

  async consumeQueued(eventId: string) {
    const queued = (await this.db.collection(collection).doc(eventId).get())
      .data();
    const attemptId = validateOrganizerMessagingWebhookEventDocument(queued) ?
      whatsappAttemptFromStatus(queued.callbackData) : null;
    if (attemptId) {
      // Programme and automation dispatches share whatsappDispatches; the
      // stored source names the owner.
      const [sharedDispatch, campaignDispatch] = await Promise.all([
        this.db.collection(WHATSAPP_DISPATCHES).doc(attemptId).get(),
        this.db.collection(CAMPAIGN_WHATSAPP_DISPATCHES).doc(attemptId).get(),
      ]);
      const source = sharedDispatch.exists ?
        sharedDispatch.get("source") : null;
      if (source === "program") {
        return this.programStore.consumeQueued(eventId);
      }
      if (campaignDispatch.exists) {
        return this.campaignStore.consumeQueued(eventId);
      }
      if (source === "automation") {
        return this.automationStore.consumeQueued(eventId);
      }
    }
    return this.eventStore.consumeQueued(eventId);
  }
}

/** Cheap trigger filter, never proof that a provider or guest is authorized. */
export function isEventAssistanceWhatsappEvent(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<QueueEvent>;
  if (event.eventKind === "status") {
    return whatsappAttemptFromStatus(event.callbackData) !== null;
  }
  const reply = event.inboundReply;
  return event.eventKind === "inbound" && !!reply &&
    whatsappAttemptFromReplyId(reply.kind === "templateQuickReply" ?
      reply.payload : reply.id) !== null;
}

/** At-least-once queue processing; domain consumers own atomic effects. */
export class EventWhatsappWebhookProcessor {
  private readonly consumers: Consumers;

  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now,
    consumers?: Consumers) {
    this.consumers = consumers ?? {
      delivery: new RoutedWhatsappDeliveryStore(db, clock),
      replies: new WhatsappReplyStore(db, clock),
    };
  }

  async process(eventId: string): Promise<WhatsappProcessingOutcome> {
    if (!/^omwe_[a-f0-9]{48}$/.test(eventId) || eventId.length !== 53) {
      return {kind: "rejected", reason: "unavailable"};
    }
    const initial = await transact(this.db, (tx) =>
      this.read(tx, eventId));
    if (!initial) return {kind: "rejected", reason: "unavailable"};
    if (!isEventAssistanceWhatsappEvent(initial.event)) {
      return {kind: "ignored"};
    }
    const previous = initial.event.assistanceProcessing;
    if (previous && previous.outcome.kind !== "waiting") {
      return previous.outcome;
    }
    let outcome: WhatsappProcessingOutcome;
    if (initial.event.eventKind === "status") {
      const result = await this.consumers.delivery.consumeQueued(eventId);
      outcome = result.kind === "recorded" ?
        {kind: "delivery", disposition: result.disposition} :
        result.kind === "unconfirmed" ?
          {kind: "delivery", disposition: "unconfirmed"} :
          result.kind === "ignored" ? {kind: "ignored"} :
            {kind: "rejected", reason: "deliveryScope"};
    } else {
      const result = await this.consumers.replies.consumeQueued(eventId);
      if (result.kind === "waiting" || result.kind === "rejected") {
        outcome = result;
      } else {
        outcome = result.kind === "ignored" ? {kind: "ignored"} :
          {kind: "reply", disposition: result.kind};
      }
    }
    // A failed checkpoint commit retries the idempotent consumer. A terminal
    // winner cannot be overwritten by an older concurrent waiting result.
    return transact(this.db, async (tx) => {
      const current = await this.read(tx, eventId);
      if (!current || current.sourceHash !== initial.sourceHash) {
        return {kind: "rejected", reason: "unavailable"} as const;
      }
      const saved = current.event.assistanceProcessing;
      if (saved && saved.outcome.kind !== "waiting") return saved.outcome;
      const now = this.clock();
      if (!Number.isSafeInteger(now) || now < millis(current.event.createdAt) ||
          (saved && now < millis(saved.updatedAt))) {
        throw new Error("Invalid WhatsApp processing clock");
      }
      const assistanceProcessing: Processing = {
        sourceHash: current.sourceHash,
        attemptCount: (saved?.attemptCount ?? 0) + 1,
        updatedAt: {_seconds: Math.floor(now / 1000),
          _nanoseconds: (now % 1000) * 1_000_000}, outcome,
      };
      if (!validateOrganizerMessagingWebhookEventDocument({
        ...current.event, assistanceProcessing,
      })) throw new Error("Invalid WhatsApp processing checkpoint");
      // Preserve the latest Inbox/campaign fields read in this transaction.
      // Their concurrent updates force a retry and cannot be overwritten.
      tx.set(this.db.collection(collection).doc(eventId),
        {...current.event, assistanceProcessing});
      return outcome;
    });
  }

  private async read(tx: Transaction, eventId: string) {
    const [queuedSnap, receiptSnap] = await tx.getAll(
      this.db.collection(collection).doc(eventId),
      this.db.collection("organizerCampaignWebhookReceipts").doc(eventId));
    const event = queuedSnap.data();
    const receipt = receiptSnap.data();
    if (!validateOrganizerMessagingWebhookEventDocument(event) ||
        !validateOrganizerCampaignWebhookReceiptDocument(receipt) ||
        event.providerEventId !== receipt.providerEventId ||
        event.provider !== receipt.provider ||
        event.organizerId !== receipt.organizerId ||
        event.connectionId !== receipt.connectionId ||
        event.eventKind !== receipt.eventKind ||
        millis(event.createdAt) !== millis(receipt.createdAt) ||
        eventId !== "omwe_" + createHash("sha256")
          .update(event.providerEventId).digest("hex").slice(0, 48)) {
      return null;
    }
    // Admin SDK timestamps have a prototype; convert only schema-declared
    // timestamp fields to lossless JSON evidence before canonical hashing.
    const source: Record<string, unknown> = {...event,
      createdAt: timestampEvidence(event.createdAt),
      expiresAt: timestampEvidence(event.expiresAt),
      providerOccurredAt: timestampEvidence(event.providerOccurredAt),
    };
    delete source.assistanceProcessing;
    delete source.processingStatus;
    delete source.attemptCount;
    delete source.processedAt;
    const sourceHash = operationContentHash([source, {...receipt,
      createdAt: timestampEvidence(receipt.createdAt),
      expiresAt: timestampEvidence(receipt.expiresAt),
    }]);
    if (event.assistanceProcessing &&
        event.assistanceProcessing.sourceHash !== sourceHash) return null;
    return {event, sourceHash};
  }
}

/** Transient correlation delay: Eventarc retries this creation event. */
export class WhatsappReplyAwaitingDelivery extends Error {
  constructor() {
    super("Event WhatsApp reply is awaiting authenticated delivery evidence");
    this.name = "WhatsappReplyAwaitingDelivery";
  }
}

export async function processEventAssistanceWhatsappEvent(
  processor: Pick<EventWhatsappWebhookProcessor, "process">, eventId: string
): Promise<void> {
  const outcome = await processor.process(eventId);
  if (outcome.kind === "waiting") throw new WhatsappReplyAwaitingDelivery();
}

// Firebase 2nd-gen retries failed events for a bounded window. Native reply
// expiry is also an explicit terminal result; permanent rejections are acked.
// https://firebase.google.com/docs/functions/retries
export const onEventAssistanceWhatsappEventCreated = onDocumentCreated({
  document: "organizerMessagingWebhookEvents/{eventId}", retry: true,
  timeoutSeconds: 60,
}, async (event) => {
  if (!isEventAssistanceWhatsappEvent(event.data?.data())) return;
  await processEventAssistanceWhatsappEvent(
    new EventWhatsappWebhookProcessor(getFirestore()), event.params.eventId);
});

function millis(value: {_seconds: number; _nanoseconds: number}): number {
  return value._seconds * 1000 + value._nanoseconds / 1_000_000;
}

function timestampEvidence(value: QueueEvent["providerOccurredAt"]) {
  return value === null ? null : {
    _seconds: value._seconds, _nanoseconds: value._nanoseconds,
  };
}
