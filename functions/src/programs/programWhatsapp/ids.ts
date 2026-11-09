import {createHash} from "node:crypto";

// Programme WhatsApp (lane W1): collection names and deterministic ids
// shared by the inbound router, the reply operations and lane W2.

export const PROGRAM_WHATSAPP_ENDPOINT_INDEX = "programWhatsappEndpointIndex";
export const PROGRAM_WHATSAPP_THREADS = "programWhatsappThreads";
export const PROGRAM_WHATSAPP_MESSAGES = "programWhatsappMessages";
export const PROGRAM_WHATSAPP_REPLY_OPERATIONS =
  "programWhatsappReplyOperations";
export const PROGRAM_WHATSAPP_CANNED_REPLIES = "programWhatsappCannedReplies";
export const PROGRAM_ASSISTANT_SETTINGS = "programAssistantSettings";

export const dayMillis = 24 * 60 * 60 * 1000;
/** Meta's customer-service window: free text only until last inbound + 24 h. */
export const programWhatsappServiceWindowMillis = dayMillis;
/** The inbox keeps at most this many messages per thread read. */
export const maxProgramThreadMessages = 200;

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function programWhatsappEndpointIndexId(programId: string,
  endpointHash: string): string {
  return `${programId}_${endpointHash}`;
}

export function programWhatsappThreadId(programId: string,
  householdId: string): string {
  return `${programId}_${householdId}`;
}

/** Unknown senders get their own thread per programme and number. */
export function programWhatsappUnknownThreadId(programId: string,
  endpointHash: string): string {
  return `${programId}_u-${endpointHash.slice(0, 32)}`;
}

export function programWhatsappInboundMessageId(programId: string,
  providerMessageId: string): string {
  return `pwm_${sha256(`${programId}|in|${providerMessageId}`).slice(0, 48)}`;
}

export function programWhatsappReplyOperationId(programId: string,
  threadId: string, idempotencyKey: string): string {
  return `pwro_${sha256(`${programId}|${threadId}|${idempotencyKey}`)
    .slice(0, 48)}`;
}

export function programWhatsappReplyMessageId(operationId: string): string {
  return `pwm_${sha256(`out|${operationId}`).slice(0, 48)}`;
}

/** Correlation attempt id; the status callback names it. */
export function programWhatsappReplyAttemptId(operationId: string): string {
  return `attempt:${sha256(`program-wa-service|${operationId}`)}`;
}

export function programWhatsappCannedReplyDocId(programId: string,
  cannedReplyId: string): string {
  return `${programId}_${cannedReplyId}`;
}

/** The inbox list line: one line, at most 160 characters. */
export function messagePreview(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return (flat.length > 160 ? `${flat.slice(0, 159)}…` : flat) || "…";
}

export function isProgramWhatsappWindowOpen(lastInboundAtMillis: number,
  nowMillis: number): boolean {
  return nowMillis >= lastInboundAtMillis &&
    nowMillis < lastInboundAtMillis + programWhatsappServiceWindowMillis;
}
