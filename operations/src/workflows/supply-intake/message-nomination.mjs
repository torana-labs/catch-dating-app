import {normalizeOrganizerSurfaceUrl} from "./sources/surfaces.mjs";

// A nominator forwards organizers to Catch from their phone: a profile shared
// from Instagram, a Luma link, a website, or an @handle typed by hand. Each
// line that carries links names one organizer, so a single message can hold
// one organizer's several links or a list of organizers, one per line. Lines
// without links are notes for the organizer above them (or the first one).
// Parsing never fetches anything; the intake worker reads the pages later.

export const MAX_MESSAGE_NOMINATIONS = 10;
export const MAX_NOMINATION_URLS = 10;
export const MAX_NOMINATION_NOTES = 2000;

const urlPattern = /\bhttps?:\/\/[^\s<>"'`]+/giu;
// A bare host with a path, such as "lu.ma/afterfly" or "instagram.com/afterfly".
// The path is required so prose like "e.g." or "catch.app" is never a link.
const bareUrlPattern = /(?<![\w@./-])(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\/[^\s<>"'`]*/giu;
// Instagram handles: letters, digits, dots and underscores, at most 30. An
// address like name@example.com is not a handle.
const handlePattern = /(?<![\w.@])@([a-z0-9._]{1,30})(?![\w@])/giu;
const trailingPunctuation = /[.,;:!?)\]}]+$/u;

/**
 * @param {string | null | undefined} text
 * @returns {{nominations: Array<{urls: string[], notes: string | null}>,
 *   unreadable: string[], droppedNominations: number}}
 */
export function parseNominationMessage(text) {
  const lines = String(text ?? "").split(/\r?\n/u);
  const parsed = [];
  const unreadable = [];
  const looseNotes = [];
  for (const line of lines) {
    const {urls, rest, invalid} = readLine(line);
    unreadable.push(...invalid);
    if (urls.length > 0) {
      parsed.push({urls, notes: rest ? [...looseNotes.splice(0), rest] : looseNotes.splice(0)});
    } else if (rest) {
      (parsed.at(-1)?.notes ?? looseNotes).push(rest);
    }
  }
  if (parsed.length > 0 && looseNotes.length > 0) parsed[0].notes.push(...looseNotes);
  const nominations = parsed.slice(0, MAX_MESSAGE_NOMINATIONS).map(({urls, notes}) => ({
    urls: urls.slice(0, MAX_NOMINATION_URLS),
    notes: notes.length > 0 ? notes.join("\n").slice(0, MAX_NOMINATION_NOTES) : null,
  }));
  return {nominations, unreadable: [...new Set(unreadable)],
    droppedNominations: Math.max(0, parsed.length - MAX_MESSAGE_NOMINATIONS)};
}

function readLine(line) {
  // Links win over handles inside them (medium.com/@someone is one link), and
  // the organizer's links keep the order the nominator sent them in.
  const spans = [];
  const overlaps = (start, end) => spans.some((span) => start < span.end && span.start < end);
  for (const [pattern, toUrl] of [
    [urlPattern, (match) => match.replace(trailingPunctuation, "")],
    [bareUrlPattern, (match) => match.replace(trailingPunctuation, "")],
    [handlePattern, (_match, handle) => `https://www.instagram.com/${handle.replace(/\.+$/u, "")}`],
  ]) {
    for (const match of line.matchAll(pattern)) {
      const start = match.index;
      const end = start + match[0].length;
      if (!overlaps(start, end)) spans.push({start, end, url: toUrl(...match)});
    }
  }
  spans.sort((left, right) => left.start - right.start);
  const candidates = spans.map((span) => span.url);
  let rest = "";
  let cursor = 0;
  for (const span of spans) {
    rest += `${line.slice(cursor, span.start)} `;
    cursor = span.end;
  }
  rest += line.slice(cursor);
  const seen = new Set();
  const urls = [];
  const invalid = [];
  for (const candidate of candidates) {
    let surface;
    try {
      surface = normalizeOrganizerSurfaceUrl(candidate);
    } catch {
      invalid.push(candidate.slice(0, 200));
      continue;
    }
    const key = surface.normalizedKey ?? surface.canonicalUrl;
    if (seen.has(key)) continue;
    seen.add(key);
    urls.push(surface.canonicalUrl);
  }
  return {urls, invalid, rest: rest.replace(/\s+/gu, " ").trim()};
}
