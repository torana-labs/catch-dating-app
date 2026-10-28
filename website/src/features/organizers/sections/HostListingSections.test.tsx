import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {
  claimedOrganizerPage,
  emptyCalendarOrganizerPage,
  generatedOrganizerPage,
  noReviewsOrganizerPage,
  organizerPageReadAt,
  organizerStoryListing,
} from "../../../stories/fixtures/organizerPages";
import {hostListings as demoListings} from "../../../stories/fixtures/hostListings";
import {HostListingPage} from "../HostListingPage";
import type {OrganizerPageRecord} from "../organizerPage";
import type {HostListing} from "../types";

vi.mock("../../../analytics", () => ({trackMarketingEvent: vi.fn(), getMarketingConsent: () => null,
  marketingConsentChangedEvent: "catch:marketing-consent-changed"}));
vi.mock("../analytics", () => ({trackOrganizerAnalytics: vi.fn(), observeOrganizerPageView: vi.fn(() => () => undefined)}));
vi.mock("../observeOrganizerProviders", () => ({observeOrganizerProviders: vi.fn(() => () => undefined)}));

afterEach(cleanup);

function renderPage(page: OrganizerPageRecord | null, listing: HostListing = organizerStoryListing(page ?? claimedOrganizerPage)) {
  return render(
    <QueryClientProvider client={new QueryClient({defaultOptions: {queries: {retry: false}}})}>
      <HostListingPage listing={listing} page={page} readAt={organizerPageReadAt} />
    </QueryClientProvider>,
  );
}

const follows = (first: Element, second: Element) =>
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("HostListingSections", () => {
  it("opens with identity, follow, the next event and the pinned link, then the calendar, moments, reviews and about", () => {
    const {container} = renderPage(claimedOrganizerPage);
    const name = screen.getByRole("heading", {level: 1, name: "Lantern Lane Runners"});
    const follow = screen.getByRole("button", {name: "Follow"});
    const nextUp = screen.getByRole("link", {name: /Next up · in 2 days/u});
    const links = screen.getByRole("navigation", {name: "Links"});
    const order = [name, follow, nextUp, links, container.querySelector("#events")!,
      screen.getByRole("heading", {name: "What it’s like"}), container.querySelector("#reviews")!,
      container.querySelector("#about")!, container.querySelector("footer")!];
    for (let index = 1; index < order.length; index += 1) expect(follows(order[index - 1], order[index])).toBe(true);
    expect(within(links).getAllByRole("link")[0].textContent).toContain("Lantern Night · Sat 14 Nov");
    expect(screen.getByRole("img", {name: "Claimed by the organiser"})).toBeTruthy();
    expect(screen.queryByRole("navigation", {name: "Primary"})).toBeNull();
    expect(screen.getByRole("link", {name: "Make a page like this"}).getAttribute("href")).toBe("/host/");
  });

  it("links Catch events to their page and imported events to where they are sold", () => {
    const {container} = renderPage(claimedOrganizerPage);
    const events = within(container.querySelector("#events") as HTMLElement);
    expect(events.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/events/lantern-sun-1/", "/events/lantern-wed-4/", "https://luma.com/lantern-lantern-night-14",
      "/events/lantern-15k-22/", "/events/lantern-sun-29/",
    ]);
    expect(events.getAllByText("On Catch")).toHaveLength(4);
    expect(events.getByText("Luma")).toBeTruthy();
  });

  it("keeps the Catch header and the claim pitch on a generated page, and never shows intake notes", () => {
    const {container} = renderPage(generatedOrganizerPage);
    expect(screen.getByRole("navigation", {name: "Primary"})).toBeTruthy();
    expect(screen.getByText("Built from public pages · not claimed yet")).toBeTruthy();
    const claim = container.querySelector("#claim") as HTMLElement;
    expect(follows(claim, container.querySelector("#events")!)).toBe(true);
    expect(within(claim).getByRole("link", {name: "Claim this page"}).getAttribute("href")).toBe("/claim/harbour-line-run-club/");
    expect(claim.textContent).toContain("38 people asked to hear about your next event, and 2 people left reviews.");
    expect(screen.queryByText("Seeded by an operator")).toBeNull();
    expect(screen.queryByText(/Claim state|Unclaimed seed listing/u)).toBeNull();
    expect(screen.queryByRole("img", {name: "Claimed by the organiser"})).toBeNull();
    expect(screen.getAllByText("Harbour Line Run Club hasn’t claimed this page, so they can’t reply yet.")).toHaveLength(2);
    expect(screen.getByRole("link", {name: "Something wrong? Tell us"}).getAttribute("href")).toBe("/help/");
  });

  it("hides the follow-by-phone sheet and the review form until their backends land", () => {
    renderPage(generatedOrganizerPage);
    expect(screen.queryByRole("button", {name: "Write a review"})).toBeNull();
    expect(screen.queryByLabelText(/Mobile number/u)).toBeNull();
  });

  it("says when the calendar is empty and when nobody has reviewed yet", () => {
    renderPage(emptyCalendarOrganizerPage);
    expect(screen.getByText("Nothing on the calendar yet")).toBeTruthy();
    expect(screen.queryByRole("link", {name: /Next up/u})).toBeNull();
    cleanup();
    renderPage(noReviewsOrganizerPage);
    expect(screen.getByText("No reviews yet")).toBeTruthy();
    expect(screen.queryByText(/★ ·/u)).toBeNull();
  });

  it("renders from the listing when the route has no read model", () => {
    const demo = (demoListings as HostListing[]).find((listing) => listing.catchEvents?.length)!;
    renderPage(null, demo);
    expect(screen.getByRole("heading", {level: 1, name: demo.name})).toBeTruthy();
  });
});
