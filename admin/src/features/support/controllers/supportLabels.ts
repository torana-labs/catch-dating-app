import type {
  SupportMessage,
  SupportReplyState,
  SupportSummary,
} from "../api/supportInboxRepository";

/** How long someone has waited, in the board's words: "2 hours", "1 day". */
export function supportWaitingLabel(
  waitingSinceMillis: number | null,
  nowMillis: number
): string | null {
  if (waitingSinceMillis === null) return null;
  const minutes = Math.max(0, Math.floor(
    (nowMillis - waitingSinceMillis) / 60_000));
  if (minutes < 60) return minutes <= 1 ? "1 minute" : `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour" : `${hours} hours`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day" : `${days} days`;
}

/** Waiting over the four-hour reply target reads as a warning. */
export function supportWaitingTone(
  waitingSinceMillis: number | null,
  nowMillis: number
): "warning" | null {
  return waitingSinceMillis !== null &&
    nowMillis - waitingSinceMillis >= 4 * 3600_000 ? "warning" : null;
}

export function supportFromLabel(item: Pick<SupportSummary,
  "audience">): string {
  if (item.audience === "organizer") return "Organizer";
  if (item.audience === "guest") return "Guest";
  return "Unknown";
}

/** Who wrote a message, as the thread shows it. */
export function supportMessageAuthor(message: Pick<SupportMessage,
  "direction" | "authorUid">, name: string): string {
  if (message.direction === "inbound") return name;
  if (message.direction === "note") return "Note for the team";
  return message.authorUid === null ? "Catch, automatic" : "Reply";
}

/** What happened to a reply sent from Catch's WhatsApp number. */
export function supportDeliveryLabel(
  state: SupportMessage["deliveryState"]
): string | null {
  switch (state) {
  case "sending": return "Sending";
  case "accepted":
  case "sent": return "Sent";
  case "delivered": return "Delivered";
  case "read": return "Read";
  case "failed": return "Not delivered";
  case "unknown": return "Not confirmed";
  default: return null;
  }
}

/**
 * The line under the reply box: where the reply goes, or why Catch can't
 * send it now. Outside WhatsApp's 24-hour window only an approved template
 * could be sent, which Support does not offer.
 */
export function supportReplyHelp(
  state: SupportReplyState | null,
  channel: string,
  timeLabel: (ms: number) => string
): string {
  if (!state || state.mode === "record") {
    return state?.blockedReason === "switchedOff" ?
      "Sending from Catch's WhatsApp number is off. Record a reply you " +
        "sent another way." :
      `Send it from ${channel}, then record it here.`;
  }
  switch (state.blockedReason) {
  case "stopped":
    return "They sent STOP, so Catch can't message them on WhatsApp.";
  case "noInboundMessage":
    return "WhatsApp only allows a reply after they message Catch.";
  case "windowClosed":
    return "WhatsApp only allows a reply within 24 hours of their last " +
      "message. Catch can reply here once they write again.";
  default:
    return state.windowClosesAtMillis === null ?
      "Sends from Catch's WhatsApp number." :
      "Sends from Catch's WhatsApp number. You can reply until " +
        `${timeLabel(state.windowClosesAtMillis)}.`;
  }
}
