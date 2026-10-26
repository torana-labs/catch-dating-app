import {validateExternalEventDocument} from
  "../shared/generated/validators/externalEventDocument";
import type {HostListing} from "./publicOrganizer";
import {
  object,
  publicDocumentId,
  publicHttpsUrl,
  synthetic,
} from "./publicReadPolicy";

/**
 * The public imported-event projection. This mirrors publicExternalEvent in
 * website/src/server/publicExternalEvent.ts and
 * website/scripts/next/externalEventProjection.mjs; the shared parity
 * fixtures in contracts/fixtures/public_pages hold both to the same output.
 */
export type PublicExternalEvent =
  NonNullable<HostListing["externalEvents"]>[number];
export interface PublicExternalEventRow {
  organizerId: string;
  event: PublicExternalEvent;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = Record<string, any>;

const disabledCatchBooking = [
  "catchBookingEnabled",
  "catchPaymentsEnabled",
  "catchReservationsEnabled",
  "catchWaitlistEnabled",
];

export function publicExternalEvent(
  id: string, data: Raw
): PublicExternalEventRow | null {
  if (!publicDocumentId(id) || data.eventId !== id || synthetic(data) ||
      data.status !== "active" || data.publicationStatus !== "public" ||
      !validateExternalEventDocument(data)) return null;
  const booking = data.booking as Raw;
  const discovery = data.discovery as Raw;
  if (discovery.availability !== "read_only_external" ||
      booking.mode !== "external_outbound_only" ||
      disabledCatchBooking.some((key) => booking[key] !== false)) return null;
  const result = projectExternalEventDocument(data);
  if (!result || !publicDocumentId(result.canonicalHostId) ||
      !publicHttpsUrl(result.projection.sourceHref)) return null;
  return {organizerId: result.canonicalHostId, event: result.projection};
}

function projectExternalEventDocument(event: Raw): {
  canonicalHostId: unknown;
  projection: PublicExternalEvent;
} | null {
  const startTime = timestampIso(event.startTime);
  if (!startTime) return null;
  const endTime = timestampIso(event.endTime);
  const primaryLink =
    event.booking.externalLinks.find((link: Raw) => link.primary) ??
    event.booking.externalLinks[0] ??
    null;
  const sourceHref = primaryLink?.url ?? event.externalSource?.eventUrl ??
    event.externalSource?.sourceUrl;
  if (!sourceHref) return null;
  const sourceLabel =
    platformLabel(primaryLink?.platform ?? event.externalSource?.platform);
  return {
    canonicalHostId: event.canonicalHostId,
    projection: {
      id: event.eventId,
      title: event.title,
      activityKind: event.activity.activityKind,
      availability: event.discovery.availability,
      startTime,
      endTime,
      timezone: validTimezone(event.timezone) ? event.timezone : "UTC",
      date: eventDateLabelForTimezone(startTime, endTime, event.timezone),
      location: event.meetingPoint,
      locationDetails:
        event.locationDetails ?? event.meetingLocation?.notes ?? "",
      summary: event.description,
      priceLabel: event.price.displayText ?? "External ticketing",
      sourceLabel,
      sourceHref,
      externalLinkCount: event.booking.externalLinks.length,
      dedupeKey: event.dedupe.normalizedEventKey,
    },
  };
}

function eventDateLabelForTimezone(
  startIso: string, endIso: string | null, timezone: unknown
): string {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  const zone = validTimezone(timezone) ? timezone as string : "UTC";
  const date = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: zone,
  }).format(start);
  const time = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: zone,
  }).format(start);
  if (!end || Number.isNaN(end.getTime())) return `${date}, ${time}`;
  const endTime = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: zone,
  }).format(end);
  return `${date}, ${time}-${endTime}`;
}

function timestampIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  const stamp = object(value);
  if (stamp && typeof stamp._seconds === "number") {
    return new Date(stamp._seconds * 1000).toISOString();
  }
  return null;
}

function validTimezone(value: unknown): boolean {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en", {timeZone: value as string})
      .format(new Date());
    return true;
  } catch {
    return false;
  }
}

function platformLabel(platform: unknown): string {
  const labels: Record<string, string> = {
    bookMyShow: "BookMyShow",
    district: "District",
    luma: "Luma",
    partiful: "Partiful",
    sortMyScene: "Sort My Scene",
  };
  return labels[String(platform)] ??
    titleCaseText(platform ?? "External source");
}

function titleCaseText(value: unknown): string {
  return String(value)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ");
}
