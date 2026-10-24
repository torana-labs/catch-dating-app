import crypto from "node:crypto";
import {invariant} from "../../platform/errors.mjs";
import {normalizeOrganizerSurfaceUrl} from "./sources/surfaces.mjs";

// The import plan for one reviewed listing event: the read-only externalEvents
// document it would publish, and every blocker that stops it. Ported from the
// retired organizer-intake event import plan (event_import_plan_core.mjs, last
// present at 30e5d7abd) so its governed blockers, read-only booking posture
// and outbound-link merge keep working. The input is now a Supply Intake
// listing_event_candidate projection rather than a JSON queue file.
//
// Publishing stays a staff decision: this module never writes. A plan with
// no blockers is write-ready; adminPublishExternalEvent performs the write.

// The externalEvents contract's platform enum. Urbanaut listings plan but stay
// blocked until that enum (and the app's ExternalEventPlatform) gains it.
export const PUBLISHABLE_PLATFORMS = Object.freeze(["bookMyShow", "district", "luma", "partiful", "sortMyScene"]);

// Blockers a reviewer may resolve, or waive under an accepted policy decision,
// one event at a time. The rest always block. The retired plan also always
// raised requires_event_defaults_policy; a read-only, outbound-only event has
// no booking defaults to decide, so it is accepted here but never raised.
export const GOVERNED_BLOCKERS = Object.freeze([
  "missing_exact_coordinates",
  "missing_end_time",
  "missing_location_detail",
  "requires_event_defaults_policy",
  "requires_owner_safe_copy_review",
  "duplicate_normalized_event_key",
]);

const ACTIVITY_PATTERNS = [
  [/\b(?:run|running|runners?)\b/u, "socialRun"],
  [/\b(?:dinner|supper)\b/u, "dinner"],
  [/\b(?:quiz|trivia)\b/u, "pubQuiz"],
  [/\byoga\b/u, "yoga"],
  [/\bpadel\b/u, "padel"],
  [/\bpickleball\b/u, "pickleball"],
  [/\btennis\b/u, "tennis"],
  [/\b(?:cycling|cycle)\b/u, "cycling"],
];

/**
 * @param {{event: object, workItemId: string, organizer: null | {organizerId: string,
 *   claimable: boolean}, review: {reviewerUid: string, decidedAt: string, note: string | null,
 *   ownerSafeCopyReviewed: boolean, importPolicyAcknowledged: boolean,
 *   blockerResolutions: Array<{blockerCode: string, outcome: string, policyGapDecisionId: string | null,
 *   note: string}>}, duplicates?: object[], citySlug: string | null, now: string}} input
 */
export function planListingEventImport({event, workItemId, organizer, review, duplicates = [], citySlug, now}) {
  invariant(event && typeof event.eventKey === "string" && typeof workItemId === "string",
    "INVALID_EVENT_IMPORT", "An import plan needs a listing event and its work item.");
  const blockers = new Set();
  if (!organizer) blockers.add("organizer_listing_pending");
  if (!PUBLISHABLE_PLATFORMS.includes(event.platform)) blockers.add("platform_not_publishable");
  if (event.status === "cancelled") blockers.add("event_cancelled");
  const start = Date.parse(event.startAt ?? "");
  if (!Number.isFinite(start)) blockers.add("start_time_missing");
  if (Date.parse(event.endAt ?? event.startAt ?? "") < Date.parse(now)) blockers.add("event_already_ended");
  if (review?.importPolicyAcknowledged !== true) blockers.add("import_policy_not_acknowledged");

  if (!event.endAt) blockers.add("missing_end_time");
  if (!event.venue && !event.address) blockers.add("missing_location_detail");
  if (!Number.isFinite(event.latitude) || !Number.isFinite(event.longitude)) blockers.add("missing_exact_coordinates");
  if (review?.ownerSafeCopyReviewed !== true) blockers.add("requires_owner_safe_copy_review");
  if (duplicates.length > 0) blockers.add("duplicate_normalized_event_key");
  for (const resolution of review?.blockerResolutions ?? []) {
    if (!GOVERNED_BLOCKERS.includes(resolution.blockerCode)) continue;
    if (resolution.outcome === "resolved" ||
        (resolution.outcome === "waived" && typeof resolution.policyGapDecisionId === "string")) {
      blockers.delete(resolution.blockerCode);
    }
  }
  const eventId = externalEventId(event, organizer?.organizerId ?? null);
  const sorted = [...blockers].sort();
  return {
    schemaVersion: 1,
    eventId,
    workItemId,
    status: sorted.length === 0 ? "write_ready" : "blocked",
    blockers: sorted,
    document: organizer && Number.isFinite(start) ?
      externalEventDocument({event, eventId, organizer, review, duplicates, citySlug, now}) :
      null,
  };
}

