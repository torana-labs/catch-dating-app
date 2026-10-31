import {MessageRecipientBinding, MessageRecipientSource,
  reviewMessageRecipient, messageRecipientMatches} from "./messageRecipient";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {GetEventAssistanceSmsPreferenceCallablePayload as Scope} from
  "../../shared/generated/getEventAssistanceSmsPreferenceCallablePayload";
import type {SetEventAssistanceSmsPreferenceCallablePayload as Submission} from
  "../../shared/generated/setEventAssistanceSmsPreferenceCallablePayload";
import type {EventAssistanceSmsPreferenceCallableResponse as Response} from
  "../../shared/generated/eventAssistanceSmsPreferenceCallableResponse";
import {operationContentHash} from "../../operations/durableActions";
import {
  GuestSourceFacts, guestSourceFactsFromSnapshots, requireDocumentId,
} from "./guestRecords";
import {timestampEvidence} from "./groupProgressSource";
import {
  Permission, parseSmsPermission, smsCollections, smsPermissionId,
} from "./smsPermissionRecords";
import {parseSmsConfig, SmsConfig, smsEndpointId} from "./smsProtocol";
import {runAssistanceTransaction} from "./transactionCallback";
import {
  CATCH_EVENT_SMS_SENDER_ID, ConsentReceipt, parseSmsConsentReceipt,
  SMS_CONSENT_HASH, SMS_CONSENT_RECEIPTS, SMS_CONSENT_TEXT,
  SMS_CONSENT_VERSION, smsPermissionHasReceipt,
} from "./smsConsent";

/** UID and phone claim are derived from Firebase Auth, never request data. */
export interface SmsPreferenceActor {uid: string; phone: string | null}
interface PreferenceFacts {
  context: Permission["context"];
  source: GuestSourceFacts;
  phone: string | null;
  recipientBinding: MessageRecipientBinding | null;
  recipientSource: MessageRecipientSource;
  permission: Permission | null;
  receipt: ConsentReceipt | null;
  sender: SmsConfig | null;
  eventEndEvidence: ReturnType<typeof timestampEvidence>;
}

