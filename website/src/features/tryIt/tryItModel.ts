import {websiteCities} from "@content/markets";
import type {MarketCity} from "@content/markets/types";
import type {TryItCommandId, TryItInput} from "../../shared/api/tryItCommands";

/** The try-it tools the website draws, each the website side of one command. */
export const tryItToolCommands = {
  organizer: "organizer.import-from-link",
  event: "event.import-from-link",
  kit: "promotion.create-kit",
  guests: "guests.import-list",
  report: "sales.import-past",
  night: "night.plan",
  form: "form.import-from-link",
} as const satisfies Record<string, TryItCommandId>;
export type TryItToolKind = keyof typeof tryItToolCommands;
/**
 * The tools that start from a link, which this folder's TryItTool draws
 * (form: a public Google Form, made a private draft form); the
 * guest list tool is features/guestImportTryIt, Reports' export upload is
 * features/pastSalesTryIt and the plan-a-night tool is NightPlanTryIt.tsx.
 */
export type TryItLinkToolKind = Exclude<TryItToolKind, "guests" | "report" | "night">;

/**
 * The commands whose website tool is built and tested here. A product
 * page's try-it band, its "Try it" buttons and its closing tool form may be
 * visible only when its command is listed (playbookPages.test.ts); whether
 * one is visible is still the page's own `status`, flipped once its command
 * is in production. guests.import-list's tool is the guest list upload
 * (features/guestImportTryIt); sales.import-past's is Reports' export upload
 * (features/pastSalesTryIt); night.plan's is the plan-a-night tool
 * (NightPlanTryIt.tsx). form.import-from-link's tool (TryItTool, `form`) is
 * built and tested but left out, so the Forms page's band stays hidden;
 * switching it on is adding it here and flipping the page's try sections to
 * built. Reports' numbers-only path needs no
 * command: it is the lastEventReport custom section, worked out in the
 * page, beside the export upload.
 */
export const websiteReadyTryItCommands = [
  "organizer.import-from-link",
  "event.import-from-link",
  "promotion.create-kit",
  "guests.import-list",
  "sales.import-past",
  "night.plan",
] as const satisfies readonly TryItCommandId[];

/**
 * The tool each playbook page's tool forms open, by page content key. A
 * `tool` lead form on a page not listed here draws nothing. The event tool
 * also serves the standalone /tools/event-page-from-link/ page.
 */
export const playbookTryItTools: Readonly<Record<string, TryItToolKind>> = {
  product_your_page: "organizer",
  product_bookings: "event",
  product_messages: "kit",
  tools_event_page_from_link: "event",
  product_guests: "guests",
  product_reports: "report",
  product_room: "night",
  product_forms: "form",
};

/**
 * The tool a page's tool forms open, or null when the page has none or its
 * command is not website-ready. `ready` is websiteReadyTryItCommands except
 * on the Forms page's owner preview (playbookLeadForms.ts).
 */
export function playbookTryItTool(pageId: string, ready: readonly string[] = websiteReadyTryItCommands): TryItToolKind | null {
  const tool = Object.hasOwn(playbookTryItTools, pageId) ? playbookTryItTools[pageId] : null;
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

/**
 * The cities a try-it profile can start in: those where an organiser can be
 * created (the catalog's surfaces.hostCreatable), which workspace.ensure
 * checks again.
 */
export function tryItCities(): readonly MarketCity[] {
  return websiteCities.filter((city) => city.hostCreatable);
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

/**
 * What form.import-from-link could not bring across, as the plain lines the
 * preview shows (contracts/callable_responses/import_form_from_link_response
 * .schema.json, result.flags). Codes this site knows have their own line;
 * any other code, such as one added to the command later, shares the
 * generic "couldn't bring this across" line (`other`).
 */
export const tryItFormFlagCodes = [
  "grid_not_supported", "time_as_text", "file_upload_skipped", "media_skipped", "unknown_item_skipped", "other_option_dropped",
  "branching_review", "navigation_not_supported", "extra_finish_dropped", "options_trimmed", "text_trimmed", "sections_limit",
  "questions_limit", "logic_limit",
] as const;
export type TryItFormFlagCode = (typeof tryItFormFlagCodes)[number];

/** One flag as the command sends it; `code` is read as any string, so a new code cannot break the page. */
export interface TryItFormFlag {
  readonly code: string;
  readonly item: string | null;
}

/** Flags with the same line, together: the source questions or sections they name, each once, in order. */
export interface TryItFormFlagGroup {
  readonly code: TryItFormFlagCode | "other";
  readonly items: readonly string[];
}

const knownFlag = (code: string): code is TryItFormFlagCode => (tryItFormFlagCodes as readonly string[]).includes(code);

export function tryItFormFlagGroups(flags: readonly TryItFormFlag[]): TryItFormFlagGroup[] {
  const groups = new Map<TryItFormFlagGroup["code"], string[]>();
  for (const flag of flags) {
    const code = knownFlag(flag.code) ? flag.code : "other";
    const items = groups.get(code) ?? [];
    if (flag.item && !items.includes(flag.item)) items.push(flag.item);
    groups.set(code, items);
  }
  return [...groups].map(([code, items]) => ({code, items}));
}
