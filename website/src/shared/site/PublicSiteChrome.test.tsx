import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {guestAppActionLabel, publicSiteCopy, siteFooterCopy, siteHeaderCopy} from "../../content/site";
import {PublicSiteFooter, PublicSiteHeader, SiteAccountActionProvider} from "./PublicSiteChrome";
import {trackSiteCtaClick} from "./siteTracking";

vi.mock("./siteTracking", () => ({slugForTracking: (value: string) => value, trackSiteCtaClick: vi.fn()}));
afterEach(() => {cleanup(); vi.mocked(trackSiteCtaClick).mockReset();});
// The main bar only opens pages: What's on (plans and organisers as tabs) and For hosts.
const globalLabels = ["What’s on", "For hosts"];
const destinations = ["/explore/", "/host/"];

describe("canonical public chrome", () => {
  it("renders the site top bar for every general page: the wordmark home, the main site's links and Get the app", () => {
    render(<PublicSiteHeader />);
    const banner = within(screen.getByRole("banner"));
    const primary = within(screen.getByRole("navigation", {name: "Primary"}));
    expect(primary.getAllByRole("link").map((link) => link.textContent)).toEqual(globalLabels);
    expect(primary.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(destinations);
    expect(banner.getByRole("link", {name: publicSiteCopy.wordmark}).getAttribute("href")).toBe("/");
    expect(banner.getByRole("link", {name: guestAppActionLabel}).getAttribute("href")).toBe("/#app");
    expect(banner.queryByRole("link", {name: "Claim your page"})).toBeNull();
  });

  it("puts the account entry last on the right, after the page's actions", () => {
    const signIn = vi.fn();
    render(
      <SiteAccountActionProvider value={{bar: <button onClick={signIn} type="button">Sign in</button>, menu: {label: "Sign in", onPressed: signIn}}}>
        <PublicSiteHeader actions={<a href="#start">Start free trial</a>} links={[{href: "#night", label: "On the night"}]} title="Catch for hosts" />
      </SiteAccountActionProvider>,
    );
    const banner = screen.getByRole("banner");
    const order = [...banner.querySelectorAll("a, button")].map((element) => element.textContent?.trim())
      .filter((label) => label !== publicSiteCopy.menu.openLabel);
    // Wordmark and links on the left; the primary action, then the account, on the right.
    expect(order).toEqual(["Catch for hosts", "On the night", "Start free trial", "Sign in"]);
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
    expect(within(screen.getByRole("navigation", {name: "Primary"})).getAllByRole("link").map((link) => link.textContent)).toEqual(["For hosts"]);
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
      .toEqual([["What’s on", "/explore/"], ["Help", "/help/"]]);
    expect(banner.queryByRole("button", {name: "Resources"})).toBeNull();
    const forHosts = banner.getByRole("button", {name: "For hosts"});
    expect(forHosts.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(forHosts);
    const panel = document.getElementById(forHosts.getAttribute("aria-controls")!)!;
    expect(within(panel).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")]))
      .toEqual([["Catch for hosts", "/host/"], ["Weddings", "/weddings/"], ["Claim your page", "/claim/"]]);
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
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent))
      .toEqual(["What’s on", "Help", "Catch for hosts", "Weddings", "Claim your page", "Sign in"]);
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

  it("renders the one site footer: Explore, Hosts with Weddings, Help and legal ending in Privacy choices, the operator line once", () => {
    render(<PublicSiteFooter />);
    const footer = within(screen.getByRole("contentinfo"));
    const nav = within(footer.getByRole("navigation", {name: "Footer"}));
    expect(nav.getAllByRole("heading", {level: 2}).map((heading) => heading.textContent)).toEqual(["Explore", "Hosts", "Help and legal"]);
    expect(nav.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "What’s on", guestAppActionLabel,
      "Catch for hosts", "Pricing", "Start free trial", "Weddings", "Claim your page",
      "Help", "Privacy", "Terms", "Refunds", "Contact",
    ]);
    expect(nav.getByRole("link", {name: "Start free trial"}).getAttribute("href")).toBe("/host/#start");
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

  it("names a product page in the wordmark and keeps the same columns", () => {
    render(<PublicSiteFooter tagline="For planners." wordmark="Catch for weddings" />);
    const footer = within(screen.getByRole("contentinfo"));
    expect(footer.getByRole("link", {name: "Catch for weddings"}).getAttribute("href")).toBe("/");
    expect(footer.getByText("For planners.")).toBeTruthy();
    expect(within(footer.getByRole("navigation", {name: "Footer"})).getAllByRole("heading", {level: 2})).toHaveLength(3);
  });

  it("leads the footer with the help band: WhatsApp on guest pages, the walkthrough added on host pages", () => {
    const {unmount} = render(<PublicSiteFooter />);
    const guest = within(screen.getByRole("contentinfo"));
    expect(guest.getByRole("heading", {level: 2, name: siteFooterCopy.helpBand.title})).toBeTruthy();
    expect(guest.getByRole("link", {name: siteFooterCopy.helpBand.whatsapp}).getAttribute("href")).toMatch(/^https:\/\/wa\.me\/\d+\?text=/u);
    expect(guest.queryByRole("link", {name: siteFooterCopy.helpBand.walkthrough.label})).toBeNull();
    unmount();
    render(<PublicSiteFooter variant="host" />);
    const host = within(screen.getByRole("contentinfo"));
    expect(host.getByRole("link", {name: siteFooterCopy.helpBand.walkthrough.label}).getAttribute("href")).toBe("/host/#start");
    expect(host.getByRole("link", {name: siteFooterCopy.helpBand.whatsapp}).getAttribute("href"))
      .toContain(encodeURIComponent(siteFooterCopy.helpBand.hostMessage));
  });

  it("leaves the help band out of one-job flows", () => {
    render(<PublicSiteFooter helpBand={false} />);
    expect(screen.queryByText(siteFooterCopy.helpBand.title)).toBeNull();
    expect(screen.queryByRole("link", {name: siteFooterCopy.helpBand.whatsapp})).toBeNull();
  });

  it("gives host pages the host columns: Product, Get started, the brand's column and Legal ending in Privacy choices", () => {
    render(<PublicSiteFooter footnotes={["1. A sample source."]} helpBand={false} variant="host" />);
    const footer = within(screen.getByRole("contentinfo"));
    const nav = within(footer.getByRole("navigation", {name: "Footer"}));
    expect(nav.getAllByRole("heading", {level: 2}).map((heading) => heading.textContent)).toEqual(["Product", "Get started", "Catch", "Legal"]);
    expect(nav.getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Catch for hosts", "/host/"], ["How Catch works", "/host/#night"], ["Ways to use Catch", "/host/#ways"], ["Weddings", "/weddings/"],
      ["Start free trial", "/host/#start"], ["Pricing", "/host/#pricing"], ["Claim your page", "/claim/"],
      ["What’s on", "/explore/"], ["Help", "/help/"], ["Contact", "/contact/"],
      ["Privacy", "/privacy/"], ["Terms", "/terms/"], ["Refunds", "/refunds/"],
    ]);
    expect(nav.getByRole("button", {name: publicSiteCopy.privacyChoices})).toBeTruthy();
    expect(nav.queryByRole("link", {name: guestAppActionLabel})).toBeNull();
    expect(footer.getByText("1. A sample source.")).toBeTruthy();
  });
});
