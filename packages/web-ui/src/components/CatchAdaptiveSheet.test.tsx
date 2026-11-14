import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import {useRef, useState} from "react";
import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";
import {CatchAdaptiveSheet, type CatchAdaptiveSheetWide} from "./CatchAdaptiveSheet";
import {catchAnchoredPlacement} from "./catchAnchoredPlacement";

// jsdom has no modal dialog, media queries or layout; these stand in for the browser.
let width = 390;
const listeners = new Set<() => void>();
function setWidth(next: number) {
  width = next;
  act(() => listeners.forEach((listener) => listener()));
}
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
  // jsdom hides a popover and cannot show one.
  HTMLElement.prototype.showPopover = function showPopover(this: HTMLElement) {
    this.style.display = "block";
  };
  HTMLElement.prototype.hidePopover = function hidePopover(this: HTMLElement) {
    this.style.display = "";
  };
  window.matchMedia = ((query: string) => ({
    get matches() {
      const min = /min-width:\s*(\d+)px/u.exec(query);
      return min ? width >= Number(min[1]) : false;
    },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  cleanup();
  width = 390;
});

function Harness({wide = "dropdown", anchored = true, onClose = () => undefined}: {
  wide?: CatchAdaptiveSheetWide;
  anchored?: boolean;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button onClick={() => setOpen(true)} ref={trigger} type="button">Sign in</button>
      <button type="button">Elsewhere</button>
      <CatchAdaptiveSheet
        anchor={anchored ? trigger : undefined}
        closeLabel="Close"
        footer="Signing in does not subscribe you to marketing messages."
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        open={open}
        subtitle="One Catch account for your plans."
        title="Sign in"
        wide={wide}
        width={380}
      >
        <label>Phone number<input onChange={(event) => setPhone(event.target.value)} value={phone} /></label>
        <button type="submit">Text me a code</button>
      </CatchAdaptiveSheet>
    </>
  );
}

function stubLayout(trigger: HTMLElement) {
  trigger.getBoundingClientRect = () => ({bottom: 48, height: 32, left: 540, right: 610, top: 16, width: 70, x: 540, y: 16, toJSON: () => ({})});
}

describe("CatchAdaptiveSheet", () => {
  it("is the modal bottom sheet under 900px, whatever wide screens get", () => {
    setWidth(899);
    const {container} = render(<Harness />);
    fireEvent.click(screen.getByRole("button", {name: "Sign in"}));
    const dialog = container.querySelector("dialog")!;
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute("aria-labelledby")).toBe(screen.getByRole("heading", {name: "Sign in"}).id);
    expect(screen.queryByRole("button", {name: "Close"})).toBeNull();
  });

  it("drops down under its anchor at 900px: non-modal, focus inside, Escape returns focus", () => {
    setWidth(1440);
    const onClose = vi.fn();
    const {container} = render(<Harness onClose={onClose} />);
    const trigger = screen.getByRole("button", {name: "Sign in"});
    stubLayout(trigger);
    fireEvent.click(trigger);
    const panel = screen.getByRole("dialog", {name: "Sign in"});
    expect(container.querySelector("dialog")).toBeNull();
    expect(panel.getAttribute("aria-modal")).toBeNull();
    expect(panel.getAttribute("popover")).toBe("manual");
    expect(panel.getAttribute("aria-describedby")).toBe(screen.getByText("One Catch account for your plans.").id);
    expect(panel.style.top).toBe("56px");
    expect(panel.style.left).toBe("540px");
    expect(document.activeElement).toBe(screen.getByRole("textbox", {name: "Phone number"}));
    fireEvent.keyDown(panel, {key: "Escape"});
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on an outside press, keeps the caller's draft, and wraps Tab inside the panel", () => {
    setWidth(1200);
    render(<Harness />);
    const trigger = screen.getByRole("button", {name: "Sign in"});
    stubLayout(trigger);
    fireEvent.click(trigger);
    const field = screen.getByRole("textbox", {name: "Phone number"});
    fireEvent.change(field, {target: {value: "+91 98765 43210"}});
    const submit = screen.getByRole("button", {name: "Text me a code"});
    submit.focus();
    fireEvent.keyDown(submit, {key: "Tab"});
    expect(document.activeElement).toBe(field);
    fireEvent.keyDown(field, {key: "Tab", shiftKey: true});
    expect(document.activeElement).toBe(submit);
    fireEvent.pointerDown(field);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.pointerDown(screen.getByRole("button", {name: "Elsewhere"}));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(trigger);
    expect((screen.getByRole("textbox", {name: "Phone number"}) as HTMLInputElement).value).toBe("+91 98765 43210");
  });

  it("draws a trigger in place and hangs from it, toggling on the trigger", () => {
    setWidth(1440);
    function Triggered() {
      const [open, setOpen] = useState(false);
      return (
        <CatchAdaptiveSheet closeLabel="Close" onClose={() => setOpen(false)} open={open} title="Sign in"
          trigger={<button onClick={() => setOpen((value) => !value)} type="button">Sign in</button>} wide="dropdown">
          <input aria-label="Phone number" />
        </CatchAdaptiveSheet>
      );
    }
    const {container} = render(<Triggered />);
    const wrapper = container.firstElementChild as HTMLElement;
    stubLayout(wrapper);
    const trigger = screen.getByRole("button", {name: "Sign in"});
    fireEvent.click(trigger);
    const panel = screen.getByRole("dialog", {name: "Sign in"});
    expect(panel.style.top).toBe("56px");
    fireEvent.keyDown(panel, {key: "Escape"});
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("aligns to the anchor's end edge", () => {
    setWidth(1440);
    function Open() {
      const trigger = useRef<HTMLButtonElement | null>(null);
      return <>
        <button ref={(element) => {
          trigger.current = element;
          if (element) stubLayout(element);
        }} type="button">Mumbai</button>
        <CatchAdaptiveSheet align="end" anchor={trigger} closeLabel="Close" onClose={() => undefined} open title="Choose your city" wide="dropdown" width={340}>Cities</CatchAdaptiveSheet>
      </>;
    }
    render(<Open />);
    expect(screen.getByRole("dialog", {name: "Choose your city"}).style.left).toBe(`${610 - 340}px`);
  });

  it("is a centred dialog with a close button for page content, or a dropdown with no anchor on screen", () => {
    setWidth(1440);
    const onClose = vi.fn();
    const {container, unmount} = render(<Harness onClose={onClose} wide="dialog" />);
    fireEvent.click(screen.getByRole("button", {name: "Sign in"}));
    const dialog = container.querySelector("dialog")!;
    expect(dialog.open).toBe(true);
    expect(dialog.dataset.recipe).toBe("content");
    expect(dialog.getAttribute("aria-describedby")).toBe(screen.getByText("One Catch account for your plans.").id);
    expect(screen.getByText("Signing in does not subscribe you to marketing messages.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {name: "Close"}));
    expect(onClose).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", {name: "Sign in"}));
    fireEvent.keyDown(container.querySelector("dialog")!, {key: "Escape"});
    expect(onClose).toHaveBeenCalledTimes(2);
    unmount();

    const fallback = render(<Harness anchored={false} />);
    fireEvent.click(screen.getByRole("button", {name: "Sign in"}));
    expect(fallback.container.querySelector("dialog")?.dataset.recipe).toBe("content");
    fallback.unmount();

    // An anchor with no box (inside a collapsed menu) is not on screen.
    const hidden = render(<Harness />);
    fireEvent.click(screen.getByRole("button", {name: "Sign in"}));
    expect(hidden.container.querySelector("dialog")?.dataset.recipe).toBe("content");
  });

  it("follows the window across the 900px line", () => {
    setWidth(1440);
    const {container} = render(<Harness wide="dialog" />);
    fireEvent.click(screen.getByRole("button", {name: "Sign in"}));
    expect(container.querySelector("dialog")?.dataset.recipe).toBe("content");
    setWidth(600);
    expect(container.querySelector("dialog")?.dataset.recipe).toBeUndefined();
    expect(container.querySelector("dialog")?.open).toBe(true);
  });
});

describe("catchAnchoredPlacement", () => {
  const viewport = {height: 800, width: 1440};
  it("opens below, or above when the panel does not fit and there is more room there", () => {
    expect(catchAnchoredPlacement({bottom: 48, left: 0, right: 0, top: 16}, 300, viewport)).toEqual({maxHeight: 728, place: "below", shiftX: 0});
    expect(catchAnchoredPlacement({bottom: 700, left: 0, right: 0, top: 668}, 400, viewport)).toEqual({maxHeight: 644, place: "above", shiftX: 0});
  });
  it("shifts a panel back inside the 16px viewport inset", () => {
    expect(catchAnchoredPlacement({bottom: 48, left: 0, right: 0, top: 16}, 0, viewport, {left: 1200, right: 1580, width: 380}).shiftX).toBe(-156);
    expect(catchAnchoredPlacement({bottom: 48, left: 0, right: 0, top: 16}, 0, viewport, {left: 4, right: 384, width: 380}).shiftX).toBe(12);
  });
});
