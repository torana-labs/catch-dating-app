import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {publicSiteCopy} from "../../content/site";
import {PublicSiteFooter, PublicSiteHeader, SiteAccountActionProvider} from "./PublicSiteChrome";
import {trackSiteCtaClick} from "./siteTracking";

vi.mock("./siteTracking", () => ({slugForTracking: (value: string) => value, trackSiteCtaClick: vi.fn()}));
afterEach(() => {cleanup(); vi.mocked(trackSiteCtaClick).mockReset();});
const globalLabels = ["Explore", "Organisers", "For hosts"];
const destinations = ["/explore/", "/explore/?show=organisers", "/host/"];

describe("canonical public chrome", () => {
  it("renders the site top bar for every general page: the wordmark home, the main site's links and Get the app", () => {
    render(<PublicSiteHeader />);
    const banner = within(screen.getByRole("banner"));
    const primary = within(screen.getByRole("navigation", {name: "Primary"}));
    expect(primary.getAllByRole("link").map((link) => link.textContent)).toEqual(globalLabels);
    expect(primary.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(destinations);
    expect(banner.getByRole("link", {name: publicSiteCopy.wordmark}).getAttribute("href")).toBe("/");
    expect(banner.getByRole("link", {name: "Get the app"}).getAttribute("href")).toBe("/#app");
    expect(banner.queryByRole("link", {name: "Claim your page"})).toBeNull();
  });

  it("keeps the account entry last on the left and only the page's actions on the right", () => {
    const signIn = vi.fn();
    render(
      <SiteAccountActionProvider value={{bar: <button onClick={signIn} type="button">Sign in</button>, menu: {label: "Sign in", onPressed: signIn}}}>
        <PublicSiteHeader actions={<a href="#start">Start free trial</a>} links={[{href: "#night", label: "On the night"}]} title="Catch for hosts" />
      </SiteAccountActionProvider>,
    );
    const banner = screen.getByRole("banner");
    const order = [...banner.querySelectorAll("a, button")].map((element) => element.textContent?.trim())
      .filter((label) => label !== publicSiteCopy.menu.openLabel);
    // Wordmark, links, account, then the primary action: the account belongs to the left group.
    expect(order).toEqual(["Catch for hosts", "On the night", "Sign in", "Start free trial"]);
    const signInButton = within(banner).getByRole("button", {name: "Sign in"});
    const leftGroup = within(banner).getByRole("navigation", {name: "Primary"}).parentElement!;
    expect(leftGroup.contains(signInButton)).toBe(true);
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
    const link = within(screen.getByRole("navigation", {name: "Primary"})).getByRole("link", {name: "Organisers"});
    link.addEventListener("click", (event) => event.preventDefault(), {once: true});
    fireEvent.click(link);
    expect(trackSiteCtaClick).toHaveBeenCalledWith("nav_Organisers", "/explore/?show=organisers");
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

  it("renders the one site footer: Explore, Hosts with Weddings, Help and legal ending in Privacy choices, the operator line once", () => {
    render(<PublicSiteFooter />);
    const footer = within(screen.getByRole("contentinfo"));
    const nav = within(footer.getByRole("navigation", {name: "Footer"}));
    expect(nav.getAllByRole("heading", {level: 2}).map((heading) => heading.textContent)).toEqual(["Explore", "Hosts", "Help and legal"]);
    expect(nav.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "What’s on", "Organisers", "Get the app",
      "Catch for hosts", "Pricing", "Weddings", "Claim your page",
      "Help", "Privacy", "Terms", "Refunds", "Contact",
    ]);
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
    expect(nav.getByRole("link", {name: "Get the app"}).getAttribute("href")).toBe("#app");
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
});
