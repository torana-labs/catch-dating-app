import {cleanup, render} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {inertProps} from "./inert";

afterEach(cleanup);

describe("inertProps", () => {
  it("writes the inert attribute without a warning and removes it again", () => {
    const warn = vi.spyOn(console, "error");
    const {container, rerender} = render(<div {...inertProps(true)}><button type="button">Book</button></div>);
    const element = container.firstElementChild as HTMLElement;
    expect(element.hasAttribute("inert")).toBe(true);
    rerender(<div {...inertProps(false)}><button type="button">Book</button></div>);
    expect(element.hasAttribute("inert")).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });
});
