import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchLinkTile} from "./CatchLinkTile";

afterEach(cleanup);

describe("CatchLinkTile", () => {
  it("is a same-tab link on paper named by its title and subtitle", () => {
    render(<CatchLinkTile href="/strava" icon={<svg data-testid="icon" />} subtitle="Log your Sunday 5K" title="Strava club" />);
    const link = screen.getByRole("link", {name: "Strava club Log your Sunday 5K"});
    expect(link.getAttribute("href")).toBe("/strava");
    expect(link.getAttribute("target")).toBeNull();
    expect(link.dataset.ground).toBe("paper");
    expect(link.dataset.pinned).toBeUndefined();
    expect(screen.getByTestId("icon").parentElement!.getAttribute("aria-hidden")).toBe("true");
  });

  it("pins on the coral ground by default and on any accent", () => {
    const {rerender} = render(<CatchLinkTile href="#" pinned title="Run & Rave" />);
    expect(screen.getByRole("link").dataset).toMatchObject({ground: "coral", pinned: "true"});
    rerender(<CatchLinkTile accent="mint" href="#" pinned title="Run & Rave" />);
    expect(screen.getByRole("link").dataset.ground).toBe("mint");
  });

  it("opens a new tab safely and says so to screen readers", () => {
    render(<CatchLinkTile href="https://lu.ma/x" newTab newTabLabel="opens in a new tab" title="Tickets" />);
    const link = screen.getByRole("link", {name: "Tickets (opens in a new tab)"});
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("shows the owner's stats line and reports clicks", () => {
    const click = vi.fn();
    render(<CatchLinkTile href="#" onClick={click} stats="412 clicks · 12% of visits" title="Run & Rave" />);
    expect(screen.getByText("412 clicks · 12% of visits")).toBeTruthy();
    fireEvent.click(screen.getByRole("link"));
    expect(click).toHaveBeenCalledOnce();
  });
});
