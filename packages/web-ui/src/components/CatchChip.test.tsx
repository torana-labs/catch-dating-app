import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchChip, type CatchChipData} from "./CatchChip";
const data: CatchChipData = {label: "Pickleball", icon: <svg aria-hidden="true" />, accent: "pickleball"};
afterEach(cleanup);
describe("CatchChip constructor semantics", () => {
  it("keeps tags passive and keeps their visible label", () => {
    render(<CatchChip recipe="tag" label="Tonight" />);
    expect(screen.getByText("Tonight")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("reports the inverse selectable value without taking ownership of selection", () => {
    const changed = vi.fn();
    const {rerender} = render(<CatchChip recipe="selectable" label="Nearby" selected={false} onChanged={changed} />);
    fireEvent.click(screen.getByRole("button", {name: "Nearby"}));
    expect(changed).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("false");
    rerender(<CatchChip recipe="selectable" label="Nearby" selected onChanged={changed} />);
    fireEvent.click(screen.getByRole("button"));
    expect(changed).toHaveBeenLastCalledWith(false);
  });
  for (const [mode, role] of [["single", "radio"], ["multiple", "checkbox"]] as const) {
    it(`keeps ${mode} choices checked rather than independent pressed buttons`, () => {
      const pressed = vi.fn();
      render(<CatchChip recipe="choice" label="Dinner" mode={mode} selected onPressed={pressed} />);
      const control = screen.getByRole(role, {name: "Dinner"});
      expect(control.getAttribute("aria-checked")).toBe("true");
      expect(control.hasAttribute("aria-pressed")).toBe(false);
      fireEvent.click(control); expect(pressed).toHaveBeenCalledOnce();
    });
  }
  it("disables a choice with a null action while retaining checked semantics", () => {
    render(<CatchChip recipe="choice" label="Dinner" mode="multiple" selected onPressed={null} />);
    const control = screen.getByRole("checkbox") as HTMLButtonElement;
    expect(control.disabled).toBe(true); expect(control.getAttribute("aria-checked")).toBe("true");
  });
  it("makes the entire removable chip one action and does not submit its form", () => {
    const remove = vi.fn(); const submit = vi.fn((e) => e.preventDefault());
    render(<form onSubmit={submit}><CatchChip recipe="removable" label="Rooftop" onRemove={remove} /></form>);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", {name: "Delete: Rooftop"}));
    expect(remove).toHaveBeenCalledOnce(); expect(submit).not.toHaveBeenCalled();
  });
  it("does not activate disabled selectable, removal or activity actions", () => {
    const action = vi.fn();
    render(<><CatchChip recipe="selectable" label="Choice" selected={false} enabled={false} onChanged={action} />
      <CatchChip recipe="removable" label="Place" enabled={false} onRemove={action} />
      <CatchChip recipe="activity" data={data} enabled={false} onTap={action} /></>);
    for (const button of screen.getAllByRole("button")) {
      expect((button as HTMLButtonElement).disabled).toBe(true); fireEvent.click(button);
    }
    expect(action).not.toHaveBeenCalled();
  });
  it("keeps activity identity passive until a callback exists and accepts a label override", () => {
    const {rerender} = render(<CatchChip recipe="activity" data={data} label="Saturday pickleball" />);
    expect(screen.getByText("Saturday pickleball")).toBeDefined(); expect(screen.queryByRole("button")).toBeNull();
    const tap = vi.fn(); rerender(<CatchChip recipe="activity" data={data} onTap={tap} />);
    fireEvent.click(screen.getByRole("button", {name: "Pickleball"})); expect(tap).toHaveBeenCalledOnce();
  });
  it("uses resolved semantic copy without dropping visible text", () => {
    render(<CatchChip recipe="removable" label="Rooftop" semanticsLabel="Remove rooftop preference" onRemove={() => {}} />);
    expect(screen.getByRole("button", {name: "Remove rooftop preference"})).toBeDefined();
    expect(screen.getByText("Rooftop")).toBeDefined();
  });
  it("exposes a passive semantic override as alternative text", () => {
    render(<CatchChip recipe="tag" label="5 km" semanticsLabel="Five kilometres" />);
    expect(screen.getByText("Five kilometres")).toBeDefined();
    expect(screen.getByText("5 km").closest('[aria-hidden="true"]')).not.toBeNull();
  });
  it("rejects raw CSS strings in the named activity slot", () => {
    expect(() => CatchChip({recipe: "activity", data: {...data, accent: "#ff0000" as never}})).toThrow("activity token");
  });
});
