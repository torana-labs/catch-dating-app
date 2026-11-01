import type {SupportSummary} from "../api/supportInboxRepository";

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
