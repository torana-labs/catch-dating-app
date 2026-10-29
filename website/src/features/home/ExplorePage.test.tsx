import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {MemoryRouter, useLocation} from "react-router";
import {afterEach, describe, expect, it, vi} from "vitest";
import {homeCatalogFixture, mumbaiLiveCatalog, puneLaunchingSoonCatalog} from "../../stories/fixtures/homeCatalogs";
import type {HomeCatalog} from "./homeTypes";
import {ExplorePage} from "./ExplorePage";
import {exploreFiltersFromSearch, exploreSearchFor, filterPlans} from "./exploreModel";

vi.mock("../../analytics", async (original) => ({...await original<typeof import("../../analytics")>(), trackMarketingEvent: vi.fn()}));
afterEach(cleanup);

function Url() {
  const location = useLocation();
  return <output aria-label="url">{`${location.pathname}${location.search}`}</output>;
}
const show = (catalog: HomeCatalog, url = "/mumbai/") => render(
  <MemoryRouter initialEntries={[url]}><ExplorePage catalog={catalog} /><Url /></MemoryRouter>);
const url = () => screen.getByLabelText("url").textContent;

// Each test renders the whole page, which a loaded CI runner can take seconds over.
describe("Explore", {timeout: 20_000}, () => {
  it("lists a city's plans for the next two weeks, each linking to its event page", () => {
    show(mumbaiLiveCatalog);
    expect(screen.getByRole("heading", {level: 1, name: "What’s on in Mumbai"})).toBeTruthy();
    expect(screen.getByText("11 plans")).toBeTruthy();
    expect(screen.getByRole("link", {name: /Long Table Supper/}).getAttribute("href")).toBe("/events/long-table-supper/");
  });

  it("keeps search, format and date in the URL, and clears them together", () => {
    show(mumbaiLiveCatalog, "/mumbai/?utm_source=ig");
    const search = screen.getByRole("searchbox", {name: "Search plans and organisers"});
    fireEvent.change(search, {target: {value: "supper"}});
    fireEvent.keyDown(search, {key: "Enter"});
    expect(url()).toBe("/mumbai/?utm_source=ig&q=supper");
    expect(screen.getByText("2 plans")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", {name: "Today"}));
    expect(url()).toBe("/mumbai/?utm_source=ig&q=supper&when=today");
    expect(screen.getByText("1 plan")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", {name: "Pickleball"}));
    expect(screen.getByText("No plans match these filters.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Clear filters"}));
    expect(url()).toBe("/mumbai/?utm_source=ig");
  });

  it("searches organisers in the organisers view, which the directory redirects to", () => {
    show(mumbaiLiveCatalog, "/explore/?show=organisers&q=runners");
    const results = screen.getAllByRole("article");
    expect(results.map((card) => within(card).getByRole("heading").textContent)).toEqual(["Carter Road Runners"]);
    expect(screen.getByText("1 organiser")).toBeTruthy();
  });

  it("shows a launching-soon city's organisers joining and points to the live city", () => {
    show(puneLaunchingSoonCatalog, "/pune/?show=organisers");
    expect(screen.getByRole("heading", {level: 1, name: "Catch is coming to Pune"})).toBeTruthy();
    expect(screen.getByRole("link", {name: "See what’s on in Mumbai"}).getAttribute("href")).toBe("/mumbai/");
    expect(screen.getAllByText("Joining at launch")).toHaveLength(2);
  });

  it("says when plans could not load", () => {
    show({...homeCatalogFixture("mumbai"), phase: "unavailable"});
    expect(screen.getByText("We couldn’t load plans right now.")).toBeTruthy();
  });
});

describe("Explore filters", () => {
  it("read the URL, fall back to defaults and keep other parameters", () => {
    expect(exploreFiltersFromSearch("?q=%20run%20&format=courts&when=weekend&show=organisers"))
      .toEqual({query: "run", format: "courts", when: "weekend", view: "organisers"});
    expect(exploreFiltersFromSearch("?format=singles&when=forever")).toEqual({query: "", format: "all", when: "any", view: "plans"});
    expect(exploreSearchFor({query: "", format: "run", when: "any", view: "plans"}, "?city=pune&q=old")).toBe("?city=pune&format=run");
  });

  it("find this weekend's plans in the city's time zone", () => {
    // The fixture clock is Thursday noon in Mumbai; the weekend is Saturday and Sunday there.
    const weekend = filterPlans(mumbaiLiveCatalog.plans.plans, {query: "", format: "all", when: "weekend", view: "plans"},
      mumbaiLiveCatalog.readAt, "Asia/Kolkata").map((plan) => plan.eventId);
    expect(weekend).toEqual(["pickleball-social", "saturday-game-night", "run-and-rave", "rooftop-social", "sunday-board-games", "doubles-ladder"]);
  });
});
