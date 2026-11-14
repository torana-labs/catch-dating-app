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

  it("draws the primary action after the page's actions and lists it in the phone menu after the links", () => {
    const onPressed = vi.fn();
    const assign = vi.fn();
    vi.stubGlobal("location", {...window.location, assign});
    render(<CatchTopBar actions={<button type="button">Mumbai</button>} links={[{label: "Explore", href: "/explore/"}]}
      menuExtras={[{label: "Sign in", onPressed: () => undefined}]} primaryAction={{label: "Get the app", href: "#app", onPressed}} title="Catch" variant="site" />);
    const bar = screen.getByRole("link", {name: "Get the app"});
    expect(bar.getAttribute("href")).toBe("#app");
    expect(screen.getByRole("button", {name: "Mumbai"}).compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Menu"}));
    const items = screen.getAllByRole("menuitem").map((item) => item.textContent);
    expect(items).toEqual(["Explore", "Get the app", "Sign in"]);
    fireEvent.click(screen.getByRole("menuitem", {name: "Get the app"}));
    expect(onPressed).toHaveBeenCalledOnce();
    expect(assign).toHaveBeenCalledWith("#app");
    vi.unstubAllGlobals();
  });
});
