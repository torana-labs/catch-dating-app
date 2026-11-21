import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {MemoryRouter} from "react-router";
import {afterEach, describe, expect, it, vi} from "vitest";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import {mumbaiLiveCatalog} from "../../stories/fixtures/homeCatalogs";
import {defaultHomeDiscovery} from "../home/homeDiscovery";
import type {HomeCatalog} from "../home/homeTypes";
import {CityFormatPage} from "./CityFormatPage";
import {mumbaiDiscoveryCatalog, mumbaiEmptyMonthCatalog, puneDiscoveryCatalog} from "./discoveryCatalogFixtures";
import type {DiscoveryFormatKey} from "./discoveryTypes";

vi.mock("../../analytics", async (original) => ({...await original<typeof import("../../analytics")>(), trackMarketingEvent: vi.fn()}));
afterEach(cleanup);

const captures: CaptureSlots = Object.fromEntries(["guest-explore", "guest-checked-in", "guest-web-whats-on"].map((id) => [id, {
  id, device: "generic-phone", webPath: `/captures/${id}.png`, width: 804, height: 1748, alt: `Screen ${id}`, caption: `Caption ${id}`, walkthroughStep: "Find a plan", pages: [],
}]));

const show = (catalog: HomeCatalog, format: DiscoveryFormatKey, url = "/mumbai/run-clubs/") =>
  render(<MemoryRouter initialEntries={[url]}><CityFormatPage catalog={catalog} format={format} /></MemoryRouter>);
const band = (name: string | RegExp) => screen.getByRole("region", {name});

/** The catalog with these organisers' claim states changed, as the read model would carry them. */
const withClaimStates = (catalog: HomeCatalog, states: Record<string, HomeCatalog["plans"]["organizers"][number]["claimState"]>): HomeCatalog => ({
  ...catalog,
  plans: {...catalog.plans, organizers: catalog.plans.organizers.map((organizer) =>
    organizer.organizerId in states ? {...organizer, claimState: states[organizer.organizerId]} : organizer)},
});

/** Settings → Discovery set to show organisers not on Catch yet on the city pages. */
const listedOnCityPages = (catalog: HomeCatalog): HomeCatalog => ({
  ...catalog,
  plans: {...catalog.plans, discovery: {...defaultHomeDiscovery, cityOrganizers: {onCatch: true, notOnCatch: true}}},
});

