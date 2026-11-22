import {runAssistanceTransaction as transact} from
  "../../platform/transactionCallback";
import {createHash} from "node:crypto";
import type {Firestore} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {operationContentHash} from "../../operations/durableActions";
import {validateOrganizerMessagingWebhookEventDocument} from
  "../../shared/generated/validators/organizerMessagingWebhookEventDocument";
import {validateOrganizerSenderConnectionDocument} from
  "../../shared/generated/validators/organizerSenderConnectionDocument";
import {EVENT_ASSISTANCE_MESSAGES, PrepareDispatchResource} from
  "./firestoreMessageOutbox";
import {applyGuestChoice, GuestActionResult} from "./guestChoiceActions";
import {readEventAssistanceMessageGate} from "./guestMessageGate";
import {guestCollections, guestIdentity, parseGuest} from "./guestRecords";
import {parseMessageRecord} from "./messageOutbox";
import {sameMessageContext} from "./messagingPolicy";
import {messageRecipientMatches} from "./messageRecipient";
import type {Permission} from "./whatsappPermissionRecords";
import {
  parseWhatsappReplyBinding, ReplyBinding, WHATSAPP_REPLY_BINDINGS,
  whatsappAttemptFromReplyId, whatsappAttemptScopeHash,
  whatsappEndpointHash, whatsappNativeReplyId,
} from "./whatsappReplyProtocol";

export type WhatsappReplyResult =
  | {kind: "ignored" | "accepted" | "replayed"}
  | {kind: "waiting"; reason: "deliveryUnconfirmed"}
  | {kind: "rejected"; reason: "unavailable" |
    Extract<GuestActionResult, {kind: "rejected"}>["reason"]};

/**
 * Trusted dispatch resource and private-queue consumer. Not a send authority,
 * callable, or raw-webhook adapter. The live worker must compose preparation
 * with its consent/template/budget resource and schedule deferred correlation.
 */
