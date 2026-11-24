import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {scrolledPercent, startEngagementTracking, type EngagementEvent} from "./engagement";

type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;
let observerCallback: ObserverCallback | null = null;

function setPage(scrollY: number, viewport: number, height: number) {
  Object.defineProperty(window, "scrollY", {configurable: true, value: scrollY});
  Object.defineProperty(window, "innerHeight", {configurable: true, value: viewport});
  Object.defineProperty(document.documentElement, "scrollHeight", {configurable: true, value: height});
}

beforeEach(() => {
  observerCallback = null;
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: ObserverCallback) { observerCallback = callback; }
    observe() { /* Sections are reported by the test. */ }
    disconnect() { observerCallback = null; }
  });
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    // Run at once; returning 0 means no frame stays pending.
    callback(0);
    return 0;
  });
  document.body.innerHTML = `<main><section id="hero"></section><section id="compare"></section><section id="Bad Id"></section></main>`;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("scroll depth", () => {
  it("measures the share of the page seen", () => {
    expect(scrolledPercent(0, 800, 4000)).toBe(20);
    expect(scrolledPercent(1200, 800, 4000)).toBe(50);
    expect(scrolledPercent(0, 800, 600)).toBe(100);
    expect(scrolledPercent(0, 0, 0)).toBe(0);
  });

  it("reports 25, 50, 75 and 90% once each per visit", () => {
    const sent: EngagementEvent[] = [];
    setPage(0, 1000, 4000);
    const stop = startEngagementTracking((event) => sent.push(event));
    for (const y of [1000, 1500, 1000, 2100, 3000, 3000]) {
      setPage(y, 1000, 4000);
      window.dispatchEvent(new Event("scroll"));
    }
    stop();
    expect(sent.filter((event) => event.name === "scroll_depth").map((event) => event.parameters)).toEqual([
      {percent_scrolled: 25}, {percent_scrolled: 50}, {percent_scrolled: 75}, {percent_scrolled: 90},
    ]);
  });

  it("reports no depth for a page that fits the screen", () => {
    const sent: EngagementEvent[] = [];
    setPage(0, 1000, 900);
    startEngagementTracking((event) => sent.push(event))();
    expect(sent).toEqual([]);
  });
});

describe("section reading time", () => {
  it("adds up each named section's visible time and reports it when the visit ends", () => {
    let now = 0;
    const sent: EngagementEvent[] = [];
    setPage(0, 1000, 900);
    const stop = startEngagementTracking((event) => sent.push(event), () => now);
    const [hero, compare] = Array.from(document.querySelectorAll("section"));
    const seen = (target: Element, visible: boolean) => ({target, isIntersecting: visible, intersectionRatio: visible ? 0.8 : 0,
      intersectionRect: {height: visible ? 600 : 0} as DOMRectReadOnly, rootBounds: {height: 1000} as DOMRectReadOnly});
    observerCallback?.([seen(hero, true)]);
    now = 5_000;
    observerCallback?.([seen(hero, false), seen(compare, true)]);
    now = 6_000;
    observerCallback?.([seen(compare, false), seen(hero, true)]);
    now = 9_000;
    stop();
    expect(sent).toEqual([{name: "section_read", parameters: {section_id: "hero", engaged_seconds: 8}}]);
  });

  it("counts only time the tab is visible", () => {
    let now = 0;
    const sent: EngagementEvent[] = [];
    setPage(0, 1000, 900);
    const stop = startEngagementTracking((event) => sent.push(event), () => now);
    const hero = document.querySelector("section")!;
    observerCallback?.([{target: hero, isIntersecting: true, intersectionRatio: 1,
      intersectionRect: {height: 500} as DOMRectReadOnly, rootBounds: {height: 1000} as DOMRectReadOnly}]);
    now = 3_000;
    Object.defineProperty(document, "hidden", {configurable: true, value: true});
    document.dispatchEvent(new Event("visibilitychange"));
    now = 60_000;
    Object.defineProperty(document, "hidden", {configurable: true, value: false});
    stop();
    expect(sent).toEqual([{name: "section_read", parameters: {section_id: "hero", engaged_seconds: 3}}]);
  });
});
