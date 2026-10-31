import {MessageRecipientBinding, MessageRecipientSource,
  reviewMessageRecipient, messageRecipientMatches} from "./messageRecipient";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import type {GetEventRcsPreferenceCallablePayload as Scope} from
  "../../shared/generated/getEventRcsPreferenceInput";
import type {SetEventRcsPreferenceCallablePayload as Submission} from
  "../../shared/generated/setEventRcsPreferenceInput";
import type {EventRcsPreferenceCallableResponse as Response} from
  "../../shared/generated/eventRcsPreferenceOutput";
import {operationContentHash} from "../../operations/durableActions";
import {GuestSourceFacts, guestSourceFactsFromSnapshots,
  requireDocumentId} from "./guestRecords";
import {runAssistanceTransaction} from "./transactionCallback";
import {parseRcsConfig, RcsConfig, rcsEndpointId, rcsPhoneHash} from
  "./rcsProtocol";
import {readRcsSubscription, RcsSubscription, rcsSubscriptionId} from
  "./rcsSubscriptions";
import {rcsCallbackClock} from "./rcsCallbackRecords";
import {Permission, ConsentReceipt, parseRcsPermission,
  parseRcsConsentReceipt, rcsConsentCollections, rcsPermissionId,
  rcsSenderHash, rcsStopHash, rcsPermissionHasReceipt,
  rcsPermissionClearsStop, RCS_CONSENT_VERSION, RCS_CONSENT_HASH,
  RCS_CONSENT_TEXT} from "./rcsConsent";

/** Only Firebase Auth's signed UID and phone claim enter this boundary. */
export interface RcsPreferenceActor {uid: string; phone: string | null}
interface Facts {
  context: Permission["context"];
  source: GuestSourceFacts;
  phone: string | null;
  recipientBinding: MessageRecipientBinding | null;
  recipientSource: MessageRecipientSource;
  sender: RcsConfig | null;
  permission: Permission | null;
  receipt: ConsentReceipt | null;
  subscription: RcsSubscription | null;
  subscriptionInvalid: boolean;
}

export class RcsPreferenceStore {
  constructor(private readonly db: Firestore,
    private readonly clock: () => number = Date.now) {}

  async get(actor: RcsPreferenceActor, scope: Scope): Promise<Response> {
    return runAssistanceTransaction(this.db, async (tx) => {
      const now = rcsCallbackClock(this.clock());
      const facts = await this.read(tx, actor, scope, now);
      const reviewedAt = rcsCallbackClock(this.clock());
      if (reviewedAt < now) {
        throw new HttpsError("unavailable",
          "Event preference clock is behind.");
      }
      return {outcome: "read", view: this.view(actor, scope, facts,
        reviewedAt)};
    });
  }

