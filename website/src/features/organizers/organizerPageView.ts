import {catchAvatarInitialsOf, catchFormatAccentOf, type CatchGround, type CatchIconName} from "@catch/web-ui";
import {organizerPageCopy as copy} from "../../content/organizerPage";
import type {OrganizerPageEvent, OrganizerPageRecord, OrganizerPageReview} from "./organizerPage";
import {brand} from "@catch/brand";

/** `claimed` is the organiser's own page; `generated` is built from public pages before a claim. */
export type OrganizerPageKind = "claimed" | "generated";
type Accent = Exclude<CatchGround, "white" | "paper" | "ink">;

export interface OrganizerEventView {
  key: string;
  eventId: string;
  source: OrganizerPageEvent["source"];
  /** Catch events open their event page; imported events open where they are sold. */
  href: string;
  title: string;
  date: {dateTime: string; day: string; month: string; weekday: string};
  ground: CatchGround;
  /** "6:30 AM · Carter Road jetty" */
  detail: string;
  sourceLabel: string;
  sourceAccent: Accent;
  price: string;
  note: string;
  action: string;
  actionPrimary: boolean;
}

export interface OrganizerNextUpView extends OrganizerEventView {
  label: string;
  when: string;
  meta: string;
  nextAction: string;
}

export interface OrganizerLinkView {
  key: string;
  href: string;
  title: string;
  subtitle?: string;
  pinned: boolean;
  /** The CatchIcon role for where the link goes. */
  icon: CatchIconName;
  /** Owner links count as link clicks against their id (CAT-254). */
  analytics: {eventName: "contactClick" | "outboundClick"; source: string} | {eventName: "linkClick"; source: string; linkId: string};
}

export interface OrganizerMomentView {
  key: string;
  title: string;
  caption?: string;
  figure?: string;
  imageUrl?: string;
  imageAlt?: string;
  ground: CatchGround;
  placeholder?: boolean;
}

export interface OrganizerReviewView {
  key: string;
  name: string;
  initials: string;
  ground: CatchGround;
  meta: string;
  rating: number;
  ratingLabel: string;
  verified: boolean;
  body: string;
  reply?: {author: string; text: string; verb: string};
  note?: string;
}

export interface OrganizerPageView {
  kind: OrganizerPageKind;
  organizerId: string;
  name: string;
  shareUrl: string;
  header: {
    coverUrl: string | null;
    coverAlt?: string;
    accent: Accent;
    monogram: string;
    monogramGround: CatchGround;
    verified: boolean;
    tag?: string;
    headline: string;
    meta: string;
    stats: {label: string; value: string}[];
  };
  nextUp: OrganizerNextUpView | null;
  links: OrganizerLinkView[];
  events: {note: string; rows: OrganizerEventView[]};
  moments: {title: string; tiles: OrganizerMomentView[]};
  reviews: {
    readable: boolean;
    average: string;
    countLabel: string;
    distribution: {stars: 1 | 2 | 3 | 4 | 5; count: number; label: string}[];
    policy: string;
    items: OrganizerReviewView[];
  };
  about: {
    text: string;
    formats: string;
    facts: {label: string; value: string}[];
    host: {name: string; role: string; initials: string} | null;
  };
  claim: null | {
    href: string | null;
    pending: boolean;
    followers: string | null;
    reviewers: string | null;
    reviewVerb: string;
    built: string;
  };
  footer: {line: string; link: string; href: string};
}

const defaultZone = "Asia/Kolkata";
const siteOrigin = brand.web.origin;
// Sources that describe how a listing was seeded, not a page a visitor can open.
const internalSourceTypes = new Set(["user_supplied", "embedded_event_data", "catch_demo"]);
// Review notes from listing intake that are not facts about the organiser.
const internalFactLabels = new Set(["claim state", "indexing", "city evidence", "location target"]);
const reviewGrounds: readonly CatchGround[] = ["pink", "indigo", "mint", "yellow", "coral"];
const reviewLimit = 6;
const factLimit = 6;

