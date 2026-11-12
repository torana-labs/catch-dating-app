import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchFormatTile} from "./CatchFormatTile";

afterEach(cleanup);

const tile = {body: "Pace groups and a first hello for every newcomer.", format: "run" as const,
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

  it("navigates as a link, with the format's artwork at its foot when there is no photo", () => {
    const {container} = render(<CatchFormatTile {...tile} format="games" href="/explore/?format=games" />);
    const link = screen.getByRole("link", {name: /Run clubs/});
    expect(link.getAttribute("href")).toBe("/explore/?format=games");
    expect(link.getAttribute("aria-pressed")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    // The games format draws the quiz artwork, decorative only.
    const art = container.querySelector("[data-format-art] [data-activity-kind]");
    expect(art?.getAttribute("data-activity-kind")).toBe("pubQuiz");
    expect(art?.getAttribute("aria-hidden")).toBe("true");
  });

  it("holds a plan's photo at its foot instead, and falls back to the artwork when the photo fails", () => {
    const {container} = render(<CatchFormatTile {...tile} href="/explore/" photoUrl="https://example.test/run.jpg" />);
    const photo = container.querySelector("img")!;
    expect(container.querySelector("[data-format-art]")).toBeNull();
    fireEvent.error(photo);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-format-art] [data-activity-kind]")?.getAttribute("data-activity-kind")).toBe("socialRun");
  });
});
