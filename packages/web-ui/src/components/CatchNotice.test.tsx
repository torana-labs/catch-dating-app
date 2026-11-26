import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchButton} from "./CatchButton";
import {CatchErrorState} from "./CatchErrorState";
import {CatchNotice} from "./CatchNotice";
import {CatchNoticeRegion} from "./CatchNoticeRegion";

afterEach(cleanup);

describe("CatchNotice", () => {
  it("shows the title, message, action and dismiss control", () => {
    const onAction = vi.fn();
    const onDismiss = vi.fn();
    render(<CatchNotice dismissLabel="Dismiss" notice={{actionLabel: "Undo", id: "a", message: "From your page", onAction, title: "Review hidden", tone: "warning"}} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", {name: "Undo"}));
    fireEvent.click(screen.getByRole("button", {name: "Dismiss"}));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(screen.getByText("Review hidden").closest("[data-tone]")?.getAttribute("data-tone")).toBe("warning");
  });

  it("opens an arrival as a whole, dismissing it first, and dismisses it on Escape", () => {
    const calls: string[] = [];
    render(<CatchNotice dismissLabel="Dismiss" notice={{id: "b", onOpen: () => calls.push("open"), person: {name: "Kabir Mehta"}, title: "Kabir sent the route"}} onDismiss={() => calls.push("dismiss")} />);
    const arrival = screen.getByRole("button", {name: "Kabir sent the route"});
    expect(screen.queryByRole("button", {name: "Dismiss"})).toBeNull();
    fireEvent.click(arrival);
    fireEvent.keyDown(arrival, {key: "Escape"});
    expect(calls).toEqual(["dismiss", "open", "dismiss"]);
  });

  it("tints by the accent colour, and the region is a polite live region", () => {
    render(<CatchNoticeRegion label="Notifications"><CatchNotice dismissLabel="Dismiss" notice={{accentColor: "#5CCB9F", id: "c", title: "Saved"}} /></CatchNoticeRegion>);
    const region = screen.getByRole("region", {name: "Notifications"});
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect((region.firstElementChild as HTMLElement).style.getPropertyValue("--catch-notice-tone")).toBe("#5CCB9F");
  });
});

describe("CatchNotice inline recipe", () => {
  it("shows the body alone, in the status tone by default, with a hidden info glyph", () => {
    const {container} = render(<CatchNotice body="Guests pay into your own payout account." recipe="inline" />);
    const block = container.firstElementChild as HTMLElement;
    expect(block.dataset.tone).toBe("status");
    expect(block.getAttribute("aria-live")).toBeNull();
    expect(screen.getByText("Guests pay into your own payout account.").dataset.variant).toBe("body-small");
    expect(block.querySelector("[aria-hidden='true'] svg")).toBeTruthy();
    expect(container.querySelector("button")).toBeNull();
  });

  it("puts the title above the body and takes a caller's icon", () => {
    const {container} = render(<CatchNotice body="Last scan · 7:41 PM" icon={<svg data-testid="glyph" />} recipe="inline" title="Kabir Rao is in" tone="success" />);
    const title = screen.getByText("Kabir Rao is in");
    expect(title.dataset.variant).toBe("title-row");
    expect(title.compareDocumentPosition(screen.getByText("Last scan · 7:41 PM")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect((container.firstElementChild as HTMLElement).dataset.tone).toBe("success");
    expect(screen.getByTestId("glyph").closest("[aria-hidden='true']")).toBeTruthy();
  });

  it("draws the action as a quiet small button, disabled without onPressed", () => {
    const onPressed = vi.fn();
    const {rerender} = render(<CatchNotice action={{label: "Offer places", onPressed}} body="Pick several." recipe="inline" tone="neutral" />);
    const action = screen.getByRole("button", {name: "Offer places"});
    expect(action.dataset.size).toBe("sm");
    expect(action.dataset.variant).toBe("quiet");
    fireEvent.click(action);
    expect(onPressed).toHaveBeenCalledOnce();
    rerender(<CatchNotice action={{label: "Offer places"}} body="Pick several." recipe="inline" tone="neutral" />);
    expect((screen.getByRole("button", {name: "Offer places"}) as HTMLButtonElement).disabled).toBe(true);
  });

  it("puts the footer in place of the action", () => {
    render(
      <CatchNotice
        action={{label: "Ignored", onPressed: vi.fn()}}
        body="No car is there yet."
        footer={<><CatchButton label="Call them" onPressed={vi.fn()} size="sm" variant="secondary" /><CatchButton label="Tell the planner" onPressed={vi.fn()} size="sm" variant="quiet" /></>}
        recipe="inline"
        title="Kabir landed early"
        tone="warning"
      />,
    );
    expect(screen.getByRole("button", {name: "Call them"})).toBeTruthy();
    expect(screen.getByRole("button", {name: "Tell the planner"})).toBeTruthy();
    expect(screen.queryByRole("button", {name: "Ignored"})).toBeNull();
  });

  it("is a polite live region only in the danger tone", () => {
    const {container} = render(<CatchNotice body="That code didn't work." recipe="inline" tone="danger" />);
    expect((container.firstElementChild as HTMLElement).getAttribute("aria-live")).toBe("polite");
  });
});

describe("CatchErrorState", () => {
  it("retries with the caller's label at the mode's size", () => {
    const onRetry = vi.fn();
    render(<CatchErrorState message="Check your connection." mode="compact" onRetry={onRetry} retryLabel="Retry" title="Reviews didn't load" />);
    const retry = screen.getByRole("button", {name: "Retry"});
    expect(retry.dataset.size).toBe("md");
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("shows the medallion, title and message without actions", () => {
    const {container} = render(<CatchErrorState message="This event has ended." title="Event not found" />);
    expect(container.querySelector("[data-recipe='error']")).toBeTruthy();
    expect(container.querySelector("button")).toBeNull();
    expect((container.firstElementChild as HTMLElement).dataset.mode).toBe("fullScreen");
  });
});
