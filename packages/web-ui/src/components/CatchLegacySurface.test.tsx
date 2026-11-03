import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, expectTypeOf, it, vi} from "vitest";
import {CatchSurface, type CatchSurfaceProps} from "./CatchSurface";
afterEach(cleanup);
describe("CatchSurface", () => {
  it("keeps default containment passive and preserves the child", () => {
    render(<CatchSurface child={<p>Candidate details</p>} />);
    const surface = screen.getByText("Candidate details").parentElement!;
    expect(surface.tagName).toBe("DIV"); expect(surface.dataset.recipe).toBe("surface");
    expect(surface.dataset.tone).toBe("surface"); expect(surface.dataset.emphasis).toBe("flat");
    expect(screen.queryByRole("button")).toBeNull();
  });
  for (const tone of ["surface", "raised", "primarySoft", "transparent"] as const) {
    it(`retains the ${tone} tone independently of prominence`, () => {
      render(<CatchSurface tone={tone} emphasis="floating" child="Panel" />);
      const surface = screen.getByText("Panel");
      expect(surface.dataset.tone).toBe(tone); expect(surface.dataset.emphasis).toBe("floating");
    });
  }
  it("keeps card and tinted constructor defaults", () => {
    render(<><CatchSurface recipe="card" tone="raised" child="Card" /><CatchSurface recipe="tinted" child="Private" /></>);
    expect(screen.getByText("Card").dataset.emphasis).toBe("subtle");
    expect(screen.getByText("Card").dataset.tone).toBe("raised");
    expect(screen.getByText("Private").dataset.emphasis).toBe("flat");
    expect(screen.getByText("Private").dataset.tone).toBe("primarySoft");
  });
  it("uses one native button action without submitting a surrounding form", () => {
    const tap = vi.fn(), submit = vi.fn((e) => e.preventDefault());
    render(<form onSubmit={submit}><CatchSurface onTap={tap} child="View candidate" /></form>);
    const control = screen.getByRole("button", {name: "View candidate"});
    expect(control.getAttribute("type")).toBe("button");
    fireEvent.click(control); expect(tap).toHaveBeenCalledOnce(); expect(submit).not.toHaveBeenCalled();
  });
  it("reports focus only for the tappable surface", () => {
    const focus = vi.fn();
    render(<CatchSurface recipe="card" onTap={() => {}} onFocusChange={focus} child="Open" />);
    fireEvent.focus(screen.getByRole("button")); fireEvent.blur(screen.getByRole("button"));
    expect(focus.mock.calls).toEqual([[true], [false]]);
  });
  it("changes between passive and tappable semantics when its callback changes", () => {
    const {rerender} = render(<CatchSurface onTap={() => {}} child="Details" />);
    expect(screen.getByRole("button")).toBeDefined();
    rerender(<CatchSurface child="Details" />);
    expect(screen.queryByRole("button")).toBeNull(); expect(screen.getByText("Details").tagName).toBe("DIV");
  });
  it("does not expose raw geometry, styling or alternate content props", () => {
    expectTypeOf<Extract<CatchSurfaceProps, {recipe: "tinted"}>>().toMatchTypeOf<{recipe: "tinted"; child: React.ReactNode}>();
    expectTypeOf<"padding" | "radius" | "borderRole" | "borderSpec" | "className" | "style" | "children">().extract<keyof CatchSurfaceProps>().toEqualTypeOf<never>();
  });
});
