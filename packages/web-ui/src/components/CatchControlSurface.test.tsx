import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchControlSurface} from "./CatchControlSurface";

afterEach(cleanup);

describe("CatchControlSurface", () => {
  it("keeps a passive shell and its nested field independently interactive", () => {
    const changed = vi.fn();
    render(<CatchControlSurface enabled={false}
      child={<input aria-label="Search" onChange={changed} />} />);
    const input = screen.getByLabelText("Search") as HTMLInputElement;
    expect(input.parentElement?.tagName).toBe("DIV");
    expect(input.disabled).toBe(false);
    fireEvent.change(input, {target: {value: "run"}});
    expect(changed).toHaveBeenCalledOnce();
  });

  it("uses native button behavior and invokes the enabled callback once", () => {
    const action = vi.fn();
    render(<CatchControlSurface onTap={action} child="Choose city" />);
    const button = screen.getByRole("button", {name: "Choose city"}) as HTMLButtonElement;
    expect(button.type).toBe("button");
    fireEvent.click(button);
    expect(action).toHaveBeenCalledOnce();
  });

  it("blocks disabled click, Enter, Space and focus", () => {
    const action = vi.fn();
    render(<CatchControlSurface enabled={false} onTap={action} status="focused" child="Choose city" />);
    const button = screen.getByRole("button", {name: "Choose city"}) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    fireEvent.keyDown(button, {key: "Enter"});
    fireEvent.keyDown(button, {key: " "});
    button.focus();
    expect(document.activeElement).not.toBe(button);
    expect(action).not.toHaveBeenCalled();
  });

  it("retains explicit button semantics without a shell callback", () => {
    render(<CatchControlSurface semanticButton enabled={false} child="Unavailable" />);
    expect((screen.getByRole("button", {name: "Unavailable"}) as HTMLButtonElement).disabled).toBe(true);
  });

});
