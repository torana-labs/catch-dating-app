// @vitest-environment node
import {readFileSync} from "node:fs";
import {afterEach, describe, expect, it, vi} from "vitest";
import previewCards from "../content/previewCards.json" with {type: "json"};
import {activityMeta} from "../content/marketing";
import {buildPublicEventDetailRecords} from "../features/events/eventDetailModel";
import {hostListings} from "../features/organizers/data";
import type {HostListing, HostListingCatchEvent} from "../features/organizers/types";
vi.mock("server-only", () => ({}));
import {renderGeneratedPreviewCard} from "./generatedPreviewCardImage";
import {
  generatedPreviewCardFor,
  generatedPreviewCardImage,
  generatedPreviewCardVersion,
  pagePathForGeneratedCard,
} from "./generatedPreviewCards";

const now = Date.parse("2026-07-24T00:00:00.000Z");
// Fixture record text; the card must repeat these and nothing private.
const organizerName = "Bandra Run Club";
const eventName = "Sunday Sunrise 5K";
const when = "2 Aug 2026, 6:00 am – 7:30 am";
const area = "Bandra Bandstand";

function listing(events: HostListingCatchEvent[] = []): HostListing {
  const base = hostListings[0];
  return {
    ...base, name: organizerName, city: "Mumbai", path: "/organizers/mumbai/bandra-run-club/",
    authority: {...base.authority, claimState: "unclaimed", ownershipState: "programmatic", publishStatus: "published", verificationStatus: "sourceBacked"},
    catchEvents: events, externalEvents: [],
    reviews: [{id: "r1", eventId: "sunrise", reviewerName: "Private Reviewer", rating: 5, comment: "Loved meeting Asha there",
      createdAt: "2026-07-23T12:00:00.000Z", verificationStatus: "verified", source: "catchEvent", isAnonymous: false, ownerResponse: null}],
  };
}

function event(overrides: Partial<HostListingCatchEvent> = {}): HostListingCatchEvent {
  return {
    id: "sunrise", role: "hostEventSetup", title: eventName, activityKind: "socialRun", timeline: "upcoming",
    startTime: "2026-08-02T00:30:00.000Z", endTime: "2026-08-02T02:00:00.000Z", timezone: "Asia/Kolkata",
    date: when, location: area, locationDetails: "Meet at the gate by Asha's stall.",
    summary: "Guests list: Asha, Ravi.", capacityLimit: 40, bookedCount: 37, checkedInCount: 0, waitlistedCount: 3,
    priceLabel: "₹299", publicRegistrationEnabled: true, photoUrl: null, ...overrides,
  };
}

function eventRecord(overrides: Partial<HostListingCatchEvent> = {}) {
  return buildPublicEventDetailRecords([listing([event(overrides)])], now)[0];
}

