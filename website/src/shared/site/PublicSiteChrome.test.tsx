import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {getMarketingConsent, setMarketingConsent} from "../../analytics";
import {publicSiteCopy} from "../../content/site";
import {Button, MarketingConsentBannerShell} from "../ui/primitives";
import {PublicSiteFooter, PublicSiteHeader} from "./PublicSiteChrome";

vi.mock("./siteTracking", () => ({slugForTracking: (value: string) => value, trackSiteCtaClick: vi.fn()}));
beforeEach(() => {localStorage.clear(); window.dataLayer = [];});
afterEach(() => {cleanup(); document.body.style.overflow = "";});
const globalLabels = ["Find events", "Organisers", "For organisers"];
const destinations = ["/explore/", "/organizers/", "/host/"];

describe("canonical public chrome", () => {
  it("renders one header for every route: root brand, global destinations, no route actions", () => {
    render(<PublicSiteHeader />);
    const primary = screen.getByRole("navigation", {name: "Primary"});
    expect(within(primary).getAllByRole("link").map((link) => link.textContent)).toEqual(globalLabels);
    expect(within(primary).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(destinations);
    expect(screen.getByRole("link", {name: "Catch home"}).getAttribute("href")).toBe("/");
    expect(primary.closest(".consumer-home")).toBeTruthy();
    expect(screen.queryByRole("navigation", {name: "On this page"})).toBeNull();
    expect(within(screen.getByRole("banner")).queryByRole("link", {name: "Claim your page"})).toBeNull();
  });

  it("renders one footer with the global and legal links and the operator credit once", () => {
    render(<PublicSiteFooter />);
    const footer = screen.getByRole("navigation", {name: "Footer"});
    expect(within(footer).getAllByRole("link").map((link) => link.textContent))
      .toEqual([...globalLabels, "Privacy", "Terms", "Help"]);
    expect(screen.getAllByText(publicSiteCopy.footerOperator)).toHaveLength(1);
    expect(screen.queryByRole("navigation", {name: "Related links"})).toBeNull();
  });

  it("contains Tab focus, closes with Escape or navigation, and restores focus and body scrolling", () => {
    document.body.style.overflow = "auto";
    const {container} = render(<PublicSiteHeader />);
    const menu = screen.getByRole("button", {name: "Menu"});
    const dialog = container.querySelector('[role="dialog"]')!;
    expect(dialog.hasAttribute("inert")).toBe(true);
    fireEvent.click(menu);
    const close = screen.getByRole("button", {name: "Close"});
    expect(document.activeElement).toBe(close);
    expect(menu.getAttribute("aria-expanded")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
    expect(dialog.hasAttribute("inert")).toBe(false);
    const mobile = within(dialog as HTMLElement);
    expect(mobile.getAllByRole("link").map((link) => link.textContent)).toEqual(globalLabels);
    const last = mobile.getByRole("link", {name: "For organisers"});
    fireEvent.keyDown(document, {key: "Tab", shiftKey: true});
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(document, {key: "Tab"});
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(document, {key: "Escape"});
    expect(document.activeElement).toBe(menu);
    expect(menu.getAttribute("aria-expanded")).toBe("false");
    expect(document.body.style.overflow).toBe("auto");
    fireEvent.click(menu);
    fireEvent.click(mobile.getByRole("link", {name: "Organisers"}));
    expect(menu.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(menu);
    document.body.style.overflow = "";
  });

  const consentStates = [null, "essential", "analytics", "accepted"] as const;
  const exits = ["Escape", "Close", "Organisers", "For organisers"] as const;
  it.each(consentStates.flatMap((choice) => exits.map((exit) => ({choice, exit}))))(
    "preserves $choice consent through menu focus ownership and $exit, then returns access to choices",
    ({choice, exit}) => {
      if (choice) setMarketingConsent(choice);
      document.body.style.overflow = "auto";
      // Compose the real consent shell and service at the shared-site boundary.
      // Fresh/reopened adapter state and geometry are covered in the real browser.
      render(<><PublicSiteHeader /><MarketingConsentBannerShell
        aria-label="Consent choices"
        body="Consent choices"
        actions={<>
          <Button onClick={() => setMarketingConsent("analytics")}>Allow analytics</Button>
          <Button onClick={() => setMarketingConsent("accepted")}>Allow analytics and marketing</Button>
          <Button onClick={() => setMarketingConsent("essential")}>Essential only</Button>
        </>}
      /></>);
      const analyticsChoice = screen.getByRole("button", {name: "Allow analytics"});
      const marketingChoice = screen.getByRole("button", {name: "Allow analytics and marketing"});
      const essentialChoice = screen.getByRole("button", {name: "Essential only"});
      const storedConsent = localStorage.getItem("catch_marketing_consent_v4");
      const consent = getMarketingConsent();
      const consentMode = [...(window.dataLayer ?? [])];
      const menu = screen.getByRole("button", {name: "Menu"});
      fireEvent.click(menu);
      const dialog = screen.getByRole("dialog");
      const mobile = within(dialog);
      const close = mobile.getByRole("button", {name: "Close"});
      const last = mobile.getByRole("link", {name: "For organisers"});
      expect(document.activeElement).toBe(close);
      expect(document.body.style.overflow).toBe("hidden");
      fireEvent.keyDown(document, {key: "Tab", shiftKey: true});
      expect(document.activeElement).toBe(last);
      fireEvent.keyDown(document, {key: "Tab"});
      expect(document.activeElement).toBe(close);
      // An outside focus target must rejoin the active menu's keyboard cycle.
      analyticsChoice.focus();
      fireEvent.keyDown(document, {key: "Tab"});
      expect(document.activeElement).toBe(close);
      marketingChoice.focus();
      fireEvent.keyDown(document, {key: "Tab", shiftKey: true});
      expect(document.activeElement).toBe(last);
      if (exit === "Escape") fireEvent.keyDown(document, {key: "Escape"});
      else if (exit === "Close") fireEvent.click(close);
      else {
        const action = mobile.getByRole("link", {name: exit});
        // jsdom covers close ownership; real navigation is checked in the browser.
        action.addEventListener("click", (event) => event.preventDefault(), {once: true});
        fireEvent.click(action);
      }
      expect(menu.getAttribute("aria-expanded")).toBe("false");
      expect(dialog.hasAttribute("inert")).toBe(true);
      expect(document.activeElement).toBe(menu);
      expect(document.body.style.overflow).toBe("auto");
      expect(localStorage.getItem("catch_marketing_consent_v4")).toBe(storedConsent);
      expect(getMarketingConsent()).toEqual(consent);
      expect(window.dataLayer).toEqual(consentMode);
      expect(screen.getByRole("button", {name: "Allow analytics"})).toBe(analyticsChoice);
      expect(screen.getByRole("button", {name: "Allow analytics and marketing"})).toBe(marketingChoice);
      expect(screen.getByRole("button", {name: "Essential only"})).toBe(essentialChoice);
      fireEvent.click(essentialChoice);
      expect(getMarketingConsent()).toMatchObject({version: 4, measurementMode: "disabled",
        choice: "essential", analytics: false, marketing: false});
    }
  );
});

it("uses the same links in the header, mobile menu and footer", () => {
  const {container} = render(<><PublicSiteHeader /><PublicSiteFooter /></>);
  const primary = screen.getByRole("navigation", {name: "Primary"});
  expect(within(primary).getAllByRole("link").map(item => item.getAttribute("href"))).toEqual(destinations);
  fireEvent.click(screen.getByRole("button", {name: "Menu"}));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getAllByRole("link").map(item => item.getAttribute("href"))).toEqual(destinations);
  fireEvent.keyDown(document, {key: "Escape"});
  expect(container.querySelector('[role="dialog"]')?.hasAttribute("inert")).toBe(true);
  expect(within(screen.getByRole("navigation", {name: "Footer"})).getAllByRole("link").slice(0,3).map(item => item.getAttribute("href"))).toEqual(destinations);
});