export class WhatsappReplyStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  /** Freeze only the choices actually offered by the provider renderer. */
  prepare(replyKind: ReplyBinding["replyKind"], choiceIds: readonly string[],
    permission?: Permission):
    PrepareDispatchResource<ReplyBinding> {
    const offered = [...choiceIds];
    return async (tx, record, attempt, now) => {
      const intent = record.intent;
      if (intent.context.mode !== "live" ||
          attempt.binding.routeId !== "organizerEventWhatsapp" ||
          offered.length === 0 || offered.length > 20 ||
          new Set(offered).size !== offered.length ||
          offered.some((id) =>
            !intent.choices.some((c) => c.choiceId === id))) {
        return {kind: "withheld"};
      }
      const gate = await readEventAssistanceMessageGate(this.db, tx, intent,
        now);
      if (gate.kind !== "allow") return {kind: "withheld"};
      const guestId = guestIdentity(intent.context, intent.attendeeId);
      const bindingRef = this.db.collection(WHATSAPP_REPLY_BINDINGS)
        .doc(attempt.attemptId);
      const [guestSnap, attendeeSnap, senderSnap, bindingSnap] =
        await tx.getAll(
          this.db.collection(guestCollections.guests).doc(guestId),
          this.db.collection("eventAttendees").doc(intent.attendeeId),
          this.db.collection("organizerSenderConnections")
            .doc(attempt.binding.senderId), bindingRef,
        );
      if (bindingSnap.exists) return {kind: "withheld"};
      const guest = parseGuest(guestSnap.data());
      const sender = senderSnap.data();
      // Final-claim material supplies the reviewed private endpoint. Without
      // it this helper retains its legacy, strict roster-phone behavior.
      const attendee = attendeeSnap.data();
      const endpointHash = whatsappEndpointHash(
        permission?.phoneE164 ?? attendee?.phoneE164);
      if (permission && (permission.status !== "granted" ||
          permission.attendeeId !== intent.attendeeId ||
          !sameMessageContext(permission.context, intent.context) ||
          permission.senderId !== attempt.binding.senderId ||
          permission.recipientEndpointId !==
            attempt.binding.recipientEndpointId)) return {kind: "withheld"};
      if (!validateOrganizerSenderConnectionDocument(sender) ||
          sender.organizerId !== intent.context.organizerId ||
          sender.status !== "active" || !sender.wabaId ||
          !sender.phoneNumberId ||
          sender.revision !== attempt.binding.bindingRevision ||
          !endpointHash ||
          !messageRecipientMatches(permission?.recipientBinding, {
            rosterPhone: attendee?.phoneE164, linkedUid: attendee?.linkedUid,
            sourceGeneration: guest.sourceGeneration,
          }, (phone) => whatsappEndpointHash(phone) === endpointHash) ||
          attempt.binding.recipientEndpointId !==
            "whatsapp:" + endpointHash) return {kind: "withheld"};
      const binding = parseWhatsappReplyBinding({schemaVersion: 1,
        attemptId: attempt.attemptId, messageId: record.messageId,
        context: intent.context, guestId, attendeeId: intent.attendeeId,
        episodeId: intent.episodeId,
        attendeeGeneration: guest.attendeeGeneration,
        guestRevision: guest.revision, intentHash: operationContentHash(intent),
        attemptScopeHash: whatsappAttemptScopeHash(attempt),
        senderId: attempt.binding.senderId,
        bindingRevision: attempt.binding.bindingRevision,
        providerAccountId: sender.wabaId,
        providerPhoneNumberId: sender.phoneNumberId,
        recipientEndpointId: attempt.binding.recipientEndpointId, endpointHash,
        ...(permission?.recipientBinding ?
          {recipientBinding: permission.recipientBinding} : {}),
        replyKind, choices: offered.map((choiceId, index) => ({choiceId,
          nativeId: whatsappNativeReplyId(attempt.attemptId, index)})),
        createdAt: now, expiresAt: Math.min(intent.expiresAt, now + 86_400_000),
      });
      return {kind: "ready", value: binding, validUntil: gate.validUntil,
        commit: () => tx.create(bindingRef, binding)};
    };
  }

  /** Reads private, signature-verified evidence instead of a caller body. */
  async consumeQueued(eventId: string): Promise<WhatsappReplyResult> {
    if (!/^omwe_[a-f0-9]{48}$/.test(eventId) || eventId.length !== 53) {
      return {kind: "rejected", reason: "unavailable"};
    }
    return transact(this.db, async (tx): Promise<WhatsappReplyResult> => {
      const queued = (await tx.get(this.db
        .collection("organizerMessagingWebhookEvents").doc(eventId))).data();
      if (!queued) return {kind: "rejected", reason: "unavailable"};
      if (!validateOrganizerMessagingWebhookEventDocument(queued)) {
        throw new Error("Invalid verified WhatsApp queue record");
      }
      const reply = queued.inboundReply;
      if (!reply) return {kind: "ignored"};
      const nativeId = reply.kind === "templateQuickReply" ?
        reply.payload : reply.id;
      const attemptId = whatsappAttemptFromReplyId(nativeId);
      if (!attemptId) return {kind: "ignored"};
      const bindingSnap = await tx.get(this.db
        .collection(WHATSAPP_REPLY_BINDINGS).doc(attemptId));
      if (!bindingSnap.exists) {
        return {kind: "rejected", reason: "unavailable"};
      }
      const binding = parseWhatsappReplyBinding(bindingSnap.data());
      const now = this.clock();
      if (!Number.isSafeInteger(now) || now < 0) {
        throw new Error("Invalid native reply processing clock");
      }
      if (now >= binding.expiresAt || millis(queued.expiresAt) <= now) {
        return {kind: "rejected", reason: "expired"};
      }
      const identity = "omwe_" + createHash("sha256")
        .update(queued.providerEventId).digest("hex").slice(0, 48);
      if (binding.attemptId !== attemptId || queued.eventKind !== "inbound" ||
          queued.isStop || !queued.hasReply ||
          queued.providerEventId !== "inbound:" + queued.providerMessageId ||
          identity !== eventId || binding.createdAt > now ||
          millis(queued.createdAt) < binding.createdAt ||
          millis(queued.createdAt) > now ||
          queued.connectionId !== binding.senderId ||
          queued.organizerId !== binding.context.organizerId ||
          queued.providerAccountId !== binding.providerAccountId ||
          queued.providerPhoneNumberId !== binding.providerPhoneNumberId ||
          queued.endpointHash !== binding.endpointHash ||
          !queued.contextProviderMessageId) {
        return {kind: "rejected", reason: "scopeMismatch"};
      }
      const selected = binding.choices.find((c) => c.nativeId === nativeId);
      if (!selected || binding.replyKind !== reply.kind) {
        return {kind: "rejected", reason: "invalidChoice"};
      }
      const [messageSnap, guestSnap, attendeeSnap, senderSnap] =
        await tx.getAll(
          this.db.collection(EVENT_ASSISTANCE_MESSAGES).doc(binding.messageId),
          this.db.collection(guestCollections.guests).doc(binding.guestId),
          this.db.collection("eventAttendees").doc(binding.attendeeId),
          this.db.collection("organizerSenderConnections")
            .doc(binding.senderId),
        );
      if (!messageSnap.exists || !guestSnap.exists || !attendeeSnap.exists) {
        return {kind: "rejected", reason: "unavailable"};
      }
      const message = parseMessageRecord(messageSnap.data());
      const guest = parseGuest(guestSnap.data());
      const sender = senderSnap.data();
      const attempt = message.attempts.find((a) => a.attemptId === attemptId);
      if (!attempt || attempt.mode !== "live" ||
          attempt.binding.routeId !== "organizerEventWhatsapp" ||
          message.messageId !== binding.messageId ||
          operationContentHash(message.intent) !== binding.intentHash ||
          whatsappAttemptScopeHash(attempt) !== binding.attemptScopeHash ||
          attempt.binding.senderId !== binding.senderId ||
          attempt.binding.bindingRevision !== binding.bindingRevision ||
          attempt.binding.recipientEndpointId !== binding.recipientEndpointId ||
          !sameMessageContext(message.intent.context, binding.context) ||
          message.intent.attendeeId !== binding.attendeeId ||
          message.intent.episodeId !== binding.episodeId ||
          guest.guestId !== binding.guestId ||
          guest.episodeId !== binding.episodeId ||
          guest.attendeeGeneration !== binding.attendeeGeneration ||
          !messageRecipientMatches(binding.recipientBinding, {
            rosterPhone: attendeeSnap.data()?.phoneE164,
            linkedUid: attendeeSnap.data()?.linkedUid,
            sourceGeneration: guest.sourceGeneration,
          }, (phone) => whatsappEndpointHash(phone) === binding.endpointHash) ||
          !validateOrganizerSenderConnectionDocument(sender) ||
          sender.organizerId !== binding.context.organizerId ||
          sender.wabaId !== binding.providerAccountId ||
          sender.phoneNumberId !== binding.providerPhoneNumberId ||
          sender.revision < binding.bindingRevision) {
        return {kind: "rejected", reason: "scopeMismatch"};
      }
      const gate = await readEventAssistanceMessageGate(this.db, tx,
        message.intent, now);
      if (attempt.state.kind === "reserved" ||
          attempt.state.kind === "notDispatched") {
        return {kind: "rejected", reason: "noLongerNeeded"};
      }
      const providerMessageId = attempt.state.providerMessageId;
      if (!providerMessageId) {
        return gate.kind === "stop" ?
          {kind: "rejected", reason: "noLongerNeeded"} :
          {kind: "waiting", reason: "deliveryUnconfirmed"};
      }
      if (queued.contextProviderMessageId !== providerMessageId ||
          queued.providerMessageId === providerMessageId) {
        return {kind: "rejected", reason: "scopeMismatch"};
      }
      const appliedAt = this.clock();
      if (!Number.isSafeInteger(appliedAt) || appliedAt < now) {
        throw new Error("Native reply clock moved backwards");
      }
      const result = applyGuestChoice(this.db, tx, {
        guest, message, gate, now: appliedAt,
        expectedGuestRevision: binding.guestRevision,
        scope: {context: binding.context, eventId: binding.context.eventId,
          attendeeId: binding.attendeeId, episodeId: binding.episodeId,
          validUntil: binding.expiresAt,
          source: {kind: "provider", attemptId,
            providerEventId: queued.providerEventId}},
        submission: {intentId: message.intent.intentId,
          intentRevision: message.intent.revision,
          choiceId: selected.choiceId, requestId: queued.providerEventId},
      });
      return result.kind === "rejected" ? result : {kind: result.kind};
    }).catch((error) => {
      if (error instanceof HttpsError && error.code === "not-found") {
        return {kind: "rejected", reason: "unavailable"} as const;
      }
      throw error;
    });
  }
}

function millis(value: {_seconds: number; _nanoseconds: number}): number {
  return Math.floor(value._seconds * 1000 + value._nanoseconds / 1_000_000);
}
