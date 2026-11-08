import {createHash} from "node:crypto";
import type {
  OrganizerCommunicationPermissionReceiptDocument,
  OrganizerCommunicationPreferenceDocument,
  OrganizerMessageTemplateDocument,
  OrganizerSenderConnectionDocument,
} from "../shared/generated/firestoreAdminTypes";
import {organizerFollowerWhatsappRoute} from
  "../communications/communicationRoutes";

/**
 * Follower updates on WhatsApp (route organizerFollowerWhatsapp).
 *
 * Following an organiser is a push preference only. WhatsApp needs four
 * further facts, all re-read at send time: the followerUpdates WhatsApp
 * purpose granted by an explicit tick, the follower's verified phone still
 * matching the phone that tick was bound to, the organiser's active sender
 * connection, and that sender's approved organizer_follower_update template.
 */

export const followerWhatsappRouteId = organizerFollowerWhatsappRoute.id;
export const followerWhatsappPurpose = "followerUpdates" as const;

/** The Meta template each organiser submits on their own WABA. */
export const organizerFollowerUpdateTemplateName = "organizer_follower_update";

/** Reviewed consent copy for the follow-by-phone WhatsApp tick. */
export const followerWhatsappTermsVersion = "follower-whatsapp-v1";
const followerWhatsappConsentCopy = {
  [followerWhatsappTermsVersion]:
    "Send me this organiser's updates on WhatsApp. Reply STOP to stop.",
} as const;

type ChannelPreference = OrganizerCommunicationPreferenceDocument["whatsapp"];
type Receipt = OrganizerCommunicationPermissionReceiptDocument;

/** Returns the reviewed follower consent copy hash, or null when unknown. */
export function followerWhatsappConsentCopyHash(
  termsVersion: string,
): string | null {
  const copy = followerWhatsappConsentCopy[
    termsVersion as keyof typeof followerWhatsappConsentCopy];
  return copy ? sha256(`${termsVersion}|whatsapp|followerUpdates|${copy}`) :
    null;
}

/**
 * The purpose gate. A broad WhatsApp withdrawal (settings, STOP) that is
 * not older than the follower grant wins; the grant counts only when its
 * evidence is complete, its terms are the reviewed ones and it is bound to
 * the same phone the message would go to.
 */
export function effectiveFollowerWhatsappStatus(
  preference: OrganizerCommunicationPreferenceDocument | null | undefined,
  endpointE164: string | null | undefined,
  stoppedAtMillis: number | null = null,
): "unknown" | "optedIn" | "optedOut" {
  const scoped = preference?.whatsappPurposes?.followerUpdates;
  const broad = preference?.whatsapp;
  const scopedAt = scoped?.updatedAt?.toMillis() ?? null;
  if (broad?.status === "optedOut" &&
      (scopedAt === null || !broad.updatedAt ||
        broad.updatedAt.toMillis() >= scopedAt)) {
    return "optedOut";
  }
  if (!scoped || scoped.status === "unknown") return "unknown";
  if (scoped.status === "optedOut") return "optedOut";
  if (stoppedAtMillis !== null &&
      (scopedAt === null || stoppedAtMillis >= scopedAt)) {
    return "optedOut";
  }
  if (!endpointE164 || scoped.endpointE164 !== endpointE164) return "unknown";
  return scoped.evidenceStatus === "complete" && !!scoped.currentReceiptId &&
    scoped.termsVersion === followerWhatsappTermsVersion &&
    scoped.source === "organizerFollowByPhone" ? "optedIn" : "unknown";
}

export type FollowerWhatsappBlocker =
  | "missingPhone"
  | "permissionRequired"
  | "contactOptedOut"
  | "senderUnavailable";

/**
 * Plan resolution for one follower on this route: a momentary projection
 * over the same facts the send-time gate re-reads, using the shared route
 * blocker vocabulary.
 */
