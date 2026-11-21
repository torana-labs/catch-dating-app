import {createHash} from "node:crypto";
import {isWhatsappStopCommand} from "../organizers/organizerCampaignModel";
import type {CatchWebhookEvent} from "./whatsappWebhookProtocol";

export type CatchIngressClassification = "text" | "stop" | "status" |
  "ambiguous";
export type CatchIngressAmbiguity = "unresolved-endpoint" | "truncated-text" |
  "unsupported-message" | "missing-text" | "invalid-status-errors";

/**
 * Body-free evidence of the normalized fields actually available. A hash is
 * not an authenticity proof, archive, consent receipt or historical clearance.
 * No persistence/retention contract or capture-completeness claim is defined.
 */
export interface CatchIngressEvidence {
  eventId: string;
  materialSha256: string;
  eventKind: "inbound" | "status";
  classification: CatchIngressClassification;
  ambiguity: CatchIngressAmbiguity | null;
}
export type CatchIngressReplayDecision = "distinct" | "conflict" |
  "ambiguous" | "equivalent";

const sha = (value: unknown): string => createHash("sha256")
  .update(JSON.stringify(value)).digest("hex");
const boundedIdentity = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 240;
function unavailable(): never {
  throw new Error("Catch ingress evidence unavailable.");
}

/**
 * Call only after signature and exact configured sender verification. This
 * validates normalized receipt shape/identity, not authenticity. Whole-envelope
 * payloadHash is intentionally excluded from semantic equality: rebatched
 * callbacks can contain the same event in different authenticated envelopes.
 * Received-at and expiry fields are also not provider event material.
 *
 * Unknown/truncated material stays ambiguous even when its retained prefix
 * hashes identically. It must never be used to acknowledge equivalence of the
 * lost original content, establish STOP absence or clear a suppression.
 */
export function deriveCatchIngressEvidence(
  event: CatchWebhookEvent
): CatchIngressEvidence {
  if (!event || event.schema !== "catch.whatsapp-webhook-event/v1" ||
      typeof event.wabaId !== "string" ||
      !/^[0-9]{1,32}$/u.test(event.wabaId) ||
      typeof event.phoneNumberId !== "string" ||
      !/^[0-9]{1,32}$/u.test(event.phoneNumberId) ||
      !boundedIdentity(event.messageId) ||
      !boundedIdentity(event.participantId) ||
      typeof event.providerTimestampSeconds !== "string" ||
      !/^[0-9]{1,12}$/u.test(event.providerTimestampSeconds) ||
      Number(event.providerTimestampSeconds) <= 0 ||
      typeof event.payloadHash !== "string" ||
      !/^[a-f0-9]{64}$/u.test(event.payloadHash) ||
      typeof event.textTruncated !== "boolean" ||
      (event.text !== null && (typeof event.text !== "string" ||
        event.text.length > 4096)) || !Array.isArray(event.errorCodes) ||
      event.errorCodes.length > 10 ||
      Array.from(event.errorCodes).some((code) =>
        !Number.isSafeInteger(code) || code < 0 || code > 999999999)) {
    unavailable();
  }
  const errors = [...event.errorCodes].sort((a, b) => a - b);
  let key: unknown[];
  let classification: CatchIngressClassification;
  let ambiguity: CatchIngressAmbiguity | null = null;
  if (event.eventKind === "inbound") {
    if (!boundedIdentity(event.messageType) || event.deliveryStatus !== null ||
        errors.length !== 0) unavailable();
    key = [event.wabaId, event.phoneNumberId, "inbound", event.messageId];
    classification = "text";
    // A photo, voice note or button reply carries only a Support placeholder
    // in text. It stays blocked here, so it can never be read as typed words
    // (nominations, STOP, the reply trial); the receipt consumer still
    // records it in the Support conversation.
    if (event.messageType !== "text") ambiguity = "unsupported-message";
    else if (event.textTruncated) ambiguity = "truncated-text";
    else if (event.text === null || !event.text.trim()) {
      ambiguity = "missing-text";
    } else if (isWhatsappStopCommand(event.text)) classification = "stop";
  } else if (event.eventKind === "status") {
    if (event.messageType !== null || event.text !== null ||
        event.textTruncated || !["sent", "delivered", "read", "failed"]
      .includes(event.deliveryStatus ?? "")) unavailable();
    key = [event.wabaId, event.phoneNumberId, "status", event.messageId,
      event.deliveryStatus, event.providerTimestampSeconds, errors];
    classification = "status";
    if (event.deliveryStatus !== "failed" && errors.length !== 0) {
      ambiguity = "invalid-status-errors";
    }
  } else {
    unavailable();
  }
  if (!/^[1-9][0-9]{6,14}$/u.test(event.participantId)) {
    ambiguity = "unresolved-endpoint";
  }
  const eventId = "cwhe_" + sha(key);
  if (event.eventId !== eventId) unavailable();
  return {eventId, eventKind: event.eventKind,
    materialSha256: sha(["catch.whatsapp-ingress-material/v1", ...key,
      event.participantId, event.providerTimestampSeconds, event.messageType,
      event.text, event.textTruncated, event.deliveryStatus, errors]),
    classification: ambiguity === null ? classification : "ambiguous",
    ambiguity};
}

/**
 * Compare both original normalized records, never unvalidated supplied hashes.
 * Distinct means different semantic event keys, including different status
 * observations for one provider message. It does not authorize a new write.
 * Equivalence is only for this supported normalized event model; callers still
 * own authenticated atomic persistence and independent capture-gap evidence.
 */
export function compareCatchIngressReplay(previous: CatchWebhookEvent,
  incoming: CatchWebhookEvent): CatchIngressReplayDecision {
  const before = deriveCatchIngressEvidence(previous);
  const after = deriveCatchIngressEvidence(incoming);
  if (before.eventId !== after.eventId) return "distinct";
  if (before.materialSha256 !== after.materialSha256) return "conflict";
  if (before.classification === "ambiguous" ||
      after.classification === "ambiguous") return "ambiguous";
  return "equivalent";
}
