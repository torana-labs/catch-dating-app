import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {CatchStickyAside} from "./CatchStickyAside";

afterEach(cleanup);

let resize: (() => void) | undefined;
let probeWidth = 0;

beforeAll(() => {
  // jsdom runs no container queries: the probe's width stands in for one.
  globalThis.ResizeObserver = class {
    constructor(callback: () => void) {
      resize = callback;
    }
    observe() {}
    disconnect() {}
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
    act(() => resize?.());
    expect(screen.getByRole("complementary", {name: "Booking"})).toBeTruthy();
  });
});
