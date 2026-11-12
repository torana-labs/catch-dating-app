import {act, cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {CatchPipelineBoard, type CatchPipelineBoardProps} from "./CatchPipelineBoard";

const props: CatchPipelineBoardProps = {
  label: "Booking steps",
  boardLabel: "Guests moving from applied to booked",
  replayLabel: "Play again",
  steps: [
    {label: "Applied", title: "They apply", accent: "indigo", stat: "3 applications", body: "Applications arrive."},
    {label: "Approved", title: "You approve", accent: "mint", stat: "2 approved", body: "Approve with a tap."},
    {label: "Booked", title: "They show up", accent: "coral", stat: "1 booked", body: "Booked guests get where to meet."},
  ],
  guests: [{name: "Asha", reached: 2}, {name: "Rohan", reached: 1}, {name: "Dev", reached: 0}],
};

const guestColumn = (name: string) => screen.getByText(name).closest("li")!.style.getPropertyValue("--catch-pipeline-column");

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CatchPipelineBoard", () => {
  it("starts on the first step with every guest applied", () => {
    render(<CatchPipelineBoard {...props} />);
    const tabs = within(screen.getByRole("tablist", {name: "Booking steps"})).getAllByRole("tab");
    expect(tabs.map((tab) => tab.getAttribute("aria-selected"))).toEqual(["true", "false", "false"]);
    expect(screen.getByRole("tabpanel", {name: "Guests moving from applied to booked"})).toBeTruthy();
    expect(["Asha", "Rohan", "Dev"].map(guestColumn)).toEqual(["0", "0", "0"]);
    expect(screen.getByText("3 applications")).toBeTruthy();
  });

  it("plays through the steps on its own, each guest stopping at the furthest step they reach", () => {
    render(<CatchPipelineBoard {...props} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(["Asha", "Rohan", "Dev"].map(guestColumn)).toEqual(["2", "1", "0"]);
    expect(screen.getByText("1 booked")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText("3 applications")).toBeTruthy();
  });

  it("stops on a chosen step and plays again from the start on replay", () => {
    render(<CatchPipelineBoard {...props} intervalMs={1000} />);
    fireEvent.click(screen.getByRole("tab", {name: /You approve/}));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByRole("tab", {name: /You approve/}).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("2 approved").parentElement!.getAttribute("aria-live")).toBe("polite");
    fireEvent.click(screen.getByRole("button", {name: "Play again"}));
    expect(screen.getByRole("tab", {name: /They apply/}).getAttribute("aria-selected")).toBe("true");
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole("tab", {name: /You approve/}).getAttribute("aria-selected")).toBe("true");
  });

  it("holds still when the reader prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({matches: query.includes("reduce"), media: query}));
    render(<CatchPipelineBoard {...props} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByRole("tab", {name: /They apply/}).getAttribute("aria-selected")).toBe("true");
    vi.unstubAllGlobals();
  });
});
