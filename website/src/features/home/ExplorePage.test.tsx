import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {MemoryRouter, useLocation} from "react-router";
import {afterEach, describe, expect, it, vi} from "vitest";
import {brand} from "@content/brand";
import {homeCatalogFixture, mumbaiLiveCatalog, puneLaunchingSoonCatalog} from "../../stories/fixtures/homeCatalogs";
import {mumbaiDiscoveryCatalog, mumbaiEmptyMonthCatalog, mumbaiQuietCatalog} from "../discovery/discoveryCatalogFixtures";
import type {HomeCatalog} from "./homeTypes";
import {ExplorePage} from "./ExplorePage";
import {exploreFiltersFromSearch, exploreSearchFor, filterPlans} from "./exploreModel";

vi.mock("../../analytics", async (original) => ({...await original<typeof import("../../analytics")>(), trackMarketingEvent: vi.fn()}));
vi.mock("../../firebase", () => ({getWebsiteAppCheckToken: vi.fn(async () => null)}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Url() {
  const location = useLocation();
  return <output aria-label="url">{`${location.pathname}${location.search}`}</output>;
}
const show = (catalog: HomeCatalog, url = "/mumbai/") => render(
  <MemoryRouter initialEntries={[url]}><ExplorePage catalog={catalog} /><Url /></MemoryRouter>);
const url = () => screen.getByLabelText("url").textContent;

// Each test renders the whole page, which a loaded CI runner can take seconds over.
describe("Explore", {timeout: 20_000}, () => {
  it("lists a city's plans for the next two weeks, each linking to its event page, then who runs them", () => {
    show(mumbaiLiveCatalog);
    expect(screen.getByRole("heading", {level: 1, name: "What’s on in Mumbai"})).toBeTruthy();
    expect(screen.getByText("11 plans")).toBeTruthy();
    expect(screen.getByRole("link", {name: /Long Table Supper/}).getAttribute("href")).toBe("/events/long-table-supper/");
    const hosts = screen.getByRole("region", {name: "Who runs them"});
    expect(within(hosts).getAllByRole("listitem")).toHaveLength(4);
    expect(within(hosts).getByRole("link", {name: "See all organisers"}).getAttribute("href")).toBe("/mumbai/?show=organisers");
    // A week with plans has no capture band; that is for quiet weeks.
    expect(screen.queryByRole("heading", {name: "Get new plans in Mumbai on WhatsApp."})).toBeNull();
  });

  it("shows Plans and Organisers as tabs, each a link", () => {
    show(mumbaiLiveCatalog, "/mumbai/?utm_source=ig");
    expect(screen.getByRole("tab", {name: "Plans"}).getAttribute("aria-selected")).toBe("true");
    const organisers = screen.getByRole("tab", {name: "Organisers"});
    expect(organisers.getAttribute("href")).toBe("/mumbai/?utm_source=ig&show=organisers");
    fireEvent.click(organisers);
    expect(url()).toBe("/mumbai/?utm_source=ig&show=organisers");
    expect(screen.queryByRole("region", {name: "Who runs them"})).toBeNull();
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
    const results = within(screen.getByRole("region", {name: "What’s on in Mumbai"})).getAllByRole("listitem");
    expect(results.map((card) => within(card).getByRole("link").textContent)).toEqual([expect.stringMatching(/Driftwood Bay Runners/u)]);
    expect(screen.getByText("1 organiser")).toBeTruthy();
  });

  it("shows a launching-soon city's organisers joining and points to the live city", () => {
    show(puneLaunchingSoonCatalog, "/pune/?show=organisers");
    expect(screen.getByRole("heading", {level: 1, name: `${brand.name} is coming to Pune`})).toBeTruthy();
    expect(screen.getByRole("link", {name: "See what’s on in Mumbai"}).getAttribute("href")).toBe("/mumbai/");
    expect(screen.getByRole("link", {name: "Host in Pune? Start free trial"}).getAttribute("href")).toBe("/host/#start");
    expect(screen.getAllByText(/Joining at launch/u)).toHaveLength(2);
    expect(screen.getByRole("heading", {name: "Get new plans in Pune on WhatsApp."})).toBeTruthy();
  });

  it("tells a launching-soon city with no plans that it is waiting, not that filters missed", () => {
    const waiting: HomeCatalog = {...puneLaunchingSoonCatalog, liveCity: null,
      plans: {...puneLaunchingSoonCatalog.plans, plans: [], planCount: 0}};
    show(waiting, "/pune/");
    expect(screen.getByText("No plans in Pune yet.")).toBeTruthy();
    expect(screen.getByText("Hosts here are setting up their first plans. Check back soon.")).toBeTruthy();
    expect(screen.queryByText("0 plans")).toBeNull();
    expect(screen.queryByText("No plans match these filters.")).toBeNull();
    // With no other city open, the lead does not promise one.
    expect(screen.queryByText(/meanwhile/u)).toBeNull();
    cleanup();
    // A filter the visitor set still reads as a filter miss, with Clear filters.
    show(waiting, "/pune/?format=run");
    expect(screen.getByText("No plans match these filters.")).toBeTruthy();
    expect(screen.getByRole("button", {name: "Clear filters"})).toBeTruthy();
  });

  it("moves a quiet week to the next two weeks, with hosts to follow and the WhatsApp capture", () => {
    show(mumbaiQuietCatalog, "/mumbai/");
    expect(screen.getByRole("heading", {level: 1, name: "Coming up in Mumbai"})).toBeTruthy();
    expect(screen.getByText("Nothing is on this week yet, so here’s what’s next. New plans go up as hosts add them.")).toBeTruthy();
    expect(screen.getByRole("link", {name: /Long Table Supper/}).getAttribute("href")).toBe("/events/long-table-supper/");
    expect(screen.queryByText("1 plan")).toBeNull();
    expect(screen.getByRole("region", {name: "Hear about their next plan first."})).toBeTruthy();
    expect(screen.getByRole("heading", {name: "Get new plans in Mumbai on WhatsApp."})).toBeTruthy();
  });

  it("tells an open city with nothing in the next two weeks that plans are coming, not that filters missed", () => {
    const quiet: HomeCatalog = {...mumbaiLiveCatalog, plans: {...mumbaiLiveCatalog.plans, plans: [], planCount: 0}};
    show(quiet, "/mumbai/");
    expect(screen.getByRole("heading", {level: 1, name: "Nothing on in Mumbai in the next two weeks."})).toBeTruthy();
    expect(screen.queryByText("0 plans")).toBeNull();
    expect(screen.queryByText("No plans match these filters.")).toBeNull();
    const lead = screen.getByRole("region", {name: "Nothing on in Mumbai in the next two weeks."});
    expect(within(lead).getByRole("link", {name: "See who hosts here"}).getAttribute("href")).toBe("/mumbai/?show=organisers");
    expect(within(lead).getByRole("link", {name: "Get notified"}).getAttribute("href")).toBe("#notify");
    expect(screen.getByRole("region", {name: "Follow them for their next plan."})).toBeTruthy();
  });

  it("drops What's on from the header only when the read model says nothing is on in the next 30 days", () => {
    show(mumbaiDiscoveryCatalog, "/mumbai/");
    expect(within(screen.getByRole("banner")).getAllByRole("link", {name: "What’s on"}).length).toBeGreaterThan(0);
    cleanup();
    show(mumbaiEmptyMonthCatalog, "/mumbai/");
    expect(within(screen.getByRole("banner")).queryByRole("link", {name: "What’s on"})).toBeNull();
  });

  it("sends the capture as a city_alerts lead from the page it is on", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ok: true, alreadyJoined: false,
      lead: {leadId: "f".repeat(64), requestKind: "city_alerts", isNew: true}}), {status: 200}));
    vi.stubGlobal("fetch", fetch);
    show(mumbaiQuietCatalog, "/mumbai/");
    const capture = screen.getByRole("region", {name: "Get new plans in Mumbai on WhatsApp."});
    fireEvent.change(within(capture).getByRole("textbox", {name: /Your WhatsApp number/u}), {target: {value: "98000 00000"}});
    fireEvent.click(within(capture).getByRole("button", {name: "Notify me"}));
    expect(await within(capture).findByText("Done. We reply on WhatsApp, usually within an hour.")).toBeTruthy();
    const body = JSON.parse(String((fetch.mock.calls[0] as unknown as [string, {body: string}])[1].body));
    expect(body).toMatchObject({requestKind: "city_alerts", city: "Mumbai",
      lead: {phone: "+919800000000", sourcePage: "/mumbai/", entry: "ex-wa", cityAlerts: {interests: []}}});
  });

  it("badges a women-led plan from the read model, on its photo rather than its host line", () => {
    show(mumbaiDiscoveryCatalog, "/mumbai/?format=courts");
    const card = screen.getByRole("link", {name: /Pickleball Social.*Women-led/u});
    expect(within(card).getByText("Women-led").dataset.variant).toBe("label-badge");
    expect(card.textContent).not.toContain("· Women-led");
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
