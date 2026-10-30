import platformCatalog from "../platforms.json" with {type: "json"};
import {evidenceFieldsOf, shapeFingerprint, text} from "../schema-org.mjs";

// An Instagram profile is never fetched as a page. Meta's Business Discovery
// API returns a business or creator account's name, bio, website and recent
// captions (instagram-discovery.mjs), and the snapshot carries that response
// as embedded JSON. This adapter turns it into the organizer: the website and
// bio links are the organizer's own (sameAs). Caption links are only related:
// a bare Luma slug may be an event or a calendar, so intake follows them and
// lets each page say what it is. That is the sanctioned route past a Linktree
// or Beacons bio link, since captions often name the Luma or District page.

export const BUSINESS_DISCOVERY_JSON_ID = "instagram_business_discovery";
const MAX_SAME_AS = 20;
// Intake reads at most 12 pages, so captions get a few of them.
const MAX_RELATED_URLS = 6;
const urlPattern = /\bhttps?:\/\/[^\s<>"'`]+/giu;
// Captions often name an event platform without the scheme: "lu.ma/afterfly".
const bareHosts = platformCatalog.platforms.flatMap((platform) => platform.hosts)
  .map((host) => host.replace(/\./gu, "\\."));
const barePattern = new RegExp(`(?<![\\w@./-])(?:www\\.)?(?:${bareHosts.join("|")})\\/[^\\s<>"'\`]+`, "giu");
const trailingPunctuation = /[.,;:!?)\]}]+$/u;

export const instagramAdapter = Object.freeze({
  adapterId: "instagram",
  platform: "instagram",
  sourceProfileId: "instagram",
  extractionMethod: "instagram_business_discovery_v1",
  pageKinds: Object.freeze(["organizer_page"]),
  extract(snapshot) {
    const entry = (snapshot.embeddedJson ?? []).find((block) => block?.id === BUSINESS_DISCOVERY_JSON_ID);
    const account = entry?.value && typeof entry.value === "object" ? entry.value : null;
    const username = text(account?.username);
    if (!account || !username || !/^[a-z0-9._]{1,30}$/u.test(username)) {
      return {abstained: true, abstainReason: entry ? "template_drift" : "no_structured_data",
        templateFingerprint: shapeFingerprint("instagram-business-discovery", account)};
    }
    const media = Array.isArray(account.media?.data) ? account.media.data : [];
    const url = `https://www.instagram.com/${username}`;
    const organizer = {
      sourceEntityId: url,
      platform: "instagram",
      name: text(account.name) ?? username,
      description: text(account.biography),
      url,
      // Profile pictures are never published with a listing.
      imageUrl: null,
      locality: null,
      region: null,
      country: null,
      latitude: null,
      longitude: null,
      sameAs: linksIn([text(account.website), text(account.biography)]),
    };
    const relatedUrls = linksIn(media.map((item) => text(item?.caption)))
      .filter((link) => !organizer.sameAs.includes(link)).slice(0, MAX_RELATED_URLS);
    return {
      abstained: false,
      abstainReason: null,
      pageKind: "organizer_page",
      templateFingerprint: shapeFingerprint("instagram-business-discovery", account),
      organizers: [{...organizer, evidenceFields: evidenceFieldsOf(organizer)}],
      events: [],
      relatedUrls,
    };
  },
});

/** Links in the order they appear, without Instagram's own pages. */
export function linksIn(texts) {
  const links = [];
  for (const value of texts) {
    if (!value) continue;
    const matches = [...value.matchAll(urlPattern), ...value.matchAll(barePattern)]
      .sort((left, right) => left.index - right.index);
    for (const match of matches) {
      const candidate = match[0].replace(trailingPunctuation, "");
      const url = httpUrl(/^https?:\/\//iu.test(candidate) ? candidate : `https://${candidate}`);
      if (url && !/(?:^|\.)instagram\.com$/u.test(new URL(url).hostname)) links.push(url);
    }
  }
  return [...new Set(links)].slice(0, MAX_SAME_AS);
}

function httpUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
