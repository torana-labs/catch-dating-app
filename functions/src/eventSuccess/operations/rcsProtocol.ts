import {createHash} from "node:crypto";
import type {EventAssistanceRcsConfig as RcsConfig} from
  "../../shared/generated/eventAssistanceRcsConfig";
import {validateEventAssistanceRcsConfig} from
  "../../shared/generated/validators/eventAssistanceRcsConfig";
import {operationContentHash} from "../../operations/durableActions";
import type {MessageRecord} from "./messageOutbox";
import {parseMessageIntent} from "./messageProtocol";
import {Grant, guestIdentity, parseGrant, threadIdentity} from "./guestRecords";
import {grantSecret, GuestLinkSigningKeys, matchesGuestSecret} from
  "./guestLinkTokens";
import {sameMessageContext} from "./messagingPolicy";
import {GoogleRbmSuggestion, rbmSendBody, rbmTime} from "./googleRbmProtocol";
import {rcsNativeReplyId} from "./rcsWebhookProtocol";
import {brandWebUrl} from "../../shared/generated/brand";

export type {RcsConfig};
export interface RcsContentInput {
  config: RcsConfig;
  intent: MessageRecord["intent"];
  grant: Grant;
  keys: GuestLinkSigningKeys;
  eventTitle: string;
  supportsOpenUrl: boolean;
  now: number;
}
export interface PreparedRcsContent {
  text: string;
  choices: ReadonlyArray<Readonly<{index: number; label: string}>>;
  responseUrl: string;
  supportsOpenUrl: boolean;
  maxCostMicros: number;
  validUntil: number;
  intentHash: string;
  /** Stable across reservation/claim, independent of clock and attempt. */
  authorityHash: string;
}
export interface RenderedRcs {
  contentMessage: {text: string; suggestions: GoogleRbmSuggestion[]};
  messageTrafficType: "TRANSACTION";
  providerMessageId: string;
  expiresAt: number;
  preparedAt: number;
  validUntil: number;
  maxCostMicros: number;
  intentHash: string;
  authorityHash: string;
  payloadHash: string;
}

/** Reviewed configuration cannot grant consent, a spending debit or a send. */
export function parseRcsConfig(value: unknown): RcsConfig {
  if (!validateEventAssistanceRcsConfig(value) ||
      !value.displayName.trim() ||
      Buffer.from(value.displayName, "utf8").toString("utf8") !==
        value.displayName ||
      value.activation.validUntil <= value.activation.approvedAt ||
      value.quote.validUntil <= value.activation.approvedAt ||
      [value.senderId, value.agentId, value.credentialVersion,
        value.activation.approvalId, value.quote.currency,
        ...value.recipientPrefixes].some((s) => /\s/.test(s))) {
    throw new Error("Invalid RCS sender configuration");
  }
  return value;
}

export function rcsEndpointId(context: Grant["context"], attendeeId: string,
  phone: string): string {
  if (!rcsPhoneHash(phone)) {
    throw new Error("Invalid RCS recipient");
  }
  return "rcs-endpoint:" + operationContentHash([
    guestIdentity(context, attendeeId), phone,
  ]);
}

export function rcsPhoneHash(phone: unknown): string | null {
  return typeof phone === "string" && /^\+[1-9][0-9]{7,14}$/.test(phone) &&
    !/\s/.test(phone) ? createHash("sha256").update(phone).digest("hex") : null;
}

/** RFC 4122 UUIDv5 in the DNS namespace, derived from an outbox attempt. */
export function rcsMessageId(attemptId: string): string {
  if (!/^attempt:[a-f0-9]{64}$/.test(attemptId) || attemptId.length !== 72) {
    throw new Error("Invalid RCS attempt identity");
  }
  const bytes = createHash("sha1")
    .update(Buffer.from("6ba7b8109dad11d180b400c04fd430c8", "hex"))
    .update("catch.app/event-assistance/rcs/" + attemptId)
    .digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16),
    hex.slice(16, 20), hex.slice(20)].join("-");
}

function validText(text: string): boolean {
  return !!text.trim() && Buffer.from(text, "utf8").toString("utf8") === text;
}

