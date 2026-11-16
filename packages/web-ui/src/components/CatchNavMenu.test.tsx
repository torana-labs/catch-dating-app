import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchNavMenu, type CatchNavMenuLink} from "./CatchNavMenu";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const links: CatchNavMenuLink[] = [
  {href: "/one/", label: "First page", sublabel: "A sample line"},
  {href: "/two/", label: "Second page", current: true},
  {href: "/three/", label: "Third page"},
];

function renderMenu(props: Partial<Parameters<typeof CatchNavMenu>[0]> = {}) {
  return render(
    <div>
      <CatchNavMenu label="Sample group" links={links} {...props} />
      <button type="button">Elsewhere</button>
    </div>,
  );
}

const trigger = () => screen.getByRole("button", {name: "Sample group"});
const panel = () => document.getElementById(trigger().getAttribute("aria-controls") ?? "") as HTMLElement;

/** A matchMedia stand-in whose compact query answers `matches`, and can change. */
function stubMatchMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const state = {matches};
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query === "(max-width: 599px)" && state.matches;
    },
    media: query,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }));
  return (next: boolean) => {
    state.matches = next;
    act(() => listeners.forEach((listener) => listener()));
  };
}

describe("CatchNavMenu", () => {
  it("is a collapsed disclosure button that controls a hidden panel of links", () => {
    renderMenu();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(trigger().getAttribute("aria-haspopup")).toBeNull();
    expect(panel().hidden).toBe(true);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("opens and closes on a press, keeping focus on the button", () => {
    renderMenu();
    trigger().focus();
    fireEvent.click(trigger());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(panel().hidden).toBe(false);
    expect(screen.getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["First page A sample line", "/one/"],
      ["Second page", "/two/"],
      ["Third page", "/three/"],
    ]);
    expect(document.activeElement).toBe(trigger());
    fireEvent.click(trigger());
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("lists plain links, not ARIA menu items, and marks the current page", () => {
    renderMenu();
    fireEvent.click(trigger());
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.queryByRole("menuitem")).toBeNull();
    expect(screen.getByRole("list")).toBeTruthy();
    expect(screen.getByRole("link", {name: "Second page"}).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", {name: "Third page"}).getAttribute("aria-current")).toBeNull();
  });

  it("closes on Escape from the panel and returns focus to the button", () => {
    renderMenu();
    fireEvent.click(trigger());
    const link = screen.getByRole("link", {name: "Second page"});
    link.focus();
    fireEvent.keyDown(link, {key: "Escape"});
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(panel().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
  });

  it("closes on Escape from the button", () => {
    renderMenu();
    fireEvent.click(trigger());
    fireEvent.keyDown(trigger(), {key: "Escape"});
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger());
  });

  it("closes on a press outside it, but not on a press inside it", () => {
    renderMenu();
    fireEvent.click(trigger());
    fireEvent.pointerDown(screen.getByRole("link", {name: "First page A sample line"}));
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    fireEvent.pointerDown(screen.getByRole("button", {name: "Elsewhere"}));
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("closes when focus leaves it", () => {
    renderMenu();
    fireEvent.click(trigger());
    const elsewhere = screen.getByRole("button", {name: "Elsewhere"});
    fireEvent.blur(screen.getByRole("link", {name: "Third page"}), {relatedTarget: elsewhere});
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("stays open while focus moves between its own links", () => {
    renderMenu();
    fireEvent.click(trigger());
    fireEvent.blur(trigger(), {relatedTarget: screen.getByRole("link", {name: "Third page"})});
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
  });

  it("opens at the first link on Arrow Down, then moves with the arrow keys, Home and End", () => {
    renderMenu();
    trigger().focus();
    fireEvent.keyDown(trigger(), {key: "ArrowDown"});
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    const [first, second, third] = screen.getAllByRole("link");
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, {key: "ArrowDown"});
    expect(document.activeElement).toBe(second);
    fireEvent.keyDown(second, {key: "End"});
    expect(document.activeElement).toBe(third);
    fireEvent.keyDown(third, {key: "ArrowDown"});
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, {key: "ArrowUp"});
    expect(document.activeElement).toBe(third);
    fireEvent.keyDown(third, {key: "Home"});
    expect(document.activeElement).toBe(first);
  });

  it("moves to the first link on Arrow Down when it is already open", () => {
    renderMenu();
    fireEvent.click(trigger());
    trigger().focus();
    fireEvent.keyDown(trigger(), {key: "ArrowDown"});
    expect(document.activeElement).toBe(screen.getByRole("link", {name: "First page A sample line"}));
  });

  it("reports a followed link and closes", () => {
    const onLinkPressed = vi.fn();
    renderMenu({onLinkPressed});
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("link", {name: "Third page"}));
    expect(onLinkPressed).toHaveBeenCalledWith(links[2]);
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });

  it("marks the trigger as the current section and lines the panel up with an edge", () => {
    const {container} = renderMenu({align: "end", current: true});
    expect(trigger().dataset.current).toBe("true");
    expect((container.querySelector("[data-align]") as HTMLElement).dataset.align).toBe("end");
  });

  it("draws the trigger as a D20 small quiet button that reads its ground", () => {
    renderMenu();
    expect(trigger().dataset.variant).toBe("quiet");
    expect(trigger().dataset.size).toBe("sm");
    expect(trigger().dataset.on).toBe("ground");
  });

  it("renders nothing on a compact window, where the phone menu carries the links", () => {
    stubMatchMedia(true);
    renderMenu();
    expect(screen.queryByRole("button", {name: "Sample group"})).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("closes and leaves when the window narrows to compact, and returns closed", () => {
    const setCompact = stubMatchMedia(false);
    renderMenu();
    fireEvent.click(trigger());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    setCompact(true);
    expect(screen.queryByRole("button", {name: "Sample group"})).toBeNull();
    setCompact(false);
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
  });
});