export function organizerPageKind(record: OrganizerPageRecord): OrganizerPageKind {
  const owned = record.identity.verified || record.claim.state === "claimed" || record.claim.state === "verified" ||
    record.profile.listingVariant === "appCreatedOrganizer";
  return owned ? "claimed" : "generated";
}

/** Everything the organiser page shows, worked out once from its record at the read time. */
export function organizerPageView(record: OrganizerPageRecord, readAt: number): OrganizerPageView {
  const kind = organizerPageKind(record);
  const generated = kind === "generated";
  const allEvents = [...record.upcomingEvents, ...record.pastMoments];
  const accent = organizerAccent(allEvents);
  const sourceNames = publicSourceNames(record);
  const rows = record.upcomingEvents.map((item, index) => eventView(item, index, kind, accent));
  const average = averageOf(record);
  const reviewCount = record.reviewSummary.count;
  const coverEvent = allEvents.find((item) => item.source === "catch" && item.event.photoUrl?.trim());
  const pastCount = record.pastMoments.length;
  const titles = new Map(allEvents.map((item) => [item.eventId, item.event.title]));

  const stats = [
    ...(record.followerCount > 0 ? [{
      value: record.followerCount.toLocaleString("en-IN"),
      label: generated ? copy.stats.waiting : copy.stats.followers(record.followerCount),
    }] : []),
    ...(record.reviewSummary.readState === "enabled" && reviewCount > 0 && average ?
      [{value: average, label: copy.stats.reviews(reviewCount)}] : []),
    ...(!generated && pastCount > 0 ? [{value: pastCount >= 24 ? "24+" : String(pastCount), label: copy.stats.hosted(pastCount)}] : []),
  ];

  return {
    kind,
    organizerId: record.organizerId,
    name: record.identity.name,
    shareUrl: `${siteOrigin}${record.path}`,
    header: {
      coverUrl: coverEvent?.source === "catch" ? coverEvent.event.photoUrl ?? null : null,
      coverAlt: coverEvent ? coverEvent.event.title : undefined,
      accent,
      monogram: record.identity.logo.text || catchAvatarInitialsOf(record.identity.name),
      monogramGround: generated ? "white" : accent,
      verified: record.identity.verified,
      ...(generated ? {tag: copy.generatedTag} : {}),
      headline: record.identity.headline,
      meta: [placeOf(record), generated ? copy.summarisedFrom(sourceNames) : null].filter(Boolean).join(" · "),
      stats,
    },
    nextUp: rows[0] ? nextUpView(rows[0], record.upcomingEvents[0], readAt) : null,
    links: linksOf(record, readAt),
    events: {
      note: generated ? copy.eventsNote.generated(eventSourceNames(record)) : copy.eventsNote.claimed(eventSourceNames(record)),
      rows,
    },
    moments: {title: generated ? copy.momentsTitle.generated : copy.momentsTitle.claimed, tiles: momentsOf(record, kind)},
    reviews: {
      readable: record.reviewSummary.readState === "enabled",
      average: average ?? "–",
      countLabel: copy.reviewCount(reviewCount),
      distribution: ([5, 4, 3, 2, 1] as const).map((stars) => {
        const count = record.reviewSummary.distribution[String(stars) as "1"];
        return {stars, count, label: copy.starsRow(stars, count)};
      }),
      policy: generated ? copy.reviewPolicy.generated : copy.reviewPolicy.claimed,
      items: record.latestReviews.slice(0, reviewLimit).map((review, index) =>
        reviewView(review, index, titles, generated ? record.identity.name : null, readAt)),
    },
    about: {
      text: record.identity.description,
      formats: record.identity.formats.join(" · "),
      facts: record.profile.facts
        .filter((fact) => !internalFactLabels.has(fact.label.trim().toLowerCase()))
        .filter((fact) => record.reviewSummary.readState === "enabled" || !/(?:rating|review)/iu.test(`${fact.label} ${fact.value}`))
        .slice(0, factLimit),
      host: record.profile.host ? {
        name: record.profile.host.name,
        role: record.profile.host.role,
        initials: catchAvatarInitialsOf(record.profile.host.name),
      } : null,
    },
    claim: generated ? {
      href: record.claim.claimable && record.claim.state === "unclaimed" ? claimHrefOf(record) : null,
      pending: record.claim.state === "claimPending",
      followers: record.followerCount > 0 ? copy.claim.people(record.followerCount) : null,
      reviewers: reviewCount > 0 ? copy.claim.people(reviewCount) : null,
      reviewVerb: reviewCount === 1 ? copy.claim.reviewer : copy.claim.reviewers,
      built: copy.claim.built(sourceNames),
    } : null,
    footer: generated ?
      {line: copy.footer.generated(sourceNames), link: copy.footer.generatedLink, href: "/help/"} :
      {line: copy.footer.claimed, link: copy.footer.claimedLink, href: "/host/"},
  };
}

