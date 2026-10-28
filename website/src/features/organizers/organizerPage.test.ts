import {describe, expect, it} from "vitest";
import {claimedOrganizerPage, organizerPageReadAt, organizerStoryListing} from "../../stories/fixtures/organizerPages";
import {hostListings as demoListings} from "../../stories/fixtures/hostListings";
import {atReadTime, organizerPageFromListing, organizerPageRecord} from "./organizerPage";
import type {HostListing, OrganizerPublicPageDocument} from "./types";

function readModel(): OrganizerPublicPageDocument {
  const {profile, links, ...page} = claimedOrganizerPage;
  return {
    ...page, schemaVersion: 1, legacyPaths: [], builtAt: {_seconds: 1_790_000_000, _nanoseconds: 0}, contentHash: "hash",
    links: links.map((link) => ({...link, showUntil: link.showUntil ? {_seconds: Date.parse(link.showUntil) / 1000, _nanoseconds: 0} : null})),
    recommendable: true, recommendedOrganizers: [],
    listing: {...organizerStoryListing(claimedOrganizerPage), facts: profile.facts, host: profile.host},
  };
}

describe("organizerPageRecord", () => {
  it("keeps the read model's sections and hands the client ISO times", () => {
    const record = organizerPageRecord(readModel(), organizerPageReadAt);
    expect(record.links[0].showUntil).toBe("2026-11-14T12:00:00.000Z");
    expect(record.identity).toEqual(claimedOrganizerPage.identity);
    expect(record.reviewSummary).toEqual(claimedOrganizerPage.reviewSummary);
    expect(record.profile).toMatchObject({listingVariant: "appCreatedClub", host: {name: "Kabir Rao"}});
    expect(record).not.toHaveProperty("listing");
    expect(record).not.toHaveProperty("recommendedOrganizers");
  });

  it("moves events that ended after the page was built into past moments", () => {
    const later = Date.parse("2026-11-10T00:00:00+05:30");
    const record = organizerPageRecord(readModel(), later);
    expect(record.upcomingEvents.map((item) => item.eventId)).toEqual(["lantern-night-14", "lantern-15k-22", "lantern-sun-29"]);
    expect(record.pastMoments.slice(0, 3).map((item) => item.eventId)).toEqual(["lantern-wed-4", "lantern-sun-1", "lantern-sun-oct-25"]);
  });

  it("caps past moments at the read model's limit", () => {
    const many = Array.from({length: 30}, (_, index) => ({...claimedOrganizerPage.pastMoments[0], eventId: `past-${index}`}));
    expect(atReadTime({...claimedOrganizerPage, pastMoments: many}, organizerPageReadAt).pastMoments).toHaveLength(24);
  });
});

describe("organizerPageFromListing", () => {
  const demo = (demoListings as HostListing[]).find((listing) => listing.catchEvents?.length)!;

  it("builds the same record from a listing, as the read model's builder does", () => {
    const record = organizerPageFromListing(demo, Date.parse("2026-01-01T00:00:00Z"));
    expect(record).toMatchObject({organizerId: demo.id, path: demo.path, links: [],
      followerCount: demo.metrics?.followerCount ?? 0, identity: {name: demo.name, verified: true}});
    const ids = [...record.upcomingEvents, ...record.pastMoments].map((item) => item.eventId).sort();
    expect(ids).toEqual((demo.catchEvents ?? []).map((event) => event.id).sort());
    for (const item of record.upcomingEvents) {
      expect(item.booking).toMatchObject({kind: "catch", path: `/events/${item.eventId}/`});
    }
  });

  it("averages verified reviews only, counts every review and hides them when they are not readable", () => {
    const reviews = [
      {...demo.reviews[0], rating: 5, verificationStatus: "verified" as const, createdAt: "2026-01-01T00:00:00Z"},
      {...demo.reviews[0], rating: 3, verificationStatus: "verified" as const, createdAt: "2026-02-01T00:00:00Z"},
      {...demo.reviews[0], rating: 1, verificationStatus: "unverified" as const, createdAt: "2026-03-01T00:00:00Z"},
    ];
    const readable = {...demo, reviews, capabilities: {...demo.capabilities,
      publicReviews: {...demo.capabilities.publicReviews, readState: "enabled" as const}}};
    const record = organizerPageFromListing(readable, organizerPageReadAt);
    expect(record.reviewSummary).toEqual({readState: "enabled", rating: 4, count: 3, verifiedCount: 2,
      distribution: {"1": 1, "2": 0, "3": 1, "4": 0, "5": 1}});
    expect(record.latestReviews.map((review) => review.createdAt)).toEqual(
      ["2026-03-01T00:00:00Z", "2026-02-01T00:00:00Z", "2026-01-01T00:00:00Z"]);
    const hidden = organizerPageFromListing({...readable, capabilities: {...readable.capabilities,
      publicReviews: {...readable.capabilities.publicReviews, readState: "disabled"}}}, organizerPageReadAt);
    expect(hidden).toMatchObject({latestReviews: [], reviewSummary: {readState: "disabled", count: 0, rating: null}});
  });
});
