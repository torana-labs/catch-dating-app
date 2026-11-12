import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {publicSiteCopy} from "../../content/site";
import {PublicSiteFooter, PublicSiteHeader, SiteAccountActionProvider, SiteFooterBand} from "./PublicSiteChrome";
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

  it("renders one legacy footer with the global and legal links and the operator credit once", () => {
    render(<PublicSiteFooter />);
    const footer = screen.getByRole("navigation", {name: "Footer"});
    expect(within(footer).getAllByRole("link").map((link) => link.textContent))
      .toEqual([...globalLabels, "Privacy", "Terms", "Refunds", "Help", "Contact"]);
    expect(screen.getAllByText(publicSiteCopy.footerOperator)).toHaveLength(1);
  });

  it("draws the system footer band with columns, or short", () => {
    const {rerender} = render(<SiteFooterBand columns={[{title: "Hosts", links: [{href: "/host/", label: "Catch for hosts"}]}]} label="Footer" tagline="Meet people." wordmark="Catch" />);
    const footer = within(screen.getByRole("contentinfo"));
    expect(footer.getByRole("navigation", {name: "Footer"})).toBeTruthy();
    expect(footer.getByRole("link", {name: "Catch for hosts"}).getAttribute("href")).toBe("/host/");
    rerender(<SiteFooterBand label="Footer" tagline="Meet people." wordmark="Catch" />);
    expect(screen.queryByRole("navigation", {name: "Footer"})).toBeNull();
    expect(screen.getByText("Meet people.")).toBeTruthy();
  });
});
