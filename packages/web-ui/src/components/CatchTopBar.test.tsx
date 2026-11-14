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

  it("draws a whole phone menu in place of the built-in one when the site passes it", () => {
    render(<CatchTopBar links={[{href: "/explore/", label: "Explore"}]} menuExtras={[{label: "Sign in", onPressed: () => undefined}]}
      accountEnd={<button type="button">Account, Asha</button>} siteMenu={<button type="button">Menu, signed in as Asha</button>} title="Catch" variant="site" />);
    expect(screen.getByRole("button", {name: "Account, Asha"})).toBeTruthy();
    expect(screen.getByRole("button", {name: "Menu, signed in as Asha"})).toBeTruthy();
    expect(screen.queryByRole("button", {name: "Menu"})).toBeNull();
  });
});
