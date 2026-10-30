import crypto from "node:crypto";
import previewCards from "../content/previewCards.json" with {type: "json"};
import {consumerHomeCopy} from "../content/consumerHome";
import {interpolateContent} from "../content/interpolate";
import {activityForKind, activityForListing} from "../features/organizers/publicDiscovery";
import type {EventDetailRecord} from "../features/events/eventDetailModel";
import type {HostListingRoute} from "../features/organizers/types";
import {brand} from "@catch/brand";

/**
 * Organiser (C7) and event (C8) link-preview cards, drawn per request by
 * app/og/[...path]/route.tsx from the public record the page itself renders.
 * Every field comes from that record; counts, guests and private fields never
 * reach a card. Pages without a public record keep the static cards.
 */
export interface GeneratedPreviewCard {
  /** The page the card belongs to, e.g. `/events/abc/`. */
  pagePath: string;
  kicker: string;
  title: string;
  lines: string[];
  byline: string | null;
  ground: {accent: string; deep: string};
  /** The event's published photo; organisers have no public image yet. */
  photoUrl: string | null;
  alt: string;
}

export const siteOrigin = brand.web.origin;
// Bump when the card layout changes, so chat apps fetch the new design.
const cardDesign = 1;
const lineLimit = 44;

type PublicRecord = {listingRoute: HostListingRoute | null; event: EventDetailRecord | null};

export function generatedPreviewCardFor({listingRoute, event}: PublicRecord): GeneratedPreviewCard | null {
  if (event) {
    const activity = activityForKind(event.activityKind);
    const place = [event.location.trim(), event.priceLabel.trim()].filter(Boolean).join(" · ");
    return {
      pagePath: event.path, kicker: activity.label, title: event.title,
      lines: [event.date, place].map(line => clip(line, lineLimit)).filter(Boolean),
      byline: interpolateContent(consumerHomeCopy.events.by, {name: event.listing.name}),
      ground: groundFor(activity.token), photoUrl: event.photoUrl ?? null,
      alt: [event.title, event.date, event.location].filter(Boolean).join(", "),
    };
  }
  if (listingRoute) {
    const {listing} = listingRoute;
    const activity = activityForListing(listing);
    return {
      pagePath: listing.path, kicker: activity.label, title: listing.name,
      lines: [clip(listing.city, lineLimit)].filter(Boolean), byline: null,
      ground: groundFor(activity.token), photoUrl: null,
      alt: [listing.name, activity.label, listing.city].filter(Boolean).join(", "),
    };
  }
  return null;
}

/** Changes whenever anything drawn on the card changes. */
export function generatedPreviewCardVersion(card: GeneratedPreviewCard): string {
  return crypto.createHash("sha256")
    .update(JSON.stringify({card, cardDesign, assets: previewCards.generated.version}))
    .digest("hex").slice(0, 12);
}

/** The image route for a page path: `/events/abc/` draws at `/og/events/abc/card.png`. */
export function generatedPreviewCardPath(pagePath: string): string {
  return `/og${pagePath}card.png`;
}

export function generatedPreviewCardImage(card: GeneratedPreviewCard) {
  return {url: `${siteOrigin}${generatedPreviewCardPath(card.pagePath)}?v=${generatedPreviewCardVersion(card)}`,
    width: previewCards.width, height: previewCards.height, alt: card.alt};
}

/** The page an image route draws for, or null for anything but an organiser or event page. */
export function pagePathForGeneratedCard(segments: readonly string[]): string | null {
  if (segments.at(-1) !== "card.png") return null;
  const pagePath = `/${segments.slice(0, -1).map(encodeURIComponent).join("/")}/`;
  return /^\/(?:events\/[A-Za-z0-9_-]+|organizers(?:\/[a-z0-9-]+){1,2})\/$/u.test(pagePath) ? pagePath : null;
}

function groundFor(token: string) {
  const name = /--catch-activity-([a-z-]+)-accent/u.exec(token)?.[1] ?? "open-activity";
  const grounds: Record<string, {accent: string; deep: string}> = previewCards.generated.grounds;
  return grounds[name] ?? grounds["open-activity"];
}

function clip(value: string, limit: number) {
  const text = value.trim();
  return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
}
