import {MessageRecipientBinding, MessageRecipientSource,
  reviewMessageRecipient, messageRecipientMatches} from "./messageRecipient";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {GetEventWhatsappPreferenceCallablePayload as Scope} from
  "../../shared/generated/getEventWhatsappPreferenceCallablePayload";
import type {SetEventWhatsappPreferenceCallablePayload as Submission} from
  "../../shared/generated/setEventWhatsappPreferenceCallablePayload";
import type {EventWhatsappPreferenceCallableResponse as Response} from
  "../../shared/generated/eventWhatsappPreferenceCallableResponse";
import {operationContentHash} from "../../operations/durableActions";
import {
  GuestSourceFacts, guestSourceFactsFromSnapshots, requireDocumentId,
} from "./guestRecords";
import {
  Permission, parseWhatsappPermission, WHATSAPP_PERMISSIONS,
  whatsappPermissionId, whatsappSenderHash,
} from "./whatsappPermissionRecords";
import {
  ConsentReceipt, parseWhatsappConsentReceipt, WHATSAPP_CONSENT_HASH,
  WHATSAPP_CONSENT_RECEIPTS, WHATSAPP_CONSENT_TEXT, WHATSAPP_CONSENT_VERSION,
  whatsappPermissionHasReceipt,
} from "./whatsappConsent";
import {whatsappEndpointHash, whatsappEndpointId} from
  "./whatsappReplyProtocol";
import {ConsentSender, whatsappConsentSender} from "./whatsappConsentSender";
import {WHATSAPP_POLICIES} from "./whatsappTemplate";
import {runAssistanceTransaction} from "./transactionCallback";
import {EndpointStop, parseWhatsappStop, WHATSAPP_ENDPOINT_STOPS,
  whatsappStopId} from "../../shared/organizerWhatsappStops";

/** UID and phone are derived from Firebase Auth, never request data. */
export interface WhatsappPreferenceActor {uid: string; phone: string | null}
interface PreferenceFacts {
  context: Permission["context"];
  source: GuestSourceFacts;
  phone: string | null;
  recipientBinding: MessageRecipientBinding | null;
  recipientSource: MessageRecipientSource;
  permission: Permission | null;
  receipt: ConsentReceipt | null;
  sender: ConsentSender | null;
  stop: EndpointStop | null;
  stopInvalid: boolean;
}

