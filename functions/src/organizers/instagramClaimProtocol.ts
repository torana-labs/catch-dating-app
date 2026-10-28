import {createHash, timingSafeEqual} from "node:crypto";
import {verifyCatchWebhookSignature} from
  "../catchMessaging/whatsappWebhookProtocol";

export const MAX_INSTAGRAM_WEBHOOK_BYTES = 1024 * 1024;
export const MAX_INSTAGRAM_WEBHOOK_MESSAGES = 100;

/** Any missing value keeps the receiver inert. */
export interface InstagramClaimWebhookConfig {
  /** Catch's Instagram professional account id. */
  accountId: string;
  appSecret: string;
  verifyToken: string;
}
export interface InstagramClaimWebhookRequest {
  method: string;
  query: Record<string, unknown>;
  rawBody?: Buffer;
  signature?: string;
}
export interface InstagramClaimWebhookResponse {status: number; body: string}

/** A direct message someone sent to Catch's Instagram account. */
export interface InstagramInboundMessage {
  /** SHA-256 of Instagram's message id; the idempotency key. */
  messageKey: string;
  /** Instagram-scoped id of the sender. */
  senderId: string;
  text: string | null;
}

export async function handleInstagramClaimWebhook(
  request: InstagramClaimWebhookRequest,
  config: InstagramClaimWebhookConfig,
  handleMessages: (messages: InstagramInboundMessage[]) => Promise<void>
): Promise<InstagramClaimWebhookResponse> {
  if (request.method !== "GET" && request.method !== "POST") {
    return {status: 405, body: "Method not allowed."};
  }
  if (!/^[0-9]{1,32}$/.test(config.accountId) || !config.appSecret ||
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
  if (request.rawBody.length > MAX_INSTAGRAM_WEBHOOK_BYTES) {
    return {status: 413, body: "Webhook too large."};
  }
  if (!verifyCatchWebhookSignature(request.rawBody, request.signature,
    config.appSecret)) return {status: 401, body: "Invalid signature."};
  let messages: InstagramInboundMessage[];
  try {
    messages = parseInstagramWebhook(request.rawBody, config.accountId);
  } catch {
    return {status: 400, body: "Invalid webhook."};
  }
  try {
    await handleMessages(messages);
    return {status: 200, body: "ok"};
  } catch {
    // Meta retries a failed delivery; receipts make the retry safe.
    return {status: 503, body: "Webhook processing unavailable."};
  }
}

/**
 * Inbound direct messages to Catch's account, in delivery order. Echoes of
 * Catch's own replies, reactions, reads and other accounts' entries are not
 * claim messages and are skipped.
 */
export function parseInstagramWebhook(
  rawBody: Buffer,
  accountId: string
): InstagramInboundMessage[] {
  const root = record(JSON.parse(rawBody.toString("utf8")));
  if (root.object !== "instagram") throw new Error("Not an Instagram webhook.");
  const messages: InstagramInboundMessage[] = [];
  for (const rawEntry of list(root.entry)) {
    const entry = record(rawEntry);
    if (String(entry.id) !== accountId) continue;
    const events = [
      ...list(entry.messaging ?? []),
      // Meta's dashboard test sends the same event inside changes[].
      ...list(entry.changes ?? []).map(record)
        .filter((change) => change.field === "messages")
        .map((change) => change.value),
    ];
    for (const rawEvent of events) {
      const event = record(rawEvent);
      if (event.message === undefined) continue;
      const message = record(event.message);
      if (message.is_echo === true || message.is_deleted === true ||
          message.is_unsupported === true) continue;
      const senderId = String(record(event.sender).id ?? "");
      if (!/^[0-9]{1,32}$/.test(senderId) || senderId === accountId) continue;
      if (typeof message.mid !== "string" || !message.mid ||
          message.mid.length > 512) {
        throw new Error("Invalid message id.");
      }
      messages.push({
        messageKey: createHash("sha256").update(message.mid).digest("hex"),
        senderId,
        text: typeof message.text === "string" ?
          message.text.slice(0, 2000) : null,
      });
      if (messages.length > MAX_INSTAGRAM_WEBHOOK_MESSAGES) {
        throw new Error("Too many messages.");
      }
    }
  }
  return messages;
}

/**
 * The six-digit claim code in a message, allowing the "482 173" grouping the
 * claim page shows. Messages without one are ordinary inbox traffic.
 */
export function extractClaimCode(text: string | null): string | null {
  const match = /(?<![0-9])([0-9]{3})[ -]?([0-9]{3})(?![0-9])/.exec(
    text ?? "");
  return match ? `${match[1]}${match[2]}` : null;
}

function equalSecret(actual: unknown, expected: string): boolean {
  if (typeof actual !== "string" || !expected || actual.length > 1024) {
    return false;
  }
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes);
}

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
