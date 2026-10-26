import {describe, expect, it} from "vitest";
import {hostListings} from "../organizers/data";
import type {HostListing, HostListingCatchEvent, HostListingExternalEvent} from "../organizers/types";
import {eventPageFromListing} from "./eventPageFromListing";
import {buildEventPageView} from "./eventPageModel";

const catchEvent: HostListingCatchEvent = {
  id: "listing-dinner", role: "hostEventSetup", title: "Singles mixer", activityKind: "singlesMixer", timeline: "upcoming",
  startTime: "2099-01-01T13:30:00.000Z", endTime: "2099-01-01T15:30:00.000Z", timezone: "Asia/Kolkata",
  date: "Thu, 1 Jan 2099, 7:00 PM-9:00 PM", location: "Bandra West, Mumbai", summary: "A hosted evening.",
  capacityLimit: 20, bookedCount: 20, checkedInCount: 0, waitlistedCount: 3, waitlistAvailable: true,
  priceLabel: "₹1,500", scorecard: null, admissionLabels: ["balanced", "approval"],
  catchExperienceActivities: ["rotations", "introductions"], cancellationPolicy: "flexible",
};
const externalEvent: HostListingExternalEvent = {
  id: "listing-run", title: "Sunset run", activityKind: "socialRun", availability: "read_only_external",
  startTime: "2099-01-02T12:00:00.000Z", endTime: null, timezone: "Asia/Kolkata", date: "Fri, 2 Jan 2099, 5:30 PM",
  location: "Worli Sea Face, Mumbai", summary: "A sunset run.", priceLabel: "₹799", sourceLabel: "Luma",
  sourceHref: "https://lu.ma/example-run", externalLinkCount: 1, dedupeKey: "listing-run-2099",
};

function listing(reviewsReadable: boolean): HostListing {
  const base = hostListings[0];
  return {
    ...base,
    authority: {...base.authority, publishStatus: "published"},
    capabilities: {...base.capabilities, publicReviews: {targetState: reviewsReadable ? "enabled" : "disabled",
      readState: reviewsReadable ? "enabled" : "disabled", writeState: "disabled", reason: "Test fixture."}},
    catchEvents: [catchEvent],
    externalEvents: [externalEvent],
    reviews: [1, 2, 3].map((day) => ({
      id: `review-${day}`, eventId: null, reviewerName: `Guest ${day}`, rating: 5, comment: "Lovely.",
      createdAt: `2026-07-0${day}T10:00:00.000Z`, verificationStatus: "verified" as const, source: "catchEvent" as const,
      isAnonymous: false, ownerResponse: null,
    })),
  };
}

describe("eventPageFromListing", () => {
  it("arranges a Catch event as its read model would, without dating framing", () => {
    const page = eventPageFromListing(listing(true), "listing-dinner");
    expect(page?.item.source).toBe("catch");
    const event = page?.item.event as HostListingCatchEvent;
    expect([event.activityKind, event.title, event.admissionLabels, event.catchExperienceActivities, "scorecard" in event])
      .toEqual(["openActivity", "Hosted event", ["approval"], ["introductions"], false]);
    expect(page?.capacity).toEqual({state: "full", capacityLimit: 20, bookedCount: 20, waitlistedCount: 3, spotsLeft: 0,
      waitlistAvailable: true});
    expect(page?.reviews.map((review) => review.id)).toEqual(["review-3", "review-2"]);
    expect(page?.moreEvents).toEqual([]);
    const view = buildEventPageView(page!, Date.parse("2098-12-01T00:00:00.000Z"));
    expect(view.kindLabel).not.toMatch(/single|mixer|dating/iu);
    expect(view.going?.title).toBe("20 going · full");
  });

  it("books an imported event on its source", () => {
    const page = eventPageFromListing(listing(true), "listing-run");
    expect(page?.item.booking).toEqual({kind: "external", url: "https://lu.ma/example-run", label: "Luma"});
    expect(page?.capacity.state).toBe("external");
  });

  it("withholds reviews the organiser's page cannot show, and unknown events", () => {
    expect(eventPageFromListing(listing(false), "listing-run")?.reviews).toEqual([]);
    expect(eventPageFromListing(listing(true), "missing")).toBeNull();
  });
});
