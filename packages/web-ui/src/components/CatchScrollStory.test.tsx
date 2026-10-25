import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {CatchScrollStory, type CatchScrollStoryChapter} from "./CatchScrollStory";

const chapters: CatchScrollStoryChapter[] = ["Know your runners", "Check in", "Invite them back"].map((title, index) => ({
  content: <h3>{title}</h3>,
  id: title,
  marker: `${6 + index}:00 AM`,
  media: <img alt={`Screen: ${title}`} src="screen.png" />,
  title,
}));

const labels = {label: "A Sunday run", nextLabel: "Next moment", previousLabel: "Previous moment"};

let observed: Element[] = [];
let notify: (entries: Partial<IntersectionObserverEntry>[]) => void = () => undefined;

beforeEach(() => {
  observed = [];
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: (entries: Partial<IntersectionObserverEntry>[]) => void, readonly options: IntersectionObserverInit) {
      notify = callback;
    }
    observe(element: Element) { observed.push(element); }
    disconnect() { observed = []; }
  });
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CatchScrollStory", () => {
  it("starts on the first chapter with only its media exposed", () => {
    render(<CatchScrollStory {...labels} chapters={chapters} />);
    expect(screen.getByRole("region", {name: "A Sunday run"}).dataset.mediaSide).toBe("end");
    expect(screen.getByText("01 / 03 · 6:00 AM")).toBeTruthy();
    expect(screen.getByRole("img", {name: "Screen: Know your runners"})).toBeTruthy();
    expect(screen.queryByRole("img", {name: "Screen: Check in"})).toBeNull();
    expect(screen.getByRole("listitem", {current: "step"}).textContent).toBe("Know your runners");
    expect((screen.getByRole("button", {name: "Previous moment"}) as HTMLButtonElement).disabled).toBe(true);
  });

  it("steps with the arrows and scrolls the chapter into view", () => {
    render(<CatchScrollStory {...labels} chapters={chapters} />);
    fireEvent.click(screen.getByRole("button", {name: "Next moment"}));
    expect(screen.getByText("02 / 03 · 7:00 AM")).toBeTruthy();
    expect(screen.getByRole("img", {name: "Screen: Check in"})).toBeTruthy();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({behavior: "smooth", block: "center"});
    fireEvent.click(screen.getByRole("button", {name: "Next moment"}));
    expect((screen.getByRole("button", {name: "Next moment"}) as HTMLButtonElement).disabled).toBe(true);
  });

  it("activates the chapter crossing the middle of the viewport", () => {
    render(<CatchScrollStory {...labels} chapters={chapters} />);
    expect(observed).toHaveLength(3);
    act(() => notify([{isIntersecting: true, target: observed[2]}]));
    expect(screen.getByRole("listitem", {current: "step"}).textContent).toBe("Invite them back");
  });

  it("reports changes and follows a controlled index", () => {
    const change = vi.fn();
    const {rerender} = render(<CatchScrollStory {...labels} activeIndex={1} chapters={chapters} onActiveIndexChange={change} />);
    fireEvent.click(screen.getByRole("button", {name: "Previous moment"}));
    expect(change).toHaveBeenCalledWith(0);
    expect(screen.getByText("02 / 03 · 7:00 AM")).toBeTruthy();
    rerender(<CatchScrollStory {...labels} activeIndex={0} chapters={chapters} onActiveIndexChange={change} />);
    expect(screen.getByText("01 / 03 · 6:00 AM")).toBeTruthy();
  });

  it("renders nothing without chapters", () => {
    const {container} = render(<CatchScrollStory {...labels} chapters={[]} />);
    expect(container.childElementCount).toBe(0);
  });
});
