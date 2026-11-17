import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchTopBar} from "./CatchTopBar";
import {CatchViewport} from "./CatchViewport";

afterEach(cleanup);

describe("CatchTopBar", () => {
  it("is one wide row with the kicker as a breadcrumb on desktops", () => {
    const onBack = vi.fn();
    render(
      <CatchViewport sizeClass="expanded" topBar={<CatchTopBar action={{label: "Preview", href: "#preview"}} back={{label: "Back", onPressed: onBack}} kicker="Settings" title="Intake" />} />,
    );
    const header = screen.getByRole("banner");
    expect(header.dataset.wide).toBe("");
    expect(screen.getByRole("heading", {level: 1}).textContent).toBe("Intake");
    expect(screen.getByText("Settings")).toBeTruthy();
    expect(screen.getByRole("link", {name: "Preview"})).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Back"}));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("keeps the phone shapes: a step counter with segments, and close only for a moment", () => {
    render(<CatchViewport sizeClass="compact" topBar={<CatchTopBar step={{index: 2, total: 4}} title="Your page" variant="step" />} />);
    expect(screen.getByRole("img", {name: "Step 2 of 4"}).children).toHaveLength(4);
    cleanup();
    render(<CatchTopBar back={{label: "Close", onPressed: () => undefined}} title="Ignored" variant="moment" />);
    expect(screen.getByRole("button", {name: "Close"})).toBeTruthy();
    expect(screen.queryByRole("heading")).toBeNull();
  });
});

describe("CatchTopBar site", () => {
  it("links the wordmark home, names its page links and keeps actions", () => {
    render(<CatchTopBar actions={<a href="/app">Get the app</a>} homeHref="/" links={[{label: "Explore", href: "/explore/"}, {label: "For hosts", href: "/host/"}]} title="Catch" variant="site" />);
    expect(screen.getByRole("link", {name: "Catch"}).getAttribute("href")).toBe("/");
    const nav = screen.getByRole("navigation", {name: "Site"});
    expect(nav.querySelectorAll("a")).toHaveLength(2);
    expect(screen.getByRole("link", {name: "For hosts"}).getAttribute("href")).toBe("/host/");
    expect(screen.getByRole("link", {name: "Get the app"})).toBeTruthy();
  });

  it("puts the contact link and the account control before the actions, as the canvas draws them", () => {
    render(<CatchTopBar account={<button type="button">Sign in</button>} actions={<a href="/app">Get the app</a>} links={[{label: "Explore", href: "/explore/"}]}
      contact={{href: "https://wa.me/0", label: "Talk to us", accessibleLabel: "Talk to us on WhatsApp"}} title="Catch" variant="site" />);
    const order = [...screen.getByRole("banner").querySelectorAll("a, button")]
      .map((element) => element.getAttribute("aria-label") ?? element.textContent?.trim())
      .filter((label) => label !== "Menu");
    expect(order).toEqual(["Catch", "Explore", "Talk to us on WhatsApp", "Sign in", "Get the app"]);
    expect(screen.getByRole("link", {name: "Talk to us on WhatsApp"}).textContent).toBe("Talk to us");
    expect(screen.getByRole("navigation", {name: "Site"}).parentElement!.contains(screen.getByRole("button", {name: "Sign in"}))).toBe(false);
  });

  it("draws page links as plain links and a link with pages as a dropdown in its place", () => {
    const onLink = vi.fn();
    render(<CatchTopBar links={[{label: "What’s on", href: "/explore/"}, {label: "For hosts", menu: {links: [{href: "/host/", label: "Catch for hosts"}], onLinkPressed: onLink}}, {label: "Pricing", href: "/host/pricing/"}]}
      menuExtras={[{href: "/host/", label: "Catch for hosts"}]} title="Catch" variant="site" />);
    const nav = screen.getByRole("navigation", {name: "Site"});
    const items = [...nav.querySelectorAll(":scope > a, :scope > button, :scope > div > button")].map((element) => element.textContent?.trim());
    expect(items).toEqual(["What’s on", "For hosts", "Pricing"]);
    const trigger = screen.getByRole("button", {name: "For hosts"});
    expect(trigger.dataset.appearance).toBe("link");
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("link", {name: "Catch for hosts"}));
    expect(onLink).toHaveBeenCalledWith({href: "/host/", label: "Catch for hosts"});
  });

  it("opens the phone menu from a round button named Menu, listing the links without the dropdown's own label", () => {
    render(<CatchTopBar links={[{label: "What’s on", href: "/explore/"}, {label: "For hosts", menu: {links: [{href: "/host/", label: "Catch for hosts"}]}}]}
      menuExtras={[{href: "/host/", label: "Catch for hosts"}]} title="Catch" variant="site" />);
    const menu = screen.getByRole("button", {name: "Menu"});
    expect(menu.textContent).toBe("");
    fireEvent.click(menu);
    const labels = screen.getAllByRole("menuitem").map((item) => item.textContent?.trim());
    expect(labels).toEqual(["What’s on", "Catch for hosts"]);
  });

  it("draws a whole phone menu in place of the built-in one when the site passes it", () => {
    render(<CatchTopBar links={[{href: "/explore/", label: "Explore"}]} menuExtras={[{label: "Sign in", onPressed: () => undefined}]}
      account={<button type="button">Account, Asha</button>} siteMenu={<button type="button">Menu, signed in as Asha</button>} title="Catch" variant="site" />);
    expect(screen.getByRole("button", {name: "Account, Asha"})).toBeTruthy();
    expect(screen.getByRole("button", {name: "Menu, signed in as Asha"})).toBeTruthy();
    expect(screen.queryByRole("button", {name: "Menu"})).toBeNull();
  });
});
