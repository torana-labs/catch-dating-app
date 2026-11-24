import {createHash} from "node:crypto";
import type {CatchWhatsappWebhookEventDocument} from
  "../shared/generated/catchWhatsappWebhookEventDocument";
import {catchInboundPlaceholder} from "./whatsappInboundContent";
import {equalSecret, verifyCatchWebhookSignature} from
  "../platform/delivery/webhookSignature";

export const MAX_WEBHOOK_BYTES = 3 * 1024 * 1024;
export const MAX_WEBHOOK_EVENTS = 1000;
export const WEBHOOK_RETENTION_MILLIS = 30 * 24 * 60 * 60 * 1000;
export type CatchWebhookEvent = Pick<CatchWhatsappWebhookEventDocument,
  "schema" | "eventId" | "wabaId" | "phoneNumberId" | "payloadHash" |
  "eventKind" | "messageId" | "providerTimestampSeconds" | "participantId" |
  "messageType" | "text" | "textTruncated" | "deliveryStatus" | "errorCodes">;
/** Credentials activate the receiver; any missing value keeps it inert. */
export interface CatchWebhookConfig {
  wabaId: string;
  phoneNumberId: string;
  appSecret: string;
  verifyToken: string;
}
export interface CatchWebhookRequest {
  method: string;
  query: Record<string, unknown>;
  rawBody?: Buffer;
  signature?: string;
}
export interface CatchWebhookResponse {status: number; body: string}

export async function handleCatchWhatsappWebhook(request: CatchWebhookRequest,
  config: CatchWebhookConfig,
  persist: (events: CatchWebhookEvent[]) => Promise<unknown>
): Promise<CatchWebhookResponse> {
  if (request.method !== "GET" && request.method !== "POST") {
    return {status: 405, body: "Method not allowed."};
  }
  if (!/^[0-9]{1,32}$/.test(config.wabaId) ||
      !/^[0-9]{1,32}$/.test(config.phoneNumberId) || !config.appSecret ||
      config.verifyToken.length < 32) {
    return {status: 503, body: "Webhook not configured."};
  }
  if (request.method === "GET") {
    const challenge = request.query["hub.challenge"];
    if (request.query["hub.mode"] === "subscribe" &&
        equalSecret(request.query["hub.verify_token"], config.verifyToken) &&
        typeof challenge === "string" && challenge.length > 0 &&
        challenge.length <= 1024) {
      return {status: 200, body: challenge};
    }
    return {status: 403, body: "Forbidden."};
  }
  if (!request.rawBody) return {status: 400, body: "Missing webhook body."};
  if (request.rawBody.length > MAX_WEBHOOK_BYTES) {
    return {status: 413, body: "Webhook too large."};
  }
  if (!verifyCatchWebhookSignature(request.rawBody, request.signature,
    config.appSecret)) return {status: 401, body: "Invalid signature."};
  let events: CatchWebhookEvent[];
  try {
    events = parseCatchWhatsappWebhook(request.rawBody, config);
  } catch (error) {
    // A scope refusal names which configured id did not match, so the log
    // can tell a foreign account from a foreign phone number.
    return error instanceof ScopeError ?
      {status: 403, body: error.message} :
      {status: 400, body: "Invalid webhook."};
  }
  try {
    await persist(events);
    return {status: 200, body: "ok"};
  } catch {
    // Meta must retry a failed write. Never log message content or secrets.
    return {status: 503, body: "Webhook storage unavailable."};
  }
}

class ScopeError extends Error {}
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected an object.");
  }
  return value as Record<string, unknown>;
}
function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("Expected an array.");
  return value;
}
function identity(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 240) {
    throw new Error("Invalid provider identity.");
  }
  return value;
}
function timestamp(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9]{1,12}$/.test(value) ||
      Number(value) <= 0) throw new Error("Invalid timestamp.");
  return value;
}
function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function parseCatchWhatsappWebhook(rawBody: Buffer,
  config: Pick<CatchWebhookConfig, "wabaId" | "phoneNumberId">
): CatchWebhookEvent[] {
  const root = record(JSON.parse(rawBody.toString("utf8")));
  if (root.object !== "whatsapp_business_account") {
    throw new Error("Invalid webhook object.");
  }
  const events: CatchWebhookEvent[] = [];
  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  for (const rawEntry of list(root.entry)) {
    const entry = record(rawEntry);
    if (entry.id !== config.wabaId) throw new ScopeError("Foreign account.");
    for (const rawChange of list(entry.changes)) {
      const change = record(rawChange);
      // Subscribe only to messages. Ignore other same-account fields safely.
      if (change.field !== "messages") continue;
      const value = record(change.value);
      if (value.messaging_product !== "whatsapp" ||
          record(value.metadata).phone_number_id !== config.phoneNumberId) {
        throw new ScopeError("Foreign sender.");
      }
      const base = {schema: "catch.whatsapp-webhook-event/v1" as const,
        wabaId: config.wabaId, phoneNumberId: config.phoneNumberId,
        payloadHash};
      for (const rawMessage of list(value.messages ?? [])) {
        const message = record(rawMessage);
        const messageId = identity(message.id);
        const messageType = identity(message.type);
        const providerTimestampSeconds = timestamp(message.timestamp);
        const originalText = messageType === "text" ?
          record(message.text).body : null;
        if (originalText !== null && typeof originalText !== "string") {
          throw new Error("Invalid message text.");
        }
        // Any other type keeps a short placeholder for Support ("[photo]",
        // a button's label); the media itself is never fetched.
        const placeholder = messageType === "text" ? null :
          catchInboundPlaceholder(messageType, message);
        events.push({...base, eventId: "cwhe_" + hash(JSON.stringify([
          config.wabaId, config.phoneNumberId, "inbound", messageId])),
        eventKind: "inbound", messageId, providerTimestampSeconds,
        participantId: identity(message.from), messageType,
        text: originalText?.slice(0, 4096) ?? placeholder,
        textTruncated: (originalText?.length ?? 0) > 4096,
        deliveryStatus: null, errorCodes: []});
      }
      for (const rawStatus of list(value.statuses ?? [])) {
        const status = record(rawStatus);
        const messageId = identity(status.id);
        const providerTimestampSeconds = timestamp(status.timestamp);
        const deliveryStatus = status.status;
        if (deliveryStatus !== "sent" && deliveryStatus !== "delivered" &&
            deliveryStatus !== "read" && deliveryStatus !== "failed") {
          throw new Error("Invalid delivery status.");
        }
        const errorCodes = list(status.errors ?? []).map((rawError) => {
          const code = record(rawError).code;
          if (typeof code !== "number" || !Number.isSafeInteger(code) ||
              code < 0 || code > 999999999) throw new Error("Invalid error.");
          return code;
        });
        if (errorCodes.length > 10) throw new Error("Too many errors.");
        events.push({...base, eventId: "cwhe_" + hash(JSON.stringify([
          config.wabaId, config.phoneNumberId, "status", messageId,
          deliveryStatus, providerTimestampSeconds,
          [...errorCodes].sort((a, b) => a - b)])),
        eventKind: "status", messageId, providerTimestampSeconds,
        participantId: identity(status.recipient_id), messageType: null,
        text: null, textTruncated: false, deliveryStatus, errorCodes});
      }
      if (events.length > MAX_WEBHOOK_EVENTS) {
        throw new Error("Too many webhook events.");
      }
    }
  }
  return events;
}