/**
 * The claim flow on /claim/. Listings still carry an in-page `#claim` anchor
 * from the old profile; until they point into /claim/ (CAT-256), link by id.
 */
function claimHrefOf(record: OrganizerPageRecord): string {
  return record.claim.href.startsWith("/claim/") ? record.claim.href :
    `/claim/?listing=${encodeURIComponent(record.organizerId)}`;
}

function eventView(item: OrganizerPageEvent, index: number, kind: OrganizerPageKind, accent: Accent): OrganizerEventView {
  const zone = item.event.timezone ?? defaultZone;
  const start = new Date(item.event.startTime);
  const date = {
    dateTime: dayKey(start, zone),
    day: format(start, zone, {day: "numeric"}),
    month: format(start, zone, {month: "short"}),
    weekday: format(start, zone, {weekday: "short"}),
  };
  const detail = [format(start, zone, {hour: "numeric", minute: "2-digit", hour12: true}), item.event.location]
    .filter(Boolean).join(" · ");
  const shared = {key: `${item.source}-${item.eventId}`, eventId: item.eventId, source: item.source, title: item.event.title,
    date, detail, price: item.event.priceLabel};
  if (item.source === "external") {
    const free = /^(free|₹\s*0)$/iu.test(item.event.priceLabel.trim());
    return {...shared, href: item.booking.url, ground: kind === "generated" ? "paper" : "indigo",
      sourceLabel: item.booking.label, sourceAccent: "indigo",
      note: free ? copy.registerOn(item.booking.label) : copy.ticketsOn(item.booking.label),
      action: copy.tickets, actionPrimary: false};
  }
  const {event, booking} = item;
  const capacity = event.capacityLimit > 0;
  const bookable = event.registrationMode !== "closed" && (!capacity || booking.spotsLeft > 0);
  const note = !capacity || event.registrationMode === "closed" ? "" : booking.spotsLeft > 0 ? copy.spotsLeft(booking.spotsLeft) :
    event.waitlistAvailable ? copy.waitlist : copy.full;
  return {...shared, href: booking.path,
    ground: kind === "generated" ? "paper" : index === 0 ? catchFormatAccentOf(event.activityKind) ?? accent : "paper",
    sourceLabel: copy.onCatch, sourceAccent: "coral", note,
    action: bookable ? copy.book : copy.details, actionPrimary: bookable};
}

function nextUpView(row: OrganizerEventView, item: OrganizerPageEvent, readAt: number): OrganizerNextUpView {
  const zone = item.event.timezone ?? defaultZone;
  const start = new Date(item.event.startTime);
  const days = Math.round((Date.parse(dayKey(start, zone)) - Date.parse(dayKey(new Date(readAt), zone))) / 86_400_000);
  const when = `${row.date.weekday} ${row.date.day} ${row.date.month}, ${format(start, zone, {hour: "numeric", minute: "2-digit", hour12: true})}`;
  return {
    ...row,
    label: copy.nextUp(copy.countdown(days)),
    when: [when, item.event.location.split(",")[0]?.trim()].filter(Boolean).join(" · "),
    meta: [row.price, row.note].filter(Boolean).join(" · "),
    nextAction: row.source === "external" ? copy.getTickets : row.action,
  };
}

