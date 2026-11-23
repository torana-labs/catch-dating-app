import type {
  OwnerCapability,
  OwnerInsightTotals,
  OwnerRole,
  OwnerTrafficSource,
  OwnerViewData,
} from "./ownerViewTypes";

/**
 * The owner view from the organizer's hostOrganizerOwnerViews row (#2306),
 * for one reader at one instant, exactly as getOrganizerOwnerView built it:
 * the reader is the owner when the row's ownerUid is theirs and an editor
 * otherwise (only the team can read the row), the insights window is the 30
 * complete UTC days before now, and the follower allowance is this month's
 * in Asia/Kolkata.
 */

const windowDays = 30;
const dayMillis = 86_400_000;
const istOffsetMillis = (5 * 60 + 30) * 60 * 1000;

interface InsightDay extends OwnerInsightTotals {
  date: string;
  sources: Array<{source: OwnerTrafficSource; clicks: number}>;
  links: Array<{linkId: string; clicks: number}>;
}

/** The row as the trigger writes it; every field is checked before use. */
export interface OwnerViewRow {
  organizerId: string;
  ownerUid: string | null;
  capabilitiesByRole: Record<OwnerRole, OwnerCapability[]>;
  insightDays: InsightDay[];
  links: OwnerViewData["links"];
  about: string | null;
  photos: OwnerViewData["photos"];
  followerMessageLimit: number;
  followerMessageMonths: Array<{month: string; used: number}>;
  whatsappAvailable: boolean;
}

const utcDay = (nowMillis: number, daysBack: number) =>
  new Date(nowMillis - daysBack * dayMillis).toISOString().slice(0, 10);

/** The calendar month in India, as YYYY-MM, as followerMessageMonth does. */
export function followerMonth(nowMillis: number): string {
  return new Date(nowMillis + istOffsetMillis).toISOString().slice(0, 7);
}

/** The 30-day window from stored days, as the server's insightsWindow. */
export function insightsWindow(nowMillis: number, stored: readonly InsightDay[]): OwnerViewData["insights"] {
  const byDate = new Map(stored.map((day) => [day.date, day]));
  const dates = Array.from({length: windowDays}, (_, index) => utcDay(nowMillis, windowDays - index));
  const totals = {visits: 0, linkClicks: 0, bookingClicks: 0, newFollowers: 0};
  const sources = new Map<string, number>();
  const links = new Map<string, number>();
  let updatedThrough: string | null = null;
  const days = dates.map((date) => {
    const day = byDate.get(date);
    if (!day) return {date, visits: 0, linkClicks: 0, bookingClicks: 0, newFollowers: 0};
    updatedThrough = date;
    totals.visits += day.visits;
    totals.linkClicks += day.linkClicks;
    totals.bookingClicks += day.bookingClicks;
    totals.newFollowers += day.newFollowers;
    for (const row of day.sources) sources.set(row.source, (sources.get(row.source) ?? 0) + row.clicks);
    for (const row of day.links) links.set(row.linkId, (links.get(row.linkId) ?? 0) + row.clicks);
    return {date, visits: day.visits, linkClicks: day.linkClicks, bookingClicks: day.bookingClicks,
      newFollowers: day.newFollowers};
  });
  const ranked = (map: Map<string, number>) => [...map].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {windowDays, startDate: dates[0], endDate: dates[dates.length - 1], updatedThrough, totals, days,
    sources: ranked(sources).map(([source, clicks]) => ({source: source as OwnerTrafficSource, clicks})),
    links: ranked(links).slice(0, 40).map(([linkId, clicks]) => ({linkId, clicks}))};
}

/** Whether a Firestore row has the shape the trigger writes. */
export function isOwnerViewRow(value: unknown, organizerId: string): value is OwnerViewRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<OwnerViewRow>;
  return row.organizerId === organizerId && (row.ownerUid === null || typeof row.ownerUid === "string") &&
    !!row.capabilitiesByRole && Array.isArray(row.capabilitiesByRole.owner) &&
    Array.isArray(row.capabilitiesByRole.editor) && Array.isArray(row.insightDays) && Array.isArray(row.links) &&
    Array.isArray(row.photos) && typeof row.followerMessageLimit === "number" &&
    Array.isArray(row.followerMessageMonths) && typeof row.whatsappAvailable === "boolean";
}

/** The owner view one reader sees at nowMillis. */
export function ownerViewFromRow(row: OwnerViewRow, uid: string, nowMillis: number): OwnerViewData {
  const role: OwnerRole = row.ownerUid === uid ? "owner" : "editor";
  const month = followerMonth(nowMillis);
  const used = row.followerMessageMonths.find((entry) => entry.month === month)?.used ?? 0;
  return {
    organizerId: row.organizerId,
    role,
    capabilities: [...row.capabilitiesByRole[role]],
    insights: insightsWindow(nowMillis, row.insightDays),
    links: row.links,
    about: row.about,
    photos: row.photos,
    followerMessages: {month, limit: 2, used: Math.min(row.followerMessageLimit, used),
      whatsappAvailable: row.whatsappAvailable},
  };
}
