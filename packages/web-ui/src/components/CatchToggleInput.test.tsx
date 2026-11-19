import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, expectTypeOf, it, vi} from "vitest";
import {CatchToggleInput, type CatchToggleInputProps} from "./CatchToggleInput";
afterEach(cleanup);
describe("CatchToggleInput", () => {
  it("retains the native settings API and typed field recipe", () => {
    // Flutter's four, plus two web-only attributes a visible label needs (CatchField's toggle recipe).
    expectTypeOf<keyof CatchToggleInputProps>().toEqualTypeOf<"value" | "onChanged" | "semanticLabel" | "recipe" | "id" | "describedBy">();
    render(<CatchToggleInput value={false} onChanged={() => {}} semanticLabel="Show attendance reminders" />);
    const control = screen.getByRole("switch", {name: "Show attendance reminders"});
    expect(control.getAttribute("aria-checked")).toBe("false");
    expect(control.getAttribute("data-recipe")).toBe("toggle");
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
  for (const recipe of ["toggle", "field"] as const) {
    it(`reports the inverse value without owning state for ${recipe}`, () => {
      const change = vi.fn();
      const {rerender} = render(<CatchToggleInput recipe={recipe} value={false} onChanged={change} semanticLabel="Reminders" />);
      const control = screen.getByRole("switch");
      fireEvent.click(control); expect(change).toHaveBeenLastCalledWith(true);
      expect(control.getAttribute("aria-checked")).toBe("false");
      rerender(<CatchToggleInput recipe={recipe} value onChanged={change} semanticLabel="Reminders" />);
      fireEvent.click(control); expect(change).toHaveBeenLastCalledWith(false);
    });
    for (const value of [false, true]) it(`retains disabled ${recipe} value=${value}`, () => {
      render(<CatchToggleInput recipe={recipe} value={value} onChanged={null} semanticLabel="Locked setting" />);
      const control = screen.getByRole("switch") as HTMLButtonElement;
      expect(control.disabled).toBe(true); expect(control.getAttribute("aria-checked")).toBe(String(value));
      fireEvent.click(control); expect(control.getAttribute("aria-checked")).toBe(String(value));
    });
  }
  it("takes its name from a label and its description from the given ids", () => {
    render(<><label htmlFor="sample-switch">Show reminders</label><p id="sample-body">Before each plan</p>
      <CatchToggleInput describedBy="sample-body" id="sample-switch" onChanged={() => {}} value={false} /></>);
    const control = screen.getByRole("switch", {name: "Show reminders"});
    expect(control.getAttribute("aria-describedby")).toBe("sample-body");
  });
  it("does not submit a form when activated", () => {
    const change = vi.fn(), submit = vi.fn((event) => event.preventDefault());
    render(<form onSubmit={submit}><CatchToggleInput value={false} onChanged={change} semanticLabel="Reminders" /></form>);
    fireEvent.click(screen.getByRole("switch")); expect(change).toHaveBeenCalledOnce(); expect(submit).not.toHaveBeenCalled();
  });
});