function linksOf(record: OrganizerPageRecord, readAt: number): OrganizerLinkView[] {
  const owner = record.links
    .filter((link) => !link.showUntil || Date.parse(link.showUntil) >= readAt)
    .map((link): OrganizerLinkView => ({
      key: link.id,
      href: link.url,
      title: link.label,
      subtitle: link.subtitle ?? (link.pinned && link.showUntil ?
        copy.pinnedUntil(format(new Date(link.showUntil), defaultZone, {day: "numeric", month: "short"})) : hostOf(link.url)),
      pinned: link.pinned,
      icon: link.icon ? ownerLinkIcons[link.icon] : iconFor(link.url),
      analytics: {eventName: "linkClick", source: "organizer_page", linkId: link.id},
    }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  if (owner.length) return owner;
  const seen = new Set<string>();
  return record.profile.sources.flatMap((source, index): OrganizerLinkView[] => {
    const href = source.href?.trim();
    if (!href || !href.startsWith("https://") || internalSourceTypes.has(source.type) || seen.has(href)) return [];
    seen.add(href);
    return [{
      key: `source-${index}`,
      href,
      title: source.label,
      subtitle: hostOf(href),
      pinned: false,
      icon: iconFor(href),
      analytics: {eventName: source.type === "socialProfile" ? "contactClick" : "outboundClick", source: `source_${source.type}`},
    }];
  });
}

function momentsOf(record: OrganizerPageRecord, kind: OrganizerPageKind): OrganizerMomentView[] {
  const all = [...record.upcomingEvents, ...record.pastMoments];
  const stats: OrganizerMomentView[] = [];
  const zoneOf = (item: OrganizerPageEvent) => item.event.timezone ?? defaultZone;
  // A generated page counts what it found; a claimed page counts what it has hosted.
  const counted = kind === "generated" ? all : record.pastMoments;
  if (counted.length) {
    const earliest = [...counted].sort((a, b) => Date.parse(a.event.startTime) - Date.parse(b.event.startTime))[0];
    const external = counted.every((item) => item.source === "external") ? eventSourceNames(record) : [];
    stats.push({key: "count", figure: kind === "claimed" && counted.length >= 24 ? "24+" : String(counted.length),
      title: external.length === 1 ? copy.moments.eventsOn(external[0]) : copy.moments.events,
      caption: copy.moments.since(format(new Date(earliest.event.startTime), zoneOf(earliest), {month: "long", year: "numeric"})),
      ground: kind === "generated" ? "paper" : "yellow"});
  }
  const turnout = record.pastMoments.flatMap((item) => item.source === "catch" && item.event.checkedInCount > 0 ?
    [item.event.checkedInCount] : []);
  if (turnout.length) {
    stats.push({key: "turnout", figure: String(Math.round(turnout.reduce((sum, count) => sum + count, 0) / turnout.length)),
      title: copy.moments.average, caption: copy.moments.averageNote, ground: "mint"});
  }
  if (all.length >= 2) {
    const day = mostCommon(all.map((item) => format(new Date(item.event.startTime), zoneOf(item), {weekday: "short"})));
    const time = mostCommon(all.map((item) =>
      format(new Date(item.event.startTime), zoneOf(item), {hour: "numeric", minute: "2-digit", hour12: true})));
    if (day) stats.push({key: "day", figure: day, title: copy.moments.usualDay, caption: time ? copy.moments.starts(time) : undefined, ground: "paper"});
  }
  const prices = all.map((item) => priceOf(item.event.priceLabel)).filter((price): price is number => price !== null);
  if (prices.length >= 2) {
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const free = prices.filter((price) => price === 0).length * 2 > prices.length;
    stats.push({key: "price", figure: low === high ? priceLabel(low) : `₹${low}–${high.toLocaleString("en-IN")}`,
      title: copy.moments.usualPrice, caption: free ? copy.moments.mostlyFree : undefined, ground: "paper"});
  }
  if (kind === "generated") {
    return [...stats.slice(0, 3), {key: "photos", title: copy.moments.photosTitle, caption: copy.moments.photosCaption, ground: "white", placeholder: true}];
  }
  const photos = record.pastMoments.flatMap((item): OrganizerMomentView[] => {
    if (item.source !== "catch" || !item.event.photoUrl?.trim()) return [];
    const zone = zoneOf(item);
    return [{key: `photo-${item.eventId}`, title: copy.moments.photoTitle(item.event.title, format(new Date(item.event.startTime), zone, {month: "long"})),
      caption: item.event.checkedInCount > 0 ? copy.moments.went(item.event.checkedInCount) : item.event.location,
      imageUrl: item.event.photoUrl, imageAlt: item.event.title, ground: "ink"}];
  }).slice(0, 2);
  // Photos and figures alternate, as the board lays them out.
  const tiles: OrganizerMomentView[] = [];
  for (let index = 0; tiles.length < 4 && (index < photos.length || index < stats.length); index += 1) {
    if (photos[index]) tiles.push(photos[index]);
    if (stats[index] && tiles.length < 4) tiles.push(stats[index]);
  }
  return tiles;
}

function reviewView(review: OrganizerPageReview, index: number, titles: ReadonlyMap<string, string>,
  unclaimedName: string | null, readAt: number): OrganizerReviewView {
  const name = review.isAnonymous ? copy.anonymous : review.reviewerName;
  const event = review.eventId ? titles.get(review.eventId) : undefined;
  return {
    key: review.id ?? `review-${index}`,
    name,
    initials: catchAvatarInitialsOf(name),
    ground: reviewGrounds[[...name].reduce((sum, letter) => sum + (letter.codePointAt(0) ?? 0), 0) % reviewGrounds.length],
    meta: [event, relativeTime(Date.parse(review.createdAt), readAt)].filter(Boolean).join(" · "),
    rating: review.rating,
    ratingLabel: copy.ratingLabel(review.rating),
    verified: review.verificationStatus === "verified",
    body: review.comment,
    ...(review.ownerResponse ? {reply: {author: review.ownerResponse.hostName, text: review.ownerResponse.message, verb: copy.replied}} :
      unclaimedName ? {note: copy.cannotReply(unclaimedName)} : {}),
  };
}

/** The verified average when there is one; otherwise every review's, which the policy line labels unverified. */
function averageOf(record: OrganizerPageRecord): string | null {
  const {rating, distribution, count} = record.reviewSummary;
  if (rating !== null) return rating.toFixed(1);
  if (!count) return null;
  const total = ([1, 2, 3, 4, 5] as const).reduce((sum, stars) => sum + stars * distribution[String(stars) as "1"], 0);
  return (total / count).toFixed(1);
}

function organizerAccent(events: readonly OrganizerPageEvent[]): Accent {
  const accents = events.flatMap((item) => catchFormatAccentOf(item.event.activityKind) ?? []);
  return (mostCommon(accents) as Accent | null) ?? "coral";
}

function placeOf(record: OrganizerPageRecord): string {
  const location = record.profile.facts.find((fact) => fact.label.trim().toLowerCase() === "location")?.value;
  return location?.trim() || record.identity.city;
}

/** Named public pages the generated page was built from, such as Luma and Instagram. */
function publicSourceNames(record: OrganizerPageRecord): string[] {
  const hosts = [
    ...record.profile.sources.map((source) => source.href ?? ""),
    ...record.profile.facts.map((fact) => `${fact.label} ${fact.value}`),
    ...[...record.upcomingEvents, ...record.pastMoments].map((item) => item.source === "external" ? item.booking.url : ""),
  ].join(" ").toLowerCase();
  return [["Luma", /\bluma\b|lu\.ma/u], ["Instagram", /instagram/u]].flatMap(([name, pattern]) =>
    (pattern as RegExp).test(hosts) ? [name as string] : []);
}

function eventSourceNames(record: OrganizerPageRecord): string[] {
  return [...new Set([...record.upcomingEvents, ...record.pastMoments]
    .flatMap((item) => item.source === "external" ? [item.booking.label] : []))];
}

/** The CatchIcon for each role an owner can give a link (CAT-254). */
const ownerLinkIcons = {
  community: "chat",
  social: "photo",
  tickets: "ticket",
  calendar: "event",
  shop: "pricing",
  partner: "partner",
  video: "play",
  route: "route",
  website: "web",
  link: "link",
} as const satisfies Record<NonNullable<OrganizerPageRecord["links"][number]["icon"]>, CatchIconName>;

function iconFor(url: string): CatchIconName {
  if (url.startsWith("mailto:")) return "email";
  if (url.startsWith("tel:")) return "phone";
  const host = hostOf(url);
  if (/whatsapp|wa\.me|telegram|t\.me/u.test(host)) return "chat";
  if (/instagram/u.test(host)) return "photo";
  if (/strava/u.test(host)) return "route";
  if (/youtube|youtu\.be|vimeo/u.test(host)) return "play";
  if (/luma|lu\.ma|calendar/u.test(host)) return "event";
  if (/ticket|insider|district|bookmyshow|allevents|meetup/u.test(host)) return "ticket";
  return "link";
}

function hostOf(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/u, "");
    return `${parsed.hostname.replace(/^www\./u, "")}${path.length > 1 && path.length < 32 ? path : ""}`;
  } catch {
    return "";
  }
}

