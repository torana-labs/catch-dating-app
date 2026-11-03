import {cleanup, render, screen} from "@testing-library/react";
import {renderToString} from "react-dom/server";
import {afterEach, describe, expect, it, vi} from "vitest";
import {useCatch} from "./catchRootContext";
import {CatchGroundProvider, CatchRoot} from "./CatchRoot";

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

  it("gives the defaults outside any root", () => {
    render(<Probe />);
    expect(screen.getByTestId("probe").textContent).toBe("day app compact ground - false");
  });
});

describe("CatchGroundProvider", () => {
  it("re-provides the ground and keeps the parent's theme and format", () => {
    render(<CatchRoot format="run" size="medium"><CatchGroundProvider ground="tile"><Probe /></CatchGroundProvider></CatchRoot>);
    const wrapper = screen.getByTestId("probe").parentElement!;
    expect(screen.getByTestId("probe").textContent).toBe("day app medium tile run false");
    expect(wrapper.dataset).toMatchObject({ground: "tile", format: "run"});
    expect(wrapper.hasAttribute("data-catch-theme")).toBe(false);
  });

  it("flips the theme attribute beneath it when the theme changes", () => {
    render(<CatchRoot><CatchGroundProvider format="games" ground="night" theme="night"><Probe /></CatchGroundProvider></CatchRoot>);
    const wrapper = screen.getByTestId("probe").parentElement!;
    expect(wrapper.dataset).toMatchObject({catchTheme: "dark", ground: "night", format: "games"});
    expect(screen.getByTestId("probe").textContent).toBe("night app compact night games false");
  });
});
