import {describe, expect, it} from "vitest";
import {eventDetailCopy} from "../../content/events";
import {hostListings} from "../organizers/data";
import type {
  HostListing,
  HostListingCatchEvent,
  HostListingExternalEvent,
} from "../organizers/types";
import {
  buildPublicEventDetailRecords,
  getEventDetailForPath,
} from "./eventDetailModel";

const now = Date.parse("2026-07-24T00:00:00.000Z");

describe("event detail records", () => {
  it("resolves public Catch and external events to canonical read-only routes", () => {
    const listing = eventReadyListing();
    const records = buildPublicEventDetailRecords([listing], now);

    expect(records.map((record) => ({
      eventId: record.eventId,
      path: record.path,
      registrationState: record.registrationState,
      supply: record.supply,
    }))).toEqual([
      {
        eventId: "catch-future",
        path: "/events/catch-future/",
        registrationState: "webOtp",
        supply: "catchNative",
      },
      {
        eventId: "external-future",
        path: "/events/external-future/",
        registrationState: "external",
        supply: "external",
      },
    ]);
    expect(getEventDetailForPath("/events/catch-future", records)?.eventId)
      .toBe("catch-future");
    expect(getEventDetailForPath("/events/missing/", records)).toBeNull();
  });

  it("shows only reviews explicitly scoped to the event id", () => {
    const records = buildPublicEventDetailRecords([eventReadyListing()], now);
    const catchEvent = records.find((record) => record.eventId === "catch-future");

    expect(catchEvent?.eventReviews).toHaveLength(1);
    expect(catchEvent?.eventReviews[0]).toMatchObject({
      eventId: "catch-future",
      reviewerName: "Scoped reviewer",
    });
  });

  it("keeps phone OTP registration available as a waitlist when full", () => {
    const listing = eventReadyListing();
    const event = listing.catchEvents![0];
    const records = buildPublicEventDetailRecords([{
      ...listing,
      catchEvents: [{...event, bookedCount: event.capacityLimit}],
    }], now);

    expect(records[0]).toMatchObject({
      registrationState: "webOtp",
      remainingCapacity: 0,
    });
  });

  it("distinguishes restricted registration from a completed event", () => {
    const listing = eventReadyListing();
    listing.catchEvents![0] = {...listing.catchEvents![0], registrationMode: "closed", publicRegistrationEnabled: false, registrationAccess: "restricted"};
    expect(buildPublicEventDetailRecords([listing], now)[0].registrationState).toBe("catchApp");
    expect(buildPublicEventDetailRecords([listing], now + 365 * 86400000)[0].registrationState).toBe("closed");
  });

  it("fails closed for unpublished organizers and ambiguous duplicate event ids", () => {
    const published = eventReadyListing();
    const duplicate = {
      ...eventReadyListing(),
      id: "duplicate-organizer",
      catchEvents: [{
        ...published.catchEvents![0],
        id: "external-future",
      }],
      externalEvents: [],
    };
    const unpublished = {
      ...eventReadyListing(),
      id: "unpublished-organizer",
      authority: {
        ...published.authority,
        publishStatus: "qa" as const,
      },
    };

    const records = buildPublicEventDetailRecords(
      [published, duplicate, unpublished],
      now
    );

    expect(records.map((record) => record.eventId)).toEqual(["catch-future"]);
  });
});

function eventReadyListing(): HostListing {
  const base = hostListings[0];
  return {
    ...base,
    authority: {
      ...base.authority,
      claimState: "unclaimed",
      ownershipState: "programmatic",
      publishStatus: "published",
      verificationStatus: "sourceBacked",
    },
    capabilities: {
      ...base.capabilities,
      publicReviews: {
        targetState: "enabled",
        readState: "enabled",
        writeState: "disabled",
        reason: "Read-only test fixture.",
      },
    },
    catchEvents: [catchEvent()],
    externalEvents: [externalEvent()],
    reviews: [
      {
        id: "event-review",
        eventId: "catch-future",
        reviewerName: "Scoped reviewer",
        rating: 5,
        comment: "This review belongs to this event.",
        createdAt: "2026-07-23T12:00:00.000Z",
        verificationStatus: "verified",
        source: "catchEvent",
        isAnonymous: false,
        ownerResponse: null,
      },
      {
        id: "organizer-review",
        eventId: null,
        reviewerName: "Organizer reviewer",
        rating: 4,
        comment: "This review belongs only to the organizer.",
        createdAt: "2026-07-22T12:00:00.000Z",
        verificationStatus: "unverified",
        source: "publicListing",
        isAnonymous: false,
        ownerResponse: null,
      },
    ],
  };
}

function catchEvent(): HostListingCatchEvent {
  return {
    id: "catch-future",
    role: "hostEventSetup",
    title: eventDetailCopy.hero.catchActionHeading,
    activityKind: "dinner",
    timeline: "upcoming",
    startTime: "2026-08-01T13:30:00.000Z",
    endTime: "2026-08-01T15:30:00.000Z",
    timezone: "Asia/Kolkata",
    date: "Aug 1, 2026, 7:00 PM-9:00 PM",
    location: "Mumbai",
    locationDetails: "Exact table shared in Catch.",
    summary: "A small hosted dinner.",
    capacityLimit: 20,
    bookedCount: 12,
    checkedInCount: 0,
    waitlistedCount: 0,
    priceLabel: "₹1,500",
    publicRegistrationEnabled: true,
  };
}

function externalEvent(): HostListingExternalEvent {
  return {
    id: "external-future",
    title: eventDetailCopy.hero.externalActionHeading,
    activityKind: "socialRun",
    availability: "read_only_external",
    startTime: "2026-08-02T01:30:00.000Z",
    endTime: "2026-08-02T03:30:00.000Z",
    timezone: "Asia/Kolkata",
    date: "Aug 2, 2026, 7:00 AM-9:00 AM",
    location: "Indore",
    summary: "A source-attributed public event.",
    priceLabel: "Free RSVP",
    sourceLabel: "Luma",
    sourceHref: "https://luma.com/example",
    externalLinkCount: 1,
    dedupeKey: "external-social-run-2026-08-02",
  };
}
