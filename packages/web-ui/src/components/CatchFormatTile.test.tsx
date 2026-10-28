import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchFormatTile} from "./CatchFormatTile";

afterEach(cleanup);

const tile = {activityKind: "socialRun" as const, body: "Pace groups and a first hello for every newcomer.", format: "run" as const,
  kicker: "6 this week", title: "Run clubs"};

describe("CatchFormatTile", () => {
  it("toggles as a pressed button on its format", () => {
    const press = vi.fn();
    render(<CatchFormatTile {...tile} onPressed={press} pressed={false} />);
    const button = screen.getByRole("button", {name: /Run clubs/});
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.dataset.format).toBe("run");
    expect(button.textContent).toContain("6 this week");
    fireEvent.click(button);
    expect(press).toHaveBeenCalledOnce();
  });

  it("navigates as a link, with the activity artwork when there is no photo", () => {
    const {container} = render(<CatchFormatTile {...tile} format="games" href="/explore/?format=games" />);
    const link = screen.getByRole("link", {name: /Run clubs/});
    expect(link.getAttribute("href")).toBe("/explore/?format=games");
    expect(link.getAttribute("aria-pressed")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });
});