function priceOf(label: string): number | null {
  if (/^free$/iu.test(label.trim())) return 0;
  const match = /₹\s*([\d,]+)/u.exec(label);
  return match ? Number(match[1].replaceAll(",", "")) : null;
}

const priceLabel = (amount: number) => (amount === 0 ? "Free" : `₹${amount.toLocaleString("en-IN")}`);

function mostCommon<T>(values: readonly T[]): T | null {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: T | null = null;
  for (const [value, count] of counts) if (best === null || count > (counts.get(best) ?? 0)) best = value;
  return best;
}

function relativeTime(at: number, readAt: number): string {
  if (!Number.isFinite(at)) return "";
  const days = Math.max(0, Math.floor((readAt - at) / 86_400_000));
  if (days < 1) return "today";
  if (days < 7) return days === 1 ? "yesterday" : `${days} days ago`;
  if (days < 30) return Math.floor(days / 7) === 1 ? "1 week ago" : `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return Math.floor(days / 30) === 1 ? "1 month ago" : `${Math.floor(days / 30)} months ago`;
  return Math.floor(days / 365) === 1 ? "1 year ago" : `${Math.floor(days / 365)} years ago`;
}

/** Day-first dates ("Sun 2 Nov") and 12-hour times ("6:30 AM"), in the event's zone. */
function format(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  const locale = options.hour ? "en-US" : "en-GB";
  try {
    return new Intl.DateTimeFormat(locale, {...options, timeZone}).format(date);
  } catch {
    return new Intl.DateTimeFormat(locale, {...options, timeZone: defaultZone}).format(date);
  }
}

/** The calendar day in the event's zone, as YYYY-MM-DD. */
function dayKey(date: Date, timeZone: string): string {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {year: "numeric", month: "2-digit", day: "2-digit", timeZone}).formatToParts(date);
  } catch {
    parts = new Intl.DateTimeFormat("en-CA", {year: "numeric", month: "2-digit", day: "2-digit", timeZone: defaultZone}).formatToParts(date);
  }
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
