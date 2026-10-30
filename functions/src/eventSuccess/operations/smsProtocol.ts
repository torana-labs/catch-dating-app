import type {EventAssistanceSmsConfig as SmsConfig} from
  "../../shared/generated/eventAssistanceSmsConfig";
import {validateEventAssistanceSmsConfig} from
  "../../shared/generated/validators/eventAssistanceSmsConfig";
import {operationContentHash} from "../../operations/durableActions";
import type {MessageRecord} from "./messageOutbox";
import {parseMessageIntent} from "./messageProtocol";
import {Grant, guestIdentity, parseGrant, threadIdentity} from "./guestRecords";
import {grantSecret, GuestLinkSigningKeys, matchesGuestSecret} from
  "./guestLinkTokens";
import {sameMessageContext} from "./messagingPolicy";
import {brandWebUrl} from "../../shared/generated/brand";

export type {SmsConfig};
export type SmsTemplate = SmsConfig["templates"][number];
export interface RenderedSms {
  text: string;
  encoding: "gsm7" | "unicode";
  segments: number;
  units: number;
  maxCostMicros: number;
  template: SmsTemplate;
  payloadHash: string;
  validUntil: number;
}

export function smsEndpointId(context: Grant["context"],
  attendeeId: string, phone: string): string {
  return "sms-endpoint:" + operationContentHash([
    guestIdentity(context, attendeeId), phone,
  ]);
}

export function parseSmsConfig(value: unknown): SmsConfig {
  if (!validateEventAssistanceSmsConfig(value) ||
      value.activation.validUntil <= value.activation.approvedAt) {
    throw new Error("Invalid SMS sender configuration");
  }
  const ids = new Set<string>();
  const purposes = new Set<string>();
  for (const template of value.templates) {
    if (ids.has(template.templateId)) throw new Error("Duplicate SMS template");
    ids.add(template.templateId);
    if (template.status !== "approved") continue;
    if (purposes.has(template.purpose)) {
      throw new Error("Ambiguous approved SMS template");
    }
    purposes.add(template.purpose);
    for (const name of ["instruction", "responseUrl"]) {
      if (template.parts.filter((p) =>
        p.kind === "variable" && p.name === name).length !== 1) {
        throw new Error("SMS template must include instruction and response");
      }
    }
  }
  return value;
}

// GSM default alphabet excludes ESC; extension characters use two septets.
const gsmDefault = new Set(Array.from(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./" +
  "0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§" +
  "¿abcdefghijklmnopqrstuvwxyzäöñüà"
));
const gsmExtension = new Set(Array.from("\f^{}\\[~]|€"));

/** Counts segment packing without splitting an extension or surrogate pair. */
export function smsSegments(text: string): {
  encoding: RenderedSms["encoding"]; units: number; segments: number;
} {
  if (!text || text.length > 20_000 || Array.from(text).some((p) =>
    p.length === 1 && p.charCodeAt(0) >= 0xd800 &&
      p.charCodeAt(0) <= 0xdfff)) {
    throw new Error("Invalid SMS content");
  }
  const points = Array.from(text);
  const gsm = points.every((p) => gsmDefault.has(p) || gsmExtension.has(p));
  const widths = points.map((p) => gsm ? (gsmExtension.has(p) ? 2 : 1) :
    p.length);
  const units = widths.reduce((a, b) => a + b, 0);
  if (units <= (gsm ? 160 : 70)) {
    return {encoding: gsm ? "gsm7" : "unicode", units, segments: 1};
  }
  const limit = gsm ? 153 : 67;
  let segments = 1;
  let used = 0;
  for (const width of widths) {
    if (used + width > limit) {
      segments++; used = 0;
    }
    used += width;
  }
  return {encoding: gsm ? "gsm7" : "unicode", units, segments};
}

/** Templates are exact approved parts; never rewrite or truncate to fit. */
export function renderEventSms(input: {
  config: SmsConfig; intent: MessageRecord["intent"]; grant: Grant;
  keys: GuestLinkSigningKeys; eventTitle: string; now: number;
}): RenderedSms {
  const {config, intent, grant, keys, eventTitle, now} = input;
  parseSmsConfig(config);
  parseMessageIntent(intent);
  parseGrant(grant);
  if (!Number.isSafeInteger(now) || now < intent.createdAt ||
      config.status !== "ready" || config.activation.approvedAt > now ||
      now >= config.activation.validUntil || now >= config.quote.validUntil ||
      now >= intent.expiresAt || grant.issuedAt > now ||
      now >= grant.expiresAt || grant.revokedAt !== null ||
      !sameMessageContext(grant.context, intent.context) ||
      grant.attendeeId !== intent.attendeeId ||
      grant.episodeId !== intent.episodeId ||
      grant.threadId !== threadIdentity(intent)) {
    throw new Error("SMS authority or guest link is unavailable");
  }
  const purpose = intent.kind === "joiningUpdate" ?
    "joiningUpdate" : intent.noticeKind;
  const template = config.templates.find((t) =>
    t.purpose === purpose && t.status === "approved");
  if (!template) throw new Error("Approved SMS template unavailable");
  const secret = grantSecret(grant, keys);
  if (!matchesGuestSecret(grant, secret)) {
    throw new Error("SMS guest link key mismatch");
  }
  const variables = {
    eventTitle,
    instruction: intent.kind === "joiningUpdate" ?
      intent.guidance.text : intent.body,
    responseUrl: brandWebUrl("/event-update/") + grant.linkId +
      "#" + secret,
  };
  const text = template.parts.map((part) => {
    if (part.kind === "literal") return part.text;
    const value = variables[part.name];
    // UTF-16 length is conservative for provider variable limits.
    if (!value || value.length > part.maxCharacters) {
      throw new Error("SMS variable exceeds its approved template slot");
    }
    return value;
  }).join("");
  const length = smsSegments(text);
  if (length.segments > config.maxSegments) {
    throw new Error("SMS exceeds the approved segment ceiling");
  }
  return {text, ...length, template,
    maxCostMicros: length.segments * config.quote.maxMicrosPerSegment,
    payloadHash: operationContentHash([config.senderId, config.revision,
      template.templateId, template.revision, text, length.encoding]),
    validUntil: Math.min(intent.expiresAt, grant.expiresAt,
      config.activation.validUntil, config.quote.validUntil)};
}
