import {Timestamp} from "firebase-admin/firestore";
import type {Firestore, Transaction} from "firebase-admin/firestore";
import {HttpsError} from "firebase-functions/v2/https";
import {operationContentHash} from "../../operations/durableActions";
import {
  contactPermissionReceiptRef,
  eventContactPermissionRef,
  EventContactPermission,
  EventContactReceipt,
  EventServiceChannel,
  EventServiceGrant,
  eventServiceKeys,
  readEventContactPermission,
  readEventContactReceipt,
  storedMillis,
} from "../../shared/eventContactPermissions";
import {EventContactPermissionWriter, EventContactReceiptWrite} from
  "../../messaging/eventContactPermissions";
import {Permission as SmsPermission, parseSmsPermission, smsPermissionId} from
  "./smsPermissionRecords";
import {ConsentReceipt as SmsReceipt, parseSmsConsentReceipt} from
  "./smsConsent";
import {Permission as WhatsappPermission, parseWhatsappPermission,
  whatsappPermissionId, whatsappSenderHash} from "./whatsappPermissionRecords";
import {ConsentReceipt as WhatsappReceipt, parseWhatsappConsentReceipt} from
  "./whatsappConsent";
import {Permission as RcsPermission, ConsentReceipt as RcsReceipt,
  parseRcsPermission, parseRcsConsentReceipt, rcsPermissionId,
  rcsSenderHash} from "./rcsConsent";

/**
 * Event-day consent in users/{uid}/contactPermissions/event_{eventId}
 * (issue #2494). Each channel's permission and receipt map one to one onto
 * an event grant and a contactPermissionReceipts entry, and back. The maps
 * are exact inverses, so a send gate rebuilds the very permission and
 * receipt the channel checks always read, and every permissionHash still
 * matches. The uid is the document's path; the event, organiser, channel
 * and route are fixed by the document and the grant key.
 */
export type EventPermission = SmsPermission | WhatsappPermission |
  RcsPermission;
export type EventReceipt = SmsReceipt | WhatsappReceipt | RcsReceipt;
type ChannelPermission<C extends EventServiceChannel> =
  Extract<EventPermission, {channel: C}>;
type ChannelReceipt<C extends EventServiceChannel> =
  Extract<EventReceipt, {channel: C}>;

const routes = {sms: "catchEventSms", rcs: "catchEventRcs",
  whatsapp: "organizerEventWhatsapp"} as const;

/** SMS had no sender hash: its identity is the Catch route and sender id. */
export function smsSenderIdentityHash(senderId: string): string {
  return operationContentHash([routes.sms, senderId]);
}

/** The sender identity hash a permission binds. */
export function eventSenderIdentityHash(permission: EventPermission): string {
  switch (permission.channel) {
  case "sms": return smsSenderIdentityHash(permission.senderId);
  case "whatsapp": return whatsappSenderHash(permission.context.organizerId,
    permission.senderId, permission.sender);
  case "rcs": return rcsSenderHash(permission.senderId, permission.sender);
  }
}

/** The uid a permission names, or null for a first-time withdrawal. */
export function eventPermissionSubject(permission: EventPermission):
  string | null {
  return permission.channel === "rcs" ? permission.subjectUid :
    permission.evidence?.subjectUid ?? null;
}

const fromMillis = (value: number) => Timestamp.fromMillis(value);
const toMillis = (value: FirebaseFirestore.Timestamp) => storedMillis(value);
const grantSource = (source: EventReceipt["source"]) =>
  source === "messageLink" ? "unsubscribeLink" as const :
    "participantSettings" as const;

/** The event grant for a channel permission and its current receipt. */
export function eventGrantFromPermission(uid: string,
  permission: EventPermission, receipt: EventReceipt): EventServiceGrant {
  const subject = eventPermissionSubject(permission) ?? receipt.actorUid;
  if (subject !== uid || receipt.receiptId !== permission.currentReceiptId ||
      receipt.channel !== permission.channel) {
    throw new Error("Event permission does not belong to this guest");
  }
  const evidence = permission.evidence;
  return {
    status: permission.status === "granted" ? "optedIn" : "optedOut",
    endpointE164: permission.phoneE164,
    receiptId: permission.currentReceiptId,
    termsVersion: evidence?.copyVersion ?? null,
    source: grantSource(receipt.source),
    updatedAt: fromMillis(permission.updatedAt),
    expiresAt: fromMillis(permission.expiresAt),
    revision: permission.revision,
    senderId: permission.senderId,
    senderIdentityHash: eventSenderIdentityHash(permission),
    attendeeId: permission.attendeeId,
    attendeeGeneration: permission.attendeeGeneration,
    recipientEndpointId: permission.recipientEndpointId,
    ...(permission.recipientBinding ?
      {recipientBinding: permission.recipientBinding} : {}),
    evidence: evidence === null ? null : {
      receiptId: evidence.receiptId,
      termsVersion: evidence.copyVersion,
      acceptedAt: fromMillis(evidence.acceptedAt),
      phoneVerifiedAt: fromMillis(evidence.phoneVerifiedAt),
      ...("senderHash" in evidence ? {senderHash: evidence.senderHash} : {}),
      ...("reviewHash" in evidence ? {reviewHash: evidence.reviewHash,
        reviewedStopHash: evidence.reviewedStopHash} : {}),
    },
    ...(permission.channel === "rcs" ? {rcs: {
      sourceGeneration: permission.sourceGeneration,
      subscriptionId: permission.subscriptionId,
      sender: permission.sender}} : {}),
    ...(permission.channel === "whatsapp" ?
      {whatsapp: {sender: permission.sender}} : {}),
  };
}

