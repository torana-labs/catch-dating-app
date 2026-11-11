import {act, cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {CatchNightScene, type CatchNightSceneProps} from "./CatchNightScene";

const props: CatchNightSceneProps = {
  label: "Sunday Social Run, moment by moment",
  pickerLabel: "Event type",
  pickerLead: "Show me a",
  timelineLabel: "Moments in the evening",
  position: (index, total) => `${index} of ${total}`,
  formats: [{format: "run", title: "Run clubs"}, {format: "courts", title: "Pickleball"}],
  selected: 0,
  journey: {
    accent: "coral",
    event: "Sunday Social Run",
    where: "Carter Road Runners · Carter Road, Bandra",
    lead: "People are moving, so phones stay in pockets.",
    moments: [
      {time: "Thursday", title: "Pace groups, set before Sunday", body: "Every booking brings a pace.", badge: "Grouped by pace", screen: <img alt="Pace groups" src="/a.png" />},
      {time: "6:20 AM", title: "Check in, then pocket the phone", body: "Runners tap in at the fountain.", badge: "Phones away while running", screen: <img alt="Check-in" src="/b.png" />},
      {time: "7:15 AM", title: "Nobody left on the road", body: "Group leads mark runners back.", screen: <img alt="Finish" src="/c.png" />},
    ],
  },
};

// A track 1600px tall around a 400px scene: 1200px of travel, 400px per moment.
let trackTop = 0;
beforeEach(() => {
  trackTop = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => { callback(0); return 0; });
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.getAttribute("role") === "group" ? 400 : 1600;
  });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({top: trackTop} as DOMRect));
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const scrollTrackTo = (top: number) => {
  trackTop = top;
  act(() => { window.dispatchEvent(new Event("scroll")); });
};
const timeline = () => within(screen.getByRole("list", {name: "Moments in the evening"}));

describe("CatchNightScene", () => {
  it("is a named group with the event-type chips, the event and every moment", () => {
    render(<CatchNightScene {...props} />);
    expect(screen.getByRole("group", {name: "Sunday Social Run, moment by moment"})).toBeTruthy();
    const chips = within(screen.getByRole("radiogroup", {name: "Event type"})).getAllByRole("radio");
    expect(chips.map((chip) => chip.getAttribute("aria-checked"))).toEqual(["true", "false"]);
    expect(screen.getByText("Carter Road Runners · Carter Road, Bandra")).toBeTruthy();
    expect(timeline().getAllByRole("button")).toHaveLength(3);
  });

  it("focuses the first moment, with its badge, body and screen", () => {
    render(<CatchNightScene {...props} />);
    const first = timeline().getByRole("button", {name: /Pace groups, set before Sunday/});
    expect(first.getAttribute("aria-current")).toBe("step");
    expect(first.textContent).toContain("Grouped by pace");
    expect(first.textContent).toContain("Every booking brings a pace.");
    expect(screen.getByRole("img", {name: "Pace groups"})).toBeTruthy();
    expect(screen.queryByRole("img", {name: "Check-in"})).toBeNull();
  });

  it("moves the focus as the track scrolls past each moment's step", () => {
    render(<CatchNightScene {...props} />);
    scrollTrackTo(-500);
    const second = timeline().getByRole("button", {name: /Check in, then pocket the phone/});
    expect(second.getAttribute("aria-current")).toBe("step");
    expect(screen.getByRole("img", {name: "Check-in"})).toBeTruthy();
    expect(screen.getByText("Sunday Social Run · 6:20 AM · 2 of 3")).toBeTruthy();
    scrollTrackTo(-5000);
    expect(timeline().getByRole("button", {name: /Nobody left on the road/}).getAttribute("aria-current")).toBe("step");
  });

  it("scrolls to the middle of a moment's step when it is pressed", () => {
    render(<CatchNightScene {...props} />);
    fireEvent.click(timeline().getByRole("button", {name: /Nobody left on the road/}));
    expect(window.scrollTo).toHaveBeenCalledWith({top: 1000, behavior: "smooth"});
  });

  it("reports a picked event type and returns to the top of the track once scrolled into it (window.scrollY is 0 here)", () => {
    const onSelect = vi.fn();
    render(<CatchNightScene {...props} onSelect={onSelect} />);
    scrollTrackTo(-500);
    fireEvent.click(screen.getByRole("radio", {name: "Pickleball"}));
    expect(onSelect).toHaveBeenCalledWith(1);
    expect(window.scrollTo).toHaveBeenCalledWith({top: -500, behavior: "smooth"});
  });
});
