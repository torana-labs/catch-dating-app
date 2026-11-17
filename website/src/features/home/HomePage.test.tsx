import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import type {CaptureSlots} from "../../shared/media/captureSlot";
import {afterEach, describe, expect, it, vi} from "vitest";
import {brand} from "@catch/brand";
import {homeCatalogFixture, mumbaiLiveCatalog, puneLaunchingSoonCatalog} from "../../stories/fixtures/homeCatalogs";
import type {HomeReview} from "./homeModel";
import {HomePage} from "./HomePage";

const trackMarketingEvent = vi.hoisted(() => vi.fn());
vi.mock("../../analytics", async (original) => ({...await original<typeof import("../../analytics")>(), trackMarketingEvent}));
// The city's public founding-host counter, closed unless a test opens it.
const foundingOffer = vi.hoisted(() => ({open: false, markets: [] as (string | undefined)[]}));
vi.mock("../marketing/useFoundingHostOffer", () => ({useFoundingHostOffer: (market: string | undefined) => {
  foundingOffer.markets.push(market);
  return Boolean(market) && foundingOffer.open;
}}));

// The home page's capture slots, as the website manifest records them (their page bindings are
// checked against capture_manifest.json in marketingCaptures.test.tsx).
const captures: CaptureSlots = Object.fromEntries(["guest-explore", "guest-checked-in", "guest-after-event", "host-live-tablet"].map((id) => [id, {
  id, webPath: `/captures/${id}.png`, width: 980, height: 1924, alt: `Screen ${id}`, caption: `Caption ${id}`, walkthroughStep: "Find a plan", pages: ["/"],
}]));

/** Each band's name, in page order. */
const bandTitles = (container: HTMLElement) => [...container.querySelectorAll("main > section[aria-labelledby]")]
  .map((band) => container.ownerDocument.getElementById(band.getAttribute("aria-labelledby") ?? "")?.textContent);

afterEach(() => {cleanup(); trackMarketingEvent.mockReset(); foundingOffer.open = false; foundingOffer.markets = [];});

