import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {CatchStickyAside} from "./CatchStickyAside";

afterEach(cleanup);

const observed = new Set<() => void>();
const resize = () => observed.forEach((callback) => callback());
let probeWidth = 0;

beforeAll(() => {
  // jsdom runs no container queries: the probe's width stands in for one.
  globalThis.ResizeObserver = class {
    constructor(private readonly callback: () => void) {}
    observe() {
      observed.add(this.callback);
    }
    disconnect() {
      observed.delete(this.callback);
    }
  } as unknown as typeof ResizeObserver;
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({width: probeWidth}) as DOMRect);
});

const aside = () => (
  <CatchStickyAside closeLabel="Close" dock={<span>₹299</span>} label="Booking" openLabel="Book" sheetTitle="Book your place">
    <button type="button">Book 1 place</button>
  </CatchStickyAside>
);

describe("CatchStickyAside", () => {
  it("is a named aside on a wide page", () => {
    probeWidth = 0;
    render(aside());
    expect(screen.getByRole("complementary", {name: "Booking"}).textContent).toBe("Book 1 place");
    expect(screen.queryByRole("button", {name: "Book"})).toBeNull();
  });

  it("docks a summary and opens its content in a sheet on a narrow page", () => {
    probeWidth = 1;
    const {container} = render(aside());
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(container.querySelector("[data-catch-sticky-dock]")!.textContent).toBe("₹299Book");
    fireEvent.click(screen.getByRole("button", {name: "Book"}));
    expect(container.querySelector("dialog")!.open).toBe(true);
    probeWidth = 0;
    act(() => resize());
    expect(screen.getByRole("complementary", {name: "Booking"})).toBeTruthy();
  });

  it("sets the docked bar's measured height on the page while it docks", () => {
    const root = document.documentElement.style;
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(75);
    probeWidth = 1;
    render(aside());
    expect(root.getPropertyValue("--catch-sticky-aside-dock-height")).toBe("75px");
    probeWidth = 0;
    act(() => resize());
    expect(root.getPropertyValue("--catch-sticky-aside-dock-height")).toBe("");
  });

  it("keeps the page end and keyboard focus clear of the docked bar", () => {
    // jsdom lays nothing out, so this reads the clearance from the stylesheet.
    const css = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "CatchStickyAside.module.css"), "utf8");
    expect(css).toMatch(/:global\(html\):has\(\.dock\) \{[^}]*scroll-padding-bottom: calc\(var\(--catch-sticky-aside-dock-height\) \+ var\(--catch-space-s3\)\);/u);
    expect(css).toMatch(/:global\(body\):has\(\.dock\) \{\s*padding-bottom: var\(--catch-sticky-aside-dock-height\);/u);
  });
});
