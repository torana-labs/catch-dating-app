import type {Growth, NominatorRow} from "../api/growthRepository";

export type GrowthChannel = Growth["channels"][number]["channel"];

export const channelLabels: Record<GrowthChannel, string> = {
  imported: "Imported listings",
  sales_associate: "Sales associates",
  partner: "Partners",
  guest: "Guests",
  organizer: "Organizers",
  came_to_us: "Came to us",
  ads: "Ads",
};

/** The channel as a short "came from" cell. */
export const channelShortLabels: Record<GrowthChannel, string> = {
  imported: "Imported",
  sales_associate: "Sales associate",
  partner: "Partner",
  guest: "Guest",
  organizer: "Organizer",
  came_to_us: "Came to us",
  ads: "Ads",
};

export const nominatorRoleLabels: Record<NominatorRow["role"], string> = {
  associate: "Sales associate",
  partner: "Partner",
  guest: "Guest",
  organizer: "Organizer",
};

const india = "Asia/Kolkata";
const monthLong = new Intl.DateTimeFormat("en-IN", {month: "long", timeZone: india});
const monthShort = new Intl.DateTimeFormat("en-IN", {month: "short", timeZone: india});

/** Paise as whole rupees, Indian grouping: ₹19,500. */
export function rupees(minor: number): string {
  return `₹${Math.round(minor / 100).toLocaleString("en-IN")}`;
}

/** Large sums in lakh or thousand: ₹3.9L, ₹38k, ₹900. */
export function compactRupees(minor: number): string {
  const value = minor / 100;
  if (value >= 100_000) return `₹${(value / 100_000).toLocaleString("en-IN", {maximumFractionDigits: 1})}L`;
  if (value >= 1_000) return `₹${Math.round(value / 1_000).toLocaleString("en-IN")}k`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function monthDate(month: string): number {
  const [year, number] = month.split("-").map(Number);
  return Date.UTC(year, number - 1, 15);
}

/** "2026-06" as June 2026 for the first row, June after. */
export function monthName(month: string, withYear = false): string {
  const name = monthLong.format(monthDate(month));
  return withYear ? `${name} ${month.slice(0, 4)}` : name;
}

/** "2026-06" as Jun. */
export function monthAbbreviation(month: string): string {
  return monthShort.format(monthDate(month));
}

/** A count and its share: 22 · 34%. */
export function countAndShare(count: number, of: number): string {
  return of > 0 ? `${count} · ${Math.round(count * 100 / of)}%` : String(count);
}

/** A share of a whole, rounded: 23%. */
export function share(count: number, of: number): string {
  return of > 0 ? `${Math.round(count * 100 / of)}%` : "—";
}

/** Median days, or a dash when nothing has happened yet. */
export function days(value: number | null): string {
  return value === null ? "—" : `${value} ${value === 1 ? "day" : "days"}`;
}

/** The last 90 days against the 90 before: Growing 24%, Falling 38%, Flat, New. */
export function trendLabel(trendPercent: number | null, inTrial: boolean):
  {text: string; tone?: "success" | "danger" | "secondary"} {
  if (trendPercent === null) return {text: inTrial ? "New" : "—", tone: "secondary"};
  if (Math.abs(trendPercent) < 5) return {text: "Flat"};
  return trendPercent > 0 ?
    {text: `Growing ${Math.round(trendPercent)}%`, tone: "success"} :
    {text: `Falling ${Math.round(-trendPercent)}%`, tone: "danger"};
}
