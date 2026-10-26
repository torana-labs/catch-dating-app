import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchBadge} from "./CatchBadge";

afterEach(cleanup);

const badgeOf = (label: string) => screen.getByText(label).closest("[data-recipe]") as HTMLElement;

describe("CatchBadge", () => {
  it("renders authored copy as a small neutral badge by default", () => {
    render(<CatchBadge label="Source-backed" />);

    const badge = badgeOf("Source-backed");
    expect(badge.dataset.recipe).toBe("standard");
    expect(badge.dataset.tone).toBe("neutral");
    expect(badge.dataset.size).toBe("sm");
    expect(badge.hasAttribute("data-functional")).toBe(false);
    expect(badge.getAttribute("role")).toBeNull();
  });

  it("marks functional recipes for uppercase mono type without changing the copy", () => {
    render(<CatchBadge recipe="functional" tone="success" label="Ready" />);

    const badge = badgeOf("Ready");
    expect(badge.hasAttribute("data-functional")).toBe(true);
    expect(badge.dataset.tone).toBe("success");
    expect(screen.getByText("Ready").textContent).toBe("Ready");
  });

  it("fixes the size and tone each constructor fixes", () => {
    render(
      <>
        <CatchBadge recipe="onDark" size="sm" tone="danger" label="On dark" />
        <CatchBadge recipe="solid" label="Solid" />
        <CatchBadge recipe="status" size="action" tone="warning" label="Waiting" />
      </>,
    );

    expect(badgeOf("On dark").dataset.size).toBe("md");
    expect(badgeOf("On dark").dataset.tone).toBe("neutral");
    expect(badgeOf("Solid").dataset.size).toBe("md");
    expect(badgeOf("Waiting").dataset.size).toBe("sm");
    expect(badgeOf("Waiting").dataset.tone).toBe("warning");
  });

  it("draws the live dot and hides decorative icons from assistive tech", () => {
    render(
      <>
        <CatchBadge recipe="live" label="Live now" icon={<svg data-testid="ignored" />} />
        <CatchBadge label="Verified" icon={<svg data-testid="check" />} />
      </>,
    );

    expect(badgeOf("Live now").querySelector("[aria-hidden='true']")).not.toBeNull();
    expect(screen.queryByTestId("ignored")).toBeNull();
    expect(screen.getByTestId("check").parentElement?.getAttribute("aria-hidden")).toBe("true");
  });

  it("carries the ticket pigment and emphasis", () => {
    render(
      <>
        <CatchBadge recipe="ticketStatus" color="rgb(12, 120, 80)" label="Going" />
        <CatchBadge recipe="ticketStatus" emphasis="strong" label="Sold out" />
      </>,
    );

    expect(badgeOf("Going").style.getPropertyValue("--catch-badge-pigment")).toBe("rgb(12, 120, 80)");
    expect(badgeOf("Going").dataset.emphasis).toBe("soft");
    expect(badgeOf("Sold out").dataset.emphasis).toBe("strong");
  });

  it("shows the optional annotation's validation feedback", () => {
    render(
      <>
        <CatchBadge recipe="optional" label="Optional" />
        <CatchBadge recipe="optional" hasError label="Still optional" />
      </>,
    );

    expect(badgeOf("Optional").dataset.tone).toBe("neutral");
    expect(badgeOf("Still optional").dataset.tone).toBe("danger");
  });
});