export class SmsPreferenceStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now,
    private readonly senderId = CATCH_EVENT_SMS_SENDER_ID) {
    requireDocumentId(senderId);
  }

  async get(actor: SmsPreferenceActor, scope: Scope): Promise<Response> {
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

  async set(actor: SmsPreferenceActor, input: Submission): Promise<Response> {
    requireDocumentId(input.requestId);
    // Preserve default-sender receipt identities for exact legacy retries.
    const receiptKey = [actor.uid, input.eventId, input.attendeeId,
      input.requestId];
    if (this.senderId !== CATCH_EVENT_SMS_SENDER_ID) {
      receiptKey.push(this.senderId);
    }
    const receiptId = "sms-consent:" + operationContentHash(receiptKey);
    const requestHash = operationContentHash([actor.uid, input]);
    return runAssistanceTransaction(this.db, async (tx) => {
      const readAt = this.now();
      const facts = await this.read(tx, actor, input, readAt);
      const reference = this.db.collection(SMS_CONSENT_RECEIPTS).doc(receiptId);
      const existingReceipt = await tx.get(reference);
      const now = this.now();
      if (now < readAt) {
        throw new HttpsError("unavailable",
          "Event preference clock is behind.");
      }
      const currentView = this.view(actor, input, facts, now);
      if (existingReceipt.exists) {
        const prior = parseSmsConsentReceipt(existingReceipt.data());
        if (prior.receiptId !== receiptId ||
            prior.requestHash !== requestHash) {
          throw new HttpsError("invalid-argument",
            "Use a new preference request.");
        }
        // A replay returns current state. It can never restore an old grant.
        return {outcome: "replayed", view: currentView};
      }
      const previous = facts.permission;
      if ((previous?.revision ?? null) !== input.expectedRevision) {
        return {outcome: "conflict", view: currentView};
      }
      const granting = input.decision.kind === "grant";
      if (input.decision.kind === "grant" && (!currentView.canEnable ||
          input.decision.copyVersion !== SMS_CONSENT_VERSION)) {
        throw new HttpsError("failed-precondition",
          "Event text updates cannot be enabled right now.");
      }
      if (input.expectedReviewHash !== currentView.reviewHash) {
        return {outcome: "conflict", view: currentView};
      }
      const phone = granting ? facts.phone :
        previous?.phoneE164 ?? facts.phone;
      if (!phone) {
        throw new HttpsError("failed-precondition",
          "There is no supported event text number to update.");
      }
      const permissionId = smsPermissionId(facts.context,
        input.attendeeId, this.senderId);
      const evidence = granting ? {receiptId,
        copyVersion: SMS_CONSENT_VERSION, acceptedAt: now,
        // This is when the server checked the signed phone claim, not a
        // claim that a new OTP was sent at the instant of consent.
        phoneVerifiedAt: now, subjectUid: actor.uid} :
        previous?.evidence ?? null;
      const recipientBinding = granting || !previous ?
        facts.recipientBinding : previous.recipientBinding;
      const permission = parseSmsPermission({schemaVersion: 1, permissionId,
        currentReceiptId: receiptId, revision: (previous?.revision ?? 0) + 1,
        context: facts.context, attendeeId: input.attendeeId,
        attendeeGeneration: granting ? facts.source.attendeeGeneration :
          previous?.attendeeGeneration ?? facts.source.attendeeGeneration,
        senderId: this.senderId, routeId: "catchEventSms",
        purpose: "eventService",
        phoneE164: phone,
        ...(recipientBinding ? {recipientBinding} : {}),
        recipientEndpointId: smsEndpointId(facts.context,
          input.attendeeId, phone),
        status: granting ? "granted" : "revoked", evidence,
        expiresAt: granting ? facts.source.eventEnd + 86_400_000 :
          previous?.expiresAt ?? Math.max(now, facts.source.eventEnd),
        updatedAt: now});
      const receipt = parseSmsConsentReceipt({schemaVersion: 1, receiptId,
        requestHash, source: "verifiedParticipant", linkId: null,
        context: facts.context, attendeeId: input.attendeeId,
        attendeeGeneration: permission.attendeeGeneration,
        senderId: this.senderId, routeId: "catchEventSms", actorUid: actor.uid,
        recipientEndpointId: permission.recipientEndpointId,
        decision: input.decision.kind,
        copyVersion: granting ? SMS_CONSENT_VERSION : null,
        copyHash: granting ? SMS_CONSENT_HASH : null,
        appliedRevision: permission.revision, createdAt: now,
        permissionHash: operationContentHash(permission)});
      tx.create(reference, receipt);
      tx.set(this.db.collection(smsCollections.permissions).doc(permissionId),
        permission);
      return {outcome: "applied", view: this.view(actor, input,
        {...facts, permission, receipt}, now)};
    });
  }

  private async read(tx: Transaction, actor: SmsPreferenceActor,
    scope: Scope, now: number): Promise<PreferenceFacts> {
    if (scope.senderId !== undefined && scope.senderId !== this.senderId) {
      throw new HttpsError("invalid-argument",
        "SMS preference sender mismatch.");
    }
    requireDocumentId(scope.eventId);
    requireDocumentId(scope.attendeeId);
    requireDocumentId(actor.uid);
    // One transactional batch avoids independent RPCs outliving an aborted
    // sibling read while the SDK rolls the transaction back and retries it.
    const [eventSnap, attendeeSnap, senderSnap] = await tx.getAll(
      this.db.collection("events").doc(scope.eventId),
      this.db.collection("eventAttendees").doc(scope.attendeeId),
      this.db.collection(smsCollections.senders).doc(this.senderId),
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
    const id = smsPermissionId(context, scope.attendeeId, this.senderId);
    const permissionSnap = await tx.get(this.db
      .collection(smsCollections.permissions).doc(id));
    const permission = permissionSnap.exists ?
      parseSmsPermission(permissionSnap.data()) : null;
    if (permission && permission.permissionId !== id) {
      throw new HttpsError("internal", "Event preference identity mismatch.");
    }
    const receiptSnap = permission ? await tx.get(this.db
      .collection(SMS_CONSENT_RECEIPTS)
      .doc(permission.currentReceiptId)) : null;
    const receipt = receiptSnap?.exists ?
      parseSmsConsentReceipt(receiptSnap.data()) : null;
    const sender = senderSnap.exists ? parseSmsConfig(senderSnap.data()) : null;
    if (sender && sender.senderId !== this.senderId) {
      throw new HttpsError("internal", "Event sender identity mismatch.");
    }
    const recipientSource: MessageRecipientSource = {
      rosterPhone: attendee.phoneE164, linkedUid: attendee.linkedUid,
      sourceGeneration: source.sourceGeneration,
    };
    const recipient = reviewMessageRecipient(actor, recipientSource,
      (value) => typeof value === "string" &&
        /^\+91[6-9][0-9]{9}$/.test(value), permission,
      permission !== null && permission.expiresAt > now &&
        smsPermissionHasReceipt(permission, receipt));
    return {context, source, permission, receipt, sender,
      eventEndEvidence: timestampEvidence(event.endTime),
      phone: recipient.phone, recipientBinding: recipient.binding,
      recipientSource};
  }

  private view(actor: SmsPreferenceActor, scope: Scope,
    facts: PreferenceFacts, now: number): Response["view"] {
    const {source, sender, permission, receipt, phone} = facts;
    if (now < (permission?.updatedAt ?? 0) ||
        now < (receipt?.createdAt ?? 0)) {
      throw new HttpsError("unavailable",
        "Event preference clock is behind.");
    }
    const belongs = permission !== null &&
      permission.attendeeGeneration === source.attendeeGeneration &&
      permission.phoneE164 === phone &&
      messageRecipientMatches(permission.recipientBinding,
        facts.recipientSource, (value) => value === permission.phoneE164) &&
      (permission.evidence === null ||
        permission.evidence.subjectUid === actor.uid);
    const proof = belongs && smsPermissionHasReceipt(permission!, receipt);
    let availability: Response["view"]["availability"] = "ready";
    if (!phone || phone !== actor.phone) availability = "verifyPhone";
    else if (!["registered", "checkedIn"].includes(source.attendeeStatus)) {
      availability = "notAdmitted";
    } else if (source.eventStatus !== "active" ||
        now >= source.eventEnd + 86_400_000) availability = "eventClosed";
    else if (!sender || sender.status !== "ready" ||
        sender.activation.approvedAt > now ||
        sender.activation.validUntil <= now) availability = "senderUnavailable";
    const preference: Response["view"]["preference"] = !belongs ? "notSet" :
      permission!.status === "revoked" ? "disabled" :
        !proof ? "notSet" :
          permission!.expiresAt <= now ? "expired" : "enabled";
    const expiresAt = belongs ? permission!.expiresAt : null;
    // A revision alone misses changed phone claims, replacement source rows,
    // event windows and current consent proof. Time itself is not a nonce.
    const reviewHash = operationContentHash([scope.eventId, scope.attendeeId,
      facts.context, actor.uid, actor.phone, phone, this.senderId,
      facts.recipientBinding,
      source.sourceGeneration, source.attendeeGeneration, source.eventTitle,
      source.eventStatus, facts.eventEndEvidence, availability, preference,
      expiresAt, permission, receipt, SMS_CONSENT_HASH]);
    return {eventId: scope.eventId, attendeeId: scope.attendeeId, reviewHash,
      senderId: this.senderId,
      serverTime: now, revision: permission?.revision ?? null, preference,
      canEnable: availability === "ready", availability,
      phoneLastFour: phone?.slice(-4) ?? null,
      expiresAt,
      consent: {version: SMS_CONSENT_VERSION, text: SMS_CONSENT_TEXT}};
  }

  private now(): number {
    const now = this.clock();
    if (!Number.isSafeInteger(now) || now < 0) {
      throw new Error("Invalid SMS preference clock");
    }
    return now;
  }
}
