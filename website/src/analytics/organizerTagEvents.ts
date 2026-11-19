import {brand} from "@catch/brand";
import type {AdBooking, AdEventPageFacts} from "./adTags.ts";
import type {OrganizerTagPage} from "./catchMeasurement.ts";

/**
 * The closed event map for organiser-owned Meta Pixel and GA4 tags (#2063,
 * docs/ads_conversion_spec.md, "Organiser-owned tags"). Pure builders: they
 * load nothing and call no tag. The transport sends exactly what they return,
 * to the organiser's destinations only.
 *
 * | Builder | GA4 | Meta |
 * | --- | --- | --- |
 * | `organizerPageView` | `page_view` | `PageView` |
 * | `organizerViewContent` | `view_item` | `ViewContent` |
 * | `organizerBeginCheckout` | `begin_checkout` | `InitiateCheckout` |
 * | `organizerPurchase` | `purchase` | `Purchase` |
 *
 * Every parameter is rebuilt from a closed allowlist. Never present: guest
 * personal data, answers, Catch payment, request or organiser ids, Catch
 * campaign labels or click ids, the browser's address, query, title or
 * referrer, or dating words. Booking events take only a live booking the
 * server admitted (`AdBooking`), and a separate opaque organiser event id, so
 * a Catch payment id never reaches an organiser destination and no organiser
 * event shares an id with a Catch event.
 */

export type OrganizerTagValue = string | number | readonly string[] | readonly Record<string, string | number>[];

export interface OrganizerTagCommand {
  google: {name: "page_view" | "view_item" | "begin_checkout" | "purchase"; params: Readonly<Record<string, OrganizerTagValue>>};
  meta: {name: "PageView" | "ViewContent" | "InitiateCheckout" | "Purchase"; params: Readonly<Record<string, OrganizerTagValue>>;
    eventID: string};
}

/** The fixed title organiser tags report; never `document.title`. */
export const organizerTagPageTitle = brand.name;

/** Organiser event ids: opaque, generated, never a Catch business id. */
const organizerEventIdPattern = /^org_[A-Za-z0-9_-]{8,120}$/u;
const catchEventIdPattern = /^[A-Za-z0-9_:-]{1,180}$/u;
const paymentIdPattern = /^pp_[a-f0-9]{32}$/u;
const activityPattern = /^[A-Za-z][A-Za-z0-9_]{0,40}$/u;
/** Words that would describe dating or matching; any parameter containing one is dropped. */
const datingWords = /(?:dat(?:e|ing)|single|mixer|match|speed|flirt|romance|hook ?up|partner|couple)/iu;

export function newOrganizerTagEventId(random: () => string = () => crypto.randomUUID()) {
  return `org_${random().replace(/[^A-Za-z0-9_-]/gu, "")}`.slice(0, 124);
}

const validId = (id: unknown): id is string => typeof id === "string" && organizerEventIdPattern.test(id);
const rupees = (paise: number) => Math.round(paise) / 100;
const validAmount = (paise: unknown, minimum: number): paise is number =>
  Number.isSafeInteger(paise) && (paise as number) >= minimum && (paise as number) <= 100_000_000;
const validBooking = (booking: AdBooking) => booking?.mode === "live" && catchEventIdPattern.test(booking.eventId) &&
  paymentIdPattern.test(booking.paymentId) && validAmount(booking.amountPaise, 100) &&
  Number.isSafeInteger(booking.places) && booking.places >= 1 && booking.places <= 20;
const clean = (value: unknown) => typeof value === "string" && value.trim() && !datingWords.test(value) ?
  value.trim().slice(0, 80) : undefined;

/** The page fields every organiser event carries: fixed origin, path only, no title or referrer from the browser. */
function pageFields(page: OrganizerTagPage) {
  return {page_location: `${brand.web.origin}${page.path}`, page_title: organizerTagPageTitle, page_referrer: ""};
}

function eventPage(page: OrganizerTagPage | null, eventId: string): page is OrganizerTagPage {
  return page?.kind === "event" && page.path === `/events/${eventId}/`;
}

function freeze(command: OrganizerTagCommand): OrganizerTagCommand {
  return Object.freeze({google: Object.freeze({...command.google, params: Object.freeze(command.google.params)}),
    meta: Object.freeze({...command.meta, params: Object.freeze(command.meta.params)})});
}

/** `page_view` / `PageView` on an eligible organiser or event page. */
export function organizerPageView(page: OrganizerTagPage | null, id: string): OrganizerTagCommand | null {
  if (!page || !validId(id)) return null;
  return freeze({google: {name: "page_view", params: {...pageFields(page), event_id: id}},
    meta: {name: "PageView", params: {}, eventID: id}});
}

/** `view_item` / `ViewContent` on the event's own public page: event id, activity kind, city, price. */
export function organizerViewContent(page: OrganizerTagPage | null, facts: AdEventPageFacts, id: string):
  OrganizerTagCommand | null {
  if (!validId(id) || !catchEventIdPattern.test(facts?.eventId ?? "") || !eventPage(page, facts.eventId)) return null;
  const activity = typeof facts.activityKind === "string" && activityPattern.test(facts.activityKind) &&
    !datingWords.test(facts.activityKind) ? facts.activityKind : undefined;
  const city = clean(facts.city);
  const value: Record<string, OrganizerTagValue> = validAmount(facts.amountPaise, 0) ?
    {value: rupees(facts.amountPaise), currency: "INR"} : {};
  return freeze({
    google: {name: "view_item", params: {...pageFields(page), event_id: id, ...(city ? {city} : {}), ...value,
      items: [{item_id: facts.eventId, ...(activity ? {item_category: activity} : {})}]}},
    meta: {name: "ViewContent", params: {content_ids: [facts.eventId], content_type: "product",
      ...(activity ? {activity_kind: activity} : {}), ...(city ? {city} : {}), ...value}, eventID: id},
  });
}

function bookingCommand(google: "begin_checkout" | "purchase", meta: "InitiateCheckout" | "Purchase",
  page: OrganizerTagPage | null, booking: AdBooking, id: string): OrganizerTagCommand | null {
  if (!validId(id) || !validBooking(booking) || !eventPage(page, booking.eventId)) return null;
  const value = rupees(booking.amountPaise);
  return freeze({
    google: {name: google, params: {...pageFields(page), event_id: id, ...(google === "purchase" ? {transaction_id: id} : {}),
      value, currency: "INR", items: [{item_id: booking.eventId, quantity: booking.places}]}},
    meta: {name: meta, params: {content_ids: [booking.eventId], content_type: "product", num_items: booking.places,
      value, currency: "INR"}, eventID: id},
  });
}

/** `begin_checkout` / `InitiateCheckout` when a live paid checkout the server admitted opens. */
export function organizerBeginCheckout(page: OrganizerTagPage | null, booking: AdBooking, id: string) {
  return bookingCommand("begin_checkout", "InitiateCheckout", page, booking, id);
}

/** `purchase` / `Purchase` once the server confirms that admitted booking. */
export function organizerPurchase(page: OrganizerTagPage | null, booking: AdBooking, id: string) {
  return bookingCommand("purchase", "Purchase", page, booking, id);
}
