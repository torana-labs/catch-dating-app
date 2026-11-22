import {hashEndpoint} from "../../platform/delivery/endpointHash";
import {operationContentHash} from "../../operations/durableActions";
import type {EventWhatsappReplyBindingDocument as ReplyBinding} from
  "../../shared/generated/eventWhatsappReplyBindingDocument";
import {validateEventWhatsappReplyBindingDocument} from
  "../../shared/generated/validators/eventWhatsappReplyBindingDocument";
import {guestIdentity} from "./guestRecords";
import type {LiveAttempt} from "./messageOutbox";

export type {ReplyBinding};
export const WHATSAPP_REPLY_BINDINGS = "eventAssistanceWhatsappReplyBindings";

/** Correlation only: these IDs never authenticate a provider or guest. */
export function whatsappNativeReplyId(attemptId: string, index: number) {
  if (!/^attempt:[a-f0-9]{64}$/.test(attemptId) || attemptId.length !== 72 ||
      !Number.isInteger(index) || index < 0 || index > 19) {
    throw new Error("Invalid native reply correlation");
  }
  return "ce-wa1." + attemptId.slice(8) + "." + index;
}

export function whatsappAttemptFromReplyId(value: string): string | null {
  const match = /^ce-wa1\.([a-f0-9]{64})\.([0-9]|1[0-9])$/.exec(value);
  return match && match[0] === value ? "attempt:" + match[1] : null;
}

export function whatsappEndpointHash(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^\+[1-9][0-9]{7,14}$/.exec(value);
  return match?.[0] === value ? hashEndpoint(value) : null;
}

export function whatsappEndpointId(phone: string): string {
  const hash = whatsappEndpointHash(phone);
  if (!hash) throw new Error("Invalid WhatsApp recipient endpoint");
  return "whatsapp:" + hash;
}

/** Delivery status may advance; the claimed authority cannot be replaced. */
export function whatsappAttemptScopeHash(attempt: LiveAttempt): string {
  return operationContentHash(Object.fromEntries(Object.entries(attempt)
    .filter(([key]) => key !== "state")));
}

export function parseWhatsappReplyBinding(value: unknown): ReplyBinding {
  if (!validateEventWhatsappReplyBindingDocument(value) ||
      value.guestId !== guestIdentity(value.context, value.attendeeId) ||
      value.expiresAt <= value.createdAt ||
      value.expiresAt - value.createdAt > 86_400_000 ||
      value.recipientEndpointId !== "whatsapp:" + value.endpointHash ||
      new Set(value.choices.map((c) => c.choiceId)).size !==
        value.choices.length ||
      value.choices.some((choice, i) =>
        choice.nativeId !== whatsappNativeReplyId(value.attemptId, i))) {
    throw new Error("Invalid WhatsApp reply binding");
  }
  return value;
}
