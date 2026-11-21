import type {
  RecordMessageResult,
  SupportInboxDeps,
} from "../supportInbox/conversations";
import {recordSupportMessage} from "../supportInbox/conversations";
import type {
  CatchAutoReplyOutcome,
  CatchAutoReplyRequest,
} from "./autoReply";
import {replyCopy} from "./inboundRouter";

// The one-line acknowledgement a person gets when they write to Catch's
// WhatsApp number for the first time, or again after 24 hours of silence:
// "Thanks. The Catch team will reply here." It is sent at most once per
// message (the automatic-reply claim), only while the reply switch is on,
// and kept in the Support conversation so staff see what was said.

export type SupportAcknowledgementOutcome = CatchAutoReplyOutcome |
  "not_due" | "switched_off";

export async function acknowledgeSupportSender(deps: {
  enabled: boolean;
  support: SupportInboxDeps;
  reply: (request: CatchAutoReplyRequest) =>
    Promise<{outcome: CatchAutoReplyOutcome; providerMessageId: string | null}>;
}, receipt: {
  eventId: string;
  participantId: string;
  providerTimestampSeconds: string;
}, recorded: RecordMessageResult | null):
  Promise<SupportAcknowledgementOutcome> {
  if (!recorded?.acknowledge) return "not_due";
  if (!deps.enabled) return "switched_off";
  const body = replyCopy.supportAcknowledged;
  const sent = await deps.reply({
    kind: "support_acknowledged",
    body,
    sourceEventId: receipt.eventId,
    participantId: receipt.participantId,
    inboundAtMillis: Number(receipt.providerTimestampSeconds) * 1000,
  });
  if (sent.providerMessageId) {
    await recordSupportMessage(deps.support, {
      channel: "whatsapp",
      contactAddress: `+${receipt.participantId}`,
      displayName: null,
      direction: "outbound",
      text: body,
      authorUid: null,
      sourceEventId: `ack:${receipt.eventId}`,
      savedReplyId: null,
      deliveryState: "accepted",
      automatic: true,
      providerMessageId: sent.providerMessageId,
    });
  }
  return sent.outcome;
}
