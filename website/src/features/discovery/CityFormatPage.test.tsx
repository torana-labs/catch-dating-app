import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {MemoryRouter} from "react-router";
import {afterEach, describe, expect, it, vi} from "vitest";
import {mumbaiLiveCatalog} from "../../stories/fixtures/homeCatalogs";
import type {HomeCatalog} from "../home/homeTypes";
import {CityFormatPage} from "./CityFormatPage";
import {mumbaiDiscoveryCatalog, mumbaiEmptyMonthCatalog} from "./discoveryCatalogFixtures";
import type {DiscoveryFormatKey} from "./discoveryTypes";

vi.mock("../../analytics", async (original) => ({...await original<typeof import("../../analytics")>(), trackMarketingEvent: vi.fn()}));
afterEach(cleanup);

const show = (catalog: HomeCatalog, format: DiscoveryFormatKey, url = "/mumbai/run-clubs/") =>
  render(<MemoryRouter initialEntries={[url]}><CityFormatPage catalog={catalog} format={format} /></MemoryRouter>);
const band = (name: string | RegExp) => screen.getByRole("region", {name});

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
    expect(within(band("Who runs them")).getByRole("heading", {name: "Carter Road Runners"})).toBeTruthy();
    expect(within(band("Joining a run club in Mumbai.")).getByText(/Stay for coffee/u)).toBeTruthy();
    // The city's other indexed format pages, and the newcomers' page.
    const more = band("Other things to do");
    expect(within(more).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/mumbai/nightlife/", "/new-to-mumbai/"]);
    expect(screen.getByRole("heading", {name: "Get new plans on WhatsApp."})).toBeTruthy();
  });

  it("is the thin page below the bar: what is here so far and what else is on", () => {
    show(mumbaiDiscoveryCatalog, "pickleball", "/mumbai/pickleball/");
    expect(screen.getByRole("heading", {level: 1, name: "Pickleball in Mumbai"})).toBeTruthy();
    expect(screen.getByText("Dink and Drink · next: Sat 5:00 PM")).toBeTruthy();
    expect(screen.getByRole("link", {name: "See Dink and Drink"}).getAttribute("href")).toBe("/organizers/dink-and-drink/");
    expect(screen.queryByRole("region", {name: "Upcoming sessions"})).toBeNull();
  });

  it("says plans are unavailable rather than show counts it does not have", () => {
    show(mumbaiLiveCatalog, "runClubs");
    expect(screen.getByText("We couldn’t load plans right now.")).toBeTruthy();
    expect(screen.queryByText("runs in the next 30 days")).toBeNull();
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
