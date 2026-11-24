import * as crypto from "node:crypto";
import type {
  OrganizerCampaignDocument,
  OrganizerCampaignRecipientDocument,
} from "../shared/generated/firestoreAdminTypes";

export const organizerCampaignAudienceLimit = 100;
export const organizerCampaignFrequencyCapMillis = 7 * 24 * 60 * 60 * 1000;

export type CampaignAudienceCounts =
  OrganizerCampaignDocument["audienceCounts"];
export type CampaignDeliveryCounts =
  OrganizerCampaignDocument["deliveryCounts"];
export type CampaignRecipientStatus =
  OrganizerCampaignRecipientDocument["status"];

/** Stable, opaque campaign id for idempotent create retries. */
export function organizerCampaignId(
  organizerId: string,
  actorUid: string,
  requestId: string
): string {
  return `ocamp_${sha256(`${organizerId}|${actorUid}|${requestId}`)
    .slice(0, 48)}`;
}

/** One frozen recipient row per campaign/contact pair. */
export function organizerCampaignRecipientId(
  campaignId: string,
  contactId: string
): string {
  return `ocrec_${sha256(`${campaignId}|${contactId}`).slice(0, 48)}`;
}

/** One organizer-owned WhatsApp sender per connected phone number. */
export function organizerSenderConnectionId(
  organizerId: string,
  phoneNumberId: string
): string {
  return `osc_${sha256(`${organizerId}|whatsapp|${phoneNumberId}`)
    .slice(0, 48)}`;
}

/** Stable sanitized provider-template id. */
export function organizerMessageTemplateId(
  connectionId: string,
  providerTemplateId: string,
  language: string
): string {
  return `omtpl_${sha256(
    `${connectionId}|${providerTemplateId}|${language}`
  ).slice(0, 48)}`;
}

/** Organizer/contact endpoint suppression record id. */
export function organizerContactChannelStateId(
  organizerId: string,
  contactId: string
): string {
  return `occs_${sha256(`${organizerId}|${contactId}|whatsapp`)
    .slice(0, 48)}`;
}

export function hashCanonical(value: unknown): string {
  return sha256(JSON.stringify(canonicalize(value)));
}

export function emptyCampaignAudienceCounts(): CampaignAudienceCounts {
  return {
    total: 0,
    reachable: 0,
    optedOut: 0,
    invalid: 0,
    duplicate: 0,
    unsupported: 0,
    frequencyCapped: 0,
    providerBlocked: 0,
    unknown: 0,
  };
}

export function emptyCampaignDeliveryCounts(): CampaignDeliveryCounts {
  return {
    pending: 0,
    suppressed: 0,
    accepted: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    replied: 0,
    optedOut: 0,
  };
}

/**
 * Delivery receipts are monotonic. Replies and opt-outs are independent
 * terminal outcomes and therefore never get overwritten by late status hooks.
 */
export function nextCampaignRecipientStatus(
  current: CampaignRecipientStatus,
  proposed: CampaignRecipientStatus
): CampaignRecipientStatus {
  if (current === "optedOut" || current === "replied") return current;
  if (proposed === "optedOut" || proposed === "replied") return proposed;
  if (current === "failed" && proposed !== "failed") return current;
  const rank: Record<CampaignRecipientStatus, number> = {
    pending: 0,
    sending: 1,
    suppressed: 2,
    accepted: 3,
    sent: 4,
    delivered: 5,
    read: 6,
    failed: 7,
    replied: 8,
    optedOut: 9,
  };
  return rank[proposed] > rank[current] ? proposed : current;
}

/** Strict English commands recommended by WhatsApp for unambiguous opt-out. */
export function isWhatsappStopCommand(value: string): boolean {
  return new Set(["stop", "unsubscribe", "end", "quit", "cancel"])
    .has(value.trim().toLocaleLowerCase("en"));
}

export function verifyMetaWebhookSignature(params: {
  rawBody: Buffer;
  signatureHeader: string | undefined;
  appSecret: string;
}): boolean {
  if (!/^sha256=[a-f0-9]{64}$/.test(params.signatureHeader ?? "") ||
      params.appSecret.length === 0) return false;
  const expected = `sha256=${crypto.createHmac("sha256", params.appSecret)
    .update(params.rawBody).digest("hex")}`;
  const actual = params.signatureHeader!;
  return actual.length === expected.length && crypto.timingSafeEqual(
    Buffer.from(actual), Buffer.from(expected)
  );
}

export function classifyMetaError(code: number | null):
OrganizerCampaignRecipientDocument["providerErrorCategory"] {
  if (code === null) return "unknown";
  if ([0, 190].includes(code)) return "authentication";
  if ([131026, 131047].includes(code)) return "invalidRecipient";
  if ([131048, 131049].includes(code)) return "quality";
  if ([130429, 80007].includes(code)) return "rateLimit";
  if (code >= 132000 && code < 133000) return "template";
  if (code >= 200 && code < 300) return "policy";
  return "provider";
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => [key, canonicalize(child)]));
}

function sha256(value: crypto.BinaryLike): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}
