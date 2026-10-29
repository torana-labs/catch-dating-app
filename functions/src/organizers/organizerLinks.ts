import {HttpsError} from "firebase-functions/v2/https";
import type {
  AdminUpdateOrganizerDetailsCallablePayload,
} from "../shared/generated/adminUpdateOrganizerDetailsCallablePayload";
import type {OrganizerDocument} from "../shared/generated/organizerDocument";
import type {
  OrganizerPublicPageDocument,
} from "../shared/generated/organizerPublicPageDocument";
import {operatorWordingIn} from "./organizerPublicContent";

/**
 * Owner links on the organizer page (CAT-254). Staff save them through
 * adminUpdateOrganizerDetails; the page read model projects the live ones.
 * Every URL passes the allow policy below before it is stored, and again when
 * the page is built, so the page never sends a visitor somewhere the tile
 * does not name.
 */
export type OwnerLinkInput = NonNullable<
  AdminUpdateOrganizerDetailsCallablePayload["fields"]["ownerLinks"]
>[number];
export type StoredOwnerLink = NonNullable<
  OrganizerDocument["ownerLinks"]
>[number];
export type PageOwnerLink = OrganizerPublicPageDocument["links"][number];

export type OwnerLinkUrlProblem =
  | "not_https"
  | "credentials"
  | "port"
  | "not_public_host"
  | "shortener"
  | "too_long";

const maxUrlLength = 2048;

const problemDetail: Record<OwnerLinkUrlProblem, string> = {
  not_https: "must be a complete https:// address",
  credentials: "must not carry a username or password",
  port: "must not name a port",
  not_public_host: "must point at a public website",
  shortener: "must not use a link shortener; paste the full address",
  too_long: `must be ${maxUrlLength} characters or fewer`,
};

// Shorteners hide the destination the tile names, so the page refuses them.
const shortenerHosts = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly",
  "rebrand.ly", "cutt.ly", "shorturl.at", "tiny.cc", "rb.gy", "s.id",
]);

const privateSuffix =
  /(?:^|\.)(?:localhost|local|internal|lan|home|test|example|invalid)$/u;

/**
 * Returns why a URL may not be an owner link, or null when it may.
 * @param {string} raw Candidate URL.
 * @return {OwnerLinkUrlProblem | null} The first policy problem.
 */
export function ownerLinkUrlProblem(raw: string): OwnerLinkUrlProblem | null {
  if (raw.length > maxUrlLength) return "too_long";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "not_https";
  }
  if (url.protocol !== "https:") return "not_https";
  if (url.username || url.password) return "credentials";
  if (url.port) return "port";
  const host = url.hostname.toLowerCase().replace(/\.$/u, "");
  if (!isPublicHostName(host)) return "not_public_host";
  if (shortenerHosts.has(host.replace(/^www\./u, ""))) return "shortener";
  if (url.href.length > maxUrlLength) return "too_long";
  return null;
}

function isPublicHostName(host: string): boolean {
  if (!host.includes(".")) return false;
  // IPv6 literals keep their brackets; dotted digits are IPv4 literals.
  if (host.startsWith("[") || /^[\d.]+$/u.test(host)) return false;
  return !privateSuffix.test(host);
}

/**
 * Checks an admin's owner links and returns them as the organizer document
 * stores them, in the order given. URLs are stored as parsed, so the address
 * the policy checked is the address the page links to.
 * @param {OwnerLinkInput[]} links Validated payload links.
 * @param {function(Date): unknown} toTimestamp Firestore timestamp factory.
 * @return {unknown[]} Links for organizers/{id}.ownerLinks.
 */
