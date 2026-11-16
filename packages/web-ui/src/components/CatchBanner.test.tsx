import {cleanup, fireEvent, render, screen, within} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {CatchBanner, type CatchBannerStatus} from "./CatchBanner";
import {CatchButton} from "./CatchButton";

afterEach(cleanup);

const offline: CatchBannerStatus = {id: "offline", label: "Offline", message: "Changes save when you reconnect.", color: "var(--catch-theme-warning)"};

describe("CatchBanner", () => {
  it("draws a message in its tone, primary by default, with no live region", () => {
    const {container, rerender} = render(<CatchBanner message="Sample message." />);
    const banner = container.firstElementChild as HTMLElement;
    expect(banner.dataset.tone).toBe("primary");
    expect(banner.dataset.variant).toBe("message");
    expect(banner.getAttribute("role")).toBeNull();
    expect(screen.getByText("Sample message.")).toBeTruthy();
    for (const tone of ["success", "warning", "danger", "neutral"] as const) {
      rerender(<CatchBanner message="Sample message." tone={tone} />);
      expect((container.firstElementChild as HTMLElement).dataset.tone).toBe(tone);
    }
  });

  it("puts the tone's glyph or a given icon beside a title, and no glyph without one", () => {
    const {container, rerender} = render(<CatchBanner message="Sample message." />);
    expect(container.querySelector("svg")).toBeNull();
    rerender(<CatchBanner message="Sample message." title="Sample title" tone="success" />);
    expect(screen.getByText("Sample title")).toBeTruthy();
    expect(container.querySelector("[aria-hidden='true'] svg")).not.toBeNull();
    rerender(<CatchBanner icon={<span data-testid="given-icon" />} message="Sample message." title="Sample title" />);
    expect(screen.getByTestId("given-icon")).toBeTruthy();
  });

  it("ignores a blank title", () => {
    const {container} = render(<CatchBanner message="Sample message." title="  " />);
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("lays actions under the copy, then the retry action", () => {
    const onRetry = vi.fn();
    render(
      <CatchBanner
        actions={<CatchButton label="Open" onPressed={() => undefined} recipe="text" />}
        message="Sample message."
        onRetry={onRetry}
        retryLabel="Try again"
      />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual(["Open", "Try again"]);
    fireEvent.click(screen.getByRole("button", {name: "Try again"}));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("draws an error as danger in a polite live region, whatever the tone", () => {
    render(<CatchBanner message="Could not save." tone="success" variant="error" />);
    const status = screen.getByRole("status");
    expect(status.dataset.tone).toBe("danger");
    expect(status.dataset.variant).toBe("error");
    expect(within(status).getByText("Could not save.")).toBeTruthy();
    expect(within(status).queryByRole("button")).toBeNull();
  });

  it("shows no retry action without its callback", () => {
    render(<CatchBanner message="Could not save." retryLabel="Try again" variant="error" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("draws each status as its own live band, in order, with its colour", () => {
    const rehearsal: CatchBannerStatus = {
      id: "rehearsal",
      label: "Rehearsal",
      message: "Sample guests only.",
      color: "var(--catch-theme-danger)",
      icon: <span data-testid="rehearsal-icon" />,
      actions: [{label: "Sample action", onPressed: vi.fn()}, {icon: "more", label: "More", onPressed: null}],
    };
    render(<CatchBanner statuses={[rehearsal, offline]} variant="statuses" />);
    const bands = screen.getAllByRole("status");
    expect(bands.map((band) => band.dataset.status)).toEqual(["rehearsal", "offline"]);
    expect(bands[0].style.getPropertyValue("--catch-banner-status")).toBe("var(--catch-theme-danger)");
    expect(within(bands[0]).getByText("Rehearsal")).toBeTruthy();
    expect(within(bands[0]).getByTestId("rehearsal-icon")).toBeTruthy();
    expect(within(bands[0]).getByRole("button", {name: "Sample action"})).toBeTruthy();
    expect((within(bands[0]).getByRole("button", {name: "More"}) as HTMLButtonElement).disabled).toBe(true);
    expect(within(bands[1]).queryByRole("button")).toBeNull();
  });

  it("calls a status action", () => {
    const onPressed = vi.fn();
    render(<CatchBanner statuses={[{...offline, actions: [{label: "Retry now", onPressed}]}]} variant="statuses" />);
    fireEvent.click(screen.getByRole("button", {name: "Retry now"}));
    expect(onPressed).toHaveBeenCalledOnce();
  });

  it("draws only the first status for the status variant", () => {
    render(<CatchBanner statuses={[offline, {...offline, id: "second"}]} variant="status" />);
    expect(screen.getAllByRole("status").map((band) => band.dataset.status)).toEqual(["offline"]);
  });

  it("renders nothing for no statuses", () => {
    const {container} = render(<CatchBanner statuses={[]} variant="statuses" />);
    expect(container.innerHTML).toBe("");
  });

  it("has no dismiss control", () => {
    render(<CatchBanner message="Sample message." title="Sample title" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