export function resolveFollowerWhatsappPlan(facts: {
  verifiedPhoneE164: string | null;
  preference: OrganizerCommunicationPreferenceDocument | null | undefined;
  stoppedAtMillis: number | null;
  senderReady: boolean;
}): {
  routeId: typeof followerWhatsappRouteId;
  availability: "available" | "unavailable";
  blocker: FollowerWhatsappBlocker | null;
} {
  const status = effectiveFollowerWhatsappStatus(facts.preference,
    facts.verifiedPhoneE164, facts.stoppedAtMillis);
  const blocker: FollowerWhatsappBlocker | null =
    !facts.senderReady ? "senderUnavailable" :
      status === "optedOut" ? "contactOptedOut" :
        !facts.verifiedPhoneE164 ? "missingPhone" :
          status !== "optedIn" ? "permissionRequired" : null;
  return {routeId: followerWhatsappRouteId,
    availability: blocker === null ? "available" : "unavailable", blocker};
}

/**
 * The organiser's sender is ready for follower updates when one connection
 * is active and holds an approved organizer_follower_update template with
 * exactly one body variable and no media header or URL parameters to fill.
 */
export function followerUpdateTemplateReady(params: {
  organizerId: string;
  connectionId: string;
  connection: OrganizerSenderConnectionDocument | undefined;
  template: OrganizerMessageTemplateDocument | undefined;
}): boolean {
  const {organizerId, connectionId, connection, template} = params;
  return !!connection && connection.organizerId === organizerId &&
    connection.channel === "whatsapp" && connection.status === "active" &&
    !!connection.phoneNumberId && !!connection.secretVersionResource &&
    !!template && template.organizerId === organizerId &&
    template.name === organizerFollowerUpdateTemplateName &&
    template.status === "APPROVED" &&
    (template.connectionId === connection.phoneNumberId ||
      template.connectionId === connectionId) &&
    !template.hasMediaHeader && template.variableNames.length === 1 &&
    template.parameterBindings.length === 1 &&
    template.parameterBindings[0].component === "body";
}

/**
 * Meta rejects template parameters with new lines, tabs or more than four
 * consecutive spaces, so the organiser's text becomes one line.
 */
export function followerUpdateTemplateText(text: string): string {
  return text.replace(/[\r\n\t]+/gu, " ").replace(/ {2,}/gu, " ").trim();
}

/** Builds the immutable grant receipt for an explicit follow-by-phone tick. */
export function followByPhonePermissionReceipt(params: {
  organizerId: string;
  uid: string;
  endpointE164: string;
  requestId: string;
  supersedesReceiptId: string | null;
  now: FirebaseFirestore.Timestamp;
}): {id: string; document: Receipt} {
  const consentCopyHash = followerWhatsappConsentCopyHash(
    followerWhatsappTermsVersion)!;
  const id = `ocpr_${sha256([params.organizerId, params.uid, "whatsapp",
    "optedIn", "organizerFollowByPhone", followerWhatsappPurpose,
    params.endpointE164, params.requestId].join("|")).slice(0, 48)}`;
  return {id, document: {
    organizerId: params.organizerId,
    uid: params.uid,
    channel: "whatsapp",
    purpose: followerWhatsappPurpose,
    endpointE164: params.endpointE164,
    decision: "optedIn",
    evidenceStatus: "complete",
    termsVersion: followerWhatsappTermsVersion,
    consentCopyHash,
    source: "organizerFollowByPhone",
    sourceEventId: null,
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
  }};
}

/** The current-preference projection that references a grant receipt. */
export function followerWhatsappGrant(params: {
  receiptId: string;
  endpointE164: string;
  now: FirebaseFirestore.Timestamp;
}): ChannelPreference {
  return {
    status: "optedIn",
    evidenceStatus: "complete",
    currentReceiptId: params.receiptId,
    endpointE164: params.endpointE164,
    termsVersion: followerWhatsappTermsVersion,
    source: "organizerFollowByPhone",
    sourceEventId: null,
    updatedAt: params.now,
  };
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
