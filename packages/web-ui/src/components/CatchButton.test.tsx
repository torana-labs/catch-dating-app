import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchButton} from "./CatchButton";

afterEach(cleanup);

describe("CatchButton", () => {
  it("is a primary md button that presses without submitting a form", () => {
    const pressed = vi.fn();
    const submit = vi.fn((event: Event) => event.preventDefault());
    render(<form onSubmit={submit as never}><CatchButton label="Book" onPressed={pressed} /></form>);
    const button = screen.getByRole("button", {name: "Book"});
    expect(button.getAttribute("type")).toBe("button");
    expect(button.dataset).toMatchObject({recipe: "default", size: "lg", variant: "primary"});
    fireEvent.click(button);
    expect(pressed).toHaveBeenCalledOnce();
    expect(submit).not.toHaveBeenCalled();
  });

  it("disables a null action and keeps a loading button focusable but inert", () => {
    const pressed = vi.fn();
    render(<><CatchButton label="Book" onPressed={null} /><CatchButton label="Booking" onPressed={pressed} status="loading" /></>);
    expect((screen.getByRole("button", {name: "Book"}) as HTMLButtonElement).disabled).toBe(true);
    const busy = screen.getByRole("button", {name: "Booking"}) as HTMLButtonElement;
    expect(busy.disabled).toBe(false);
    expect(busy.getAttribute("aria-busy")).toBe("true");
    expect(busy.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(busy);
    expect(pressed).not.toHaveBeenCalled();
  });

  it("renders a link with the button's look, without href when disabled", () => {
    const {rerender} = render(<CatchButton href="https://lu.ma/x" label="Tickets" onPressed={() => undefined} variant="secondary" />);
    expect(screen.getByRole("link", {name: "Tickets"}).getAttribute("href")).toBe("https://lu.ma/x");
    rerender(<CatchButton href="https://lu.ma/x" label="Tickets" onPressed={null} />);
    const link = screen.getByText("Tickets").closest("a")!;
    expect(link.hasAttribute("href")).toBe(false);
    expect(link.getAttribute("aria-disabled")).toBe("true");
  });

  it("maps the sheet role to its variant and fills the width", () => {
    render(<><CatchButton label="Save" onPressed={() => undefined} recipe="sheet" role="commit" />
      <CatchButton label="Cancel" onPressed={() => undefined} recipe="sheet" role="dismiss" /></>);
    expect(screen.getByRole("button", {name: "Save"}).dataset).toMatchObject({fullWidth: "true", variant: "primary"});
    expect(screen.getByRole("button", {name: "Cancel"}).dataset.variant).toBe("secondary");
  });

  it("pairs an accent with white and applies colour overrides as variables", () => {
    render(<CatchButton accentColor="#B5451F" label="Book" onPressed={() => undefined} />);
    const style = screen.getByRole("button").style;
    expect(style.getPropertyValue("--catch-button-bg")).toBe("#B5451F");
    expect(style.getPropertyValue("--catch-button-fg")).toBe("var(--catch-palette-white)");
  });

  it("draws the floating recipe's value and clamped count, and a static label when not interactive", () => {
    render(<><CatchButton count={120} label="Filters" onPressed={() => undefined} recipe="floating" value="Run clubs" />
      <CatchButton isInteractive={false} label="Booked" onPressed={() => undefined} /></>);
    const floating = screen.getByRole("button", {name: /Filters/});
    expect(floating.textContent).toContain("Run clubs");
    expect(floating.textContent).toContain("99+");
    expect(screen.queryByRole("button", {name: "Booked"})).toBeNull();
    expect(screen.getByText("Booked").closest("[data-static]")).toBeTruthy();
  });

  it("gives the selection recipe its tooltip and the text recipe its tone", () => {
    render(<><CatchButton label="Sunday Social Run" onPressed={() => undefined} recipe="selection" tooltip="Sunday Social Run, 6:30 AM" />
      <CatchButton label="Delete" onPressed={() => undefined} recipe="text" tone="danger" /></>);
    expect(screen.getByRole("button", {name: "Sunday Social Run"}).title).toBe("Sunday Social Run, 6:30 AM");
    expect(screen.getByRole("button", {name: "Delete"}).dataset).toMatchObject({recipe: "text", tone: "danger"});
  });
});
