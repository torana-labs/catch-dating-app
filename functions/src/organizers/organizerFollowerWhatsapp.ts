import {createHash} from "node:crypto";
import type {
  OrganizerMessageTemplateDocument,
  OrganizerSenderConnectionDocument,
} from "../shared/generated/firestoreAdminTypes";
import {organizerFollowerWhatsappRoute} from
  "../platform/delivery/communicationRoutes";
import {
  contactPermissionStatus,
  type ContactGrant,
  type ContactPermission,
  type ContactPermissionReceipt,
} from "../shared/contactPermissions";

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

/**
 * What each organiser submits for approval on their own WhatsApp Business
 * account (runbook, not code: Catch only syncs it). Meta classes updates
 * that announce new plans as marketing. The single named body variable
 * carries the organiser's text after the outbound content policy; any
 * variable name works as long as the template has exactly one.
 */
export const organizerFollowerUpdateTemplateSpec = {
  name: organizerFollowerUpdateTemplateName,
  category: "MARKETING",
  language: "en",
  parameterFormat: "NAMED",
  body: "New from us:\n\n{{update_text}}\n\nReply STOP to stop these updates.",
  exampleUpdateText:
    "Sunday 7am run from Cubbon Park is open. Book on our page.",
} as const;

/** Reviewed consent copy for the follow-by-phone WhatsApp tick. */
export const followerWhatsappTermsVersion = "follower-whatsapp-v1";
const followerWhatsappConsentCopy = {
  [followerWhatsappTermsVersion]:
    "Send me this organiser\u2019s updates on WhatsApp. Reply STOP to stop.",
} as const;


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
 * The purpose gate, over the follower's contact permission for this
 * organizer. A withdrawal (settings, STOP) wins; a STOP recorded on the
 * endpoint at or after the grant also wins; the grant counts only while it
 * is effective (complete evidence, the reviewed copy) and bound to the same
 * phone the message would go to.
 */
export function effectiveFollowerWhatsappStatus(
  permission: Pick<ContactPermission, "grants" | "granted"> | null |
    undefined,
  endpointE164: string | null | undefined,
  stoppedAtMillis: number | null = null,
): "unknown" | "optedIn" | "optedOut" {
  const grant = permission?.grants["whatsapp:followerUpdates"];
  if (grant?.status === "optedOut") return "optedOut";
  if (grant && stoppedAtMillis !== null &&
      stoppedAtMillis >= grant.updatedAt.toMillis()) return "optedOut";
  return contactPermissionStatus(permission, "whatsapp:followerUpdates",
    endpointE164);
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
  permission: Pick<ContactPermission, "grants" | "granted"> | null |
    undefined;
  stoppedAtMillis: number | null;
  senderReady: boolean;
}): {
  routeId: typeof followerWhatsappRouteId;
  availability: "available" | "unavailable";
  blocker: FollowerWhatsappBlocker | null;
} {
  const status = effectiveFollowerWhatsappStatus(facts.permission,
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
}): {id: string; document: ContactPermissionReceipt} {
  const consentCopyHash = followerWhatsappConsentCopyHash(
    followerWhatsappTermsVersion)!;
  const id = `ocpr_${sha256([params.organizerId, params.uid, "whatsapp",
    "optedIn", "organizerFollowByPhone", followerWhatsappPurpose,
    params.endpointE164, params.requestId].join("|")).slice(0, 48)}`;
  return {id, document: {
    senderKind: "organizer",
    senderId: params.organizerId,
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

/** The followerUpdates grant that references a grant receipt. */
export function followerWhatsappGrant(params: {
  receiptId: string;
  endpointE164: string;
  now: FirebaseFirestore.Timestamp;
}): ContactGrant {
  return {
    status: "optedIn",
    endpointE164: params.endpointE164,
    receiptId: params.receiptId,
    termsVersion: followerWhatsappTermsVersion,
    source: "organizerFollowByPhone",
    updatedAt: params.now,
  };
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
