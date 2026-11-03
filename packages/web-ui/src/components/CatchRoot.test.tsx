import {act, cleanup, render, screen} from "@testing-library/react";
import {renderToString} from "react-dom/server";
import {afterEach, describe, expect, it, vi} from "vitest";
import {useCatch} from "./catchRootContext";
import {CatchRoot} from "./CatchRoot";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Writes the context it reads, so a test can see what a component inside would get. */
function Probe() {
  const {theme, register, sizeClass, ground, format, reducedMotion} = useCatch();
  return <output data-testid="probe">{[theme, register, sizeClass, ground, format ?? "-", String(reducedMotion)].join(" ")}</output>;
}

describe("CatchRoot", () => {
  it("defaults to a day, app, compact root on the ground, with the sheet's light theme", () => {
    render(<CatchRoot><Probe /></CatchRoot>);
    const root = screen.getByTestId("probe").parentElement!;
    expect(root.tagName).toBe("DIV");
    expect(root.dataset).toMatchObject({catchTheme: "light", register: "app", size: "compact"});
    expect(root.hasAttribute("data-format")).toBe(false);
    expect(screen.getByTestId("probe").textContent).toBe("day app compact ground - false");
  });

  it("maps night to the sheet's dark theme and the night ground", () => {
    render(<CatchRoot format="nightsOut" register="quiet" size="expanded" theme="night"><Probe /></CatchRoot>);
    const root = screen.getByTestId("probe").parentElement!;
    expect(root.dataset).toMatchObject({catchTheme: "dark", format: "nightsOut", register: "quiet", size: "expanded"});
    expect(screen.getByTestId("probe").textContent).toBe("night quiet expanded night nightsOut false");
  });

  it("passes className and style through", () => {
    render(<CatchRoot className="page" style={{minHeight: 10}}><Probe /></CatchRoot>);
    const root = screen.getByTestId("probe").parentElement!;
    expect(root.className).toContain("page");
    expect(root.style.minHeight).toBe("10px");
  });

  it("renders compact on the server and in the first client render when it measures itself", () => {
    const html = renderToString(<CatchRoot><Probe /></CatchRoot>);
    expect(html).toContain('data-size="compact"');
    expect(html).toContain("day app compact ground - false");
  });

  it("measures its own width when size is auto", () => {
    const observed: Element[] = [];
    vi.stubGlobal("ResizeObserver", class {
      observe(element: Element) { observed.push(element); }
      disconnect() {}
    });
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({width: 900} as DOMRect);
    render(<CatchRoot><Probe /></CatchRoot>);
    expect(screen.getByTestId("probe").textContent).toBe("day app expanded ground - false");
    expect(observed).toEqual([screen.getByTestId("probe").parentElement]);
    rect.mockReturnValue({width: 700} as DOMRect);
    render(<CatchRoot><Probe /></CatchRoot>);
    expect(screen.getAllByTestId("probe")[1].textContent).toBe("day app medium ground - false");
  });

  it("keeps a given size without measuring", () => {
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect");
    render(<CatchRoot size="medium"><Probe /></CatchRoot>);
    expect(screen.getByTestId("probe").textContent).toBe("day app medium ground - false");
    expect(rect).not.toHaveBeenCalled();
  });

  it("reads reduced motion from the media query", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(<CatchRoot><Probe /></CatchRoot>);
    expect(screen.getByTestId("probe").textContent).toBe("day app compact ground - true");
  });

  it("follows the colour scheme by default: day on the server, then the person's preference and its changes", () => {
    expect(renderToString(<CatchRoot><Probe /></CatchRoot>)).toContain('data-catch-theme="light"');
    const listeners: Array<() => void> = [];
    const scheme = {matches: true};
    vi.stubGlobal("matchMedia", (query: string) => ({
      get matches() { return query === "(prefers-color-scheme: dark)" && scheme.matches; },
      addEventListener: (_type: string, listener: () => void) => { if (query === "(prefers-color-scheme: dark)") listeners.push(listener); },
      removeEventListener: () => {},
    }));
    render(<CatchRoot><Probe /></CatchRoot>);
    const root = screen.getByTestId("probe").parentElement!;
    expect(root.dataset.catchTheme).toBe("dark");
    expect(screen.getByTestId("probe").textContent).toBe("night app compact night - false");
    scheme.matches = false;
    act(() => listeners.forEach((listener) => listener()));
    expect(root.dataset.catchTheme).toBe("light");
    expect(screen.getByTestId("probe").textContent).toBe("day app compact ground - false");
  });

  it("forces day or night whatever the colour scheme", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-color-scheme: dark)",
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(<><CatchRoot theme="day"><Probe /></CatchRoot><CatchRoot theme="night"><Probe /></CatchRoot></>);
    const [day, night] = screen.getAllByTestId("probe");
    expect(day.parentElement!.dataset.catchTheme).toBe("light");
    expect(night.parentElement!.dataset.catchTheme).toBe("dark");
  });

  it("gives the defaults outside any root", () => {
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("day app compact ground - false");
  });
});
