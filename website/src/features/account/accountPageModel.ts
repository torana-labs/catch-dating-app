import type {WebsiteAccount} from "../../firebase";

export const accountTabs = ["plans", "following", "reviews", "details", "messages", "privacy"] as const;
export type AccountTab = (typeof accountTabs)[number];
export type AccountPlan = NonNullable<WebsiteAccount["plans"]>[number];
type AccountFollow = NonNullable<WebsiteAccount["follows"]>[number];
type AccountReview = NonNullable<WebsiteAccount["reviews"]>[number];
export type AccountMessages = NonNullable<WebsiteAccount["messages"]>[number];

/** Every section the page reads in its one account request. */
export const accountSections = ["plans", "following", "reviews", "messages"] as const;

/** The tab named by the URL fragment (`#following`), or Plans. */
export function tabFromHash(hash: string): AccountTab {
  const value = hash.replace(/^#/u, "");
  return (accountTabs as readonly string[]).includes(value) ? value as AccountTab : "plans";
}

// Plans are India-first; the page reads them in the city's own time.
const zone = "Asia/Kolkata";
const dayFormat = new Intl.DateTimeFormat("en-IN", {weekday: "short", timeZone: zone});
const dateFormat = new Intl.DateTimeFormat("en-IN", {day: "numeric", timeZone: zone});
const whenFormat = new Intl.DateTimeFormat("en-IN", {weekday: "short", day: "numeric", month: "short",
  hour: "numeric", minute: "2-digit", timeZone: zone});
const shortDate = new Intl.DateTimeFormat("en-IN", {day: "numeric", month: "short", year: "numeric", timeZone: zone});

export function dateTile(iso: string | null): {day: string; date: string} | undefined {
  if (!iso) return undefined;
  const value = new Date(iso);
  return {day: dayFormat.format(value), date: dateFormat.format(value)};
}

export function whenLabel(iso: string | null): string {
  return iso ? whenFormat.format(new Date(iso)) : "";
}

export function shortDateLabel(iso: string | null): string {
  return iso ? shortDate.format(new Date(iso)) : "";
}

/** Upcoming soonest first; past most recent first. */
export function splitPlans(plans: readonly AccountPlan[]) {
  const upcoming = plans.filter((plan) => plan.timing === "upcoming")
    .sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
  const past = plans.filter((plan) => plan.timing === "past");
  return {upcoming, past};
}

/** The pass's QR payload: the same `catch:event-ticket` code the apps show and the door scans. */
export function passPayload(eventId: string, ticketCode: string): string {
  return JSON.stringify({kind: "catch:event-ticket", v: 1, eventId, ticketCode});
}

/** The download: exactly what the page read, as a readable JSON file. */
export function accountExport(account: WebsiteAccount, exportedAt: Date): string {
  return JSON.stringify({
    exportedAt: exportedAt.toISOString(),
    account: {uid: account.uid, name: account.displayName, phoneNumber: account.phoneNumber, dateOfBirth: account.dateOfBirth},
    plans: account.plans ?? [],
    following: account.follows ?? [],
    reviews: account.reviews ?? [],
    messages: account.messages ?? [],
  }, null, 2);
}

/** A request id for one withdrawal; the contract's document id shape. */
export function requestId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
