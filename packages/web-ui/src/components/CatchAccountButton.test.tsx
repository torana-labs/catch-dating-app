import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchAccountButton} from "./CatchAccountButton";

afterEach(cleanup);

describe("CatchAccountButton", () => {
  it("is a named popup button that draws the reader's initials", () => {
    const onPressed = vi.fn();
    const {rerender} = render(<CatchAccountButton label="Account, Aanya Mehta" name="Aanya Mehta" onPressed={onPressed} />);
    const button = screen.getByRole("button", {name: "Account, Aanya Mehta"});
    expect(button.getAttribute("aria-haspopup")).toBe("menu");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.querySelector("[data-initials]")?.getAttribute("data-initials")).toBe("AM");
    fireEvent.click(button);
    expect(onPressed).toHaveBeenCalledOnce();
    rerender(<CatchAccountButton expanded label="Account, Aanya Mehta" name="Aanya Mehta" onPressed={onPressed} popup="dialog" />);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
  });
});
