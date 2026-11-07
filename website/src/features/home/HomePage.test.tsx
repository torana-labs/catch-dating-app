import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {homeCatalogFixture, mumbaiLiveCatalog, puneLaunchingSoonCatalog} from "../../stories/fixtures/homeCatalogs";
import {HomePage} from "./HomePage";

const trackMarketingEvent = vi.hoisted(() => vi.fn());
vi.mock("../../analytics", async (original) => ({...await original<typeof import("../../analytics")>(), trackMarketingEvent}));

afterEach(() => {cleanup(); trackMarketingEvent.mockReset();});

// Each test renders the whole page, which a loaded CI runner can take seconds over.
describe("homepage", {timeout: 20_000}, () => {
  it("shows a live city's week of plans, eight at a time, each linking to its event page", () => {
    render(<HomePage catalog={mumbaiLiveCatalog} />);
    const main = within(screen.getByRole("main"));
    expect(main.getByRole("heading", {level: 1}).textContent).toBe("Find something worth showing up for.");
    expect(main.getByText("In Mumbai this week")).toBeTruthy();
    expect(main.getByRole("heading", {name: "This week in Mumbai"})).toBeTruthy();
    // Ten plans start in the next seven days; the eleventh is later.
    expect(main.getByText("10 plans this week")).toBeTruthy();
    expect(main.getByText("8 of 10 plans shown. Hosts set their own prices.")).toBeTruthy();
    const week = within(main.getByRole("region", {name: "This week in Mumbai"}));
    const quiz = week.getByRole("link", {name: /Thursday Evening Pub Quiz/});
    expect(quiz.getAttribute("href")).toBe("/events/thursday-pub-quiz/");
    expect(quiz.textContent).toContain("Games and quizzes");
    expect(quiz.textContent).toContain("Thu 7:30 PM");
    expect(quiz.textContent).toContain("6 left");
    expect(main.getByText("Hosted plans across Bandra, Khar, Andheri and Worli.")).toBeTruthy();
    expect(main.getByRole("link", {name: "See everything in Mumbai"}).getAttribute("href")).toBe("/mumbai/");
  });

  it("filters the week by format from the tiles and the chips, and says when a format has none", () => {
    render(<HomePage catalog={mumbaiLiveCatalog} />);
    const games = screen.getByRole("link", {name: /3 this week.*Games and quizzes/});
    fireEvent.click(games);
    expect(games.hasAttribute("data-selected")).toBe(true);
    expect(screen.getByRole("radio", {name: "Games and quizzes"}).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("Showing 3 of 3 this week · Games and quizzes")).toBeTruthy();
    expect(within(screen.getByRole("region", {name: "This week in Mumbai"})).queryByRole("link", {name: /Strangers’ Supper/})).toBeNull();
    fireEvent.click(games);
    expect(screen.getByText("8 of 10 plans shown. Hosts set their own prices.")).toBeTruthy();
    fireEvent.click(screen.getByRole("link", {name: /2 this week.*Pickleball/}));
    expect(within(screen.getByRole("region", {name: "This week in Mumbai"})).getByRole("link", {name: /Doubles Ladder Night/}).textContent).toContain("Full");
  });

  it("shows a city that has not launched as launching soon, with who is joining and the busiest live city", () => {
    render(<HomePage catalog={puneLaunchingSoonCatalog} />);
    const main = within(screen.getByRole("main"));
    expect(main.getByText("Launching soon in Pune")).toBeTruthy();
    expect(main.getByRole("heading", {name: "Catch is coming to Pune."})).toBeTruthy();
    expect(main.queryByRole("heading", {name: /This week in/})).toBeNull();
    expect(main.getByText("Run clubs, supper clubs and game nights")).toBeTruthy();
    expect(main.getAllByText("Koregaon Park Runners").length).toBeGreaterThan(0);
    // Organisers joining a city before launch have no page to link to.
    expect(main.queryByRole("link", {name: "Koregaon Park Runners"})).toBeNull();
    expect(main.getAllByText(/Joining at launch/).length).toBe(2);
    expect(main.getByRole("link", {name: "See what’s on in Mumbai"}).getAttribute("href")).toBe("/?city=mumbai");
    expect(main.getAllByText("Coming to Pune").length).toBe(5);
    // "Tell me when it opens": a WhatsApp number, and news only if ticked.
    expect(main.getByRole("heading", {name: "Tell me when it opens"})).toBeTruthy();
    expect(main.getByRole("textbox", {name: /WhatsApp number/})).toBeTruthy();
    expect((main.getByRole("checkbox", {name: "Also send me news about new hosts and plans in Pune"}) as HTMLInputElement).checked).toBe(false);
    expect(main.getByRole("button", {name: "Notify me"}).getAttribute("type")).toBe("submit");
  });

  it("reads a launched city too thin to fill a page as launching soon", () => {
    render(<HomePage catalog={homeCatalogFixture("indore")} />);
    expect(screen.getByRole("heading", {name: "Catch is coming to Indore."})).toBeTruthy();
  });

  it("says plans could not load instead of calling a live city launching soon", () => {
    render(<HomePage catalog={{...mumbaiLiveCatalog, phase: "unavailable", plans: {...mumbaiLiveCatalog.plans, plans: [], organizers: []}}} />);
    expect(screen.getByRole("heading", {name: "This week in Mumbai"})).toBeTruthy();
    expect(screen.getByText("We couldn’t load this week’s plans. Please try again in a moment.")).toBeTruthy();
    expect(screen.queryByText(/Catch is coming to Mumbai/)).toBeNull();
  });

  it("links organisers to their pages, and an unclaimed listing to its claim", () => {
    render(<HomePage catalog={mumbaiLiveCatalog} />);
    const organisers = within(screen.getByRole("region", {name: "The people behind the plans."}));
    const runners = organisers.getByRole("link", {name: /Carter Road Runners/});
    expect(runners.getAttribute("href")).toBe("/organizers/carter-road-runners/");
    expect(runners.textContent).toContain("212 followers");
    expect(runners.textContent).toContain("Next: Fri 6:30 AM · Carter Road Social Run");
    const unclaimed = organisers.getByRole("link", {name: /Bandra Book Swap/});
    expect(unclaimed.getAttribute("href")).toBe("/organizers/bandra-book-swap/#claim");
    expect(unclaimed.textContent).toContain("Is this you? Claim it");
  });

  it("moves to another city from the picker", () => {
    const navigate = vi.fn();
    render(<HomePage catalog={mumbaiLiveCatalog} navigate={navigate} />);
    fireEvent.click(screen.getByRole("button", {name: "Mumbai"}));
    fireEvent.click(screen.getByRole("option", {name: /Pune/}));
    expect(navigate).toHaveBeenCalledWith("/?city=pune");
  });

  it("states the host price without a take-home figure and keeps dating words off the page", () => {
    const {container} = render(<HomePage catalog={mumbaiLiveCatalog} />);
    expect(screen.getByText("5% of ticket sales, capped at ₹10,000 a month")).toBeTruthy();
    expect(screen.getByText(/Payment gateway fees are charged separately/)).toBeTruthy();
    expect(container.textContent).not.toMatch(/dating|singles|mixer|\bmatch/i);
  });

  it("records a store that is not live yet instead of following it", () => {
    render(<HomePage catalog={mumbaiLiveCatalog} />);
    const [appStore] = screen.getAllByRole("button", {name: "Download on the App Store"});
    fireEvent.click(appStore);
    expect(trackMarketingEvent).toHaveBeenCalledWith("store_cta_pending", expect.objectContaining({platform: "ios", placement: "home_hero"}));
    expect(screen.queryByRole("img", {name: /QR code/})).toBeNull();
  });

  it("lists every city in the footer, the ones not open marked soon", () => {
    render(<HomePage catalog={mumbaiLiveCatalog} />);
    const footer = within(screen.getByRole("contentinfo"));
    expect(footer.getByRole("link", {name: "Mumbai"}).getAttribute("href")).toBe("/mumbai/");
    expect(footer.getByRole("link", {name: "Pune · soon"}).getAttribute("href")).toBe("/pune/");
  });
});
