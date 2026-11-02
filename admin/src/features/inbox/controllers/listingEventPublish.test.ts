import {describe, expect, it} from "vitest";
import type {ListingEventReview} from "../api/inboxRepository";
import {
  emptyListingEventForm,
  eventCheckReasons,
  listingEventPublishRequest,
  parseMapLocation,
} from "./listingEventPublish";

const event = (overrides: Partial<ListingEventReview["event"]> = {}): ListingEventReview["event"] => ({
  eventWorkItemId: "work-call", eventId: "ext-call", title: "Route planning call", startAt: "2026-11-04T14:00:00.000Z",
  endAt: null, venue: null, address: null, platform: "luma", sourceUrl: "https://lu.ma/call", priceLabel: null,
  state: "needs_resolution", publishedBy: null,
  blockers: ["missing_end_time", "missing_exact_coordinates", "missing_location_detail"],
  resolvableBlockers: ["missing_end_time", "missing_exact_coordinates", "missing_location_detail"],
  automatedFindings: [], ...overrides,
});
const filled = (overrides = {}) => ({...emptyListingEventForm(), note: "Checked it on Luma.",
  checklist: {outboundLinksReviewed: true, noCatchBookingPaymentsWaitlist: true, ownerSafeCopyReviewed: true}, ...overrides});

describe("listingEventPublishRequest", () => {
  it("waits for the checklist, a ten-character note and a place", () => {
    expect(listingEventPublishRequest(event(), "req", emptyListingEventForm())).toBeNull();
    expect(listingEventPublishRequest(event(), "req", filled({note: "too short"}))).toBeNull();
    expect(listingEventPublishRequest(event(), "req", filled())).toBeNull();
    expect(listingEventPublishRequest(event(), "req", filled({mapLocation: "not a pin"}))).toBeNull();
  });

  it("a location clears its own blockers and the rest are resolved with the note", () => {
    const request = listingEventPublishRequest(event(), "req", filled({mapLocation: "19.0596, 72.8227", venueName: " Bonobo "}));
    expect(request?.eventLocations).toEqual([{eventWorkItemId: "work-call", name: "Bonobo", address: null, placeId: null,
      latitude: 19.0596, longitude: 72.8227}]);
    expect(request?.blockerResolutions).toEqual([{eventWorkItemId: "work-call", blockerCode: "missing_end_time",
      outcome: "resolved", policyGapDecisionId: null, note: "Checked it on Luma."}]);
  });

  it("an event with no fixed place waives its location blockers under the policy", () => {
    const request = listingEventPublishRequest(event(), "req", filled({noFixedPlace: true}));
    expect(request?.eventLocations).toEqual([]);
    expect(request?.blockerResolutions.map((entry) => [entry.blockerCode, entry.outcome, entry.policyGapDecisionId])).toEqual([
      ["missing_end_time", "resolved", null],
      ["missing_exact_coordinates", "waived", "policy-external-event-location-provider-policy"],
      ["missing_location_detail", "waived", "policy-external-event-location-provider-policy"],
    ]);
  });
});

describe("the review's wording", () => {
  it("parses a dropped pin and refuses anything out of range", () => {
    expect(parseMapLocation(" 19.0596, 72.8227 ")).toEqual({latitude: 19.0596, longitude: 72.8227});
    expect(parseMapLocation("91, 72")).toBeNull();
    expect(parseMapLocation("Bandra")).toBeNull();
  });

  it("says why the policy left it, then what stands in its way", () => {
    expect(eventCheckReasons(event({blockers: ["missing_end_time"], automatedFindings: [
      {check: "dating_framing", field: "title", match: "Singles"}, {check: "price_missing", field: "price", match: "none"}]})))
      .toEqual(['Its title says "Singles"', "Its page states no price", "No end time"]);
  });
});