describe("generated link-preview cards", () => {
  it("draws an event from its public record: title, date, area, price and organiser", () => {
    expect(generatedPreviewCardFor({listingRoute: null, event: eventRecord()})).toEqual({
      pagePath: "/events/sunrise/", kicker: activityMeta.socialRun.label, title: eventName,
      lines: [when, `${area} · ₹299`], byline: `by ${organizerName}`,
      ground: previewCards.generated.grounds["social-run"], photoUrl: null,
      alt: [eventName, when, area].join(", "),
    });
  });

  it("uses the event's published photo and otherwise its activity ground, never a stand-in", () => {
    expect(generatedPreviewCardFor({listingRoute: null, event: eventRecord({photoUrl: "https://cdn.example/poster.jpg"})})?.photoUrl)
      .toBe("https://cdn.example/poster.jpg");
    expect(generatedPreviewCardFor({listingRoute: null, event: eventRecord({activityKind: "dinner"})})).toMatchObject({
      kicker: activityMeta.dinner.label, photoUrl: null, ground: previewCards.generated.grounds.dinner});
  });

  it("draws an organiser as name, city and activity on its activity ground", () => {
    expect(generatedPreviewCardFor({listingRoute: {listing: listing([event()]), isLegacyPath: false}, event: null})).toEqual({
      pagePath: "/organizers/mumbai/bandra-run-club/", kicker: activityMeta.socialRun.label, title: organizerName,
      lines: ["Mumbai"], byline: null, ground: previewCards.generated.grounds["social-run"], photoUrl: null,
      alt: [organizerName, activityMeta.socialRun.label, "Mumbai"].join(", "),
    });
  });

  it("never carries guests, counts, reviews or private details", () => {
    const record = eventRecord();
    const words = [
      generatedPreviewCardFor({listingRoute: null, event: record}),
      generatedPreviewCardFor({listingRoute: {listing: record.listing, isLegacyPath: false}, event: null}),
    ].flatMap(card => [card!.kicker, card!.title, ...card!.lines, card!.byline ?? "", card!.alt]).join("\n");
    for (const secret of ["Asha", "Ravi", "Private Reviewer", "37", "40", "gate"]) expect(words).not.toContain(secret);
  });

  it("gives pages without a public record no generated card", () => {
    expect(generatedPreviewCardFor({listingRoute: null, event: null})).toBeNull();
  });

  it("versions the URL by everything drawn, so an edit refreshes the card", () => {
    const card = generatedPreviewCardFor({listingRoute: null, event: eventRecord()})!;
    const version = generatedPreviewCardVersion(card);
    expect(generatedPreviewCardVersion({...card})).toBe(version);
    const sequel = `${eventName} II`;
    const renamed = generatedPreviewCardFor({listingRoute: null, event: eventRecord({title: sequel})})!;
    for (const changed of [renamed, {...card, lines: ["3 Aug 2026", card.lines[1]]}, {...card, photoUrl: "https://cdn.example/new.jpg"}]) {
      expect(generatedPreviewCardVersion(changed)).not.toBe(version);
    }
    expect(generatedPreviewCardImage(card)).toEqual({url: `https://catchdates.com/og/events/sunrise/card.png?v=${version}`,
      width: 1200, height: 630, alt: card.alt});
  });

  it("serves only organiser and event pages from the image route", () => {
    expect(pagePathForGeneratedCard(["events", "sunrise", "card.png"])).toBe("/events/sunrise/");
    expect(pagePathForGeneratedCard(["organizers", "mumbai", "bandra-run-club", "card.png"])).toBe("/organizers/mumbai/bandra-run-club/");
    for (const segments of [["events", "sunrise"], ["booking", "sunrise", "card.png"], ["join", "token", "card.png"],
      ["organizers", "card.png"], ["events", "..", "card.png"], ["events", "a/b", "card.png"], ["f", "form", "card.png"]]) {
      expect(pagePathForGeneratedCard(segments), segments.join("/")).toBeNull();
    }
  });
});

describe("drawing a generated card", () => {
  const card = generatedPreviewCardFor({listingRoute: null, event: eventRecord()})!;

  function size(png: ArrayBuffer) {
    const bytes = Buffer.from(png);
    expect(bytes.subarray(1, 4).toString("ascii")).toBe("PNG");
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  }

  // The renderer itself fetches its bundled wasm, so only poster URLs are answered here.
  const realFetch = globalThis.fetch;
  function stubPosters(answer: () => Response) {
    const fetch = vi.fn((input: string | URL | Request, init?: RequestInit) =>
      String(input).startsWith("https://") ? Promise.resolve(answer()) : realFetch(input, init));
    vi.stubGlobal("fetch", fetch);
    return fetch;
  }
  const posterCalls = (fetch: ReturnType<typeof stubPosters>) => fetch.mock.calls.filter(([input]) => String(input).startsWith("https://"));
  afterEach(() => vi.unstubAllGlobals());

  it("draws a 1200x630 PNG with the committed fonts and wordmark, without any network", async () => {
    const fetch = stubPosters(() => new Response(null, {status: 500}));
    expect(size(await renderGeneratedPreviewCard(card))).toEqual([1200, 630]);
    expect(posterCalls(fetch)).toEqual([]);
  });

  it("draws a published photo, refusing redirects, and falls back to the ground for anything that is not a JPEG or PNG", async () => {
    const photo = readFileSync("public/assets/events/social-run-music-hero-960.jpg");
    let answer = () => new Response(photo, {headers: {"Content-Type": "image/jpeg"}});
    const fetch = stubPosters(() => answer());
    const withPhoto = await renderGeneratedPreviewCard({...card, photoUrl: "https://cdn.example/poster.jpg"});
    expect(posterCalls(fetch)).toEqual([["https://cdn.example/poster.jpg", expect.objectContaining({redirect: "error"})]]);
    const plain = await renderGeneratedPreviewCard(card);
    expect(withPhoto.byteLength).toBeGreaterThan(plain.byteLength);

    answer = () => new Response("<html>", {headers: {"Content-Type": "text/html"}});
    const refused = await renderGeneratedPreviewCard({...card, photoUrl: "https://cdn.example/page"});
    expect(Buffer.from(refused).equals(Buffer.from(plain))).toBe(true);
  });
});
