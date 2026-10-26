import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchCodeInput} from "./CatchCodeInput";

afterEach(cleanup);

const base = {onChanged: () => undefined, onSubmitted: () => undefined, semanticsLabel: "6-digit code"};
const cells = (container: HTMLElement) => [...container.querySelectorAll("[aria-hidden='true'] > span")] as HTMLElement[];

describe("CatchCodeInput", () => {
  it("is one named one-time-code field over six cells with the first active", () => {
    const {container} = render(<CatchCodeInput {...base} />);
    const input = screen.getByRole("textbox", {name: "6-digit code"}) as HTMLInputElement;
    expect(input.autocomplete).toBe("one-time-code");
    expect(input.inputMode).toBe("numeric");
    expect(input.maxLength).toBe(6);
    expect(cells(container)).toHaveLength(6);
    expect(cells(container).map((cell) => cell.dataset.active)).toEqual(["true", undefined, undefined, undefined, undefined, undefined]);
  });

  it("keeps digits only, fills cells and reports each change", () => {
    const changed = vi.fn();
    const {container} = render(<CatchCodeInput {...base} onChanged={changed} />);
    fireEvent.change(screen.getByRole("textbox"), {target: {value: "4a8 2"}});
    expect(changed).toHaveBeenLastCalledWith("482");
    expect(cells(container).map((cell) => cell.textContent)).toEqual(["4", "8", "2", "", "", ""]);
    expect(cells(container)[3].dataset.active).toBe("true");
  });

  it("takes its exact length from the contract and has no active cell when complete", () => {
    const {container} = render(<CatchCodeInput {...base} contract={{maxLength: 4, minLength: 4, path: "otp.code"}} length={6} value="123456" />);
    expect(cells(container)).toHaveLength(4);
    expect(cells(container).map((cell) => cell.textContent).join("")).toBe("1234");
    expect(cells(container).some((cell) => cell.dataset.active)).toBe(false);
  });

  it("submits on Enter and marks an error", () => {
    const submitted = vi.fn();
    const {container} = render(<CatchCodeInput {...base} onSubmitted={submitted} status="error" value="482913" />);
    fireEvent.keyDown(screen.getByRole("textbox"), {key: "Enter"});
    expect(submitted).toHaveBeenCalledWith("482913");
    expect(screen.getByRole("textbox").getAttribute("aria-invalid")).toBe("true");
    expect((container.firstElementChild as HTMLElement).dataset.status).toBe("error");
  });

  it("omits the caret when asked and applies custom geometry", () => {
    const {container} = render(<CatchCodeInput {...base} caret={false} gap={6} height={48} />);
    expect(container.querySelector("[aria-hidden='true'] span span")).toBeNull();
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--catch-code-height")).toBe("48px");
    expect(root.style.getPropertyValue("--catch-code-gap")).toBe("6px");
  });
});