  async set(actor: RcsPreferenceActor, input: Submission): Promise<Response> {
    requireDocumentId(input.requestId);
    const receiptId = "rcs-consent:" + operationContentHash([
      actor.uid, input.eventId, input.attendeeId, input.senderId,
      input.requestId,
    ]);
    const requestHash = operationContentHash([actor.uid, input]);
    return runAssistanceTransaction(this.db, async (tx) => {
      const readAt = rcsCallbackClock(this.clock());
      const facts = await this.read(tx, actor, input, readAt);
      const receiptRef = this.db.collection(rcsConsentCollections.receipts)
        .doc(receiptId);
      const prior = await tx.get(receiptRef);
      const now = rcsCallbackClock(this.clock());
      if (now < readAt) {
        throw new HttpsError("unavailable",
          "Event preference clock is behind.");
      }
      const view = this.view(actor, input, facts, now);
      if (prior.exists) {
        const receipt = parseRcsConsentReceipt(prior.data());
        if (receipt.receiptId !== receiptId ||
            receipt.requestHash !== requestHash) {
          throw new HttpsError("invalid-argument", "Use a new RCS request.");
        }
        return {outcome: "replayed", view};
      }
      const previous = facts.permission;
      if ((previous?.revision ?? null) !== input.expectedRevision) {
        return {outcome: "conflict", view};
      }
      const granting = input.decision.kind === "grant";
      if (input.decision.kind === "grant" && (!view.canEnable ||
          input.decision.copyVersion !== RCS_CONSENT_VERSION ||
          input.decision.reviewHash !== view.reviewHash)) {
        throw new HttpsError("failed-precondition",
          "Review the current event RCS preference before enabling it.");
      }
      if (!granting && previous && previous.subjectUid !== actor.uid) {
        throw new HttpsError("permission-denied",
          "RCS preference unavailable.");
      }
      const phone = granting ? facts.phone :
        previous?.phoneE164 ?? facts.phone;
      const sender = granting ? senderIdentity(facts.sender) :
        previous?.sender ?? senderIdentity(facts.sender);
      if (!phone || !sender) {
        throw new HttpsError("failed-precondition",
          "There is no event RCS preference to update.");
      }
      const senderHash = rcsSenderHash(input.senderId, sender);
      const evidence = granting ? {receiptId, senderHash,
        copyVersion: RCS_CONSENT_VERSION, acceptedAt: now,
        // When the signed phone claim was checked, not a new OTP timestamp.
        phoneVerifiedAt: now, reviewHash: view.reviewHash,
        reviewedStopHash: rcsStopHash(facts.subscription)} :
        previous?.evidence ?? null;
      const recipientBinding = granting || !previous ?
        facts.recipientBinding : previous.recipientBinding;
      const permission = parseRcsPermission({schemaVersion: 1,
        permissionId: rcsPermissionId(facts.context, input.attendeeId,
          input.senderId), currentReceiptId: receiptId,
        revision: (previous?.revision ?? 0) + 1,
        context: facts.context, attendeeId: input.attendeeId,
        attendeeGeneration: granting ? facts.source.attendeeGeneration :
          previous?.attendeeGeneration ?? facts.source.attendeeGeneration,
        sourceGeneration: granting ? facts.source.sourceGeneration :
          previous?.sourceGeneration ?? facts.source.sourceGeneration,
        subjectUid: actor.uid, senderId: input.senderId, sender,
        routeId: "catchEventRcs", purpose: "eventService", phoneE164: phone,
        subscriptionId: rcsSubscriptionId(sender.agentId, rcsPhoneHash(phone)!),
        ...(recipientBinding ? {recipientBinding} : {}),
        recipientEndpointId: rcsEndpointId(facts.context,
          input.attendeeId, phone), status: granting ? "granted" : "revoked",
        evidence, expiresAt: granting ? expiry(facts.source) :
          previous?.expiresAt ?? Math.max(now, expiry(facts.source)),
        updatedAt: now});
      const receipt = parseRcsConsentReceipt({schemaVersion: 1, receiptId,
        requestHash, source: "verifiedParticipant", context: facts.context,
        attendeeId: input.attendeeId,
        attendeeGeneration: permission.attendeeGeneration,
        sourceGeneration: permission.sourceGeneration, actorUid: actor.uid,
        senderId: input.senderId, senderHash, routeId: "catchEventRcs",
        recipientEndpointId: permission.recipientEndpointId,
        decision: input.decision.kind,
        copyVersion: granting ? RCS_CONSENT_VERSION : null,
        copyHash: granting ? RCS_CONSENT_HASH : null,
        reviewHash: granting ? view.reviewHash : null,
        reviewedStopHash: granting ? rcsStopHash(facts.subscription) : null,
        permissionHash: operationContentHash(permission),
        appliedRevision: permission.revision, createdAt: now});
      tx.create(receiptRef, receipt);
      tx.set(this.db.collection(rcsConsentCollections.permissions)
        .doc(permission.permissionId), permission);
      return {outcome: "applied", view: this.view(actor, input,
        {...facts, permission, receipt}, now)};
    });
  }

  private async read(tx: Transaction, actor: RcsPreferenceActor,
    scope: Scope, now: number): Promise<Facts> {
    [scope.eventId, scope.attendeeId, scope.senderId, actor.uid]
      .forEach(requireDocumentId);
    const [eventSnap, attendeeSnap, senderSnap] = await tx.getAll(
      this.db.collection("events").doc(scope.eventId),
      this.db.collection("eventAttendees").doc(scope.attendeeId),
      this.db.collection(rcsConsentCollections.senders).doc(scope.senderId));
    const event = eventSnap.data();
    const attendee = attendeeSnap.data();
    if (!event || !attendee || attendee.linkedUid !== actor.uid ||
        attendee.eventId !== scope.eventId) {
      throw new HttpsError("permission-denied", "RCS preference unavailable.");
    }
    const context = {mode: "live" as const, eventId: scope.eventId,
      organizerId: event.organizerId};
    const source = guestSourceFactsFromSnapshots(context, scope.attendeeId,
      eventSnap, attendeeSnap);
    const id = rcsPermissionId(context, scope.attendeeId, scope.senderId);
    const snap = await tx.get(this.db.collection(rcsConsentCollections
      .permissions).doc(id));
    const permission = snap.exists ? parseRcsPermission(snap.data()) : null;
    if (permission && permission.permissionId !== id) {
      throw new HttpsError("internal", "RCS preference identity mismatch.");
    }
    const receiptSnap = permission ? await tx.get(this.db
      .collection(rcsConsentCollections.receipts)
      .doc(permission.currentReceiptId)) : null;
    let receipt: ConsentReceipt | null = null;
    let sender: RcsConfig | null = null;
    try {
      if (receiptSnap?.exists) {
        receipt = parseRcsConsentReceipt(receiptSnap.data());
      }
    } catch {/* Broken proof cannot enable consent or prevent withdrawal. */}
    try {
      if (senderSnap.exists) sender = parseRcsConfig(senderSnap.data());
      if (sender?.senderId !== scope.senderId) sender = null;
    } catch {/* A broken sender cannot prevent withdrawal. */}
    const recipientSource: MessageRecipientSource = {
      rosterPhone: attendee.phoneE164, linkedUid: attendee.linkedUid,
      sourceGeneration: source.sourceGeneration,
    };
    let recipient = reviewMessageRecipient(actor, recipientSource,
      (value) => rcsPhoneHash(value) !== null, permission,
      permission !== null && permission.expiresAt > now &&
        rcsPermissionHasReceipt(permission, receipt) &&
        (!sender || permission.sender.agentId === sender.agentId));
    const identity = senderIdentity(sender) ?? permission?.sender;
    let subscriptionFacts = await this.readSubscription(tx, identity,
      recipient.phone, permission, now);
    if (!subscriptionFacts.subscriptionInvalid &&
        subscriptionFacts.subscription?.lastStop &&
        subscriptionFacts.subscription.lastStop.observedAt < now &&
        permission && !rcsPermissionClearsStop(permission,
      subscriptionFacts.subscription) && recipient.phone !== actor.phone &&
        rcsPhoneHash(actor.phone)) {
      recipient = reviewMessageRecipient(actor, recipientSource,
        (value) => rcsPhoneHash(value) !== null, permission, false);
      subscriptionFacts = await this.readSubscription(tx, identity,
        recipient.phone, permission, now);
    }
    return {context, source, permission, receipt, sender,
      phone: recipient.phone, recipientBinding: recipient.binding,
      recipientSource, ...subscriptionFacts};
  }

