/* eslint-disable max-len */
import {
  ADAPTER_PLATFORMS,
  CLOSED_SITES,
  FORM_PROVIDERS,
  matchesHost,
  UNREAD_PLATFORMS,
  type DraftLinkClassification,
} from "../instantDrafts/links";

// What organizer.import-from-link can promise for an organizer's link. Supply
// Intake reads Luma, District and Urbanaut pages with its own adapters
// (instant). An Instagram profile goes through Business Discovery, and any
// other public page (a Linktree, the organizer's own site) through the
// generic page reader, one hop to the event pages it links: best effort.
// Closed, signed-in, chat and short links, posts, forms and platforms with
// no adapter are never read by the tool.

const LINK_IN_BIO = [
  {id: "linktree", hosts: ["linktr.ee"]},
  {id: "beacons", hosts: ["beacons.ai"]},
];

/** Pure: the support level for one organizer link. */
export function classifyOrganizerLink(url: URL): DraftLinkClassification {
  const host = url.hostname.toLowerCase().replace(/^www\./u, "");
  const closed = CLOSED_SITES.find((site) => matchesHost(host, site.hosts));
  if (closed) return {provider: null, support: "staff_follow_up", reason: closed.reason};
  if (matchesHost(host, ["instagram.com"])) {
    const first = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (!first || ["p", "reel", "reels", "stories", "explore", "tv"].includes(first)) {
      return {provider: "instagram", support: "staff_follow_up", reason: "instagram_not_a_profile"};
    }
    return {provider: "instagram", support: "best_effort", reason: "instagram_business_discovery"};
  }
  const adapter = ADAPTER_PLATFORMS.find((platform) => matchesHost(host, platform.hosts));
  if (adapter) return {provider: adapter.id, support: "instant", reason: null};
  const unread = UNREAD_PLATFORMS.find((platform) => matchesHost(host, platform.hosts));
  if (unread) return {provider: unread.id, support: "staff_follow_up", reason: "no_adapter"};
  if (FORM_PROVIDERS.some((provider) => matchesHost(host, provider.hosts))) {
    return {provider: null, support: "staff_follow_up", reason: "form_link"};
  }
  const bio = LINK_IN_BIO.find((site) => matchesHost(host, site.hosts));
  if (bio) return {provider: bio.id, support: "best_effort", reason: "link_in_bio"};
  return {provider: null, support: "best_effort", reason: "organizer_website"};
}

/** The handle of an instagram.com profile link, or null. */
export function instagramHandle(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!matchesHost(parsed.hostname.toLowerCase().replace(/^www\./u, ""), ["instagram.com"])) return null;
    const handle = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    return /^[A-Za-z0-9._]{1,30}$/u.test(handle) ? handle : null;
  } catch {
    return null;
  }
}
