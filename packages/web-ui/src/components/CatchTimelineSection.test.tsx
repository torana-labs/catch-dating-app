import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchTimelineSection} from "./CatchTimelineSection";

afterEach(cleanup);

const moments = [{time: "Thursday", title: "Groups set", body: "Every booking brings a pace."}, {time: "6:20 AM", title: "Check in", body: "Runners tap in."}];

describe("CatchTimelineSection", () => {
  it("opens the chosen moment and hands a newly chosen one to the page", () => {
    const onSelect = vi.fn();
    render(<CatchTimelineSection media={<span>Screen</span>} moments={moments} onSelect={onSelect} picker={<span>Picker</span>} selected={0} timelineLabel="Moments" title="On the night" />);
    expect(screen.getByRole("region", {name: "On the night"})).toBeTruthy();
    const timeline = within(screen.getByRole("list", {name: "Moments"}));
    expect(timeline.getByRole("button", {name: /Groups set/u}).getAttribute("aria-current")).toBe("step");
    expect(timeline.getByText("Every booking brings a pace.")).toBeTruthy();
    expect(timeline.queryByText("Runners tap in.")).toBeNull();
    fireEvent.click(timeline.getByRole("button", {name: /Check in/u}));
    expect(onSelect).toHaveBeenCalledWith(1);
    expect(screen.getByText("Picker")).toBeTruthy();
    expect(screen.getByText("Screen")).toBeTruthy();
  });

  it("is a plain list without a way to choose", () => {
    render(<CatchTimelineSection moments={moments} selected={1} timelineLabel="Moments" title="On the night" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Runners tap in.")).toBeTruthy();
  });
});