/** Preflight content before route selection; never creates a send permit. */
export function prepareEventRcs(input: RcsContentInput): PreparedRcsContent {
  const {config, intent, grant, keys, eventTitle, supportsOpenUrl, now} = input;
  parseRcsConfig(config);
  parseMessageIntent(intent);
  parseGrant(grant);
  const purpose = intent.kind === "joiningUpdate" ?
    "joiningUpdate" : intent.noticeKind;
  if (!rbmTime(now) || now < intent.createdAt ||
      typeof eventTitle !== "string" || !validText(eventTitle) ||
      eventTitle.length > 200 || typeof supportsOpenUrl !== "boolean" ||
      intent.context.mode !== "live" || config.status !== "ready" ||
      config.activation.approvedAt > now ||
      now >= config.activation.validUntil || now >= config.quote.validUntil ||
      now >= intent.expiresAt || !config.allowedPurposes.includes(purpose) ||
      !intent.permittedRoutes.includes("catchEventRcs") ||
      grant.issuedAt > now || now >= grant.expiresAt ||
      grant.revokedAt !== null ||
      !sameMessageContext(grant.context, intent.context) ||
      grant.attendeeId !== intent.attendeeId ||
      grant.episodeId !== intent.episodeId ||
      grant.threadId !== threadIdentity(intent)) {
    throw new Error("RCS material or guest authority unavailable");
  }
  const secret = grantSecret(grant, keys);
  if (!matchesGuestSecret(grant, secret)) {
    throw new Error("RCS guest link key mismatch");
  }
  const responseUrl = brandWebUrl("/event-update/") + grant.linkId +
    "#" + secret;
  const instruction = intent.kind === "joiningUpdate" ?
    intent.guidance.text : intent.title + "\n" + intent.body;
  const text = eventTitle + "\n\n" + instruction +
    (supportsOpenUrl ? "" : "\n\n" + responseUrl);
  if (text.length > 3072 || !validText(text) || !validText(instruction) ||
      (intent.kind === "operationalNotice" &&
        (!validText(intent.title) || !validText(intent.body))) ||
      intent.choices.some((choice) => !validText(choice.label))) {
    throw new Error("RCS content exceeds the supported text boundary");
  }
  // Keep original indices when a label needs the full guest page. Truncating
  // labels or renumbering shortcuts could change the meaning of a reply.
  const choices = intent.choices.flatMap((choice, index) =>
    index < 10 && choice.label.length <= 25 ?
      [Object.freeze({index, label: choice.label})] : []);
  const validUntil = Math.min(intent.expiresAt, grant.expiresAt,
    config.activation.validUntil, config.quote.validUntil);
  if (!rbmTime(validUntil)) throw new Error("Invalid RCS expiry");
  return Object.freeze({text, choices: Object.freeze(choices), responseUrl,
    supportsOpenUrl, validUntil,
    maxCostMicros: config.quote.maxMicrosPerMessage,
    intentHash: operationContentHash(intent),
    authorityHash: operationContentHash([
      config, intent, grant, eventTitle, supportsOpenUrl,
    ])});
}

/** Freeze content and expiry at claim time; retain them for transport retry. */
export function renderEventRcs(input: RcsContentInput & {attemptId: string;
  expiresBy?: number}):
  RenderedRcs {
  const prepared = prepareEventRcs(input);
  const {attemptId, now, config} = input;
  const providerMessageId = rcsMessageId(attemptId);
  const suggestions: GoogleRbmSuggestion[] = prepared.choices.map((choice) =>
    ({reply: {text: choice.label,
      postbackData: rcsNativeReplyId(attemptId, choice.index)}}));
  if (prepared.supportsOpenUrl) {
    suggestions.push({action: {text: "Event details", postbackData:
      "ce-rcs-web1." + attemptId.slice(8),
    openUrlAction: {url: prepared.responseUrl}}});
  }
  if (input.expiresBy !== undefined &&
      (!rbmTime(input.expiresBy) || input.expiresBy <= now)) {
    throw new Error("Invalid RCS delivery deadline");
  }
  const expiresAt = Math.min(prepared.validUntil,
    input.expiresBy ?? prepared.validUntil,
    now + config.maxQueueSeconds * 1000);
  const contentMessage = {text: prepared.text, suggestions};
  const body = rbmSendBody({messageId: providerMessageId, contentMessage,
    expiresAt}, now);
  if (body === null) throw new Error("Unsupported RCS provider content");
  for (const item of suggestions) {
    if ("reply" in item) Object.freeze(item.reply);
    else {
      Object.freeze(item.action.openUrlAction);
      Object.freeze(item.action);
    }
    Object.freeze(item);
  }
  Object.freeze(suggestions);
  Object.freeze(contentMessage);
  return Object.freeze({contentMessage, messageTrafficType: "TRANSACTION",
    providerMessageId, expiresAt, preparedAt: now, validUntil: expiresAt,
    maxCostMicros: prepared.maxCostMicros, intentHash: prepared.intentHash,
    authorityHash: prepared.authorityHash,
    payloadHash: createHash("sha256").update(body).digest("hex")});
}