/** Rebuilds the channel permission a grant was made from. */
export function permissionFromEventGrant<C extends EventServiceChannel>(
  channel: C, uid: string, document: EventContactPermission,
  grant: EventServiceGrant): ChannelPermission<C> {
  const context = {mode: "live" as const, organizerId: document.organizerId,
    eventId: document.senderId};
  const evidence = grant.evidence;
  const base = {
    schemaVersion: 1, channel, revision: grant.revision, context,
    attendeeId: grant.attendeeId,
    attendeeGeneration: grant.attendeeGeneration,
    senderId: grant.senderId, routeId: routes[channel],
    purpose: "eventService", phoneE164: grant.endpointE164,
    recipientEndpointId: grant.recipientEndpointId,
    status: grant.status === "optedIn" ? "granted" : "revoked",
    expiresAt: toMillis(grant.expiresAt),
    updatedAt: toMillis(grant.updatedAt),
    currentReceiptId: grant.receiptId,
    ...(grant.recipientBinding ?
      {recipientBinding: grant.recipientBinding} : {}),
  };
  const proof = evidence === null ? null : {receiptId: evidence.receiptId,
    copyVersion: evidence.termsVersion,
    acceptedAt: toMillis(evidence.acceptedAt),
    phoneVerifiedAt: toMillis(evidence.phoneVerifiedAt)};
  if (channel === "sms") {
    return parseSmsPermission({...base,
      permissionId: smsPermissionId(context, grant.attendeeId, grant.senderId),
      evidence: proof && {...proof, subjectUid: uid},
    }) as ChannelPermission<C>;
  }
  if (channel === "whatsapp") {
    if (!grant.whatsapp) throw new Error("Event WhatsApp grant has no sender");
    return parseWhatsappPermission({...base,
      permissionId: whatsappPermissionId(context, grant.attendeeId,
        grant.senderId),
      sender: grant.whatsapp.sender,
      evidence: proof && {...proof, subjectUid: uid,
        senderHash: evidence!.senderHash},
    }) as ChannelPermission<C>;
  }
  if (!grant.rcs) throw new Error("Event RCS grant has no sender");
  return parseRcsPermission({...base,
    permissionId: rcsPermissionId(context, grant.attendeeId, grant.senderId),
    subjectUid: uid, sender: grant.rcs.sender,
    sourceGeneration: grant.rcs.sourceGeneration,
    subscriptionId: grant.rcs.subscriptionId,
    evidence: proof && {...proof, senderHash: evidence!.senderHash,
      reviewHash: evidence!.reviewHash,
      reviewedStopHash: evidence!.reviewedStopHash},
  }) as ChannelPermission<C>;
}

/** The contactPermissionReceipts entry for a channel receipt. */
export function eventReceiptFromReceipt(uid: string,
  receipt: EventReceipt): EventContactReceiptWrite["receipt"] {
  const granting = receipt.decision === "grant";
  const createdAt = fromMillis(receipt.createdAt);
  const link = receipt.source === "messageLink";
  return {
    senderKind: "event", senderId: receipt.context.eventId, uid,
    organizerId: receipt.context.organizerId,
    channel: receipt.channel, purpose: "eventService",
    decision: granting ? "optedIn" : "optedOut",
    evidenceStatus: "complete",
    termsVersion: receipt.copyVersion, consentCopyHash: receipt.copyHash,
    source: grantSource(receipt.source),
    sourceEventId: receipt.context.eventId, sourceFormId: null,
    sourceResponseId: null, sourceProviderEventId: null,
    actorClass: "participant", actorUid: receipt.actorUid,
    identityStrength: link ? "unknown" : "phoneVerified",
    grantedAt: granting ? createdAt : null,
    revokedAt: granting ? null : createdAt,
    createdAt,
    event: {
      requestHash: receipt.requestHash,
      attendeeId: receipt.attendeeId,
      attendeeGeneration: receipt.attendeeGeneration,
      senderId: receipt.senderId,
      recipientEndpointId: receipt.recipientEndpointId,
      appliedRevision: receipt.appliedRevision,
      permissionHash: receipt.permissionHash,
      linkId: "linkId" in receipt ? receipt.linkId ?? null : null,
      ...("senderHash" in receipt ? {senderHash: receipt.senderHash} : {}),
      ...(receipt.channel === "rcs" ? {
        sourceGeneration: receipt.sourceGeneration,
        reviewHash: receipt.reviewHash,
        reviewedStopHash: receipt.reviewedStopHash} : {}),
    },
  };
}

