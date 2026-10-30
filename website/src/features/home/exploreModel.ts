import {homeFormats} from "@content/homePage";
import type {HomeFormat, HomeOrganizer, HomePlan} from "./homeTypes";

export type ExploreView = "plans" | "organisers";
export type ExploreWhen = "any" | "today" | "weekend" | "week";
export interface ExploreFilters {
  query: string;
  format: HomeFormat | "all";
  when: ExploreWhen;
  view: ExploreView;
}

const whens: ExploreWhen[] = ["any", "today", "weekend", "week"];
const formats = new Set<string>(homeFormats.map((item) => item.format));

/** Explore's filters from its URL: q, format, when and show. Unknown values fall back to the defaults. */
export function exploreFiltersFromSearch(search: string): ExploreFilters {
  const params = new URLSearchParams(search);
  const format = params.get("format") ?? "";
  const when = params.get("when") ?? "";
  return {
    query: (params.get("q") ?? "").trim().slice(0, 120),
    format: formats.has(format) ? format as HomeFormat : "all",
    when: (whens as string[]).includes(when) ? when as ExploreWhen : "any",
    view: params.get("show") === "organisers" ? "organisers" : "plans",
  };
}

/** The query string for the filters, leaving defaults out; other parameters (city, attribution) are kept. */
export function exploreSearchFor(filters: ExploreFilters, current = ""): string {
  const params = new URLSearchParams(current);
  for (const key of ["q", "format", "when", "show"]) params.delete(key);
  if (filters.query) params.set("q", filters.query);
  if (filters.format !== "all") params.set("format", filters.format);
  if (filters.when !== "any") params.set("when", filters.when);
  if (filters.view === "organisers") params.set("show", "organisers");
  const query = params.toString();
  return query ? `?${query}` : "";
}

const tokens = (text: string) => text.toLocaleLowerCase("en-IN").split(/\s+/u).filter(Boolean);
const matches = (query: string, ...fields: string[]) => {
  const haystack = fields.join(" ").toLocaleLowerCase("en-IN");
  return tokens(query).every((token) => haystack.includes(token));
};
const formatName = (format: HomeFormat) => homeFormats.find((item) => item.format === format)?.name ?? "";

/** The calendar day ("2026-10-29") and weekday (0 is Sunday) of an instant in a time zone. */
function localDay(instant: number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", timeZone: timezone})
    .formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return {date: `${part("year")}-${part("month")}-${part("day")}`, weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(part("weekday"))};
}

const day = 24 * 60 * 60 * 1000;

function inWindow(plan: HomePlan, when: ExploreWhen, readAt: number, timezone: string) {
  const start = Date.parse(plan.startTime);
  if (when === "any") return true;
  if (when === "week") return start < readAt + 7 * day;
  const planDay = localDay(start, timezone).date;
  const today = localDay(readAt, timezone);
  if (when === "today") return planDay === today.date;
  // This weekend: the coming Saturday and Sunday, or the rest of it when it is already the weekend.
  const toSaturday = today.weekday === 0 ? -1 : 6 - today.weekday;
  const saturday = localDay(readAt + toSaturday * day, timezone).date;
  const sunday = localDay(readAt + (toSaturday + 1) * day, timezone).date;
  return planDay === saturday || planDay === sunday;
}

export function filterPlans(plans: readonly HomePlan[], filters: ExploreFilters, readAt: number, timezone: string): HomePlan[] {
  return plans.filter((plan) => (filters.format === "all" || plan.format === filters.format) &&
    inWindow(plan, filters.when, readAt, timezone) &&
    matches(filters.query, plan.title, plan.organizer.name, plan.location, formatName(plan.format)));
}

export function filterOrganizers(organizers: readonly HomeOrganizer[], filters: ExploreFilters): HomeOrganizer[] {
  return organizers.filter((organizer) => (filters.format === "all" || organizer.formats.includes(filters.format)) &&
    matches(filters.query, organizer.name, organizer.category, ...organizer.formats.map(formatName)));
}
