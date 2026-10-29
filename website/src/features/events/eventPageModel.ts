import {catchFormatAccentOf, type CatchGround, type CatchTextAccent} from "@catch/web-ui";
import {eventPageCopy as copy} from "../../content/events";
import {activityForKind} from "../organizers/publicDiscovery";
import type {EventPublicPageDocument} from "../organizers/types";

/**
 * What one event page renders: the eventPublicPage read model without its
 * build stamps or today's organizer listing. Functions keep it to public
 * fields with the dating framing removed (CAT-247).
 */
export type EventPageData = Omit<EventPublicPageDocument, "builtAt" | "contentHash" | "listing">;
type CatchItem = Extract<EventPageData["item"], {source: "catch"}>;
type CatchEvent = CatchItem["event"];

export interface EventPageFact {
  label: string;
  value: string;
  note?: string;
}

export interface EventPageGoodToKnow {
  key: "included" | "bring" | "accessibility" | "cancellation" | "joining";
  label: string;
  body: string;
  accent?: CatchTextAccent;
}

export interface EventPageStep {
  title: string;
  body?: string;
  marker: string;
  tag?: string;
}

export interface EventPageReview {
  id: string;
  name: string;
  rating: number;
  ratingLabel: string;
  body: string;
  meta: string;
  verified: boolean;
  /** The organiser's reply, as the organiser page shows it. */
  reply?: {author: string; text: string; verb: string};
}

export interface EventPageMoreCard {
  href: string;
  label: string;
  title: string;
  meta: string;
  ground: CatchGround;
}

export type EventPageBooking =
  | {kind: "catch"; eventId: string; open: boolean}
  | {kind: "external"; url: string; label: string; open: boolean};

/** Every section's content, or null where the event has nothing to show. */
export interface EventPageView {
  eventId: string;
  path: string;
  title: string;
  accent: CatchTextAccent;
  kindLabel: string;
  media:
    | {kind: "photo"; url: string; alt: string}
    | {kind: "poster"; kicker: string; date: string; title: string; place: string};
  host: {name: string; path: string; verified: boolean; rating: string | null};
  facts: {when: EventPageFact; where: EventPageFact; price: EventPageFact};
  description: string | null;
  moments: Array<{title: string; body: string}> | null;
  plan: {title: string; steps: EventPageStep[]} | null;
  where: {
    place: string;
    note: string | null;
    mapsHref: string;
    map: {latitude: number; longitude: number; alt: string} | null;
  };
  goodToKnow: EventPageGoodToKnow[];
  going: {title: string; note: string; going: number} | null;
  organizer: {name: string; path: string; initials: string; summary: string};
  reviews: {note: string; items: EventPageReview[]} | null;
  more: {title: string; cards: EventPageMoreCard[]} | null;
  booking: EventPageBooking;
  priceLabel: string;
}

const moreGrounds: readonly CatchGround[] = ["paper", "indigo", "mint"];

