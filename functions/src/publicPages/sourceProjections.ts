import {without, withoutDatingFraming} from "./pageModel";
import {projectLivePublicCatchEvent} from "./publicCatchEvent";
import {publicExternalEvent} from "./publicExternalEvent";
import {projectPublicOrganizer} from "./publicOrganizer";
import {publicEventAuthorized} from "./publicReadPolicy";
import {projectPublicReview} from "./publicReview";
import {organizerWomenLed, womenLedLocked} from "../organizers/womenLed";

/**
 * What one source document contributes to public pages. Triggers compare
 * the before and after values and skip the rebuild when they are equal, so
 * private edits (rosters, payments, internal projections) never rebuild a
 * page. Every value comes from the same projectors the pages use.
 */
type Raw = Record<string, unknown> | undefined;

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** A published, active Catch event whose public projection reads. */
export function publicCatchEventAuthorized(
  id: string, data: unknown, now: number
): boolean {
  return publicEventAuthorized(id, data) &&
    projectLivePublicCatchEvent(id, data, now) !== null;
}

export function organizerContribution(
  id: string, data: Raw, liveMarkets: ReadonlySet<string>
): string | null {
  if (!data) return null;
  const listing = projectPublicOrganizer(id, data, liveMarkets);
  if (!listing) return null;
  // Follower counts reach pages in batches, not on every follow. The
  // women-led default and its lock resolve every event's label; who set it
  // and when never reach a page.
  return JSON.stringify({...listing,
    metrics: without(listing.metrics ?? {}, ["followerCount"]),
    womenLed: organizerWomenLed(data),
    womenLedLocked: womenLedLocked(data.womenLed)});
}

export function catchEventContribution(
  id: string, data: Raw, now: number
): string | null {
  if (!data || !publicEventAuthorized(id, data)) return null;
  const row = projectLivePublicCatchEvent(id, data, now);
  const womenLed = data.womenLed as {value?: unknown} | undefined;
  return row ? JSON.stringify({organizerId: row.organizerId,
    event: withoutDatingFraming(row.event),
    womenLed: womenLed?.value ?? null,
    womenLedLocked: womenLedLocked(womenLed)}) : null;
}

export function externalEventContribution(
  id: string, data: Raw
): string | null {
  const row = data ? publicExternalEvent(id, data) : null;
  return row ? JSON.stringify(row) : null;
}

/** Organizers whose pages may show this event: current and previous. */
export function catchEventOrganizerIds(...rows: Raw[]): string[] {
  return [...new Set(rows.flatMap((row) =>
    [stringOrNull(row?.organizerId), stringOrNull(row?.organizerId)])
    .filter((id): id is string => Boolean(id)))];
}

export function externalEventOrganizerIds(...rows: Raw[]): string[] {
  return [...new Set(rows.map((row) => stringOrNull(row?.canonicalHostId))
    .filter((id): id is string => Boolean(id)))];
}

/** The fields review counts filter on, plus the projected review. */
export function reviewContribution(id: string, data: Raw): string | null {
  if (!data) return null;
  const organizerId = stringOrNull(data.organizerId);
  return JSON.stringify({
    organizerId,
    moderationStatus: data.moderationStatus ?? null,
    verificationStatus: data.verificationStatus ?? null,
    rating: data.rating ?? null,
    review: organizerId ? projectPublicReview(id, data, organizerId) : null,
  });
}

export function reviewOrganizerIds(...rows: Raw[]): string[] {
  return [...new Set(rows.map((row) => stringOrNull(row?.organizerId))
    .filter((id): id is string => Boolean(id)))];
}