  private async readSubscription(tx: Transaction,
    identity: Permission["sender"] | null | undefined, phone: string | null,
    permission: Permission | null, now: number): Promise<Pick<Facts,
      "subscription" | "subscriptionInvalid">> {
    let subscription: RcsSubscription | null = null;
    let subscriptionInvalid = false;
    if (identity && phone) {
      try {
        subscription = await readRcsSubscription(this.db, tx, identity.agentId,
          rcsPhoneHash(phone)!, now);
        if (permission && permission.phoneE164 === phone &&
            permission.sender.agentId === identity.agentId &&
            permission.evidence?.reviewedStopHash &&
            !subscription?.lastStop) subscriptionInvalid = true;
      } catch {
        subscriptionInvalid = true;
      }
    }
    return {subscription, subscriptionInvalid};
  }

  private view(actor: RcsPreferenceActor, scope: Scope, facts: Facts,
    now: number): Response["view"] {
    const {source, sender, permission, receipt, phone, subscription} = facts;
    if (now < (permission?.updatedAt ?? 0) ||
        now < (receipt?.createdAt ?? 0)) {
      throw new HttpsError("unavailable", "RCS preference clock is behind.");
    }
    const belongs = permission !== null &&
      permission.subjectUid === actor.uid &&
      permission.phoneE164 === phone &&
      messageRecipientMatches(permission.recipientBinding,
        facts.recipientSource, (value) => value === permission.phoneE164) &&
      permission.attendeeGeneration === source.attendeeGeneration &&
      permission.sourceGeneration === source.sourceGeneration &&
      (!sender || permission.sender.agentId === sender.agentId);
    let availability: Response["view"]["availability"] = "ready";
    if (!phone || phone !== actor.phone) availability = "verifyPhone";
    else if (!["registered", "checkedIn"].includes(source.attendeeStatus)) {
      availability = "notAdmitted";
    } else if (source.eventStatus !== "active" || now >= expiry(source)) {
      availability = "eventClosed";
    } else if (!sender || sender.status !== "ready" ||
        sender.activation.approvedAt > now ||
        sender.activation.validUntil <= now ||
        !sender.recipientPrefixes.some((p) => phone.startsWith(p))) {
      availability = "senderUnavailable";
    } else if (facts.subscriptionInvalid ||
        (subscription?.lastStop?.observedAt ?? -1) >= now) {
      availability = "subscriptionUnavailable";
    }
    const preference: Response["view"]["preference"] = !belongs ? "notSet" :
      permission!.status === "revoked" ? "disabled" :
        !rcsPermissionHasReceipt(permission!, receipt) ? "notSet" :
          facts.subscriptionInvalid ||
          !rcsPermissionClearsStop(permission!, subscription) ? "disabled" :
            permission!.expiresAt <= now || now >= expiry(source) ?
              "expired" : "enabled";
    const identity = senderIdentity(sender) ?? permission?.sender ?? null;
    return {eventId: scope.eventId, attendeeId: scope.attendeeId,
      senderId: scope.senderId, eventTitle: source.eventTitle, serverTime: now,
      revision: permission?.revision ?? null, preference, availability,
      canEnable: availability === "ready",
      phoneLastFour: phone?.slice(-4) ?? null,
      expiresAt: belongs ? permission!.expiresAt : null,
      sender: identity ? {displayName: identity.displayName} : null,
      reviewHash: operationContentHash([facts.context, scope.attendeeId,
        actor.uid, source.attendeeGeneration, source.sourceGeneration,
        source.eventTitle, expiry(source), phone, scope.senderId, identity,
        facts.recipientBinding,
        rcsStopHash(subscription)]),
      consent: {version: RCS_CONSENT_VERSION, text: RCS_CONSENT_TEXT}};
  }
}

function senderIdentity(sender: RcsConfig | null): Permission["sender"] | null {
  return sender ? {agentId: sender.agentId,
    displayName: sender.displayName} : null;
}
function expiry(source: GuestSourceFacts): number {
  return rcsCallbackClock(Math.floor(source.eventEnd) + 86_400_000);
}
