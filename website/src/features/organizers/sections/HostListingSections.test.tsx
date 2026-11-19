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
import {guestAppActionLabel} from "../../../content/site";

vi.mock("../../../analytics", () => ({trackMarketingEvent: vi.fn(), getMarketingConsent: () => null, openMarketingConsentPreferences: vi.fn(),
  marketingConsentChangedEvent: "catch:marketing-consent-changed"}));
vi.mock("../analytics", () => ({trackOrganizerAnalytics: vi.fn(), observeOrganizerPageView: vi.fn(() => () => undefined)}));
vi.mock("../observeOrganizerProviders", () => ({observeOrganizerProviders: vi.fn(() => () => undefined)}));

afterEach(cleanup);

function renderPage(page: OrganizerPageRecord | null, listing: HostListing = organizerStoryListing(page ?? claimedOrganizerPage),
  props: Partial<Parameters<typeof HostListingPage>[0]> = {}) {
  return render(
    <QueryClientProvider client={new QueryClient({defaultOptions: {queries: {retry: false}}})}>
      <HostListingPage listing={listing} page={page} readAt={organizerPageReadAt} {...props} />
    </QueryClientProvider>,
  );
}

const follows = (first: Element, second: Element) =>
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("HostListingSections", () => {
  // The whole page and its many role queries: a loaded machine needs more than the default 5s.
  it("opens with identity, follow, the next event and the pinned link, then the calendar, moments, reviews, about and the site footer", () => {
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
    expect(screen.getByRole("img", {name: "Verified organiser"})).toBeTruthy();
    // Every organiser page carries the one site header, with the main site's links.
    const primary = screen.getByRole("navigation", {name: "Primary"});
    expect(within(primary).getAllByRole("link").map((link) => link.textContent)).toEqual(["What’s on", "Safety", "For hosts"]);
    expect(within(screen.getByRole("banner")).getByRole("link", {name: guestAppActionLabel}).getAttribute("href")).toBe("/app/");
    // ...and the one site footer: Explore, Hosts and Help and legal.
    const footer = within(screen.getByRole("contentinfo"));
    expect(footer.getByRole("link", {name: "What’s on"}).getAttribute("href")).toBe("/explore/");
    expect(footer.getByRole("link", {name: "Weddings"})).toBeTruthy();
    expect(footer.getByRole("button", {name: "Privacy choices"})).toBeTruthy();
    // Each proof line has data behind it; the rating counts verified reviews only and says how many.
    // The hero carries them across the page, above the rail.
    const rail = container.querySelector("aside[aria-label='Lantern Lane Runners']")!;
    const hero = name.closest("main")!;
    for (const stat of ["2,140 followers", "4.8 ★ · 120 verified reviews", "12 nights hosted"]) {
      expect(hero.textContent).toContain(stat);
      expect(rail.textContent).not.toContain(stat);
    }
    expect(within(rail as HTMLElement).getByRole("navigation", {name: "Social profiles"})).toBeTruthy();
    // The help band ends every organiser page with the WhatsApp line.
    expect(footer.getByText("We reply on WhatsApp, usually within an hour.")).toBeTruthy();
    expect(screen.getByRole("link", {name: "Make a page like this"}).getAttribute("href")).toBe("/host/");
  }, 20_000);

  it("links Catch events to their page and imported events to where they are sold", () => {
    const {container} = renderPage(claimedOrganizerPage);
    const events = within(container.querySelector("#events") as HTMLElement);
    expect(events.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/events/lantern-sun-1/", "/events/lantern-wed-4/", "https://luma.com/lantern-lantern-night-14",
      "/events/lantern-15k-22/", "/events/lantern-sun-29/",
    ]);
    expect(events.getByRole("heading", {name: "Coming up"})).toBeTruthy();
    expect(events.getByText("From Catch and Luma, in one list")).toBeTruthy();
    expect(events.getAllByText("On Catch")).toHaveLength(4);
    expect(events.getByText("Luma")).toBeTruthy();
  });

  it("labels each review Booked on Catch or Unverified and explains the labels", () => {
    const {container} = renderPage(claimedOrganizerPage);
    const reviews = within(container.querySelector("#reviews") as HTMLElement);
    expect(reviews.getAllByText("Booked on Catch")).toHaveLength(2);
    expect(reviews.getAllByText("Unverified")).toHaveLength(1);
    expect(reviews.getByText("Booked on Catch means the reviewer booked through Catch. Unverified reviews are shown, and labelled.")).toBeTruthy();
    expect(reviews.getByText("from 120 verified reviews")).toBeTruthy();
    expect(reviews.getByText("Kabir")).toBeTruthy();
  });

  it("keeps the Catch header and the claim pitch on a generated page, and never shows intake notes", () => {
    const {container} = renderPage(generatedOrganizerPage);
    expect(screen.getByRole("navigation", {name: "Primary"})).toBeTruthy();
    const claim = container.querySelector("#claim") as HTMLElement;
    expect(follows(claim, container.querySelector("#events")!)).toBe(true);
    expect(within(claim).getByRole("heading", {name: "Run this club?"})).toBeTruthy();
    expect(claim.textContent).toContain("Claim this page to edit it, add events and take bookings, or ask us to remove it.");
    expect(within(claim).getByRole("link", {name: "Claim this page"}).getAttribute("href")).toBe("/claim/harbour-line-run-club/");
    expect(within(claim).getByRole("link", {name: "Ask us to remove it"}).getAttribute("href")).toBe("/listings/request/?organizer=harbour-line-run-club");
    expect(container.textContent).not.toMatch(/already working for you|Meta Pixel|asked to hear about your next event/u);
    expect(screen.queryByText("Seeded by an operator")).toBeNull();
    expect(screen.queryByText(/Claim state|Unclaimed seed listing/u)).toBeNull();
    expect(screen.queryByRole("img", {name: "Verified organiser"})).toBeNull();
    expect(screen.getAllByText("Harbour Line Run Club hasn’t claimed this page, so they can’t reply yet.")).toHaveLength(2);
    expect(screen.getByRole("link", {name: "Something wrong? Tell us"}).getAttribute("href")).toBe("/listings/request/?organizer=harbour-line-run-club");
    // No verified review yet, so no rating anywhere on the page.
    expect(screen.queryByText(/★ ·/u)).toBeNull();
    expect(screen.getByText("2 reviews, none from a Catch booking yet, so no rating.")).toBeTruthy();
  });

  it("labels an unclaimed page in words beside the name, with Claim and Report or remove, and a claimed page with neither", () => {
    renderPage(generatedOrganizerPage);
    const name = screen.getByRole("heading", {level: 1, name: "Harbour Line Run Club"});
    const tag = screen.getByText("Unclaimed · Not affiliated with Catch. Built from public pages.");
    const claim = screen.getAllByRole("link", {name: "Claim this page"})[0];
    const report = screen.getByRole("link", {name: "Report or remove this listing"});
    expect(report.textContent).toBe("Report or remove");
    for (const [first, second] of [[name, tag], [tag, claim], [claim, report], [report, screen.getByRole("button", {name: "Follow"})]]) {
      expect(follows(first, second)).toBe(true);
    }
    expect(claim.getAttribute("href")).toBe("/claim/harbour-line-run-club/");
    // Every report link on an unclaimed page opens the request form with this organiser filled in.
    // (The site footer's own link to the form, with no listing, is the site's, not this page's.)
    const reportLinks = within(screen.getByRole("main")).getAllByRole("link").filter((link) => link.getAttribute("href")?.startsWith("/listings/request/"));
    expect(reportLinks.map((link) => link.getAttribute("href"))).toEqual(Array(3).fill("/listings/request/?organizer=harbour-line-run-club"));
    cleanup();
    renderPage(claimedOrganizerPage);
    expect(screen.queryByText(/Unclaimed|Not affiliated/u)).toBeNull();
    expect(screen.queryByRole("link", {name: "Claim this page"})).toBeNull();
    expect(document.querySelector("#claim")).toBeNull();
    // A claimed page keeps its one report link at the foot.
    expect(screen.getByRole("link", {name: "Report or remove this listing"}).getAttribute("href"))
      .toBe(`/listings/request/?organizer=${claimedOrganizerPage.organizerId}`);
  });

  it("drops Claim from beside the tag while a claim is reviewed, and keeps the report link", () => {
    renderPage({...generatedOrganizerPage, claim: {...generatedOrganizerPage.claim, state: "claimPending"}});
    expect(screen.getByText("Unclaimed · Not affiliated with Catch. Built from public pages.")).toBeTruthy();
    expect(screen.queryByRole("link", {name: "Claim this page"})).toBeNull();
    expect(screen.getByText("A claim for this page is being reviewed.")).toBeTruthy();
    expect(screen.getByRole("link", {name: "Report or remove this listing"}).getAttribute("href")).toBe("/listings/request/?organizer=harbour-line-run-club");
  });

  it("says nothing about the organiser's own domain until custom domains ship", () => {
    const {container} = renderPage(generatedOrganizerPage);
    expect(container.textContent).not.toMatch(/own domain|custom domain/iu);
    cleanup();
    const claimed = renderPage(claimedOrganizerPage);
    expect(claimed.container.textContent).not.toMatch(/own domain|custom domain/iu);
  });

  it("shows the women-led label when the read model says the organiser is women-led", () => {
    renderPage({...claimedOrganizerPage, womenLed: true});
    expect(screen.getByText("Women-led")).toBeTruthy();
    cleanup();
    renderPage(claimedOrganizerPage);
    expect(screen.queryByText("Women-led")).toBeNull();
    cleanup();
    // Without a read model the page builds its record from the listing, which has no women-led field.
    renderPage(null);
    expect(screen.queryByText("Women-led")).toBeNull();
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
    // The rating counts verified reviews only, and the page says so while there is none.
    expect(screen.getByText("No rating yet. The rating counts only reviews from people who booked on Catch.")).toBeTruthy();
    expect(screen.queryByText(/★ ·/u)).toBeNull();
  });

  it("renders from the listing when the route has no read model", () => {
    const demo = (demoListings as HostListing[]).find((listing) => listing.catchEvents?.length)!;
    renderPage(null, demo);
    expect(screen.getByRole("heading", {level: 1, name: demo.name})).toBeTruthy();
  });
});
