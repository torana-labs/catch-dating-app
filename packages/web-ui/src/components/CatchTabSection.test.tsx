import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchTabSection} from "./CatchTabSection";

afterEach(cleanup);

const items = [
  {id: "one", label: "First", accent: "coral" as const, title: "First panel", body: "First body.", list: [{time: "Morning", title: "A first moment"}], media: <div data-testid="media-one" />},
  {id: "two", label: "Second", title: "Second panel", body: "Second body."},
];

describe("CatchTabSection", () => {
  it("is a section named by its headline, with a named tab list and the first panel", () => {
    const {container} = render(<CatchTabSection items={items} tabsLabel="Sample tabs" title="Sample switcher" />);
    expect(screen.getByRole("region", {name: "Sample switcher"}).tagName).toBe("SECTION");
    expect(screen.getByRole("tablist", {name: "Sample tabs"})).toBeTruthy();
    expect(screen.getByRole("tab", {name: "First"}).getAttribute("aria-selected")).toBe("true");
    const panel = screen.getByRole("tabpanel", {name: "First"});
    expect(panel.textContent).toContain("First body.");
    expect(screen.getByText("Morning")).toBeTruthy();
    expect(screen.getByTestId("media-one")).toBeTruthy();
    expect(screen.getByRole("heading", {level: 3, name: "First panel"})).toBeTruthy();
    expect(container.querySelector("[data-accent='coral']")).not.toBeNull();
  });

  it("switches panels on its own and reports the choice", () => {
    const onChanged = vi.fn();
    render(<CatchTabSection items={items} onChanged={onChanged} tabsLabel="Tabs" title="Switcher" />);
    fireEvent.click(screen.getByRole("tab", {name: "Second"}));
    expect(onChanged).toHaveBeenCalledWith("two");
    expect(screen.getByRole("tabpanel", {name: "Second"}).textContent).toContain("Second body.");
  });

  it("follows selected when the page owns the choice", () => {
    const {rerender} = render(<CatchTabSection items={items} selected="two" tabsLabel="Tabs" title="Switcher" />);
    expect(screen.getByRole("tabpanel", {name: "Second"})).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", {name: "First"}));
    expect(screen.getByRole("tabpanel", {name: "Second"})).toBeTruthy();
    rerender(<CatchTabSection items={items} selected="one" tabsLabel="Tabs" title="Switcher" />);
    expect(screen.getByRole("tabpanel", {name: "First"})).toBeTruthy();
  });

  it("starts on defaultSelected", () => {
    render(<CatchTabSection defaultSelected="two" items={items} tabsLabel="Tabs" title="Switcher" />);
    expect(screen.getByRole("tab", {name: "Second"}).getAttribute("aria-selected")).toBe("true");
  });

  it("draws the steps layout: numbered rows beside a polite pane", () => {
    const steps = [
      {id: "a", label: "First step", time: "Week one", body: "First step body.", tips: ["A first tip"]},
      {id: "b", label: "Second step", time: "Week two", body: "Second step body."},
    ];
    const {container} = render(<CatchTabSection items={steps} layout="steps" tabsLabel="Sample steps" title="Steps" />);
    expect(screen.getByRole("list", {name: "Sample steps"})).toBeTruthy();
    const pane = container.querySelector<HTMLElement>("[aria-live='polite']")!;
    expect(pane.textContent).toContain("First step body.");
    expect(pane.textContent).toContain("A first tip");
    fireEvent.click(screen.getByRole("button", {name: /Second step/}));
    expect(pane.textContent).toContain("Second step body.");
    expect(screen.getByRole("button", {name: /Second step/}).getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("heading", {level: 3, name: "Second step"})).toBeTruthy();
  });

  it("draws only the header when there are no items", () => {
    render(<CatchTabSection items={[]} tabsLabel="Tabs" title="Empty" />);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByRole("heading", {name: "Empty"})).toBeTruthy();
  });
});