export function storedOwnerLinks(
  links: readonly OwnerLinkInput[],
  toTimestamp: (date: Date) => unknown
): unknown[] {
  const ids = new Set<string>();
  const urls = new Set<string>();
  return links.map((link, index) => {
    const field = `Link ${index + 1}`;
    if (ids.has(link.id)) {
      throw new HttpsError("invalid-argument", `${field} repeats an id.`);
    }
    ids.add(link.id);
    const problem = ownerLinkUrlProblem(link.url);
    if (problem) {
      throw new HttpsError("invalid-argument",
        `${field}'s address ${problemDetail[problem]}.`);
    }
    const url = new URL(link.url).href;
    if (urls.has(url)) {
      throw new HttpsError("invalid-argument",
        `${field} repeats an address already on the page.`);
    }
    urls.add(url);
    const label = link.label.trim();
    const subtitle = link.subtitle?.trim() || null;
    if (!label) {
      throw new HttpsError("invalid-argument", `${field} needs a label.`);
    }
    const wording = operatorWordingIn(label) ?? operatorWordingIn(subtitle);
    if (wording) {
      // Same code as assertOrganizerPublicContent for the same rule.
      throw new HttpsError("failed-precondition",
        `${field} describes Catch's own workflow ("${wording}"). ` +
        "Write it for visitors.");
    }
    const showUntil = link.showUntil ? new Date(link.showUntil) : null;
    if (showUntil && Number.isNaN(showUntil.getTime())) {
      throw new HttpsError("invalid-argument",
        `${field} has an invalid show-until time.`);
    }
    return {
      id: link.id,
      label,
      subtitle,
      url,
      icon: link.icon ?? null,
      pinned: link.pinned,
      showUntil: showUntil ? toTimestamp(showUntil) : null,
    };
  });
}

/**
 * The owner links the page shows: still live at build time, pinned first,
 * otherwise in the owner's order. Only the contract's fields are copied, so
 * nothing but the owner's own words reaches the page (the CAT-247 rule keeps
 * dating framing off public pages). Stored links that no longer pass the URL
 * policy are left out rather than failing the whole page.
 * @param {unknown} raw organizers/{id}.ownerLinks.
 * @param {number} now Build time in epoch milliseconds.
 * @return {PageOwnerLink[]} The page's links.
 */
export function pageOwnerLinks(raw: unknown, now: number): PageOwnerLink[] {
  if (!Array.isArray(raw)) return [];
  const live = raw.filter((link): link is StoredOwnerLink =>
    isStoredOwnerLink(link) && ownerLinkUrlProblem(link.url) === null &&
    (link.showUntil === null || millisOf(link.showUntil) > now));
  return [
    ...live.filter((link) => link.pinned),
    ...live.filter((link) => !link.pinned),
  ].map((link) => ({
    id: link.id,
    label: link.label,
    subtitle: link.subtitle ?? null,
    url: link.url,
    icon: link.icon ?? null,
    pinned: link.pinned,
    showUntil: link.showUntil ?? null,
  }));
}

/**
 * Owner links for the admin editor, expired ones included, with ISO
 * show-until times.
 * @param {unknown} raw organizers/{id}.ownerLinks.
 * @return {OwnerLinkInput[]} Links as the editor sends them back.
 */
export function adminOwnerLinks(raw: unknown): OwnerLinkInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isStoredOwnerLink).map((link) => ({
    id: link.id,
    label: link.label,
    subtitle: link.subtitle ?? null,
    url: link.url,
    icon: link.icon ?? null,
    pinned: link.pinned,
    showUntil: link.showUntil ?
      new Date(millisOf(link.showUntil)).toISOString() : null,
  }));
}

function isStoredOwnerLink(value: unknown): value is StoredOwnerLink {
  if (!value || typeof value !== "object") return false;
  const link = value as Partial<StoredOwnerLink>;
  return typeof link.id === "string" && typeof link.label === "string" &&
    typeof link.url === "string" && typeof link.pinned === "boolean" &&
    (link.showUntil === null || Number.isFinite(millisOf(link.showUntil)));
}

function millisOf(value: unknown): number {
  if (value && typeof value === "object") {
    const time = value as {
      toMillis?: () => number;
      _seconds?: number;
      seconds?: number;
    };
    if (typeof time.toMillis === "function") return time.toMillis();
    const seconds = time._seconds ?? time.seconds;
    if (typeof seconds === "number") return seconds * 1000;
  }
  return Number.NaN;
}
