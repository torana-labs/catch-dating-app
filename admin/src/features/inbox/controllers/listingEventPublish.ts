import type {ListingEventPublishInput, ListingEventReview} from "../api/inboxRepository";

type ImportedEvent = ListingEventReview["event"];
export type ListingEventChecklist = ListingEventPublishInput["checklist"];
export type ListingEventPublishRequest = Omit<ListingEventPublishInput, "idempotencyKey" | "executionMode">;

export const listingEventChecklistItems: Array<[keyof ListingEventChecklist, string]> = [
  ["outboundLinksReviewed", "The event's link opens the organizer's own page for it"],
  ["noCatchBookingPaymentsWaitlist", "Guests book on that page; Catch takes no booking, payment or waitlist"],
  ["ownerSafeCopyReviewed", "The title and description are fit to show on Catch, with no dating framing"],
];

const blockerLabels: Record<string, string> = {
  missing_end_time: "no end time",
  missing_location_detail: "no venue or address",
  missing_exact_coordinates: "no map location",
  duplicate_normalized_event_key: "may duplicate another event",
  requires_owner_safe_copy_review: "copy not reviewed",
  requires_event_defaults_policy: "booking defaults undecided",
  event_already_ended: "already ended",
  event_cancelled: "cancelled",
  platform_not_publishable: "platform not supported yet",
  start_time_missing: "no start time",
  organizer_page_unpublished: "the organizer's page is not published",
  organizer_market_unknown: "the organizer has no launch market",
  organizer_listing_pending: "the listing is not approved",
  external_event_contract_invalid: "the event data is out of contract",
  organizer_authority_mismatch: "the organizer's settings changed",
  import_policy_not_acknowledged: "the import checklist is not confirmed",
};

const platformLabels: Record<string, string> = {
  bookMyShow: "BookMyShow", district: "District", luma: "Luma", partiful: "Partiful", sortMyScene: "SortMyScene",
};

export const eventPlatformLabel = (platform: string): string => platformLabels[platform] ?? platform;

export function blockerLabel(code: string): string {
  return blockerLabels[code] ?? code;
}

/** Why the publication policy left this event for a person, and what still stands in its way. */
export function eventCheckReasons(event: ImportedEvent): string[] {
  const findings = event.automatedFindings.map((finding) => finding.check === "dating_framing" ?
    `Its ${finding.field} says "${finding.match}"` : finding.check === "price_missing" ?
      "Its page states no price" : `It names another organizer (${finding.match})`);
  const blockers = event.blockers.map((code) => {
    const label = blockerLabel(code);
    return label[0].toUpperCase() + label.slice(1);
  });
  return [...findings, ...blockers];
}

/** "19.0596, 72.8227", as Google Maps copies a dropped pin, or null when out of range. */
export function parseMapLocation(text: string): {latitude: number; longitude: number} | null {
  const match = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/u.exec(text);
  if (!match) return null;
  const [latitude, longitude] = [Number(match[1]), Number(match[2])];
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? {latitude, longitude} : null;
}

export interface ListingEventPublishForm {
  checklist: ListingEventChecklist;
  note: string;
  noFixedPlace: boolean;
  mapLocation: string;
  venueName: string;
}

// The policy that lets staff publish an event with no map location, such as an online one.
const locationWaiverPolicy = "policy-external-event-location-provider-policy";

export const emptyListingEventForm = (): ListingEventPublishForm => ({
  checklist: {outboundLinksReviewed: false, noCatchBookingPaymentsWaitlist: false, ownerSafeCopyReviewed: false},
  note: "", noFixedPlace: false, mapLocation: "", venueName: "",
});

export const needsMapLocation = (event: ImportedEvent) => event.resolvableBlockers.includes("missing_exact_coordinates");

/**
 * The publish call for one event, or null until the form is complete. The
 * note covers each check the reviewer took on. A supplied location clears its
 * blockers by itself; an event with no fixed place waives them under the policy.
 */
export function listingEventPublishRequest(event: ImportedEvent, intakeRequestId: string,
  form: ListingEventPublishForm): ListingEventPublishRequest | null {
  const note = form.note.trim();
  const point = needsMapLocation(event) && !form.noFixedPlace ? parseMapLocation(form.mapLocation) : null;
  const complete = note.length >= 10 && listingEventChecklistItems.every(([key]) => form.checklist[key]) &&
    (!needsMapLocation(event) || form.noFixedPlace || point !== null);
  if (!complete) return null;
  const venue = form.venueName.trim();
  const outcomeFor = (blockerCode: string): "resolved" | "waived" | null => {
    if (blockerCode === "missing_exact_coordinates") return point ? null : "waived";
    if (blockerCode === "missing_location_detail" && point && venue) return null;
    if (blockerCode === "missing_location_detail" && form.noFixedPlace) return "waived";
    return "resolved";
  };
  const {eventWorkItemId} = event;
  return {
    intakeRequestId, eventWorkItemIds: [eventWorkItemId], checklist: form.checklist, reviewNote: note,
    blockerResolutions: event.resolvableBlockers.flatMap((blockerCode) => {
      const outcome = outcomeFor(blockerCode);
      return outcome === null ? [] : [{eventWorkItemId, blockerCode, outcome,
        policyGapDecisionId: outcome === "waived" ? locationWaiverPolicy : null, note}];
    }),
    eventLocations: point ? [{eventWorkItemId, name: venue || null, address: null, placeId: null, ...point}] : [],
  };
}
