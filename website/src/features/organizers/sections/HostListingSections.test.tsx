import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {hostListings} from "../data";
import {hostListings as demoListings} from "../../../stories/fixtures/hostListings";
import type {HostListing} from "../types";
import type {ListingClaimController} from "../../claims/useListingClaimController";
import {useHostListingPageController} from "../useHostListingPageController";
import {HostListingSections} from "./HostListingSections";
import {PublicSiteHeader, WebsitePageMain} from "../../../shared/site";
import {ListingFactsSection} from "./ListingFactsSection";

vi.mock("../../../firebaseConfig", () => ({publicReviewsFirebaseConfigured: false, claimFirebaseConfigured: false}));
vi.mock("../../../analytics", () => ({trackMarketingEvent: vi.fn()}));
vi.mock("../analytics", () => ({trackOrganizerAnalytics: vi.fn(), observeOrganizerPageView: vi.fn(() => () => undefined)}));
vi.mock("../observeOrganizerProviders", () => ({observeOrganizerProviders: vi.fn(() => () => undefined)}));

afterEach(cleanup);

function Profile({listing}: {listing: HostListing}) {
  const controller = useHostListingPageController(listing);
  const claimController = {presentation: {panel: "hidden"}} as ListingClaimController;
  return <><PublicSiteHeader />
    <WebsitePageMain id="profile"><HostListingSections listing={listing} controller={controller}
      claimController={claimController} /></WebsitePageMain></>;
}

function renderProfile(listing: HostListing) {
  return render(<QueryClientProvider client={new QueryClient({defaultOptions: {
    queries: {retry: false},
  }})}><Profile listing={listing} /></QueryClientProvider>);
}

function externalListing(): HostListing {
  return {...hostListings[0], catchEvents: [], externalEvents: [{
    id: "external-test", title: "Official-source social run", activityKind: "socialRun",
    availability: "read_only_external", startTime: "2099-01-01T10:00:00Z",
    endTime: null, date: "Jan 1, 2099", location: "Mumbai", summary: "Public event",
    priceLabel: "See source", sourceLabel: "Official source",
    sourceHref: "https://example.com/events/official", externalLinkCount: 1,
    dedupeKey: "official-test",
  }]};
}

describe("organizer presence sections", () => {
  it("only badges events with explicit participation tools, never an entire organiser", () => {
    const listing = externalListing();
    const demo = (demoListings as HostListing[]).find((item) => item.catchEvents?.length)!;
    listing.catchEvents = [
      {...demo.catchEvents![0], title: "Participation event", catchExperienceActivities: ["rotations"]},
      {...demo.catchEvents![0], id: "booking-only", title: "Booking only", catchExperienceActivities: undefined},
    ];
    const {container} = renderProfile(listing);
    expect(screen.getAllByText("Catch Experience")).toHaveLength(1);
    const badge = screen.getByText("Catch Experience");
    expect(badge.closest("article")?.textContent).toContain("Participation event");
    expect(container.querySelector("#listing-profile-title")?.parentElement?.textContent).not.toContain("Catch Experience");
  });

  it("keeps external events first with real details/source links and all anchor sections visible", () => {
    const listing = externalListing();
    const {container} = renderProfile(listing);
    const events = container.querySelector("#events")!;
    const about = container.querySelector("#about")!;
    const reviews = container.querySelector("#reviews")!;
    const localNav = screen.getByRole("navigation", {name: "On this profile"});
    const globalNav = screen.getByRole("navigation", {name: "Primary"});
    expect(within(globalNav).getAllByRole("link").map((link) => link.textContent))
      .toEqual(["Find events", "Organisers", "For organisers"]);
    for (const label of ["Events", "About", "Reviews"]) {
      expect(within(localNav).getByRole("link", {name: label})).toBeTruthy();
      expect(within(globalNav).queryByRole("link", {name: label})).toBeNull();
      for (const link of screen.getAllByRole("link", {name: label})) {
        expect(container.querySelector(link.getAttribute("href")!)).toBeTruthy();
      }
    }
    expect(events.compareDocumentPosition(about) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(about.compareDocumentPosition(reviews) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(events as HTMLElement).getByRole("link", {name: "View event details"})
      .getAttribute("href")).toBe("/events/external-test/");
    expect(events.querySelector('a[href="https://example.com/events/official"]')
      ?.getAttribute("target")).toBe("_blank");
    expect(events.querySelector('a[href="https://example.com/events/official"]')
      ?.getAttribute("rel")).toContain("noreferrer");
    expect(screen.queryByRole("link", {name: /contact host|book now|reply/iu})).toBeNull();
    expect(screen.queryByRole("button", {name: /contact host|book now|reply/iu})).toBeNull();
    expect(container.querySelector("#fit")).toBeNull();
    expect(container.querySelector("#profile-information summary")).toBeTruthy();
    expect(within(about as HTMLElement).getByText(listing.description)).toBeTruthy();
    // Intake evidence (summaries, source notes, confidence) is never visitor copy.
    expect(within(about as HTMLElement).queryByText(listing.sourceSummary)).toBeNull();
    for (const source of listing.sources) {
      expect(screen.queryByText(source.detail)).toBeNull();
    }
    expect(screen.queryByText(/pressure mechanic|prototype/iu)).toBeNull();
    for (const source of listing.sources.filter((item) => item.href)) {
      expect(container.querySelector(`a[href="${source.href}"]`)).toBeTruthy();
    }
  });

  it("keeps Catch and external supply, event evidence, and success accessible together", () => {
    const demo = (demoListings as HostListing[]).find((listing) => listing.catchEvents?.length)!;
    const listing = {...externalListing(), catchEvents: demo.catchEvents,
      eventSuccessSummary: demo.eventSuccessSummary};
    const {container} = renderProfile(listing);
    expect(container.querySelector("#events")).toBeTruthy();
    expect(container.querySelector("#external-events")).toBeTruthy();
    expect(container.querySelector("#event-success")).toBeTruthy();
    for (const event of listing.catchEvents ?? []) {
      expect(container.querySelector(`a[href="/events/${event.id}/"]`)).toBeTruthy();
    }
    for (const evidence of listing.eventEvidence) {
      expect(screen.getByText(evidence.title)).toBeTruthy();
    }
  });

  it("keeps About and Reviews reachable when no events have been published", () => {
    const {container} = renderProfile({...hostListings[0], catchEvents: [], externalEvents: []});
    expect(container.querySelector("#events")).toBeTruthy();
    expect(screen.getByText("More good plans to come.")).toBeTruthy();
    expect(container.querySelector("#event-evidence")).toBeTruthy();
    for (const link of screen.getAllByRole("link", {name: "Events"})) {
      expect(link.getAttribute("href")).toBe("#events");
    }
    expect(container.querySelector("#about")).toBeTruthy();
    expect(container.querySelector("#reviews")).toBeTruthy();
    expect(screen.getByText("No published Catch events yet")).toBeTruthy();
  });

  it("preserves source facts while hiding review facts when the review target is unavailable", () => {
    const listing = {...hostListings[0], facts: [
      {label: "Location evidence", value: "Mumbai community"},
      {label: "Review rating", value: "5 stars"},
    ], capabilities: {...hostListings[0].capabilities, publicReviews: {
      targetState: "disabled" as const, readState: "disabled" as const,
      writeState: "disabled" as const, reason: "No verified review target.",
    }}};
    render(<ListingFactsSection listing={listing} />);
    expect(screen.getByText("Mumbai community")).toBeTruthy();
    expect(screen.queryByText("5 stars")).toBeNull();
  });
});