export class WhatsappPreferenceStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  async get(actor: WhatsappPreferenceActor, scope: Scope): Promise<Response> {
    return runAssistanceTransaction(this.db, async (tx) => {
      const now = this.now();
      const facts = await this.read(tx, actor, scope, now);
      const reviewedAt = this.now();
      if (reviewedAt < now) {
        throw new HttpsError("unavailable",
          "Event preference clock is behind.");
      }
      return {outcome: "read", view: this.view(actor, scope, facts,
        reviewedAt)};
    });
  }

  async set(actor: WhatsappPreferenceActor,
    input: Submission): Promise<Response> {
    requireDocumentId(input.requestId);
    const receiptId = "wa-consent:" + operationContentHash([
      actor.uid, input.eventId, input.attendeeId,
      input.senderId, input.requestId,
    ]);
    const requestHash = operationContentHash([actor.uid, input]);
    return runAssistanceTransaction(this.db, async (tx) => {
      const readAt = this.now();
      const facts = await this.read(tx, actor, input, readAt);
      const ref = this.db.collection(WHATSAPP_CONSENT_RECEIPTS)
        .doc(receiptId);
      const existing = await tx.get(ref);
      const now = this.now();
      if (now < readAt) {
        throw new HttpsError("unavailable",
          "Event preference clock is behind.");
      }
      const currentView = this.view(actor, input, facts, now);
      if (existing.exists) {
        const prior = parseWhatsappConsentReceipt(existing.data());
        if (prior.receiptId !== receiptId ||
            prior.requestHash !== requestHash) {
          throw new HttpsError("invalid-argument",
            "Use a new preference request.");
        }
        // Replays cannot restore a withdrawn grant.
        return {outcome: "replayed", view: currentView};
      }
      const previous = facts.permission;
      if ((previous?.revision ?? null) !== input.expectedRevision) {
        return {outcome: "conflict", view: currentView};
      }
      const granting = input.decision.kind === "grant";
      if (input.decision.kind === "grant" && (!currentView.canEnable ||
          input.decision.copyVersion !== WHATSAPP_CONSENT_VERSION ||
          input.decision.reviewHash !== currentView.reviewHash ||
          input.decision.senderHash !== currentView.sender?.bindingHash ||
          input.decision.stopRecordHash !== currentView.stopRecordHash ||
          now <= (facts.stop?.stoppedAt ?? -1))) {
        throw new HttpsError("failed-precondition",
          "Event WhatsApp updates cannot be enabled right now.");
      }
      // Withdrawal preserves the original binding even after number, sender
      // or roster changes. It never rewrites old evidence onto a new identity.
      const phone = granting ? facts.phone :
        previous?.phoneE164 ?? facts.phone;
      const sender = granting ? facts.sender?.identity :
        previous?.sender ?? facts.sender?.identity;
      if (!phone || !sender) {
        throw new HttpsError("failed-precondition",
          "There is no event WhatsApp preference to update.");
      }
      const senderHash = whatsappSenderHash(facts.context.organizerId,
        input.senderId, sender);
      const permissionId = whatsappPermissionId(facts.context,
        input.attendeeId, input.senderId);
      const evidence = granting ? {receiptId, senderHash,
        copyVersion: WHATSAPP_CONSENT_VERSION, acceptedAt: now,
        // Time the signed phone claim was checked, not a claim of a new OTP.
        phoneVerifiedAt: now, subjectUid: actor.uid} :
        previous?.evidence ?? null;
      const recipientBinding = granting || !previous ?
        facts.recipientBinding : previous.recipientBinding;
      const permission = parseWhatsappPermission({schemaVersion: 1,
        permissionId, currentReceiptId: receiptId,
        revision: (previous?.revision ?? 0) + 1,
        context: facts.context, attendeeId: input.attendeeId,
        attendeeGeneration: granting ? facts.source.attendeeGeneration :
          previous?.attendeeGeneration ?? facts.source.attendeeGeneration,
        senderId: input.senderId, sender, routeId: "organizerEventWhatsapp",
        purpose: "eventService", phoneE164: phone,
        ...(recipientBinding ? {recipientBinding} : {}),
        recipientEndpointId: whatsappEndpointId(phone),
        status: granting ? "granted" : "revoked", evidence,
        expiresAt: granting ? Math.floor(facts.source.eventEnd) + 86_400_000 :
          previous?.expiresAt ??
          Math.max(now, Math.floor(facts.source.eventEnd)),
        updatedAt: now});
      const receipt = parseWhatsappConsentReceipt({schemaVersion: 1, receiptId,
        requestHash, source: "verifiedParticipant", linkId: null,
        context: facts.context, attendeeId: input.attendeeId,
        attendeeGeneration: permission.attendeeGeneration,
        senderId: input.senderId, senderHash, routeId: "organizerEventWhatsapp",
        actorUid: actor.uid,
        recipientEndpointId: permission.recipientEndpointId,
        decision: input.decision.kind,
        copyVersion: granting ? WHATSAPP_CONSENT_VERSION : null,
        copyHash: granting ? WHATSAPP_CONSENT_HASH : null,
        appliedRevision: permission.revision, createdAt: now,
        permissionHash: operationContentHash(permission)});
      tx.create(ref, receipt);
      tx.set(this.db.collection(WHATSAPP_PERMISSIONS).doc(permissionId),
        permission);
      return {outcome: "applied", view: this.view(actor, input,
        {...facts, permission, receipt}, now)};
    });
  }

  private async read(tx: Transaction, actor: WhatsappPreferenceActor,
    scope: Scope, now: number): Promise<PreferenceFacts> {
    [scope.eventId, scope.attendeeId, scope.senderId, actor.uid]
      .forEach(requireDocumentId);
    const [eventSnap, attendeeSnap, senderSnap, policySnap] = await tx.getAll(
      this.db.collection("events").doc(scope.eventId),
      this.db.collection("eventAttendees").doc(scope.attendeeId),
      this.db.collection("organizerSenderConnections").doc(scope.senderId),
      this.db.collection(WHATSAPP_POLICIES).doc(scope.senderId),
    );
    const event = eventSnap.data();
    const attendee = attendeeSnap.data();
    if (!event || !attendee || attendee.linkedUid !== actor.uid ||
        attendee.eventId !== scope.eventId) {
      throw new HttpsError("permission-denied",
        "Event preference unavailable.");
    }
    const context = {mode: "live" as const, eventId: scope.eventId,
      organizerId: event.organizerId};
    const source = guestSourceFactsFromSnapshots(context, scope.attendeeId,
      eventSnap, attendeeSnap);
    const id = whatsappPermissionId(context, scope.attendeeId, scope.senderId);
    const permissionSnap = await tx.get(this.db
      .collection(WHATSAPP_PERMISSIONS).doc(id));
    const permission = permissionSnap.exists ?
      parseWhatsappPermission(permissionSnap.data()) : null;
    if (permission && permission.permissionId !== id) {
      throw new HttpsError("internal", "Event preference identity mismatch.");
    }
    const receiptSnap = permission ? await tx.get(this.db
      .collection(WHATSAPP_CONSENT_RECEIPTS)
      .doc(permission.currentReceiptId)) : null;
    const receipt = receiptSnap?.exists ?
      parseWhatsappConsentReceipt(receiptSnap.data()) : null;
    const recipientSource: MessageRecipientSource = {
      rosterPhone: attendee.phoneE164, linkedUid: attendee.linkedUid,
      sourceGeneration: source.sourceGeneration,
    };
    const sender = whatsappConsentSender(scope.senderId, context.organizerId,
      senderSnap.data(), policySnap.data());
    const currentGrant = permission !== null && permission.expiresAt > now &&
      whatsappPermissionHasReceipt(permission, receipt) &&
      (!sender || (permission.sender.providerAccountId ===
        sender.identity.providerAccountId &&
        permission.sender.providerPhoneNumberId ===
        sender.identity.providerPhoneNumberId));
    let recipient = reviewMessageRecipient(actor, recipientSource,
      (value) => whatsappEndpointHash(value) !== null, permission,
      currentGrant);
    let stopFacts = await this.readStop(tx, context.organizerId,
      recipient.phone);
    if (!stopFacts.stopInvalid && stopFacts.stop &&
        stopFacts.stop.observedAt <= now && permission?.evidence &&
        stopFacts.stop.stoppedAt >= permission.evidence.acceptedAt &&
        recipient.phone !== actor.phone && whatsappEndpointHash(actor.phone)) {
      // A stopped grant no longer pins a changed signed phone. Reviewing a
      // new number still requires its own STOP state and explicit consent.
      recipient = reviewMessageRecipient(actor, recipientSource,
        (value) => whatsappEndpointHash(value) !== null, permission, false);
      stopFacts = await this.readStop(tx, context.organizerId, recipient.phone);
    }
    return {context, source, permission, receipt, sender, ...stopFacts,
      phone: recipient.phone, recipientBinding: recipient.binding,
      recipientSource};
  }

  private async readStop(tx: Transaction, organizerId: string,
    phone: string | null): Promise<Pick<PreferenceFacts,
      "stop" | "stopInvalid">> {
    const endpoint = whatsappEndpointHash(phone);
    let stop: EndpointStop | null = null;
    let stopInvalid = false;
    if (endpoint) {
      const stopId = whatsappStopId(organizerId, endpoint);
      const stopSnap = await tx.get(this.db
        .collection(WHATSAPP_ENDPOINT_STOPS).doc(stopId));
      if (stopSnap.exists) {
        try {
          stop = parseWhatsappStop(stopSnap.data());
          if (stop.stopId !== stopId) throw new Error("Stop identity mismatch");
        } catch {
          stop = null;
          stopInvalid = true;
        }
      }
    }
    return {stop, stopInvalid};
  }

  private view(actor: WhatsappPreferenceActor, scope: Scope,
    facts: PreferenceFacts, now: number): Response["view"] {
    const {source, sender, permission, receipt, phone, stop} = facts;
    if (now < (permission?.updatedAt ?? 0) || now < (receipt?.createdAt ?? 0)) {
      throw new HttpsError("unavailable",
        "Event preference clock is behind.");
    }
    const belongs = permission !== null &&
      permission.attendeeGeneration === source.attendeeGeneration &&
      permission.phoneE164 === phone &&
      messageRecipientMatches(permission.recipientBinding,
        facts.recipientSource, (value) => value === permission.phoneE164) &&
      (permission.evidence === null ||
        permission.evidence.subjectUid === actor.uid) &&
      (!sender || (permission.sender.providerAccountId ===
        sender.identity.providerAccountId &&
        permission.sender.providerPhoneNumberId ===
        sender.identity.providerPhoneNumberId));
    const proof = belongs && whatsappPermissionHasReceipt(permission!, receipt);
    let availability: Response["view"]["availability"] = "ready";
    if (!phone || phone !== actor.phone) availability = "verifyPhone";
    else if (!["registered", "checkedIn"].includes(source.attendeeStatus)) {
      availability = "notAdmitted";
    } else if (source.eventStatus !== "active" ||
        now >= source.eventEnd + 86_400_000) availability = "eventClosed";
    else if (facts.stopInvalid || (stop?.observedAt ?? 0) > now ||
        !sender?.connectionReady || !sender.policy ||
        sender.policy.status !== "ready" ||
        sender.policy.activation.approvedAt > now ||
        sender.policy.activation.validUntil <= now ||
        !sender.policy.quote.recipientPrefixes.some((p) =>
          phone.startsWith(p))) {
      availability = "senderUnavailable";
    }
    const stopped = stop !== null && permission?.evidence !== null &&
      stop.stoppedAt >= (permission?.evidence?.acceptedAt ?? 0);
    const preference: Response["view"]["preference"] = !belongs ? "notSet" :
      permission!.status === "revoked" ? "disabled" :
        stopped ? "disabled" :
          !proof ? "notSet" :
          permission!.expiresAt <= now ? "expired" : "enabled";
    const identity = sender?.identity ?? permission?.sender;
    const stopRecordHash = stop ? operationContentHash(stop) : null;
    // Sender/STOP hashes alone cannot bind an unseen recipient or replacement
    // event. Pin the consent terms without treating credentials as identity.
    const reviewHash = operationContentHash([facts.context, scope.attendeeId,
      actor.uid, source.attendeeGeneration, source.sourceGeneration,
      source.eventTitle, Math.floor(source.eventEnd) + 86_400_000, phone,
      facts.recipientBinding,
      scope.senderId, identity ?? null, stopRecordHash,
      WHATSAPP_CONSENT_HASH]);
    return {eventId: scope.eventId, attendeeId: scope.attendeeId,
      senderId: scope.senderId, serverTime: now,
      revision: permission?.revision ?? null, preference,
      stopRecordHash, reviewHash,
      canEnable: availability === "ready", availability,
      phoneLastFour: phone?.slice(-4) ?? null,
      expiresAt: belongs ? permission!.expiresAt : null,
      sender: identity ? {displayName: identity.displayName,
        displayPhoneNumber: identity.displayPhoneNumber,
        bindingHash: whatsappSenderHash(facts.context.organizerId,
          scope.senderId, identity)} : null,
      consent: {version: WHATSAPP_CONSENT_VERSION,
        text: WHATSAPP_CONSENT_TEXT}};
  }

  private now(): number {
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < 0) {
      throw new Error("Invalid WhatsApp preference clock");
    }
    return now;
  }
}