// Each test renders the whole page, which a loaded CI runner can take seconds over.
describe("City format page", {timeout: 20_000}, () => {
  it("leads an indexed format with the backend's counts, its plans and who runs them", () => {
    show(mumbaiDiscoveryCatalog, "runClubs");
    expect(screen.getByRole("heading", {level: 1, name: "Run clubs in Mumbai"})).toBeTruthy();
    const hero = band("Run clubs in Mumbai");
    expect(within(hero).getByText("runs in the next 30 days")).toBeTruthy();
    const plans = band("Upcoming runs");
    expect(within(plans).getAllByRole("link", {name: /Run/u}).map((link) => link.getAttribute("href")))
      .toEqual(["/events/carter-road-run/", "/events/run-and-rave/"]);
    fireEvent.click(within(plans).getByRole("radio", {name: "Free"}));
    expect(within(plans).getAllByRole("link", {name: /Run/u})).toHaveLength(1);
    // Each organiser as the kit's Follow card: Follow opens their page, where following happens; then the mint card for a club not listed.
    const organisers = band("Who runs them");
    expect(within(organisers).getByRole("link", {name: "Driftwood Bay Runners"}).getAttribute("href")).toBe("/organizers/driftwood-bay-runners/");
    expect(within(organisers).getByRole("link", {name: "Follow Driftwood Bay Runners"}).getAttribute("href")).toBe("/organizers/driftwood-bay-runners/");
    expect(within(organisers).getByRole("heading", {name: "Run a club in Mumbai?"})).toBeTruthy();
    expect(within(organisers).getByRole("link", {name: /List your club/u}).getAttribute("href")).toBe("/host/");
    expect(within(band("Joining a run club in Mumbai.")).getByText(/Stay for coffee/u)).toBeTruthy();
    // The city's other indexed format pages, and the newcomers' page.
    const more = band("Other things to do");
    expect(within(more).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/mumbai/nightlife/", "/new-to-mumbai/"]);
    expect(within(band("Get new plans on WhatsApp.")).getByRole("button", {name: "Notify me"})).toBeTruthy();
  });

  it("labels each unclaimed organiser's card in words with a report link carrying its id, and a claimed one with neither", () => {
    show(listedOnCityPages(withClaimStates(mumbaiDiscoveryCatalog, {"night-shift-socials": "unclaimed"})), "runClubs");
    const organisers = band("Who runs them");
    const cards = within(organisers).getAllByRole("article");
    const card = (name: string) => cards.find((item) => within(item).queryByRole("heading", {name}))!;
    const unclaimed = within(card("Night Shift Socials"));
    expect(unclaimed.getByText("Unclaimed · Not affiliated")).toBeTruthy();
    const report = unclaimed.getByRole("link", {name: "Report or remove the listing for Night Shift Socials"});
    expect(report.textContent).toBe("Report");
    expect(report.getAttribute("href")).toBe("/listings/request/?organizer=night-shift-socials");
    expect(unclaimed.getByRole("link", {name: "Follow Night Shift Socials"})).toBeTruthy();
    const claimed = within(card("Driftwood Bay Runners"));
    expect(claimed.queryByText(/Unclaimed|Not affiliated/u)).toBeNull();
    expect(claimed.queryByRole("link", {name: /Report/u})).toBeNull();
    // Only the unclaimed organiser carries a label or a report link.
    expect(within(organisers).getAllByText("Unclaimed · Not affiliated")).toHaveLength(1);
    expect(within(organisers).getAllByRole("link", {name: /^Report or remove/u})).toHaveLength(1);
  });

  it("leaves unclaimed organisers off the city pages while Settings → Discovery hides them, as by default", () => {
    show(withClaimStates(mumbaiDiscoveryCatalog, {"night-shift-socials": "unclaimed"}), "runClubs");
    const organisers = within(band("Who runs them"));
    expect(organisers.queryByRole("heading", {name: "Night Shift Socials"})).toBeNull();
    expect(organisers.getByRole("heading", {name: "Driftwood Bay Runners"})).toBeTruthy();
  });

  it("labels a joining organiser with no page yet, and one whose claim is under review, the same way", () => {
    show(listedOnCityPages(withClaimStates(puneDiscoveryCatalog, {"jacaranda-park-runners": "unclaimed"})), "runClubs", "/pune/run-clubs/");
    const organisers = band("Who runs them");
    const joining = within(within(organisers).getAllByRole("article")
      .find((item) => within(item).queryByRole("heading", {name: "Jacaranda Park Runners"}))!);
    expect(joining.getByText("Unclaimed · Not affiliated")).toBeTruthy();
    // No page to follow yet, but the listing can still be reported.
    expect(joining.queryByRole("link", {name: /Follow/u})).toBeNull();
    expect(joining.getByRole("link", {name: "Report or remove the listing for Jacaranda Park Runners"}).getAttribute("href"))
      .toBe("/listings/request/?organizer=jacaranda-park-runners");
    cleanup();
    show(listedOnCityPages(withClaimStates(mumbaiDiscoveryCatalog, {"driftwood-bay-runners": "claimPending"})), "runClubs");
    expect(within(band("Who runs them")).getByRole("link", {name: "Report or remove the listing for Driftwood Bay Runners"}).getAttribute("href"))
      .toBe("/listings/request/?organizer=driftwood-bay-runners");
  });

  it("shows a guest checked in by the first-time guide, and the city's What's on page in Safari by the WhatsApp form", () => {
    render(<MemoryRouter initialEntries={["/mumbai/run-clubs/"]}><CityFormatPage captures={captures} catalog={mumbaiDiscoveryCatalog} format="runClubs" /></MemoryRouter>);
    expect(within(band("Joining a run club in Mumbai.")).getByRole("img", {name: "Screen guest-checked-in"})).toBeTruthy();
    expect(within(band("Get new plans on WhatsApp.")).getByRole("img", {name: "Screen guest-web-whats-on"})).toBeTruthy();
    expect(screen.queryByRole("img", {name: "Screen guest-explore"})).toBeNull();
  });

  it("is the thin page below the bar: what is here so far and what else is on", () => {
    show(mumbaiDiscoveryCatalog, "pickleball", "/mumbai/pickleball/");
    expect(screen.getByRole("heading", {level: 1, name: "Pickleball in Mumbai"})).toBeTruthy();
    expect(screen.getByText("Dink and Drink · next: Sat 5:00 PM")).toBeTruthy();
    expect(screen.getByRole("link", {name: "See Dink and Drink"}).getAttribute("href")).toBe("/organizers/dink-and-drink/");
    expect(screen.queryByRole("region", {name: "Upcoming sessions"})).toBeNull();
    cleanup();
    // An unclaimed organiser named on the thin page carries the same label.
    show(listedOnCityPages(withClaimStates(mumbaiDiscoveryCatalog, {"dink-and-drink": "unclaimed"})), "pickleball", "/mumbai/pickleball/");
    expect(screen.getByText("Dink and Drink · next: Sat 5:00 PM · Unclaimed · Not affiliated")).toBeTruthy();
  });

  it("says plans are unavailable rather than show counts it does not have", () => {
    show(mumbaiLiveCatalog, "runClubs");
    expect(screen.getByText("We couldn’t load plans right now.")).toBeTruthy();
    expect(screen.queryByText("runs in the next 30 days")).toBeNull();
  });

  it("links the city's new-to-the-city page from the header and its other format pages from the footer", () => {
    show(mumbaiDiscoveryCatalog, "runClubs");
    expect(within(screen.getByRole("banner")).getByRole("link", {name: "New to Mumbai"}).getAttribute("href")).toBe("/new-to-mumbai/");
    const footer = within(screen.getByRole("navigation", {name: "Footer"}));
    const column = within(footer.getByRole("heading", {level: 2, name: "Things to do in Mumbai"}).parentElement!);
    const hrefs = column.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/mumbai/nightlife/");
    // Tennis has nothing in Mumbai, so it has no page and no link.
    expect(hrefs).not.toContain("/mumbai/tennis/");
  });

  it("drops What's on from the header when the city has nothing in the next 30 days", () => {
    show(mumbaiDiscoveryCatalog, "runClubs");
    // The header's link; the footer's Explore column keeps its own.
    expect(within(screen.getByRole("banner")).getAllByRole("link", {name: "What’s on"}).length).toBeGreaterThan(0);
    cleanup();
    show(mumbaiEmptyMonthCatalog, "runClubs");
    expect(within(screen.getByRole("banner")).queryByRole("link", {name: "What’s on"})).toBeNull();
  });
});