/** Rebuilds the channel receipt an event receipt was made from. */
export function receiptFromEventReceipt<C extends EventServiceChannel>(
  channel: C, receiptId: string, receipt: EventContactReceipt):
  ChannelReceipt<C> {
  const event = receipt.event;
  if (receipt.channel !== channel || receipt.purpose !== "eventService" ||
      !event) {
    throw new Error("Not an event-day channel receipt");
  }
  const link = receipt.source === "unsubscribeLink";
  const base = {
    schemaVersion: 1, channel, receiptId, requestHash: event.requestHash,
    context: {mode: "live", organizerId: receipt.organizerId,
      eventId: receipt.senderId},
    attendeeId: event.attendeeId,
    attendeeGeneration: event.attendeeGeneration,
    senderId: event.senderId, routeId: routes[channel],
    actorUid: receipt.actorUid,
    recipientEndpointId: event.recipientEndpointId,
    decision: receipt.decision === "optedIn" ? "grant" : "revoke",
    copyVersion: receipt.termsVersion, copyHash: receipt.consentCopyHash,
    appliedRevision: event.appliedRevision,
    createdAt: toMillis(receipt.createdAt),
    permissionHash: event.permissionHash,
    source: link ? "messageLink" : "verifiedParticipant",
  };
  if (channel === "sms") {
    return parseSmsConsentReceipt({...base,
      linkId: event.linkId}) as ChannelReceipt<C>;
  }
  if (channel === "whatsapp") {
    return parseWhatsappConsentReceipt({...base, linkId: event.linkId,
      senderHash: event.senderHash}) as ChannelReceipt<C>;
  }
  return parseRcsConsentReceipt({...base, senderHash: event.senderHash,
    sourceGeneration: event.sourceGeneration, reviewHash: event.reviewHash,
    reviewedStopHash: event.reviewedStopHash,
    ...(link ? {linkId: event.linkId} : {})}) as ChannelReceipt<C>;
}

/**
 * The event-day permission and current receipt for one channel of one
 * guest, rebuilt from the guest's event document. Null when there is no
 * grant for that channel. A grant that does not rebuild into a valid
 * permission and receipt reads as no grant.
 */
export async function readEventChannelConsent<C extends EventServiceChannel>(
  db: Firestore, tx: Transaction, channel: C, uid: string, eventId: string):
  Promise<{grant: EventServiceGrant; permission: ChannelPermission<C>;
    receipt: ChannelReceipt<C> | null} | null> {
  const snap = await tx.get(eventContactPermissionRef(db, uid, eventId));
  let document: EventContactPermission | null;
  try {
    document = readEventContactPermission(snap.data(), eventId);
  } catch {
    return null;
  }
  const grant = document?.grants[eventServiceKeys[channel]];
  if (!document || !grant) return null;
  let permission: ChannelPermission<C>;
  try {
    permission = permissionFromEventGrant(channel, uid, document, grant);
  } catch {
    return null;
  }
  const receiptSnap = await tx.get(contactPermissionReceiptRef(db,
    grant.receiptId));
  const stored = readEventContactReceipt(receiptSnap.data(), eventId);
  let receipt: ChannelReceipt<C> | null = null;
  try {
    receipt = stored ?
      receiptFromEventReceipt(channel, grant.receiptId, stored) : null;
  } catch {
    receipt = null;
  }
  return {grant, permission, receipt};
}

/**
 * Mirrors one channel decision into the guest's event document and the
 * receipt log, in the transaction that wrote the channel permission and
 * receipt. Read with EventContactPermissionWriter.read before any write.
 */
export function writeEventChannelDecision(tx: Transaction,
  writer: EventContactPermissionWriter, permission: EventPermission,
  receipt: EventReceipt, nowMillis: number): void {
  const key = eventServiceKeys[permission.channel];
  writer.write(tx, {organizerId: permission.context.organizerId,
    grants: {[key]: eventGrantFromPermission(writer.uid, permission, receipt)},
    receipts: [{key, receiptId: receipt.receiptId,
      receipt: eventReceiptFromReceipt(writer.uid, receipt)}],
    nowMillis});
}

/**
 * One roster row per guest per event: a uid linked to two rows in one event
 * (legacy data) cannot give event-day consent until the host resolves the
 * duplicate, because a grant covers only the row it names.
 */
export async function requireOneEventRow(db: Firestore, tx: Transaction,
  eventId: string, uid: string): Promise<void> {
  const rows = await tx.get(db.collection("eventAttendees")
    .where("eventId", "==", eventId).where("linkedUid", "==", uid).limit(2));
  if (rows.size > 1) {
    throw new HttpsError("failed-precondition",
      "This account has two places at this event. Ask the host to merge " +
      "them first.");
  }
}
