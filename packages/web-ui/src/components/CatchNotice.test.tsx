import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
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
