import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeAll, describe, expect, it, vi} from "vitest";
import {CatchDock} from "./CatchDock";
import {CatchSheet} from "./CatchSheet";

afterEach(cleanup);

// jsdom has no modal dialog; these stand in for the browser's open state.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

describe("CatchSheet", () => {
  it("opens as a dialog named by its title and closes on Escape and the backdrop", () => {
    const onClose = vi.fn();
    const {container, rerender} = render(<CatchSheet onClose={onClose} open subtitle="One per booking" title="Choose your pace">Body</CatchSheet>);
    const dialog = container.querySelector("dialog")!;
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute("aria-labelledby")).toBe(screen.getByRole("heading", {name: "Choose your pace"}).id);
    fireEvent.keyDown(dialog, {key: "Escape"});
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(2);
    rerender(<CatchSheet onClose={onClose} open={false} title="Choose your pace">Body</CatchSheet>);
    expect(dialog.open).toBe(false);
  });

  it("pins the filter's close action and bounds standard sheets", () => {
    const onClose = vi.fn();
    const {container} = render(<CatchSheet closeLabel="Close" onClose={onClose} open recipe="filter" title="Activity">Choices</CatchSheet>);
    const dialog = container.querySelector("dialog")!;
    expect(dialog.dataset).toMatchObject({bounded: "true", pinned: "true", scrollable: "true"});
    fireEvent.click(screen.getByRole("button", {name: "Close"}));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows a badge in place of the trailing slot and drops the grabber on request", () => {
    const {container} = render(<CatchSheet badge="New" badgeTone="brand" grabber={false} label="Pace groups" onClose={vi.fn()} open>Body</CatchSheet>);
    expect(screen.getByText("New").closest("[data-recipe]")!.getAttribute("data-recipe")).toBe("functional");
    expect(screen.getByText("New").closest("[data-recipe]")!.getAttribute("data-tone")).toBe("brand");
    expect(container.querySelector("dialog")!.getAttribute("aria-label")).toBe("Pace groups");
    expect(container.querySelectorAll("dialog [aria-hidden]")).toHaveLength(0);
  });
});

describe("CatchDock", () => {
  it("holds the caller's controls in the utility recipe", () => {
    const {container} = render(<CatchDock><span>Tools</span></CatchDock>);
    expect((container.firstElementChild as HTMLElement).dataset).toMatchObject({recipe: "utility", safeArea: "true"});
  });

  it("draws one large full-width action with its line, footnote and loading state", () => {
    const onPressed = vi.fn();
    render(<CatchDock catchLine="Most book the 6:45 group" footnote="Free cancellation" isLoading label="Book" onPressed={onPressed} recipe="primary" />);
    const button = screen.getByRole("button", {name: "Book"});
    expect(button.dataset).toMatchObject({fullWidth: "true", loading: "true", size: "lg"});
    expect(screen.getByText("Most book the 6:45 group")).toBeTruthy();
    expect(screen.getByText("Free cancellation")).toBeTruthy();
  });
});
