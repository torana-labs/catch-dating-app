import {cleanup, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchSiteHeader} from "./CatchSiteHeader";

afterEach(cleanup);

describe("CatchSiteHeader", () => {
  it("is a banner with the wordmark, named navigation and the page's controls", () => {
    render(
      <CatchSiteHeader
        actions={<button type="button">Mumbai</button>}
        brandHref="/"
        brandLabel="Catch"
        links={[
          {href: "/explore/", label: "Explore", current: true},
          {href: "/organizers/", label: "Organisers"},
          {href: "/host/", label: "For hosts", compact: true},
        ]}
        navLabel="Main"
        wideActions={<a href="#app">Get the app</a>}
      />,
    );
    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("link", {name: "Catch"}).getAttribute("href")).toBe("/");
    const nav = within(banner).getByRole("navigation", {name: "Main"});
    expect(within(nav).getByRole("link", {name: "Explore"}).getAttribute("aria-current")).toBe("page");
    expect(within(nav).getByRole("link", {name: "Organisers"}).getAttribute("aria-current")).toBeNull();
    expect(within(nav).getByRole("link", {name: "For hosts"}).closest("li")?.dataset.compact).toBe("true");
    expect(within(nav).getByRole("link", {name: "Explore"}).closest("li")?.dataset.compact).toBeUndefined();
    expect(within(nav).getByRole("button", {name: "Mumbai"})).toBeTruthy();
    expect(within(nav).getByRole("link", {name: "Get the app"})).toBeTruthy();
  });
});