function externalEventDocument({event, eventId, organizer, review, duplicates, citySlug, now}) {
  const locationName = event.venue ?? event.address ?? "External event location";
  const notes = [event.address, event.sourceUrl].filter(Boolean).join("\n") || null;
  const latitude = Number.isFinite(event.latitude) ? event.latitude : null;
  const longitude = Number.isFinite(event.longitude) ? event.longitude : null;
  const reviewed = timestamp(now);
  return {
    schemaVersion: 1,
    eventId,
    canonicalHostId: organizer.organizerId,
    compatibilityClubId: organizer.organizerId,
    title: event.title,
    description: event.description ?? event.title,
    startTime: timestamp(event.startAt),
    endTime: timestamp(event.endAt ?? event.startAt),
    timezone: event.timezone ?? null,
    meetingPoint: locationName,
    meetingLocation: {name: locationName, address: event.address ?? null, placeId: null, latitude, longitude, notes},
    locationDetails: notes,
    photoUrl: event.imageUrl ?? null,
    activity: {version: 1, activityKind: activityKind(event), interactionModel: "openFormat", source: "heuristic"},
    price: price(event.price),
    status: event.status === "cancelled" ? "cancelled" : "active",
    publicationStatus: "public",
    organizerCapabilities: {mode: "unclaimed_read_only", bookable: false, paymentsEnabled: false,
      waitlistEnabled: false, hostContactEnabled: false, claimable: organizer.claimable !== false,
      reviewPolicy: "after_event_end"},
    booking: {mode: "external_outbound_only", catchBookingEnabled: false, catchPaymentsEnabled: false,
      catchReservationsEnabled: false, catchWaitlistEnabled: false,
      externalLinks: outboundLinks([event, ...duplicates])},
    discovery: {citySlug, countryCode: "IN", availability: "read_only_external", manualApprovalRequired: true},
    dedupe: {normalizedEventKey: event.eventKey, primaryCandidateId: event.eventKey,
      duplicateCandidateIds: [...new Set(duplicates.map((duplicate) => duplicate.eventKey))].sort().slice(0, 24),
      conflictPolicy: "single_read_only_event_with_multiple_outbound_links"},
    externalSource: {candidateId: event.eventKey, sourceEventKey: event.eventKey,
      sourceEventId: String(event.sourceEntityId).slice(0, 180), platform: event.platform,
      eventUrl: event.sourceUrl ?? null, sourceUrl: event.organizerUrl ?? event.sourceUrl ?? null},
    review: {eventReviewBatchId: null, reviewer: review.reviewerUid, decidedAt: review.decidedAt.slice(0, 10),
      note: review.note, importPolicyAcknowledged: review.importPolicyAcknowledged === true,
      ownerSafeCopyReviewed: review.ownerSafeCopyReviewed === true,
      blockerResolutions: (review.blockerResolutions ?? []).slice(0, 6)},
    createdAt: reviewed,
    updatedAt: reviewed,
  };
}

/** Deterministic per organizer and source event, so a re-import overwrites itself. */
export function externalEventId(event, organizerId) {
  const start = String(event.startAt ?? "").replace(/[^0-9]/gu, "").slice(0, 12) || "undated";
  const slug = slugify(["ext", organizerId ?? "unattributed", start, event.title].join("-"));
  const hash = crypto.createHash("sha256").update(event.eventKey).digest("hex").slice(0, 10);
  const base = `${slug}-${hash}`;
  return base.length <= 180 ? base : `${base.slice(0, 169).replace(/-+$/u, "")}-${hash}`;
}

export function activityKind(event) {
  const text = `${event.title ?? ""} ${event.description ?? ""}`.toLowerCase();
  return ACTIVITY_PATTERNS.find(([pattern]) => pattern.test(text))?.[1] ?? "openActivity";
}

/** Adapter offers carry numeric bounds; the document wants paise and a display string. */
export function price(offer) {
  if (!offer || (offer.min === null && offer.max === null)) {
    return {displayText: null, parsedPriceInPaise: null, currency: "INR"};
  }
  const code = String(offer.currency ?? "").toUpperCase();
  const currency = /^[A-Z]{3}$/u.test(code) ? code : "INR";
  const low = Number.isFinite(offer.min) ? offer.min : offer.max;
  const high = Number.isFinite(offer.max) ? offer.max : low;
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  const displayText = low === 0 && high === 0 ? "Free" :
    low === high ? `${symbol}${low}` : `${symbol}${low}–${high}`;
  return {displayText, parsedPriceInPaise: Math.round(low * 100), currency};
}

function outboundLinks(events) {
  const links = [];
  const seen = new Set();
  for (const [index, event] of events.entries()) {
    for (const url of [event.sourceUrl, ...(event.alsoListedAt ?? [])]) {
      if (!isHttpUrl(url)) continue;
      // A listing on another platform carries that platform, not this event's.
      const platform = url === event.sourceUrl ? event.platform : platformOf(url);
      if (!PUBLISHABLE_PLATFORMS.includes(platform) || seen.has(`${platform}:${url}`)) continue;
      seen.add(`${platform}:${url}`);
      links.push({platform, url, linkType: "booking_or_event_page", sourceEventKey: event.eventKey,
        candidateId: event.eventKey, primary: index === 0 && url === event.sourceUrl});
    }
  }
  return links.sort((left, right) => Number(right.primary) - Number(left.primary) ||
    left.platform.localeCompare(right.platform) || left.url.localeCompare(right.url)).slice(0, 12);
}

function platformOf(url) {
  try {
    return normalizeOrganizerSurfaceUrl(url).platform;
  } catch {
    return null;
  }
}

function timestamp(value) {
  const millis = Date.parse(value);
  if (!Number.isFinite(millis)) return null;
  const seconds = Math.floor(millis / 1000);
  return {_seconds: seconds, _nanoseconds: (millis - seconds * 1000) * 1_000_000};
}

function isHttpUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function slugify(value) {
  return String(value ?? "event").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "")
    .slice(0, 150) || "event";
}
