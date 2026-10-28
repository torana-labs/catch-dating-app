import type {OrganizerDocument} from
  "../shared/generated/firestoreAdminTypes";

type ClaimSourceFields = Pick<OrganizerDocument,
  "instagramHandle" | "publicSources">;

const instagramUsername = /^[a-z0-9._]{1,30}$/;
// Instagram paths that name content or app pages rather than an account.
const instagramReservedSegments = new Set(["accounts", "direct", "explore",
  "p", "reel", "reels", "stories", "tv"]);

/** Lower-case Instagram username without @, or null when it cannot be one. */
export function normalizeInstagramUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const username = value.trim().replace(/^@/, "").toLowerCase();
  return instagramUsername.test(username) &&
    !instagramReservedSegments.has(username) ? username : null;
}

/**
 * The Instagram account a claim must come from: the listing's own handle,
 * else the first Instagram profile among its public sources.
 */
export function listingInstagramUsername(
  organizer: ClaimSourceFields
): string | null {
  const own = normalizeInstagramUsername(organizer.instagramHandle);
  if (own) return own;
  for (const source of organizer.publicSources ?? []) {
    if (source.type !== "instagram" || !source.href) continue;
    const username = instagramUsernameFromUrl(source.href);
    if (username) return username;
  }
  return null;
}

/** The Luma page a claim code must appear on, from the listing's sources. */
export function listingLumaCalendarUrl(
  organizer: ClaimSourceFields
): string | null {
  for (const source of organizer.publicSources ?? []) {
    if (source.type !== "luma" || !source.href) continue;
    const url = lumaCalendarUrl(source.href);
    if (url) return url;
  }
  return null;
}

function instagramUsernameFromUrl(href: string): string | null {
  const url = parseUrl(href);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
  if (host !== "instagram.com") return null;
  return normalizeInstagramUsername(url.pathname.split("/")[1]);
}

function lumaCalendarUrl(href: string): string | null {
  const url = parseUrl(href);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== "luma.com" && host !== "lu.ma") return null;
  const segments = url.pathname.split("/").filter(Boolean);
  const path = segments[0] === "calendar" && segments[1] ?
    `calendar/${segments[1]}` : segments.length === 1 ? segments[0] : null;
  return path && /^[A-Za-z0-9/_-]{1,120}$/.test(path) ?
    `https://luma.com/${path}` : null;
}

function parseUrl(href: string): URL | null {
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}