// Each test renders the whole page, which a loaded CI runner can take seconds over.
describe("homepage", {timeout: 20_000}, () => {
  it("opens a busy city with the headline, its count and the two buttons, then this week's plans", () => {
    render(<HomePage captures={captures} catalog={mumbaiLiveCatalog} />);
    const main = within(screen.getByRole("main"));
    expect(main.getByRole("heading", {level: 1}).textContent).toBe("Find something worth showing up for.");
    expect(main.getByText("In Mumbai this week · 10 plans")).toBeTruthy();
    const hero = within(main.getByRole("region", {name: "Find something worth showing up for."}));
    // No primary button ends at Coming soon: the first goes to the plans, the second to hosts.
    expect(hero.getByRole("link", {name: "See what’s on in Mumbai"}).getAttribute("href")).toBe("#whats-on");
    expect(hero.getByRole("link", {name: "Host an event"}).getAttribute("href")).toBe("/host/");
    expect(hero.getAllByRole("img", {name: "Screen guest-explore"}).length).toBeGreaterThan(0);
    // The soonest plan floats over the phone.
    expect(hero.getByText("Thursday Evening Pub Quiz")).toBeTruthy();

    const week = within(main.getByRole("region", {name: "This week in Mumbai"}));
    expect(week.getByText("10 plans this week")).toBeTruthy();
    expect(week.getByText("6 of 10 plans shown. Hosts set their own prices.")).toBeTruthy();
    const quiz = week.getByRole("link", {name: /Thursday Evening Pub Quiz/});
    expect(quiz.getAttribute("href")).toBe("/events/thursday-pub-quiz/");
    expect(quiz.textContent).toContain("Games and quizzes");
    expect(quiz.textContent).toContain("Thu 7:30 PM");
    expect(quiz.textContent).toContain("6 left");
    expect(week.getByText("Hosted plans across Bandra, Khar, Andheri and Worli.")).toBeTruthy();
    expect(week.getByRole("link", {name: "See everything in Mumbai"}).getAttribute("href")).toBe("/mumbai/");
    // Switching city from the band loads that city's homepage.
    expect(week.getByRole("link", {name: "Plans in Indore"}).getAttribute("href")).toBe("/?city=indore");
  });

  it("orders a busy city's bands as the board: entry tiles, plans, formats, how a night works, proof, then the host band", () => {
    const {container} = render(<HomePage captures={captures} catalog={mumbaiLiveCatalog} />);
    expect(bandTitles(container)).toEqual([
      "Find something worth showing up for.", "Whoever you are, there’s an easy first plan.", "This week in Mumbai",
      "Start with what you feel like doing.", "Come on your own. Leave knowing a few more people.",
      "Feel good about going on your own.", "Bring people together? Run the whole night from one screen.", "The people behind the plans.",
      ...(brand.stores.consumer.ios || brand.stores.consumer.android ? ["Your plans, your groups and your hosts, in your pocket."] :
        ["Be first in the app, and first to new plans."]),
      "Know a host who’d be great here?", "Good to know before your first plan.",
    ]);
  });

  it("opens six entry tiles to the city's plans or the band they name, the safety tile with no claim it cannot stand behind", () => {
    render(<HomePage captures={captures} catalog={mumbaiLiveCatalog} />);
    const tiles = within(screen.getByRole("region", {name: "Whoever you are, there’s an easy first plan."}));
    const links = tiles.getAllByRole("link");
    expect(links).toHaveLength(6);
    expect(tiles.getByRole("link", {name: /New to Mumbai/}).getAttribute("href")).toBe("/mumbai/");
    expect(tiles.getByRole("link", {name: /Coming on your own/}).getAttribute("href")).toBe("#how");
    const safety = tiles.getByRole("link", {name: /Safety first/});
    expect(safety.getAttribute("href")).toBe("#safety");
    expect(safety.textContent).not.toMatch(/verified|women-led/iu);
  });

  it("links each format to the city's plans in it, with an approved photo or the format's artwork, and more kinds as chips", () => {
    render(<HomePage captures={captures} catalog={mumbaiLiveCatalog} />);
    const formats = within(screen.getByRole("region", {name: "Start with what you feel like doing."}));
    const run = formats.getByRole("link", {name: /Runs and walks/});
    expect(run.getAttribute("href")).toBe("/mumbai/?format=run");
    expect(run.textContent).toContain("Run clubs in Mumbai");
    expect(run.querySelector("img")?.getAttribute("src")).toBe("/assets/events/social-run-music-hero-960.jpg");
    expect(formats.getByRole("link", {name: /Dinners/}).querySelector("img")?.getAttribute("src")).toBe("/assets/marketing/home-dinner.jpg");
    // No approved photo for these yet: the activity artwork, never a placeholder photo.
    for (const name of [/Racket sports/, /Games and quizzes/, /Nights out/]) expect(formats.getByRole("link", {name}).querySelector("img")).toBeNull();
    expect(formats.getByRole("link", {name: "Yoga, spin and fitness"}).getAttribute("href")).toBe("/mumbai/?q=yoga");
  });

  it("floats the soonest plan over the hero's phone with its date, and draws the phone in the canvas bezel", () => {
    render(<HomePage captures={captures} catalog={mumbaiLiveCatalog} />);
    const hero = screen.getByRole("region", {name: "Find something worth showing up for."});
    const chip = hero.querySelector("[data-chip]") as HTMLElement;
    expect(chip.textContent).toContain("Thursday Evening Pub Quiz");
    expect(chip.textContent).toContain("Khar Social · 6 left");
    expect((chip.querySelector("time") as HTMLElement).dataset).toMatchObject({ground: "yellow", size: "sm"});
    expect(within(hero).getByRole("figure").dataset).toMatchObject({bezel: "", size: "hero"});
    // No proof line until real data stands behind it.
    expect(hero.textContent).not.toMatch(/verified|★/u);
  });

  it("asks for a host introduction on WhatsApp, and puts the main action in the phone bar", () => {
    render(<HomePage captures={captures} catalog={mumbaiLiveCatalog} />);
    const refer = within(screen.getByRole("region", {name: "Know a host who’d be great here?"}));
    expect(refer.getByRole("link", {name: "Introduce them"}).getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\d+\?text=/u);
    expect(refer.queryByText(/on us|free ticket/iu)).toBeNull();
    const dock = within(screen.getByRole("group", {name: "Quick actions"}));
    expect(dock.getByRole("link", {name: "See plans"}).getAttribute("href")).toBe("#whats-on");
  });

  it("filters a busy week by format from the chips, and says when a format has none", () => {
    render(<HomePage captures={captures} catalog={mumbaiLiveCatalog} />);
    const week = () => within(screen.getByRole("region", {name: "This week in Mumbai"}));
    fireEvent.click(screen.getByRole("radio", {name: "Games and quizzes"}));
    expect(screen.getByRole("radio", {name: "Games and quizzes"}).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("Showing 3 of 3 this week · Games and quizzes")).toBeTruthy();
    expect(week().queryByRole("link", {name: /Strangers’ Supper/})).toBeNull();
    fireEvent.click(screen.getByRole("radio", {name: "Everything"}));
    expect(screen.getByText("6 of 10 plans shown. Hosts set their own prices.")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", {name: "Pickleball"}));
    expect(week().getByRole("link", {name: /Doubles Ladder Night/}).textContent).toContain("Full");
  });

  it("leads a launching city with hosts, then the opening-day notice in place of plans", () => {
    foundingOffer.open = true;
    const {container} = render(<HomePage captures={captures} catalog={puneLaunchingSoonCatalog} />);
    const main = within(screen.getByRole("main"));
    expect(main.getByText("Launching soon in Pune")).toBeTruthy();
    const hero = within(main.getByRole("region", {name: "Bring people together in Pune? Be one of the first hosts."}));
    expect(hero.getByText(/Founding hosts get 90 days without Catch fees\./u)).toBeTruthy();
    expect(foundingOffer.markets).toContain("in-mh-pune");
    expect(hero.getByRole("link", {name: "Start hosting free"}).getAttribute("href")).toBe("/host/#start");
    expect(hero.getByRole("link", {name: "See what’s on in Mumbai"}).getAttribute("href")).toBe("/?city=mumbai");
    expect(main.queryByRole("heading", {name: /This week in/})).toBeNull();
    const soon = within(main.getByRole("region", {name: "Here for the plans?"}));
    expect(soon.getByText("Run clubs, supper clubs and game nights are on their way to Pune. Leave your WhatsApp number and we’ll message you when the first ones go up.")).toBeTruthy();
    // One WhatsApp number, and news only if ticked.
    expect(soon.getByRole("textbox", {name: /WhatsApp number/})).toBeTruthy();
    expect((soon.getByRole("checkbox", {name: "Also send me news about new hosts and plans in Pune"}) as HTMLInputElement).checked).toBe(false);
    expect(soon.getByRole("button", {name: "Notify me"}).getAttribute("type")).toBe("submit");
    // The host band moves up to third, with the founding offer and a person on WhatsApp.
    expect(bandTitles(container).slice(0, 4)).toEqual(["Bring people together in Pune? Be one of the first hosts.", "Whoever you are, there’s an easy first plan.",
      "Here for the plans?", "Bring people together? Run the whole night from one screen."]);
    const hosts = within(main.getByRole("region", {name: "Bring people together? Run the whole night from one screen."}));
    expect(hosts.getByText(/^Founding hosts in Pune: 90 days without fees\./u)).toBeTruthy();
    expect(hosts.getByRole("link", {name: "Talk to us on WhatsApp"}).getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\d+\?text=/u);
    // Organisers joining a city before launch have no page to link to.
    const organisers = within(main.getByRole("region", {name: "Follow them before Catch opens."}));
    expect(organisers.getAllByText(/Koregaon Park Runners/).length).toBeGreaterThan(0);
    expect(organisers.queryByRole("link", {name: /Koregaon Park Runners/})).toBeNull();
    expect(organisers.getAllByText(/Joining at launch/).length).toBe(2);
  });

  it("shows a thin city everything ahead, dated, with the host band moved up and no format filter", () => {
    const {container} = render(<HomePage captures={captures} catalog={homeCatalogFixture("indore")} />);
    expect(screen.getByText("New in Indore · plans for the next two weeks")).toBeTruthy();
    expect(screen.getByRole("link", {name: "See what’s coming up"}).getAttribute("href")).toBe("#whats-on");
    const plans = within(screen.getByRole("region", {name: "Coming up in Indore"}));
    expect(plans.getByText("Next two weeks")).toBeTruthy();
    // A quiet city is never an empty page: it says what to do next.
    expect(plans.getByText("No plans in Indore in the next two weeks yet. Follow the organisers below to hear about their next one first.")).toBeTruthy();
    expect(plans.getByRole("link", {name: "See all upcoming plans"}).getAttribute("href")).toBe("/indore/");
    expect(plans.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByText(/^0 /u)).toBeNull();
    expect(bandTitles(container)[3]).toBe("Bring people together? Run the whole night from one screen.");
    // The counter is closed: no founding offer, only the fees line.
    const hosts = within(screen.getByRole("region", {name: "Bring people together? Run the whole night from one screen."}));
    expect(hosts.queryByText(/Founding hosts/u)).toBeNull();
    expect(hosts.getByText("Payment gateway fees are charged separately by the payment provider.")).toBeTruthy();
    expect(hosts.getByRole("link", {name: "Talk to us on WhatsApp"})).toBeTruthy();
    expect(screen.queryByText(/Here for the plans/u)).toBeNull();
  });

  it("widens a busy city's quiet week to the next two weeks instead of an empty band", () => {
    const shift = (iso: string | null) => iso === null ? null : new Date(Date.parse(iso) + 8 * 864e5).toISOString();
    const later = mumbaiLiveCatalog.plans.plans.slice(0, 6).map((plan) => ({...plan, startTime: shift(plan.startTime)!, endTime: shift(plan.endTime)}));
    render(<HomePage captures={captures} catalog={{...mumbaiLiveCatalog, plans: {...mumbaiLiveCatalog.plans, plans: later}}} />);
    const plans = within(screen.getByRole("region", {name: "Coming up in Mumbai"}));
    expect(plans.getByText("Nothing on this week, so here’s everything in Mumbai over the next two weeks: 6 of 6 shown.")).toBeTruthy();
    expect(plans.getAllByRole("link", {name: /Thursday Evening Pub Quiz/})[0].textContent).toMatch(/Fri 6 Nov, 7:30 PM/u);
  });

  it("says plans could not load instead of calling a live city new or launching soon", () => {
    render(<HomePage captures={captures} catalog={{...mumbaiLiveCatalog, phase: "unavailable", plans: {...mumbaiLiveCatalog.plans, plans: [], organizers: []}}} />);
    expect(screen.getByRole("heading", {name: "This week in Mumbai"})).toBeTruthy();
    expect(screen.getByText("We couldn’t load this week’s plans. Please try again in a moment.")).toBeTruthy();
    expect(screen.getByText("In Mumbai")).toBeTruthy();
    expect(screen.queryByText(/New in Mumbai|Launching soon in Mumbai/u)).toBeNull();
  });

  it("links organisers to their pages, and an unclaimed listing to its claim", () => {
    render(<HomePage captures={captures} catalog={mumbaiLiveCatalog} />);
    const organisers = within(screen.getByRole("region", {name: "The people behind the plans."}));
    expect(organisers.getByText("Organisers in Mumbai")).toBeTruthy();
    const runners = organisers.getByRole("link", {name: /Carter Road Runners/});
    expect(runners.getAttribute("href")).toBe("/organizers/carter-road-runners/");
    expect(runners.textContent).toContain("212 followers");
    expect(runners.textContent).toContain("Next: Fri 6:30 AM · Carter Road Social Run");
    const unclaimed = organisers.getByRole("link", {name: /Bandra Book Swap/});
    expect(unclaimed.getAttribute("href")).toBe("/organizers/bandra-book-swap/#claim");
    expect(unclaimed.textContent).toContain("Is this you? Claim it");
    expect(organisers.getByRole("link", {name: "Claim your page"}).getAttribute("href")).toBe("/claim/");
  });

  it("moves to another city from the picker", () => {
    const navigate = vi.fn();
    render(<HomePage captures={captures} catalog={mumbaiLiveCatalog} navigate={navigate} />);
    fireEvent.click(screen.getByRole("button", {name: "Mumbai"}));
    fireEvent.click(screen.getByRole("menuitemradio", {name: /Pune/}));
    expect(navigate).toHaveBeenCalledWith("/?city=pune");
  });

  it("states the host trial and price per billing cycle, and keeps dating words and placeholders off the page", () => {
    const {container} = render(<HomePage captures={captures} catalog={mumbaiLiveCatalog} />);
    const hosts = within(screen.getByRole("region", {name: "Bring people together? Run the whole night from one screen."}));
    expect(hosts.getByText(/Free for 30 days, then 5% of ticket sales, capped at ₹10,000 per billing cycle\. Free events stay free\./u)).toBeTruthy();
    expect(hosts.getByText("Payment gateway fees are charged separately by the payment provider.")).toBeTruthy();
    expect(hosts.getByRole("link", {name: "Start your free trial"}).getAttribute("href")).toBe("/host/#start");
    expect(hosts.getByRole("link", {name: "See Catch for hosts"}).getAttribute("href")).toBe("/host/");
    // A busy city shows no founding offer and reads no counter, and nothing names a count of places.
    expect(foundingOffer.markets.every((market) => market === undefined)).toBe(true);
    expect(container.textContent).not.toMatch(/Founding hosts|of 50|a month/u);
    expect(container.textContent).not.toMatch(/dating|singles|mixer|\bmatch/iu);
    expect(container.textContent).not.toMatch(/\[[^\]]*\]/u);
  });

  it("quotes a real review only when a guest who booked has written one", () => {
    const review: HomeReview = {reviewId: "r1", reviewerName: "Asha", rating: 5, comment: "The quiz host had our table talking in minutes.",
      eventTitle: "Thursday Evening Pub Quiz", verified: true};
    render(<HomePage captures={captures} catalog={mumbaiLiveCatalog} />);
    const proof = () => within(screen.getByRole("region", {name: "Feel good about going on your own."}));
    expect(proof().getByText("Reviews from people who went")).toBeTruthy();
    expect(proof().queryByText(/Booked on Catch$/u)).toBeNull();
    expect(proof().queryByRole("img", {name: /out of 5/u})).toBeNull();
    cleanup();
    render(<HomePage captures={captures} catalog={mumbaiLiveCatalog} reviews={[{...review, reviewId: "r0", verified: false, comment: "Unverified"}, review]} />);
    expect(proof().getByText("The quiz host had our table talking in minutes.")).toBeTruthy();
    expect(proof().getByText("Booked on Catch")).toBeTruthy();
    expect(proof().queryByText("Unverified")).toBeNull();
  });

  it("shows each Catch app store as brand.json has it: badge links once live, a WhatsApp notice before", () => {
    render(<HomePage captures={captures} catalog={mumbaiLiveCatalog} />);
    const {ios, android} = brand.stores.consumer;
    if (ios || android) {
      if (ios) expect(screen.getAllByRole("link", {name: "Download on the App Store"})[0].getAttribute("href")).toBe(ios);
      if (android) expect(screen.getAllByRole("link", {name: "Get it on Google Play"})[0].getAttribute("href")).toBe(android);
      return;
    }
    // Before launch: "Get notified" everywhere, and no "Coming soon" chips that capture nothing (leak 2).
    expect(screen.getByRole("banner").querySelector('a[href="#app"]')?.textContent).toBe("Get notified");
    expect(screen.queryByRole("button", {name: /Coming soon/})).toBeNull();
    expect(screen.queryByRole("link", {name: /Coming soon/})).toBeNull();
    // The hero's notify card takes the place of the badges: the same notice, its own form.
    const hero = within(screen.getByRole("region", {name: "Find something worth showing up for."}));
    expect(hero.getByText("The Catch app is on its way")).toBeTruthy();
    expect(hero.getByRole("textbox", {name: /WhatsApp number/})).toBeTruthy();
    expect((hero.getByRole("checkbox", {name: "Also send me new plans in Mumbai on WhatsApp, about once a week"}) as HTMLInputElement).checked).toBe(false);
    const app = within(screen.getByRole("region", {name: "Be first in the app, and first to new plans."}));
    expect(app.getByText("The Catch app · coming soon")).toBeTruthy();
    expect(app.getByRole("textbox", {name: /WhatsApp number/})).toBeTruthy();
    expect((app.getByRole("checkbox", {name: "Also send me new plans in Mumbai on WhatsApp, about once a week"}) as HTMLInputElement).checked).toBe(false);
    expect(app.getByRole("button", {name: "Notify me"}).getAttribute("type")).toBe("submit");
    expect(screen.queryByRole("img", {name: /QR code/})).toBeNull();
    expect(screen.getByText(/^Not yet\. You can browse and book on the website\./u)).toBeTruthy();
  });

  it("lists the open cities in the footer with their plans this week, then More cities", () => {
    render(<HomePage captures={captures} catalog={mumbaiLiveCatalog} />);
    const footer = within(screen.getByRole("contentinfo"));
    const mumbai = mumbaiLiveCatalog.cities.find((city) => city.slug === "mumbai")!;
    const mumbaiName = mumbai.weekPlanCount === 0 ? "Mumbai · New" :
      mumbai.weekPlanCount === 1 ? "Mumbai · 1 plan this week" : `Mumbai · ${mumbai.weekPlanCount} plans this week`;
    expect(footer.getByRole("link", {name: mumbaiName}).getAttribute("href")).toBe("/mumbai/");
    expect(footer.queryByRole("link", {name: /^Pune/u})).toBeNull();
    expect(footer.getByRole("link", {name: "More cities →"}).getAttribute("href")).toBe("/cities/");
  });

  it("shows how a night works in three steps beside the checked-in screen", () => {
    render(<HomePage captures={captures} catalog={mumbaiLiveCatalog} />);
    const story = within(screen.getByRole("region", {name: "Come on your own. Leave knowing a few more people."}));
    expect(story.getByText("Find a plan")).toBeTruthy();
    expect(story.getByText("Stay in touch")).toBeTruthy();
    expect(story.getByRole("img", {name: "Screen guest-checked-in"})).toBeTruthy();
  });
});
