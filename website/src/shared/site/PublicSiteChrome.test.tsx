import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {publicSiteCopy} from "../../content/site";
import {PublicSiteFooter, PublicSiteHeader, SiteFooterBand} from "./PublicSiteChrome";
import {trackSiteCtaClick} from "./siteTracking";

vi.mock("./siteTracking", () => ({slugForTracking: (value: string) => value, trackSiteCtaClick: vi.fn()}));
afterEach(() => {cleanup(); vi.mocked(trackSiteCtaClick).mockReset();});
const globalLabels = ["Find events", "Organisers", "For organisers"];
const destinations = ["/explore/", "/organizers/", "/host/"];

describe("canonical public chrome", () => {
  it("renders the site top bar for every route: the wordmark home, the global destinations, no route actions", () => {
    render(<PublicSiteHeader />);
    const banner = within(screen.getByRole("banner"));
    const primary = within(screen.getByRole("navigation", {name: "Primary"}));
    expect(primary.getAllByRole("link").map((link) => link.textContent)).toEqual(globalLabels);
    expect(primary.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(destinations);
    expect(banner.getByRole("link", {name: publicSiteCopy.wordmark}).getAttribute("href")).toBe("/");
    expect(banner.queryByRole("link", {name: "Claim your page"})).toBeNull();
  });

  it("records a navigation click", () => {
    render(<PublicSiteHeader />);
    const link = within(screen.getByRole("navigation", {name: "Primary"})).getByRole("link", {name: "Organisers"});
    link.addEventListener("click", (event) => event.preventDefault(), {once: true});
    fireEvent.click(link);
    expect(trackSiteCtaClick).toHaveBeenCalledWith("nav_Organisers", "/organizers/");
  });

  it("puts the same links in the phone menu", () => {
    render(<PublicSiteHeader />);
    fireEvent.click(screen.getByRole("button", {name: publicSiteCopy.menu.openLabel}));
    const options = screen.getAllByRole("menuitem").map((item) => item.textContent);
    expect(options.join(" ")).toContain("For organisers");
    expect(options).toHaveLength(3);
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
