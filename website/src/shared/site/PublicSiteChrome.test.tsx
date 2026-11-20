import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {guestAppActionLabel, publicSiteCopy, siteFooterCopy, siteFooterDefaultCities, siteHeaderCopy} from "../../content/site";
import {PublicSiteFooter, PublicSiteHeader, SiteAccountActionProvider} from "./PublicSiteChrome";
import {trackSiteCtaClick} from "./siteTracking";

vi.mock("./siteTracking", () => ({slugForTracking: (value: string) => value, trackSiteCtaClick: vi.fn()}));
afterEach(() => {cleanup(); vi.mocked(trackSiteCtaClick).mockReset();});
// The main bar only opens pages: What's on (plans and organisers as tabs), Safety and For hosts.
const globalLabels = ["What’s on", "Safety", "For hosts"];
const destinations = ["/explore/", "/safety/", "/host/"];
// The For hosts menu's columns and pages, in reading order (the canvas's KitHeader menu).
const forHostsColumns = siteHeaderCopy.host.nav.flatMap((entry) => "sections" in entry && entry.label === "For hosts" ? entry.sections ?? [] : []);
const hostTypePages = ["run-clubs", "racket-sports", "supper-clubs", "quiz-nights", "venues", "studios", "nightlife", "workshops", "communities",
  "creators", "teams", "outdoors", "facilities", "colleges", "brands"].map((type) => `/host/${type}/`);
const productPages = ["/how-it-works/", "/product/your-page/", "/product/bookings-and-memberships/", "/product/messages-and-growth/", "/product/the-room/",
  "/product/running-the-event/", "/product/guest-records/", "/product/reports-and-payouts/", "/product/forms/"];

