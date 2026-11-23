import {createHash} from "crypto";
import type {ContactPermissionReceipt} from "./contactPermissions";

export type OrganizerCommunicationChannel = "whatsapp" | "sms";

const organizerUpdatesConsentCopy = {
  "organizer-updates-v1": {
    whatsapp:
      "Send me future event announcements from this organizer on WhatsApp",
    sms:
      "Send me future event announcements from this organizer by text message",
  },
} as const;

/**
 * The organizer-and-user id the guest's guestMessagingPermissions row has
 * kept since before contact permissions (issue #2460).
 */
export function organizerCommunicationPreferenceId(
  organizerId: string,
  uid: string
): string {
  return `orgpref_${sha256(`${organizerId}|${uid}`).slice(0, 48)}`;
}

/** Returns a stable immutable receipt id for one source decision. */
export function organizerCommunicationPermissionReceiptId(params: {
  organizerId: string;
  uid: string;
  channel: OrganizerCommunicationChannel;
  decision: "optedIn" | "optedOut";
  source: ContactPermissionReceipt["source"];
  sourceIdentity: string;
}): string {
  return `ocpr_${sha256([
    params.organizerId,
    params.uid,
    params.channel,
    params.decision,
    params.source,
    params.sourceIdentity,
  ].join("|")).slice(0, 48)}`;
}

/** Returns the reviewed consent-copy hash, or null for an unknown version. */
export function organizerUpdatesConsentCopyHash(
  termsVersion: string,
  channel: OrganizerCommunicationChannel
): string | null {
  const version = termsVersion as keyof typeof organizerUpdatesConsentCopy;
  const copy = organizerUpdatesConsentCopy[version]?.[channel];
  return copy ? sha256(`${termsVersion}|${channel}|${copy}`) : null;
}

/**
 * Builds complete participant grant evidence for website OTP registration,
 * bound to the phone number the registration verified.
 */
export function publicRegistrationPermissionReceipt(params: {
  organizerId: string;
  uid: string;
  channel: OrganizerCommunicationChannel;
  eventId: string;
  termsVersion: string;
  endpointE164: string;
  supersedesReceiptId: string | null;
  now: FirebaseFirestore.Timestamp;
}): {id: string; document: ContactPermissionReceipt} | null {
  const consentCopyHash = organizerUpdatesConsentCopyHash(
    params.termsVersion,
    params.channel
  );
  if (!consentCopyHash) return null;
  const id = organizerCommunicationPermissionReceiptId({
    organizerId: params.organizerId,
    uid: params.uid,
    channel: params.channel,
    decision: "optedIn",
    source: "publicEventRegistration",
    sourceIdentity: `${params.eventId}|${params.termsVersion}`,
  });
  return {
    id,
    document: {
      senderKind: "organizer",
      senderId: params.organizerId,
      uid: params.uid,
      channel: params.channel,
      purpose: "marketing",
      endpointE164: params.endpointE164,
      decision: "optedIn",
      evidenceStatus: "complete",
      termsVersion: params.termsVersion,
      consentCopyHash,
      source: "publicEventRegistration",
      sourceEventId: params.eventId,
      sourceFormId: null,
      sourceResponseId: null,
      sourceProviderEventId: null,
      actorClass: "participant",
      actorUid: params.uid,
      identityStrength: "phoneVerified",
      grantedAt: params.now,
      revokedAt: null,
      supersedesReceiptId: params.supersedesReceiptId,
      createdAt: params.now,
    },
  };
}

/** Builds complete provider evidence for a participant's WhatsApp STOP. */
export function inboundStopPermissionReceipt(params: {
  organizerId: string;
  uid: string;
  providerEventId: string;
  supersedesReceiptId: string | null;
  now: FirebaseFirestore.Timestamp;
}): {id: string; document: ContactPermissionReceipt} {
  const id = organizerCommunicationPermissionReceiptId({
    organizerId: params.organizerId,
    uid: params.uid,
    channel: "whatsapp",
    decision: "optedOut",
    source: "inboundStop",
    sourceIdentity: params.providerEventId,
  });
  return {
    id,
    document: {
      senderKind: "organizer",
      senderId: params.organizerId,
      uid: params.uid,
      channel: "whatsapp",
      decision: "optedOut",
      evidenceStatus: "complete",
      termsVersion: null,
      consentCopyHash: null,
      source: "inboundStop",
      sourceEventId: null,
      sourceFormId: null,
      sourceResponseId: null,
      sourceProviderEventId: params.providerEventId,
      actorClass: "provider",
      actorUid: params.uid,
      identityStrength: "catchAccount",
      grantedAt: null,
      revokedAt: params.now,
      supersedesReceiptId: params.supersedesReceiptId,
      createdAt: params.now,
    },
  };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