export function buildEventPageView(page: EventPageData, now: number = Date.now()): EventPageView {
  const {item, organizer} = page;
  const event = item.event;
  const accent = catchFormatAccentOf(event.activityKind) ?? "indigo";
  const activity = activityForKind(event.activityKind).label;
  const catchEvent = item.source === "catch" ? item.event : null;
  const zone = validZone(event.timezone);
  const start = zone ? zonedParts(event.startTime, zone) : null;
  const end = zone && event.endTime ? zonedParts(event.endTime, zone) : null;
  const where = placeFact(event.location, catchEvent?.meetingLocation?.name);
  const photo = catchEvent?.photoUrl?.trim();
  const open = isOpen(event.startTime, event.endTime, now);
  return {
    eventId: page.eventId,
    path: page.path,
    title: event.title,
    accent,
    kindLabel: item.source === "external" ? copy.importedKind(activity, item.booking.label) : activity,
    media: photo ? {kind: "photo", url: photo, alt: copy.photoAlt(event.title)} : {
      kind: "poster", kicker: organizer.name, date: start ? dayLabel(start) : event.date,
      title: event.title, place: event.location,
    },
    host: {
      name: organizer.name, path: organizer.path, verified: organizer.verified,
      rating: organizer.rating !== null && organizer.reviewCount > 0 ?
        copy.rating(organizer.rating.toFixed(1), organizer.reviewCount) : null,
    },
    facts: {
      when: start ? {label: copy.facts.when, value: dayLabel(start), note: timeRange(start, end)} :
        {label: copy.facts.when, value: event.date},
      where: {label: copy.facts.where, ...where},
      price: {label: copy.facts.price, value: event.priceLabel, note: item.source === "external" ?
        copy.ticketsOn(item.booking.label) : (catchEvent?.amountPaise ?? 0) > 0 ? copy.perPerson : undefined},
    },
    description: event.summary.trim() || null,
    moments: catchEvent ? momentsFor(catchEvent) : null,
    plan: catchEvent ? planFor(catchEvent, start) : null,
    where: whereFor(page),
    goodToKnow: goodToKnowFor(page),
    going: goingFor(page),
    organizer: {
      name: organizer.name,
      path: organizer.path,
      initials: organizer.logo.text,
      summary: [
        copy.organizer.summary(organizer.category, organizer.city),
        organizer.followerCount > 0 ? copy.organizer.followers(organizer.followerCount.toLocaleString("en-IN")) : "",
        organizer.upcomingEventCount > 0 ? copy.organizer.upcoming(organizer.upcomingEventCount) : "",
      ].filter(Boolean).join(" · "),
    },
    reviews: page.reviews.length ? {
      note: copy.reviews.note(organizer.name),
      items: page.reviews.map((review, index) => ({
        id: review.id ?? `review-${index}`,
        name: review.reviewerName,
        rating: review.rating,
        ratingLabel: copy.reviews.stars(review.rating),
        body: review.comment,
        meta: monthLabel(review.createdAt),
        verified: review.verificationStatus === "verified",
        ...(review.ownerResponse ? {reply: {author: review.ownerResponse.hostName, text: review.ownerResponse.message,
          verb: copy.reviews.replied}} : {}),
      })),
    } : null,
    more: page.moreEvents.length ? {
      title: copy.more.title(organizer.name),
      cards: page.moreEvents.map((card, index) => {
        const cardStart = zone ? zonedParts(card.startTime, zone) : null;
        return {
          href: card.path,
          label: cardStart ? `${dayLabel(cardStart)} · ${clock(cardStart, true)}` : card.date,
          title: card.title,
          meta: `${card.priceLabel} · ${card.booking.kind === "external" ? card.booking.label : copy.more.onCatch}`,
          ground: moreGrounds[index % moreGrounds.length],
        };
      }),
    } : null,
    booking: item.source === "external" ?
      {kind: "external", url: item.booking.url, label: item.booking.label, open} :
      {kind: "catch", eventId: page.eventId, open},
    priceLabel: event.priceLabel,
  };
}

function momentsFor(event: CatchEvent): EventPageView["moments"] {
  const moments = (event.catchExperienceActivities ?? []).map((activity) => copy.moments[activity]);
  return moments.length ? moments : null;
}

function planFor(event: CatchEvent, start: ZonedParts | null): EventPageView["plan"] {
  const itinerary = event.itinerary ?? [];
  if (!itinerary.length) return null;
  const startMillis = Date.parse(event.startTime);
  return {
    title: start ? copy.plan[partOfDay(start.hour24)] : copy.plan.day,
    steps: itinerary.map((step) => {
      const at = start && Number.isFinite(startMillis) ?
        zonedParts(new Date(startMillis + step.offsetMinutes * 60_000).toISOString(), start.zone) : null;
      const distance = step.routeDistanceMeters ? kilometres(step.routeDistanceMeters) : null;
      return {
        title: step.title,
        ...(step.description?.trim() ? {body: step.description} : {}),
        marker: at ? clock(at, false) : copy.offset(step.offsetMinutes),
        ...(distance ? {tag: copy.distance(distance)} : {}),
      };
    }),
  };
}

function whereFor(page: EventPageData): EventPageView["where"] {
  const {item} = page;
  const meeting = item.source === "catch" ? item.event.meetingLocation : undefined;
  const details = item.event.locationDetails?.trim();
  const place = meeting ? [meeting.name, meeting.address?.trim()].filter(Boolean).join(", ") : item.event.location;
  const note = meeting?.notes?.trim() || details ||
    (item.source === "external" ? copy.where.externalNote(item.booking.label) : null);
  return {
    place,
    note,
    mapsHref: meeting ? mapsHref(`${meeting.latitude},${meeting.longitude}`, meeting.placeId) : mapsHref(item.event.location),
    map: meeting ? {latitude: meeting.latitude, longitude: meeting.longitude, alt: copy.where.mapAlt(place)} : null,
  };
}

