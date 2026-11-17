/* eslint-disable max-len */

// What the website's instant draft tool tells a submitter about a link before
// Supply Intake reads it. The classification only sets expectations and the
// staff follow-up reason; Supply Intake's own adapters, the acquisition
// policy (CAT-266 page fetching, robots.txt, the monthly allowance) and
// Instagram Business Discovery decide what is actually read. Nothing here
// fetches a page.

export type DraftRequestKind = "event_link" | "form_link";
export type LinkSupport = "instant" | "best_effort" | "staff_follow_up";

export interface DraftLinkClassification {
  /** The platform id, as Supply Intake's platforms.json names it, or a form provider; null for an unknown site. */
  provider: string | null;
  support: LinkSupport;
  /** Why a link needs a person or is best effort; null when an adapter reads it. */
  reason: string | null;
}

/**
 * Event platforms with a deterministic Supply Intake page adapter. Kept equal
 * to the adapter rows of operations/.../sources/platforms.json by links.test.ts.
 */
export const ADAPTER_PLATFORMS: ReadonlyArray<{id: string; hosts: readonly string[]}> = [
  {id: "luma", hosts: ["luma.com", "lu.ma"]},
  {id: "district", hosts: ["district.in"]},
  {id: "urbanaut", hosts: ["urbanaut.app"]},
];

/** Platforms Supply Intake recognizes but has no adapter for yet (platforms.json adapterId null). */
export const UNREAD_PLATFORMS: ReadonlyArray<{id: string; hosts: readonly string[]}> = [
  {id: "partiful", hosts: ["partiful.com"]},
  {id: "book_my_show", hosts: ["bookmyshow.com"]},
  {id: "sort_my_scene", hosts: ["sortmyscene.com"]},
];

/**
 * Public form providers. None can be imported as a form definition yet: a
 * Google Form's questions sit in an inline script rather than page markup,
 * and every provider's API needs the form owner's credentials.
 */
export const FORM_PROVIDERS: ReadonlyArray<{id: string; hosts: readonly string[]; path?: RegExp}> = [
  {id: "google_forms", hosts: ["docs.google.com"], path: /^\/forms\//u},
  {id: "google_forms", hosts: ["forms.gle"]},
  {id: "typeform", hosts: ["typeform.com"]},
  {id: "tally", hosts: ["tally.so"]},
  {id: "jotform", hosts: ["jotform.com"]},
  {id: "microsoft_forms", hosts: ["forms.office.com", "forms.microsoft.com"]},
  {id: "airtable", hosts: ["airtable.com"]},
];

/**
 * Sites Supply Intake never reads for an event: closed or signed-in
 * surfaces, chat invitations, and shortened links whose target is unknown.
 * Instagram profiles are read through Business Discovery, never fetched.
 */
const CLOSED_SITES: ReadonlyArray<{reason: string; hosts: readonly string[]}> = [
  {reason: "signed_in_site", hosts: ["facebook.com", "fb.me", "fb.com", "linkedin.com", "x.com", "twitter.com"]},
  {reason: "chat_invite", hosts: ["wa.me", "whatsapp.com", "t.me", "telegram.me", "discord.gg", "discord.com"]},
  {reason: "short_link", hosts: ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "rb.gy", "cutt.ly"]},
];

/** Throws when the link is not a public web address the tool can accept. */
export function parseDraftLink(value: string): URL {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new InvalidDraftLink("That link is not a web address.");
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password ||
      !url.hostname.includes(".") || /^[0-9.]+$/u.test(url.hostname) || url.hostname.includes(":")) {
    throw new InvalidDraftLink("Send a public https link.");
  }
  return url;
}

export class InvalidDraftLink extends Error {}

/** Pure: what the website can promise for this link. */
export function classifyDraftLink(requestKind: DraftRequestKind, url: URL): DraftLinkClassification {
  const host = url.hostname.toLowerCase().replace(/^www\./u, "");
  const form = FORM_PROVIDERS.find((provider) => matchesHost(host, provider.hosts) &&
    (!provider.path || provider.path.test(url.pathname)));
  if (requestKind === "form_link") {
    // Slice 2 imports form definitions; until then a person builds the form.
    return form ? {provider: form.id, support: "staff_follow_up", reason: "form_import_not_available"} :
      {provider: null, support: "staff_follow_up", reason: "not_a_known_form_provider"};
  }
  if (form) return {provider: form.id, support: "staff_follow_up", reason: "form_link_sent_as_event"};
  const adapter = ADAPTER_PLATFORMS.find((platform) => matchesHost(host, platform.hosts));
  if (adapter) return {provider: adapter.id, support: "instant", reason: null};
  const unread = UNREAD_PLATFORMS.find((platform) => matchesHost(host, platform.hosts));
  if (unread) return {provider: unread.id, support: "staff_follow_up", reason: "platform_adapter_missing"};
  if (matchesHost(host, ["instagram.com"])) {
    const first = url.pathname.split("/").filter(Boolean)[0] ?? "";
    // A profile goes to Business Discovery (when this environment has its
    // token); a post, reel or story is not a page Supply Intake reads.
    return /^[A-Za-z0-9._]{1,30}$/u.test(first) && !["p", "reel", "reels", "stories", "tv", "explore"].includes(first) ?
      {provider: "instagram", support: "best_effort", reason: "instagram_business_discovery"} :
      {provider: "instagram", support: "staff_follow_up", reason: "instagram_post_not_read"};
  }
  const closed = CLOSED_SITES.find((site) => matchesHost(host, site.hosts));
  if (closed) return {provider: null, support: "staff_follow_up", reason: closed.reason};
  // An organizer's own website: read only where robots.txt allows, and only
  // events it marks up with schema.org.
  return {provider: null, support: "best_effort", reason: "generic_event_markup"};
}

function matchesHost(host: string, hosts: readonly string[]): boolean {
  return hosts.some((candidate) => host === candidate || host.endsWith(`.${candidate}`));
}
