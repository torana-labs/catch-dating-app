import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchSearchField, type CatchSearchFieldCopy} from "./CatchSearchField";

const copy: CatchSearchFieldCopy = {
  searchLabel: "Search organizers",
  clearTooltip: (placeholder) => `Clear ${placeholder}`,
  closeSearchLabel: "Close search",
};
afterEach(cleanup);

describe("CatchSearchField query ownership", () => {
  it("uses caller-resolved copy and reports typing without submitting the form", () => {
    const changed = vi.fn();
    render(<CatchSearchField copy={copy} onChanged={changed} />);
    const input = screen.getByRole("searchbox", {name: copy.searchLabel}) as HTMLInputElement;
    expect(input.placeholder).toBe(copy.searchLabel);
    fireEvent.change(input, {target: {value: "Yamuna"}});
    expect(input.value).toBe("Yamuna");
    expect(changed).toHaveBeenCalledWith("Yamuna");
  });
  it("clears using the resolved override, retains focus, and never closes fixed fields", () => {
    const changed = vi.fn();
    render(<CatchSearchField.expanded copy={copy} value="Delhi" placeholder="Hosts" onChanged={changed} />);
    fireEvent.click(screen.getByRole("button", {name: "Clear Hosts"}));
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    expect(input.value).toBe("");
    expect(document.activeElement).toBe(input);
    expect(changed).toHaveBeenCalledWith("");
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("accepts subsequent external query changes", () => {
    const {rerender} = render(<CatchSearchField copy={copy} value="Delhi" />);
    rerender(<CatchSearchField copy={copy} value="Mumbai" />);
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("Mumbai");
    rerender(<CatchSearchField copy={copy} value="" />);
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("");
  });
  it("reports focus and Enter, blurs after submission, and ignores composing Enter", () => {
    const focus = vi.fn(); const submitted = vi.fn();
    render(<CatchSearchField copy={copy} value="Pune" onFocusChanged={focus} onSubmitted={submitted} />);
    const input = screen.getByRole("searchbox") as HTMLInputElement;
    input.focus();
    expect(focus).toHaveBeenLastCalledWith(true);
    fireEvent.keyDown(input, {key: "Enter", isComposing: true});
    expect(submitted).not.toHaveBeenCalled();
    fireEvent.keyDown(input, {key: "Enter"});
    expect(submitted).toHaveBeenCalledWith("Pune");
    expect(document.activeElement).not.toBe(input);
    expect(focus).toHaveBeenLastCalledWith(false);
  });
  it("disables input and clear actions while retaining their accessible names", () => {
    const changed = vi.fn();
    render(<CatchSearchField copy={copy} value="Delhi" enabled={false} onChanged={changed} />);
    expect((screen.getByRole("searchbox") as HTMLInputElement).disabled).toBe(true);
    const button = screen.getByRole("button", {name: "Clear Search organizers"}) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(changed).not.toHaveBeenCalled();
  });
});

describe("CatchSearchField transient recipes", () => {
  it("exposes only the named opening trigger when collapsed", () => {
    const open = vi.fn();
    render(<CatchSearchField.expanding copy={copy} status="collapsed" onOpenSearch={open} semanticLabel="Find a host" />);
    expect(screen.queryByRole("searchbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", {name: "Find a host"}));
    expect(open).toHaveBeenCalledOnce();
  });
  it("disables the collapsed opening action", () => {
    const open = vi.fn();
    render(<CatchSearchField.expanding copy={copy} status="collapsed" enabled={false} onOpenSearch={open} />);
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(open).not.toHaveBeenCalled();
  });
  it("clears before offering close and leaves closing to the caller", () => {
    const close = vi.fn(); const changed = vi.fn();
    render(<CatchSearchField.expanding copy={copy} value="Delhi" onCloseSearch={close} onChanged={changed} />);
    fireEvent.click(screen.getByRole("button", {name: "Clear Search organizers"}));
    expect(changed).toHaveBeenCalledWith("");
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name: "Close search"}));
    expect(close).toHaveBeenCalledOnce();
    expect(screen.getByRole("searchbox")).toBeDefined();
  });
  it("omits an unavailable empty close action and focuses when opened", () => {
    const {rerender} = render(<CatchSearchField.expanding copy={copy} status="collapsed" autofocus />);
    rerender(<CatchSearchField.expanding copy={copy} status="expanded" autofocus />);
    expect(document.activeElement).toBe(screen.getByRole("searchbox"));
    expect(screen.queryByRole("button")).toBeNull();
  });
});