describe("canonical public chrome", () => {
  it("renders the site top bar for every general page: the wordmark home, the main site's links and Get the app", () => {
    render(<PublicSiteHeader />);
    const banner = within(screen.getByRole("banner"));
    const primary = within(screen.getByRole("navigation", {name: "Primary"}));
    expect(primary.getAllByRole("link").map((link) => link.textContent)).toEqual(globalLabels);
    expect(primary.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(destinations);
    expect(banner.getByRole("link", {name: publicSiteCopy.wordmark}).getAttribute("href")).toBe("/");
    expect(banner.getByRole("link", {name: guestAppActionLabel}).getAttribute("href")).toBe("/app/");
    expect(banner.queryByRole("link", {name: "Claim your page"})).toBeNull();
  });

  it("puts the account entry on the right before the page's actions, as the canvas draws Sign in", () => {
    const signIn = vi.fn();
    render(
      <SiteAccountActionProvider value={{bar: <button onClick={signIn} type="button">Sign in</button>, menu: {label: "Sign in", onPressed: signIn}}}>
        <PublicSiteHeader actions={<a href="#start">Start free trial</a>} links={[{href: "#night", label: "On the night"}]} title="Catch for hosts" />
      </SiteAccountActionProvider>,
    );
    const banner = screen.getByRole("banner");
    const order = [...banner.querySelectorAll("a, button")]
      .filter((element) => element.getAttribute("aria-label") !== publicSiteCopy.menu.openLabel)
      .map((element) => element.textContent?.trim());
    // Wordmark and links on the left; the account, then the primary action, on the right.
    expect(order).toEqual(["Catch for hosts", "On the night", "Sign in", "Start free trial"]);
    const signInButton = within(banner).getByRole("button", {name: "Sign in"});
    const leftGroup = within(banner).getByRole("navigation", {name: "Primary"}).parentElement!;
    expect(leftGroup.contains(signInButton)).toBe(false);
    expect(leftGroup.contains(within(banner).getByRole("link", {name: "Start free trial"}))).toBe(false);
  });

  it("adds the account entry to the phone menu, where the bar has no room for it", () => {
    const signIn = vi.fn();
    render(
      <SiteAccountActionProvider value={{bar: <button type="button">Sign in</button>, menu: {label: "Sign in", onPressed: signIn}}}>
        <PublicSiteHeader />
      </SiteAccountActionProvider>,
    );
    fireEvent.click(screen.getByRole("button", {name: publicSiteCopy.menu.openLabel}));
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([...globalLabels, "Sign in"]);
    fireEvent.click(screen.getByRole("menuitem", {name: "Sign in"}));
    expect(signIn).toHaveBeenCalledOnce();
  });

  it("records a navigation click", () => {
    render(<PublicSiteHeader />);
    const link = within(screen.getByRole("navigation", {name: "Primary"})).getByRole("link", {name: "For hosts"});
    link.addEventListener("click", (event) => event.preventDefault(), {once: true});
    fireEvent.click(link);
    expect(trackSiteCtaClick).toHaveBeenCalledWith("nav_For hosts", "/host/");
  });

  it("puts the same links in the phone menu", () => {
    render(<PublicSiteHeader />);
    fireEvent.click(screen.getByRole("button", {name: publicSiteCopy.menu.openLabel}));
    const options = screen.getAllByRole("menuitem").map((item) => item.textContent);
    expect(options).toEqual(globalLabels);
  });

  it("lets a product page name itself, its sections and an action", () => {
    render(<PublicSiteHeader actions={<a href="#apply">Apply for a pilot</a>} links={[{href: "#night", label: "On the night"}]} title="Catch for hosts" />);
    expect(screen.getByRole("link", {name: "Catch for hosts"}).getAttribute("href")).toBe("/");
    expect(within(screen.getByRole("navigation", {name: "Primary"})).getByRole("link", {name: "On the night"}).getAttribute("href")).toBe("#night");
    expect(screen.getByRole("link", {name: "Apply for a pilot"})).toBeTruthy();
  });

  it("hides What's on when the page says so, and points it at a city's Explore", () => {
    const {unmount} = render(<PublicSiteHeader whatsOnHref="/mumbai/" />);
    expect(within(screen.getByRole("navigation", {name: "Primary"})).getByRole("link", {name: "What’s on"}).getAttribute("href")).toBe("/mumbai/");
    unmount();
    render(<PublicSiteHeader showWhatsOn={false} />);
    expect(within(screen.getByRole("navigation", {name: "Primary"})).getAllByRole("link").map((link) => link.textContent)).toEqual(["Safety", "For hosts"]);
  });

  it("puts a guest page's New to the city after What's on, and leaves it off host pages", () => {
    const newToCity = {href: "/new-to-mumbai/", label: "New to Mumbai"};
    const {unmount} = render(<PublicSiteHeader newToCity={newToCity} whatsOnHref="/mumbai/" />);
    expect(within(screen.getByRole("navigation", {name: "Primary"})).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")]))
      .toEqual([["What’s on", "/mumbai/"], ["New to Mumbai", "/new-to-mumbai/"], ["Safety", "/safety/"], ["For hosts", "/host/"]]);
    unmount();
    render(<PublicSiteHeader newToCity={newToCity} variant="host" />);
    expect(screen.queryByRole("link", {name: "New to Mumbai"})).toBeNull();
  });

  it("gives host pages What's on, Help, the For hosts dropdown, WhatsApp and the free trial", () => {
    render(
      <SiteAccountActionProvider value={{bar: <button type="button">Sign in</button>, menu: {label: "Sign in"}}}>
        <PublicSiteHeader variant="host" />
      </SiteAccountActionProvider>,
    );
    const banner = within(screen.getByRole("banner"));
    // Resources holds one page today, so it is a plain link to Help, not a dropdown.
    expect(within(banner.getByRole("navigation", {name: "Primary"})).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")]))
      .toEqual([["What’s on", "/explore/"], ["Pricing", "/pricing/"], ["Help", "/help/"]]);
    expect(banner.queryByRole("button", {name: "Resources"})).toBeNull();
    const forHosts = banner.getByRole("button", {name: "For hosts"});
    // The canvas sets the dropdown among the page links, after What's on.
    expect(banner.getByRole("navigation", {name: "Primary"}).contains(forHosts)).toBe(true);
    expect(forHosts.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(forHosts);
    expect(forHosts.getAttribute("aria-expanded")).toBe("true");
    const panel = document.getElementById(forHosts.getAttribute("aria-controls")!)!;
    // The canvas's columns, each list named by its title.
    expect(within(panel).getAllByRole("list").map((list) => document.getElementById(list.getAttribute("aria-labelledby")!)?.textContent))
      .toEqual(["Product", "By format", "By organisation", "Programmes", "Where you are"]);
    const hrefs = within(panel).getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(forHostsColumns.flatMap((section) => section.links.map((link) => link.href)));
    // Every product page and every organiser type page is one press away.
    for (const page of [...productPages, ...hostTypePages]) expect(hrefs, page).toContain(page);
    expect(within(within(panel).getByRole("list", {name: "Product"})).getAllByRole("link")[0].getAttribute("href")).toBe("/host/");
    for (const page of ["/weddings/", "/programmes/", "/host/first-event/", "/host/switch/", "/host/demo/", "/claim/", "/host/walkthrough/"]) {
      expect(hrefs, page).toContain(page);
    }
    fireEvent.keyDown(within(panel).getAllByRole("link")[0], {key: "Escape"});
    expect(forHosts.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(forHosts);
    const whatsapp = banner.getByRole("link", {name: siteHeaderCopy.host.whatsapp.label});
    expect(whatsapp.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\d+\?text=/u);
    expect(banner.getByRole("link", {name: "Start free trial"}).getAttribute("href")).toBe("/host/#start");
    expect(banner.queryByRole("link", {name: guestAppActionLabel})).toBeNull();
  });

  it("lists the host dropdown's pages in the phone menu, after the links and before the account", () => {
    render(
      <SiteAccountActionProvider value={{bar: <button type="button">Sign in</button>, menu: {label: "Sign in"}}}>
        <PublicSiteHeader variant="host" />
      </SiteAccountActionProvider>,
    );
    fireEvent.click(screen.getByRole("button", {name: publicSiteCopy.menu.openLabel}));
    const items = screen.getAllByRole("menuitem");
    const columns = forHostsColumns.map((section) => section.links.map((link) => link.label));
    expect(items.map((item) => item.textContent)).toEqual(["What’s on", "Pricing", "Help", ...columns.flat(), "Sign in"]);
    // A divider opens each of the menu's columns, and the account entry after them.
    const starts = columns.reduce<number[]>((at, column, index) => [...at, index === 0 ? 3 : at[index - 1] + columns[index - 1].length], []);
    expect(items.flatMap((item, index) => item.dataset.section ? [index] : [])).toEqual([...starts, items.length - 1]);
  });

  it("keeps a one-job flow's header to the wordmark: no links, menu, account or primary action", () => {
    render(
      <SiteAccountActionProvider value={{bar: <button type="button">Sign in</button>, menu: {label: "Sign in"}}}>
        <PublicSiteHeader variant="minimal" />
      </SiteAccountActionProvider>,
    );
    const banner = within(screen.getByRole("banner"));
    expect(banner.getAllByRole("link").map((link) => link.textContent)).toEqual([publicSiteCopy.wordmark]);
    expect(banner.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("draws a breadcrumb row under the bar and records its clicks", () => {
    render(<PublicSiteHeader breadcrumbs={{links: [{href: "/explore/", label: "What’s on"}, {href: "/mumbai/", label: "Mumbai"}], current: "Sunday run"}} />);
    const trail = within(screen.getByRole("navigation", {name: siteHeaderCopy.breadcrumbLabel}));
    expect(trail.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/explore/", "/mumbai/"]);
    expect(trail.getByText("Sunday run").getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("banner").contains(trail.getByText("Sunday run"))).toBe(false);
    const city = trail.getByRole("link", {name: "Mumbai"});
    city.addEventListener("click", (event) => event.preventDefault(), {once: true});
    fireEvent.click(city);
    expect(trackSiteCtaClick).toHaveBeenCalledWith("breadcrumb_Mumbai", "/mumbai/");
  });

  it("shows no offer strip unless the page passes one, and never a dismiss on it", () => {
    const {container, unmount} = render(<PublicSiteHeader variant="host" />);
    expect(container.firstElementChild?.tagName).toBe("HEADER");
    unmount();
    render(<PublicSiteHeader offer={{lead: "A sample lead.", body: "A sample offer.", action: {href: "#offer", label: "See the offer"}}} variant="host" />);
    expect(screen.getByText("A sample lead.")).toBeTruthy();
    expect(screen.getByRole("link", {name: "See the offer"}).getAttribute("href")).toBe("#offer");
    expect(screen.queryByRole("button", {name: /dismiss|close/iu})).toBeNull();
  });

  it("renders the one site footer: Explore, Cities, Hosts with Weddings, Help and legal with the listing request ending in Privacy choices, the operator line once", () => {
    render(<PublicSiteFooter />);
    const footer = within(screen.getByRole("contentinfo"));
    const nav = within(footer.getByRole("navigation", {name: "Footer"}));
    expect(nav.getAllByRole("heading", {level: 2}).map((heading) => heading.textContent)).toEqual(["Explore", "Cities", "Hosts", "Help and legal"]);
    expect(nav.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "What’s on", "Safety", guestAppActionLabel,
      ...siteFooterDefaultCities.map((city) => city.label),
      "Catch for hosts", "Pricing", "Start free trial", "Weddings", "Claim your page",
      "Help", "Privacy", "Terms", "Refunds", "Contact", "Report or remove a listing",
    ]);
    expect(nav.getByRole("link", {name: "Start free trial"}).getAttribute("href")).toBe("/host/#start");
    expect(nav.getByRole("link", {name: "Report or remove a listing"}).getAttribute("href")).toBe("/listings/request/");
    expect(nav.getByRole("link", {name: "Weddings"}).getAttribute("href")).toBe("/weddings/");
    expect(nav.getByRole("button", {name: publicSiteCopy.privacyChoices})).toBeTruthy();
    expect(footer.getByRole("link", {name: publicSiteCopy.wordmark}).getAttribute("href")).toBe("/");
    expect(screen.getAllByText(publicSiteCopy.footerOperator)).toHaveLength(1);
  });

  it("adds a page's Cities column, marks a city not yet open, and records a footer click", () => {
    render(<PublicSiteFooter appHref="#app" cities={[{href: "/mumbai/", label: "Mumbai", soon: false}, {href: "/pune/", label: "Pune", soon: true}]}
      exploreHref="/mumbai/" />);
    const nav = within(screen.getByRole("navigation", {name: "Footer"}));
    expect(nav.getAllByRole("heading", {level: 2}).map((heading) => heading.textContent)).toEqual(["Explore", "Cities", "Hosts", "Help and legal"]);
    expect(nav.getByRole("link", {name: "Mumbai"}).getAttribute("href")).toBe("/mumbai/");
    expect(nav.getByRole("link", {name: "Pune · soon"}).getAttribute("href")).toBe("/pune/");
    expect(nav.getByRole("link", {name: "What’s on"}).getAttribute("href")).toBe("/mumbai/");
    expect(nav.getByRole("link", {name: guestAppActionLabel}).getAttribute("href")).toBe("#app");
    const terms = nav.getByRole("link", {name: "Terms"});
    terms.addEventListener("click", (event) => event.preventDefault(), {once: true});
    fireEvent.click(terms);
    expect(trackSiteCtaClick).toHaveBeenCalledWith("footer_Terms", "/terms/");
  });

  it("shows every live city and the all-cities page when a guest page lists no cities", () => {
    render(<PublicSiteFooter />);
    const nav = within(screen.getByRole("navigation", {name: "Footer"}));
    expect(nav.getAllByRole("heading", {level: 2}).map((heading) => heading.textContent)).toEqual(["Explore", "Cities", "Hosts", "Help and legal"]);
    expect(siteFooterDefaultCities.length).toBeGreaterThan(1);
    for (const city of siteFooterDefaultCities) expect(nav.getByRole("link", {name: city.label}).getAttribute("href")).toBe(city.href);
    expect(siteFooterDefaultCities.at(-1)).toEqual({href: "/cities/", label: siteFooterCopy.moreCities, soon: false});
  });

  it("names a product page in the wordmark and keeps the same columns", () => {
    render(<PublicSiteFooter tagline="For planners." wordmark="Catch for weddings" />);
    const footer = within(screen.getByRole("contentinfo"));
    expect(footer.getByRole("link", {name: "Catch for weddings"}).getAttribute("href")).toBe("/");
    expect(footer.getByText("For planners.")).toBeTruthy();
    expect(within(footer.getByRole("navigation", {name: "Footer"})).getAllByRole("heading", {level: 2})).toHaveLength(4);
  });

  it("leads the footer with the help band: WhatsApp and Help on guest pages, WhatsApp and the walkthrough on host pages", () => {
    const band = (root: ReturnType<typeof within>) =>
      within(root.getByRole("heading", {level: 2, name: siteFooterCopy.helpBand.title}).parentElement!);
    const {unmount} = render(<PublicSiteFooter />);
    const guest = band(within(screen.getByRole("contentinfo")));
    expect(guest.getByRole("link", {name: siteFooterCopy.helpBand.whatsapp}).getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\d+\?text=/u);
    expect(guest.getByRole("link", {name: siteFooterCopy.helpBand.guestHelp.label}).getAttribute("href")).toBe("/help/");
    expect(guest.queryByRole("link", {name: siteFooterCopy.helpBand.walkthrough.label})).toBeNull();
    unmount();
    render(<PublicSiteFooter variant="host" />);
    const host = band(within(screen.getByRole("contentinfo")));
    // The walkthrough goes to its request page, a tracked lead form.
    expect(host.getByRole("link", {name: siteFooterCopy.helpBand.walkthrough.label}).getAttribute("href")).toBe("/host/walkthrough/");
    expect(host.getByRole("link", {name: siteFooterCopy.helpBand.whatsapp}).getAttribute("href"))
      .toContain(encodeURIComponent(siteFooterCopy.helpBand.hostMessage));
    expect(host.queryByRole("link", {name: siteFooterCopy.helpBand.guestHelp.label})).toBeNull();
  });

  it("lets a page name the help band's topic, keeping its actions", () => {
    render(<PublicSiteFooter helpTitle="Questions about hosting? A person answers." variant="host" />);
    expect(screen.getByRole("heading", {level: 2, name: "Questions about hosting? A person answers."})).toBeTruthy();
    expect(screen.queryByText(siteFooterCopy.helpBand.title)).toBeNull();
    expect(screen.getByRole("link", {name: siteFooterCopy.helpBand.whatsapp})).toBeTruthy();
  });

  it("leaves the help band out of one-job flows", () => {
    render(<PublicSiteFooter helpBand={false} />);
    expect(screen.queryByText(siteFooterCopy.helpBand.title)).toBeNull();
    expect(screen.queryByRole("link", {name: siteFooterCopy.helpBand.whatsapp})).toBeNull();
  });

  it("adds a city page's New to the city to Explore and its format pages as their own column", () => {
    render(<PublicSiteFooter cities={[{href: "/mumbai/", label: "Mumbai", soon: false}]} exploreHref="/mumbai/" cityFormats={{
      newToCity: {href: "/new-to-mumbai/", label: "New to Mumbai"}, title: "Things to do in Mumbai",
      formats: [{href: "/mumbai/run-clubs/", label: "Run clubs"}, {href: "/mumbai/quiz-nights/", label: "Quiz nights"}],
    }} />);
    const nav = within(screen.getByRole("navigation", {name: "Footer"}));
    expect(nav.getAllByRole("heading", {level: 2}).map((heading) => heading.textContent))
      .toEqual(["Explore", "Things to do in Mumbai", "Cities", "Hosts", "Help and legal"]);
    expect(nav.getAllByRole("link").slice(0, 6).map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["What’s on", "/mumbai/"], ["New to Mumbai", "/new-to-mumbai/"], ["Safety", "/safety/"], [guestAppActionLabel, "/app/"],
      ["Run clubs", "/mumbai/run-clubs/"], ["Quiz nights", "/mumbai/quiz-nights/"],
    ]);
  });

  it("leaves the city's column out when it has no format page", () => {
    render(<PublicSiteFooter cityFormats={{title: "Things to do in Pune", formats: []}} />);
    const nav = within(screen.getByRole("navigation", {name: "Footer"}));
    expect(nav.getAllByRole("heading", {level: 2}).map((heading) => heading.textContent)).toEqual(["Explore", "Cities", "Hosts", "Help and legal"]);
  });

  it("gives every host page the canvas's five host columns, ending in the legal links and Privacy choices", () => {
    render(<PublicSiteFooter footnotes={["1. A sample source."]} helpBand={false} variant="host" />);
    const footer = within(screen.getByRole("contentinfo"));
    const nav = within(footer.getByRole("navigation", {name: "Footer"}));
    expect(nav.getAllByRole("heading", {level: 2}).map((heading) => heading.textContent)).toEqual(["Product", "Hosts by format", "Get started", "Resources", "Catch"]);
    expect(nav.getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["How Catch works", "/how-it-works/"], ["Your page", "/product/your-page/"], ["Bookings and memberships", "/product/bookings-and-memberships/"],
      ["Messages and growth", "/product/messages-and-growth/"], ["The room", "/product/the-room/"], ["Running the event", "/product/running-the-event/"],
      ["Guest records", "/product/guest-records/"], ["Reports and payouts", "/product/reports-and-payouts/"],
      ["Run and walk clubs", "/host/run-clubs/"], ["Racket sports", "/host/racket-sports/"], ["Supper clubs", "/host/supper-clubs/"],
      ["Quiz and game nights", "/host/quiz-nights/"], ["Studios", "/host/studios/"], ["Venues", "/host/venues/"], ["Communities", "/host/communities/"],
      ["Mixers and pub crawls", "/host/nightlife/"], ["Teams", "/host/teams/"], ["Colleges and alumni", "/host/colleges/"],
      ["Start free trial", "/host/start/"], ["Pricing", "/pricing/"], ["Your first event", "/host/first-event/"], ["Switch to Catch", "/host/switch/"],
      ["Try a demo night", "/host/demo/"], ["Programmes", "/programmes/"],
      ["Forms", "/product/forms/"], ["Host playbooks", "/playbooks/"], ["No-show calculator", "/tools/no-show-calculator/"],
      ["Event page from a link", "/tools/event-page-from-link/"],
      ["Book a walkthrough", "/host/walkthrough/"], ["Refer a host", "/refer/"], ["Help", "/help/"],
      ["What’s on", "/explore/"], ["About", "/about/"], ["Safety", "/safety/"], ["Contact", "/contact/"], ["Report or remove a listing", "/listings/request/"],
      ["Terms", "/terms/"], ["Privacy", "/privacy/"], ["Refunds", "/refunds/"],
    ]);
    expect(nav.getByRole("button", {name: publicSiteCopy.privacyChoices})).toBeTruthy();
    expect(nav.queryByRole("link", {name: guestAppActionLabel})).toBeNull();
    expect(footer.getByText("1. A sample source.")).toBeTruthy();
  });

  it("points the host footer's What's on at a city's Explore, and lets a page pass its own columns", () => {
    const {unmount} = render(<PublicSiteFooter exploreHref="/mumbai/" helpBand={false} variant="host" />);
    expect(within(screen.getByRole("navigation", {name: "Footer"})).getByRole("link", {name: "What’s on"}).getAttribute("href")).toBe("/mumbai/");
    unmount();
    render(<PublicSiteFooter columns={[{title: "Own column", links: [{href: "/a/", label: "Own page"}]}]} helpBand={false} variant="host" />);
    const nav = within(screen.getByRole("navigation", {name: "Footer"}));
    expect(nav.getAllByRole("heading", {level: 2}).map((heading) => heading.textContent)).toEqual(["Own column"]);
    expect(nav.getByRole("button", {name: publicSiteCopy.privacyChoices})).toBeTruthy();
  });
});
