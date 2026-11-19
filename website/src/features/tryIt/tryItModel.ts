import {websiteCities} from "@content/markets";
import type {MarketCity} from "@content/markets/types";
import type {TryItCommandId, TryItInput} from "../../shared/api/tryItCommands";

/** The try-it tools the website draws, each the website side of one command. */
export const tryItToolCommands = {
  organizer: "organizer.import-from-link",
  event: "event.import-from-link",
  kit: "promotion.create-kit",
} as const satisfies Record<string, TryItCommandId>;
export type TryItToolKind = keyof typeof tryItToolCommands;

/**
 * The commands whose website tool is built and tested here. A product
 * page's try-it band, its "Try it" buttons and its closing tool form may be
 * visible only when its command is listed (playbookPages.test.ts); whether
 * one is visible is still the page's own `status`, flipped once its command
 * is in production. guests.import-list, plan a night, past sales and form
 * import have no website tool yet, so their bands stay hidden. Reports'
 * numbers-only path needs no command: it is the lastEventReport custom
 * section, worked out in the page, beside the hidden past-sales band.
 */
export const websiteReadyTryItCommands = [
  "organizer.import-from-link",
  "event.import-from-link",
  "promotion.create-kit",
] as const satisfies readonly TryItCommandId[];

/**
 * The tool each playbook page's tool forms open, by page content key. A
 * `tool` lead form on a page not listed here draws nothing. The event tool
 * also serves the standalone /tools/event-page-from-link/ page once it is
 * written (`tools_event_page_from_link: "event"`).
 */
export const playbookTryItTools: Readonly<Record<string, TryItToolKind>> = {
  product_your_page: "organizer",
  product_bookings: "event",
  product_messages: "kit",
};

/** The tool a page's tool forms open, or null when the page has none or its command is not website-ready. */
export function playbookTryItTool(pageId: string): TryItToolKind | null {
  const tool = Object.hasOwn(playbookTryItTools, pageId) ? playbookTryItTools[pageId] : null;
  const ready: readonly string[] = websiteReadyTryItCommands;
  return tool && ready.includes(tryItToolCommands[tool]) ? tool : null;
}

const closedLink = /^(?:[a-z][a-z0-9+.-]*:)?\/\//iu;

/**
 * The link as the commands take it (an http(s) address), from what the
 * visitor typed: a full address, one without its https:// ("instagram.com/
 * driftwoodbayrunners"), or for the page tool an Instagram handle
 * ("@driftwoodbayrunners"). Null when it is not a public web address, by the
 * same rules the commands apply (functions/src/instantDrafts/links.ts).
 */
export function tryItLink(typed: string, tool: TryItToolKind): string | null {
  let value = typed.trim();
  if (!value) return null;
  const handle = /^@([A-Za-z0-9._]{1,30})$/u.exec(value);
  if (handle) {
    if (tool !== "organizer") return null;
    value = `https://www.instagram.com/${handle[1]}/`;
  } else if (!closedLink.test(value)) {
    value = `https://${value}`;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password ||
    !url.hostname.includes(".") || /^[0-9.]+$/u.test(url.hostname) || url.hostname.includes(":")) return null;
  const href = url.href;
  return href.length >= 8 && href.length <= 2000 ? href : null;
}

/** The cities a try-it profile can start in: the live market cities, where organisers can be created. */
export function tryItCities(): readonly MarketCity[] {
  return websiteCities.filter((city) => city.status === "live");
}

export type TryItKitLink = TryItInput<"promotion.create-kit">["links"][number];

/** A channel's source, when its words name one the reports know. */
const sources: ReadonlyArray<readonly [RegExp, string]> = [
  [/instagram|\binsta\b|\big\b/iu, "instagram"],
  [/whats\s?app/iu, "whatsapp"],
  [/facebook/iu, "facebook"],
  [/\bemail\b|newsletter/iu, "email"],
  [/poster|flyer|\bqr\b/iu, "print"],
];

export const tryItKitMaxLinks = 8;

/**
 * Where the visitor promotes the event, as the kit's links: one per
 * comma- or line-separated entry, trimmed and cut to 80 characters, with a
 * source when the words name a channel, and marked a person when the
 * visitor says so. Repeats are kept, so the form can say so.
 */
export function tryItKitLinks(typed: string, people: ReadonlySet<string> = new Set()): TryItKitLink[] {
  return typed.split(/[,\n]/u).map((entry) => entry.trim().replace(/\s+/gu, " ").slice(0, 80)).filter(Boolean).map((label) => {
    const source = sources.find(([pattern]) => pattern.test(label))?.[1];
    const kind = people.has(label.toLowerCase()) ? "promoter" as const : "channel" as const;
    return {label, kind, ...(source && kind === "channel" ? {source} : {})};
  });
}

export type TryItKitLinksProblem = "channelsRequired" | "channelsTooMany" | "channelsDuplicate";

/** Why the kit cannot be asked for as typed, or null. */
export function tryItKitLinksProblem(links: readonly TryItKitLink[]): TryItKitLinksProblem | null {
  if (links.length === 0) return "channelsRequired";
  if (links.length > tryItKitMaxLinks) return "channelsTooMany";
  if (new Set(links.map((link) => link.label.toLowerCase())).size !== links.length) return "channelsDuplicate";
  return null;
}

/** "Sun 23 Nov · 6:30 AM" for an event the page lists, in the market's timezone; the raw value when it is not a date. */
export function tryItEventWhen(startAt: string, timeZone = websiteCities[0]?.timezone ?? "UTC"): string {
  const date = new Date(startAt);
  if (!Number.isFinite(date.getTime())) return startAt;
  const parts = new Intl.DateTimeFormat("en-GB", {timeZone, weekday: "short", day: "numeric", month: "short"}).format(date);
  const time = new Intl.DateTimeFormat("en-US", {timeZone, hour: "numeric", minute: "2-digit"}).format(date);
  return `${parts} · ${time}`;
}

/** A draft's "2026-11-23" as "Sun 23 Nov". */
export function tryItLocalDate(localDate: string): string {
  const date = new Date(`${localDate}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return localDate;
  return new Intl.DateTimeFormat("en-GB", {timeZone: "UTC", weekday: "short", day: "numeric", month: "short"}).format(date);
}
