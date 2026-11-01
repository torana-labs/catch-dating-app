import type {InboxItem, InboxScope, InboxType} from "../api/inboxRepository";

export const inboxScopeLabels: Record<Exclude<InboxScope, "working">, string> = {
  waiting: "Waiting", mine: "Mine", snoozed: "Snoozed", done: "Done",
};

export const inboxTypeLabel: Record<InboxType, string> = {
  listing: "Listing", event: "Event", claim: "Claim", enquiry: "Enquiry", access: "Launch access", stuck: "Stuck",
};

const hour = 3_600_000;

/** How long an item has waited, as the queue says it: "3 days", "20 hours", "Just now". */
export function waitingLabel(since: string, now: number = Date.now()): string {
  const hours = Math.max(0, Math.floor((now - Date.parse(since)) / hour));
  if (hours < 1) return "Just now";
  if (hours < 48) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.floor(hours / 24);
  return `${days} days`;
}

/** Two days waiting is late; three is overdue. */
export function waitingTone(since: string, now: number = Date.now()): "warning" | "danger" | undefined {
  const hours = (now - Date.parse(since)) / hour;
  return hours >= 72 ? "danger" : hours >= 48 ? "warning" : undefined;
}

/** The note under the queue title: "oldest 3 days · 6 ready to decide". */
export function queueNote(items: readonly InboxItem[], oldestWaitingSince: string | null, now: number = Date.now()) {
  const ready = items.filter((item) => item.state.code === "ready").length;
  return [oldestWaitingSince ? `oldest ${waitingLabel(oldestWaitingSince, now)}` : null,
    ready ? `${ready} ready to decide` : null].filter(Boolean).join(" · ") || null;
}
