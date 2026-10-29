import {normalizeOrganizerSurfaceUrl, surfaceForOrganizerPage} from "../sources/surfaces.mjs";

// Name, handle and URL normalization for organizer matching, ported from the
// retired organizer-intake source-mention resolver. URLs go through Supply
// Intake's own surface normalizer so a listing and an organizer Catch already
// lists produce the same identity keys for the same page.

const STOP_WORDS = new Set(["a", "an", "and", "at", "by", "for", "in", "of", "on", "the", "to", "with"]);

// Surface kinds that name an organizer. Event pages, press and person profiles
// are evidence about an organizer, never its identity.
const IDENTITY_SURFACE_KINDS = new Set(["organizerProfile", "eventCalendar", "socialProfile", "website"]);

// Hosts where one domain serves many unrelated accounts: the path, not the
// domain, identifies the organizer, so only the exact page can match.
const SHARED_HOSTS = new Set([
  "allevents.in",
  "beacons.ai",
  "bio.link",
  "bit.ly",
  "chat.whatsapp.com",
  "docs.google.com",
  "eventbrite.co.in",
  "eventbrite.com",
  "facebook.com",
  "fb.com",
  "forms.gle",
  "goo.gl",
  "google.com",
  "insider.in",
  "linkin.bio",
  "linktr.ee",
  "maps.google.com",
  "medium.com",
  "meetup.com",
  "sites.google.com",
  "t.me",
  "threads.net",
  "tiktok.com",
  "townscript.com",
  "twitter.com",
  "wa.me",
  "whatsapp.com",
  "x.com",
  "youtu.be",
  "youtube.com",
]);

const MIN_HANDLE_LENGTH = 4;

/** Lowercase, accent-free, punctuation-free text with single spaces. */
export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Name tokens in their original order, without stop words. */
export function nameTokens(value) {
  const text = normalizeText(value);
  return text ? text.split(" ").filter((token) => !STOP_WORDS.has(token)) : [];
}

/** Letters and digits only: "Mumbai-Run Club" and "MumbaiRunClub" agree. */
export function compactText(value) {
  return normalizeText(value).replace(/ /g, "");
}

/**
 * The comparable forms of one name: the compact key (stop words dropped,
 * word order kept) and the sorted token set.
 */
export function nameForm(value) {
  const tokens = nameTokens(value);
  if (tokens.length === 0) return null;
  return {
    text: normalizeText(value),
    key: tokens.join(""),
    tokens: [...new Set(tokens)].sort(),
  };
}

export function marketTokens(market) {
  return typeof market === "string" && market ? market.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean) : [];
}

/** A name with the market's words removed, so "Run Club Mumbai" compares to "Run Club". */
export function nameKeyWithout(form, tokensToDrop) {
  if (!form || tokensToDrop.length === 0) return null;
  const drop = new Set(tokensToDrop);
  const kept = nameTokens(form.text).filter((token) => !drop.has(token));
  if (kept.length === 0 || kept.length === nameTokens(form.text).length) return null;
  return kept.join("");
}

/** Jaccard overlap of two sorted token sets. */
export function tokenSimilarity(left, right) {
  if (!left?.length || !right?.length) return 0;
  const rightSet = new Set(right);
  const intersection = left.filter((token) => rightSet.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return intersection / union;
}

/** Sørensen–Dice overlap of character bigrams, for spelling variants. */
export function bigramSimilarity(left, right) {
  if (!left || !right || left.length < 2 || right.length < 2) return left && left === right ? 1 : 0;
  const counts = new Map();
  for (let index = 0; index < left.length - 1; index += 1) {
    const bigram = left.slice(index, index + 2);
    counts.set(bigram, (counts.get(bigram) ?? 0) + 1);
  }
  let shared = 0;
  for (let index = 0; index < right.length - 1; index += 1) {
    const bigram = right.slice(index, index + 2);
    const remaining = counts.get(bigram) ?? 0;
    if (remaining > 0) {
      shared += 1;
      counts.set(bigram, remaining - 1);
    }
  }
  return (2 * shared) / (left.length - 1 + right.length - 1);
}

/**
 * The identity key of one organizer link, or null when the link cannot
 * identify an organizer. A link may carry a normalizedKey computed upstream;
 * the URL is normalized again so both sides use this repository's normalizer.
 * A link known to be the organizer's own page reads an ambiguous Luma slug as
 * its calendar; any other URL (a nominator's seed) keeps it as an event.
 */
export function identityKeysForLink(link, {organizerRole = true} = {}) {
  const url = typeof link === "string" ? link : link?.url;
  const keys = [];
  const supplied = typeof link === "object" && link !== null ? link.normalizedKey : null;
  if (typeof supplied === "string" && isIdentityKeyString(supplied)) keys.push(supplied);
  if (typeof url === "string" && url.trim()) {
    let surface;
    try {
      surface = normalizeOrganizerSurfaceUrl(url);
      if (organizerRole) surface = surfaceForOrganizerPage(surface);
    } catch {
      surface = null;
    }
    const key = surface ? identityKeyForSurface(surface) : null;
    if (key) keys.push(key);
  }
  return [...new Set(keys)];
}

function identityKeyForSurface(surface) {
  if (!IDENTITY_SURFACE_KINDS.has(surface.surfaceKind)) return null;
  const host = surface.host.replace(/^m\./, "");
  if (SHARED_HOSTS.has(host)) {
    const path = new URL(surface.canonicalUrl).pathname;
    return path && path !== "/" ? `url:${surface.canonicalUrl}` : null;
  }
  return surface.normalizedKey && isIdentityKeyString(surface.normalizedKey) ? surface.normalizedKey : null;
}

/** A pre-computed key is identity-grade unless it names an event or a shared host. */
export function isIdentityKeyString(key) {
  if (typeof key !== "string" || !key || key.length > 2_100) return false;
  if (/:event:/.test(key)) return false;
  if (key.startsWith("domain:")) return !SHARED_HOSTS.has(key.slice("domain:".length).replace(/^m\./, ""));
  return true;
}

/** The platform a key belongs to: "instagram", "luma:calendar", "domain". */
export function keyNamespace(key) {
  if (key.startsWith("url:")) return null;
  const parts = key.split(":");
  return parts.length > 2 ? `${parts[0]}:${parts[1]}` : parts[0];
}

/**
 * The handle a key carries ("instagram:mumbairunclub" -> "mumbairunclub",
 * "domain:mumbairunclub.in" -> "mumbairunclub"), compacted for comparison
 * with a name. Shared-host URLs carry no handle.
 */
export function handleForKey(key) {
  if (key.startsWith("url:")) return null;
  const parts = key.split(":");
  let value = parts[parts.length - 1];
  if (parts[0] === "domain") value = value.replace(/^www\./, "").split(".")[0];
  const handle = compactText(value.split("/").pop());
  return handle.length >= MIN_HANDLE_LENGTH ? handle : null;
}

export function compactHandle(value) {
  const handle = compactText(String(value ?? "").replace(/^@/, ""));
  return handle.length >= MIN_HANDLE_LENGTH ? handle : null;
}

export function slugOrNull(value) {
  const text = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return text || null;
}
