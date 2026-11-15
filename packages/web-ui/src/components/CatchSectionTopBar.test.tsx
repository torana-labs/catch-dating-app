import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {CatchSectionTopBar} from "./CatchSectionTopBar";

/** A hand-driven IntersectionObserver: each test says what is in view. */
class FakeObserver {
  static all: FakeObserver[] = [];
  readonly targets: Element[] = [];
  constructor(readonly callback: IntersectionObserverCallback) { FakeObserver.all.push(this); }
  observe(target: Element) { this.targets.push(target); }
  unobserve() {}
  disconnect() {}
  fire(target: Element, isIntersecting: boolean, top = 0) {
    this.callback([{target, isIntersecting, boundingClientRect: {top} as DOMRectReadOnly} as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

const sections = [{id: "night", label: "On the night"}, {id: "pricing", label: "Pricing"}];
const page = () => (
  <>
    <CatchSectionTopBar action={<a href="#start">Start free trial</a>} label="On this page" sections={sections} />
    <section id="night">Night</section>
    <section id="pricing">Pricing</section>
  </>
);
const markerObserver = () => FakeObserver.all.find((observer) => observer.targets.some((target) => target.tagName === "SPAN"))!;
const sectionObserver = () => FakeObserver.all.find((observer) => observer.targets.some((target) => target.id === "night"))!;

beforeEach(() => {
  FakeObserver.all = [];
  vi.stubGlobal("IntersectionObserver", FakeObserver);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CatchSectionTopBar", () => {
  it("names the bar and links each section to its place on the page, with the action", () => {
    render(page());
    const nav = screen.getByRole("navigation", {name: "On this page", hidden: true});
    expect([...nav.querySelectorAll("a[href^='#']")].map((link) => link.getAttribute("href"))).toEqual(["#night", "#pricing", "#start"]);
    expect(screen.getByRole("link", {name: "Start free trial", hidden: true})).toBeTruthy();
  });

  it("stays hidden while the site top bar is on screen and shows once it has scrolled away", () => {
    render(page());
    const nav = screen.getByRole("navigation", {name: "On this page", hidden: true});
    const marker = markerObserver().targets[0];
    expect(nav.hasAttribute("data-shown")).toBe(false);
    act(() => markerObserver().fire(marker, false, -40));
    expect(nav.hasAttribute("data-shown")).toBe(true);
    act(() => markerObserver().fire(marker, true, 64));
    expect(nav.hasAttribute("data-shown")).toBe(false);
  });

  it("marks the section in view", () => {
    render(page());
    act(() => sectionObserver().fire(document.getElementById("pricing")!, true));
    const pricing = screen.getByRole("link", {name: "Pricing", hidden: true});
    expect(pricing.getAttribute("aria-current")).toBe("location");
    expect(screen.getByRole("link", {name: "On the night", hidden: true}).getAttribute("aria-current")).toBeNull();
  });

  it("scrolls a chosen section to just under the bar and records it in the address", () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    render(page());
    fireEvent.click(screen.getByRole("link", {name: "Pricing", hidden: true}));
    expect(scrollTo).toHaveBeenCalledOnce();
    expect(window.location.hash).toBe("#pricing");
    expect(screen.getByRole("link", {name: "Pricing", hidden: true}).getAttribute("aria-current")).toBe("location");
  });

  it("stays hidden where the browser cannot observe scrolling", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(page());
    expect(screen.getByRole("navigation", {name: "On this page", hidden: true}).hasAttribute("data-shown")).toBe(false);
  });
});