function goodToKnowFor(page: EventPageData): EventPageGoodToKnow[] {
  const event = page.item.event;
  const policy = page.item.source === "catch" ? page.item.event.cancellationPolicy : undefined;
  const included = page.item.source === "catch" ? page.item.event.included?.trim() : undefined;
  const joining = page.item.source === "catch" ? (page.item.event.admissionLabels ?? []).map((label) => copy.joining[label]) : [];
  const items: Array<EventPageGoodToKnow | null> = [
    included ? {key: "included", label: copy.goodToKnow.included, body: included, accent: "coral"} : null,
    event.requirements?.trim() ? {key: "bring", label: copy.goodToKnow.bring, body: event.requirements.trim()} : null,
    event.accessibility?.trim() ? {key: "accessibility", label: copy.goodToKnow.accessibility, body: event.accessibility.trim(), accent: "mint"} : null,
    // A free event has no paid cancellation terms to state.
    policy && policy !== "notApplicable" ? {key: "cancellation", label: copy.goodToKnow.cancellation, body: copy.cancellation[policy], accent: "indigo"} : null,
    joining.length ? {key: "joining", label: copy.goodToKnow.joining, body: joining.join(" "), accent: "magenta"} : null,
  ];
  return items.filter((entry): entry is EventPageGoodToKnow => entry !== null);
}

function goingFor(page: EventPageData): EventPageView["going"] {
  const {capacity} = page;
  // Nobody booked yet is nothing to show; the booking card still counts the spots.
  if (capacity.state === "external" || !capacity.capacityLimit || !capacity.bookedCount ||
    capacity.spotsLeft === null) return null;
  const going = capacity.bookedCount;
  if (capacity.state === "full") {
    return {title: copy.going.full(going), note: capacity.waitlistAvailable ? copy.going.waitlist : copy.going.privacy, going};
  }
  return {title: copy.going.title(going, capacity.spotsLeft), note: copy.going.privacy, going};
}

/** A place name and its area, from the meeting point or the first part of the location. */
function placeFact(location: string, meetingName?: string): {value: string; note?: string} {
  if (meetingName?.trim() && meetingName.trim() !== location.trim()) return {value: meetingName.trim(), note: location};
  const [name, ...rest] = location.split(",").map((part) => part.trim()).filter(Boolean);
  return rest.length ? {value: name, note: rest.join(", ")} : {value: location};
}

function mapsHref(query: string, placeId?: string | null): string {
  const params = new URLSearchParams({api: "1", query});
  if (placeId) params.set("query_place_id", placeId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function isOpen(startTime: string, endTime: string | null, now: number): boolean {
  const end = Date.parse(endTime ?? startTime);
  return !Number.isFinite(end) || end >= now;
}

interface ZonedParts {
  zone: string;
  weekday: string;
  day: string;
  month: string;
  hour24: number;
  hour: string;
  minute: string;
  period: string;
  dateKey: string;
}

function validZone(zone: string | undefined): string | null {
  if (!zone) return null;
  try {
    new Intl.DateTimeFormat("en-US", {timeZone: zone});
    return zone;
  } catch {
    return null;
  }
}

// Assembled from parts so server and browser render the same characters.
function zonedParts(iso: string, zone: string): ZonedParts | null {
  const millis = Date.parse(iso);
  if (!Number.isFinite(millis)) return null;
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: zone, weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(millis)).map((part) => [part.type, part.value]));
  const hour24 = Number(parts.hour) % 24;
  return {
    zone, weekday: parts.weekday, day: parts.day, month: parts.month, hour24,
    hour: String(hour24 % 12 || 12), minute: parts.minute, period: hour24 < 12 ? "AM" : "PM",
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

/** "Sun 23 Nov" */
function dayLabel(parts: ZonedParts): string {
  return `${parts.weekday} ${parts.day} ${parts.month}`;
}

/** "5:45 AM", or "5:45" without the period. */
function clock(parts: ZonedParts, withPeriod: boolean): string {
  return withPeriod ? `${parts.hour}:${parts.minute} ${parts.period}` : `${parts.hour}:${parts.minute}`;
}

/** "5:45 to 8:30 AM", "11:00 AM to 1:00 PM", or the start alone. */
function timeRange(start: ZonedParts, end: ZonedParts | null): string {
  if (!end) return clock(start, true);
  if (end.dateKey !== start.dateKey) return copy.timeRange(clock(start, true), `${dayLabel(end)}, ${clock(end, true)}`);
  return copy.timeRange(clock(start, start.period !== end.period), clock(end, true));
}

function partOfDay(hour: number): "morning" | "afternoon" | "evening" {
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

function kilometres(metres: number): string {
  const value = metres / 1000;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** "Oct 2026", fixed in UTC so a cached page never shows a stale "2 weeks ago". */
function monthLabel(iso: string): string {
  const millis = Date.parse(iso);
  if (!Number.isFinite(millis)) return "";
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {timeZone: "UTC", month: "short", year: "numeric"})
    .formatToParts(new Date(millis)).map((part) => [part.type, part.value]));
  return `${parts.month} ${parts.year}`;
}
