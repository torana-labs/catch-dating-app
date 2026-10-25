import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, expectTypeOf, it, vi} from "vitest";
import {CatchCheckboxInput, type CatchCheckboxInputProps} from "./CatchCheckboxInput";
afterEach(cleanup);
describe("CatchCheckboxInput", () => {
  it("keeps the exact approved API", () => {
    expectTypeOf<keyof CatchCheckboxInputProps>().toEqualTypeOf<"value" | "onChanged" | "label" | "description" | "semanticLabel">();
  });
  it("renders a native checked control with its visible label", () => {
    render(<CatchCheckboxInput value onChanged={() => {}} label="I acknowledge the venue rules" />);
    const input = screen.getByRole("checkbox", {name: "I acknowledge the venue rules"}) as HTMLInputElement;
    expect(input.type).toBe("checkbox"); expect(input.checked).toBe(true);
    expect(input.closest("label")).not.toBeNull(); expect(screen.queryByRole("switch")).toBeNull();
  });
  it("reports the next value from both the input and its label without owning state", () => {
    const change = vi.fn();
    render(<CatchCheckboxInput value={false} onChanged={change} label="I agree" />);
    fireEvent.click(screen.getByText("I agree")); expect(change).toHaveBeenLastCalledWith(true);
    const input=screen.getByRole("checkbox") as HTMLInputElement;
    expect(input.checked).toBe(false); fireEvent.click(input); expect(change).toHaveBeenCalledTimes(2);
  });
  it("reflects caller updates", () => {
    const {rerender}=render(<CatchCheckboxInput value={false} onChanged={() => {}} label="Checklist" />);
    rerender(<CatchCheckboxInput value onChanged={() => {}} label="Checklist" />);
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
  });
  for(const value of [false,true]) it(`retains value=${value} while disabled`,()=>{
    render(<CatchCheckboxInput value={value} onChanged={null} label="Locked" />);
    const input=screen.getByRole("checkbox") as HTMLInputElement;
    expect(input.disabled).toBe(true); expect(input.checked).toBe(value); fireEvent.click(input);
    expect(input.checked).toBe(value);
  });
  it("keeps a semantic override separate from visible copy and associates its description",()=>{
    render(<CatchCheckboxInput value={false} onChanged={()=>{}} label="Agree" semanticLabel="Acknowledge venue rules" description="This applies to everyone in the booking." />);
    const input=screen.getByRole("checkbox",{name:"Acknowledge venue rules"});
    expect(screen.getByText("Agree")).toBeDefined();
    expect(document.getElementById(input.getAttribute("aria-describedby")!)?.textContent).toBe("This applies to everyone in the booking.");
  });
  it("does not create a dangling description reference or duplicate ids",()=>{
    render(<><CatchCheckboxInput value={false} onChanged={()=>{}} label="One" /><CatchCheckboxInput value onChanged={()=>{}} label="Two" description="Details" /><CatchCheckboxInput value onChanged={()=>{}} label="Three" description="More details" /></>);
    const [one,two,three]=screen.getAllByRole("checkbox");
    expect(one.hasAttribute("aria-describedby")).toBe(false);
    expect(two.getAttribute("aria-describedby")).not.toBe(three.getAttribute("aria-describedby"));
  });
});
